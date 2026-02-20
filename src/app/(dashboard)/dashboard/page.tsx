"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic,
  FileText,
  Clock,
  ArrowRight,
  Plus,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

interface DashboardData {
  totalSessions: number;
  totalReports: number;
  totalDuration: number;
  recentSessions: any[];
  recentReports: any[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatDateLocale(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { locale } = useAppStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
            {t("dash.workspace", locale)}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold text-black">{t("dash.title", locale)}</h1>
          <p className="mt-1 text-[13px] text-neutral-400">
            {t("dash.subtitle", locale)}
          </p>
        </div>
        <Link
          href="/sessions/new"
          className="flex items-center gap-2 bg-black px-4 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800"
        >
          <Plus size={14} />
          {t("common.newSession", locale)}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Mic size={14} className="text-neutral-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("dash.sessionsRecorded", locale)}
            </span>
          </div>
          <p className="mt-3 text-[32px] font-light text-black">
            {data?.totalSessions || 0}
          </p>
          <p className="text-[10px] text-neutral-300">
            {t("dash.sinceCreation", locale)}
          </p>
        </div>

        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-neutral-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("dash.reportsProduced", locale)}
            </span>
          </div>
          <p className="mt-3 text-[32px] font-light text-black">
            {data?.totalReports || 0}
          </p>
          <p className="text-[10px] text-neutral-300">
            {t("dash.structuredDocs", locale)}
          </p>
        </div>

        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-neutral-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("dash.durationProcessed", locale)}
            </span>
          </div>
          <p className="mt-3 text-[32px] font-light text-black">
            {formatDuration(data?.totalDuration || 0)}
          </p>
          <p className="text-[10px] text-neutral-300">
            {t("dash.audioTranscribed", locale)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
            <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              {t("dash.latestSessions", locale)}
            </h3>
            <Link
              href="/sessions"
              className="flex items-center gap-1 text-[10px] font-medium text-neutral-400 transition-colors hover:text-black"
            >
              {t("dash.viewAll", locale)} <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-neutral-50">
            {(!data?.recentSessions || data.recentSessions.length === 0) && (
              <div className="px-5 py-8 text-center text-[11px] text-neutral-400">
                {t("dash.noSessions", locale)}
                <br />
                <Link href="/sessions/new" className="mt-1 inline-block font-medium text-black underline underline-offset-2">
                  {t("dash.createFirst", locale)}
                </Link>
              </div>
            )}
            {data?.recentSessions?.map((s: any) => (
              <Link
                key={s.id}
                href={`/sessions/${s.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-1.5 w-1.5 flex-shrink-0 ${
                    s.status === "completed" ? "bg-emerald-500" :
                    s.status === "error" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-black">
                      {s.title}
                    </p>
                    <p className="text-[10px] text-neutral-400">{s.clientName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="bg-neutral-100 px-2 py-0.5 text-[9px] font-bold text-neutral-500 uppercase">
                    {t(`status.${s.status}`, locale) || s.status}
                  </span>
                  <span className="text-[10px] text-neutral-300">
                    {formatDateLocale(s.createdAt, locale)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
            <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              {t("dash.latestReports", locale)}
            </h3>
            <Link
              href="/reports"
              className="flex items-center gap-1 text-[10px] font-medium text-neutral-400 transition-colors hover:text-black"
            >
              {t("dash.viewAll", locale)} <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-neutral-50">
            {(!data?.recentReports || data.recentReports.length === 0) && (
              <div className="px-5 py-8 text-center text-[11px] text-neutral-400">
                {t("dash.noReports", locale)}
                <br />
                {t("dash.reportsFromSessions", locale)}
              </div>
            )}
            {data?.recentReports?.map((r: any) => (
              <Link
                key={r.id}
                href={`/reports/${r.id}`}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-black">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {r.session?.clientName}
                    {r.session?.caseReference && ` — ${t("dash.ref", locale)} ${r.session.caseReference}`}
                  </p>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 text-[9px] font-bold uppercase ${
                  r.status === "final" ? "bg-emerald-50 text-emerald-600" :
                  r.status === "archived" ? "bg-neutral-100 text-neutral-500" :
                  "bg-amber-50 text-amber-600"
                }`}>
                  {r.status === "final" ? t("dash.finalized", locale) : r.status === "archived" ? t("dash.archived", locale) : t("dash.draft", locale)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
