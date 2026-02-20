"use client";

import { useEffect, useState } from "react";
import {
  Shield, Users, FileText, Mic, Clock, ChevronDown,
  Ban, Trash2, Edit3, Check, X, BarChart3, Activity, AlertTriangle, ScrollText,
  UserCheck, UserX, Key, Eye, EyeOff, Zap, Loader2, CircleCheck, CircleX
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

type Tab = "overview" | "pending" | "users" | "reports" | "activity" | "audit" | "llm";

export default function AdminPage() {
  const { locale } = useAppStore();
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [allReports, setAllReports] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilter, setAuditFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState<any>({});
  const [llmSaving, setLlmSaving] = useState(false);
  const [whisperKey, setWhisperKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showWhisperKey, setShowWhisperKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; warning?: boolean; message: string } | null>(null);
  const [confirmDeleteLlmKey, setConfirmDeleteLlmKey] = useState<string | null>(null);

  const loadData = () => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/admin/reports").then((r) => r.json()),
      fetch("/api/admin/activity").then((r) => r.json()),
      fetch(`/api/admin/audit?limit=50&page=1`).then((r) => r.json()),
      fetch("/api/admin/llm").then((r) => r.json()),
    ])
      .then(([usersData, statsData, reportsData, activityData, auditData, llmData]) => {
        setUsers(Array.isArray(usersData) ? usersData : []);
        setStats(statsData);
        setAllReports(Array.isArray(reportsData) ? reportsData : []);
        setLoginHistory(Array.isArray(activityData) ? activityData : []);
        setAuditLogs(auditData?.logs || []);
        setAuditTotal(auditData?.total || 0);
        setLlmConfig(llmData || {});
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) setUsers((p) => p.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  const handleBlock = async (userId: string, blocked: boolean) => {
    const res = await fetch("/api/admin/users/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, blocked }),
    });
    if (res.ok) setUsers((p) => p.map((u) => (u.id === userId ? { ...u, blocked } : u)));
  };

  const handleDelete = async (userId: string) => {
    const res = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setUsers((p) => p.filter((u) => u.id !== userId));
      setConfirmDelete(null);
    }
  };

  const handleEditSave = async (userId: string) => {
    const res = await fetch("/api/admin/users/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name: editName, email: editEmail }),
    });
    if (res.ok) {
      setUsers((p) => p.map((u) => (u.id === userId ? { ...u, name: editName, email: editEmail } : u)));
      setEditingUser(null);
    }
  };

  const handleApprove = async (userId: string, status: "active" | "rejected") => {
    const res = await fetch("/api/admin/users/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status }),
    });
    if (res.ok) setUsers((p) => p.map((u) => (u.id === userId ? { ...u, status } : u)));
  };

  const handleSaveLlmKey = async (key: string, value: string) => {
    setLlmSaving(true);
    try {
      const res = await fetch("/api/admin/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) {
        const updated = await fetch("/api/admin/llm").then((r) => r.json());
        setLlmConfig(updated);
        if (key === "whisper_api_key") setWhisperKey("");
        if (key === "openai_api_key") setOpenaiKey("");
        if (key === "anthropic_api_key") setAnthropicKey("");
      }
    } catch {}
    setLlmSaving(false);
  };

  const handleDeleteLlmKey = async (key: string) => {
    setLlmSaving(true);
    setConfirmDeleteLlmKey(null);
    try {
      const res = await fetch("/api/admin/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: "" }),
      });
      if (res.ok) {
        const updated = await fetch("/api/admin/llm").then((r) => r.json());
        setLlmConfig(updated);
        setTestResult(null);
      }
    } catch {}
    setLlmSaving(false);
  };

  const handleTestKey = async (provider: "openai" | "anthropic" | "whisper") => {
    setTestingProvider(provider);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      let message = t("admin.testFailed", locale);
      if (data.success && data.warning) {
        message = t("admin.testWarning", locale);
      } else if (data.success) {
        message = t("admin.testSuccess", locale);
      } else if (data.error) {
        message = data.error;
      }
      setTestResult({
        provider,
        success: data.success,
        warning: data.warning || false,
        message,
      });
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        message: err?.message || t("admin.testFailed", locale),
      });
    }
    setTestingProvider(null);
  };

  const startEdit = (user: any) => {
    setEditingUser(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
      </div>
    );
  }

  const pendingUsers = users.filter((u) => u.status === "pending");

  const tabs: { id: Tab; label: string; icon: any; badge?: number }[] = [
    { id: "overview", label: t("admin.overview", locale), icon: BarChart3 },
    { id: "pending", label: t("admin.requests", locale), icon: UserCheck, badge: pendingUsers.length },
    { id: "users", label: t("admin.users", locale), icon: Users },
    { id: "reports", label: t("admin.reports", locale), icon: FileText },
    { id: "activity", label: t("admin.activity", locale), icon: Activity },
    { id: "audit", label: t("admin.auditLog", locale), icon: ScrollText },
    { id: "llm", label: t("admin.llmEngine", locale), icon: Key },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {t("admin.reserved", locale)}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">
          {t("admin.title", locale)}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          {t("admin.subtitle", locale)}
        </p>
      </div>

      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase transition-colors ${
              tab === t.id
                ? "border-black text-black"
                : "border-transparent text-neutral-400 hover:text-black"
            }`}
          >
            <t.icon size={13} />
            {t.label}
            {t.badge ? (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center bg-red-500 px-1 text-[8px] font-bold text-white">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: t("admin.usersCount", locale), value: stats?.totalUsers || users.length, sub: `${users.filter((u) => u.role === "admin").length} admin` },
              { label: t("admin.sessionsCount", locale), value: stats?.totalSessions || 0, sub: t("admin.recordings", locale) },
              { label: t("admin.reportsCount", locale), value: stats?.totalReports || 0, sub: t("admin.generatedDocs", locale) },
              { label: t("admin.durationProcessed", locale), value: `${Math.round((stats?.totalDuration || 0) / 3600)}h`, sub: t("admin.audioTranscribed", locale) },
            ].map((s) => (
              <div key={s.label} className="border border-neutral-200 bg-white p-5">
                <p className="text-[28px] font-light text-black">{s.value}</p>
                <p className="mt-1 text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
                  {s.label}
                </p>
                <p className="text-[10px] text-neutral-300">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-5 py-3">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                  {t("admin.recentUsers", locale)}
                </h3>
              </div>
              <div className="divide-y divide-neutral-50">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center bg-neutral-100 text-[10px] font-bold text-neutral-500">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-black">{u.name}</p>
                        <p className="text-[10px] text-neutral-400">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.blocked && (
                        <span className="bg-red-50 px-2 py-0.5 text-[9px] font-bold text-red-500 uppercase">{t("admin.statusBlocked", locale)}</span>
                      )}
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
                        u.role === "admin" ? "bg-black text-white" : "bg-neutral-100 text-neutral-500"
                      }`}>
                        {u.role === "admin" ? "Admin" : "User"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-5 py-3">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                  {t("admin.latestReports", locale)}
                </h3>
              </div>
              <div className="divide-y divide-neutral-50">
                {allReports.slice(0, 5).map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/reports/${r.id}`}
                    className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-neutral-50"
                  >
                    <div>
                      <p className="text-[12px] font-medium text-black">{r.title}</p>
                      <p className="text-[10px] text-neutral-400">
                        {r.user?.name} — {new Date(r.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}
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
                {allReports.length === 0 && (
                  <p className="px-5 py-4 text-[11px] text-neutral-400">{t("admin.noReports", locale)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "pending" && (
        <div className="space-y-4">
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-5 py-3">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {t("admin.pendingRequests", locale)} ({pendingUsers.length})
              </h3>
            </div>
            {pendingUsers.length > 0 ? (
              <div className="divide-y divide-neutral-50">
                {pendingUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center bg-amber-50 text-[12px] font-bold text-amber-600">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-black">{u.name}</p>
                        <p className="text-[11px] text-neutral-400">{u.email}</p>
                        <p className="text-[9px] text-neutral-300">
                          {t("admin.registrationCol", locale)}: {new Date(u.createdAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(u.id, "active")}
                        className="flex items-center gap-1.5 bg-emerald-600 px-4 py-2 text-[10px] font-semibold text-white uppercase transition-colors hover:bg-emerald-700"
                      >
                        <UserCheck size={13} /> {t("admin.approve", locale)}
                      </button>
                      <button
                        onClick={() => handleApprove(u.id, "rejected")}
                        className="flex items-center gap-1.5 border border-red-200 px-4 py-2 text-[10px] font-semibold text-red-600 uppercase transition-colors hover:bg-red-50"
                      >
                        <UserX size={13} /> {t("admin.reject", locale)}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-12 text-center">
                <UserCheck size={28} className="mx-auto text-neutral-200" />
                <p className="mt-3 text-[12px] text-neutral-400">
                  {t("admin.noPending", locale)}
                </p>
                <p className="mt-1 text-[10px] text-neutral-300">
                  {t("admin.pendingHint", locale)}
                </p>
              </div>
            )}
          </div>

          {users.filter((u) => u.status === "rejected").length > 0 && (
            <div className="border border-neutral-200 bg-white">
              <div className="border-b border-neutral-100 px-5 py-3">
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                  {t("admin.rejectedUsers", locale)} ({users.filter((u) => u.status === "rejected").length})
                </h3>
              </div>
              <div className="divide-y divide-neutral-50">
                {users.filter((u) => u.status === "rejected").map((u) => (
                  <div key={u.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center bg-red-50 text-[10px] font-bold text-red-400">
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[12px] font-medium text-neutral-500">{u.name}</p>
                        <p className="text-[10px] text-neutral-400">{u.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApprove(u.id, "active")}
                      className="border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      {t("admin.reactivate", locale)}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-5 py-3 flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              {t("admin.userManagement", locale)} ({users.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-neutral-100">
                  {[t("admin.userCol", locale), t("admin.emailCol", locale), t("admin.roleCol", locale), t("admin.statusCol", locale), t("admin.sessionsCol", locale), t("admin.reportsCol", locale), t("admin.registrationCol", locale), t("admin.actionsCol", locale)].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      {editingUser === user.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[12px] outline-none focus:border-black"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center bg-neutral-100 text-[9px] font-bold text-neutral-500">
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-[12px] font-medium text-black">{user.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingUser === user.id ? (
                        <input
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[12px] outline-none focus:border-black"
                        />
                      ) : (
                        <span className="text-[11px] text-neutral-500">{user.email}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="border border-neutral-200 bg-white px-2 py-1 text-[10px] font-semibold outline-none focus:border-black"
                      >
                        <option value="user">{t("admin.roleUser", locale)}</option>
                        <option value="admin">{t("admin.roleAdmin", locale)}</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase ${
                        user.blocked
                          ? "bg-red-50 text-red-500"
                          : user.status === "pending"
                          ? "bg-amber-50 text-amber-600"
                          : user.status === "rejected"
                          ? "bg-red-50 text-red-400"
                          : "bg-emerald-50 text-emerald-600"
                      }`}>
                        {user.blocked ? t("admin.statusBlocked", locale) : user.status === "pending" ? t("admin.statusPending", locale) : user.status === "rejected" ? t("admin.statusRejected", locale) : t("admin.statusActive", locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-500 text-center">
                      {user._count?.sessions || 0}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-500 text-center">
                      {user._count?.reports || 0}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-neutral-400">
                      {new Date(user.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {editingUser === user.id ? (
                          <>
                            <button
                              onClick={() => handleEditSave(user.id)}
                              className="flex h-6 w-6 items-center justify-center text-emerald-600 transition-colors hover:bg-emerald-50"
                              title={t("common.save", locale)}
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditingUser(null)}
                              className="flex h-6 w-6 items-center justify-center text-neutral-400 transition-colors hover:bg-neutral-100"
                              title={t("common.cancel", locale)}
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(user)}
                              className="flex h-6 w-6 items-center justify-center text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-black"
                              title={t("admin.editUser", locale)}
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              onClick={() => handleBlock(user.id, !user.blocked)}
                              className={`flex h-6 w-6 items-center justify-center transition-colors hover:bg-neutral-100 ${
                                user.blocked ? "text-emerald-500" : "text-amber-500"
                              }`}
                              title={user.blocked ? t("admin.unblockUser", locale) : t("admin.blockUser", locale)}
                            >
                              <Ban size={12} />
                            </button>
                            {confirmDelete === user.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="flex h-6 items-center gap-1 bg-red-500 px-2 text-[9px] font-bold text-white uppercase"
                                >
                                  {t("common.confirm", locale)}
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="flex h-6 w-6 items-center justify-center text-neutral-400"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(user.id)}
                                className="flex h-6 w-6 items-center justify-center text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                title={t("admin.deleteUser", locale)}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "reports" && (
        <div className="border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-5 py-3">
            <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
              {t("admin.reports", locale)} ({allReports.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-100">
                  {[locale === "en" ? "Title" : "Titre", locale === "en" ? "Author" : "Auteur", locale === "en" ? "Client" : "Client", t("admin.statusCol", locale), t("report.tableCategory", locale), t("common.date", locale)].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {allReports.map((r: any) => (
                  <tr key={r.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/reports/${r.id}`} className="text-[12px] font-medium text-black hover:underline">
                        {r.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-500">
                      {r.user?.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-neutral-500">
                      {r.session?.clientName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
                        r.status === "final" ? "bg-emerald-50 text-emerald-600" :
                        r.status === "archived" ? "bg-neutral-100 text-neutral-500" :
                        "bg-amber-50 text-amber-600"
                      }`}>
                        {r.status === "final" ? t("report.final", locale) : r.status === "archived" ? t("report.archived", locale) : t("report.draft", locale)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-neutral-400 capitalize">
                      {t(`cat.${r.category}`, locale) || r.category}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-neutral-400">
                      {new Date(r.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR")}
                    </td>
                  </tr>
                ))}
                {allReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[11px] text-neutral-400">
                      {t("admin.noReports", locale)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-4">
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-5 py-3">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {locale === "en" ? "Login history" : "Historique des connexions"}
              </h3>
            </div>
            <div className="divide-y divide-neutral-50">
              {loginHistory.length > 0 ? loginHistory.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-1.5 w-1.5 ${entry.success ? "bg-emerald-500" : "bg-red-500"}`} />
                    <div>
                      <p className="text-[12px] font-medium text-black">{entry.user?.name || (locale === "en" ? "Unknown" : "Inconnu")}</p>
                      <p className="text-[10px] text-neutral-400">{entry.user?.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-400">
                      {new Date(entry.createdAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR")}
                    </p>
                    <p className="text-[9px] text-neutral-300">{entry.ipAddress || "—"}</p>
                  </div>
                </div>
              )) : (
                <p className="px-5 py-8 text-center text-[11px] text-neutral-400">
                  {locale === "en" ? "Login history will be available after the next authentications." : "L'historique des connexions sera disponible d\u00e8s les prochaines authentifications."}
                </p>
              )}
            </div>
          </div>

          <div className="border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-neutral-400" />
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {locale === "en" ? "Blocked accounts" : "Comptes bloqués"}
              </h3>
            </div>
            <div className="mt-3 space-y-2">
              {users.filter((u) => u.blocked).length > 0 ? (
                users.filter((u) => u.blocked).map((u) => (
                  <div key={u.id} className="flex items-center justify-between border border-red-100 bg-red-50 px-4 py-2">
                    <div>
                      <p className="text-[12px] font-medium text-red-700">{u.name}</p>
                      <p className="text-[10px] text-red-400">{u.email}</p>
                    </div>
                    <button
                      onClick={() => handleBlock(u.id, false)}
                      className="border border-red-200 bg-white px-3 py-1 text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                    >
                      {t("admin.unblockUser", locale)}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-neutral-400">{locale === "en" ? "No blocked accounts." : "Aucun compte bloqué actuellement."}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-4">
          <div className="border border-neutral-200 bg-white">
            <div className="border-b border-neutral-100 px-5 py-3 flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {t("admin.auditLog", locale)} ({auditTotal})
              </h3>
              <select
                value={auditFilter}
                onChange={(e) => {
                  setAuditFilter(e.target.value);
                  setAuditPage(1);
                  fetch(`/api/admin/audit?limit=50&page=1${e.target.value ? `&action=${e.target.value}` : ""}`)
                    .then((r) => r.json())
                    .then((data) => { setAuditLogs(data?.logs || []); setAuditTotal(data?.total || 0); });
                }}
                className="border border-neutral-200 bg-white px-3 py-1.5 text-[10px] font-semibold outline-none focus:border-black"
              >
                <option value="">{t("audit.allActions", locale)}</option>
                <option value="login">{t("audit.login", locale)}</option>
                <option value="register">{t("audit.register", locale)}</option>
                <option value="create_session">{t("audit.createSession", locale)}</option>
                <option value="upload_audio">{t("audit.uploadAudio", locale)}</option>
                <option value="transcribe">{t("audit.transcribe", locale)}</option>
                <option value="generate_report">{t("audit.generateReport", locale)}</option>
                <option value="export_pdf">{t("audit.exportPdf", locale)}</option>
                <option value="update_report">{locale === "en" ? "Update report" : "Modification rapport"}</option>
                <option value="delete_report">{locale === "en" ? "Delete report" : "Suppression rapport"}</option>
                <option value="update_session">{locale === "en" ? "Update session" : "Modification session"}</option>
                <option value="delete_session">{t("audit.deleteSession", locale)}</option>
                <option value="update_profile">{t("audit.updateProfile", locale)}</option>
                <option value="change_password">{t("audit.changePassword", locale)}</option>
                <option value="admin_block_user">{t("audit.adminBlock", locale)}</option>
                <option value="admin_unblock_user">{t("audit.adminUnblock", locale)}</option>
                <option value="admin_delete_user">{t("audit.adminDelete", locale)}</option>
                <option value="admin_edit_user">{t("audit.adminEdit", locale)}</option>
                <option value="admin_change_role">{t("audit.adminChangeRole", locale)}</option>
                <option value="admin_approve_user">{t("audit.adminApprove", locale)}</option>
                <option value="admin_reject_user">{t("audit.adminReject", locale)}</option>
                <option value="admin_update_llm">{t("audit.adminUpdateLlm", locale)}</option>
                <option value="flash_record">{t("audit.flashRecord", locale)}</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-neutral-100">
                    {[t("common.date", locale), t("admin.userCol", locale), locale === "en" ? "Action" : "Action", locale === "en" ? "Entity" : "Entité", locale === "en" ? "Details" : "Détails", "IP", "Agent"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold tracking-[0.15em] text-neutral-400 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {auditLogs.map((log: any) => {
                    const actionLabels: Record<string, { label: string; color: string }> = {
                      login: { label: t("audit.login", locale), color: "bg-blue-50 text-blue-600" },
                      register: { label: t("audit.register", locale), color: "bg-indigo-50 text-indigo-600" },
                      create_session: { label: t("audit.createSession", locale), color: "bg-emerald-50 text-emerald-600" },
                      upload_audio: { label: t("audit.uploadAudio", locale), color: "bg-cyan-50 text-cyan-600" },
                      transcribe: { label: t("audit.transcribe", locale), color: "bg-violet-50 text-violet-600" },
                      generate_report: { label: t("audit.generateReport", locale), color: "bg-amber-50 text-amber-600" },
                      export_pdf: { label: t("audit.exportPdf", locale), color: "bg-orange-50 text-orange-600" },
                      update_report: { label: locale === "en" ? "Update report" : "Modif. rapport", color: "bg-yellow-50 text-yellow-700" },
                      delete_report: { label: locale === "en" ? "Delete report" : "Suppr. rapport", color: "bg-red-50 text-red-600" },
                      update_session: { label: locale === "en" ? "Update session" : "Modif. session", color: "bg-yellow-50 text-yellow-700" },
                      delete_session: { label: t("audit.deleteSession", locale), color: "bg-red-50 text-red-600" },
                      update_profile: { label: t("audit.updateProfile", locale), color: "bg-slate-50 text-slate-600" },
                      change_password: { label: t("audit.changePassword", locale), color: "bg-slate-50 text-slate-600" },
                      admin_block_user: { label: t("audit.adminBlock", locale), color: "bg-red-50 text-red-600" },
                      admin_unblock_user: { label: t("audit.adminUnblock", locale), color: "bg-emerald-50 text-emerald-600" },
                      admin_delete_user: { label: t("audit.adminDelete", locale), color: "bg-red-100 text-red-700" },
                      admin_edit_user: { label: t("audit.adminEdit", locale), color: "bg-yellow-50 text-yellow-700" },
                      admin_change_role: { label: t("audit.adminChangeRole", locale), color: "bg-purple-50 text-purple-600" },
                      admin_approve_user: { label: t("audit.adminApprove", locale), color: "bg-emerald-50 text-emerald-600" },
                      admin_reject_user: { label: t("audit.adminReject", locale), color: "bg-red-50 text-red-600" },
                      admin_update_llm: { label: t("audit.adminUpdateLlm", locale), color: "bg-indigo-50 text-indigo-600" },
                      flash_record: { label: t("audit.flashRecord", locale), color: "bg-cyan-50 text-cyan-600" },
                    };
                    const actionInfo = actionLabels[log.action] || { label: log.action, color: "bg-neutral-100 text-neutral-600" };
                    let details = "";
                    try { const d = JSON.parse(log.details || "{}"); details = Object.entries(d).map(([k, v]) => `${k}: ${v}`).join(", "); } catch {}

                    return (
                      <tr key={log.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-3 py-2.5 text-[10px] text-neutral-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString(locale === "en" ? "en-GB" : "fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </td>
                        <td className="px-3 py-2.5">
                          <div>
                            <p className="text-[11px] font-medium text-black">{log.user?.name || "—"}</p>
                            <p className="text-[9px] text-neutral-400">{log.user?.email}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-bold uppercase ${actionInfo.color}`}>
                            {actionInfo.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-neutral-500 capitalize">
                          {log.entity || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[10px] text-neutral-400 max-w-[200px] truncate" title={details}>
                          {details || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[9px] text-neutral-300 whitespace-nowrap">
                          {log.ipAddress || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-[9px] text-neutral-300 max-w-[120px] truncate" title={log.userAgent}>
                          {log.userAgent?.slice(0, 30) || "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[11px] text-neutral-400">
                        {locale === "en" ? "No audit log entries." : "Aucune entrée dans le journal d'audit."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {auditTotal > 50 && (
              <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
                <p className="text-[10px] text-neutral-400">
                  {locale === "en" ? `Page ${auditPage} of ${Math.ceil(auditTotal / 50)} (${auditTotal} entries)` : `Page ${auditPage} sur ${Math.ceil(auditTotal / 50)} (${auditTotal} entrées)`}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={auditPage <= 1}
                    onClick={() => {
                      const p = auditPage - 1;
                      setAuditPage(p);
                      fetch(`/api/admin/audit?limit=50&page=${p}${auditFilter ? `&action=${auditFilter}` : ""}`)
                        .then((r) => r.json())
                        .then((data) => { setAuditLogs(data?.logs || []); });
                    }}
                    className="border border-neutral-200 px-3 py-1 text-[10px] font-semibold disabled:opacity-30"
                  >
                    {t("common.previous", locale)}
                  </button>
                  <button
                    disabled={auditPage >= Math.ceil(auditTotal / 50)}
                    onClick={() => {
                      const p = auditPage + 1;
                      setAuditPage(p);
                      fetch(`/api/admin/audit?limit=50&page=${p}${auditFilter ? `&action=${auditFilter}` : ""}`)
                        .then((r) => r.json())
                        .then((data) => { setAuditLogs(data?.logs || []); });
                    }}
                    className="border border-neutral-200 px-3 py-1 text-[10px] font-semibold disabled:opacity-30"
                  >
                    {t("common.next", locale)}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {tab === "llm" && (
        <div className="space-y-6">
          <div className="border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={14} className="text-neutral-400" />
                <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                  {t("admin.activeProvider", locale)}
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-1.5 w-1.5 ${(llmConfig.openai_configured || llmConfig.anthropic_configured) ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className="text-[10px] font-medium text-neutral-400">
                  {(llmConfig.openai_configured || llmConfig.anthropic_configured) ? (locale === "en" ? "Operational" : "Opérationnel") : t("admin.configRequired", locale)}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-neutral-400">
              {t("admin.llmProviderDesc", locale)}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => handleSaveLlmKey("llm_provider", "openai")}
                disabled={llmSaving}
                className={`flex-1 border px-4 py-3 text-center transition-colors ${
                  (llmConfig.llm_provider || "openai") === "openai"
                    ? "border-black bg-black text-white"
                    : "border-neutral-200 text-neutral-500 hover:border-black hover:text-black"
                }`}
              >
                <p className="text-[11px] font-bold uppercase">OpenAI</p>
                <p className="mt-1 text-[9px] opacity-60">GPT-4o</p>
              </button>
              <button
                onClick={() => handleSaveLlmKey("llm_provider", "anthropic")}
                disabled={llmSaving}
                className={`flex-1 border px-4 py-3 text-center transition-colors ${
                  llmConfig.llm_provider === "anthropic"
                    ? "border-black bg-black text-white"
                    : "border-neutral-200 text-neutral-500 hover:border-black hover:text-black"
                }`}
              >
                <p className="text-[11px] font-bold uppercase">Anthropic</p>
                <p className="mt-1 text-[9px] opacity-60">Claude Sonnet</p>
              </button>
            </div>
          </div>

          {/* ── WHISPER TRANSCRIPTION KEY ── */}
          <div className="border-l-4 border-l-blue-500 border border-neutral-200 bg-white p-6">
            <p className="mb-3 text-[9px] font-bold tracking-[0.2em] text-blue-600 uppercase">{t("admin.whisperSection", locale)}</p>
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {t("admin.whisperKey", locale)}
              </h3>
              <div className="flex items-center gap-2">
                {llmConfig.whisper_configured && (
                  <>
                    <button
                      onClick={() => handleTestKey("whisper")}
                      disabled={testingProvider === "whisper" || llmSaving}
                      className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-600 transition-colors hover:border-black hover:text-black disabled:opacity-40"
                    >
                      {testingProvider === "whisper" ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      {testingProvider === "whisper" ? t("admin.testing", locale) : t("admin.testKey", locale)}
                    </button>
                    {confirmDeleteLlmKey === "whisper_api_key" ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteLlmKey("whisper_api_key")} className="border border-red-500 bg-red-500 px-2.5 py-1.5 text-[10px] font-semibold text-white">
                          {t("common.confirm", locale)}
                        </button>
                        <button onClick={() => setConfirmDeleteLlmKey(null)} className="border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-500">
                          {t("common.cancel", locale)}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteLlmKey("whisper_api_key")}
                        disabled={llmSaving}
                        className="flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-[10px] font-semibold text-red-500 transition-colors hover:border-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 size={11} />
                        {t("admin.deleteKey", locale)}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="mt-1 text-[10px] text-neutral-400">
              {t("admin.whisperKeyDesc", locale)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className={`h-1.5 w-1.5 ${llmConfig.whisper_configured ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[10px] text-neutral-500">
                {llmConfig.whisper_configured ? `${t("admin.configured", locale)} : ${llmConfig.whisper_api_key}` : t("admin.notConfigured", locale)}
              </span>
            </div>
            {testResult?.provider === "whisper" && (
              <div className={`mt-3 flex items-center gap-2 border px-3 py-2 text-[11px] font-medium ${testResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                {testResult.success ? <CircleCheck size={13} /> : <CircleX size={13} />}
                {testResult.message}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showWhisperKey ? "text" : "password"}
                  value={whisperKey}
                  onChange={(e) => setWhisperKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 pr-10 font-mono text-[12px] outline-none transition-colors focus:border-black focus:bg-white"
                />
                <button
                  onClick={() => setShowWhisperKey(!showWhisperKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  {showWhisperKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => handleSaveLlmKey("whisper_api_key", whisperKey)}
                disabled={!whisperKey.trim() || llmSaving}
                className="border border-black bg-black px-5 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {llmSaving ? "..." : t("admin.save", locale)}
              </button>
            </div>
          </div>

          {/* ── REPORT GENERATION KEYS ── */}
          <div className="border-l-4 border-l-amber-500 border border-neutral-200 bg-white p-6">
            <p className="mb-3 text-[9px] font-bold tracking-[0.2em] text-amber-600 uppercase">{t("admin.reportSection", locale)}</p>
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {t("admin.openaiKey", locale)}
              </h3>
              <div className="flex items-center gap-2">
                {llmConfig.openai_configured && (
                  <>
                    <button
                      onClick={() => handleTestKey("openai")}
                      disabled={testingProvider === "openai" || llmSaving}
                      className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-600 transition-colors hover:border-black hover:text-black disabled:opacity-40"
                    >
                      {testingProvider === "openai" ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      {testingProvider === "openai" ? t("admin.testing", locale) : t("admin.testKey", locale)}
                    </button>
                    {confirmDeleteLlmKey === "openai_api_key" ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteLlmKey("openai_api_key")} className="border border-red-500 bg-red-500 px-2.5 py-1.5 text-[10px] font-semibold text-white">
                          {t("common.confirm", locale)}
                        </button>
                        <button onClick={() => setConfirmDeleteLlmKey(null)} className="border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-500">
                          {t("common.cancel", locale)}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteLlmKey("openai_api_key")}
                        disabled={llmSaving}
                        className="flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-[10px] font-semibold text-red-500 transition-colors hover:border-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 size={11} />
                        {t("admin.deleteKey", locale)}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="mt-1 text-[10px] text-neutral-400">
              {t("admin.openaiKeyDesc", locale)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className={`h-1.5 w-1.5 ${llmConfig.openai_configured ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[10px] text-neutral-500">
                {llmConfig.openai_configured ? `${t("admin.configured", locale)} : ${llmConfig.openai_api_key}` : t("admin.notConfigured", locale)}
              </span>
            </div>
            {testResult?.provider === "openai" && (
              <div className={`mt-3 flex items-center gap-2 border px-3 py-2 text-[11px] font-medium ${testResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                {testResult.success ? <CircleCheck size={13} /> : <CircleX size={13} />}
                {testResult.message}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showOpenaiKey ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 pr-10 font-mono text-[12px] outline-none transition-colors focus:border-black focus:bg-white"
                />
                <button
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => handleSaveLlmKey("openai_api_key", openaiKey)}
                disabled={!openaiKey.trim() || llmSaving}
                className="border border-black bg-black px-5 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {llmSaving ? "..." : t("admin.save", locale)}
              </button>
            </div>
          </div>

          <div className="border-l-4 border-l-amber-500 border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
                {t("admin.anthropicKey", locale)}
              </h3>
              <div className="flex items-center gap-2">
                {llmConfig.anthropic_configured && (
                  <>
                    <button
                      onClick={() => handleTestKey("anthropic")}
                      disabled={testingProvider === "anthropic" || llmSaving}
                      className="flex items-center gap-1.5 border border-neutral-200 px-3 py-1.5 text-[10px] font-semibold text-neutral-600 transition-colors hover:border-black hover:text-black disabled:opacity-40"
                    >
                      {testingProvider === "anthropic" ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                      {testingProvider === "anthropic" ? t("admin.testing", locale) : t("admin.testKey", locale)}
                    </button>
                    {confirmDeleteLlmKey === "anthropic_api_key" ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDeleteLlmKey("anthropic_api_key")} className="border border-red-500 bg-red-500 px-2.5 py-1.5 text-[10px] font-semibold text-white">
                          {t("common.confirm", locale)}
                        </button>
                        <button onClick={() => setConfirmDeleteLlmKey(null)} className="border border-neutral-200 px-2.5 py-1.5 text-[10px] font-semibold text-neutral-500">
                          {t("common.cancel", locale)}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteLlmKey("anthropic_api_key")}
                        disabled={llmSaving}
                        className="flex items-center gap-1.5 border border-red-200 px-3 py-1.5 text-[10px] font-semibold text-red-500 transition-colors hover:border-red-500 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 size={11} />
                        {t("admin.deleteKey", locale)}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <p className="mt-1 text-[10px] text-neutral-400">
              {t("admin.anthropicKeyDesc", locale)}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <div className={`h-1.5 w-1.5 ${llmConfig.anthropic_configured ? "bg-emerald-500" : "bg-neutral-300"}`} />
              <span className="text-[10px] text-neutral-500">
                {llmConfig.anthropic_configured ? `${t("admin.configured", locale)} : ${llmConfig.anthropic_api_key}` : t("admin.notConfigured", locale)}
              </span>
            </div>
            {testResult?.provider === "anthropic" && (
              <div className={`mt-3 flex items-center gap-2 border px-3 py-2 text-[11px] font-medium ${testResult.warning ? "border-amber-200 bg-amber-50 text-amber-700" : testResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                {testResult.warning ? <AlertTriangle size={13} /> : testResult.success ? <CircleCheck size={13} /> : <CircleX size={13} />}
                {testResult.message}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showAnthropicKey ? "text" : "password"}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 pr-10 font-mono text-[12px] outline-none transition-colors focus:border-black focus:bg-white"
                />
                <button
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  {showAnthropicKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => handleSaveLlmKey("anthropic_api_key", anthropicKey)}
                disabled={!anthropicKey.trim() || llmSaving}
                className="border border-black bg-black px-5 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {llmSaving ? "..." : t("admin.save", locale)}
              </button>
            </div>
          </div>

          <div className="border border-neutral-200 bg-white p-5">
            <p className="text-[10px] leading-relaxed text-neutral-300">
              {t("admin.llmFooter", locale)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
