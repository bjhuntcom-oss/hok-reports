"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Globe, User, ChevronDown } from "lucide-react";
import { signOut } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  userName: string;
  userRole: string;
}

export default function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter();
  const { locale, setLocale, sidebarOpen } = useAppStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    try {
      await signOut({ redirect: false });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  const languages: { code: Locale; label: string }[] = [
    { code: "fr", label: "FR" },
    { code: "en", label: "EN" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-5 transition-all duration-300",
        sidebarOpen ? "left-60" : "left-16"
      )}
    >
      <div className="flex items-center gap-3">
        <h2 className="text-[13px] font-medium text-neutral-600">
          {t("dash.welcome", locale)}, <span className="font-semibold text-black">{userName}</span>
        </h2>
        {userRole === "admin" && (
          <span className="bg-black px-2 py-0.5 text-[9px] font-bold tracking-[0.15em] text-white uppercase">
            {t("header.admin", locale)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center border border-neutral-200">
          <Globe size={12} className="ml-2 text-neutral-400" />
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              className={cn(
                "px-2.5 py-1.5 text-[10px] font-semibold tracking-wide transition-colors",
                locale === lang.code
                  ? "bg-black text-white"
                  : "text-neutral-400 hover:text-black"
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-neutral-200" />

        <div ref={menuRef} className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 text-[12px] font-medium text-neutral-600 transition-colors hover:text-black"
          >
            <div className="flex h-7 w-7 items-center justify-center bg-neutral-100">
              <User size={13} className="text-neutral-500" />
            </div>
            <ChevronDown size={12} className={cn("transition-transform", userMenuOpen && "rotate-180")} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 border border-neutral-200 bg-white shadow-lg">
              <div className="border-b border-neutral-100 px-3 py-2.5">
                <p className="text-[11px] font-semibold text-black">{userName}</p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wide">
                  {userRole === "admin" ? t("header.admin", locale) : t("header.user", locale)}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-black"
              >
                <User size={12} />
                {t("nav.profile", locale)}
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2 text-[11px] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-red-600"
              >
                <LogOut size={12} />
                {t("auth.logout", locale)}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
