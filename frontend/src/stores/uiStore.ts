// ============================================================
// NEXUS-AID — UI Store (Zustand)
// Global UI state: sidebar, theme, language
// ============================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';
type Language = 'fr' | 'ar' | 'en';

interface UIState {
    // Sidebar
    sidebarCollapsed: boolean;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;

    // Theme
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;

    // Language
    language: Language;
    setLanguage: (lang: Language) => void;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            // Sidebar
            sidebarCollapsed: false,
            toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),

            // Theme
            themeMode: 'light',
            setThemeMode: (mode: ThemeMode) => set({ themeMode: mode }),
            toggleTheme: () =>
                set((state) => ({
                    themeMode: state.themeMode === 'light' ? 'dark' : 'light',
                })),

            // Language
            language: 'fr',
            setLanguage: (lang: Language) => set({ language: lang }),
        }),
        {
            name: 'nexus-aid-ui',
        }
    )
);
