import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
} from "@react-pdf/renderer";
import { styles, colors } from "./styles";

interface ReportData {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  legalNotes: string | null;
  suggestions: string[];
  category: string;
  format: string;
  status: string;
  createdAt: string;
  session?: {
    clientName: string | null;
    caseReference: string | null;
    createdAt: string;
  } | null;
  user?: {
    name: string | null;
  } | null;
  transcriptionContent?: string | null;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function classifyPoint(text: string): "critical" | "warning" | "info" {
  const criticalTerms =
    /urgence|urgent|immédiat|impératif|critique|obligatoire|délai|forclusion|prescription|risque|danger|irrecevab/i;
  const warningTerms =
    /attention|important|essentiel|vigilance|surveiller|vérifier|confirmer|relancer|rappel/i;
  if (criticalTerms.test(text)) return "critical";
  if (warningTerms.test(text)) return "warning";
  return "info";
}

const categoryLabels: Record<string, string> = {
  general: "Général",
  consultation: "Consultation",
  hearing: "Audience",
  deposition: "Déposition",
  meeting: "Réunion",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  final: "Finalisé",
  archived: "Archivé",
};

const classIcons: Record<string, string> = {
  critical: "!",
  warning: "~",
  info: "-",
};

function Header({ report }: { report: ReportData }) {
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.brandName}>Cabinet HOK</Text>
        <Text style={styles.brandTagline}>
          Avocats — Cotonou, Bénin
        </Text>
      </View>
      <View style={styles.refBlock}>
        <Text style={styles.refId}>
          Réf. {report.id.slice(0, 8).toUpperCase()}
        </Text>
        <Text style={styles.refDate}>{formatDate(report.createdAt)}</Text>
      </View>
    </View>
  );
}

function ConfidentialBanner() {
  return (
    <View style={styles.confBanner}>
      <Text>Confidentiel — Document interne — Ne pas diffuser</Text>
    </View>
  );
}

function TitleBlock({ report }: { report: ReportData }) {
  const statusColor =
    colors.status[report.status as keyof typeof colors.status] ||
    colors.status.draft;
  return (
    <View style={styles.titleBlock}>
      <Text style={styles.title}>{report.title}</Text>
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Catégorie : </Text>
          <Text style={styles.metaValue}>
            {categoryLabels[report.category] || report.category}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Format : </Text>
          <Text style={styles.metaValue}>{report.format}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Statut : </Text>
          <Text
            style={[styles.statusBadge, { backgroundColor: statusColor }]}
          >
            {statusLabels[report.status] || report.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

function InfoGrid({ report }: { report: ReportData }) {
  const cells = [
    { label: "Client", value: report.session?.clientName || "—" },
    { label: "Réf. Dossier", value: report.session?.caseReference || "—" },
    { label: "Auteur", value: report.user?.name || "—" },
    {
      label: "Date Session",
      value: report.session ? formatDate(report.session.createdAt) : "—",
    },
  ];
  return (
    <View style={styles.infoGrid}>
      {cells.map((cell, i) => (
        <View
          key={cell.label}
          style={i < cells.length - 1 ? styles.infoCell : styles.infoCellLast}
        >
          <Text style={styles.cellLabel}>{cell.label}</Text>
          <Text style={styles.cellValue}>{cell.value}</Text>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({
  num,
  title,
}: {
  num: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionNum}>{num}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SummarySection({ content }: { content: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader num="1" title="Synthèse" />
      <View style={styles.sectionBody}>
        <Text style={styles.sectionText}>{content}</Text>
      </View>
    </View>
  );
}

function KeyPointsSection({ points }: { points: string[] }) {
  if (points.length === 0) return null;
  return (
    <View style={styles.section} wrap={false}>
      <SectionHeader num="2" title="Points clés" />
      <View style={styles.sectionBody}>
        {points.map((p, i) => {
          const cls = classifyPoint(p);
          const pointColors = colors[cls];
          return (
            <View
              key={i}
              style={[
                styles.pointItem,
                {
                  backgroundColor: pointColors.bg,
                  borderLeftColor: pointColors.border,
                },
              ]}
            >
              <Text
                style={[styles.pointIcon, { color: pointColors.border }]}
              >
                {classIcons[cls]}
              </Text>
              <Text
                style={[
                  styles.pointText,
                  {
                    color: pointColors.text,
                    fontFamily:
                      cls === "critical" ? "Helvetica-Bold" : "Helvetica",
                  },
                ]}
              >
                {p}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ActionItemsSection({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section} wrap={false}>
      <SectionHeader num="3" title="Actions à entreprendre" />
      <View style={styles.sectionBody}>
        {items.map((a, i) => {
          const isUrgent = /urgent|immédiat|impératif|délai|deadline/i.test(a);
          return (
            <View
              key={i}
              style={isUrgent ? styles.actionItemUrgent : styles.actionItem}
            >
              <View
                style={isUrgent ? styles.actionCheckUrgent : styles.actionCheck}
              />
              <Text
                style={isUrgent ? styles.actionTextUrgent : styles.actionText}
              >
                {a}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function LegalNotesSection({
  notes,
  sectionNum,
}: {
  notes: string;
  sectionNum: string;
}) {
  return (
    <View style={styles.section} wrap={false}>
      <SectionHeader num={sectionNum} title="Observations juridiques" />
      <View style={styles.sectionBody}>
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>{notes}</Text>
        </View>
      </View>
    </View>
  );
}

function SuggestionsSection({ suggestions, sectionNum }: { suggestions: string[]; sectionNum: string }) {
  if (suggestions.length === 0) return null;

  const typeColors: Record<string, { bg: string; border: string }> = {
    LOI: { bg: "#EFF6FF", border: "#3B82F6" },
    ARGUMENT: { bg: "#F0FDF4", border: "#22C55E" },
    "DÉFENSE": { bg: "#FEF3C7", border: "#F59E0B" },
    OUVERTURE: { bg: "#F5F3FF", border: "#8B5CF6" },
    JURISPRUDENCE: { bg: "#FFF7ED", border: "#EA580C" },
    PREUVE: { bg: "#F0F9FF", border: "#0EA5E9" },
  };

  return (
    <View style={styles.section}>
      <SectionHeader num={sectionNum} title="Suggestions juridiques" />
      <View style={styles.sectionBody}>
        <View style={{ marginBottom: 6 }}>
          <Text style={{ fontSize: 7, color: "#9CA3AF", fontStyle: "italic" }}>
            ⚠ Ces suggestions sont indicatives et générées par IA. Les références légales et jurisprudentielles doivent impérativement être vérifiées par l'avocat avant toute utilisation.
          </Text>
        </View>
        {suggestions.map((s, i) => {
          const match = s.match(/^\[([A-ZÉ]+)\]\s*/);
          const type = match ? match[1] : "";
          const text = match ? s.slice(match[0].length) : s;
          const tc = typeColors[type] || { bg: "#F9FAFB", border: "#6B7280" };
          return (
            <View
              key={i}
              style={{
                flexDirection: "row" as const,
                marginBottom: 4,
                padding: 6,
                backgroundColor: tc.bg,
                borderLeftWidth: 2,
                borderLeftColor: tc.border,
              }}
            >
              {type ? (
                <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: tc.border, marginRight: 6, minWidth: 55 }}>
                  [{type}]
                </Text>
              ) : null}
              <Text style={{ fontSize: 8, color: "#1F2937", flex: 1 }}>{text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DisclaimerSection() {
  return (
    <View style={{ marginTop: 12, padding: 10, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA" }}>
      <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#991B1B", marginBottom: 4 }}>
        ⚠ AVERTISSEMENT — VÉRIFICATION OBLIGATOIRE
      </Text>
      <Text style={{ fontSize: 6.5, color: "#7F1D1D", lineHeight: 1.4 }}>
        Ce rapport est généré automatiquement par intelligence artificielle à partir d'une transcription audio. Les références légales, jurisprudentielles et les suggestions citées doivent impérativement être vérifiées dans les textes officiels avant toute utilisation. La transcription peut contenir des erreurs ou omissions (homophones, passages inaudibles). Ce document ne constitue pas un avis juridique formel et ne remplace pas l'analyse personnelle de l'avocat. Tous les noms, dates, montants et références de dossier doivent être contrôlés.
      </Text>
    </View>
  );
}

function TranscriptionSection({ content }: { content: string }) {
  return (
    <View style={styles.section} break>
      <SectionHeader num="T" title="Transcription intégrale" />
      <View style={styles.sectionBody}>
        <View style={styles.transcriptionBox}>
          <Text>{content}</Text>
        </View>
      </View>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerBrand}>Cabinet HOK — HOK Reports</Text>
      <Text style={styles.footerText}>
        Document généré automatiquement — {formatDate(new Date().toISOString())} — Confidentiel
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

function WatermarkDraft({ status }: { status: string }) {
  if (status !== "draft") return null;
  return <Text style={styles.watermark}>Brouillon</Text>;
}

export function ReportPDF({ report }: { report: ReportData }) {
  const keyPoints = report.keyPoints;
  const actionItems = report.actionItems;

  const suggestions = report.suggestions || [];

  let sectionCounter = 1;
  const summaryNum = String(sectionCounter++);
  const keyPointsNum = keyPoints.length > 0 ? String(sectionCounter++) : "";
  const actionsNum = actionItems.length > 0 ? String(sectionCounter++) : "";
  const legalNum = report.legalNotes ? String(sectionCounter++) : "";
  const suggestionsNum = suggestions.length > 0 ? String(sectionCounter++) : "";

  return (
    <Document
      title={report.title}
      author="Cabinet HOK"
      subject="Rapport juridique"
      creator="HOK Reports"
      producer="HOK Reports — @react-pdf/renderer"
    >
      <Page size="A4" style={styles.page}>
        <WatermarkDraft status={report.status} />
        <Header report={report} />
        <ConfidentialBanner />
        <TitleBlock report={report} />
        <InfoGrid report={report} />
        <SummarySection content={report.summary} />
        <KeyPointsSection points={keyPoints} />
        <ActionItemsSection items={actionItems} />
        {report.legalNotes && (
          <LegalNotesSection
            notes={report.legalNotes}
            sectionNum={legalNum}
          />
        )}
        <SuggestionsSection suggestions={suggestions} sectionNum={suggestionsNum} />
        <DisclaimerSection />
        <Footer />
      </Page>
      {report.transcriptionContent && (
        <Page size="A4" style={styles.page}>
          <WatermarkDraft status={report.status} />
          <TranscriptionSection content={report.transcriptionContent} />
          <Footer />
        </Page>
      )}
    </Document>
  );
}
