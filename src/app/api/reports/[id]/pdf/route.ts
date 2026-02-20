import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function generatePdfHtml(report: any): string {
  const keyPoints = JSON.parse(report.keyPoints || "[]");
  const actionItems = JSON.parse(report.actionItems || "[]");
  const categoryLabels: Record<string, string> = {
    general: "Général", consultation: "Consultation", hearing: "Audience", deposition: "Déposition", meeting: "Réunion",
  };
  const statusLabels: Record<string, string> = {
    draft: "Brouillon", final: "Finalisé", archived: "Archivé",
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(report.title)}</title>
<style>
  @page { size: A4; margin: 25mm 20mm 30mm 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.6; }
  .header { border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header-left h1 { font-size: 10pt; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; }
  .header-left p { font-size: 8pt; color: #666; margin-top: 2px; }
  .header-right { text-align: right; font-size: 8pt; color: #666; }
  .doc-title { font-size: 18pt; font-weight: 700; margin: 20px 0 5px; color: #000; }
  .doc-meta { font-size: 9pt; color: #555; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0; }
  .doc-meta span { margin-right: 20px; }
  .doc-meta strong { color: #000; }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #000; border-left: 3px solid #000; padding-left: 10px; margin-bottom: 10px; }
  .section-content { padding-left: 13px; font-size: 10.5pt; }
  .section-content p { margin-bottom: 8px; text-align: justify; }
  ul { padding-left: 18px; margin-bottom: 8px; }
  ul li { margin-bottom: 5px; font-size: 10.5pt; }
  ul li::marker { color: #000; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 30px; font-size: 9.5pt; margin-bottom: 15px; padding: 12px; background: #f8f8f8; border: 1px solid #e8e8e8; }
  .info-grid .label { color: #666; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-grid .value { font-weight: 600; color: #000; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 20mm; border-top: 1px solid #ddd; font-size: 7.5pt; color: #999; display: flex; justify-content: space-between; }
  .transcription { background: #fafafa; border: 1px solid #e8e8e8; padding: 15px; font-size: 10pt; line-height: 1.7; white-space: pre-wrap; }
  .badge { display: inline-block; padding: 2px 8px; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #000; }
  .confidential { text-align: center; font-size: 8pt; font-weight: 700; color: #c00; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px; padding: 5px; border: 1px solid #c00; }
</style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Cabinet HOK</h1>
      <p>Cotonou, Bénin — Plateforme de gestion documentaire</p>
    </div>
    <div class="header-right">
      <p>Rapport n° ${escapeHtml(report.id.slice(0, 8).toUpperCase())}</p>
      <p>${formatDate(new Date(report.createdAt))}</p>
    </div>
  </div>

  <div class="confidential">Document confidentiel — Usage strictement interne</div>

  <div class="doc-title">${escapeHtml(report.title)}</div>
  <div class="doc-meta">
    <span><strong>Catégorie :</strong> ${categoryLabels[report.category] || report.category}</span>
    <span><strong>Format :</strong> ${report.format}</span>
    <span><strong>Statut :</strong> ${statusLabels[report.status] || report.status}</span>
    <span class="badge">${statusLabels[report.status] || report.status}</span>
  </div>

  <div class="info-grid">
    <div><div class="label">Client</div><div class="value">${escapeHtml(report.session?.clientName || "—")}</div></div>
    <div><div class="label">Référence dossier</div><div class="value">${escapeHtml(report.session?.caseReference || "—")}</div></div>
    <div><div class="label">Auteur</div><div class="value">${escapeHtml(report.user?.name || "—")}</div></div>
    <div><div class="label">Date de session</div><div class="value">${report.session ? formatDate(new Date(report.session.createdAt)) : "—"}</div></div>
  </div>

  <div class="section">
    <div class="section-title">Synthèse</div>
    <div class="section-content"><p>${escapeHtml(report.summary)}</p></div>
  </div>

  ${keyPoints.length > 0 ? `
  <div class="section">
    <div class="section-title">Points clés</div>
    <div class="section-content">
      <ul>${keyPoints.map((p: string) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>
    </div>
  </div>` : ""}

  ${actionItems.length > 0 ? `
  <div class="section">
    <div class="section-title">Actions à entreprendre</div>
    <div class="section-content">
      <ul>${actionItems.map((a: string) => `<li>${escapeHtml(a)}</li>`).join("")}</ul>
    </div>
  </div>` : ""}

  ${report.legalNotes ? `
  <div class="section">
    <div class="section-title">Observations juridiques</div>
    <div class="section-content"><p>${escapeHtml(report.legalNotes)}</p></div>
  </div>` : ""}

  ${report.session?.transcription?.content ? `
  <div class="section">
    <div class="section-title">Transcription intégrale</div>
    <div class="transcription">${escapeHtml(report.session.transcription.content)}</div>
  </div>` : ""}

  <div class="footer">
    <span>Cabinet HOK — HOK Reports — Document généré automatiquement</span>
    <span>Confidentiel — Ne pas diffuser sans autorisation</span>
  </div>
</body>
</html>`;
}

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
        session: { include: { transcription: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!report) {
      return NextResponse.json({ error: "Rapport non trouvé" }, { status: 404 });
    }
    if (role !== "admin" && report.userId !== userId) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    const html = generatePdfHtml(report);

    await prisma.report.update({ where: { id }, data: { exportedAt: new Date() } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({ userId, action: "export_pdf", entity: "report", entityId: id, details: { title: report.title }, ipAddress, userAgent });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="rapport-${id.slice(0, 8)}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Erreur d'export" }, { status: 500 });
  }
}
