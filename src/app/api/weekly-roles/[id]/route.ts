import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const role = await prisma.weeklyRole.findUnique({
      where: { id },
      include: { user: { select: { name: true } } },
    });

    if (!role) {
      return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("GET weekly-role error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.weeklyRole.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });
    }

    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.notes !== undefined) data.notes = body.notes;
    if (body.entries !== undefined) data.entries = JSON.stringify(body.entries);

    const updated = await prisma.weeklyRole.update({ where: { id }, data });

    await logAudit({
      userId,
      action: body.status === "published" ? "publish_weekly_role" : "update_weekly_role",
      entity: "weekly_role",
      entityId: id,
      details: { status: updated.status },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH weekly-role error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const { id } = await params;

    const existing = await prisma.weeklyRole.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Rôle introuvable" }, { status: 404 });
    }

    await prisma.weeklyRole.delete({ where: { id } });

    await logAudit({
      userId,
      action: "delete_weekly_role",
      entity: "weekly_role",
      entityId: id,
      details: { title: existing.title },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE weekly-role error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
