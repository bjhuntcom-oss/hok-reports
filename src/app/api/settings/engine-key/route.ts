import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const { key } = await req.json();
    if (!key || typeof key !== "string" || !key.startsWith("sk-")) {
      return NextResponse.json({ error: "Format de clé invalide" }, { status: 400 });
    }

    // Store in database instead of .env file (Vercel compatible)
    await prisma.systemSetting.upsert({
      where: { key: "openai_api_key" },
      update: { value: key },
      create: { key: "openai_api_key", value: key },
    });

    // Also update process.env for current runtime
    process.env.OPENAI_API_KEY = key;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Engine key update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
