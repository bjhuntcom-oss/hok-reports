import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeString } from "@/lib/sanitize";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const body = await req.json();

    const transcription = await prisma.transcription.findUnique({
      where: { id },
      include: { session: { select: { userId: true } } },
    });

    if (!transcription) {
      return NextResponse.json({ error: "Transcription non trouvée" }, { status: 404 });
    }
    if (role !== "admin" && transcription.session.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const data: any = {};
    if (body.content !== undefined) {
      data.content = sanitizeString(body.content);
    }

    const updated = await prisma.transcription.update({ where: { id }, data });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId,
      action: "update_transcription",
      entity: "transcription",
      entityId: id,
      details: { contentLength: data.content?.length },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Transcription update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
