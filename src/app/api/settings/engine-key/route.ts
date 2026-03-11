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
    if (!key || typeof key !== "string" || !key.startsWith("gsk_")) {
      return NextResponse.json({ error: "Format de clé Groq invalide (doit commencer par gsk_)" }, { status: 400 });
    }

    await prisma.systemSetting.upsert({
      where: { key: "groq_api_key" },
      update: { value: key },
      create: { key: "groq_api_key", value: key },
    });

    process.env.GROQ_API_KEY = key;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Engine key update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
