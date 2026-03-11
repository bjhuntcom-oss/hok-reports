import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  let groqConfigured = !!process.env.GROQ_API_KEY;
  let openaiConfigured = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key-here";
  let anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;

  try {
    const groqSetting = await prisma.systemSetting.findUnique({ where: { key: "groq_api_key" } });
    if (groqSetting?.value) groqConfigured = true;
    const openaiSetting = await prisma.systemSetting.findUnique({ where: { key: "openai_api_key" } });
    if (openaiSetting?.value) openaiConfigured = true;
    const anthropicSetting = await prisma.systemSetting.findUnique({ where: { key: "anthropic_api_key" } });
    if (anthropicSetting?.value) anthropicConfigured = true;
  } catch {}

  return NextResponse.json({
    configured: groqConfigured && (openaiConfigured || anthropicConfigured),
    groqConfigured,
    reportConfigured: openaiConfigured || anthropicConfigured,
  });
}
