import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
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
    const search = sanitizeString(searchParams.get("search") || "");
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));

    const where: any = {};
    if (role !== "admin") {
      where.userId = userId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { clientName: { contains: search } },
        { caseReference: { contains: search } },
      ];
    }
    if (status && ["recording", "transcribing", "summarizing", "completed", "error"].includes(status)) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        include: {
          transcription: true,
          reports: true,
          notes: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.session.count({ where }),
    ]);

    return NextResponse.json({ sessions, total, page, limit });
  } catch (error) {
    console.error("Sessions fetch error:", error);
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

    const title = sanitizeString(body.title || "");
    const clientName = sanitizeString(body.clientName || "");
    if (!title || !clientName) {
      return NextResponse.json({ error: "Titre et nom du client requis" }, { status: 400 });
    }
    if (title.length > 200 || clientName.length > 100) {
      return NextResponse.json({ error: "Champs trop longs" }, { status: 400 });
    }

    const newSession = await prisma.session.create({
      data: {
        title,
        description: body.description ? sanitizeString(body.description).slice(0, 2000) : null,
        clientName,
        clientEmail: body.clientEmail ? sanitizeString(body.clientEmail).slice(0, 254) : null,
        clientPhone: body.clientPhone ? sanitizeString(body.clientPhone).slice(0, 20) : null,
        caseReference: body.caseReference ? sanitizeString(body.caseReference).slice(0, 50) : null,
        language: ["fr", "en"].includes(body.language) ? body.language : "fr",
        status: "recording",
        userId,
      },
    });

    await logAudit({ userId, action: "create_session", entity: "session", entityId: newSession.id, details: { title, clientName }, ipAddress, userAgent });

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    console.error("Session create error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
