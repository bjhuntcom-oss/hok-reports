"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Mic } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

const statusStyles: Record<string, string> = {
  recording: "bg-red-50 text-red-600",
  transcribing: "bg-amber-50 text-amber-600",
  summarizing: "bg-blue-50 text-blue-600",
  completed: "bg-emerald-50 text-emerald-600",
  error: "bg-red-50 text-red-600",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SessionsPage() {
  const { locale } = useAppStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fmtDate = (d: string) => new Date(d).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/sessions?${params}`)
      .then((res) => res.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
            {t("session.recordings", locale)}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold text-black">{t("session.listTitle", locale)}</h1>
          <p className="mt-1 text-[13px] text-neutral-400">
            {t("session.listSubtitle", locale)}
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

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={t("session.searchPlaceholder", locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-[12px] outline-none transition-colors focus:border-black"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-neutral-200 bg-white px-3 py-2.5 text-[11px] font-medium outline-none focus:border-black"
        >
          <option value="">{t("session.allStatuses", locale)}</option>
          <option value="recording">{t("status.recording", locale)}</option>
          <option value="transcribing">{t("status.transcribing", locale)}</option>
          <option value="completed">{t("status.completed", locale)}</option>
          <option value="error">{t("status.error", locale)}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-neutral-300 py-16">
          <Mic size={28} className="text-neutral-300" />
          <p className="mt-4 text-[13px] font-medium text-neutral-500">
            {t("session.noResults", locale)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {t("session.noResultsHint", locale)}
          </p>
          <Link
            href="/sessions/new"
            className="mt-4 bg-black px-4 py-2 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800"
          >
            {t("session.createSession", locale)}
          </Link>
        </div>
      ) : (
        <div className="border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-100">
                  {[t("session.tableSession", locale), t("session.tableClient", locale), t("session.tableCaseRef", locale), t("session.tableDuration", locale), t("session.tableStatus", locale), t("session.tableDate", locale)].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {sessions.map((s: any) => (
                  <tr key={s.id} className="transition-colors hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/sessions/${s.id}`}
                        className="text-[12px] font-medium text-black hover:underline underline-offset-2"
                      >
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-500">
                      {s.clientName}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-400">
                      {s.caseReference || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-neutral-500">
                      {formatDuration(s.audioDuration)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase ${
                        statusStyles[s.status] || "bg-neutral-100 text-neutral-500"
                      }`}>
                        {t(`status.${s.status}`, locale) || s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-neutral-400">
                      {fmtDate(s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
