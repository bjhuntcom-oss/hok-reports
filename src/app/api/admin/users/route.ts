import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        blocked: true,
        language: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { sessions: true, reports: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { ipAddress, userAgent } = getClientInfo(req);
    const adminId = (session.user as any).id;
    const { userId, role } = await req.json();

    if (!userId || !["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });

    await logAudit({ userId: adminId, action: "admin_change_role", entity: "user", entityId: userId, details: { targetName: target?.name, oldRole: target?.role, newRole: role }, ipAddress, userAgent });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Admin update user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
