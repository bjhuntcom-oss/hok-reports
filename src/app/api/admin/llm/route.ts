import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ["whisper_api_key", "openai_api_key", "anthropic_api_key", "llm_provider"] } },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      if (s.key === "llm_provider") {
        result[s.key] = s.value;
      } else {
        result[s.key] = s.value ? `${s.value.slice(0, 8)}...${s.value.slice(-4)}` : "";
      }
    }

    if (!result.llm_provider) result.llm_provider = "openai";
    if (!result.whisper_api_key) {
      const envWhisper = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY;
      result.whisper_api_key = envWhisper && envWhisper !== "your-openai-api-key-here" ? `${envWhisper.slice(0, 8)}...${envWhisper.slice(-4)}` : "";
    }
    if (!result.openai_api_key) result.openai_api_key = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key-here" ? `${process.env.OPENAI_API_KEY.slice(0, 8)}...${process.env.OPENAI_API_KEY.slice(-4)}` : "";
    if (!result.anthropic_api_key) result.anthropic_api_key = process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.slice(0, 8)}...${process.env.ANTHROPIC_API_KEY.slice(-4)}` : "";

    const whisperConfigured = !!(await prisma.systemSetting.findUnique({ where: { key: "whisper_api_key" } }))?.value || (!!process.env.WHISPER_API_KEY || (!!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key-here"));
    const openaiConfigured = !!(await prisma.systemSetting.findUnique({ where: { key: "openai_api_key" } }))?.value || (!!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key-here");
    const anthropicConfigured = !!(await prisma.systemSetting.findUnique({ where: { key: "anthropic_api_key" } }))?.value || !!process.env.ANTHROPIC_API_KEY;

    return NextResponse.json({
      ...result,
      whisper_configured: whisperConfigured,
      openai_configured: openaiConfigured,
      anthropic_configured: anthropicConfigured,
    });
  } catch (error) {
    console.error("LLM settings error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const adminId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const body = await req.json();
    const { key, value } = body;

    if (!key || !["whisper_api_key", "openai_api_key", "anthropic_api_key", "llm_provider"].includes(key)) {
      return NextResponse.json({ error: "Clé de paramètre invalide" }, { status: 400 });
    }

    if (key === "llm_provider" && !["openai", "anthropic"].includes(value)) {
      return NextResponse.json({ error: "Fournisseur LLM invalide" }, { status: 400 });
    }

    if (key === "whisper_api_key" && value && !value.startsWith("sk-")) {
      return NextResponse.json({ error: "Format de clé Whisper/OpenAI invalide (doit commencer par sk-)" }, { status: 400 });
    }

    if (key === "openai_api_key" && value && !value.startsWith("sk-")) {
      return NextResponse.json({ error: "Format de clé OpenAI invalide (doit commencer par sk-)" }, { status: 400 });
    }

    if (key === "anthropic_api_key" && value && !value.startsWith("sk-ant-")) {
      return NextResponse.json({ error: "Format de clé Anthropic invalide (doit commencer par sk-ant-)" }, { status: 400 });
    }

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    if (key === "whisper_api_key") {
      process.env.WHISPER_API_KEY = value;
    } else if (key === "openai_api_key") {
      process.env.OPENAI_API_KEY = value;
    } else if (key === "anthropic_api_key") {
      process.env.ANTHROPIC_API_KEY = value;
    }

    await logAudit({
      userId: adminId,
      action: "admin_update_llm",
      entity: "settings",
      entityId: key,
      details: { key, masked: value ? `${value.slice(0, 8)}...` : "cleared" },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LLM settings update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
