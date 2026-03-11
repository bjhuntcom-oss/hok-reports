import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  let groqConfigured = !!process.env.GROQ_API_KEY;

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "groq_api_key" } });
    if (setting?.value) groqConfigured = true;
  } catch {}

  return NextResponse.json({
    configured: groqConfigured,
    groqConfigured,
  });
}
