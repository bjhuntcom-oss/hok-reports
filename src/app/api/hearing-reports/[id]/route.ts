import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";
import { sanitizeString } from "@/lib/sanitize";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const report = await prisma.hearingReport.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!report) {
      return NextResponse.json({ error: "Compte rendu introuvable" }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("GET hearing-report error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.hearingReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Compte rendu introuvable" }, { status: 404 });
    }

    const data: any = {};
    if (body.hearingDate) data.hearingDate = new Date(body.hearingDate);
    if (body.jurisdiction !== undefined) data.jurisdiction = sanitizeString(body.jurisdiction);
    if (body.chamber !== undefined) data.chamber = sanitizeString(body.chamber) || null;
    if (body.caseReference !== undefined) data.caseReference = sanitizeString(body.caseReference);
    if (body.clientName !== undefined) data.clientName = sanitizeString(body.clientName);
    if (body.opponent !== undefined) data.opponent = sanitizeString(body.opponent) || null;
    if (body.lawyerName !== undefined) data.lawyerName = sanitizeString(body.lawyerName) || null;
    if (body.outcome !== undefined) data.outcome = sanitizeString(body.outcome);
    if (body.nextHearingDate !== undefined) data.nextHearingDate = body.nextHearingDate ? new Date(body.nextHearingDate) : null;
    if (body.tasks !== undefined) data.tasks = JSON.stringify(body.tasks);
    if (body.notes !== undefined) data.notes = sanitizeString(body.notes) || null;
    if (body.status !== undefined) data.status = body.status;

    const updated = await prisma.hearingReport.update({ where: { id }, data });

    await logAudit({
      userId,
      action: "update_hearing_report",
      entity: "hearing_report",
      entityId: id,
      details: { clientName: updated.clientName, caseReference: updated.caseReference },
      ipAddress,
      userAgent,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH hearing-report error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { ipAddress, userAgent } = getClientInfo(req);
    const { id } = await params;

    const existing = await prisma.hearingReport.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Compte rendu introuvable" }, { status: 404 });
    }

    await prisma.hearingReport.delete({ where: { id } });

    await logAudit({
      userId,
      action: "delete_hearing_report",
      entity: "hearing_report",
      entityId: id,
      details: { clientName: existing.clientName, caseReference: existing.caseReference },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE hearing-report error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
