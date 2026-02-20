"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Gavel,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  CalendarDays,
  Loader2,
  Send,
  Plus,
  MapPin,
  User,
  MessageCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

interface HearingReport {
  id: string;
  hearingDate: string;
  jurisdiction: string;
  chamber: string | null;
  caseReference: string;
  clientName: string;
  opponent: string | null;
  lawyerName: string | null;
  outcome: string;
  nextHearingDate: string | null;
  tasks: string | null;
  notes: string | null;
  status: string;
  source: string;
  whatsappSender: string | null;
  createdAt: string;
  user?: { name: string; email: string };
}

const emptyForm = {
  hearingDate: new Date().toISOString().split("T")[0],
  jurisdiction: "",
  chamber: "",
  caseReference: "",
  clientName: "",
  opponent: "",
  lawyerName: "",
  outcome: "",
  nextHearingDate: "",
  tasks: [] as string[],
  notes: "",
};

function formatDate(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateShort(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getWeekBounds(date: Date): { weekStart: Date; weekEnd: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

function formatWeekLabel(weekStart: Date, weekEnd: Date, locale: string): string {
  const loc = locale === "en" ? "en-GB" : "fr-FR";
  const s = weekStart.toLocaleDateString(loc, { day: "numeric", month: "long" });
  const e = weekEnd.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" });
  return locale === "en" ? `${s} to ${e}` : `${s} au ${e}`;
}

export default function RolesPage() {
  const { locale } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [allReports, setAllReports] = useState<HearingReport[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/hearing-reports?limit=500");
      const data = await res.json();
      setAllReports(data.reports || []);
    } catch (error) {
      console.error("Fetch reports error:", error);
    }
  }, []);

  useEffect(() => {
    fetchReports().finally(() => setLoading(false));
  }, [fetchReports]);

  // Compute the current week bounds based on offset
  const now = new Date();
  const offsetDate = new Date(now);
  offsetDate.setDate(offsetDate.getDate() + weekOffset * 7);
  const { weekStart, weekEnd } = getWeekBounds(offsetDate);

  // Auto-compute weekly role: filter reports whose nextHearingDate falls within the selected week
  const weekEntries = allReports.filter((r) => {
    if (!r.nextHearingDate) return false;
    const d = new Date(r.nextHearingDate);
    return d >= weekStart && d <= weekEnd;
  }).sort((a, b) => {
    const da = new Date(a.nextHearingDate!).getTime();
    const db = new Date(b.nextHearingDate!).getTime();
    return da - db;
  });

  // Filter reports for the feed (search)
  const filteredReports = allReports.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.clientName.toLowerCase().includes(s) ||
      r.caseReference.toLowerCase().includes(s) ||
      r.jurisdiction.toLowerCase().includes(s) ||
      (r.opponent || "").toLowerCase().includes(s) ||
      (r.lawyerName || "").toLowerCase().includes(s)
    );
  });

  // Stats
  const upcoming = allReports.filter((r) => r.nextHearingDate && new Date(r.nextHearingDate) >= now).length;

  const handleSaveReport = async () => {
    if (!form.hearingDate || !form.jurisdiction || !form.caseReference || !form.clientName || !form.outcome) {
      showToast(locale === "en" ? "Please fill in all required fields" : "Veuillez remplir tous les champs obligatoires", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/hearing-reports/${editingId}` : "/api/hearing-reports";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(t("role.saved", locale), "success");
        setShowForm(false);
        setEditingId(null);
        setForm({ ...emptyForm });
        fetchReports();
      } else {
        const err = await res.json();
        showToast(err.error || "Erreur", "error");
      }
    } catch {
      showToast("Erreur serveur", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    try {
      const res = await fetch(`/api/hearing-reports/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAllReports((prev) => prev.filter((r) => r.id !== id));
        setConfirmDelete(null);
      }
    } catch {}
  };

  const handleEditReport = (report: HearingReport) => {
    setForm({
      hearingDate: report.hearingDate.split("T")[0],
      jurisdiction: report.jurisdiction,
      chamber: report.chamber || "",
      caseReference: report.caseReference,
      clientName: report.clientName,
      opponent: report.opponent || "",
      lawyerName: report.lawyerName || "",
      outcome: report.outcome,
      nextHearingDate: report.nextHearingDate ? report.nextHearingDate.split("T")[0] : "",
      tasks: report.tasks ? JSON.parse(report.tasks) : [],
      notes: report.notes || "",
    });
    setEditingId(report.id);
    setShowForm(true);
  };

  const addTask = () => {
    if (newTask.trim()) {
      setForm((prev) => ({ ...prev, tasks: [...prev.tasks, newTask.trim()] }));
      setNewTask("");
    }
  };

  const removeTask = (index: number) => {
    setForm((prev) => ({ ...prev, tasks: prev.tasks.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 text-[12px] font-medium shadow-lg ${toast.type === "success" ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-red-200 bg-red-50 text-red-700"}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
            {t("role.workspace", locale)}
          </p>
          <h1 className="mt-1 text-[22px] font-semibold text-black">{t("role.title", locale)}</h1>
          <p className="mt-1 text-[13px] text-neutral-400">{t("role.subtitle", locale)}</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ ...emptyForm }); }}
          className="flex items-center gap-2 bg-black px-4 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? (locale === "en" ? "Close" : "Fermer") : t("role.newReport", locale)}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-neutral-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("role.totalReports", locale)}
            </span>
          </div>
          <p className="mt-3 text-[32px] font-light text-black">{allReports.length}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-neutral-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {t("role.totalUpcoming", locale)}
            </span>
          </div>
          <p className="mt-3 text-[32px] font-light text-black">{upcoming}</p>
        </div>
        <div className="border border-neutral-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Gavel size={14} className="text-neutral-400" />
            <span className="text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
              {locale === "en" ? "This week" : "Cette semaine"}
            </span>
          </div>
          <p className="mt-3 text-[32px] font-light text-black">
            {allReports.filter((r) => {
              if (!r.nextHearingDate) return false;
              const thisWeek = getWeekBounds(new Date());
              const d = new Date(r.nextHearingDate);
              return d >= thisWeek.weekStart && d <= thisWeek.weekEnd;
            }).length}
          </p>
        </div>
      </div>

      {/* ============ RÔLE HEBDOMADAIRE (auto-computed) ============ */}
      <div className="border border-neutral-200 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3">
          <div className="flex items-center gap-3">
            <Gavel size={16} className="text-neutral-400" />
            <div>
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {locale === "en" ? "Weekly hearing role" : "Rôle d'audience hebdomadaire"}
              </h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {locale === "en" ? "Week of " : "Semaine du "}{formatWeekLabel(weekStart, weekEnd, locale)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekOffset((o) => o - 1)}
              className="p-1.5 border border-neutral-200 text-neutral-400 hover:text-black hover:border-black transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setWeekOffset(0)}
              className={`px-3 py-1 text-[10px] font-semibold uppercase transition-colors ${weekOffset === 0 ? "bg-black text-white" : "border border-neutral-200 text-neutral-500 hover:border-black hover:text-black"}`}>
              {locale === "en" ? "Today" : "Aujourd'hui"}
            </button>
            <button onClick={() => setWeekOffset((o) => o + 1)}
              className="p-1.5 border border-neutral-200 text-neutral-400 hover:text-black hover:border-black transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {weekEntries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Calendar size={24} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-[12px] text-neutral-400">
              {locale === "en" ? "No hearings scheduled for this week." : "Aucune audience prévue cette semaine."}
            </p>
            <p className="mt-1 text-[10px] text-neutral-300">
              {locale === "en"
                ? "Hearings appear here automatically when a report mentions a next hearing date within this week."
                : "Les audiences apparaissent ici automatiquement lorsqu'un compte rendu mentionne une prochaine audience dans cette semaine."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2.5 text-left font-semibold tracking-wide text-neutral-500 uppercase">
                    {locale === "en" ? "Date" : "Date"}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold tracking-wide text-neutral-500 uppercase">
                    {locale === "en" ? "Case" : "Dossier"}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold tracking-wide text-neutral-500 uppercase">
                    {locale === "en" ? "Court" : "Juridiction"}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold tracking-wide text-neutral-500 uppercase">
                    {locale === "en" ? "Lawyer" : "Avocat"}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold tracking-wide text-neutral-500 uppercase">
                    {locale === "en" ? "Previous outcome" : "Dernier compte rendu"}
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold tracking-wide text-neutral-500 uppercase">
                    {locale === "en" ? "Tasks to do" : "Tâches à effectuer"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {weekEntries.map((entry) => {
                  const tasks = entry.tasks ? JSON.parse(entry.tasks) : [];
                  return (
                    <tr key={entry.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-black">
                        {formatDateShort(entry.nextHearingDate!, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-black">{entry.clientName}</p>
                        <p className="text-[10px] text-neutral-400">
                          {entry.opponent ? `c/ ${entry.opponent} · ` : ""}{entry.caseReference}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {entry.jurisdiction}{entry.chamber ? ` · ${entry.chamber}` : ""}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{entry.lawyerName || "—"}</td>
                      <td className="px-4 py-3 text-neutral-500 max-w-[200px]">
                        <p className="truncate">{entry.outcome}</p>
                      </td>
                      <td className="px-4 py-3">
                        {tasks.length > 0 ? (
                          <ul className="space-y-0.5">
                            {tasks.map((task: string, j: number) => (
                              <li key={j} className="flex items-start gap-1.5 text-neutral-600">
                                <span className="mt-1.5 h-1 w-1 flex-shrink-0 bg-amber-400" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-neutral-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ QUICK INPUT (WhatsApp-style) ============ */}
      {showForm && (
        <div className="border-2 border-black bg-white">
          <div className="flex items-center gap-2 border-b border-neutral-100 bg-black px-5 py-2.5">
            <Send size={13} className="text-white" />
            <h3 className="text-[11px] font-bold tracking-[0.15em] text-white uppercase">
              {editingId
                ? (locale === "en" ? "Edit hearing report" : "Modifier le compte rendu")
                : (locale === "en" ? "New hearing report" : "Nouveau compte rendu d'audience")}
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Row 1: Essential info */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Hearing date" : "Date d'audience"} *
                </label>
                <input type="date" value={form.hearingDate}
                  onChange={(e) => setForm({ ...form, hearingDate: e.target.value })}
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  Client *
                </label>
                <input type="text" value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Nom du client"
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Case ref." : "Réf. dossier"} *
                </label>
                <input type="text" value={form.caseReference}
                  onChange={(e) => setForm({ ...form, caseReference: e.target.value })}
                  placeholder="RG 2026/..."
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Court" : "Juridiction"} *
                </label>
                <input type="text" value={form.jurisdiction}
                  onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                  placeholder="TPI Cotonou"
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
            </div>

            {/* Row 2: Secondary info */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Chamber" : "Chambre"}
                </label>
                <input type="text" value={form.chamber}
                  onChange={(e) => setForm({ ...form, chamber: e.target.value })}
                  placeholder="1ère Ch. civile"
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Opponent" : "Partie adverse"}
                </label>
                <input type="text" value={form.opponent}
                  onChange={(e) => setForm({ ...form, opponent: e.target.value })}
                  placeholder="Nom adverse"
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Lawyer" : "Avocat en charge"}
                </label>
                <input type="text" value={form.lawyerName}
                  onChange={(e) => setForm({ ...form, lawyerName: e.target.value })}
                  placeholder="Me ..."
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Next hearing" : "Prochaine audience"}
                </label>
                <input type="date" value={form.nextHearingDate}
                  onChange={(e) => setForm({ ...form, nextHearingDate: e.target.value })}
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
            </div>

            {/* Row 3: Report content */}
            <div>
              <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                {locale === "en" ? "Hearing report" : "Compte rendu de l'audience"} *
              </label>
              <textarea value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                placeholder={locale === "en" ? "What happened at the hearing..." : "Résumé de ce qui s'est passé à l'audience..."}
                rows={3}
                className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white resize-none" />
            </div>

            {/* Row 4: Tasks + Notes */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Tasks to do" : "Tâches à effectuer"}
                </label>
                {form.tasks.length > 0 && (
                  <div className="mb-2 space-y-1">
                    {form.tasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 text-[11px]">
                        <span className="flex-1">{task}</span>
                        <button onClick={() => removeTask(i)} className="text-neutral-300 hover:text-red-500">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTask(); } }}
                    placeholder={locale === "en" ? "Add a task..." : "Ajouter une tâche..."}
                    className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
                  <button onClick={addTask} disabled={!newTask.trim()}
                    className="border border-neutral-200 px-3 py-2 text-[9px] font-semibold text-neutral-600 uppercase hover:border-black hover:text-black disabled:opacity-40">
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  Notes
                </label>
                <textarea value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={locale === "en" ? "Additional notes..." : "Notes complémentaires..."}
                  rows={3}
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white resize-none" />
              </div>
            </div>

            {/* Send */}
            <div className="flex justify-end">
              <button onClick={handleSaveReport} disabled={saving}
                className="flex items-center gap-2 bg-black px-6 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {saving
                  ? (locale === "en" ? "Sending..." : "Envoi...")
                  : editingId
                    ? (locale === "en" ? "Update" : "Modifier")
                    : (locale === "en" ? "Send report" : "Envoyer le compte rendu")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ FEED: COMPTES RENDUS ============ */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            {locale === "en" ? "Hearing reports" : "Comptes rendus d'audience"} ({filteredReports.length})
          </h2>
          <div className="flex-1" />
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === "en" ? "Search..." : "Rechercher..."}
              className="border border-neutral-200 bg-white py-2 pl-8 pr-3 text-[11px] outline-none transition-colors focus:border-black w-56"
            />
          </div>
        </div>

        {filteredReports.length === 0 ? (
          <div className="border border-neutral-200 bg-white px-5 py-12 text-center">
            <Gavel size={24} className="mx-auto mb-3 text-neutral-200" />
            <p className="text-[12px] text-neutral-400">
              {locale === "en" ? "No hearing reports yet." : "Aucun compte rendu d'audience."}
            </p>
            <p className="mt-1 text-[10px] text-neutral-300">
              {locale === "en"
                ? "Post your first hearing report to get started."
                : "Publiez votre premier compte rendu pour commencer."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => {
              const tasks = report.tasks ? JSON.parse(report.tasks) : [];
              const isExpanded = expandedReport === report.id;
              const hasUpcoming = report.nextHearingDate && new Date(report.nextHearingDate) >= now;
              return (
                <div key={report.id} className={`border bg-white transition-colors ${hasUpcoming ? "border-l-4 border-l-amber-400 border-neutral-200" : "border-neutral-200"}`}>
                  {/* Header */}
                  <div
                    className="flex items-start justify-between px-4 py-3 cursor-pointer hover:bg-neutral-50 transition-colors"
                    onClick={() => setExpandedReport(isExpanded ? null : report.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[12px] font-semibold text-black">
                          {report.clientName} c/ {report.opponent || "—"}
                        </p>
                        <span className="text-[9px] font-mono bg-neutral-100 px-1.5 py-0.5 text-neutral-500">
                          {report.caseReference}
                        </span>
                        {report.source === "whatsapp" && (
                          <span className="flex items-center gap-1 bg-green-50 border border-green-200 px-1.5 py-0.5 text-[8px] font-bold text-green-600">
                            <MessageCircle size={8} /> WhatsApp
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-neutral-400">
                        <span className="flex items-center gap-1">
                          <MapPin size={9} />
                          {report.jurisdiction}{report.chamber ? ` · ${report.chamber}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={9} />
                          {formatDate(report.hearingDate, locale)}
                        </span>
                        {report.lawyerName && (
                          <span className="flex items-center gap-1">
                            <User size={9} />
                            {report.lawyerName}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-[12px] text-neutral-600 leading-relaxed line-clamp-2">{report.outcome}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3 flex-shrink-0">
                      {report.nextHearingDate && (
                        <span className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                          <Clock size={9} />
                          {formatDateShort(report.nextHearingDate, locale)}
                        </span>
                      )}
                      {tasks.length > 0 && (
                        <span className="bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-semibold text-blue-600">
                          {tasks.length} {locale === "en" ? "task" : "tâche"}{tasks.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3 space-y-3">
                      <div>
                        <p className="text-[9px] font-semibold tracking-wide text-neutral-400 uppercase">
                          {locale === "en" ? "Full report" : "Compte rendu complet"}
                        </p>
                        <p className="mt-1 text-[12px] text-neutral-700 whitespace-pre-wrap leading-relaxed">{report.outcome}</p>
                      </div>
                      {tasks.length > 0 && (
                        <div>
                          <p className="text-[9px] font-semibold tracking-wide text-neutral-400 uppercase">
                            {locale === "en" ? "Tasks" : "Tâches à effectuer"}
                          </p>
                          <ul className="mt-1 space-y-1">
                            {tasks.map((task: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-600">
                                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 bg-amber-400 rounded-full" />
                                {task}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {report.notes && (
                        <div>
                          <p className="text-[9px] font-semibold tracking-wide text-neutral-400 uppercase">Notes</p>
                          <p className="mt-0.5 text-[11px] text-neutral-500 italic">{report.notes}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1 border-t border-neutral-200">
                        <button onClick={() => handleEditReport(report)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-neutral-500 hover:text-black hover:bg-white border border-transparent hover:border-neutral-200 transition-colors">
                          <Edit3 size={11} />
                          {locale === "en" ? "Edit" : "Modifier"}
                        </button>
                        {confirmDelete === report.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleDeleteReport(report.id)}
                              className="bg-red-500 px-2.5 py-1 text-[10px] font-semibold text-white">
                              {locale === "en" ? "Confirm" : "Confirmer"}
                            </button>
                            <button onClick={() => setConfirmDelete(null)}
                              className="border border-neutral-200 px-2.5 py-1 text-[10px] font-medium text-neutral-500">
                              {locale === "en" ? "Cancel" : "Annuler"}
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(report.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-neutral-400 hover:text-red-500 transition-colors">
                            <Trash2 size={11} />
                            {locale === "en" ? "Delete" : "Supprimer"}
                          </button>
                        )}
                        <span className="flex-1" />
                        <span className="text-[9px] text-neutral-300">
                          {report.user?.name || ""}
                          {report.createdAt ? ` · ${formatDate(report.createdAt, locale)}` : ""}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
