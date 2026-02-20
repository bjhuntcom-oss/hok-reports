"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  ListChecks,
  Scale,
  Printer,
  Archive,
  Check,
  Download,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const getCategoryLabels = (locale: string): Record<string, string> => ({
  general: locale === "en" ? "General" : "Général",
  consultation: "Consultation",
  hearing: locale === "en" ? "Hearing" : "Audience",
  deposition: locale === "en" ? "Deposition" : "Déposition",
  meeting: locale === "en" ? "Meeting" : "Réunion",
});

const getFormatLabels = (locale: string): Record<string, string> => ({
  standard: "Standard",
  detailed: locale === "en" ? "Detailed" : "Détaillé",
  brief: locale === "en" ? "Brief" : "Synthèse",
});

export default function ReportDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { locale } = useAppStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setReport((prev: any) => ({ ...prev, status }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-20 text-center">
        <p className="text-[13px] text-neutral-400">{t("report.not_found", locale)}</p>
        <button onClick={() => router.push("/reports")} className="mt-3 text-[12px] font-medium text-black underline underline-offset-2">
          {t("report.back_to_reports", locale)}
        </button>
      </div>
    );
  }

  let keyPoints: string[] = [];
  let actionItems: string[] = [];
  try {
    keyPoints = JSON.parse(report.keyPoints || "[]");
  } catch { keyPoints = []; }
  try {
    actionItems = JSON.parse(report.actionItems || "[]");
  } catch { actionItems = []; }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-black"
          >
            <ArrowLeft size={13} /> {locale === "en" ? "Back to reports" : "Retour aux rapports"}
          </button>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
            Document
          </p>
          <h1 className="mt-1 text-[22px] font-semibold text-black">{report.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
              report.status === "final" ? "bg-emerald-50 text-emerald-600" :
              report.status === "archived" ? "bg-neutral-100 text-neutral-500" :
              "bg-amber-50 text-amber-600"
            }`}>
              {report.status === "draft" ? t("report.draft", locale) : report.status === "final" ? t("report.final", locale) : t("report.archived", locale)}
            </span>
            <span className="text-[11px] text-neutral-500">
              {report.session?.clientName}
            </span>
            {report.session?.caseReference && (
              <span className="text-[11px] text-neutral-400">
                {t("dash.ref", locale)} {report.session.caseReference}
              </span>
            )}
            <span className="text-[10px] text-neutral-400">
              {new Date(report.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report.status === "draft" && (
            <button
              onClick={() => updateStatus("final")}
              className="flex items-center gap-2 bg-black px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800"
            >
              <Check size={13} /> {locale === "en" ? "Finalize" : "Finaliser"}
            </button>
          )}
          {report.status === "final" && (
            <button
              onClick={() => updateStatus("archived")}
              className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <Archive size={13} /> {locale === "en" ? "Archive" : "Archiver"}
            </button>
          )}
          <button
            onClick={() => {
              window.open(`/api/reports/${id}/pdf`, "_blank");
            }}
            className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            <Download size={13} /> {locale === "en" ? "Export PDF" : "Exporter PDF"}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
          >
            <Printer size={13} /> {locale === "en" ? "Print" : "Imprimer"}
          </button>
        </div>
      </div>

      <div className="print:shadow-none print:border-none space-y-5" id="report-content">
        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            <FileText size={13} /> {locale === "en" ? "Summary" : "Résumé"}
          </h2>
          <div className="mt-4 text-[12px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
            {report.summary}
          </div>
        </div>

        {keyPoints.length > 0 && (
          <div className="border border-neutral-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              <CheckCircle size={13} /> {locale === "en" ? "Key points" : "Points clés"}
            </h2>
            <ul className="mt-4 space-y-3">
              {keyPoints.map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-black text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-[12px] text-neutral-600">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {actionItems.length > 0 && (
          <div className="border border-neutral-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              <ListChecks size={13} /> {locale === "en" ? "Action items" : "Actions à entreprendre"}
            </h2>
            <ul className="mt-4 space-y-3">
              {actionItems.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 h-4 w-4 shrink-0 border-2 border-neutral-300" />
                  <span className="text-[12px] text-neutral-600">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.legalNotes && (
          <div className="border border-amber-200 bg-amber-50 p-5">
            <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-amber-800 uppercase">
              <Scale size={13} /> {locale === "en" ? "Legal notes" : "Notes juridiques"}
            </h2>
            <div className="mt-4 text-[12px] leading-relaxed text-amber-700 whitespace-pre-wrap">
              {report.legalNotes}
            </div>
          </div>
        )}

        {report.session?.transcription && (
          <details className="border border-neutral-200 bg-white">
            <summary className="cursor-pointer px-5 py-4 text-[11px] font-bold tracking-[0.15em] text-black uppercase hover:bg-neutral-50">
              {locale === "en" ? "Full transcription" : "Transcription intégrale"}
            </summary>
            <div className="border-t border-neutral-100 px-5 py-4">
              <div className="bg-neutral-50 p-4 text-[12px] leading-relaxed text-neutral-500 whitespace-pre-wrap">
                {report.session.transcription.content}
              </div>
            </div>
          </details>
        )}
      </div>

      <div className="border border-neutral-200 bg-white p-5">
        <h3 className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">
          {locale === "en" ? "Report metadata" : "Métadonnées du rapport"}
        </h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Format</dt>
            <dd className="mt-0.5 font-medium text-black">{getFormatLabels(locale)[report.format] || report.format}</dd>
          </div>
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{t("report.category", locale)}</dt>
            <dd className="mt-0.5 font-medium text-black">{getCategoryLabels(locale)[report.category] || report.category}</dd>
          </div>
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Author" : "Auteur"}</dt>
            <dd className="mt-0.5 font-medium text-black">{report.user?.name}</dd>
          </div>
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Identifier" : "Identifiant"}</dt>
            <dd className="mt-0.5 font-mono text-[10px] text-neutral-400">{report.id}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
