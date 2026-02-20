"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  const router = useRouter();
  const { locale } = useAppStore();
  const [isPending, setIsPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pending") === "true") setIsPending(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(t("auth.errorInvalid", locale));
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError(locale === "en" ? "Service temporarily unavailable. Please try again." : "Le service est temporairement indisponible. Réessayez dans quelques instants.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between bg-black p-14">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-white">
            <span className="text-lg font-black text-black">H</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[12px] font-bold tracking-[0.25em] text-white uppercase">
              Cabinet HOK
            </span>
            <span className="text-[8px] tracking-[0.2em] text-white/30 uppercase">
              {locale === "en" ? "Internal platform" : "Plateforme interne"}
            </span>
          </div>
        </div>

        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <p className="text-[10px] font-semibold tracking-[0.3em] text-white/30 uppercase">
              {locale === "en" ? "Legal productivity tool" : "Outil de productivité juridique"}
            </p>
            <h2 className="text-[42px] font-light leading-[1.1] text-white">
              {locale === "en" ? "Dictate your reports." : "Dictez vos comptes rendus."}
              <br />
              <span className="font-semibold">{locale === "en" ? "We do the rest." : "Nous faisons le reste."}</span>
            </h2>
          </div>
          <div className="h-px w-16 bg-white/20" />
          <p className="text-[13px] leading-relaxed text-white/40">
            {locale === "en"
              ? "HOK Reports is the document management platform of Cabinet HOK. Record your sessions, get faithful transcriptions and generate structured reports ready to integrate into your case files."
              : "HOK Reports est la plateforme de gestion documentaire du Cabinet HOK. Enregistrez vos sessions, obtenez des transcriptions fid\u00e8les et g\u00e9n\u00e9rez des rapports structur\u00e9s pr\u00eats \u00e0 int\u00e9grer dans vos dossiers."}
          </p>
          <div className="flex gap-12 pt-4">
            <div>
              <p className="text-2xl font-light text-white">98%</p>
              <p className="text-[10px] tracking-wide text-white/30 uppercase">{locale === "en" ? "Accuracy" : "Précision"}</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white">&lt;3min</p>
              <p className="text-[10px] tracking-wide text-white/30 uppercase">{locale === "en" ? "Avg. time" : "Délai moyen"}</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white">24/7</p>
              <p className="text-[10px] tracking-wide text-white/30 uppercase">{locale === "en" ? "Availability" : "Disponibilité"}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/15">
            &copy; {new Date().getFullYear()} Cabinet HOK. {locale === "en" ? "All rights reserved. Internal use only." : "Tous droits réservés. Usage interne uniquement."}
          </p>
          <div className="flex gap-4 text-[10px] text-white/20">
            <Link href="/mentions-legales" className="hover:text-white/40">{locale === "en" ? "Legal notices" : "Mentions légales"}</Link>
            <Link href="/confidentialite" className="hover:text-white/40">{locale === "en" ? "Privacy" : "Confidentialité"}</Link>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-white p-8 lg:w-[45%]">
        <div className="w-full max-w-[360px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center bg-black">
              <span className="text-sm font-black text-white">H</span>
            </div>
            <span className="text-[12px] font-bold tracking-[0.2em] uppercase">Cabinet HOK</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[22px] font-semibold text-black">{t("auth.loginTitle", locale)}</h2>
            <p className="mt-2 text-[13px] text-neutral-400">
              {t("auth.loginSubtitle", locale)}
            </p>
          </div>

          {isPending && (
            <div className="mb-6 border-l-2 border-emerald-500 bg-emerald-50 px-4 py-3 text-[12px] text-emerald-700">
              {t("auth.pendingMessage", locale)}
            </div>
          )}

          {error && (
            <div className="mb-6 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[12px] text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
                {t("auth.email", locale)}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] text-black outline-none transition-colors focus:border-black focus:bg-white"
                placeholder="nom@cabinet-hok.fr"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
                {t("auth.password", locale)}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] text-black outline-none transition-colors focus:border-black focus:bg-white"
                placeholder="••••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black py-3.5 text-[12px] font-semibold tracking-[0.1em] text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
            >
              {loading ? (locale === "en" ? "Signing in..." : "Authentification en cours...") : t("auth.loginBtn", locale)}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200" />
            <span className="text-[10px] font-medium tracking-wide text-neutral-300 uppercase">{locale === "en" ? "or" : "ou"}</span>
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex w-full items-center justify-center gap-3 border border-neutral-200 bg-white py-3.5 text-[12px] font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {locale === "en" ? "Continue with Google" : "Continuer avec Google"}
          </button>

          <div className="mt-6 space-y-3">
            <p className="text-center text-[12px] text-neutral-400">
              {locale === "en" ? "First time?" : "Première connexion ?"}{" "}
              <Link href="/register" className="font-semibold text-black hover:underline underline-offset-2">
                {locale === "en" ? "Request access" : "Demander un accès"}
              </Link>
            </p>
          </div>

          <div className="mt-12 border-t border-neutral-100 pt-4">
            <p className="text-[10px] leading-relaxed text-neutral-300">
              {locale === "en"
                ? "Platform reserved for authorized members of Cabinet HOK. Any unauthorized access is strictly prohibited and may result in legal proceedings."
                : "Plateforme r\u00e9serv\u00e9e aux membres autoris\u00e9s du Cabinet HOK. Tout acc\u00e8s non autoris\u00e9 est strictement interdit et susceptible de poursuites judiciaires."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
