import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Locale } from "./i18n";

interface AppState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: "fr",
      setLocale: (locale) => set({ locale }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    }),
    {
      name: "hok-app-store",
      partialize: (state) => ({ locale: state.locale, sidebarOpen: state.sidebarOpen }),
    }
  )
);
