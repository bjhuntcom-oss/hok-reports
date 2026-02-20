import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const where = role === "admin" ? {} : { userId };

    const [totalSessions, totalReports, sessions, recentSessions, recentReports] =
      await Promise.all([
        prisma.session.count({ where }),
        prisma.report.count({ where: role === "admin" ? {} : { userId } }),
        prisma.session.findMany({
          where,
          select: { audioDuration: true },
        }),
        prisma.session.findMany({
          where,
          include: { transcription: true, reports: true },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
        prisma.report.findMany({
          where: role === "admin" ? {} : { userId },
          include: {
            session: {
              select: { title: true, clientName: true, caseReference: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

    const totalDuration = sessions.reduce(
      (sum: number, s: { audioDuration: number | null }) => sum + (s.audioDuration || 0),
      0
    );

    return NextResponse.json({
      totalSessions,
      totalReports,
      totalDuration,
      recentSessions,
      recentReports,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
