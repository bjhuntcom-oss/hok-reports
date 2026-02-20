import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { clientName: { contains: search } },
        { caseReference: { contains: search } },
        { jurisdiction: { contains: search } },
        { opponent: { contains: search } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.hearingReport.findMany({
        where,
        orderBy: { hearingDate: "desc" },
        skip,
        take: limit,
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.hearingReport.count({ where }),
    ]);

    return NextResponse.json({ reports, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GET hearing-reports error:", error);
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

    const hearingDate = body.hearingDate;
    const jurisdiction = sanitizeString(body.jurisdiction || "");
    const chamber = sanitizeString(body.chamber || "");
    const caseReference = sanitizeString(body.caseReference || "");
    const clientName = sanitizeString(body.clientName || "");
    const opponent = sanitizeString(body.opponent || "");
    const lawyerName = sanitizeString(body.lawyerName || "");
    const outcome = sanitizeString(body.outcome || "");
    const nextHearingDate = body.nextHearingDate || null;
    const tasks = body.tasks || [];
    const notes = sanitizeString(body.notes || "");

    if (!hearingDate || !jurisdiction || !caseReference || !clientName || !outcome) {
      return NextResponse.json(
        { error: "Les champs date, juridiction, référence, client et compte rendu sont obligatoires" },
        { status: 400 }
      );
    }

    const report = await prisma.hearingReport.create({
      data: {
        hearingDate: new Date(hearingDate),
        jurisdiction,
        chamber: chamber || null,
        caseReference,
        clientName,
        opponent: opponent || null,
        lawyerName: lawyerName || null,
        outcome,
        nextHearingDate: nextHearingDate ? new Date(nextHearingDate) : null,
        tasks: JSON.stringify(tasks),
        notes: notes || null,
        userId,
      },
    });

    await logAudit({
      userId,
      action: "create_hearing_report",
      entity: "hearing_report",
      entityId: report.id,
      details: { clientName, caseReference, jurisdiction },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("POST hearing-reports error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
