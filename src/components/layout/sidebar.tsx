"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Plus,
  User,
  BookOpen,
  Zap,
  Gavel,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole: string;
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { locale, sidebarOpen, toggleSidebar } = useAppStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Use stable defaults during SSR to prevent hydration mismatch
  const safeLocale = mounted ? locale : "fr";
  const safeSidebarOpen = mounted ? sidebarOpen : true;

  const mainNav = [
    { href: "/dashboard", icon: LayoutDashboard, label: t("nav.dashboard", safeLocale) },
    { href: "/sessions", icon: Mic, label: t("nav.sessions", safeLocale) },
    { href: "/sessions/new", icon: Plus, label: t("nav.newSession", safeLocale), accent: true },
    { href: "/flash", icon: Zap, label: t("nav.flashRecord", safeLocale), accent: true },
    { href: "/reports", icon: FileText, label: t("nav.reports", safeLocale) },
    { href: "/roles", icon: Gavel, label: t("nav.roles", safeLocale) },
  ];

  const secondaryNav = [
    ...(userRole === "admin"
      ? [{ href: "/admin", icon: Shield, label: t("nav.admin", safeLocale) }]
      : []),
    { href: "/profile", icon: User, label: t("nav.profile", safeLocale) },
    { href: "/settings", icon: Settings, label: t("nav.settings", safeLocale) },
    { href: "/documentation", icon: BookOpen, label: t("nav.documentation", safeLocale) },
  ];

  const renderLink = (item: { href: string; icon: any; label: string; accent?: boolean }) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href) && item.href !== "/sessions/new");
    const Icon = item.icon;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all duration-150 border-l-2",
            isActive
              ? "border-white bg-white/10 text-white"
              : item.accent
              ? "border-transparent bg-white/5 text-white hover:bg-white/10"
              : "border-transparent text-white/50 hover:bg-white/5 hover:text-white",
            !safeSidebarOpen && "justify-center px-0 border-l-0"
          )}
          title={!safeSidebarOpen ? item.label : undefined}
        >
          <Icon size={16} strokeWidth={1.5} />
          {safeSidebarOpen && <span>{item.label}</span>}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-white/8 bg-neutral-950 transition-all duration-300 flex flex-col",
        safeSidebarOpen ? "w-60" : "w-16"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-white/8 px-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center bg-white">
            <span className="text-sm font-black tracking-tight text-black">H</span>
          </div>
          {safeSidebarOpen && (
            <div className="flex flex-col leading-none">
              <span className="text-[12px] font-bold tracking-[0.2em] text-white uppercase">
                HOK
              </span>
              <span className="text-[8px] font-medium tracking-[0.15em] text-white/40 uppercase">
                Reports
              </span>
            </div>
          )}
        </Link>
        {safeSidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="flex h-6 w-6 items-center justify-center text-white/30 transition-colors hover:text-white"
          >
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {!safeSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="flex h-10 items-center justify-center text-white/30 transition-colors hover:text-white border-b border-white/8"
        >
          <ChevronRight size={14} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto py-3">
        {safeSidebarOpen && (
          <p className="mb-2 px-4 text-[9px] font-semibold tracking-[0.2em] text-white/20 uppercase">
            {t("nav.main", safeLocale)}
          </p>
        )}
        <ul className="space-y-0.5 px-2">
          {mainNav.map(renderLink)}
        </ul>

        {safeSidebarOpen && (
          <p className="mb-2 mt-6 px-4 text-[9px] font-semibold tracking-[0.2em] text-white/20 uppercase">
            {t("nav.system", safeLocale)}
          </p>
        )}
        {!safeSidebarOpen && <div className="my-3 mx-3 border-t border-white/8" />}
        <ul className="space-y-0.5 px-2">
          {secondaryNav.map(renderLink)}
        </ul>
      </nav>

      <div className="border-t border-white/8 px-3 py-3">
        {safeSidebarOpen ? (
          <div className="text-center">
            <p className="text-[9px] tracking-[0.15em] text-white/20 uppercase">
              Cabinet HOK — v1.0
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-1.5 w-1.5 bg-emerald-500" />
          </div>
        )}
      </div>
    </aside>
  );
}
