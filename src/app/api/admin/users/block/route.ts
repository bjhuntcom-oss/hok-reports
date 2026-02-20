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
    const { userId, blocked } = await req.json();
    if (!userId || typeof blocked !== "boolean") {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
    await prisma.user.update({ where: { id: userId }, data: { blocked } });

    await logAudit({ userId: adminId, action: blocked ? "admin_block_user" : "admin_unblock_user", entity: "user", entityId: userId, details: { targetName: target?.name, targetEmail: target?.email }, ipAddress, userAgent });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Block user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
