"use client";

import { useState, useEffect } from "react";
import { Globe, Shield, MessageCircle, CheckCircle, AlertCircle, Copy, Loader2, Send } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t, type Locale } from "@/lib/i18n";

interface WhatsAppStatus {
  configured: boolean;
  webhookUrl: string;
  verifyToken: string;
  phoneNumberId: string;
  accessToken: string;
}

export default function SettingsPage() {
  const { locale, setLocale } = useAppStore();
  const [waStatus, setWaStatus] = useState<WhatsAppStatus | null>(null);
  const [waLoading, setWaLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testSender, setTestSender] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetchWhatsAppStatus();
  }, []);

  const fetchWhatsAppStatus = async () => {
    setWaLoading(true);
    try {
      const res = await fetch("/api/whatsapp/status");
      if (res.ok) {
        const data = await res.json();
        setWaStatus(data);
      }
    } catch {}
    setWaLoading(false);
  };

  const handleTestWebhook = async () => {
    if (!testMessage.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testMessage, senderName: testSender || "Test WhatsApp" }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.success
          ? (locale === "en" ? "Test message processed successfully! Check the Roles page." : "Message test traité avec succès ! Vérifiez la page Rôles.")
          : (data.error || "Erreur"),
      });
      if (data.success) setTestMessage("");
    } catch {
      setTestResult({ success: false, message: "Erreur serveur" });
    }
    setTesting(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const languages: { code: Locale; label: string }[] = [
    { code: "fr", label: "Français" },
    { code: "en", label: "English" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-300 uppercase">
          {t("settings.config", locale)}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold text-black">
          {t("settings.title", locale)}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-400">
          {t("settings.subtitle", locale)}
        </p>
      </div>

      <div className="border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-neutral-400" />
          <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            {t("settings.language", locale)}
          </h2>
        </div>
        <p className="mt-2 text-[12px] text-neutral-400">
          {t("settings.languageDesc", locale)}
        </p>
        <div className="mt-4 flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              className={`border px-4 py-2.5 text-[11px] font-semibold tracking-wide uppercase transition-colors ${
                locale === lang.code
                  ? "border-black bg-black text-white"
                  : "border-neutral-200 text-neutral-500 hover:border-black hover:text-black"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-neutral-400" />
          <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            {t("settings.systemInfo", locale)}
          </h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-2">
            <span className="text-[12px] text-neutral-400">{t("settings.platform", locale)}</span>
            <span className="text-[12px] font-medium text-black">HOK Reports</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-50 pb-2">
            <span className="text-[12px] text-neutral-400">{t("settings.version", locale)}</span>
            <span className="text-[12px] font-medium text-black">1.0.0</span>
          </div>
          <div className="flex items-center justify-between border-b border-neutral-50 pb-2">
            <span className="text-[12px] text-neutral-400">{t("settings.editor", locale)}</span>
            <span className="text-[12px] font-medium text-black">Cabinet HOK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-neutral-400">{t("settings.engine", locale)}</span>
            <span className="text-[12px] font-medium text-black">HOK Engine v1</span>
          </div>
        </div>
        <p className="mt-4 text-[10px] leading-relaxed text-neutral-300">
          {t("settings.systemDesc", locale)}
        </p>
      </div>

      {/* WhatsApp Integration */}
      <div className="border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <MessageCircle size={14} className="text-green-500" />
          <h2 className="text-[11px] font-bold tracking-[0.15em] text-black uppercase">
            {locale === "en" ? "WhatsApp Integration" : "Intégration WhatsApp"}
          </h2>
          {waStatus && (
            <span className={`ml-auto px-2 py-0.5 text-[9px] font-bold uppercase ${waStatus.configured ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
              {waStatus.configured
                ? (locale === "en" ? "Connected" : "Connecté")
                : (locale === "en" ? "Not configured" : "Non configuré")}
            </span>
          )}
        </div>
        <p className="mt-2 text-[12px] text-neutral-400">
          {locale === "en"
            ? "Connect your WhatsApp group to automatically receive hearing reports. Lawyers post reports in WhatsApp, and they appear here automatically."
            : "Connectez votre groupe WhatsApp pour recevoir automatiquement les comptes rendus d'audience. Les avocats postent dans WhatsApp, et les données apparaissent ici automatiquement."}
        </p>

        {waLoading ? (
          <div className="mt-4 flex items-center gap-2 text-[11px] text-neutral-400">
            <Loader2 size={14} className="animate-spin" />
            {locale === "en" ? "Loading..." : "Chargement..."}
          </div>
        ) : waStatus ? (
          <div className="mt-4 space-y-4">
            {/* Setup instructions */}
            <div className="border border-neutral-100 bg-neutral-50 p-4 space-y-3">
              <p className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                {locale === "en" ? "Setup Guide" : "Guide de configuration"}
              </p>
              <ol className="space-y-2 text-[11px] text-neutral-600">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center bg-black text-white text-[9px] font-bold">1</span>
                  <span>{locale === "en"
                    ? "Create a Meta Business App at developers.facebook.com and enable WhatsApp Business API"
                    : "Créez une application Meta Business sur developers.facebook.com et activez l'API WhatsApp Business"}</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center bg-black text-white text-[9px] font-bold">2</span>
                  <span>{locale === "en"
                    ? "Add the Webhook URL and Verify Token below to your Meta App's WhatsApp webhook configuration"
                    : "Ajoutez l'URL du webhook et le token de vérification ci-dessous dans la configuration webhook WhatsApp de votre application Meta"}</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center bg-black text-white text-[9px] font-bold">3</span>
                  <span>{locale === "en"
                    ? "Copy the Access Token and Phone Number ID from Meta and add them to your .env file"
                    : "Copiez le token d'accès et l'ID du numéro de téléphone depuis Meta et ajoutez-les dans votre fichier .env"}</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center bg-black text-white text-[9px] font-bold">4</span>
                  <span>{locale === "en"
                    ? "Subscribe to the 'messages' webhook field. Lawyers can now send structured reports to WhatsApp!"
                    : "Abonnez-vous au champ webhook 'messages'. Les avocats peuvent maintenant envoyer des comptes rendus structurés sur WhatsApp !"}</span>
                </li>
              </ol>
            </div>

            {/* Webhook URL */}
            <div>
              <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-mono text-neutral-600 truncate">
                  {waStatus.webhookUrl}
                </code>
                <button onClick={() => copyToClipboard(waStatus.webhookUrl, "webhook")}
                  className="border border-neutral-200 p-2 text-neutral-400 hover:text-black hover:border-black transition-colors">
                  {copied === "webhook" ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Verify Token */}
            <div>
              <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                Verify Token
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-mono text-neutral-600 truncate">
                  {waStatus.verifyToken || "hok-whatsapp-verify-2026"}
                </code>
                <button onClick={() => copyToClipboard(waStatus.verifyToken || "hok-whatsapp-verify-2026", "verify")}
                  className="border border-neutral-200 p-2 text-neutral-400 hover:text-black hover:border-black transition-colors">
                  {copied === "verify" ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* API Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  Access Token
                </label>
                <div className={`border px-3 py-2 text-[11px] ${waStatus.accessToken ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-amber-50 text-amber-600"}`}>
                  {waStatus.accessToken || (locale === "en" ? "Not set (.env)" : "Non défini (.env)")}
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  Phone Number ID
                </label>
                <div className={`border px-3 py-2 text-[11px] ${waStatus.phoneNumberId ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-amber-200 bg-amber-50 text-amber-600"}`}>
                  {waStatus.phoneNumberId || (locale === "en" ? "Not set (.env)" : "Non défini (.env)")}
                </div>
              </div>
            </div>

            {/* Message format */}
            <div className="border border-green-100 bg-green-50 p-4">
              <p className="text-[10px] font-bold tracking-wide text-green-700 uppercase mb-2">
                {locale === "en" ? "Message format for lawyers" : "Format de message pour les avocats"}
              </p>
              <pre className="text-[10px] text-green-800 whitespace-pre-wrap leading-relaxed font-mono">{`📋 COMPTE RENDU
Date: 20/02/2026
Client: Dupont
Dossier: RG 2026/0456
Juridiction: TPI Cotonou
Chambre: 1ère Ch. civile
Adverse: SCI Immobilia
Avocat: Me Ahouandjinou
Résumé: Le tribunal a ordonné une expertise...
Prochaine: 25/02/2026
Tâches: Préparer pièces, Déposer conclusions`}</pre>
            </div>

            {/* Test webhook */}
            <div className="border border-neutral-200 p-4 space-y-3">
              <p className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                {locale === "en" ? "Test webhook (simulate WhatsApp message)" : "Tester le webhook (simuler un message WhatsApp)"}
              </p>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  {locale === "en" ? "Sender name" : "Nom de l'expéditeur"}
                </label>
                <input type="text" value={testSender} onChange={(e) => setTestSender(e.target.value)}
                  placeholder="Me Ahouandjinou"
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] outline-none focus:border-black focus:bg-white" />
              </div>
              <div>
                <label className="block text-[9px] font-semibold tracking-wide text-neutral-400 uppercase mb-1">
                  Message WhatsApp *
                </label>
                <textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)}
                  placeholder={`📋 COMPTE RENDU\nDate: 20/02/2026\nClient: Martin\nDossier: RG 2026/0789\nJuridiction: TPI Cotonou\nRésumé: Le tribunal a renvoyé l'affaire...\nProchaine: 27/02/2026\nTâches: Préparer conclusions`}
                  rows={6}
                  className="w-full border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] font-mono outline-none focus:border-black focus:bg-white resize-none" />
              </div>
              {testResult && (
                <div className={`flex items-center gap-2 px-3 py-2 text-[11px] font-medium ${testResult.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {testResult.success ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
                  {testResult.message}
                </div>
              )}
              <button onClick={handleTestWebhook} disabled={testing || !testMessage.trim()}
                className="flex items-center gap-2 bg-green-600 px-4 py-2 text-[10px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-green-700 disabled:opacity-40">
                {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                {testing
                  ? (locale === "en" ? "Sending..." : "Envoi...")
                  : (locale === "en" ? "Send test message" : "Envoyer le message test")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
