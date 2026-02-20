"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
}

export default function CookieConsent() {
  const { locale } = useAppStore();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    functional: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem("hok-cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    const all = { essential: true, analytics: true, functional: true };
    localStorage.setItem("hok-cookie-consent", JSON.stringify(all));
    setVisible(false);
  };

  const acceptSelected = () => {
    localStorage.setItem("hok-cookie-consent", JSON.stringify(prefs));
    setVisible(false);
  };

  const rejectOptional = () => {
    const minimal = { essential: true, analytics: false, functional: false };
    localStorage.setItem("hok-cookie-consent", JSON.stringify(minimal));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-neutral-200 bg-white p-6 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex-1">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-black">
              {locale === "en" ? "Privacy settings" : "Paramètres de confidentialité"}
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-neutral-500">
              {locale === "en"
                ? "The HOK Reports platform uses strictly necessary cookies for service operation. Optional cookies help improve your experience and collect anonymized usage data. You can change your preferences at any time from settings."
                : "La plateforme HOK Reports utilise des cookies strictement n\u00e9cessaires au fonctionnement du service. Les cookies optionnels permettent d'am\u00e9liorer votre exp\u00e9rience et de collecter des donn\u00e9es d'utilisation anonymis\u00e9es. Vous pouvez modifier vos pr\u00e9f\u00e9rences \u00e0 tout moment depuis les param\u00e8tres."}
            </p>

            {showDetails && (
              <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                <label className="flex items-center justify-between text-[12px]">
                  <div>
                    <span className="font-medium text-black">{locale === "en" ? "Essential cookies" : "Cookies essentiels"}</span>
                    <span className="ml-2 text-neutral-400">{locale === "en" ? "— Required for operation" : "— Requis pour le fonctionnement"}</span>
                  </div>
                  <input type="checkbox" checked disabled className="accent-black" />
                </label>
                <label className="flex items-center justify-between text-[12px]">
                  <div>
                    <span className="font-medium text-black">{locale === "en" ? "Analytics cookies" : "Cookies analytiques"}</span>
                    <span className="ml-2 text-neutral-400">{locale === "en" ? "— Anonymized usage statistics" : "— Statistiques d'utilisation anonymisées"}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.analytics}
                    onChange={(e) => setPrefs({ ...prefs, analytics: e.target.checked })}
                    className="accent-black"
                  />
                </label>
                <label className="flex items-center justify-between text-[12px]">
                  <div>
                    <span className="font-medium text-black">{locale === "en" ? "Functional cookies" : "Cookies fonctionnels"}</span>
                    <span className="ml-2 text-neutral-400">{locale === "en" ? "— Preferences and personalization" : "— Préférences et personnalisation"}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.functional}
                    onChange={(e) => setPrefs({ ...prefs, functional: e.target.checked })}
                    className="accent-black"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="border border-neutral-200 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-600 transition-colors hover:border-black hover:text-black"
            >
              {showDetails ? (locale === "en" ? "Hide" : "Masquer") : (locale === "en" ? "Customize" : "Personnaliser")}
            </button>
            <button
              onClick={rejectOptional}
              className="border border-neutral-200 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-neutral-600 transition-colors hover:border-black hover:text-black"
            >
              {locale === "en" ? "Reject optional" : "Refuser optionnels"}
            </button>
            {showDetails && (
              <button
                onClick={acceptSelected}
                className="border border-black bg-black px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800"
              >
                {t("common.save", locale)}
              </button>
            )}
            <button
              onClick={acceptAll}
              className="border border-black bg-black px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-white transition-colors hover:bg-neutral-800"
            >
              {locale === "en" ? "Accept all" : "Tout accepter"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-4 text-[10px] text-neutral-400">
          <a href="/mentions-legales" className="underline-offset-2 hover:underline hover:text-black">{locale === "en" ? "Legal notices" : "Mentions légales"}</a>
          <a href="/confidentialite" className="underline-offset-2 hover:underline hover:text-black">{locale === "en" ? "Privacy policy" : "Politique de confidentialité"}</a>
          <a href="/cgu" className="underline-offset-2 hover:underline hover:text-black">{locale === "en" ? "Terms of use" : "Conditions d'utilisation"}</a>
        </div>
      </div>
    </div>
  );
}
