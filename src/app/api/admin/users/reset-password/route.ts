import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAudit, getClientInfo } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { validatePassword } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    // ── Auth check ──
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const adminId = (session.user as any).id;

    // ── Rate limiting: 10 tentatives / 10 min par admin ──
    const { allowed } = rateLimit(`admin-reset-pw:${adminId}`, 10, 600000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Trop de tentatives de réinitialisation. Réessayez dans 10 minutes." },
        { status: 429 }
      );
    }

    // ── Parse & validate body ──
    const body = await req.json();
    const { userId, newPassword } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Identifiant utilisateur requis" }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json({ error: "Nouveau mot de passe requis" }, { status: 400 });
    }

    // ── Password strength validation ──
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    // ── Prevent self-reset via this route ──
    if (userId === adminId) {
      return NextResponse.json(
        { error: "Utilisez la page Profil pour changer votre propre mot de passe." },
        { status: 400 }
      );
    }

    // ── Verify target user exists ──
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, password: true },
    });

    if (!target) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // ── Prevent reset for Google-only accounts ──
    if (!target.password) {
      return NextResponse.json(
        { error: "Ce compte utilise la connexion Google. Le mot de passe ne peut pas être réinitialisé." },
        { status: 400 }
      );
    }

    // ── Hash and update ──
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // ── Audit log ──
    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({
      userId: adminId,
      action: "admin_reset_password",
      entity: "user",
      entityId: userId,
      details: {
        targetName: target.name,
        targetEmail: target.email,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin reset password error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
