import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { logAudit, getClientInfo } from "@/lib/audit";

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", "audio/x-m4a"];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { ipAddress, userAgent } = getClientInfo(req);
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const sessionId = formData.get("sessionId") as string;

    if (!file || !sessionId) {
      return NextResponse.json({ error: "Fichier et sessionId requis" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 100 Mo)" }, { status: 400 });
    }

    if (file.type && !ALLOWED_AUDIO_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format audio non supporté" }, { status: 400 });
    }

    const sessionData = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!sessionData) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }
    if (role !== "admin" && sessionData.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads", "audio");
    await mkdir(uploadDir, { recursive: true });

    const safeExt = path.extname(file.name).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
    const fileName = `${sessionId}-${Date.now()}${safeExt}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const audioUrl = `/uploads/audio/${fileName}`;

    await prisma.session.update({
      where: { id: sessionId },
      data: { audioUrl },
    });

    await logAudit({ userId, action: "upload_audio", entity: "session", entityId: sessionId, details: { fileName, size: file.size, type: file.type }, ipAddress, userAgent });

    return NextResponse.json({ audioUrl }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Erreur d'upload" }, { status: 500 });
  }
}
