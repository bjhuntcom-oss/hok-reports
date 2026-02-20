import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { transcribeAudio } from "@/lib/llm";
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
    const role = (session.user as any).role;
    const { ipAddress, userAgent } = getClientInfo(req);
    const { sessionId } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const sessionData = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!sessionData || !sessionData.audioUrl) {
      return NextResponse.json({ error: "Session ou audio non trouvé" }, { status: 404 });
    }
    if (role !== "admin" && sessionData.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    await prisma.session.update({ where: { id: sessionId }, data: { status: "transcribing" } });

    const audioPath = path.join(process.cwd(), "public", sessionData.audioUrl);
    const audioBuffer = await readFile(audioPath);

    const result = await transcribeAudio(audioBuffer, sessionData.language || "fr");

    const transcription = await prisma.transcription.create({
      data: {
        content: result.text,
        segments: JSON.stringify(result.segments),
        language: sessionData.language || "fr",
        sessionId,
      },
    });

    await prisma.session.update({ where: { id: sessionId }, data: { status: "completed" } });

    await logAudit({ userId, action: "transcribe", entity: "session", entityId: sessionId, details: { length: result.text.length }, ipAddress, userAgent });

    return NextResponse.json(transcription);
  } catch (error) {
    console.error("Transcription error:", error);
    try {
      const body = await req.clone().json();
      if (body?.sessionId) {
        await prisma.session.update({ where: { id: body.sessionId }, data: { status: "error" } });
      }
    } catch {}
    return NextResponse.json({ error: "Erreur de transcription" }, { status: 500 });
  }
}
