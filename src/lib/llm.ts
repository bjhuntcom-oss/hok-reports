import OpenAI from "openai";
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
    groq: {
      transcription: "whisper-large-v3-turbo",
      generation: "llama-3.3-70b-versatile",
    },
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

async function getGroqApiKey(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "groq_api_key" } });
    if (setting?.value && setting.value.trim().length > 0) return setting.value.trim();
  } catch (err) {
    log("warn", "DB key read failed, env fallback", { error: String(err) });
  }
  const val = process.env.GROQ_API_KEY;
  if (val && val.trim().length > 0) return val.trim();
  return "";
}

function validateGroqKey(apiKey: string): void {
  if (!apiKey) {
    throw new LlmError({
      code: LlmErrorCode.API_KEY_MISSING,
      message: "Clé API Groq non configurée. Contactez l'administrateur (Administration → Moteur IA).",
      provider: "groq",
    });
  }
  if (!apiKey.startsWith("gsk_")) {
    throw new LlmError({
      code: LlmErrorCode.API_KEY_INVALID,
      message: "Clé API Groq invalide (format attendu : gsk_...). Vérifiez la configuration.",
      provider: "groq",
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT FACTORY (cached singletons per key)
// ═══════════════════════════════════════════════════════════════════════════════

let _groqTranscribe: { c: OpenAI; k: string } | null = null;
let _groqGenerate: { c: OpenAI; k: string } | null = null;

function getGroqTranscribeClient(apiKey: string): OpenAI {
  if (_groqTranscribe?.k === apiKey) return _groqTranscribe.c;
  const c = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1", timeout: CONFIG.timeout.transcription });
  _groqTranscribe = { c, k: apiKey };
  return c;
}

function getGroqGenerateClient(apiKey: string): OpenAI {
  if (_groqGenerate?.k === apiKey) return _groqGenerate.c;
  const c = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1", timeout: CONFIG.timeout.generation });
  _groqGenerate = { c, k: apiKey };
  return c;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RETRY ENGINE — exponential backoff, jitter, rate-limit awareness
// ═══════════════════════════════════════════════════════════════════════════════

function isRetryable(err: unknown): boolean {
  if (err instanceof LlmError) return err.retryable;
  if (err instanceof OpenAI.APIError) return [408, 413, 429, 500, 502, 503, 504, 529].includes(err.status);
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

function cleanLlmText(text: string): string {
  return text
    .replace(/[━─═■●★⚠⚖→←↑↓▶▷◆◇○◎□▪▫►▸☐☑☒✓✗✔✘☆§¶†‡※⊕⊗⊙⊛⊚⊝⊞⊟]/g, "")
    .replace(/^[\s]*[§]\d+[\s]*[—–\-:]*[\s]*/gm, "")
    .replace(/^[\s]*\d+\)\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function str(val: unknown, fallback: string): string {
  return typeof val === "string" && val.trim().length > 0 ? cleanLlmText(val.trim()) : fallback;
}

function strArr(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === "string" && v.trim().length > 0).map((s) => cleanLlmText(s.trim()));
}

function validCategory(val: unknown): string {
  const ok = ["consultation", "hearing", "deposition", "meeting", "general", "negotiation", "mediation", "litigation"];
  return typeof val === "string" && ok.includes(val.toLowerCase()) ? val.toLowerCase() : "general";
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEEP BENINESE LEGAL CONTEXT — shared across all prompts
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_CONTEXT = `Vous etes un assistant juridique expert senior au Cabinet HOK, Cotonou, Benin, dans l'espace OHADA et le droit national beninois.

CADRE JURIDIQUE :

DROIT NATIONAL BENINOIS (prioritaire) :
- Constitution du 11 decembre 1990 (revisee 2019)
- Code des personnes et de la famille (loi n.2002-07)
- Code foncier et domanial (loi n.2013-01)
- Code du travail (loi n.98-004)
- Code penal (loi n.2018-16)
- Code de procedure penale
- Code de procedure civile, commerciale, sociale, administrative
- Code general des impots
- Code du numerique (loi n.2017-20)
- Code de l'enfant (loi n.2015-08)
- Loi n.2020-26 CRIET
- Loi APDP
- Code des marches publics (decret n.2017-539)

DROIT OHADA (supranational, 17 Etats) :
- AUDCG, AUSCGIE, AUS, AUPSRVE, AUPCAP, AUA, AUDCIF, AUCTMR, AUM
- Les Actes uniformes OHADA priment sur les lois nationales (art. 10 Traite OHADA)

DROIT INTERNATIONAL : Charte africaine des droits de l'homme, UEMOA, CEDEAO

INSTITUTIONS : CCJA, Cour Supreme du Benin, Cour Constitutionnelle, Cours d'Appel, TPI, Tribunaux de Commerce, CRIET, APDP, Barreau du Benin

HIERARCHIE DES NORMES : Constitution > Traites internationaux > Actes uniformes OHADA > Lois nationales > Decrets > Arretes > Jurisprudence

STANDARDS PROFESSIONNELS :
- Deontologie du Barreau du Benin et secret professionnel
- Terminologie juridique precise du droit civil francophone
- Distinguer FAITS / ANALYSE / RECOMMANDATIONS
- Ne jamais inventer d'informations absentes de la source
- Formulations conditionnelles pour elements incertains
- Marquer [INAUDIBLE] ou [IMPRECIS] les passages incomplets
- Referencer les textes de loi avec numerotation officielle
- Indiquer delais de prescription et voies de recours`;

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT PROMPTS — system + user prompt builder
// ═══════════════════════════════════════════════════════════════════════════════

const REPORT_SYSTEM = `${LEGAL_CONTEXT}

MISSION : Redaction de comptes rendus de consultation juridique.

REGLES DE REDACTION :
1. FIDELITE : Ne jamais ajouter de faits absents de la transcription.
2. PRUDENCE : Conditionnel pour situations non confirmees.
3. EXHAUSTIVITE : Couvrir tous les sujets abordes.
4. STRUCTURE : Organiser en paragraphes thematiques (faits, analyse, recommandations).
5. PRECISION : Citer montants, dates, noms exactement comme mentionnes.
6. NUANCE : Distinguer allegations du client vs elements etablis.
7. REFERENCES : Citer textes de loi beninois et OHADA avec articles precis.
8. ALERTES : Signaler risques de prescription, forclusion ou decheance.
9. SUGGESTIONS : Proposer pistes concretes (lois, arguments, defense, ouvertures).

STRUCTURE DU RESUME (paragraphes separes par des sauts de ligne) :
- Paragraphe 1 : Contexte et objet de la consultation.
- Paragraphe 2 : Expose chronologique des faits.
- Paragraphe 3 : Analyse juridique preliminaire (textes applicables, qualification, forces/faiblesses).
- Paragraphe 4 : Strategie et recommandations (options, risques, prochaines etapes).
- Paragraphe 5 : Points de vigilance (delais, pieces, precautions).

SECTION SUGGESTIONS (obligatoire dans le champ "suggestions") :
Fournir des suggestions concretes prefixees par le type entre crochets :
- [LOI] : Articles precis applicables (ex: "Art. 254 AUPSRVE")
- [ARGUMENT] : Arguments juridiques solides en faveur du client
- [DEFENSE] : Moyens de defense (prescription, nullite, incompetence...)
- [OUVERTURE] : Pistes strategiques (mediation, arbitrage, recours...)
- [JURISPRUDENCE] : Orientations jurisprudentielles CCJA, Cour Supreme
- [PREUVE] : Preuves et documents a constituer

IMPORTANT - FORMATAGE DU TEXTE :
- Ecrire en francais standard avec accents normaux.
- NE PAS utiliser de caracteres speciaux decoratifs (pas de symboles comme des tirets longs, des lignes, des puces speciales, des fleches, des etoiles).
- Utiliser uniquement des tirets simples (-) pour les listes.
- Separer les paragraphes du resume par de simples sauts de ligne (\n\n).
- NE PAS prefixer les paragraphes du resume par des numeros ou des marqueurs.
- Ecrire du texte professionnel simple et lisible.`;

const FORMAT_RULES: Record<string, string> = {
  brief: `FORMAT : Synthese rapide.
- Resume : 200-400 mots, essentiel uniquement, 2-3 paragraphes.
- Points cles : 3-5 maximum, les plus critiques.
- Actions : 2-4 prioritaires, marquees URGENT ou NORMAL.
- Notes juridiques : breves, textes les plus directement applicables.`,
  standard: `FORMAT : Rapport standard.
- Resume : 500-900 mots, couverture complete, 4-5 paragraphes structures.
- Points cles : 5-12, organises par thematique juridique.
- Actions : toutes identifiees, priorite URGENT / NORMAL / A PLANIFIER, echeance si connue.
- Notes juridiques : textes applicables avec articles, jurisprudence si connue.`,
  detailed: `FORMAT : Rapport detaille exhaustif.
- Resume : 1000-2000 mots, analyse approfondie, sous-sections thematiques.
- Points cles : exhaustifs, hierarchie par domaine et niveau de risque.
- Actions : plan detaille, echeancier, responsabilites, conditions prealables, couts si mentionnes.
- Notes juridiques : analyse approfondie, articles precis, jurisprudence CCJA/Cour Supreme, doctrine, strategie.`,
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
Retournez UNIQUEMENT un objet JSON valide. Pas de texte avant ou apres, pas de markdown.
{
  "title": "Titre professionnel (ex: Compte rendu - Litige foncier - M. AHOUANDJINOU)",
  "summary": "Resume structure en paragraphes simples separes par des \\n\\n. Pas de marqueurs, pas de numeros de paragraphes, pas de caracteres speciaux.",
  "keyPoints": ["Point cle complet en texte simple"],
  "actionItems": ["Action concrete avec priorite URGENT ou NORMAL"],
  "legalNotes": "Observations juridiques avec references de textes de loi",
  "suggestions": ["[TYPE] Suggestion concrete en texte simple"]
}
RAPPEL : Le texte doit etre en francais courant avec accents. Pas de symboles decoratifs, pas de puces, pas de lignes, pas de marqueurs de section.`;

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const user = `CONTEXTE DE LA SESSION :
- Client : ${clientName}
${caseRef ? `- Reference dossier : ${caseRef}` : "- Reference dossier : non specifiee"}
- Date du rapport : ${today}
- Cabinet : HOK, Cotonou, Benin

TRANSCRIPTION INTEGRALE :
"""
${transcription}
"""

Analysez et produisez le rapport JSON structure.`;

  return { system, user };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLASH RECORDING — METADATA EXTRACTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const FLASH_SYSTEM = `${LEGAL_CONTEXT}

MISSION : Extraction automatique de metadonnees de session.

REGLES D'EXTRACTION :
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

Extrayez les metadonnees JSON.`,
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
      provider: "groq",
    });
  }
  if (buf.length < CONFIG.audio.minBytes) {
    throw new LlmError({
      code: LlmErrorCode.AUDIO_TOO_SHORT,
      message: "Enregistrement trop court. Minimum quelques secondes d'audio requis.",
      provider: "groq",
    });
  }
  if (buf.length > CONFIG.audio.maxBytes) {
    throw new LlmError({
      code: LlmErrorCode.TOKEN_LIMIT_EXCEEDED,
      message: `Fichier audio trop volumineux (${Math.round(buf.length / 1e6)}MB). Maximum : 25MB.`,
      provider: "groq",
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
  const apiKey = await getGroqApiKey();
  validateGroqKey(apiKey);

  const groq = getGroqTranscribeClient(apiKey);
  const file = new File([new Uint8Array(audioBuffer)], "audio.webm", { type: "audio/webm" });

  const result = await withRetry("transcription", async () => {
    return groq.audio.transcriptions.create({
      file,
      model: CONFIG.models.groq.transcription,
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
      provider: "groq",
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
// GENERATION ENGINE — Groq (Llama 3.3 70B) unified
// ═══════════════════════════════════════════════════════════════════════════════

async function genGroq(system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = await getGroqApiKey();
  validateGroqKey(apiKey);
  const groq = getGroqGenerateClient(apiKey);

  const completion = await groq.chat.completions.create({
    model: CONFIG.models.groq.generation,
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
      message: "Contenu filtré par les politiques de sécurité.",
      provider: "groq",
    });
  }
  if (!content || content.trim().length === 0) {
    throw new LlmError({
      code: LlmErrorCode.INVALID_RESPONSE,
      message: "Groq a retourné une réponse vide.",
      provider: "groq", retryable: true,
      context: { finishReason: finish },
    });
  }
  if (finish === "length") {
    log("warn", "Groq response truncated (max_tokens)", { maxTokens });
  }

  log("debug", "Groq gen done", {
    model: CONFIG.models.groq.generation,
    promptTok: completion.usage?.prompt_tokens,
    completionTok: completion.usage?.completion_tokens,
    finish,
  });

  return content;
}

async function generateJSON(
  system: string, user: string, maxTokens: number
): Promise<Record<string, unknown>> {
  const t0 = Date.now();
  log("info", "LLM gen start", { provider: "groq", model: CONFIG.models.groq.generation, maxTokens });

  const raw = await withRetry("gen:groq", () => genGroq(system, user, maxTokens));

  let parsed: Record<string, unknown>;
  try {
    parsed = safeParseJSON(raw, "groq");
  } catch (parseErr) {
    log("warn", "JSON parse failed, retrying with reinforced instruction");
    const reinforced = user + "\n\n⚠️ RAPPEL : Répondez UNIQUEMENT en JSON valide. Commencez par { et terminez par }. Aucun texte autour.";
    const raw2 = await withRetry("gen-retry:groq", () => genGroq(system, reinforced, maxTokens), 2);
    parsed = safeParseJSON(raw2, "groq");
  }

  log("info", "LLM gen done", { provider: "groq", elapsed: Date.now() - t0, keys: Object.keys(parsed) });
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
  suggestions: string[];
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

  const report: ReportResult = {
    title: str(result.title, `Rapport de consultation — ${safeName}`),
    summary: str(result.summary, ""),
    keyPoints: strArr(result.keyPoints),
    actionItems: strArr(result.actionItems),
    legalNotes: str(result.legalNotes, ""),
    suggestions: strArr(result.suggestions),
    metadata: {
      provider: "groq",
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
