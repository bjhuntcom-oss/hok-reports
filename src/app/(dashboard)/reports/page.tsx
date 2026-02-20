"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function ReportsPage() {
  const { locale } = useAppStore();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/reports?${params}`)
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {t("report.documents", locale)}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">{t("report.listTitle", locale)}</h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          {t("report.listSubtitle", locale)}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={t("report.searchPlaceholder", locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-[12px] outline-none transition-colors focus:border-black"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-neutral-200 bg-white px-3 py-2.5 text-[11px] font-medium outline-none focus:border-black"
        >
          <option value="">{t("report.allCategories", locale)}</option>
          <option value="consultation">{t("cat.consultation", locale)}</option>
          <option value="hearing">{t("cat.hearing", locale)}</option>
          <option value="deposition">{t("cat.deposition", locale)}</option>
          <option value="meeting">{t("cat.meeting", locale)}</option>
          <option value="general">{t("cat.general", locale)}</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-neutral-200 bg-white px-3 py-2.5 text-[11px] font-medium outline-none focus:border-black"
        >
          <option value="">{t("report.allStatuses", locale)}</option>
          <option value="draft">{t("report.draft", locale)}</option>
          <option value="final">{t("report.final", locale)}</option>
          <option value="archived">{t("report.archived", locale)}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-neutral-300 py-16">
          <FileText size={28} className="text-neutral-300" />
          <p className="mt-4 text-[13px] font-medium text-neutral-500">
            {t("report.noResults", locale)}
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
            {t("report.noResultsHint", locale)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((r: any) => (
            <Link
              key={r.id}
              href={`/reports/${r.id}`}
              className="group border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center bg-neutral-100 text-neutral-400 transition-colors group-hover:bg-black group-hover:text-white">
                  <FileText size={14} />
                </div>
                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
                  r.status === "final" ? "bg-emerald-50 text-emerald-600" :
                  r.status === "archived" ? "bg-neutral-100 text-neutral-500" :
                  "bg-amber-50 text-amber-600"
                }`}>
                  {r.status === "draft" ? t("report.draft", locale) : r.status === "final" ? t("report.final", locale) : t("report.archived", locale)}
                </span>
              </div>

              <h3 className="mt-3 text-[13px] font-semibold text-black line-clamp-2">
                {r.title}
              </h3>

              <p className="mt-2 text-[11px] leading-relaxed text-neutral-400 line-clamp-2">
                {r.summary?.substring(0, 120)}...
              </p>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3">
                <div className="flex items-center gap-1.5">
                  <span className="bg-neutral-100 px-2 py-0.5 text-[9px] font-medium text-neutral-500">
                    {t(`cat.${r.category}`, locale) || r.category}
                  </span>
                  <span className="bg-neutral-100 px-2 py-0.5 text-[9px] font-medium text-neutral-500">
                    {t(`fmt.${r.format}`, locale) || r.format}
                  </span>
                </div>
                <span className="text-[9px] text-neutral-400">
                  {new Date(r.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}
                </span>
              </div>

              {r.session && (
                <div className="mt-2 text-[10px] text-neutral-400">
                  {r.session.clientName}
                  {r.session.caseReference && ` — ${t("dash.ref", locale)} ${r.session.caseReference}`}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
