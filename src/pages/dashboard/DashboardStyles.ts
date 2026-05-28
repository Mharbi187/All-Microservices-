// ============================================================
// NEXUS-AID — Enterprise Dashboard Design System
// Croissant-Rouge Tunisien · Dual-mode · Production-grade
// ============================================================

import React from 'react';
import {
    CrownOutlined, BookOutlined, HeartOutlined, TeamOutlined,
    MedicineBoxOutlined, HomeOutlined, SafetyOutlined, GlobalOutlined,
    AlertOutlined, ApartmentOutlined, InboxOutlined
} from '@ant-design/icons';

// ─── Core Palette ────────────────────────────────────────────
export const p = {
    // Red Crescent signature
    red900: '#7F1D1D',
    red700: '#B91C1C',
    red600: '#DC2626',
    red500: '#EF4444',
    red100: '#FEE2E2',
    redGlow: 'rgba(220,38,38,0.20)',

    // Operational greens
    grn700: '#14532D',
    grn600: '#16A34A',
    grn400: '#4ADE80',
    grn100: '#DCFCE7',
    grnGlow: 'rgba(22,163,74,0.18)',

    // Signal amber
    amb600: '#D97706',
    amb400: '#FBBF24',
    amb100: '#FEF3C7',
    ambGlow: 'rgba(217,119,6,0.18)',

    // Informational blue
    blu600: '#0284C7',
    blu400: '#38BDF8',
    blu100: '#E0F2FE',

    // Violet
    vio600: '#7C3AED',
    vio400: '#A78BFA',
    vio100: '#EDE9FE',

    // Neutrals — light mode
    ink: '#0C1523',
    ink2: '#1E293B',
    ink3: '#334155',
    slate: '#64748B',
    cloud: '#CBD5E1',
    fog: '#F1F5F9',
    mist: '#F8FAFC',
    snow: '#FFFFFF',

    // Dark mode
    d900: '#060B14',
    d800: '#0D1526',
    d700: '#111827',
    d600: '#1A2236',
    d500: '#232D42',
    d400: '#2E3A52',
    dBorder: 'rgba(255,255,255,0.07)',
    dMuted: 'rgba(255,255,255,0.45)',
    dFaint: 'rgba(255,255,255,0.22)',
};

// ─── Typography Tokens ────────────────────────────────────────
export const fonts = {
    display: "'Sora', 'Trebuchet MS', sans-serif",
    heading: "'Oswald', 'Impact', sans-serif",
    body: "'Nunito Sans', 'Segoe UI', sans-serif",
    data: "'JetBrains Mono', 'Courier New', monospace",
};

// ─── Spacing / Radius / Shadow ────────────────────────────────
export const r = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const sh = {
    xs: '0 1px 4px rgba(0,0,0,0.08)',
    sm: '0 2px 10px rgba(0,0,0,0.08)',
    md: '0 4px 20px rgba(0,0,0,0.10)',
    lg: '0 8px 40px rgba(0,0,0,0.14)',
    xl: '0 16px 56px rgba(0,0,0,0.18)',
    red: '0 0 24px rgba(220,38,38,0.28)',
    grn: '0 0 20px rgba(22,163,74,0.22)',
    amb: '0 0 20px rgba(217,119,6,0.22)',
    inset: 'inset 0 1px 0 rgba(255,255,255,0.08)',
};

// ─── Role Identity Config ─────────────────────────────────────
export const ROLE_CONFIG: Record<string, {
    accent: string; icon: React.ReactNode; title: string; subtitle: string; badge: string;
}> = {
    admin: {
        accent: '#7C3AED', icon: React.createElement(CrownOutlined),
        title: 'Administration Système',
        subtitle: 'Vue d\'ensemble complète · Nexus-AID',
        badge: 'Super Admin',
    },
    trainer: {
        accent: '#0284C7', icon: React.createElement(BookOutlined),
        title: 'Espace Formateur',
        subtitle: 'Formations & Certification · Croissant-Rouge',
        badge: 'Formateur',
    },
    donor: {
        accent: '#16A34A', icon: React.createElement(HeartOutlined),
        title: 'Espace Donateur',
        subtitle: 'Impact & Suivi de vos contributions',
        badge: 'Donateur',
    },
    volunteer: {
        accent: '#DC2626', icon: React.createElement(TeamOutlined),
        title: 'Tableau de Bord',
        subtitle: 'Opérations · Croissant-Rouge Tunisien',
        badge: 'Volontaire',
    },
};

// ─── Status / Priority Metadata ───────────────────────────────
export const SEVERITY_META: Record<string, { color: string; label: string }> = {
    CRITICAL: { color: p.red600, label: 'Critique' },
    HIGH: { color: p.amb600, label: 'Élevé' },
    MEDIUM: { color: p.blu600, label: 'Modéré' },
    LOW: { color: p.grn600, label: 'Faible' },
};

export const DOMAIN_META: Record<string, { icon: React.ReactNode; color: string; label: string; route: string }> = {
    RESP_JEUNESSE: { icon: React.createElement(TeamOutlined), color: '#5A78E6', label: 'Jeunesse', route: '/jeunesse' },
    RESP_SANTE: { icon: React.createElement(MedicineBoxOutlined), color: '#0284C7', label: 'Santé', route: '/sante' },
    RESP_SOCIAL: { icon: React.createElement(HomeOutlined), color: '#16A34A', label: 'Social', route: '/social' },
    RESP_VFF: { icon: React.createElement(SafetyOutlined), color: '#DC2626', label: 'VFF', route: '/vff' },
    RESP_IMMIGRATION: { icon: React.createElement(GlobalOutlined), color: '#7C3AED', label: 'Immigration', route: '/immigration' },
    RESP_SECOURISME: { icon: React.createElement(AlertOutlined), color: '#EF4444', label: 'Secourisme', route: '/secourisme' },
};

// ─── Theme Factory ─────────────────────────────────────────────
export const makeTheme = (isDark: boolean) => ({
    pageBg: isDark
        ? `radial-gradient(ellipse 140% 80% at -5% 0%, ${p.redGlow} 0%, transparent 45%),
       radial-gradient(ellipse 80% 60% at 105% 100%, ${p.grnGlow} 0%, transparent 45%),
       linear-gradient(175deg, ${p.d900} 0%, ${p.d800} 100%)`
        : `radial-gradient(ellipse 100% 60% at -2% -5%, rgba(220,38,38,0.06) 0%, transparent 45%),
       radial-gradient(ellipse 60% 50% at 105% 105%, rgba(22,163,74,0.05) 0%, transparent 45%),
       linear-gradient(175deg, #FFF5F5 0%, #F8FAFC 55%, #F0FDF4 100%)`,

    cardBg: isDark ? p.d600 : p.snow,
    cardBg2: isDark ? p.d500 : p.mist,
    cardBorder: isDark ? p.dBorder : 'rgba(0,0,0,0.07)',
    cardShadow: isDark ? `0 4px 24px rgba(0,0,0,0.4), ${sh.inset}` : sh.md,

    headerBg: isDark
        ? `linear-gradient(135deg, ${p.d700} 0%, ${p.d600} 100%)`
        : `linear-gradient(135deg, #FFFFFF 0%, #FFF5F5 100%)`,
    headerBorder: isDark ? `rgba(220,38,38,0.18)` : `rgba(220,38,38,0.12)`,

    sectionBg: isDark ? p.d600 : p.snow,
    sectionBorder: isDark ? p.dBorder : 'rgba(0,0,0,0.06)',

    text: isDark ? '#F0F4FF' : p.ink,
    textSub: isDark ? p.dMuted : p.slate,
    textFaint: isDark ? p.dFaint : p.cloud,
    divider: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : p.fog,
});

// ─── Global CSS injection ──────────────────────────────────────
export const injectDashboardStyles = (): void => {
    if (document.getElementById('nexus-dash-styles')) return;
    const el = document.createElement('style');
    el.id = 'nexus-dash-styles';
    el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Oswald:wght@500;600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');

    @keyframes nd-fadeUp {
      from { opacity:0; transform:translateY(18px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes nd-slideRight {
      from { opacity:0; transform:translateX(-14px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes nd-scaleIn {
      from { opacity:0; transform:scale(0.94); }
      to   { opacity:1; transform:scale(1); }
    }
    @keyframes nd-barGrow {
      from { height:4px !important; }
    }
    @keyframes nd-progress {
      from { width:0 !important; }
    }
    @keyframes nd-pulse-red {
      0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.4); }
      50%      { box-shadow:0 0 0 8px rgba(220,38,38,0); }
    }
    @keyframes nd-spin-slow {
      from { transform:rotate(0deg); }
      to   { transform:rotate(360deg); }
    }
    @keyframes nd-shimmer {
      0%   { background-position:-400px 0; }
      100% { background-position:400px 0; }
    }
    @keyframes nd-float {
      0%,100% { transform:translateY(0); }
      50%      { transform:translateY(-5px); }
    }
    @keyframes nd-badge-pulse {
      0%,100% { opacity:1; }
      50%      { opacity:0.6; }
    }

    /* Utility classes */
    .nd-fade-up    { animation: nd-fadeUp 0.45s ease both; }
    .nd-slide-r    { animation: nd-slideRight 0.4s ease both; }
    .nd-scale-in   { animation: nd-scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
    .nd-float      { animation: nd-float 3.5s ease-in-out infinite; }
    .nd-pulse-red  { animation: nd-pulse-red 2s infinite; }
    .nd-badge-live { animation: nd-badge-pulse 2s ease infinite; }

    .nd-kpi {
      transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 0.28s ease;
    }
    .nd-kpi:hover { transform: translateY(-5px) scale(1.02); }

    .nd-card {
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }
    .nd-card:hover { transform: translateY(-3px); }

    .nd-action {
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
                  background 0.18s ease, border-color 0.18s ease;
    }
    .nd-action:hover { transform: translateY(-3px) scale(1.03); }
    .nd-action:active { transform: scale(0.97); }

    .nd-row-hover {
      transition: transform 0.18s ease, background 0.18s ease;
    }
    .nd-row-hover:hover { transform: translateX(5px); }

    .nd-bar { animation: nd-barGrow 0.9s ease both; }
    .nd-progress { animation: nd-progress 1s ease both; }

    /* Responsive collapse */
    @media (max-width: 900px) {
      .nd-two-col { grid-template-columns: 1fr !important; }
    }
    @media (max-width: 640px) {
      .nd-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .nd-action-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 380px) {
      .nd-kpi-grid { grid-template-columns: 1fr !important; }
    }

    /* Scrollbar */
    ::-webkit-scrollbar { width:5px; height:5px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:rgba(220,38,38,0.28); border-radius:999px; }
  `;
    document.head.appendChild(el);
};

// ─── KPI card config helpers ───────────────────────────────────
export type KpiDef = {
    icon: React.ReactNode; label: string; accent: string;
    trend?: string; trendUp?: boolean; route?: string;
};

export const ADMIN_KPIS = (
    totalVolunteers: number, totalCommittees: number,
    totalStock: number, activeAlerts: number,
): Array<KpiDef & { value: number | string }> => [
        { icon: React.createElement(TeamOutlined), label: 'Volontaires', accent: p.grn600, value: totalVolunteers, trend: '↑ Approuvés', trendUp: true, route: '/volunteers' },
        { icon: React.createElement(ApartmentOutlined), label: 'Comités', accent: p.vio600, value: totalCommittees, trend: 'Actifs', route: '/committees' },
        { icon: React.createElement(InboxOutlined), label: 'En Stock', accent: '#5A78E6', value: totalStock, trend: 'Articles', route: '/stocks' },
        { icon: React.createElement(AlertOutlined), label: 'Alertes', accent: p.red600, value: activeAlerts, trend: activeAlerts > 0 ? 'Action requise' : 'RAS', trendUp: activeAlerts === 0, route: '/stocks' },
    ];