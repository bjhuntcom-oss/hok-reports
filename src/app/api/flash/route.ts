import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { transcribeAudio, extractSessionMetadata, generateReport } from "@/lib/llm";
import { readFile } from "fs/promises";
import path from "path";
import { logAudit, getClientInfo } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const { allowed } = rateLimit(`flash:${userId}`, 5, 60000);
    if (!allowed) {
      return NextResponse.json({ error: "Trop de requêtes. Réessayez dans une minute." }, { status: 429 });
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const sessionData = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { transcription: true },
    });

    if (!sessionData) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }
    if (sessionData.userId !== userId && (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    // Step 1: Transcribe audio if not already done
    let transcriptionText = sessionData.transcription?.content;
    if (!transcriptionText && sessionData.audioUrl) {
      // Extract filename from audioUrl (supports both /api/audio/ and legacy /uploads/audio/)
      let audioFileName: string | null = null;
      if (sessionData.audioUrl.startsWith("/api/audio/")) {
        audioFileName = sessionData.audioUrl.replace("/api/audio/", "");
      } else if (sessionData.audioUrl.startsWith("/uploads/audio/")) {
        audioFileName = sessionData.audioUrl.replace("/uploads/audio/", "");
      }
      if (!audioFileName || audioFileName.includes("..") || audioFileName.includes("/")) {
        return NextResponse.json({ error: "Chemin audio invalide" }, { status: 400 });
      }

      // Try new location first (data/audio/), then legacy (public/uploads/audio/)
      let audioBuffer: Buffer;
      const newPath = path.join(process.cwd(), "data", "audio", audioFileName);
      const legacyPath = path.join(process.cwd(), "public", "uploads", "audio", audioFileName);
      try {
        audioBuffer = Buffer.from(await readFile(newPath));
      } catch {
        try {
          audioBuffer = Buffer.from(await readFile(legacyPath));
        } catch {
          return NextResponse.json({ error: "Fichier audio introuvable sur le serveur" }, { status: 404 });
        }
      }
      const result = await transcribeAudio(audioBuffer, sessionData.language || "fr");
      transcriptionText = result.text;

      await prisma.transcription.create({
        data: {
          content: result.text,
          segments: JSON.stringify(result.segments),
          language: sessionData.language || "fr",
          sessionId,
        },
      });

      await prisma.session.update({
        where: { id: sessionId },
        data: { status: "completed" },
      });
    }

    if (!transcriptionText) {
      return NextResponse.json({ error: "Aucun audio ou transcription disponible" }, { status: 400 });
    }

    // Step 2: Extract session metadata from transcription
    const metadata = await extractSessionMetadata(transcriptionText);

    // Step 3: Update session with extracted metadata (preserve audioDuration)
    const currentSession = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { audioDuration: true },
    });
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        title: metadata.title,
        clientName: metadata.clientName,
        caseReference: metadata.caseReference,
        description: metadata.description,
        status: "completed",
        ...(currentSession?.audioDuration ? { audioDuration: currentSession.audioDuration } : {}),
      },
    });

    // Step 4: Generate report
    const report = await generateReport(
      transcriptionText,
      metadata.clientName,
      metadata.caseReference,
      "standard",
      sessionData.language || "fr"
    );

    const createdReport = await prisma.report.create({
      data: {
        title: report.title,
        summary: report.summary,
        keyPoints: JSON.stringify(report.keyPoints),
        actionItems: JSON.stringify(report.actionItems),
        legalNotes: report.legalNotes,
        suggestions: JSON.stringify(report.suggestions),
        category: metadata.category,
        format: "standard",
        sessionId,
        userId,
      },
    });

    await logAudit({
      userId,
      action: "flash_record",
      entity: "session",
      entityId: sessionId,
      details: { reportId: createdReport.id, title: metadata.title, clientName: metadata.clientName },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      session: { id: sessionId, ...metadata },
      report: { id: createdReport.id, title: report.title },
    });
  } catch (error: any) {
    console.error("Flash processing error:", error);
    return NextResponse.json({ error: "Erreur de traitement flash" }, { status: 500 });
  }
}
