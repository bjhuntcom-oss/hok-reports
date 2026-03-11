import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const sessions = await prisma.session.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { reports: true, notes: true } },
      },
      take: 200,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Admin sessions error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
