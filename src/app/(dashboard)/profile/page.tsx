"use client";

import { useState, useEffect } from "react";
import { User, Mail, Shield, Calendar, Lock, Check, AlertCircle } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function ProfilePage() {
  const { locale } = useAppStore();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        setName(data.name || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpdateProfile = async () => {
    setProfileStatus("saving");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setProfileStatus("saved");
        setTimeout(() => setProfileStatus("idle"), 3000);
      } else {
        setProfileStatus("error");
        setTimeout(() => setProfileStatus("idle"), 3000);
      }
    } catch {
      setProfileStatus("error");
      setTimeout(() => setProfileStatus("idle"), 3000);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError(locale === "en" ? "Password must be at least 6 characters." : "Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(locale === "en" ? "Passwords do not match." : "Les mots de passe ne correspondent pas.");
      return;
    }

    setPasswordStatus("saving");
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPasswordStatus("saved");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordStatus("idle"), 3000);
      } else {
        const data = await res.json();
        setPasswordError(data.error || (locale === "en" ? "Error updating password." : "Erreur lors de la modification."));
        setPasswordStatus("error");
        setTimeout(() => setPasswordStatus("idle"), 3000);
      }
    } catch {
      setPasswordError(locale === "en" ? "Server connection error." : "Erreur de connexion au serveur.");
      setPasswordStatus("error");
      setTimeout(() => setPasswordStatus("idle"), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-5 w-5 animate-spin border-2 border-black border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {t("profile.personalDetails", locale)}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">{t("profile.title", locale)}</h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          {t("profile.subtitle", locale)}
        </p>
      </div>

      <div className="border border-neutral-200 bg-white p-6">
        <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
          {t("profile.personalInfo", locale)}
        </h2>
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3 text-[12px]">
            <Mail size={14} className="text-neutral-400" />
            <div>
              <p className="text-neutral-400">{t("auth.email", locale)}</p>
              <p className="font-medium text-black">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <Shield size={14} className="text-neutral-400" />
            <div>
              <p className="text-neutral-400">{locale === "en" ? "Role" : "Rôle"}</p>
              <p className="font-medium text-black">
                {user?.role === "admin" ? t("header.admin", locale) : t("header.user", locale)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <Calendar size={14} className="text-neutral-400" />
            <div>
              <p className="text-neutral-400">{locale === "en" ? "Member since" : "Membre depuis"}</p>
              <p className="font-medium text-black">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border border-neutral-200 bg-white p-6">
        <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
          {locale === "en" ? "Edit name" : "Modifier le nom"}
        </h2>
        <div className="mt-4 flex gap-2">
          <div className="flex-1">
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.1em] text-neutral-400 uppercase">
              {t("auth.name", locale)}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[13px] outline-none transition-colors focus:border-black focus:bg-white"
            />
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={profileStatus === "saving" || !name.trim()}
            className="mt-auto flex items-center gap-2 border border-black bg-black px-5 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            {profileStatus === "saved" ? <><Check size={13} /> {t("common.save", locale)}</> : t("common.save", locale)}
          </button>
        </div>
      </div>

      <div className="border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-neutral-400" />
          <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            {t("profile.changePassword", locale)}
          </h2>
        </div>

        {passwordError && (
          <div className="mt-3 flex items-start gap-2 border-l-2 border-red-400 bg-red-50 px-3 py-2">
            <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-red-500" />
            <p className="text-[11px] text-red-700">{passwordError}</p>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.1em] text-neutral-400 uppercase">
              {t("profile.currentPassword", locale)}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[13px] outline-none transition-colors focus:border-black focus:bg-white"
              autoComplete="current-password"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.1em] text-neutral-400 uppercase">
                {t("profile.newPassword", locale)}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-[13px] outline-none transition-colors focus:border-black focus:bg-white"
              />
              <p className="mt-1 text-[9px] text-neutral-400">
                {locale === "en" ? "Min. 8 chars, uppercase, lowercase, digit, special character" : "Min. 8 car., majuscule, minuscule, chiffre, caractère spécial"}
              </p>
            </div>
          </div>
          <button
            onClick={handleChangePassword}
            disabled={passwordStatus === "saving" || !currentPassword || !newPassword}
            className="flex items-center gap-2 border border-black bg-black px-5 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            {passwordStatus === "saved" ? <><Check size={13} /> {t("profile.passwordChanged", locale)}</> : t("profile.updatePassword", locale)}
          </button>
        </div>
      </div>
    </div>
  );
}
