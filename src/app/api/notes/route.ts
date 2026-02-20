import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { sessionId, content, timestamp, isImportant } = await req.json();

    if (!sessionId || !content) {
      return NextResponse.json(
        { error: "sessionId et content requis" },
        { status: 400 }
      );
    }

    // Verify session ownership
    const sessionData = await prisma.session.findUnique({ where: { id: sessionId }, select: { userId: true } });
    if (!sessionData) {
      return NextResponse.json({ error: "Session introuvable" }, { status: 404 });
    }
    if (role !== "admin" && sessionData.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const note = await prisma.note.create({
      data: {
        content,
        timestamp: timestamp || null,
        isImportant: isImportant || false,
        sessionId,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Note create error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const noteId = searchParams.get("id");

    if (!noteId) {
      return NextResponse.json({ error: "id requis" }, { status: 400 });
    }

    // Verify note exists and user owns the parent session
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { session: { select: { userId: true } } },
    });
    if (!note) {
      return NextResponse.json({ error: "Note introuvable" }, { status: 404 });
    }
    if (role !== "admin" && note.session.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    await prisma.note.delete({ where: { id: noteId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Note delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
