// ============================================================
// NEXUS-AID — Design System & Style Utilities
// Red Crescent / Croissant-Rouge inspired palette
// ============================================================

// ─── Color Palette ───────────────────────────────────────────
import React from 'react';
import {
    ClockCircleOutlined,
    InboxOutlined,
    CheckCircleOutlined,
    QuestionCircleOutlined,
    CoffeeOutlined,
    MedicineBoxOutlined,
    ToolOutlined,
    SkinOutlined,
    AlertOutlined,
    ExclamationCircleFilled,
    InfoCircleFilled,
    CheckCircleFilled
} from '@ant-design/icons';

export const palette = {
    // Primary — Croissant-Rouge red
    redDeep: '#B91C1C',
    redCore: '#DC2626',
    redBright: '#EF4444',
    redSoft: '#FEE2E2',
    redGlow: 'rgba(220,38,38,0.18)',

    // Secondary — humanitarian green
    greenDeep: '#14532D',
    greenCore: '#16A34A',
    greenBright: '#4ADE80',
    greenSoft: '#DCFCE7',
    greenGlow: 'rgba(22,163,74,0.15)',

    // Accent — warm gold / amber
    goldCore: '#D97706',
    goldSoft: '#FEF3C7',
    goldGlow: 'rgba(217,119,6,0.15)',

    // Neutrals
    ink: '#0F172A',
    inkMid: '#1E293B',
    inkLight: '#334155',
    slate: '#64748B',
    mist: '#CBD5E1',
    fog: '#F1F5F9',
    snow: '#FFFFFF',

    // Dark mode surfaces
    darkBase: '#0A0F1E',
    darkSurface: '#111827',
    darkCard: '#1A2236',
    darkBorder: 'rgba(255,255,255,0.07)',
    darkMuted: 'rgba(255,255,255,0.45)',
};

// ─── Typography ──────────────────────────────────────────────
export const fonts = {
    display: "'Playfair Display', 'Georgia', serif",
    heading: "'Barlow Condensed', 'Franklin Gothic Medium', sans-serif",
    body: "'DM Sans', 'Helvetica Neue', sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
};

// ─── Shadows ─────────────────────────────────────────────────
export const shadows = {
    sm: '0 2px 8px rgba(0,0,0,0.06)',
    md: '0 4px 20px rgba(0,0,0,0.10)',
    lg: '0 8px 40px rgba(0,0,0,0.14)',
    xl: '0 16px 64px rgba(0,0,0,0.18)',
    redGlow: '0 0 28px rgba(220,38,38,0.30)',
    greenGlow: '0 0 24px rgba(22,163,74,0.25)',
    inset: 'inset 0 1px 0 rgba(255,255,255,0.10)',
};

// ─── Radii ───────────────────────────────────────────────────
export const radius = {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 32,
    pill: 999,
};

// ─── Transitions ─────────────────────────────────────────────
export const transitions = {
    fast: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    normal: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
};

// ─── Theme-aware style generators ────────────────────────────
export const makeTheme = (isDark: boolean) => ({
    bg: isDark
        ? `radial-gradient(ellipse 120% 80% at 0% 0%, ${palette.redGlow} 0%, transparent 50%),
       radial-gradient(ellipse 80% 60% at 100% 100%, ${palette.greenGlow} 0%, transparent 50%),
       linear-gradient(160deg, ${palette.darkBase} 0%, ${palette.darkSurface} 100%)`
        : `radial-gradient(ellipse 100% 60% at 0% -10%, rgba(220,38,38,0.06) 0%, transparent 50%),
       radial-gradient(ellipse 70% 50% at 100% 110%, rgba(22,163,74,0.05) 0%, transparent 50%),
       linear-gradient(170deg, #FFF5F5 0%, #F8FAFC 60%, #F0FDF4 100%)`,

    cardBg: isDark ? palette.darkCard : palette.snow,
    cardBorder: isDark ? palette.darkBorder : 'rgba(0,0,0,0.07)',
    cardShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : shadows.md,

    text: isDark ? '#F1F5F9' : palette.ink,
    textMuted: isDark ? palette.darkMuted : palette.slate,
    textFaint: isDark ? 'rgba(255,255,255,0.28)' : palette.mist,

    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : palette.fog,
});

// ─── Status configs ───────────────────────────────────────────
export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    PENDING_RECEPTION: {
        label: 'En attente',
        color: palette.goldCore,
        bg: palette.goldSoft,
        icon: <ClockCircleOutlined />,
    },
    RECEIVED: {
        label: 'Reçu',
        color: '#0EA5E9',
        bg: '#E0F2FE',
        icon: <InboxOutlined />,
    },
    VALIDATED: {
        label: 'Validé',
        color: palette.greenCore,
        bg: palette.greenSoft,
        icon: <CheckCircleOutlined />,
    },
    DEFAULT: {
        label: 'Inconnu',
        color: palette.slate,
        bg: palette.fog,
        icon: <QuestionCircleOutlined />,
    },
};

export const TYPE_META: Record<string, { color: string; emoji: React.ReactNode }> = {
    'Alimentaire': { color: palette.greenCore, emoji: <CoffeeOutlined /> },
    'Médical': { color: '#0EA5E9', emoji: <MedicineBoxOutlined /> },
    'Équipement': { color: '#8B5CF6', emoji: <ToolOutlined /> },
    'Vêtements': { color: palette.goldCore, emoji: <SkinOutlined /> },
    'Urgence': { color: palette.redCore, emoji: <AlertOutlined /> },
};

export const PRIORITY_META: Record<string, { color: string; label: string; dot: React.ReactNode }> = {
    URGENT: { color: palette.redCore, label: 'URGENT', dot: <ExclamationCircleFilled /> },
    NORMAL: { color: palette.goldCore, label: 'NORMAL', dot: <InfoCircleFilled /> },
    LOW: { color: palette.greenCore, label: 'Faible', dot: <CheckCircleFilled /> },
};

// ─── Keyframe injection (call once in root) ──────────────────
export const injectGlobalStyles = () => {
    if (document.getElementById('nexusaid-global')) return;
    const style = document.createElement('style');
    style.id = 'nexusaid-global';
    style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Barlow+Condensed:wght@500;600;700&family=DM+Sans:wght@400;500;600&display=swap');

    *, *::before, *::after { box-sizing: border-box; }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-16px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes pulse-red {
      0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.4); }
      50%       { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
    }
    @keyframes pulse-green {
      0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.35); }
      50%       { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes crescent-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-6px); }
    }

    .nexus-fade-up  { animation: fadeUp 0.5s ease both; }
    .nexus-slide-in { animation: slideIn 0.4s ease both; }

    .nexus-card-hover {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .nexus-card-hover:hover {
      transform: translateY(-4px);
    }

    .nexus-stat-hover {
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .nexus-stat-hover:hover {
      transform: translateY(-6px) scale(1.02);
    }

    .nexus-action-btn {
      transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .nexus-action-btn:hover {
      transform: translateY(-3px) scale(1.04);
    }
    .nexus-action-btn:active {
      transform: scale(0.97);
    }

    .nexus-urgent-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 16px 48px rgba(220,38,38,0.15) !important;
    }
    .nexus-urgent-card { transition: all 0.25s ease; }

    .nexus-donation-row:hover {
      transform: translateX(4px);
    }
    .nexus-donation-row { transition: all 0.2s ease; }

    .pulse-red   { animation: pulse-red 2s infinite; }
    .pulse-green { animation: pulse-green 2s infinite; }
    .float-anim  { animation: float 3s ease-in-out infinite; }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.3); border-radius: 999px; }
  `;
    document.head.appendChild(style);
};