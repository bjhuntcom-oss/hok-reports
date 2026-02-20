import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "./prisma";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED ERROR SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export enum LlmErrorCode {
  API_KEY_MISSING = "API_KEY_MISSING",
  API_KEY_INVALID = "API_KEY_INVALID",
  RATE_LIMIT = "RATE_LIMIT",
  TIMEOUT = "TIMEOUT",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  JSON_PARSE_ERROR = "JSON_PARSE_ERROR",
  TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED",
  GENERATION_FAILED = "GENERATION_FAILED",
  CONTENT_FILTERED = "CONTENT_FILTERED",
  TOKEN_LIMIT_EXCEEDED = "TOKEN_LIMIT_EXCEEDED",
  AUDIO_TOO_SHORT = "AUDIO_TOO_SHORT",
}

export class LlmError extends Error {
  public readonly code: LlmErrorCode;
  public readonly provider: string;
  public readonly retryable: boolean;
  public readonly statusCode?: number;
  public readonly context?: Record<string, unknown>;

  constructor(opts: {
    code: LlmErrorCode;
    message: string;
    provider: string;
    retryable?: boolean;
    statusCode?: number;
    context?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(opts.message, { cause: opts.cause });
    this.name = "LlmError";
    this.code = opts.code;
    this.provider = opts.provider;
    this.retryable = opts.retryable ?? false;
    this.statusCode = opts.statusCode;
    this.context = opts.context;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  retry: { maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 30_000, backoffMultiplier: 2 },
  timeout: { transcription: 120_000, generation: 90_000 },
  models: {
    openai: { transcription: "whisper-1", generation: "gpt-4o" },
    anthropic: { generation: "claude-sonnet-4-20250514" },
  },
  tokens: { maxReport: 8192, maxBrief: 4096, maxMetadata: 2048 },
  audio: { minBytes: 1024, maxBytes: 25_000_000 },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const entry = { ts: new Date().toISOString(), mod: "llm", level, msg, ...data };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn("[LLM]", JSON.stringify(entry));
}

// ═══════════════════════════════════════════════════════════════════════════════
// API KEY MANAGEMENT & VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

async function getApiKey(key: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    if (setting?.value && setting.value.trim().length > 0) return setting.value.trim();
  } catch (err) {
    log("warn", "DB key read failed, env fallback", { key, error: String(err) });
  }
  const envMap: Record<string, string | undefined> = {
    whisper_api_key: process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY,
    openai_api_key: process.env.OPENAI_API_KEY,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
  };
  const val = envMap[key];
  if (val && val.trim().length > 0 && val !== "your-openai-api-key-here") return val.trim();
  return "";
}

async function getLlmProvider(): Promise<"openai" | "anthropic"> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "llm_provider" } });
    if (setting?.value === "anthropic") {
      const key = await getApiKey("anthropic_api_key");
      if (key) return "anthropic";
      log("warn", "Anthropic selected but no key — falling back to OpenAI");
    }
  } catch (err) {
    log("warn", "Provider read failed", { error: String(err) });
  }
  return "openai";
}

function validateApiKey(apiKey: string, provider: string): void {
  if (!apiKey) {
    throw new LlmError({
      code: LlmErrorCode.API_KEY_MISSING,
      message: `Clé API ${provider === "openai" ? "OpenAI" : "Anthropic"} non configurée. Contactez l'administrateur (Administration → Moteur LLM).`,
      provider,
    });
  }
  if (provider === "openai" && !apiKey.startsWith("sk-")) {
    throw new LlmError({
      code: LlmErrorCode.API_KEY_INVALID,
      message: "Clé API OpenAI invalide (format attendu : sk-...). Vérifiez la configuration.",
      provider,
    });
  }
  if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) {
    throw new LlmError({
      code: LlmErrorCode.API_KEY_INVALID,
      message: "Clé API Anthropic invalide (format attendu : sk-ant-...). Vérifiez la configuration.",
      provider,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT FACTORY (cached singletons per key)
// ═══════════════════════════════════════════════════════════════════════════════

let _oai: { c: OpenAI; k: string } | null = null;
let _ant: { c: Anthropic; k: string } | null = null;

function getOpenAIClient(apiKey: string): OpenAI {
  if (_oai?.k === apiKey) return _oai.c;
  const c = new OpenAI({ apiKey, timeout: CONFIG.timeout.generation });
  _oai = { c, k: apiKey };
  return c;
}

function getAnthropicClient(apiKey: string): Anthropic {
  if (_ant?.k === apiKey) return _ant.c;
  const c = new Anthropic({ apiKey, timeout: CONFIG.timeout.generation });
  _ant = { c, k: apiKey };
  return c;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY ENGINE — exponential backoff, jitter, rate-limit awareness
// ═══════════════════════════════════════════════════════════════════════════════

function isRetryable(err: unknown): boolean {
  if (err instanceof LlmError) return err.retryable;
  if (err instanceof OpenAI.APIError) return [408, 429, 500, 502, 503, 504].includes(err.status);
  if (err instanceof Anthropic.APIError) return [429, 500, 502, 503, 529].includes(err.status);
  if (err instanceof Error) {
    const m = err.message.toLowerCase();
    return m.includes("timeout") || m.includes("econnreset") || m.includes("socket hang up") || m.includes("fetch failed");
  }
  return false;
}

function retryDelay(attempt: number, err?: unknown): number {
  let d = CONFIG.retry.baseDelayMs * Math.pow(CONFIG.retry.backoffMultiplier, attempt);
  const ra = (err as any)?.headers?.["retry-after"];
  if (ra) d = Math.max(d, parseInt(ra, 10) * 1000);
  return Math.min(d + d * 0.25 * (Math.random() * 2 - 1), CONFIG.retry.maxDelayMs);
}

async function withRetry<T>(op: string, fn: () => Promise<T>, max: number = CONFIG.retry.maxAttempts): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      const r = await fn();
      if (i > 0) log("info", `${op} OK after ${i + 1} attempts`);
      return r;
    } catch (err) {
      lastErr = err;
      const canRetry = isRetryable(err) && i < max - 1;
      log(canRetry ? "warn" : "error", `${op} failed (${i + 1}/${max})`, {
        error: err instanceof Error ? err.message : String(err),
        status: (err as any)?.status,
      });
      if (!canRetry) break;
      const d = retryDelay(i, err);
      log("debug", `Retry ${op} in ${Math.round(d)}ms`);
      await new Promise((r) => setTimeout(r, d));
    }
  }
  throw lastErr;
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON PARSING — multi-strategy extraction & validation
// ═══════════════════════════════════════════════════════════════════════════════

function extractJSON(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();

  try { JSON.parse(s); return s; } catch {}

  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { JSON.parse(m[0]); return m[0]; } catch {} }

  try {
    const fixed = s.replace(/,\s*([}\]])/g, "$1").replace(/'/g, '"');
    JSON.parse(fixed); return fixed;
  } catch {}

  throw new LlmError({
    code: LlmErrorCode.JSON_PARSE_ERROR,
    message: "Impossible d'extraire du JSON valide de la réponse du modèle.",
    provider: "unknown", retryable: true,
    context: { rawLength: raw.length, preview: raw.slice(0, 300) },
  });
}

function safeParseJSON(raw: string, provider: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(extractJSON(raw));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error("Not an object");
    return parsed as Record<string, unknown>;
  } catch (err) {
    if (err instanceof LlmError) throw err;
    throw new LlmError({
      code: LlmErrorCode.JSON_PARSE_ERROR,
      message: "Réponse JSON invalide. Nouvelle tentative automatique.",
      provider, retryable: true,
      cause: err instanceof Error ? err : undefined,
    });
  }
}

function str(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim().length > 0 ? val.trim() : fallback;
}

function strArr(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => s.trim());
}

function validCategory(val: unknown): string {
  const ok = ["consultation", "hearing", "deposition", "meeting", "general", "negotiation", "mediation", "litigation"];
  return typeof val === "string" && ok.includes(val.toLowerCase()) ? val.toLowerCase() : "general";
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP BENINESE LEGAL CONTEXT — shared across all prompts
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_CONTEXT = `Vous êtes un assistant juridique expert de niveau senior au sein du Cabinet HOK, un cabinet d'avocats de renom établi à Cotonou, République du Bénin, opérant dans l'espace juridique OHADA et le droit national béninois.

CADRE JURIDIQUE DE RÉFÉRENCE :
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ DROIT NATIONAL BÉNINOIS :
  • Constitution du 11 décembre 1990 (révisée en 2019)
  • Code des personnes et de la famille (loi n°2002-07 du 24 août 2004)
  • Code foncier et domanial (loi n°2013-01 du 14 janvier 2013)
  • Code du travail (loi n°98-004 du 27 janvier 1998)
  • Code pénal (loi n°2018-16 du 28 décembre 2018)
  • Code de procédure pénale
  • Code de procédure civile, commerciale, sociale, administrative et des comptes
  • Code général des impôts et Livre des procédures fiscales
  • Code du numérique (loi n°2017-20 du 20 avril 2018) — données personnelles, cybersécurité
  • Code de l'enfant (loi n°2015-08)
  • Loi n°2020-26 portant création de la CRIET
  • Loi sur l'APDP (Autorité de Protection des Données Personnelles)
  • Code des marchés publics (décret n°2017-539)

■ DROIT COMMUNAUTAIRE OHADA (17 États membres) :
  • AUDCG — Droit commercial général (révisé 15 déc. 2010)
  • AUSCGIE — Sociétés commerciales et GIE (révisé 30 janv. 2014)
  • AUS — Sûretés (révisé 15 déc. 2010)
  • AUPSRVE — Recouvrement et voies d'exécution (10 avril 1998)
  • AUPCAP — Procédures collectives (révisé 10 sept. 2015)
  • AUA — Arbitrage (23 nov. 2017)
  • AUDCIF — Droit comptable (26 janv. 2017)
  • AUCTMR — Transport de marchandises (22 mars 2003)
  • AUM — Médiation (23 nov. 2017)

■ INSTITUTIONS :
  • CCJA — Cour Commune de Justice et d'Arbitrage (jurisprudence supranationale)
  • Barreau du Bénin — déontologie et exercice professionnel
  • APDP — Protection des données personnelles
  • CRIET — Infractions économiques et financières
  • Tribunaux (Commerce, Première Instance), Cour d'Appel, Cour Suprême du Bénin

STANDARDS PROFESSIONNELS :
━━━━━━━━━━━━━━━━━━━━━━━━
• Déontologie stricte du Barreau du Bénin et secret professionnel
• Terminologie juridique précise du droit civil continental francophone
• Distinguer TOUJOURS : FAITS rapportés / ANALYSE juridique / RECOMMANDATIONS
• Signaler conflits d'intérêts potentiels et limites de compétence
• Indiquer délais de prescription applicables (civile 5 ans, commerciale OHADA, etc.)
• Mentionner voies de recours (opposition, appel, pourvoi, recours CCJA)
• NE JAMAIS inventer d'informations absentes de la source
• Formulations conditionnelles pour éléments incertains ("il semblerait que", "sous réserve de vérification")
• Marquer "[INAUDIBLE]" ou "[IMPRÉCIS]" les passages incomplets
• Référencer les textes de loi avec numérotation officielle`;

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT PROMPTS — system + user prompt builder
// ═══════════════════════════════════════════════════════════════════════════════

const REPORT_SYSTEM = `${LEGAL_CONTEXT}

MISSION : RÉDACTION DE COMPTES RENDUS DE CONSULTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÈGLES DE RÉDACTION :
1. FIDÉLITÉ — Ne JAMAIS ajouter de faits non présents dans la transcription
2. PRUDENCE — Conditionnel pour situations juridiques non confirmées
3. EXHAUSTIVITÉ — Couvrir TOUS les sujets abordés, même brièvement
4. STRUCTURE — Organiser thématiquement (faits → analyse → recommandations)
5. PRÉCISION — Citer montants, dates, noms propres exactement comme mentionnés
6. NUANCE — Distinguer allégations du client vs éléments établis (documents, jugements)
7. CHRONOLOGIE — Respecter l'ordre des échanges quand discernable
8. RÉFÉRENCES — Citer textes de loi, articles, actes uniformes applicables
9. ALERTES — Signaler risques de prescription, forclusion ou déchéance de droits
10. DÉONTOLOGIE — Jamais de conclusion définitive sur base d'une transcription seule

TEMPLATE DU RÉSUMÉ (à adapter selon le contenu) :
─────────────────────────────────────────────────
§1 — CONTEXTE ET OBJET : Présenter le cadre de la consultation, l'identité du client, la nature du problème juridique posé.
§2 — EXPOSÉ DES FAITS : Rapporter chronologiquement les faits tels que relatés par le client, en distinguant les éléments documentés des simples déclarations.
§3 — ANALYSE JURIDIQUE PRÉLIMINAIRE : Identifier les textes applicables (lois béninoises, Actes uniformes OHADA, conventions), qualifier juridiquement la situation, évaluer les forces et faiblesses de la position du client.
§4 — STRATÉGIE ET RECOMMANDATIONS : Proposer les options juridiques (voie amiable, médiation, contentieux), évaluer les risques, déterminer les prochaines étapes concrètes.
§5 — POINTS DE VIGILANCE : Délais à surveiller, pièces à rassembler, précautions à prendre, éventuelles questions déontologiques.`;

const FORMAT_RULES: Record<string, string> = {
  brief: `FORMAT : SYNTHÈSE RAPIDE
• Résumé : 200-400 mots — essentiel uniquement, 2-3 paragraphes
• Points clés : 3-5 maximum — les plus critiques
• Actions : 2-4 prioritaires, marquées URGENT/NORMAL
• Notes juridiques : brèves — textes les plus directement applicables`,
  standard: `FORMAT : RAPPORT STANDARD
• Résumé : 500-900 mots — couverture complète, 4-5 paragraphes structurés selon le template
• Points clés : 5-12 — organisés par thématique juridique
• Actions : toutes identifiées — priorité (URGENT / NORMAL / À PLANIFIER) + échéance si connue
• Notes juridiques : textes applicables avec articles, jurisprudence si connue`,
  detailed: `FORMAT : RAPPORT DÉTAILLÉ EXHAUSTIF
• Résumé : 1000-2000 mots — analyse approfondie, sous-sections thématiques, template complet
• Points clés : exhaustifs — hiérarchie par domaine et niveau de risque
• Actions : plan détaillé — échéancier, responsabilités, conditions préalables, coûts si mentionnés
• Notes juridiques : analyse approfondie — articles précis, jurisprudence CCJA/Cour Suprême, doctrine, risques gradués, stratégie contentieuse/transactionnelle`,
};

function buildReportPrompt(
  clientName: string, caseRef: string | null, lang: string,
  format: "brief" | "standard" | "detailed", transcription: string
): { system: string; user: string } {
  const langRule = lang === "en"
    ? "LANGUE : Rédigez en anglais. Terminologie adaptée pour praticiens common law."
    : "LANGUE : Rédigez en français juridique professionnel.";

  const system = `${REPORT_SYSTEM}

${langRule}

${FORMAT_RULES[format]}

CONSIGNES JSON STRICTES :
Retournez UNIQUEMENT un objet JSON valide. Aucun texte avant ou après, aucun markdown.
{
  "title": "string — titre professionnel (ex: Compte rendu — Litige foncier — M. AHOUANDJINOU)",
  "summary": "string — résumé structuré (\\n pour sauts de paragraphe)",
  "keyPoints": ["string — point clé complet et précis", ...],
  "actionItems": ["string — action concrète avec priorité et échéance", ...],
  "legalNotes": "string — observations juridiques, textes, jurisprudence, vigilance"
}`;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const user = `CONTEXTE DE LA SESSION
━━━━━━━━━━━━━━━━━━━━
• Client : ${clientName}
${caseRef ? `• Référence dossier : ${caseRef}` : "• Référence dossier : non spécifiée"}
• Date du rapport : ${today}
• Cabinet : HOK — Cotonou, Bénin

TRANSCRIPTION INTÉGRALE :
━━━━━━━━━━━━━━━━━━━━━━━
"""
${transcription}
"""

Analysez avec rigueur et produisez le rapport JSON structuré.`;

  return { system, user };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH RECORDING — METADATA EXTRACTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_SYSTEM = `${LEGAL_CONTEXT}

MISSION : EXTRACTION AUTOMATIQUE DE MÉTADONNÉES DE SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RÈGLES D'EXTRACTION :
1. NOM DU CLIENT — Chercher : "Monsieur/Madame [Nom]", "Maître [Nom]", "M./Mme [Nom]", mention directe. Si absent : "Client non identifié".
2. RÉFÉRENCE — Chercher : "dossier n°...", "affaire ...", "RG n°...", tout identifiant. Si absent : null.
3. CATÉGORIE — Classifier :
   - "consultation" : entretien client, prise d'instructions, conseil
   - "hearing" : audience, plaidoirie, comparution, chambre du conseil
   - "deposition" : déposition, interrogatoire, audition de témoin
   - "meeting" : réunion interne, conférence entre confrères
   - "negotiation" : négociation, médiation, conciliation
   - "litigation" : préparation contentieuse, stratégie procédurale
   - "general" : inclassable
4. TITRE — Professionnel, mentionnant type et sujet principal
5. DESCRIPTION — Résumé factuel 1-3 phrases du contenu

CONSIGNES JSON STRICTES :
{
  "title": "string — ex: Consultation — Litige foncier parcelle de Togbin",
  "clientName": "string — nom complet ou Client non identifié",
  "caseReference": "string | null",
  "category": "string — une des catégories ci-dessus",
  "description": "string — résumé factuel concis"
}`;

function buildFlashPrompt(transcription: string): { system: string; user: string } {
  return {
    system: FLASH_SYSTEM,
    user: `TRANSCRIPTION DE L'ENREGISTREMENT FLASH :
"""
${transcription}
"""

Extrayez les métadonnées JSON.`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSCRIPTION ENGINE — validation, post-processing, quality scoring
// ═══════════════════════════════════════════════════════════════════════════════

function validateAudioInput(buf: Buffer): void {
  if (!buf || buf.length === 0) {
    throw new LlmError({
      code: LlmErrorCode.AUDIO_TOO_SHORT,
      message: "Le fichier audio est vide. Veuillez réenregistrer.",
      provider: "openai",
    });
  }
  if (buf.length < CONFIG.audio.minBytes) {
    throw new LlmError({
      code: LlmErrorCode.AUDIO_TOO_SHORT,
      message: "Enregistrement trop court. Minimum quelques secondes d'audio requis.",
      provider: "openai",
    });
  }
  if (buf.length > CONFIG.audio.maxBytes) {
    throw new LlmError({
      code: LlmErrorCode.TOKEN_LIMIT_EXCEEDED,
      message: `Fichier audio trop volumineux (${Math.round(buf.length / 1e6)}MB). Maximum : 25MB.`,
      provider: "openai",
    });
  }
}

function postProcessTranscription(text: string): string {
  if (!text || text.trim().length === 0) return "";
  return text
    .trim()
    .replace(/\s{2,}/g, " ")
    .replace(/([.!?])\s*\1+/g, "$1")
    .replace(/\b(euh|heu|hum|mmh)\b\s*/gi, "")
    .replace(/\s+([,;:!?.])/g, "$1")
    .replace(/([.!?])\s+([a-zéèêëàâäîïôùûüç])/g, (_, p, c) => `${p} ${c.toUpperCase()}`)
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Whisper hint prompt — legal vocabulary for better accuracy
const WHISPER_HINT = "Transcription d'une consultation juridique au Cabinet HOK, Cotonou, Bénin. Vocabulaire juridique : OHADA, Acte uniforme, AUDCG, AUSCGIE, AUPSRVE, mise en demeure, assignation, ordonnance de référé, jugement, arrêt, pourvoi en cassation, CCJA, Cour Suprême, Barreau du Bénin, confrère, Maître, Tribunal de Commerce, Cour d'Appel, Tribunal de Première Instance, Code foncier et domanial, Code des personnes et de la famille, CRIET, APDP, greffe, audience, plaidoirie, réquisitoire, délibéré, grosse, expédition, signification, huissier, exploit, saisie, hypothèque, nantissement, gage, caution solidaire, société anonyme, SARL, SAS, GIE, registre du commerce, RCCM, quitus, bilan, compte de résultat.";

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: string = "fr"
): Promise<{
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  duration: number;
  confidence: number;
}> {
  const t0 = Date.now();
  log("info", "Transcription start", { audioBytes: audioBuffer.length, language });

  validateAudioInput(audioBuffer);
  const apiKey = await getApiKey("whisper_api_key");
  validateApiKey(apiKey, "openai");

  const openai = getOpenAIClient(apiKey);
  const file = new File([new Uint8Array(audioBuffer)], "audio.webm", { type: "audio/webm" });

  const result = await withRetry("transcription", async () => {
    return openai.audio.transcriptions.create({
      file,
      model: CONFIG.models.openai.transcription,
      language,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
      prompt: WHISPER_HINT,
    });
  });

  const rawText = result.text || "";
  if (rawText.trim().length === 0) {
    throw new LlmError({
      code: LlmErrorCode.TRANSCRIPTION_FAILED,
      message: "Transcription vide. L'audio ne contient peut-être pas de parole audible. Vérifiez la qualité de l'enregistrement.",
      provider: "openai",
    });
  }

  const text = postProcessTranscription(rawText);

  const segments = ((result as any).segments || []).map(
    (s: { start: number; end: number; text: string }) => ({
      start: s.start, end: s.end, text: s.text?.trim() || "",
    })
  );

  const duration = segments.length > 0
    ? segments[segments.length - 1].end
    : (result as any).duration || 0;

  // Confidence from average log probabilities
  const logprobs = ((result as any).segments || [])
    .map((s: any) => s.avg_logprob)
    .filter((v: unknown): v is number => typeof v === "number");
  const avgLogprob = logprobs.length > 0
    ? logprobs.reduce((a: number, b: number) => a + b, 0) / logprobs.length
    : -0.5;
  const confidence = Math.max(0, Math.min(1, 1 + avgLogprob / 1.5));

  const elapsed = Date.now() - t0;
  log("info", "Transcription done", {
    duration: Math.round(duration), chars: text.length, segs: segments.length,
    confidence: Math.round(confidence * 100) / 100, elapsed,
  });

  if (confidence < 0.3) {
    log("warn", "Low confidence transcription — poor audio quality", { confidence });
  }

  return { text, segments, duration, confidence };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATION ENGINE — OpenAI & Anthropic with system/user prompt split
// ═══════════════════════════════════════════════════════════════════════════════

async function genOpenAI(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = await getApiKey("openai_api_key");
  validateApiKey(apiKey, "openai");
  const openai = getOpenAIClient(apiKey);

  const completion = await openai.chat.completions.create({
    model: CONFIG.models.openai.generation,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
    top_p: 0.95,
  });

  const content = completion.choices?.[0]?.message?.content;
  const finish = completion.choices?.[0]?.finish_reason;

  if (finish === "content_filter") {
    throw new LlmError({
      code: LlmErrorCode.CONTENT_FILTERED,
      message: "Contenu filtré par les politiques de sécurité d'OpenAI.",
      provider: "openai",
    });
  }
  if (!content || content.trim().length === 0) {
    throw new LlmError({
      code: LlmErrorCode.INVALID_RESPONSE,
      message: "OpenAI a retourné une réponse vide.",
      provider: "openai", retryable: true,
      context: { finishReason: finish },
    });
  }
  if (finish === "length") {
    log("warn", "OpenAI response truncated (max_tokens)", { maxTokens });
  }

  log("debug", "OpenAI gen done", {
    promptTok: completion.usage?.prompt_tokens,
    completionTok: completion.usage?.completion_tokens,
    finish,
  });

  return content;
}

async function genAnthropic(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = await getApiKey("anthropic_api_key");
  validateApiKey(apiKey, "anthropic");
  const anthropic = getAnthropicClient(apiKey);

  const msg = await anthropic.messages.create({
    model: CONFIG.models.anthropic.generation,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    temperature: 0.2,
  });

  if (msg.stop_reason === "max_tokens") {
    log("warn", "Anthropic response truncated (max_tokens)", { maxTokens });
  }

  const tb = msg.content.find((b) => b.type === "text");
  if (!tb || tb.type !== "text" || !tb.text?.trim()) {
    throw new LlmError({
      code: LlmErrorCode.INVALID_RESPONSE,
      message: "Anthropic a retourné une réponse vide.",
      provider: "anthropic", retryable: true,
      context: { stopReason: msg.stop_reason },
    });
  }

  log("debug", "Anthropic gen done", {
    inputTok: msg.usage?.input_tokens,
    outputTok: msg.usage?.output_tokens,
    stop: msg.stop_reason,
  });

  return tb.text;
}

async function generateJSON(
  system: string, user: string, maxTokens: number
): Promise<Record<string, unknown>> {
  const t0 = Date.now();
  const provider = await getLlmProvider();
  log("info", "LLM gen start", { provider, maxTokens });

  const genFn = provider === "anthropic" ? genAnthropic : genOpenAI;

  const raw = await withRetry(`gen:${provider}`, () => genFn(system, user, maxTokens));

  let parsed: Record<string, unknown>;
  try {
    parsed = safeParseJSON(raw, provider);
  } catch (parseErr) {
    // JSON parse failed — retry generation with reinforced instruction
    log("warn", "JSON parse failed, retrying with reinforced instruction");
    const reinforced = user + "\n\n⚠️ RAPPEL : Répondez UNIQUEMENT en JSON valide. Commencez par { et terminez par }. Aucun texte autour.";
    const raw2 = await withRetry(`gen-retry:${provider}`, () => genFn(system, reinforced, maxTokens), 2);
    parsed = safeParseJSON(raw2, provider);
  }

  log("info", "LLM gen done", { provider, elapsed: Date.now() - t0, keys: Object.keys(parsed) });
  return parsed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API — REPORT GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReportResult {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  legalNotes: string;
  metadata: {
    provider: string;
    format: string;
    generatedAt: string;
    transcriptionLength: number;
  };
}

export async function generateReport(
  transcription: string,
  clientName: string,
  caseReference: string | null,
  format: "standard" | "detailed" | "brief" = "standard",
  language: string = "fr"
): Promise<ReportResult> {
  if (!transcription || transcription.trim().length < 20) {
    throw new LlmError({
      code: LlmErrorCode.GENERATION_FAILED,
      message: "Transcription trop courte pour générer un rapport (minimum 20 caractères).",
      provider: "unknown",
    });
  }

  const safeName = clientName?.trim() || "Client non spécifié";
  const safeRef = caseReference?.trim() || null;
  const safeFormat = (["brief", "standard", "detailed"].includes(format) ? format : "standard") as "brief" | "standard" | "detailed";

  const { system, user } = buildReportPrompt(safeName, safeRef, language, safeFormat, transcription);

  const maxTok = safeFormat === "detailed" ? CONFIG.tokens.maxReport
    : safeFormat === "brief" ? CONFIG.tokens.maxBrief
    : CONFIG.tokens.maxReport;

  const result = await generateJSON(system, user, maxTok);
  const provider = await getLlmProvider();

  const report: ReportResult = {
    title: str(result.title, `Rapport de consultation — ${safeName}`),
    summary: str(result.summary, ""),
    keyPoints: strArr(result.keyPoints),
    actionItems: strArr(result.actionItems),
    legalNotes: str(result.legalNotes, ""),
    metadata: {
      provider,
      format: safeFormat,
      generatedAt: new Date().toISOString(),
      transcriptionLength: transcription.length,
    },
  };

  // Quality gate
  if (report.summary.length < 50 && safeFormat !== "brief") {
    log("warn", "Summary unusually short", { len: report.summary.length, format: safeFormat });
  }
  if (report.keyPoints.length === 0) {
    log("warn", "No key points extracted");
  }

  return report;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API — FLASH METADATA EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FlashMetadata {
  title: string;
  clientName: string;
  caseReference: string | null;
  category: string;
  description: string;
}

export async function extractSessionMetadata(transcription: string): Promise<FlashMetadata> {
  if (!transcription || transcription.trim().length < 10) {
    return {
      title: "Session flash",
      clientName: "Client non identifié",
      caseReference: null,
      category: "general",
      description: "Transcription insuffisante pour l'extraction de métadonnées.",
    };
  }

  const { system, user } = buildFlashPrompt(transcription);
  const result = await generateJSON(system, user, CONFIG.tokens.maxMetadata);

  return {
    title: str(result.title, "Session flash"),
    clientName: str(result.clientName, "Client non identifié"),
    caseReference: typeof result.caseReference === "string" && result.caseReference.trim().length > 0
      ? result.caseReference.trim() : null,
    category: validCategory(result.category),
    description: str(result.description, ""),
  };
}
