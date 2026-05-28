// ============================================================
// NEXUS-AID — Radar / Crisis Design System
// Croissant-Rouge Tunisien · Dual-mode · Fully Responsive
// Mirrors the Dashboard design language
// ============================================================

// ─── Core Palette ─────────────────────────────────────────────
export const rp = {
    red600: '#DC2626',
    red500: '#EF4444',
    red400: '#F87171',
    red100: '#FEE2E2',
    redGlow: 'rgba(220,38,38,0.20)',

    grn600: '#16A34A',
    grn500: '#22C55E',
    grn100: '#DCFCE7',

    amb600: '#D97706',
    amb500: '#F59E0B',
    amb100: '#FEF3C7',

    blu600: '#0284C7',
    blu500: '#3B82F6',
    blu100: '#E0F2FE',

    vio600: '#7C3AED',
    vio400: '#A78BFA',

    cyan600: '#0891B2',
    cyan500: '#06B6D4',

    // Neutrals light
    ink: '#0C1523',
    ink2: '#1E293B',
    ink3: '#334155',
    slate: '#64748B',
    cloud: '#CBD5E1',
    fog: '#F1F5F9',
    mist: '#F8FAFC',
    snow: '#FFFFFF',

    // Neutrals dark
    d900: '#060B14',
    d800: '#0D1526',
    d700: '#111827',
    d600: '#0F172A',
    d500: '#1E293B',
    d400: '#334155',
    dBorder: 'rgba(255,255,255,0.07)',
    dMuted: 'rgba(255,255,255,0.55)',
    dFaint: 'rgba(255,255,255,0.28)',
};

// ─── Radius / Shadow ──────────────────────────────────────────
export const rr = { xs: 6, sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

export const rsh = {
    sm: '0 2px 10px rgba(0,0,0,0.08)',
    md: '0 4px 20px rgba(0,0,0,0.10)',
    lg: '0 8px 40px rgba(0,0,0,0.14)',
    red: '0 0 24px rgba(220,38,38,0.28)',
    inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
};

// ─── Typography ───────────────────────────────────────────────
export const rfont = {
    display: "'Sora', 'Trebuchet MS', sans-serif",
    body: "'Nunito Sans', 'Segoe UI', sans-serif",
    data: "'JetBrains Mono', 'Courier New', monospace",
};

// ─── Theme factory ────────────────────────────────────────────
export const makeRadarTheme = (isDark: boolean) => ({
    pageBg: isDark
        ? `linear-gradient(160deg, ${rp.d900} 0%, ${rp.d800} 60%, ${rp.d700} 100%)`
        : `linear-gradient(160deg, #F8FAFC 0%, #F1F5F9 60%, #EFF6FF 100%)`,

    sidebarBg: isDark ? rp.d600 : '#FFFFFF',
    sidebarBorder: isDark ? rp.d400 : 'rgba(0,0,0,0.08)',

    topbarBg: isDark
        ? `linear-gradient(90deg, ${rp.d800} 0%, ${rp.d700} 100%)`
        : `linear-gradient(90deg, #FFFFFF 0%, #F8FAFC 100%)`,
    topbarBorder: isDark ? rp.d400 : 'rgba(0,0,0,0.07)',

    cardBg: isDark ? 'rgba(30,41,59,0.9)' : '#FFFFFF',
    cardBorder: isDark ? rp.d400 : 'rgba(0,0,0,0.06)',
    cardShadow: isDark ? `0 4px 24px rgba(0,0,0,0.4), ${rsh.inset}` : rsh.sm,

    text: isDark ? '#F0F4FF' : rp.ink,
    textSub: isDark ? rp.dMuted : rp.slate,
    textFaint: isDark ? rp.dFaint : rp.cloud,

    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    rowHoverBg: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    inputBg: isDark ? 'rgba(255,255,255,0.04)' : rp.fog,

    tableRowBg: isDark ? 'rgba(15,23,42,0.0)' : '#FFFFFF',
    tableHeaderBg: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC',

    alertWarningBg: isDark ? 'rgba(217,119,6,0.12)' : rp.amb100,
    alertWarningBorder: isDark ? 'rgba(217,119,6,0.3)' : 'rgba(217,119,6,0.25)',
    alertWarningText: isDark ? rp.amb500 : rp.amb600,
});

// ─── Status color helpers ─────────────────────────────────────
export const riskColor = (score: number) =>
    score > 0.85 ? rp.red500 : score > 0.7 ? rp.amb500 : score > 0.4 ? rp.blu500 : rp.grn500;

export const riskLabel = (score: number) =>
    score > 0.85 ? 'CRITIQUE' : score > 0.7 ? 'ÉLEVÉ' : score > 0.4 ? 'MODÉRÉ' : 'FAIBLE';

// ─── CSS Injection ─────────────────────────────────────────────
export const injectRadarStyles = (): void => {
    if (document.getElementById('nexus-radar-styles')) return;
    const el = document.createElement('style');
    el.id = 'nexus-radar-styles';
    el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Nunito+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

    /* ── Keyframe animations ── */
    @keyframes rd-fadeUp {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes rd-slideRight {
      from { opacity:0; transform:translateX(-14px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes rd-scaleIn {
      from { opacity:0; transform:scale(0.94); }
      to   { opacity:1; transform:scale(1); }
    }
    @keyframes rd-pulse-dot {
      0%,100% { box-shadow:0 0 0 0 rgba(22,163,74,0.5); }
      50%      { box-shadow:0 0 0 6px rgba(22,163,74,0); }
    }
    @keyframes rd-pulse-red {
      0%,100% { box-shadow:0 0 0 0 rgba(220,38,38,0.4); }
      50%      { box-shadow:0 0 0 8px rgba(220,38,38,0); }
    }
    @keyframes rd-shimmer {
      0%   { background-position:-400px 0; }
      100% { background-position:400px 0; }
    }
    @keyframes rd-barSlide {
      from { width:0 !important; }
    }
    @keyframes rd-float {
      0%,100% { transform:translateY(0); }
      50%      { transform:translateY(-4px); }
    }
    @keyframes rd-spin {
      from { transform:rotate(0deg); }
      to   { transform:rotate(360deg); }
    }

    /* ── Utility classes ── */
    .rd-fade-up  { animation: rd-fadeUp 0.42s ease both; }
    .rd-slide-r  { animation: rd-slideRight 0.38s ease both; }
    .rd-scale-in { animation: rd-scaleIn 0.38s cubic-bezier(0.34,1.56,0.64,1) both; }
    .rd-float    { animation: rd-float 3s ease-in-out infinite; }

    .rd-card {
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 0.25s ease;
    }
    .rd-card:hover { transform: translateY(-3px); }

    .rd-kpi {
      transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1),
                  box-shadow 0.28s ease;
    }
    .rd-kpi:hover { transform: translateY(-5px) scale(1.02); }

    .rd-action {
      transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1),
                  background 0.18s ease, border-color 0.18s ease;
    }
    .rd-action:hover  { transform: translateY(-3px) scale(1.03); }
    .rd-action:active { transform: scale(0.97); }

    .rd-row-hover {
      transition: background 0.18s ease;
      cursor: pointer;
    }
    .rd-row-hover:hover { background: rgba(220,38,38,0.04) !important; }

    .rd-bar-animate { animation: rd-barSlide 0.7s ease both; }

    .rd-pulse-live { animation: rd-pulse-dot 2s infinite; }
    .rd-pulse-red  { animation: rd-pulse-red 2s infinite; }

    /* ── Scrollbar ── */
    .rd-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
    .rd-scroll::-webkit-scrollbar-track { background: transparent; }
    .rd-scroll::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.25); border-radius: 999px; }

    /* ── Ant Design overrides scoped to radar ── */
    .rd-table .ant-table { background: transparent !important; }
    .rd-table .ant-table-thead > tr > th {
      font-family: 'Nunito Sans', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      border-bottom-color: rgba(255,255,255,0.06) !important;
      background: transparent !important;
    }
    .rd-table-light .ant-table-thead > tr > th {
      background: #F8FAFC !important;
      color: #64748B !important;
      border-bottom-color: rgba(0,0,0,0.06) !important;
    }
    .rd-table .ant-table-tbody > tr > td {
      border-bottom-color: rgba(255,255,255,0.04) !important;
      background: transparent !important;
    }
    .rd-table-light .ant-table-tbody > tr > td {
      border-bottom-color: rgba(0,0,0,0.04) !important;
    }
    .rd-table .ant-table-tbody > tr:hover > td {
      background: rgba(220,38,38,0.05) !important;
    }
    .rd-table .ant-empty-description { color: #64748b !important; }

    /* ── Light mode Ant Design Selects in Radar ── */
    .rd-select-light .ant-select-selector {
      background: #F1F5F9 !important;
      border-color: rgba(0,0,0,0.1) !important;
      color: #0C1523 !important;
    }
    .rd-select-light .ant-select-arrow { color: #64748B !important; }

    /* ── Responsive ── */
    @media (max-width: 1200px) {
      .rd-main-grid { flex-direction: column !important; }
      .rd-map-col { min-height: 320px !important; }
      .rd-right-col { overflow: visible !important; }
    }
    @media (max-width: 900px) {
      .rd-kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
      .rd-bottom-row { flex-direction: column !important; }
    }
    @media (max-width: 640px) {
      .rd-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
      .rd-topbar-center { display: none !important; }
      .rd-sim-btn span { display: none !important; }
    }
    @media (max-width: 420px) {
      .rd-kpi-grid { grid-template-columns: 1fr 1fr !important; }
    }
  `;
    document.head.appendChild(el);
};
