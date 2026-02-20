"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function NotFound() {
  const { locale } = useAppStore();

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center bg-black">
            <span className="text-xl font-black text-white">H</span>
          </div>
        </div>
        <p className="mt-8 text-[64px] font-light text-black">404</p>
        <p className="mt-2 text-[13px] font-medium text-neutral-400">
          {t("notFound.title", locale)}
        </p>
        <p className="mt-1 text-[11px] text-neutral-300">
          {t("notFound.subtitle", locale)}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="border border-black bg-black px-5 py-2.5 text-[11px] font-semibold tracking-wide text-white uppercase transition-colors hover:bg-neutral-800"
          >
            {t("nav.dashboard", locale)}
          </Link>
          <Link
            href="/login"
            className="border border-neutral-200 px-5 py-2.5 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase transition-colors hover:border-black hover:text-black"
          >
            {t("auth.login", locale)}
          </Link>
        </div>
        <p className="mt-12 text-[9px] text-neutral-200">
          {t("app.footer", locale)}
        </p>
      </div>
    </div>
  );
}
