"use client";

import { useState, useRef } from "react";
import Link from "next/link";

export default function PlatformDocsPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const rateLimitHeader = res.headers.get("X-RateLimit-Remaining");
      if (rateLimitHeader !== null) setRemaining(parseInt(rateLimitHeader));

      if (res.status === 429) {
        setError("Trop de tentatives. Veuillez réessayer dans 15 minutes.");
        return;
      }

      if (res.status === 401) {
        const data = await res.json();
        setError(data.error || "Mot de passe incorrect");
        return;
      }

      if (!res.ok) {
        setError("Erreur serveur. Veuillez réessayer.");
        return;
      }

      const html = await res.text();
      setAuthenticated(true);

      // Write HTML to iframe after state update
      setTimeout(() => {
        if (iframeRef.current) {
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
          }
        }
      }, 100);
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  if (authenticated) {
    return (
      <div className="min-h-screen bg-white">
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-black px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-white">
              <span className="text-xs font-black text-black">H</span>
            </div>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-white/60 uppercase">
              Documentation Plateforme
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/docs/PLATFORM_DOCUMENTATION.pdf"
              target="_blank"
              className="text-[10px] font-medium tracking-wider text-white/40 uppercase hover:text-white/70 transition-colors"
            >
              Télécharger PDF
            </a>
            <button
              onClick={() => { setAuthenticated(false); setPassword(""); }}
              className="text-[10px] font-medium tracking-wider text-white/40 uppercase hover:text-white/70 transition-colors"
            >
              Verrouiller
            </button>
            <Link
              href="/login"
              className="text-[10px] font-medium tracking-wider text-white/40 uppercase hover:text-white/70 transition-colors"
            >
              Plateforme
            </Link>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          className="w-full border-0"
          style={{ marginTop: "48px", height: "calc(100vh - 48px)" }}
          title="Documentation HOK Reports"
          sandbox="allow-same-origin"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
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
              Documentation technique
            </span>
          </div>
        </div>

        <div className="max-w-lg space-y-8">
          <div className="space-y-4">
            <p className="text-[10px] font-semibold tracking-[0.3em] text-white/30 uppercase">
              Acc&egrave;s restreint
            </p>
            <h2 className="text-[42px] font-light leading-[1.1] text-white">
              Documentation
              <br />
              <span className="font-semibold">de la plateforme.</span>
            </h2>
          </div>
          <div className="h-px w-16 bg-white/20" />
          <p className="text-[13px] leading-relaxed text-white/40">
            Ce document contient l&apos;architecture technique compl&egrave;te, les protocoles de
            s&eacute;curit&eacute;, les mod&egrave;les de donn&eacute;es et les routes API de la
            plateforme HOK Reports. L&apos;acc&egrave;s est prot&eacute;g&eacute; par mot de passe.
          </p>
          <div className="flex gap-12 pt-4">
            <div>
              <p className="text-2xl font-light text-white">10</p>
              <p className="text-[10px] tracking-wide text-white/30 uppercase">Sections</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white">30+</p>
              <p className="text-[10px] tracking-wide text-white/30 uppercase">Routes API</p>
            </div>
            <div>
              <p className="text-2xl font-light text-white">8</p>
              <p className="text-[10px] tracking-wide text-white/30 uppercase">Mod&egrave;les</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-white/15">
            &copy; {new Date().getFullYear()} Cabinet HOK. Tous droits r&eacute;serv&eacute;s.
          </p>
          <Link href="/login" className="text-[10px] text-white/20 hover:text-white/40 transition-colors">
            Acc&eacute;der &agrave; la plateforme &rarr;
          </Link>
        </div>
      </div>

      {/* Right panel — Password form */}
      <div className="flex w-full items-center justify-center bg-white p-8 lg:w-[45%]">
        <div className="w-full max-w-[360px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center bg-black">
              <span className="text-sm font-black text-white">H</span>
            </div>
            <span className="text-[12px] font-bold tracking-[0.2em] uppercase">Cabinet HOK</span>
          </div>

          <div className="mb-8">
            <h2 className="text-[22px] font-semibold text-black">
              Acc&egrave;s documentation
            </h2>
            <p className="mt-2 text-[13px] text-neutral-400">
              Saisissez le mot de passe pour consulter la documentation technique de la plateforme.
            </p>
          </div>

          {error && (
            <div className="mb-6 border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[12px] text-red-700">
              {error}
            </div>
          )}

          {remaining !== null && remaining <= 2 && remaining > 0 && (
            <div className="mb-6 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
              Attention : {remaining} tentative{remaining > 1 ? "s" : ""} restante{remaining > 1 ? "s" : ""} avant blocage temporaire.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold tracking-[0.15em] text-neutral-400 uppercase">
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] text-black outline-none transition-colors focus:border-black focus:bg-white"
                placeholder="Mot de passe de la documentation"
                required
                autoComplete="off"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black py-3.5 text-[12px] font-semibold tracking-[0.1em] text-white uppercase transition-colors hover:bg-neutral-800 disabled:opacity-40"
            >
              {loading ? "Vérification..." : "Accéder à la documentation"}
            </button>
          </form>

          <div className="mt-8 border-t border-neutral-100 pt-4">
            <p className="text-[10px] leading-relaxed text-neutral-300">
              Ce document est confidentiel et réservé aux membres autorisés du Cabinet HOK.
              L&apos;accès est limité à 5 tentatives par période de 15 minutes pour des raisons de sécurité.
            </p>
          </div>

          <div className="mt-6">
            <Link
              href="/login"
              className="text-[11px] font-medium text-neutral-400 hover:text-black transition-colors"
            >
              &larr; Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
