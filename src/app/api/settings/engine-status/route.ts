import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  let whisperConfigured = !!process.env.WHISPER_API_KEY || (!!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key-here");
  let openaiConfigured = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "your-openai-api-key-here";
  let anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;

  try {
    const whisperSetting = await prisma.systemSetting.findUnique({ where: { key: "whisper_api_key" } });
    if (whisperSetting?.value) whisperConfigured = true;
    const openaiSetting = await prisma.systemSetting.findUnique({ where: { key: "openai_api_key" } });
    if (openaiSetting?.value) openaiConfigured = true;
    const anthropicSetting = await prisma.systemSetting.findUnique({ where: { key: "anthropic_api_key" } });
    if (anthropicSetting?.value) anthropicConfigured = true;
  } catch {}

  return NextResponse.json({
    configured: whisperConfigured && (openaiConfigured || anthropicConfigured),
    whisperConfigured,
    reportConfigured: openaiConfigured || anthropicConfigured,
  });
}
