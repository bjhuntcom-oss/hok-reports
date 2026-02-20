"use client";

import Sidebar from "./sidebar";
import Header from "./header";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  userName: string;
  userRole: string;
}

export default function DashboardShell({
  children,
  userName,
  userRole,
}: DashboardShellProps) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar userRole={userRole} />
      <Header userName={userName} userRole={userRole} />
      <main
        className={cn(
          "pt-14 transition-all duration-300",
          sidebarOpen ? "pl-60" : "pl-16"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
