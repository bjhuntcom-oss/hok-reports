"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, FileText, CheckCircle, ListChecks, Scale, Printer, Lightbulb,
  Archive, Check, Download, Edit3, X, Trash2, Plus, Save, AlertTriangle,
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
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editKeyPoints, setEditKeyPoints] = useState<string[]>([]);
  const [editActionItems, setEditActionItems] = useState<string[]>([]);
  const [editLegalNotes, setEditLegalNotes] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFormat, setEditFormat] = useState("");

  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then(setReport)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const startEditing = useCallback(() => {
    if (!report) return;
    setEditTitle(report.title || "");
    setEditSummary(report.summary || "");
    try { setEditKeyPoints(JSON.parse(report.keyPoints || "[]")); } catch { setEditKeyPoints([]); }
    try { setEditActionItems(JSON.parse(report.actionItems || "[]")); } catch { setEditActionItems([]); }
    setEditLegalNotes(report.legalNotes || "");
    setEditCategory(report.category || "general");
    setEditFormat(report.format || "standard");
    setEditing(true);
  }, [report]);

  const cancelEditing = () => setEditing(false);

  const saveEdits = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          summary: editSummary,
          keyPoints: JSON.stringify(editKeyPoints.filter(Boolean)),
          actionItems: JSON.stringify(editActionItems.filter(Boolean)),
          legalNotes: editLegalNotes,
          category: editCategory,
          format: editFormat,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReport(updated);
        setEditing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) setReport((prev: any) => ({ ...prev, status }));
    } catch (err) { console.error(err); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/reports");
    } catch (err) { console.error(err); }
    setDeleting(false);
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
  let suggestions: string[] = [];
  try { keyPoints = JSON.parse(report.keyPoints || "[]"); } catch { keyPoints = []; }
  try { actionItems = JSON.parse(report.actionItems || "[]"); } catch { actionItems = []; }
  try { suggestions = JSON.parse(report.suggestions || "[]"); } catch { suggestions = []; }

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-4 flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-black">
            <ArrowLeft size={13} /> {locale === "en" ? "Back to reports" : "Retour aux rapports"}
          </button>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">Document</p>
          {editing ? (
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1 w-full border-b-2 border-black bg-transparent text-[22px] font-semibold text-black outline-none" />
          ) : (
            <h1 className="mt-1 text-[22px] font-semibold text-black">{report.title}</h1>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
              report.status === "final" ? "bg-emerald-50 text-emerald-600" :
              report.status === "archived" ? "bg-neutral-100 text-neutral-500" :
              "bg-amber-50 text-amber-600"
            }`}>
              {report.status === "draft" ? t("report.draft", locale) : report.status === "final" ? t("report.final", locale) : t("report.archived", locale)}
            </span>
            <span className="text-[11px] text-neutral-500">{report.session?.clientName}</span>
            {report.session?.caseReference && (
              <span className="text-[11px] text-neutral-400">{t("dash.ref", locale)} {report.session.caseReference}</span>
            )}
            <span className="text-[10px] text-neutral-400">
              {new Date(report.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <button onClick={saveEdits} disabled={saving} className="flex items-center gap-2 bg-emerald-600 px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-emerald-700 disabled:opacity-40">
                <Save size={13} /> {saving ? "..." : locale === "en" ? "Save" : "Enregistrer"}
              </button>
              <button onClick={cancelEditing} className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50">
                <X size={13} /> {locale === "en" ? "Cancel" : "Annuler"}
              </button>
            </>
          ) : (
            <>
              <button onClick={startEditing} className="flex items-center gap-2 bg-black px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800">
                <Edit3 size={13} /> {locale === "en" ? "Edit" : "Modifier"}
              </button>
              {report.status === "draft" && (
                <button onClick={() => updateStatus("final")} className="flex items-center gap-2 border border-emerald-300 bg-emerald-50 px-4 py-2 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100">
                  <Check size={13} /> {locale === "en" ? "Finalize" : "Finaliser"}
                </button>
              )}
              {report.status === "final" && (
                <button onClick={() => updateStatus("archived")} className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50">
                  <Archive size={13} /> {locale === "en" ? "Archive" : "Archiver"}
                </button>
              )}
              <a href={`/api/reports/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50">
                <Download size={13} /> PDF
              </a>
              <button onClick={() => window.print()} className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50">
                <Printer size={13} />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1 bg-red-500 px-3 py-2 text-[10px] font-bold text-white uppercase disabled:opacity-40">
                    {deleting ? "..." : locale === "en" ? "Confirm" : "Confirmer"}
                  </button>
                  <button onClick={() => setConfirmDelete(false)} className="flex items-center justify-center border border-neutral-200 px-2 py-2 text-neutral-400 hover:bg-neutral-50">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 border border-red-200 px-3 py-2 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50" title={locale === "en" ? "Delete report" : "Supprimer le rapport"}>
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── EDITING: Category & Format ── */}
      {editing && (
        <div className="flex gap-3">
          <div>
            <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Category" : "Catégorie"}</label>
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="mt-1 block border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-black">
              {Object.entries(getCategoryLabels(locale)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Format</label>
            <select value={editFormat} onChange={(e) => setEditFormat(e.target.value)} className="mt-1 block border border-neutral-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-black">
              {Object.entries(getFormatLabels(locale)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="print:shadow-none print:border-none space-y-5" id="report-content">
        {/* Summary */}
        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            <FileText size={13} /> {locale === "en" ? "Summary" : "Résumé"}
          </h2>
          {editing ? (
            <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={8} className="mt-3 w-full border border-neutral-200 bg-neutral-50 p-3 text-[12px] leading-relaxed text-neutral-700 outline-none transition-colors focus:border-black focus:bg-white" />
          ) : (
            <div className="mt-4 text-[12px] leading-relaxed text-neutral-600 whitespace-pre-wrap">{report.summary}</div>
          )}
        </div>

        {/* Key Points */}
        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            <CheckCircle size={13} /> {locale === "en" ? "Key points" : "Points clés"}
          </h2>
          {editing ? (
            <div className="mt-3 space-y-2">
              {editKeyPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center bg-black text-[10px] font-bold text-white">{i + 1}</span>
                  <input value={point} onChange={(e) => { const arr = [...editKeyPoints]; arr[i] = e.target.value; setEditKeyPoints(arr); }} className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
                  <button onClick={() => setEditKeyPoints(editKeyPoints.filter((_, j) => j !== i))} className="mt-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
              <button onClick={() => setEditKeyPoints([...editKeyPoints, ""])} className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-black">
                <Plus size={12} /> {locale === "en" ? "Add point" : "Ajouter un point"}
              </button>
            </div>
          ) : keyPoints.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {keyPoints.map((point: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-black text-[10px] font-bold text-white">{i + 1}</span>
                  <span className="text-[12px] text-neutral-600">{point}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[11px] text-neutral-400">{locale === "en" ? "No key points." : "Aucun point clé."}</p>
          )}
        </div>

        {/* Action Items */}
        <div className="border border-neutral-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            <ListChecks size={13} /> {locale === "en" ? "Action items" : "Actions à entreprendre"}
          </h2>
          {editing ? (
            <div className="mt-3 space-y-2">
              {editActionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2.5 h-4 w-4 shrink-0 border-2 border-neutral-300" />
                  <input value={item} onChange={(e) => { const arr = [...editActionItems]; arr[i] = e.target.value; setEditActionItems(arr); }} className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
                  <button onClick={() => setEditActionItems(editActionItems.filter((_, j) => j !== i))} className="mt-1 text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              ))}
              <button onClick={() => setEditActionItems([...editActionItems, ""])} className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-neutral-500 hover:text-black">
                <Plus size={12} /> {locale === "en" ? "Add action" : "Ajouter une action"}
              </button>
            </div>
          ) : actionItems.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {actionItems.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 h-4 w-4 shrink-0 border-2 border-neutral-300" />
                  <span className="text-[12px] text-neutral-600">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[11px] text-neutral-400">{locale === "en" ? "No action items." : "Aucune action."}</p>
          )}
        </div>

        {/* Legal Notes */}
        <div className={`border p-5 ${editing || report.legalNotes ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white"}`}>
          <h2 className={`flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase ${editing || report.legalNotes ? "text-amber-800" : "text-black"}`}>
            <Scale size={13} /> {locale === "en" ? "Legal notes" : "Notes juridiques"}
          </h2>
          {editing ? (
            <textarea value={editLegalNotes} onChange={(e) => setEditLegalNotes(e.target.value)} rows={4} placeholder={locale === "en" ? "Add legal observations..." : "Ajouter des observations juridiques..."} className="mt-3 w-full border border-amber-300 bg-white p-3 text-[12px] leading-relaxed text-amber-800 outline-none transition-colors focus:border-amber-500" />
          ) : report.legalNotes ? (
            <div className="mt-4 text-[12px] leading-relaxed text-amber-700 whitespace-pre-wrap">{report.legalNotes}</div>
          ) : (
            <p className="mt-3 text-[11px] text-neutral-400">{locale === "en" ? "No legal notes." : "Aucune note juridique."}</p>
          )}
        </div>

        {/* Suggestions juridiques */}
        {suggestions.length > 0 && (
          <div className="border border-indigo-200 bg-indigo-50/50 p-5">
            <h2 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-indigo-800 uppercase">
              <Lightbulb size={13} /> {locale === "en" ? "Legal suggestions" : "Suggestions juridiques"}
            </h2>
            <p className="mt-2 text-[10px] text-indigo-400 italic">
              {locale === "en"
                ? "⚠ These suggestions are AI-generated and indicative only. Legal references must be verified before use."
                : "⚠ Ces suggestions sont générées par IA et indicatives uniquement. Les références légales doivent être vérifiées avant toute utilisation."}
            </p>
            <ul className="mt-4 space-y-2">
              {suggestions.map((s: string, i: number) => {
                const match = s.match(/^\[([A-ZÉ]+)\]\s*/);
                const type = match ? match[1] : "";
                const text = match ? s.slice(match[0].length) : s;
                const typeColors: Record<string, string> = {
                  LOI: "bg-blue-100 text-blue-700 border-blue-300",
                  ARGUMENT: "bg-green-100 text-green-700 border-green-300",
                  "DÉFENSE": "bg-amber-100 text-amber-700 border-amber-300",
                  OUVERTURE: "bg-purple-100 text-purple-700 border-purple-300",
                  JURISPRUDENCE: "bg-orange-100 text-orange-700 border-orange-300",
                  PREUVE: "bg-cyan-100 text-cyan-700 border-cyan-300",
                };
                return (
                  <li key={i} className="flex items-start gap-2">
                    {type && (
                      <span className={`mt-0.5 shrink-0 border px-1.5 py-0.5 text-[8px] font-bold uppercase ${typeColors[type] || "bg-neutral-100 text-neutral-600 border-neutral-300"}`}>
                        {type}
                      </span>
                    )}
                    <span className="text-[12px] text-indigo-700">{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="border border-red-200 bg-red-50/30 p-4">
          <p className="text-[10px] font-semibold text-red-600">
            {locale === "en" ? "⚠ MANDATORY DISCLAIMER" : "⚠ AVERTISSEMENT — VÉRIFICATION OBLIGATOIRE"}
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-red-500">
            {locale === "en"
              ? "This report is automatically generated by AI from an audio transcription. Legal references, case law and suggestions must be verified in official texts before use. The transcription may contain errors (homophones, inaudible passages). This document does not constitute formal legal advice. The lawyer must verify all names, dates, amounts and case references before use."
              : "Ce rapport est généré automatiquement par IA à partir d'une transcription audio. Les références légales, jurisprudentielles et les suggestions citées doivent être vérifiées dans les textes officiels avant toute utilisation. La transcription peut contenir des erreurs ou omissions (homophones, passages inaudibles). Ce document ne constitue pas un avis juridique formel. L'avocat doit vérifier tous les noms, dates, montants et références de dossier avant utilisation."}
          </p>
        </div>

        {/* Transcription */}
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

      {/* ── METADATA ── */}
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

      {/* ── DANGER ZONE ── */}
      <div className="border border-red-200 bg-red-50/50 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-400" />
          <h3 className="text-[9px] font-bold tracking-[0.15em] text-red-500 uppercase">{locale === "en" ? "Danger zone" : "Zone de danger"}</h3>
        </div>
        <p className="mt-2 text-[11px] text-red-400">{locale === "en" ? "Deleting a report is permanent and cannot be undone." : "La suppression d'un rapport est définitive et irréversible."}</p>
        {confirmDelete ? (
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 bg-red-500 px-4 py-2 text-[10px] font-bold text-white uppercase disabled:opacity-40">
              <Trash2 size={12} /> {deleting ? "..." : locale === "en" ? "Yes, delete" : "Oui, supprimer"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="border border-neutral-200 px-4 py-2 text-[10px] font-semibold text-neutral-500">
              {locale === "en" ? "Cancel" : "Annuler"}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="mt-3 flex items-center gap-1.5 border border-red-300 px-4 py-2 text-[10px] font-bold text-red-500 uppercase transition-colors hover:bg-red-100">
            <Trash2 size={12} /> {locale === "en" ? "Delete this report" : "Supprimer ce rapport"}
          </button>
        )}
      </div>
    </div>
  );
}
