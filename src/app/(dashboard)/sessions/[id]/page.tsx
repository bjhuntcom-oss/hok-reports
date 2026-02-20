"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Mic,
  Clock,
  User,
  FolderOpen,
  Loader2,
  RefreshCw,
  Download,
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

  const fetchSession = () => {
    fetch(`/api/sessions/${id}`)
      .then((res) => res.json())
      .then(setSession)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  const handleTranscribe = async () => {
    setTranscribing(true);
    try {
      await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });
      fetchSession();
    } catch (err) {
      console.error(err);
    } finally {
      setTranscribing(false);
    }
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
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
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
      <div>
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:text-black"
        >
          <ArrowLeft size={13} /> {locale === "en" ? "Back to sessions" : "Retour aux sessions"}
        </button>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {locale === "en" ? "Session detail" : "Détail de la session"}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">{session.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${status.style}`}>
            {status.label}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
            <User size={12} /> {session.clientName}
          </span>
          {session.caseReference && (
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <FolderOpen size={12} /> {t("dash.ref", locale)} {session.caseReference}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
            <Clock size={12} /> {formatDuration(session.audioDuration)}
          </span>
        </div>
      </div>

      {session.audioUrl && (
        <div className="border border-neutral-200 bg-white p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            <Mic size={13} /> {locale === "en" ? "Audio recording" : "Enregistrement audio"}
          </h3>
          <audio controls className="w-full" src={session.audioUrl}>
            {locale === "en" ? "Your browser does not support audio playback." : "Votre navigateur ne prend pas en charge la lecture audio."}
          </audio>
          <div className="mt-3 flex gap-2">
            {!session.transcription && (
              <button
                onClick={handleTranscribe}
                disabled={transcribing}
                className="flex items-center gap-2 bg-black px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {transcribing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {transcribing ? (locale === "en" ? "Transcribing..." : "Transcription...") : (locale === "en" ? "Transcribe audio" : "Transcrire l'audio")}
              </button>
            )}
            <a
              href={session.audioUrl}
              download
              className="flex items-center gap-2 border border-neutral-200 px-4 py-2 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <Download size={13} /> {locale === "en" ? "Download" : "Télécharger"}
            </a>
          </div>
        </div>
      )}

      {session.transcription && (
        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              <FileText size={13} /> Transcription
            </h3>
            {session.reports?.length === 0 && (
              <button
                onClick={handleGenerateReport}
                disabled={generating}
                className="flex items-center gap-2 bg-black px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                {generating ? (locale === "en" ? "Generating..." : "Génération...") : (locale === "en" ? "Generate report" : "Générer un rapport")}
              </button>
            )}
          </div>
          <div className="bg-neutral-50 p-4 text-[12px] leading-relaxed text-neutral-600 whitespace-pre-wrap">
            {session.transcription.content}
          </div>
        </div>
      )}

      {session.reports?.length > 0 && (
        <div className="border border-neutral-200 bg-white p-5">
          <h3 className="mb-4 flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            <FileText size={13} /> {locale === "en" ? "Associated reports" : "Rapports associés"} ({session.reports.length})
          </h3>
          <div className="space-y-2">
            {session.reports.map((r: any) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="flex items-center justify-between border border-neutral-100 p-3 transition-colors hover:bg-neutral-50"
              >
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

      <div className="border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-[11px] font-bold tracking-[0.15em] text-black uppercase">
          {locale === "en" ? "Session information" : "Informations de la session"}
        </h3>
        <dl className="grid grid-cols-2 gap-4 text-[12px]">
          <div>
            <dt className="text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">{locale === "en" ? "Client" : "Client"}</dt>
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
    </div>
  );
}
