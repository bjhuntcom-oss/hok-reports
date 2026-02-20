import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { sanitizeString, validateEmail, validatePassword, validateName } from "@/lib/sanitize";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const { ipAddress, userAgent } = getClientInfo(req);
    const rl = rateLimit(`register:${ipAddress}`, 5, 300000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Trop de tentatives. Réessayez dans 5 minutes." }, { status: 429 });
    }

    const body = await req.json();
    const name = sanitizeString(body.name || "");
    const email = (body.email || "").toLowerCase().trim();
    const password = body.password || "";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis" }, { status: 400 });
    }
    if (!validateName(name)) {
      return NextResponse.json({ error: "Nom invalide (2-100 caractères, pas de caractères spéciaux)" }, { status: 400 });
    }
    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Adresse email invalide" }, { status: 400 });
    }
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "user", status: "pending" },
    });

    await logAudit({ userId: user.id, action: "register", entity: "user", entityId: user.id, details: { status: "pending" }, ipAddress, userAgent });

    return NextResponse.json({ id: user.id, name: user.name, email: user.email, status: "pending" }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Erreur lors de l'inscription" }, { status: 500 });
  }
}
