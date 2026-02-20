import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";

function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

function formatWeekTitle(weekStart: Date, weekEnd: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  const loc = locale === "en" ? "en-GB" : "fr-FR";
  const startStr = weekStart.toLocaleDateString(loc, { day: "numeric", month: "long" });
  const endStr = weekEnd.toLocaleDateString(loc, opts);
  if (locale === "en") {
    return `Hearing Role — Week of ${startStr} to ${endStr}`;
  }
  return `Rôle d'audience — Semaine du ${startStr} au ${endStr}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const [roles, total] = await Promise.all([
      prisma.weeklyRole.findMany({
        where,
        orderBy: { weekStart: "desc" },
        skip,
        take: limit,
        include: { user: { select: { name: true } } },
      }),
      prisma.weeklyRole.count({ where }),
    ]);

    return NextResponse.json({ roles, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET weekly-roles error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const body = await req.json();
    const locale = body.locale || "fr";

    // Determine week bounds
    const targetDate = body.weekDate ? new Date(body.weekDate) : new Date();
    const { weekStart, weekEnd } = getWeekBounds(targetDate);

    // Check if a role already exists for this week
    const existing = await prisma.weeklyRole.findFirst({
      where: {
        weekStart,
        userId,
      },
    });

    // Fetch all hearing reports with nextHearingDate in this week
    const hearingReports = await prisma.hearingReport.findMany({
      where: {
        nextHearingDate: {
          gte: weekStart,
          lte: weekEnd,
        },
        status: "active",
      },
      orderBy: { nextHearingDate: "asc" },
      include: { user: { select: { name: true } } },
    });

    // Build role entries from hearing reports
    const entries = hearingReports.map((hr) => ({
      hearingReportId: hr.id,
      hearingDate: hr.nextHearingDate?.toISOString(),
      jurisdiction: hr.jurisdiction,
      chamber: hr.chamber,
      caseReference: hr.caseReference,
      clientName: hr.clientName,
      opponent: hr.opponent,
      lawyerName: hr.lawyerName,
      previousOutcome: hr.outcome,
      tasks: hr.tasks ? JSON.parse(hr.tasks) : [],
      notes: hr.notes,
    }));

    const title = formatWeekTitle(weekStart, weekEnd, locale);

    if (existing) {
      // Update existing role
      const updated = await prisma.weeklyRole.update({
        where: { id: existing.id },
        data: {
          entries: JSON.stringify(entries),
          title,
          generatedAt: new Date(),
        },
      });

      await logAudit({
        userId,
        action: "update_weekly_role",
        entity: "weekly_role",
        entityId: updated.id,
        details: { weekStart: weekStart.toISOString(), entriesCount: entries.length },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ ...updated, entriesCount: entries.length });
    } else {
      // Create new role
      const role = await prisma.weeklyRole.create({
        data: {
          weekStart,
          weekEnd,
          title,
          entries: JSON.stringify(entries),
          userId,
        },
      });

      await logAudit({
        userId,
        action: "create_weekly_role",
        entity: "weekly_role",
        entityId: role.id,
        details: { weekStart: weekStart.toISOString(), entriesCount: entries.length },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ ...role, entriesCount: entries.length }, { status: 201 });
    }
  } catch (error) {
    console.error("POST weekly-roles error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
