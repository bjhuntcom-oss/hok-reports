import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    let apiKey = "";
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: "groq_api_key" } });
      if (setting?.value?.trim()) apiKey = setting.value.trim();
    } catch {}

    if (!apiKey) {
      const envKey = process.env.GROQ_API_KEY;
      if (envKey && envKey.trim()) apiKey = envKey.trim();
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Aucune clé API Groq configurée" });
    }

    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok) {
      return NextResponse.json({ success: true, message: "Clé API Groq valide" });
    }

    const err = await res.json().catch(() => ({}));
    return NextResponse.json({
      success: false,
      error: (err as any)?.error?.message || `Groq a retourné le statut ${res.status}`,
    });
  } catch (error: any) {
    console.error("LLM test error:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Erreur de connexion",
    });
  }
}
