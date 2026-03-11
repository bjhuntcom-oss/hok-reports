"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, FileText, Mic, Clock, User, FolderOpen, Loader2,
  RefreshCw, Download, Edit3, Save, X, Trash2, AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const getStatusConfig = (locale: string): Record<string, { style: string; label: string }> => ({
  recording: { style: "bg-red-50 text-red-600", label: locale === "en" ? "Recording" : "Enregistrement" },
  transcribing: { style: "bg-amber-50 text-amber-600", label: locale === "en" ? "Transcribing" : "Transcription" },
  summarizing: { style: "bg-blue-50 text-blue-600", label: locale === "en" ? "Analyzing" : "Analyse" },
  completed: { style: "bg-emerald-50 text-emerald-600", label: locale === "en" ? "Completed" : "Terminé" },
  error: { style: "bg-red-50 text-red-600", label: locale === "en" ? "Error" : "Erreur" },
});

export default function SessionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { locale } = useAppStore();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Transcription editing
  const [editingTranscription, setEditingTranscription] = useState(false);
  const [editTranscriptionContent, setEditTranscriptionContent] = useState("");
  const [savingTranscription, setSavingTranscription] = useState(false);

  // Session editing
  const [editingSession, setEditingSession] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editCaseReference, setEditCaseReference] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingSession, setSavingSession] = useState(false);

  // Delete
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSession = () => {
    fetch(`/api/sessions/${id}`)
      .then((res) => res.json())
      .then(setSession)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSession(); }, [id]);

  const handleTranscribe = async () => {
    setTranscribing(true);
    try {
      await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      fetchSession();
    } catch (err) { console.error(err); }
    finally { setTranscribing(false); }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id, format: "standard", category: "consultation" }),
      });
      fetchSession();
    } catch (err) { console.error(err); }
    finally { setGenerating(false); }
  };

  const startEditTranscription = () => {
    setEditTranscriptionContent(session.transcription?.content || "");
    setEditingTranscription(true);
  };

  const saveTranscription = async () => {
    if (!session.transcription?.id) return;
    setSavingTranscription(true);
    try {
      const res = await fetch(`/api/transcriptions/${session.transcription.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editTranscriptionContent }),
      });
      if (res.ok) {
        setSession((prev: any) => ({
          ...prev,
          transcription: { ...prev.transcription, content: editTranscriptionContent },
        }));
        setEditingTranscription(false);
      }
    } catch (err) { console.error(err); }
    finally { setSavingTranscription(false); }
  };

  const startEditSession = () => {
    setEditTitle(session.title || "");
    setEditClientName(session.clientName || "");
    setEditClientEmail(session.clientEmail || "");
    setEditClientPhone(session.clientPhone || "");
    setEditCaseReference(session.caseReference || "");
    setEditDescription(session.description || "");
    setEditingSession(true);
  };

  const saveSession = async () => {
    setSavingSession(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          clientName: editClientName,
          clientEmail: editClientEmail,
          clientPhone: editClientPhone,
          caseReference: editCaseReference,
          description: editDescription,
        }),
      });
      if (res.ok) {
        fetchSession();
        setEditingSession(false);
      }
    } catch (err) { console.error(err); }
    finally { setSavingSession(false); }
  };

  const handleDeleteSession = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/sessions");
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

  if (!session) {
    return (
      <div className="py-20 text-center">
        <p className="text-[13px] text-neutral-400">{locale === "en" ? "Session not found or deleted." : "Session introuvable ou supprimée."}</p>
        <button onClick={() => router.push("/sessions")} className="mt-3 text-[12px] font-medium text-black underline underline-offset-2">
          {locale === "en" ? "Back to sessions" : "Retour aux sessions"}
        </button>
      </div>
    );
  }

  const statusConfig = getStatusConfig(locale);
  const status = statusConfig[session.status] || statusConfig.error;
  const formatDuration = (s: number | null) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-5">
      {/* ── HEADER ── */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => router.back()} className="mb-4 flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-black">
            <ArrowLeft size={13} /> {locale === "en" ? "Back to sessions" : "Retour aux sessions"}
          </button>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
            {locale === "en" ? "Session detail" : "Détail de la session"}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold text-black">{session.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${status.style}`}>{status.label}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-500"><User size={12} /> {session.clientName}</span>
            {session.caseReference && (
              <span className="flex items-center gap-1.5 text-[11px] text-neutral-400"><FolderOpen size={12} /> {t("dash.ref", locale)} {session.caseReference}</span>
            )}
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400"><Clock size={12} /> {formatDuration(session.audioDuration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={startEditSession} className="flex items-center gap-2 bg-black px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800">
            <Edit3 size={13} /> {locale === "en" ? "Edit" : "Modifier"}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={handleDeleteSession} disabled={deleting} className="flex items-center gap-1 bg-red-500 px-3 py-2 text-[10px] font-bold text-white uppercase disabled:opacity-40">
                {deleting ? "..." : locale === "en" ? "Confirm" : "Confirmer"}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="flex items-center justify-center border border-neutral-200 px-2 py-2 text-neutral-400 hover:bg-neutral-50"><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 border border-red-200 px-3 py-2 text-[11px] font-medium text-red-500 transition-colors hover:bg-red-50" title={locale === "en" ? "Delete session" : "Supprimer la session"}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── EDIT SESSION MODAL ── */}
      {editingSession && (
        <div className="border-2 border-black bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              {locale === "en" ? "Edit session" : "Modifier la session"}
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={saveSession} disabled={savingSession} className="flex items-center gap-1.5 bg-emerald-600 px-4 py-2 text-[10px] font-semibold text-white uppercase hover:bg-emerald-700 disabled:opacity-40">
                <Save size={12} /> {savingSession ? "..." : locale === "en" ? "Save" : "Enregistrer"}
              </button>
              <button onClick={() => setEditingSession(false)} className="flex items-center gap-1.5 border border-neutral-200 px-4 py-2 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50">
                <X size={12} /> {locale === "en" ? "Cancel" : "Annuler"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Title" : "Titre"}</label>
              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Client</label>
              <input value={editClientName} onChange={(e) => setEditClientName(e.target.value)} className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Email</label>
              <input value={editClientEmail} onChange={(e) => setEditClientEmail(e.target.value)} className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Phone" : "Téléphone"}</label>
              <input value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)} className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
            </div>
            <div>
              <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Case reference" : "Réf. dossier"}</label>
              <input value={editCaseReference} onChange={(e) => setEditCaseReference(e.target.value)} className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="mt-1 w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
            </div>
          </div>
        </div>
      )}

      {/* ── AUDIO ── */}
      {session.audioUrl && (() => {
        // Normalize audioUrl: legacy /uploads/audio/X → /api/audio/X
        const rawUrl = session.audioUrl as string;
        const audioSrc = rawUrl.startsWith("/uploads/audio/")
          ? `/api/audio/${rawUrl.replace("/uploads/audio/", "")}`
          : rawUrl;
        return (
          <div className="border border-neutral-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              <Mic size={13} /> {locale === "en" ? "Audio recording" : "Enregistrement audio"}
            </h3>
            <audio controls className="w-full" src={audioSrc}>
              {locale === "en" ? "Your browser does not support audio playback." : "Votre navigateur ne prend pas en charge la lecture audio."}
            </audio>
            <div className="mt-3 flex gap-2">
              {!session.transcription && (
                <button onClick={handleTranscribe} disabled={transcribing} className="flex items-center gap-2 bg-black px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40">
                  {transcribing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  {transcribing ? (locale === "en" ? "Transcribing..." : "Transcription...") : (locale === "en" ? "Transcribe audio" : "Transcrire l'audio")}
                </button>
              )}
              <a href={`${audioSrc}?download=1`} download className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50">
                <Download size={13} /> {locale === "en" ? "Download" : "Télécharger"}
              </a>
            </div>
          </div>
        );
      })()}

      {/* ── TRANSCRIPTION (with edit) ── */}
      {session.transcription && (
        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              <FileText size={13} /> Transcription
            </h3>
            <div className="flex items-center gap-2">
              {editingTranscription ? (
                <>
                  <button onClick={saveTranscription} disabled={savingTranscription} className="flex items-center gap-1.5 bg-emerald-600 px-3 py-1.5 text-[10px] font-semibold text-white uppercase hover:bg-emerald-700 disabled:opacity-40">
                    <Save size={11} /> {savingTranscription ? "..." : locale === "en" ? "Save" : "Enregistrer"}
                  </button>
                  <button onClick={() => setEditingTranscription(false)} className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50">
                    <X size={11} /> {locale === "en" ? "Cancel" : "Annuler"}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startEditTranscription} className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5 text-[10px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-black">
                    <Edit3 size={11} /> {locale === "en" ? "Edit" : "Modifier"}
                  </button>
                  {session.reports?.length === 0 && (
                    <button onClick={handleGenerateReport} disabled={generating} className="flex items-center gap-2 bg-black px-4 py-1.5 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40">
                      {generating ? <Loader2 size={11} className="animate-spin" /> : <FileText size={11} />}
                      {generating ? (locale === "en" ? "Generating..." : "Génération...") : (locale === "en" ? "Generate report" : "Générer un rapport")}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {editingTranscription ? (
            <textarea value={editTranscriptionContent} onChange={(e) => setEditTranscriptionContent(e.target.value)} rows={20} className="w-full border border-neutral-200 bg-neutral-50 p-4 text-[12px] leading-relaxed text-neutral-700 outline-none transition-colors focus:border-black focus:bg-white font-mono" />
          ) : (
            <div className="bg-neutral-50 p-4 text-[12px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
              {session.transcription.content}
            </div>
          )}
          <div className="mt-2 text-[9px] text-neutral-400">
            {locale === "en" ? "Characters:" : "Caractères :"} {session.transcription.content?.length?.toLocaleString() || 0}
          </div>
        </div>
      )}

      {/* ── ASSOCIATED REPORTS ── */}
      {session.reports?.length > 0 && (
        <div className="border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            <FileText size={13} /> {locale === "en" ? "Associated reports" : "Rapports associés"} ({session.reports.length})
          </h3>
          <div className="space-y-2">
            {session.reports.map((r: any) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center justify-between border border-neutral-100 p-3 transition-colors hover:bg-neutral-50">
                <div>
                  <p className="text-[12px] font-medium text-black">{r.title}</p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    {new Date(r.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")} — {r.format} — {r.category}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
                  r.status === "final" ? "bg-emerald-50 text-emerald-600" :
                  r.status === "archived" ? "bg-neutral-100 text-neutral-500" :
                  "bg-amber-50 text-amber-600"
                }`}>
                  {r.status === "final" ? t("report.final", locale) : r.status === "archived" ? t("report.archived", locale) : t("report.draft", locale)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── SESSION INFO ── */}
      <div className="border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
          {locale === "en" ? "Session information" : "Informations de la session"}
        </h3>
        <dl className="grid grid-cols-2 gap-4 text-[12px]">
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Client</dt>
            <dd className="mt-1 text-black">{session.clientName}</dd>
          </div>
          {session.clientEmail && (
            <div>
              <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Email</dt>
              <dd className="mt-1 text-black">{session.clientEmail}</dd>
            </div>
          )}
          {session.clientPhone && (
            <div>
              <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Phone" : "Téléphone"}</dt>
              <dd className="mt-1 text-black">{session.clientPhone}</dd>
            </div>
          )}
          {session.caseReference && (
            <div>
              <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{t("session.caseRef", locale)}</dt>
              <dd className="mt-1 text-black">{session.caseReference}</dd>
            </div>
          )}
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{t("session.language", locale)}</dt>
            <dd className="mt-1 text-black">{session.language === "fr" ? (locale === "en" ? "French" : "Français") : "English"}</dd>
          </div>
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Created" : "Date de création"}</dt>
            <dd className="mt-1 text-black">
              {new Date(session.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
                day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </dd>
          </div>
        </dl>
        {session.description && (
          <div className="mt-4 border-t border-neutral-100 pt-4">
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">Description</dt>
            <dd className="mt-1 text-[12px] text-neutral-600">{session.description}</dd>
          </div>
        )}
      </div>

      {/* ── DANGER ZONE ── */}
      <div className="border border-red-200 bg-red-50/50 p-5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="text-red-400" />
          <h3 className="text-[9px] font-bold tracking-[0.15em] text-red-500 uppercase">{locale === "en" ? "Danger zone" : "Zone de danger"}</h3>
        </div>
        <p className="mt-2 text-[11px] text-red-400">
          {locale === "en"
            ? "Deleting a session will permanently remove all associated transcriptions and reports."
            : "Supprimer une session supprimera définitivement toutes les transcriptions et rapports associés."}
        </p>
        {confirmDelete ? (
          <div className="mt-3 flex items-center gap-2">
            <button onClick={handleDeleteSession} disabled={deleting} className="flex items-center gap-1.5 bg-red-500 px-4 py-2 text-[10px] font-bold text-white uppercase disabled:opacity-40">
              <Trash2 size={12} /> {deleting ? "..." : locale === "en" ? "Yes, delete" : "Oui, supprimer"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="border border-neutral-200 px-4 py-2 text-[10px] font-semibold text-neutral-500">
              {locale === "en" ? "Cancel" : "Annuler"}
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="mt-3 flex items-center gap-1.5 border border-red-300 px-4 py-2 text-[10px] font-bold text-red-500 uppercase transition-colors hover:bg-red-100">
            <Trash2 size={12} /> {locale === "en" ? "Delete this session" : "Supprimer cette session"}
          </button>
        )}
      </div>
    </div>
  );
}
