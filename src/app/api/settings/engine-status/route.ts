import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

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
