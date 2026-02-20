import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const { userId, status } = await req.json();

    if (!userId || !["active", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, status: true } });
    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    await prisma.user.update({ where: { id: userId }, data: { status } });

    await logAudit({
      userId: adminId,
      action: status === "active" ? "admin_approve_user" : "admin_reject_user",
      entity: "user",
      entityId: userId,
      details: { targetName: target.name, targetEmail: target.email, previousStatus: target.status },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
