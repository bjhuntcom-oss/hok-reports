import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }

    const [totalUsers, totalSessions, totalReports, sessions] = await Promise.all([
      prisma.user.count(),
      prisma.session.count(),
      prisma.report.count(),
      prisma.session.findMany({ select: { audioDuration: true } }),
    ]);

    const totalDuration = sessions.reduce(
      (sum: number, s: { audioDuration: number | null }) => sum + (s.audioDuration || 0),
      0
    );

    return NextResponse.json({
      totalUsers,
      totalSessions,
      totalReports,
      totalDuration,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
