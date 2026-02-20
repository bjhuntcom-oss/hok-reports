"use client";

import { useEffect, useState } from "react";

export default function Preloader() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1200);
    const remove = setTimeout(() => setVisible(false), 1700);
    return () => {
      clearTimeout(timer);
      clearTimeout(remove);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-0">
          <div className="h-10 w-[3px] bg-white animate-pulse" style={{ animationDelay: "0ms" }} />
          <div className="h-14 w-[3px] bg-white animate-pulse mx-[3px]" style={{ animationDelay: "150ms" }} />
          <div className="h-10 w-[3px] bg-white animate-pulse" style={{ animationDelay: "300ms" }} />
          <div className="w-4" />
          <div className="h-10 w-[3px] bg-white animate-pulse" style={{ animationDelay: "100ms" }} />
          <div className="h-14 w-[3px] bg-white/40 animate-pulse mx-[3px]" style={{ animationDelay: "250ms" }} />
          <div className="h-10 w-[3px] bg-white animate-pulse" style={{ animationDelay: "400ms" }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-[13px] font-bold tracking-[0.35em] text-white uppercase">
            HOK REPORTS
          </span>
          <span className="text-[9px] tracking-[0.25em] text-white/30 uppercase">
            Cabinet HOK — Plateforme interne
          </span>
        </div>
        <div className="mt-4 h-[1px] w-32 overflow-hidden bg-white/10">
          <div className="h-full w-full origin-left animate-[loadbar_1.2s_ease-in-out_infinite] bg-white" />
        </div>
      </div>
    </div>
  );
}
