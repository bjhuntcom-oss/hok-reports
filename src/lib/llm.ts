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

■ DROIT NATIONAL BÉNINOIS (toujours prioritaire) :
  • Constitution du 11 décembre 1990 (révisée en 2019) — droits fondamentaux, séparation des pouvoirs
  • Code des personnes et de la famille (loi n°2002-07 du 24 août 2004) — mariage, divorce, filiation, succession, tutelle
  • Code foncier et domanial (loi n°2013-01 du 14 janvier 2013) — propriété, immatriculation, baux, expropriation, CFR
  • Code du travail (loi n°98-004 du 27 janvier 1998) — contrats, licenciement, conventions collectives, inspection du travail
  • Code pénal (loi n°2018-16 du 28 décembre 2018) — infractions, peines, circonstances aggravantes/atténuantes
  • Code de procédure pénale — enquête, instruction, jugement, détention provisoire, recours
  • Code de procédure civile, commerciale, sociale, administrative et des comptes — compétence, procédures, voies de recours
  • Code général des impôts et Livre des procédures fiscales — fiscalité directe/indirecte, contentieux fiscal
  • Code du numérique (loi n°2017-20 du 20 avril 2018) — données personnelles, cybersécurité, e-commerce
  • Code de l'enfant (loi n°2015-08) — protection, droits, travail des mineurs
  • Loi n°2020-26 portant création de la CRIET — infractions économiques, financières, terrorisme
  • Loi sur l'APDP (Autorité de Protection des Données Personnelles) — conformité RGPD locale
  • Code des marchés publics (décret n°2017-539) — appels d'offres, attribution, contentieux
  • Loi n°2020-35 portant Code de l'administration territoriale — décentralisation, communes
  • Loi n°2020-25 portant Code électoral — contentieux électoral
  • Loi n°2005-029 portant réglementation bancaire — opérations de crédit, recouvrement

■ DROIT COMMUNAUTAIRE OHADA (17 États membres — supranational) :
  • AUDCG — Droit commercial général (révisé 15 déc. 2010) — commerçants, baux commerciaux, vente
  • AUSCGIE — Sociétés commerciales et GIE (révisé 30 janv. 2014) — constitution, gestion, dissolution
  • AUS — Sûretés (révisé 15 déc. 2010) — hypothèques, nantissements, cautionnement
  • AUPSRVE — Recouvrement et voies d'exécution (10 avril 1998) — saisies, injonction de payer
  • AUPCAP — Procédures collectives (révisé 10 sept. 2015) — redressement, liquidation
  • AUA — Arbitrage (23 nov. 2017) — clause compromissoire, sentence arbitrale
  • AUDCIF — Droit comptable (26 janv. 2017) — normes SYSCOHADA, comptes consolidés
  • AUCTMR — Transport de marchandises (22 mars 2003) — responsabilité transporteur
  • AUM — Médiation (23 nov. 2017) — médiation conventionnelle et judiciaire

■ DROIT INTERNATIONAL APPLICABLE AU BÉNIN :
  • Charte africaine des droits de l'homme et des peuples
  • Convention de New York relative aux droits de l'enfant
  • Conventions internationales du travail (OIT) ratifiées
  • Traité UEMOA — union économique et monétaire
  • Traité CEDEAO — libre circulation, droit d'établissement

■ INSTITUTIONS ET JURIDICTIONS :
  • CCJA — Cour Commune de Justice et d'Arbitrage (jurisprudence supranationale OHADA)
  • Cour Suprême du Bénin — cassation, constitutionnalité
  • Cour Constitutionnelle — contrôle de constitutionnalité, droits fondamentaux
  • Cours d'Appel (Cotonou, Parakou, Abomey) — appel civil, pénal, commercial
  • TPI — Tribunaux de Première Instance (compétence générale)
  • Tribunaux de Commerce — contentieux commercial, sociétés, baux
  • CRIET — Infractions économiques et financières
  • APDP — Protection des données personnelles
  • Barreau du Bénin — déontologie et exercice professionnel

■ HIÉRARCHIE DES NORMES (Bénin) :
  1. Constitution → 2. Traités et accords internationaux → 3. Actes uniformes OHADA → 4. Lois nationales → 5. Décrets → 6. Arrêtés → 7. Jurisprudence
  ⚠ Les Actes uniformes OHADA priment sur les lois nationales dans leur domaine (art. 10 Traité OHADA)

STANDARDS PROFESSIONNELS :
━━━━━━━━━━━━━━━━━━━━━━━━
• Déontologie stricte du Barreau du Bénin et secret professionnel
• Terminologie juridique précise du droit civil continental francophone
• Distinguer TOUJOURS : FAITS rapportés / ANALYSE juridique / RECOMMANDATIONS
• Signaler conflits d'intérêts potentiels et limites de compétence
• Indiquer délais de prescription applicables (civile 5 ans, commerciale OHADA 5 ans, pénale variable selon infraction)
• Mentionner voies de recours (opposition, appel, pourvoi en cassation, recours CCJA)
• NE JAMAIS inventer d'informations absentes de la source
• Formulations conditionnelles pour éléments incertains ("il semblerait que", "sous réserve de vérification")
• Marquer "[INAUDIBLE]" ou "[IMPRÉCIS]" les passages incomplets de la transcription
• Référencer les textes de loi avec numérotation officielle complète
• Toujours vérifier la juridiction compétente (TPI, Commerce, CRIET, etc.) selon la nature du litige
• Rappeler les frais et consignations éventuels (timbre fiscal, consignation en cassation, etc.)`;

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
4. STRUCTURE — Organiser thématiquement (faits → analyse → recommandations → suggestions)
5. PRÉCISION — Citer montants, dates, noms propres exactement comme mentionnés
6. NUANCE — Distinguer allégations du client vs éléments établis (documents, jugements)
7. CHRONOLOGIE — Respecter l'ordre des échanges quand discernable
8. RÉFÉRENCES — Citer textes de loi béninois et OHADA avec articles précis
9. ALERTES — Signaler risques de prescription, forclusion ou déchéance de droits
10. DÉONTOLOGIE — Jamais de conclusion définitive sur base d'une transcription seule
11. DROIT BÉNINOIS D'ABORD — Toujours appliquer en priorité le droit béninois et OHADA, puis les traités internationaux si pertinent
12. SUGGESTIONS PROACTIVES — Proposer des pistes concrètes (lois applicables, arguments, angles de défense, ouvertures stratégiques)

TEMPLATE DU RÉSUMÉ (à adapter selon le contenu) :
─────────────────────────────────────────────────
§1 — CONTEXTE ET OBJET : Présenter le cadre de la consultation, l'identité du client, la nature du problème juridique posé.
§2 — EXPOSÉ DES FAITS : Rapporter chronologiquement les faits tels que relatés par le client, en distinguant les éléments documentés des simples déclarations.
§3 — ANALYSE JURIDIQUE PRÉLIMINAIRE : Identifier les textes applicables (lois béninoises, Actes uniformes OHADA, conventions), qualifier juridiquement la situation, évaluer les forces et faiblesses de la position du client.
§4 — STRATÉGIE ET RECOMMANDATIONS : Proposer les options juridiques (voie amiable, médiation, contentieux), évaluer les risques, déterminer les prochaines étapes concrètes.
§5 — POINTS DE VIGILANCE : Délais à surveiller, pièces à rassembler, précautions à prendre, éventuelles questions déontologiques.

SECTION SUGGESTIONS (OBLIGATOIRE) :
───────────────────────────────────
Cette section est CRUCIALE. Pour chaque rapport, vous DEVEZ fournir des suggestions concrètes et exploitables pour aider l'avocat :
• TEXTES DE LOI APPLICABLES : Lister les articles précis du droit béninois, OHADA ou international directement applicables, avec le numéro de la loi et l'article (ex: "Art. 254 AUPSRVE — Procédure d'injonction de payer").
• ARGUMENTS JURIDIQUES : Proposer les arguments juridiques les plus solides en faveur du client, fondés sur la loi et la jurisprudence.
• ANGLES DE DÉFENSE : Si le client est en position défensive, identifier les moyens de défense (exceptions de procédure, prescription, nullité, incompétence, etc.).
• OUVERTURES STRATÉGIQUES : Proposer des pistes créatives (médiation OHADA, arbitrage CCJA, saisine de la Cour Constitutionnelle, recours administratif préalable, etc.).
• JURISPRUDENCE INDICATIVE : Mentionner des orientations jurisprudentielles connues de la CCJA, Cour Suprême du Bénin ou Cour Constitutionnelle si pertinent.
• ÉLÉMENTS DE PREUVE À CONSTITUER : Recommander les preuves, documents, témoignages, expertises à rassembler.
⚠ RAPPELER que ces suggestions sont indicatives et doivent être vérifiées par l'avocat. Les références légales et jurisprudentielles générées par IA peuvent contenir des erreurs et doivent impérativement être contrôlées avant toute utilisation.

DISCLAIMER OBLIGATOIRE :
───────────────────────
Le résumé doit se terminer par un paragraphe de mise en garde standardisé rappelant que :
- Ce rapport est généré automatiquement par IA à partir d'une transcription audio
- Les références légales citées doivent être vérifiées dans les textes officiels
- La transcription peut contenir des erreurs ou omissions (homophones, passages inaudibles)
- Ce document ne constitue pas un avis juridique formel et ne remplace pas l'analyse personnelle de l'avocat
- L'avocat doit vérifier tous les noms, dates, montants et références de dossier avant utilisation`;

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
  "summary": "string — résumé structuré suivant le template (§1 à §5) + paragraphe disclaimer en fin (\\n pour sauts de paragraphe)",
  "keyPoints": ["string — point clé complet et précis", ...],
  "actionItems": ["string — action concrète avec priorité (URGENT/NORMAL/À PLANIFIER) et échéance si connue", ...],
  "legalNotes": "string — observations juridiques, textes de loi béninois/OHADA avec articles, jurisprudence, vigilance",
  "suggestions": ["string — suggestion concrète : texte de loi applicable, argument juridique, angle de défense, ouverture stratégique, ou preuve à constituer — préfixer par le type entre crochets : [LOI], [ARGUMENT], [DÉFENSE], [OUVERTURE], [JURISPRUDENCE], [PREUVE]", ...]
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
