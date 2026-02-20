import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ ok: true, userCount: count, env: process.env.NODE_ENV });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message, stack: error.stack?.substring(0, 500) }, { status: 500 });
  }
}
