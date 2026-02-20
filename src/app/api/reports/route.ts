import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { generateReport } from "@/lib/llm";
import { sanitizeString } from "@/lib/sanitize";
import { logAudit, getClientInfo } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const role = (session.user as any).role;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const status = searchParams.get("status") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (role !== "admin") {
      where.userId = userId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (status) where.status = status;

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          session: {
            select: {
              title: true,
              clientName: true,
              caseReference: true,
              createdAt: true,
            },
          },
          user: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.report.count({ where }),
    ]);

    return NextResponse.json({ reports, total, page, limit });
  } catch (error) {
    console.error("Reports fetch error:", error);
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
    const { sessionId, format = "standard", category = "general" } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId requis" }, { status: 400 });
    }

    const sessionData = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { transcription: true },
    });

    if (!sessionData?.transcription) {
      return NextResponse.json(
        { error: "Transcription non trouvée. Veuillez d'abord transcrire l'audio." },
        { status: 400 }
      );
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "summarizing" },
    });

    const result = await generateReport(
      sessionData.transcription.content,
      sessionData.clientName,
      sessionData.caseReference,
      format as any,
      sessionData.language || "fr"
    );

    const report = await prisma.report.create({
      data: {
        title: result.title,
        summary: result.summary,
        keyPoints: JSON.stringify(result.keyPoints),
        actionItems: JSON.stringify(result.actionItems),
        legalNotes: result.legalNotes,
        category,
        format,
        status: "draft",
        sessionId,
        userId,
      },
    });

    await prisma.session.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({ userId, action: "generate_report", entity: "report", entityId: report.id, details: { title: result.title, format, category }, ipAddress, userAgent });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Erreur de génération de rapport" },
      { status: 500 }
    );
  }
}
