/**
 * WhatsApp Message Parser for Hearing Reports
 * 
 * Two-tier parsing system:
 *   1. AI-powered parser (primary) — Uses Groq (Llama 3.3 70B) to intelligently parse
 *      any free-form WhatsApp message about hearings. Detects hearing reports
 *      even in informal, conversational messages.
 *   2. Regex-based parser (fallback) — Used when AI is unavailable.
 * 
 * The AI parser understands natural language, detects context, and produces
 * professional, detailed hearing report data automatically.
 */

import OpenAI from "openai";
import prisma from "./prisma";

export interface ParsedHearingReport {
  hearingDate: string | null;
  clientName: string | null;
  caseReference: string | null;
  jurisdiction: string | null;
  chamber: string | null;
  opponent: string | null;
  lawyerName: string | null;
  outcome: string | null;
  nextHearingDate: string | null;
  tasks: string[];
  notes: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI DETECTION — Does this message talk about a hearing/role?
// ═══════════════════════════════════════════════════════════════════════════════

const DETECTION_SYSTEM = `Vous êtes un assistant juridique du Cabinet HOK (Cotonou, Bénin). Votre SEULE tâche est de déterminer si un message WhatsApp contient un compte rendu d'audience ou des informations relatives à un rôle d'audience.

Un message est un compte rendu d'audience s'il mentionne AU MOINS deux des éléments suivants :
- Une audience qui a eu lieu (date passée ou récente)
- Un tribunal, une juridiction, un juge
- Un dossier, une affaire, un client
- Un résultat d'audience (renvoi, jugement, expertise, mise en état, radiation, jonction...)
- Une prochaine date d'audience
- Des tâches à accomplir suite à l'audience

IMPORTANT : Les avocats écrivent souvent de manière INFORMELLE dans le groupe WhatsApp.
Exemples de messages qui SONT des comptes rendus :
- "Bonsoir confrères, audience ce matin au TPI, dossier HOUNGBEDJI c/ SCI Gbeto Immo, renvoyé au 25 mars, il faut préparer les conclusions"
- "CR audience: Affaire RG 2026/456 devant la 2ème chambre. Expertise ordonnée. Prochain rdv 15 avril"
- "Chers collègues l'affaire konan contre la banque a été appelée aujourd'hui. Le juge a renvoyé pour conclusions au 3 mars"

Messages qui NE SONT PAS des comptes rendus :
- "Bonsoir, on se retrouve demain au cabinet ?"
- "Joyeux anniversaire Maître !"
- "Le nouveau stagiaire commence lundi"

Répondez UNIQUEMENT par un JSON :
{ "isHearingReport": true/false, "confidence": 0.0-1.0, "reason": "explication courte" }`;

/**
 * Uses AI to detect if a WhatsApp message contains hearing report content.
 * Falls back to keyword-based detection if AI is unavailable.
 */
export async function detectHearingReportAI(text: string): Promise<{ isReport: boolean; confidence: number }> {
  if (!text || text.length < 20) return { isReport: false, confidence: 1.0 };

  // Quick pre-filter: skip very short messages or obvious non-reports
  const lowerText = text.toLowerCase();
  const trivialPatterns = [
    /^(bonjour|bonsoir|salut|merci|ok|d['']accord|👍|🙏)\s*$/i,
    /^(joyeux|bon|bonne|félicitations)/i,
  ];
  if (text.length < 30 && trivialPatterns.some(p => p.test(text.trim()))) {
    return { isReport: false, confidence: 0.95 };
  }

  try {
    const apiKey = await getGroqKey();
    if (!apiKey) {
      // No AI available, fall back to keyword detection
      return { isReport: isHearingReportKeywords(text), confidence: 0.6 };
    }

    const result = await callAI(apiKey, DETECTION_SYSTEM, `Message WhatsApp :\n"""${text}"""`, 256);
    const parsed = JSON.parse(extractJSON(result));
    
    return {
      isReport: parsed.isHearingReport === true && (parsed.confidence || 0) >= 0.6,
      confidence: parsed.confidence || 0,
    };
  } catch (err) {
    console.warn("[WhatsApp AI Detection] Error, falling back to keywords:", err);
    return { isReport: isHearingReportKeywords(text), confidence: 0.5 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI PARSING — Extract structured hearing report from free-form message
// ═══════════════════════════════════════════════════════════════════════════════

const PARSING_SYSTEM = `Vous êtes un assistant juridique expert du Cabinet HOK (Cotonou, Bénin), spécialisé dans le droit béninois et OHADA.

MISSION : Analyser un message WhatsApp d'un avocat et en extraire un compte rendu d'audience PROFESSIONNEL et DÉTAILLÉ.

CONTEXTE JURIDIQUE :
• Juridictions béninoises : TPI (Tribunal de Première Instance), TGI, Cour d'Appel, Tribunal de Commerce, CRIET
• Droit OHADA : AUDCG, AUSCGIE, AUPSRVE, AUPCAP, AUA
• Le message peut être informel, avec des abréviations, du langage courant

RÈGLES D'EXTRACTION :
1. hearingDate — La date de l'audience qui a eu lieu. Format YYYY-MM-DD. Si pas explicite, déduire du contexte ("ce matin", "aujourd'hui" = date du jour).
2. clientName — Nom complet du client. Extraire même s'il est abrégé.
3. caseReference — Référence du dossier (RG, n°, numéro). null si absent.
4. jurisdiction — Nom complet de la juridiction. Toujours écrire en entier (pas "TPI" seul mais "TPI Cotonou").
5. chamber — Chambre concernée. null si non mentionnée.
6. opponent — Partie adverse. null si non mentionnée.
7. lawyerName — Nom de l'avocat en charge. Format "Me [Nom]". null si non mentionné.
8. outcome — RÉSUMÉ PROFESSIONNEL ET DÉTAILLÉ de ce qui s'est passé à l'audience. Rédigez dans un style juridique formel, même si le message source est informel. Mentionnez :
   - La nature de la décision (renvoi, mise en état, expertise, radiation, jugement, etc.)
   - Les motifs si indiqués
   - Les obligations imposées par le tribunal
   Ce résumé doit être PUBLIABLE dans un rôle d'audience officiel du cabinet.
9. nextHearingDate — Date de la prochaine audience. Format YYYY-MM-DD. null si pas de renvoi.
10. tasks — Liste des tâches à accomplir avant la prochaine audience. Déduire des obligations mentionnées. Rédiger de manière ACTIONNELLE ("Préparer les conclusions en réplique", "Déposer le mémoire avant le 15 mars").
11. notes — Observations juridiques complémentaires, points de vigilance, textes de loi pertinents. null si rien de notable.

IMPORTANT :
- NE JAMAIS inventer des informations absentes du message
- Si une information est absente, mettre null (pas "Non spécifié")
- Les dates doivent être au format YYYY-MM-DD
- Le résumé (outcome) doit être PROFESSIONNEL même si le message source est familier
- Aujourd'hui nous sommes le ${new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

Répondez UNIQUEMENT par un JSON valide :
{
  "hearingDate": "YYYY-MM-DD" | null,
  "clientName": "string" | null,
  "caseReference": "string" | null,
  "jurisdiction": "string" | null,
  "chamber": "string" | null,
  "opponent": "string" | null,
  "lawyerName": "string" | null,
  "outcome": "string — résumé professionnel détaillé",
  "nextHearingDate": "YYYY-MM-DD" | null,
  "tasks": ["string — tâche actionnable", ...],
  "notes": "string — observations juridiques" | null
}`;

/**
 * Uses AI to parse a WhatsApp message into a structured hearing report.
 * Falls back to regex parsing if AI is unavailable.
 */
export async function parseWhatsAppMessageAI(text: string, senderName?: string): Promise<ParsedHearingReport | null> {
  if (!text || text.trim().length < 20) return null;

  try {
    const apiKey = await getGroqKey();
    if (!apiKey) {
      console.log("[WhatsApp AI Parser] No Groq API key, falling back to regex parser");
      return parseWhatsAppMessageRegex(text);
    }

    const userPrompt = `Message WhatsApp${senderName ? ` de ${senderName}` : ""} :\n"""\n${text}\n"""

Analysez ce message et extrayez le compte rendu d'audience en JSON structuré.`;

    const result = await callAI(apiKey, PARSING_SYSTEM, userPrompt, 2048);
    const parsed = JSON.parse(extractJSON(result));

    // Validate minimum fields
    if (!parsed.clientName && !parsed.caseReference && !parsed.outcome) {
      console.log("[WhatsApp AI Parser] AI returned empty fields, trying regex fallback");
      return parseWhatsAppMessageRegex(text);
    }

    // Normalize tasks to array
    let tasks: string[] = [];
    if (Array.isArray(parsed.tasks)) {
      tasks = parsed.tasks.filter((t: any) => typeof t === "string" && t.trim().length > 0);
    }

    return {
      hearingDate: parsed.hearingDate || new Date().toISOString().split("T")[0],
      clientName: parsed.clientName || null,
      caseReference: parsed.caseReference || null,
      jurisdiction: parsed.jurisdiction || null,
      chamber: parsed.chamber || null,
      opponent: parsed.opponent || null,
      lawyerName: parsed.lawyerName || null,
      outcome: parsed.outcome || null,
      nextHearingDate: parsed.nextHearingDate || null,
      tasks,
      notes: parsed.notes || null,
    };
  } catch (err) {
    console.warn("[WhatsApp AI Parser] Error, falling back to regex:", err);
    return parseWhatsAppMessageRegex(text);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI INFRASTRUCTURE — key retrieval, client calls, JSON extraction
// ═══════════════════════════════════════════════════════════════════════════════

async function getGroqKey(): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "groq_api_key" } });
    if (setting?.value?.trim()) return setting.value.trim();
  } catch {}
  return process.env.GROQ_API_KEY?.trim() || "";
}

async function callAI(apiKey: string, system: string, user: string, maxTokens: number): Promise<string> {
  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.1,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  });
  return completion.choices?.[0]?.message?.content || "";
}

function extractJSON(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();
  try { JSON.parse(s); return s; } catch {}
  const m = s.match(/\{[\s\S]*\}/);
  if (m) { try { JSON.parse(m[0]); return m[0]; } catch {} }
  return s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGEX FALLBACK — keyword detection + pattern-based extraction
// ═══════════════════════════════════════════════════════════════════════════════

const FIELD_PATTERNS: Record<string, RegExp[]> = {
  hearingDate: [
    /(?:date|date d['']audience|audience le|audience du)\s*[:：]\s*(.+)/i,
    /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s/m,
  ],
  clientName: [
    /(?:client|nom du client|client\s*[:：])\s*[:：]?\s*(.+)/i,
    /(?:affaire|dossier de)\s+(.+?)(?:\s+c\/|\s+contre)/i,
  ],
  caseReference: [
    /(?:dossier|réf|ref|référence|n°|numero|numéro)\s*[:：]?\s*(.+)/i,
    /(?:RG\s*\d{4}[\/\-]\d+)/i,
  ],
  jurisdiction: [
    /(?:juridiction|tribunal|cour|juge|devant)\s*[:：]?\s*(.+)/i,
    /(?:TPI|TGI|Cour d['']Appel|Tribunal de Commerce|Tribunal Administratif)\s*[^\n]*/i,
  ],
  chamber: [
    /(?:chambre)\s*[:：]\s*(.+)/i,
    /(\d+[eè](?:me|re)?\s+ch(?:ambre)?[^\n]*)/i,
  ],
  opponent: [
    /(?:adverse|partie adverse|contre|opposant|défendeur|demandeur)\s*[:：]?\s*(.+)/i,
    /c\/\s*(.+?)(?:\n|$)/i,
  ],
  lawyerName: [
    /(?:avocat|conseil|me |maître|maitre)\s*[:：]?\s*(.+)/i,
  ],
  outcome: [
    /(?:résumé|resume|compte rendu|cr|résultat|décision|rendu)\s*[:：]\s*([\s\S]+?)(?=(?:\n(?:prochaine|tâche|tache|note|$)))/i,
    /(?:résumé|resume|compte rendu|cr|résultat)\s*[:：]\s*(.+)/i,
  ],
  nextHearingDate: [
    /(?:prochaine|prochaine audience|prochaine date|prochain rdv)\s*[:：]\s*(.+)/i,
    /(?:renvoi|renvoyé|reporté)\s+(?:au|le)\s+(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i,
    /(?:renvoi|renvoyé|reporté)\s+(?:au|le)\s+(\d{1,2}\s+\w+\s+\d{4})/i,
  ],
  tasks: [
    /(?:tâches?|taches?|à faire|a faire|todo|actions?)\s*[:：]\s*(.+)/i,
  ],
  notes: [
    /(?:notes?|observations?|remarques?|nb)\s*[:：]\s*(.+)/i,
  ],
};

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();

  const match = cleaned.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    let year = match[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const months: Record<string, string> = {
    janvier: "01", février: "02", fevrier: "02", mars: "03", avril: "04",
    mai: "05", juin: "06", juillet: "07", août: "08", aout: "08",
    septembre: "09", octobre: "10", novembre: "11", décembre: "12", decembre: "12",
  };
  const naturalMatch = cleaned.match(/(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+(\d{4})/i);
  if (naturalMatch) {
    const day = naturalMatch[1].padStart(2, "0");
    const month = months[naturalMatch[2].toLowerCase()] || "01";
    const year = naturalMatch[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

function extractField(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim();
  }
  return null;
}

export function parseWhatsAppMessageRegex(text: string): ParsedHearingReport | null {
  if (!text || text.trim().length < 20) return null;

  const rawHearingDate = extractField(text, FIELD_PATTERNS.hearingDate);
  const clientName = extractField(text, FIELD_PATTERNS.clientName);
  const caseReference = extractField(text, FIELD_PATTERNS.caseReference);
  const jurisdiction = extractField(text, FIELD_PATTERNS.jurisdiction);
  const chamber = extractField(text, FIELD_PATTERNS.chamber);
  const opponent = extractField(text, FIELD_PATTERNS.opponent);
  const lawyerName = extractField(text, FIELD_PATTERNS.lawyerName);
  const outcome = extractField(text, FIELD_PATTERNS.outcome);
  const rawNextDate = extractField(text, FIELD_PATTERNS.nextHearingDate);
  const rawTasks = extractField(text, FIELD_PATTERNS.tasks);
  const notes = extractField(text, FIELD_PATTERNS.notes);

  const hearingDate = parseDate(rawHearingDate || "");
  const nextHearingDate = parseDate(rawNextDate || "");

  let tasks: string[] = [];
  if (rawTasks) {
    tasks = rawTasks
      .split(/[,;]|\d+[\.\)]\s*/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }

  if (!clientName && !caseReference) return null;
  if (!outcome && text.length < 50) return null;

  return {
    hearingDate: hearingDate || new Date().toISOString().split("T")[0],
    clientName: clientName || "Non spécifié",
    caseReference: caseReference || "Non spécifié",
    jurisdiction: jurisdiction || "Non spécifié",
    chamber,
    opponent,
    lawyerName,
    outcome: outcome || text.substring(0, 500),
    nextHearingDate,
    tasks,
    notes,
  };
}

/**
 * Keyword-based hearing report detection (fallback when AI is unavailable).
 */
export function isHearingReportKeywords(text: string): boolean {
  if (!text || text.length < 30) return false;
  const lowerText = text.toLowerCase();
  const keywords = [
    "compte rendu", "audience", "tribunal", "juridiction", "dossier",
    "client", "renvoi", "prochaine", "tpi", "cour d'appel", "tâche",
    "résumé", "avocat", "chambre", "rg ", "adverse", "jugement",
    "expertise", "mise en état", "radiation", "renvoyé", "reporté",
  ];
  const matchCount = keywords.filter((k) => lowerText.includes(k)).length;
  return matchCount >= 2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY EXPORTS — backward compatibility
// ═══════════════════════════════════════════════════════════════════════════════

export const parseWhatsAppMessage = parseWhatsAppMessageRegex;
export const isHearingReport = isHearingReportKeywords;
