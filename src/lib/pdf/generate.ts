import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPDF } from "./report-template";

interface ReportInput {
  id: string;
  title: string;
  summary: string;
  keyPoints: string | null;
  actionItems: string | null;
  legalNotes: string | null;
  category: string;
  format: string;
  status: string;
  createdAt: Date | string;
  session?: {
    clientName: string | null;
    caseReference: string | null;
    createdAt: Date | string;
    transcription?: {
      content: string;
    } | null;
  } | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

export async function generateReportPdf(report: ReportInput): Promise<Uint8Array> {
  const keyPoints = safeParseArray(report.keyPoints);
  const actionItems = safeParseArray(report.actionItems);

  const data = {
    id: report.id,
    title: report.title,
    summary: report.summary,
    keyPoints,
    actionItems,
    legalNotes: report.legalNotes,
    category: report.category,
    format: report.format,
    status: report.status,
    createdAt:
      typeof report.createdAt === "string"
        ? report.createdAt
        : report.createdAt.toISOString(),
    session: report.session
      ? {
          clientName: report.session.clientName,
          caseReference: report.session.caseReference,
          createdAt:
            typeof report.session.createdAt === "string"
              ? report.session.createdAt
              : report.session.createdAt.toISOString(),
        }
      : null,
    user: report.user ? { name: report.user.name } : null,
    transcriptionContent: report.session?.transcription?.content || null,
  };

  const element = React.createElement(ReportPDF, { report: data });
  const buffer = await renderToBuffer(element as any);
  return new Uint8Array(buffer);
}

function safeParseArray(value: string | string[] | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
