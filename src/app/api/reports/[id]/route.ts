import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { filterReportFields } from "@/lib/sanitize";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        session: {
          include: {
            transcription: true,
            notes: { orderBy: { createdAt: "asc" } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }
    if (role !== "admin" && report.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const body = await req.json();

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    if (role !== "admin" && existing.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const safeData = filterReportFields(body);
    const updated = await prisma.report.update({ where: { id }, data: safeData });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({ userId, action: "update_report", entity: "report", entityId: id, details: safeData, ipAddress, userAgent });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Report update error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const role = (session.user as any).role;

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    if (role !== "admin" && existing.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    await prisma.report.delete({ where: { id } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({ userId, action: "delete_report", entity: "report", entityId: id, details: { title: existing.title }, ipAddress, userAgent });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Report delete error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
