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

    const setting = await prisma.systemSetting.findUnique({ where: { key: "groq_api_key" } });
    const dbKey = setting?.value || "";
    const envKey = process.env.GROQ_API_KEY || "";
    const activeKey = dbKey || envKey;
    const maskedKey = activeKey ? `${activeKey.slice(0, 8)}...${activeKey.slice(-4)}` : "";
    const configured = !!activeKey;

    return NextResponse.json({
      groq_api_key: maskedKey,
      groq_configured: configured,
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

    if (key !== "groq_api_key") {
      return NextResponse.json({ error: "Clé de paramètre invalide" }, { status: 400 });
    }

    if (value && !value.startsWith("gsk_")) {
      return NextResponse.json({ error: "Format de clé Groq invalide (doit commencer par gsk_)" }, { status: 400 });
    }

    await prisma.systemSetting.upsert({
      where: { key: "groq_api_key" },
      update: { value },
      create: { key: "groq_api_key", value },
    });

    process.env.GROQ_API_KEY = value;

    await logAudit({
      userId: adminId,
      action: "admin_update_llm",
      entity: "settings",
      entityId: "groq_api_key",
      details: { masked: value ? `${value.slice(0, 8)}...` : "cleared" },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LLM settings update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
