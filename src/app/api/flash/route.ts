import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { transcribeAudio, extractSessionMetadata, generateReport } from "@/lib/llm";
import { readFile } from "fs/promises";
import path from "path";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
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
      const audioPath = path.join(process.cwd(), "public", sessionData.audioUrl);
      const audioBuffer = Buffer.from(await readFile(audioPath));
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

    // Step 3: Update session with extracted metadata
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        title: metadata.title,
        clientName: metadata.clientName,
        caseReference: metadata.caseReference,
        description: metadata.description,
        status: "completed",
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
    return NextResponse.json({ error: error.message || "Erreur de traitement flash" }, { status: 500 });
  }
}
