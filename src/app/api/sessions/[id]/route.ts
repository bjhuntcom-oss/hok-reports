import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { filterSessionFields } from "@/lib/sanitize";
import { logAudit, getClientInfo } from "@/lib/audit";
import { unlink } from "fs/promises";
import path from "path";

export async function GET(
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

    const sessionData = await prisma.session.findUnique({
      where: { id },
      include: {
        transcription: true,
        reports: { orderBy: { createdAt: "desc" } },
        notes: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!sessionData) {
      return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    }

    if (role !== "admin" && sessionData.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    return NextResponse.json(sessionData);
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

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

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    if (role !== "admin" && existing.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const safeData = filterSessionFields(body);
    const updated = await prisma.session.update({ where: { id }, data: safeData });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({ userId, action: "update_session", entity: "session", entityId: id, details: safeData, ipAddress, userAgent });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Session update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
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

    const existing = await prisma.session.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
    if (role !== "admin" && existing.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    // Delete audio file from disk if exists
    if (existing.audioUrl) {
      const filename = existing.audioUrl.split("/").pop();
      if (filename && !filename.includes("..")) {
        const candidates = [
          path.join(process.cwd(), "data", "audio", filename),
          path.join(process.cwd(), "public", "uploads", "audio", filename),
          path.join(process.cwd(), "public", "uploads", filename),
        ];
        for (const fp of candidates) {
          try { await unlink(fp); break; } catch { /* file not found, try next */ }
        }
      }
    }

    await prisma.session.delete({ where: { id } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({ userId, action: "delete_session", entity: "session", entityId: id, details: { title: existing.title }, ipAddress, userAgent });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Session delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
