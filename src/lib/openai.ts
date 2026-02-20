import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: string = "fr"
): Promise<{
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
}> {
  const file = new File([new Uint8Array(audioBuffer)], "audio.webm", { type: "audio/webm" });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language,
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return {
    text: transcription.text,
    segments:
      (transcription as any).segments?.map(
        (s: { start: number; end: number; text: string }) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })
      ) || [],
  };
}

export async function generateReport(
  transcription: string,
  clientName: string,
  caseReference: string | null,
  format: "standard" | "detailed" | "brief" = "standard",
  language: string = "fr"
): Promise<{
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  legalNotes: string;
}> {
  const langInstruction =
    language === "en"
      ? "Respond entirely in English."
      : "Répondez entièrement en français.";

  const formatInstruction = {
    brief: "Produce a concise brief report (max 300 words for summary).",
    standard: "Produce a standard professional report (500-800 words for summary).",
    detailed:
      "Produce a very detailed and comprehensive report (1000+ words for summary).",
  }[format];

  const prompt = `Vous êtes un assistant juridique professionnel au sein du Cabinet HOK, un cabinet d'avocats établi à Cotonou, République du Bénin. Vous exercez dans le cadre du droit béninois (Code des personnes et de la famille, Code foncier et domanial, OHADA, etc.).

Analysez la transcription suivante d'une session avec le client "${clientName}"${caseReference ? ` (Dossier : ${caseReference})` : ""}.

${langInstruction}
${formatInstruction}

DIRECTIVES DE QUALITÉ :
- Le résumé doit être rédigé dans un style juridique professionnel, précis et structuré
- Utilisez le vocabulaire juridique approprié au droit béninois et au droit OHADA
- Les points clés doivent être formulés de manière claire et exploitable
- Les actions à entreprendre doivent être concrètes, avec des échéances si mentionnées
- Les observations juridiques doivent référencer les textes applicables (lois béninoises, Actes uniformes OHADA, conventions) lorsque pertinent
- Soyez exhaustif mais concis, chaque phrase doit apporter une information utile
- Ne fabriquez pas d'informations non présentes dans la transcription

Transcription :
"""
${transcription}
"""

Produisez une réponse JSON structurée avec :
1. "title": Un titre professionnel et descriptif pour ce rapport (ex: "Compte rendu de consultation — [sujet principal]")
2. "summary": Un résumé professionnel détaillé et structuré de la session, organisé en paragraphes thématiques
3. "keyPoints": Un tableau des points clés discutés (phrases complètes et précises)
4. "actionItems": Un tableau des actions à entreprendre / prochaines étapes (phrases concrètes et actionnables)
5. "legalNotes": Observations juridiques importantes, références aux textes de loi applicables, points d'attention déontologiques

Retournez UNIQUEMENT du JSON valide, sans markdown.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const result = JSON.parse(completion.choices[0].message.content || "{}");

  return {
    title: result.title || "Rapport de session",
    summary: result.summary || "",
    keyPoints: result.keyPoints || [],
    actionItems: result.actionItems || [],
    legalNotes: result.legalNotes || "",
  };
}

export default openai;
