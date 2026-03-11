import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logAudit, getClientInfo } from "@/lib/audit";
import { generateReportPdf } from "@/lib/pdf/generate";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

function highlightKeyTerms(text: string): string {
  const legalTerms = [
    "obligation", "responsabilité", "litige", "contentieux", "juridiction",
    "tribunal", "cour", "juge", "avocat", "partie", "défendeur", "demandeur",
    "assignation", "citation", "jugement", "arrêt", "ordonnance", "décision",
    "appel", "cassation", "pourvoi", "recours", "procédure", "audience",
    "délai", "prescription", "forclusion", "nullité", "irrecevabilité",
    "compétence", "dommages", "intérêts", "indemnisation", "préjudice",
    "clause", "contrat", "convention", "accord", "protocole",
    "mise en demeure", "sommation", "notification", "signification",
    "exécution", "saisie", "hypothèque", "garantie", "caution",
    "infraction", "pénale", "civile", "commerciale", "administrative",
    "urgence", "urgent", "immédiat", "impératif", "critique",
    "attention", "important", "essentiel", "fondamental", "capital",
    "risque", "danger", "menace", "exposition", "vulnérabilité",
  ];
  let result = text;
  for (const term of legalTerms) {
    const regex = new RegExp(`\\b(${term}s?)\\b`, "gi");
    result = result.replace(regex, '<strong class="hl">$1</strong>');
  }
  return result;
}

function safeHighlight(text: string): string {
  return highlightKeyTerms(escapeHtml(text));
}

function classifyPoint(text: string): "critical" | "warning" | "info" {
  const criticalTerms = /urgence|urgent|immédiat|impératif|critique|obligatoire|délai|forclusion|prescription|risque|danger|irrecevab/i;
  const warningTerms = /attention|important|essentiel|vigilance|surveiller|vérifier|confirmer|relancer|rappel/i;
  if (criticalTerms.test(text)) return "critical";
  if (warningTerms.test(text)) return "warning";
  return "info";
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
  const statusColors: Record<string, string> = {
    draft: "#d97706", final: "#059669", archived: "#6b7280",
  };

  const classColors = {
    critical: { bg: "#fef2f2", border: "#ef4444", icon: "⚠", text: "#991b1b" },
    warning: { bg: "#fffbeb", border: "#f59e0b", icon: "●", text: "#92400e" },
    info: { bg: "#f8fafc", border: "#94a3b8", icon: "—", text: "#334155" },
  };

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(report.title)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm 25mm 18mm; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.65; background: #fff; }

  /* ── HEADER ── */
  .doc-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px; border-bottom: 2.5px solid #111; margin-bottom: 6px; }
  .doc-header .brand { font-family: 'Helvetica Neue', Arial, sans-serif; }
  .doc-header .brand h1 { font-size: 13pt; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; color: #111; margin: 0; }
  .doc-header .brand .tagline { font-size: 7.5pt; color: #888; letter-spacing: 1px; margin-top: 1px; }
  .doc-header .ref-block { text-align: right; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .doc-header .ref-block .ref-id { font-size: 8pt; font-weight: 700; color: #111; letter-spacing: 1.5px; text-transform: uppercase; }
  .doc-header .ref-block .ref-date { font-size: 8pt; color: #777; margin-top: 2px; }

  /* ── CONFIDENTIAL BANNER ── */
  .conf-banner { background: #111; color: #fff; text-align: center; padding: 5px 0; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 7pt; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 18px; }

  /* ── TITLE BLOCK ── */
  .title-block { margin-bottom: 16px; }
  .title-block h2 { font-size: 17pt; font-weight: 700; color: #000; line-height: 1.25; margin-bottom: 8px; }
  .meta-row { display: flex; gap: 20px; flex-wrap: wrap; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 8.5pt; color: #555; padding-bottom: 12px; border-bottom: 1px solid #e5e5e5; }
  .meta-row .meta-item { display: flex; align-items: center; gap: 5px; }
  .meta-row .meta-label { font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 0.5px; font-size: 7.5pt; }
  .status-badge { display: inline-block; padding: 2px 10px; font-size: 7.5pt; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: #fff; border-radius: 2px; }

  /* ── INFO GRID ── */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 0; margin: 14px 0 20px; border: 1px solid #e0e0e0; }
  .info-cell { padding: 10px 14px; border-right: 1px solid #e0e0e0; }
  .info-cell:last-child { border-right: none; }
  .info-cell .cell-label { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 7pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 3px; }
  .info-cell .cell-value { font-size: 10pt; font-weight: 600; color: #111; }

  /* ── SECTIONS ── */
  .section { margin-bottom: 20px; page-break-inside: avoid; }
  .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1.5px solid #111; }
  .section-num { font-family: 'Helvetica Neue', Arial, sans-serif; background: #111; color: #fff; font-size: 8pt; font-weight: 800; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .section-title { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #111; }
  .section-body { padding-left: 30px; }
  .section-body p { text-align: justify; margin-bottom: 6px; }
  .section-body strong.hl { background: linear-gradient(to top, #fef08a 40%, transparent 40%); padding: 0 1px; font-weight: 700; }

  /* ── KEY POINTS ── */
  .point-list { list-style: none; padding: 0; }
  .point-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; margin-bottom: 6px; border-left: 3px solid; }
  .point-item.critical { background: ${classColors.critical.bg}; border-color: ${classColors.critical.border}; }
  .point-item.warning { background: ${classColors.warning.bg}; border-color: ${classColors.warning.border}; }
  .point-item.info { background: ${classColors.info.bg}; border-color: ${classColors.info.border}; }
  .point-icon { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 8pt; font-weight: 900; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .point-item.critical .point-icon { color: ${classColors.critical.border}; }
  .point-item.warning .point-icon { color: ${classColors.warning.border}; }
  .point-item.info .point-icon { color: ${classColors.info.border}; }
  .point-text { font-size: 10pt; line-height: 1.5; }
  .point-item.critical .point-text { color: ${classColors.critical.text}; font-weight: 600; }
  .point-item.warning .point-text { color: ${classColors.warning.text}; }
  .point-item.info .point-text { color: ${classColors.info.text}; }

  /* ── ACTION ITEMS ── */
  .action-list { list-style: none; padding: 0; counter-reset: action; }
  .action-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; margin-bottom: 4px; background: #f0f9ff; border-left: 3px solid #0284c7; counter-increment: action; }
  .action-item.urgent { background: #fef2f2; border-color: #dc2626; }
  .action-check { width: 14px; height: 14px; border: 1.5px solid #0284c7; flex-shrink: 0; margin-top: 3px; }
  .action-item.urgent .action-check { border-color: #dc2626; }
  .action-text { font-size: 10pt; line-height: 1.5; color: #0c4a6e; }
  .action-item.urgent .action-text { color: #991b1b; font-weight: 600; }

  /* ── LEGAL NOTES ── */
  .legal-box { background: #fffbeb; border: 1px solid #fbbf24; padding: 14px 16px; margin-top: 4px; }
  .legal-box p { font-size: 10pt; color: #78350f; line-height: 1.6; }
  .legal-icon { font-size: 12pt; margin-right: 4px; }

  /* ── TRANSCRIPTION ── */
  .transcription-box { background: #fafafa; border: 1px solid #e5e5e5; padding: 14px 16px; font-size: 9.5pt; line-height: 1.75; color: #444; white-space: pre-wrap; font-family: 'Georgia', serif; }

  /* ── FOOTER ── */
  .doc-footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 18mm; border-top: 1.5px solid #ddd; font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 7pt; color: #aaa; display: flex; justify-content: space-between; }
  .doc-footer .watermark { font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }

  /* ── PRINT BUTTON ── */
  .print-bar { position: fixed; top: 0; left: 0; right: 0; background: #111; padding: 10px 20px; display: flex; justify-content: flex-end; gap: 8px; z-index: 100; }
  .print-bar button { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; font-weight: 700; padding: 8px 20px; border: none; cursor: pointer; letter-spacing: 1px; text-transform: uppercase; }
  .btn-print { background: #fff; color: #111; }
  .btn-print:hover { background: #f5f5f5; }
  .btn-close { background: transparent; color: #999; border: 1px solid #555 !important; }
  .btn-close:hover { color: #fff; border-color: #fff !important; }
</style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="btn-close" onclick="window.close()">Fermer</button>
    <button class="btn-print" onclick="window.print()">Imprimer / Télécharger PDF</button>
  </div>

  <div class="doc-header">
    <div class="brand">
      <h1>Cabinet HOK</h1>
      <div class="tagline">Avocats — Cotonou, Bénin</div>
    </div>
    <div class="ref-block">
      <div class="ref-id">Réf. ${escapeHtml(report.id.slice(0, 8).toUpperCase())}</div>
      <div class="ref-date">${formatDate(new Date(report.createdAt))}</div>
    </div>
  </div>

  <div class="conf-banner">Confidentiel — Document interne — Ne pas diffuser</div>

  <div class="title-block">
    <h2>${escapeHtml(report.title)}</h2>
    <div class="meta-row">
      <div class="meta-item">
        <span class="meta-label">Catégorie :</span>
        ${categoryLabels[report.category] || report.category}
      </div>
      <div class="meta-item">
        <span class="meta-label">Format :</span>
        ${report.format}
      </div>
      <div class="meta-item">
        <span class="meta-label">Statut :</span>
        <span class="status-badge" style="background:${statusColors[report.status] || '#6b7280'}">${statusLabels[report.status] || report.status}</span>
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-cell">
      <div class="cell-label">Client</div>
      <div class="cell-value">${escapeHtml(report.session?.clientName || "—")}</div>
    </div>
    <div class="info-cell">
      <div class="cell-label">Réf. Dossier</div>
      <div class="cell-value">${escapeHtml(report.session?.caseReference || "—")}</div>
    </div>
    <div class="info-cell">
      <div class="cell-label">Auteur</div>
      <div class="cell-value">${escapeHtml(report.user?.name || "—")}</div>
    </div>
    <div class="info-cell">
      <div class="cell-label">Date Session</div>
      <div class="cell-value">${report.session ? formatDate(new Date(report.session.createdAt)) : "—"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-num">1</div>
      <div class="section-title">Synthèse</div>
    </div>
    <div class="section-body"><p>${safeHighlight(report.summary)}</p></div>
  </div>

  ${keyPoints.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">2</div>
      <div class="section-title">Points clés</div>
    </div>
    <div class="section-body">
      <ul class="point-list">${keyPoints.map((p: string) => {
        const cls = classifyPoint(p);
        const icon = classColors[cls].icon;
        return `<li class="point-item ${cls}"><span class="point-icon">${icon}</span><span class="point-text">${safeHighlight(p)}</span></li>`;
      }).join("")}</ul>
    </div>
  </div>` : ""}

  ${actionItems.length > 0 ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">3</div>
      <div class="section-title">Actions à entreprendre</div>
    </div>
    <div class="section-body">
      <ul class="action-list">${actionItems.map((a: string) => {
        const isUrgent = /urgent|immédiat|impératif|délai|deadline/i.test(a);
        return `<li class="action-item${isUrgent ? " urgent" : ""}"><span class="action-check"></span><span class="action-text">${safeHighlight(a)}</span></li>`;
      }).join("")}</ul>
    </div>
  </div>` : ""}

  ${report.legalNotes ? `
  <div class="section">
    <div class="section-header">
      <div class="section-num">${keyPoints.length > 0 && actionItems.length > 0 ? "4" : keyPoints.length > 0 || actionItems.length > 0 ? "3" : "2"}</div>
      <div class="section-title">Observations juridiques</div>
    </div>
    <div class="section-body">
      <div class="legal-box"><p><span class="legal-icon">⚖</span> ${safeHighlight(report.legalNotes)}</p></div>
    </div>
  </div>` : ""}

  ${report.session?.transcription?.content ? `
  <div class="section" style="page-break-before: always;">
    <div class="section-header">
      <div class="section-num">T</div>
      <div class="section-title">Transcription intégrale</div>
    </div>
    <div class="section-body">
      <div class="transcription-box">${escapeHtml(report.session.transcription.content)}</div>
    </div>
  </div>` : ""}

  <div class="doc-footer">
    <span class="watermark">Cabinet HOK — HOK Reports</span>
    <span>Document généré automatiquement — ${formatDate(new Date())} — Confidentiel</span>
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

    const pdfBuffer = await generateReportPdf(report);

    await prisma.report.update({ where: { id }, data: { exportedAt: new Date() } });

    const { ipAddress, userAgent } = getClientInfo(req);
    await logAudit({ userId, action: "export_pdf", entity: "report", entityId: id, details: { title: report.title }, ipAddress, userAgent });

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="rapport-${id.slice(0, 8)}.pdf"`,
        "Content-Length": String(pdfBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json({ error: "Erreur d'export" }, { status: 500 });
  }
}
