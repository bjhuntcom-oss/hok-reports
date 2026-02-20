import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { provider } = await req.json();

    if (!provider || !["openai", "anthropic", "whisper"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const keyName = provider === "whisper" ? "whisper_api_key" : provider === "openai" ? "openai_api_key" : "anthropic_api_key";

    // Get key from DB first, then env
    let apiKey = "";
    try {
      const setting = await prisma.systemSetting.findUnique({ where: { key: keyName } });
      if (setting?.value?.trim()) apiKey = setting.value.trim();
    } catch {}

    if (!apiKey) {
      const envKey = provider === "whisper"
        ? (process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY)
        : provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
      if (envKey && envKey.trim() && envKey !== "your-openai-api-key-here") {
        apiKey = envKey.trim();
      }
    }

    if (!apiKey) {
      const label = provider === "whisper" ? "Whisper" : provider === "openai" ? "OpenAI" : "Anthropic";
      return NextResponse.json({
        success: false,
        error: `No ${label} API key configured`,
      });
    }

    // Test the key with a minimal API call — whisper uses OpenAI API
    if (provider === "openai" || provider === "whisper") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        return NextResponse.json({ success: true, message: "OpenAI API key is valid" });
      }
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: err?.error?.message || `OpenAI returned status ${res.status}`,
      });
    }

    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 10,
          messages: [{ role: "user", content: "Say OK" }],
        }),
      });

      if (res.ok) {
        return NextResponse.json({ success: true, message: "Anthropic API key is valid" });
      }

      const err = await res.json().catch(() => ({}));
      // 401 = invalid key, other errors might mean key is valid but other issue
      if (res.status === 401) {
        return NextResponse.json({
          success: false,
          error: err?.error?.message || "Invalid Anthropic API key",
        });
      }
      // If we get rate limited or other non-auth errors, key is likely valid
      if (res.status === 429 || res.status === 529) {
        return NextResponse.json({ success: true, message: "Anthropic API key is valid (rate limited but authenticated)" });
      }
      // 400 with "credit balance" = key is valid but account has no credits
      if (res.status === 400 && err?.error?.message?.includes("credit balance")) {
        return NextResponse.json({
          success: true,
          warning: true,
          message: "API key is valid but account has insufficient credits. Please add credits at console.anthropic.com",
        });
      }
      return NextResponse.json({
        success: false,
        error: err?.error?.message || `Anthropic returned status ${res.status}`,
      });
    }

    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  } catch (error: any) {
    console.error("LLM test error:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Connection error",
    });
  }
}
