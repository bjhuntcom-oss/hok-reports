import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const reports = await prisma.report.findMany({
      include: {
        user: { select: { name: true, email: true } },
        session: { select: { clientName: true, caseReference: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Admin reports error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
