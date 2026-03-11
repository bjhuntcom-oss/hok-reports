import React from "react";
import {
  Document,
  Page,
  Text,
  View,
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

const categoryLabels: Record<string, string> = {
  general: "General",
  consultation: "Consultation",
  hearing: "Audience",
  deposition: "Deposition",
  meeting: "Reunion",
};

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  final: "Finalise",
  archived: "Archive",
};

function Header({ report }: { report: ReportData }) {
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={styles.brandName}>Cabinet HOK</Text>
        <Text style={styles.brandTagline}>Avocats - Cotonou, Benin</Text>
      </View>
      <View style={styles.refBlock}>
        <Text style={styles.refId}>
          Ref. {report.id.slice(0, 8).toUpperCase()}
        </Text>
        <Text style={styles.refDate}>{formatDate(report.createdAt)}</Text>
      </View>
    </View>
  );
}

function ConfidentialBanner() {
  return (
    <View style={styles.confBanner}>
      <Text>Confidentiel - Document interne - Ne pas diffuser</Text>
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
          <Text style={styles.metaLabel}>Categorie : </Text>
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
    { label: "Client", value: report.session?.clientName || "-" },
    { label: "Ref. Dossier", value: report.session?.caseReference || "-" },
    { label: "Auteur", value: report.user?.name || "-" },
    {
      label: "Date Session",
      value: report.session ? formatDate(report.session.createdAt) : "-",
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

function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionNum}>{num}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SummarySection({ content, num }: { content: string; num: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader num={num} title="Synthese" />
      <View style={styles.sectionBody}>
        <Text style={styles.sectionText}>{content}</Text>
      </View>
    </View>
  );
}

function KeyPointsSection({ points, num }: { points: string[]; num: string }) {
  if (points.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader num={num} title="Points cles" />
      <View style={styles.sectionBody}>
        {points.map((p, i) => (
          <View key={i} style={styles.pointItem}>
            <Text style={styles.pointIcon}>{i + 1}.</Text>
            <Text style={styles.pointText}>{p}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ActionItemsSection({ items, num }: { items: string[]; num: string }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader num={num} title="Actions a entreprendre" />
      <View style={styles.sectionBody}>
        {items.map((a, i) => {
          const isUrgent = /urgent|immediat|imperatif|délai|deadline/i.test(a);
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

function LegalNotesSection({ notes, num }: { notes: string; num: string }) {
  return (
    <View style={styles.section}>
      <SectionHeader num={num} title="Observations juridiques" />
      <View style={styles.sectionBody}>
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>{notes}</Text>
        </View>
      </View>
    </View>
  );
}

function SuggestionsSection({ suggestions, num }: { suggestions: string[]; num: string }) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.section}>
      <SectionHeader num={num} title="Suggestions juridiques" />
      <View style={styles.sectionBody}>
        <View style={{ marginBottom: 5 }}>
          <Text style={{ fontSize: 6.5, color: colors.lightGray, fontStyle: "italic" }}>
            Ces suggestions sont indicatives et generees par IA. Les references legales doivent etre verifiees avant utilisation.
          </Text>
        </View>
        {suggestions.map((s, i) => {
          const match = s.match(/^\[([A-ZÉ]+)\]\s*/);
          const type = match ? match[1] : "";
          const text = match ? s.slice(match[0].length) : s;
          return (
            <View
              key={i}
              style={{
                flexDirection: "row" as const,
                marginBottom: 3,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderLeftWidth: 1.5,
                borderLeftColor: colors.borderGray,
                backgroundColor: colors.bgLighter,
              }}
            >
              {type ? (
                <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: colors.mediumGray, marginRight: 6, minWidth: 52 }}>
                  [{type}]
                </Text>
              ) : null}
              <Text style={{ fontSize: 8.5, color: colors.darkGray, flex: 1, lineHeight: 1.4 }}>{text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function DisclaimerSection() {
  return (
    <View style={{ marginTop: 10, padding: 8, backgroundColor: colors.bgLight, borderWidth: 0.5, borderColor: colors.borderGray }}>
      <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: colors.gray, marginBottom: 3 }}>
        AVERTISSEMENT - VERIFICATION OBLIGATOIRE
      </Text>
      <Text style={{ fontSize: 6, color: colors.mediumGray, lineHeight: 1.4 }}>
        Ce rapport est genere automatiquement par intelligence artificielle a partir d'une transcription audio. Les references legales, jurisprudentielles et les suggestions citees doivent imperativement etre verifiees dans les textes officiels avant toute utilisation. La transcription peut contenir des erreurs ou omissions. Ce document ne constitue pas un avis juridique formel et ne remplace pas l'analyse personnelle de l'avocat.
      </Text>
    </View>
  );
}

function TranscriptionSection({ content }: { content: string }) {
  return (
    <View style={styles.section} break>
      <SectionHeader num="T" title="Transcription integrale" />
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
      <Text style={styles.footerBrand}>Cabinet HOK - HOK Reports</Text>
      <Text style={styles.footerText}>
        Document genere automatiquement - Confidentiel
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

  let n = 1;
  const summaryNum = String(n++);
  const keyPointsNum = keyPoints.length > 0 ? String(n++) : "";
  const actionsNum = actionItems.length > 0 ? String(n++) : "";
  const legalNum = report.legalNotes ? String(n++) : "";
  const suggestionsNum = suggestions.length > 0 ? String(n++) : "";

  return (
    <Document
      title={report.title}
      author="Cabinet HOK"
      subject="Rapport juridique"
      creator="HOK Reports"
      producer="HOK Reports"
    >
      <Page size="A4" style={styles.page}>
        <WatermarkDraft status={report.status} />
        <Header report={report} />
        <ConfidentialBanner />
        <TitleBlock report={report} />
        <InfoGrid report={report} />
        <SummarySection content={report.summary} num={summaryNum} />
        <KeyPointsSection points={keyPoints} num={keyPointsNum} />
        <ActionItemsSection items={actionItems} num={actionsNum} />
        {report.legalNotes && (
          <LegalNotesSection notes={report.legalNotes} num={legalNum} />
        )}
        <SuggestionsSection suggestions={suggestions} num={suggestionsNum} />
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
