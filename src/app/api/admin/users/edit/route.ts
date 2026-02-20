import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sanitizeString, validateEmail, validateName } from "@/lib/sanitize";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const body = await req.json();
    const { userId } = body;
    const name = sanitizeString(body.name || "");
    const email = (body.email || "").trim().toLowerCase();

    if (!userId || !name || !email) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }
    if (!validateName(name)) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Email invalide" }, { status: 400 });
    }

    const existing = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
    if (existing) {
      return NextResponse.json({ error: "Cette adresse email est déjà utilisée" }, { status: 409 });
    }

    await prisma.user.update({ where: { id: userId }, data: { name, email } });

    await logAudit({ userId: adminId, action: "admin_edit_user", entity: "user", entityId: userId, details: { name, email }, ipAddress, userAgent });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Edit user error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
