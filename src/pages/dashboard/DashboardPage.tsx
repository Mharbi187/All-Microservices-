// ============================================================
// NEXUS-AID — Enterprise Dashboard v4.0 (Redesign)
// Croissant-Rouge Tunisien · Dual-mode · Fully Responsive
// ============================================================

import React, { useState, useEffect } from 'react';
import { Row, Col, Progress, Tooltip, Badge, Spin, Empty, Button } from 'antd';
import {
    TeamOutlined, AlertOutlined, InboxOutlined, GiftOutlined,
    HeartOutlined, ApartmentOutlined, ClockCircleOutlined,
    EnvironmentOutlined, FileTextOutlined, ThunderboltOutlined,
    BellOutlined, CheckCircleOutlined, BarChartOutlined,
    MedicineBoxOutlined, SoundOutlined, HomeOutlined, GlobalOutlined,
    CrownOutlined, BookOutlined, TrophyOutlined, SettingOutlined,
    FundOutlined, CalendarOutlined, StarOutlined, SafetyOutlined,
    AuditOutlined, InfoCircleOutlined, PlusOutlined, UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/stores';
import { getUserPermissions } from '@/config/roleConfig';
import committeeService from '@/services/committeeService';
import volunteerService from '@/services/volunteerService';
import inventoryService from '@/services/inventoryService';
import { secourismeService } from '@/services/domainServices';
import type { CommitteeOverview, InventoryItemDTO, StockAlertDTO } from '@/types';
import calendarService from '@/services/calendarService';
import type { CalendarEventDTO } from '@/services/calendarService';
import quizService from '@/services/quizService';
import type { QuizResultDTO } from '@/services/quizService';

import {
    p, r, sh, fonts, makeTheme, ROLE_CONFIG, SEVERITY_META, DOMAIN_META,
    injectDashboardStyles,
} from './DashboardStyles';

// ─── Inject global styles once ────────────────────────────────
injectDashboardStyles();

// ─────────────────────────────────────────────────────────────
// SVG Sparkline
// ─────────────────────────────────────────────────────────────
const Sparkline: React.FC<{ data: number[]; color: string; h?: number }> = ({
    data, color, h = 38,
}) => {
    const w = 80;
    const max = Math.max(...data, 1);
    const pts = data
        .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4)}`)
        .join(' ');
    return (
        <svg width={w} height={h} style={{ opacity: 0.65 }}>
            <defs>
                <linearGradient id={`spk-${color.replace('#', '')}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                    <stop offset="100%" stopColor={color} stopOpacity="1" />
                </linearGradient>
            </defs>
            <polyline
                fill="none"
                stroke={`url(#spk-${color.replace('#', '')})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pts}
            />
        </svg>
    );
};

// ─────────────────────────────────────────────────────────────
// Crescent SVG emblem
// ─────────────────────────────────────────────────────────────
const CrescentMark: React.FC<{ size?: number; opacity?: number }> = ({
    size = 32, opacity = 1,
}) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ opacity }}>
        <circle cx="16" cy="16" r="15" fill="rgba(220,38,38,0.10)" stroke={p.red600} strokeWidth="1.2" />
        <path d="M21 8a9 9 0 1 1-10.5 13.5A7.2 7.2 0 1 0 21 8z" fill={p.red600} />
        <rect x="23" y="14.5" width="7" height="2.2" rx="1.1" fill={p.red600} />
        <rect x="25.4" y="12.1" width="2.2" height="7" rx="1.1" fill={p.red600} />
    </svg>
);

// ─────────────────────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────────────────────
interface KpiProps {
    icon: React.ReactNode; value: number | string; label: string;
    accent: string; trend?: string; trendUp?: boolean;
    isDark: boolean; delay?: number; onClick?: () => void;
    sparkData?: number[];
}

const KpiCard: React.FC<KpiProps> = ({
    icon, value, label, accent, trend, trendUp = true,
    isDark, delay = 0, onClick, sparkData,
}) => {
    const t = makeTheme(isDark);
    return (
        <div
            className="nd-kpi nd-fade-up"
            onClick={onClick}
            style={{
                animationDelay: `${delay}ms`,
                background: isDark
                    ? `linear-gradient(150deg, ${t.cardBg}, ${accent}14)`
                    : `linear-gradient(150deg, #fff, ${accent}07)`,
                borderRadius: r.lg,
                padding: '22px 20px',
                border: `1px solid ${isDark ? `${accent}22` : `${accent}18`}`,
                boxShadow: isDark
                    ? `0 4px 22px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
                    : `0 3px 16px ${accent}14`,
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative', overflow: 'hidden',
                height: '100%', display: 'flex', flexDirection: 'column', gap: 14,
            }}
        >
            {/* Decorative corner arc */}
            <div style={{
                position: 'absolute', top: -28, right: -28,
                width: 88, height: 88, borderRadius: '50%',
                background: `${accent}10`, pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: -12, right: -12,
                width: 52, height: 52, borderRadius: '50%',
                border: `1px dashed ${accent}18`, pointerEvents: 'none',
            }} />

            {/* Icon */}
            <div style={{
                width: 46, height: 46, borderRadius: r.md,
                background: isDark ? `${accent}20` : `${accent}10`,
                border: `1px solid ${accent}22`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: accent,
            }}>
                {icon}
            </div>

            {/* Value + sparkline */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <div style={{
                        fontFamily: fonts.heading, fontSize: 40, fontWeight: 700,
                        lineHeight: 1, color: isDark ? '#F0F4FF' : p.ink,
                        letterSpacing: '-0.5px',
                    }}>
                        {value}
                    </div>
                    <div style={{
                        fontFamily: fonts.body, fontSize: 12, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        color: t.textSub, marginTop: 5,
                    }}>
                        {label}
                    </div>
                </div>
                {sparkData && <Sparkline data={sparkData} color={accent} />}
            </div>

            {/* Trend pill */}
            {trend && (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: isDark ? `${trendUp ? p.grn600 : p.red600}18` : `${trendUp ? p.grn600 : p.red600}10`,
                    color: trendUp ? p.grn600 : p.red600,
                    borderRadius: r.pill, padding: '3px 10px',
                    fontSize: 11, fontWeight: 700, fontFamily: fonts.body,
                    border: `1px solid ${trendUp ? p.grn600 : p.red600}22`,
                    width: 'fit-content',
                }}>
                    {trend}
                </div>
            )}

            {/* Bottom gradient bar */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${accent}, transparent)`,
            }} />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Section Card Wrapper
// ─────────────────────────────────────────────────────────────
const SCard: React.FC<{
    title: React.ReactNode; extra?: React.ReactNode;
    children: React.ReactNode; isDark: boolean;
    accentLine?: string; style?: React.CSSProperties;
}> = ({ title, extra, children, isDark, accentLine, style }) => {
    const t = makeTheme(isDark);
    return (
        <div style={{
            background: t.sectionBg, borderRadius: r.lg,
            border: `1px solid ${t.sectionBorder}`,
            boxShadow: isDark ? `0 4px 22px rgba(0,0,0,0.35), ${sh.inset}` : sh.sm,
            overflow: 'hidden', position: 'relative',
            ...style,
        }}>
            {accentLine && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${accentLine}, transparent)`,
                }} />
            )}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: `1px solid ${t.divider}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: fonts.body }}>
                    {title}
                </div>
                {extra}
            </div>
            <div style={{ padding: '16px 20px 20px' }}>{children}</div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Quick Action Button
// ─────────────────────────────────────────────────────────────
const QAction: React.FC<{
    icon: React.ReactNode; label: string; desc: string;
    accent: string; isDark: boolean; onClick: () => void;
}> = ({ icon, label, desc, accent, isDark, onClick }) => {
    const t = makeTheme(isDark);
    return (
        <div
            className="nd-action"
            onClick={onClick}
            style={{
                borderRadius: r.md, padding: '16px 14px',
                background: isDark ? `${accent}0E` : `${accent}07`,
                border: `1px solid ${accent}20`,
                cursor: 'pointer', textAlign: 'center',
            }}
        >
            <div style={{ fontSize: 26, marginBottom: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{icon}</div>
            <div style={{
                fontFamily: fonts.body, fontSize: 12, fontWeight: 700,
                color: accent, marginBottom: 3,
            }}>
                {label}
            </div>
            <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint }}>
                {desc}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Bar Chart
// ─────────────────────────────────────────────────────────────
const BarChart: React.FC<{ data: CommitteeOverview[]; isDark: boolean }> = ({
    data, isDark,
}) => {
    const t = makeTheme(isDark);
    const max = Math.max(...data.map((c) => c.totalVolunteers || 0), 1);
    if (!data.length) return <Empty description="Aucune donnée" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '12px 0 4px', height: 180 }}>
            {data.slice(0, 7).map((c, i) => {
                const pct = ((c.totalVolunteers || 0) / max) * 100;
                const barH = Math.max((pct / 100) * 138, 8);
                const shade = i % 3 === 0 ? p.red600 : i % 3 === 1 ? p.red700 : p.red500;
                return (
                    <Tooltip key={c.id} title={`${c.name}: ${c.totalVolunteers || 0} volontaires`}>
                        <div style={{
                            flex: 1, display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 5,
                        }}>
                            <span style={{
                                fontFamily: fonts.data, fontSize: 11, fontWeight: 700,
                                color: isDark ? 'rgba(255,255,255,0.7)' : p.ink3,
                            }}>
                                {c.totalVolunteers || 0}
                            </span>
                            <div
                                className="nd-bar"
                                style={{
                                    width: '72%', height: barH,
                                    borderRadius: '5px 5px 3px 3px',
                                    background: `linear-gradient(180deg, ${shade}, ${shade}bb)`,
                                    boxShadow: isDark ? `0 0 10px ${shade}33` : `0 3px 10px ${shade}28`,
                                    animationDelay: `${i * 80}ms`,
                                }}
                            />
                            <span style={{
                                fontFamily: fonts.body, fontSize: 10, textAlign: 'center',
                                color: t.textFaint, lineHeight: 1.2,
                            }}>
                                {(c.region || c.name || '').slice(0, 6)}
                            </span>
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Progress Row
// ─────────────────────────────────────────────────────────────
const ProgRow: React.FC<{
    label: string; value: number; max: number;
    color: string; isDark: boolean; suffix?: string;
}> = ({ label, value, max, color, isDark, suffix = '' }) => {
    const t = makeTheme(isDark);
    const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
    return (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
                fontFamily: fonts.body, fontSize: 12, fontWeight: 500,
                color: isDark ? 'rgba(255,255,255,0.75)' : p.ink3,
                width: 80, flexShrink: 0, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
                {label}
            </span>
            <div style={{
                flex: 1, height: 7, borderRadius: r.pill,
                background: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
                overflow: 'hidden',
            }}>
                <div
                    className="nd-progress"
                    style={{
                        height: '100%', width: `${pct}%`,
                        background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                        borderRadius: r.pill,
                        animationDuration: '1.1s',
                    }}
                />
            </div>
            <span style={{
                fontFamily: fonts.data, fontSize: 11, fontWeight: 700,
                color, width: 30, textAlign: 'right', flexShrink: 0,
            }}>
                {suffix || value}
            </span>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// DASHBOARD HEADER
// ─────────────────────────────────────────────────────────────
const DashHeader: React.FC<{
    user: any; dt: string; permissions: any;
    activeAlerts: number; isDark: boolean; navigate: (p: string) => void;
}> = ({ user, dt, permissions, activeAlerts, isDark, navigate }) => {
    const t = makeTheme(isDark);
    const cfg = ROLE_CONFIG[dt] || ROLE_CONFIG.volunteer;
    const firstName = user?.fullName?.split(' ')[0] || 'Utilisateur';

    return (
        <div
            className="nd-fade-up"
            style={{
                background: t.headerBg,
                border: `1px solid ${t.headerBorder}`,
                borderRadius: r.xl, marginBottom: 24,
                padding: '28px 32px',
                boxShadow: isDark
                    ? `0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
                    : `0 6px 32px rgba(220,38,38,0.07)`,
                position: 'relative', overflow: 'hidden',
            }}
        >
            {/* Background CrescentMark */}
            <div style={{ position: 'absolute', top: -16, right: 24, pointerEvents: 'none' }}>
                <CrescentMark size={90} opacity={isDark ? 0.08 : 0.06} />
            </div>
            <div style={{ position: 'absolute', bottom: -24, right: 160, pointerEvents: 'none' }}>
                <CrescentMark size={50} opacity={isDark ? 0.05 : 0.04} />
            </div>

            <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 20,
            }}>
                {/* Left: identity */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                    {/* Role icon */}
                    <div style={{
                        width: 60, height: 60, borderRadius: r.lg,
                        background: isDark ? `${cfg.accent}20` : `${cfg.accent}12`,
                        border: `1.5px solid ${cfg.accent}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 28,
                    }} className="nd-float">
                        {cfg.icon}
                    </div>

                    <div>
                        {/* Breadcrumb */}
                        <div style={{
                            fontFamily: fonts.body, fontSize: 12,
                            color: t.textFaint, marginBottom: 4,
                        }}>
                            Nexus-AID &nbsp;›&nbsp; {cfg.title}
                        </div>
                        <div style={{
                            fontFamily: fonts.display, fontSize: 23, fontWeight: 700,
                            color: isDark ? '#F0F4FF' : p.ink, lineHeight: 1.1, marginBottom: 4,
                        }}>
                            {cfg.title}
                        </div>
                        <div style={{
                            fontFamily: fonts.body, fontSize: 13,
                            color: t.textSub,
                        }}>
                            Bienvenue {firstName} — {permissions.label}
                        </div>
                    </div>
                </div>

                {/* Right: badges + alert */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

                    {/* Alerts badge */}
                    {activeAlerts > 0 && (
                        <div
                            onClick={() => navigate('/stocks')}
                            className="nd-action"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                background: isDark ? `${p.red600}18` : p.red100,
                                border: `1px solid ${p.red600}30`,
                                borderRadius: r.pill, padding: '6px 14px',
                                cursor: 'pointer',
                            }}
                        >
                            <BellOutlined style={{ color: p.red600, fontSize: 13 }} />
                            <span style={{
                                fontFamily: fonts.body, fontSize: 12, fontWeight: 700,
                                color: p.red600,
                            }}>
                                {activeAlerts} Alertes
                            </span>
                        </div>
                    )}

                    {/* National badge */}
                    {user?.roles?.some((r: any) => r.committeeType === 'NATIONAL') && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            background: isDark ? 'rgba(251,191,36,0.12)' : p.amb100,
                            border: `1px solid rgba(217,119,6,0.25)`,
                            borderRadius: r.pill, padding: '6px 14px',
                        }}>
                            <GlobalOutlined style={{ color: p.amb600, fontSize: 13 }} />
                            <span style={{
                                fontFamily: fonts.body, fontSize: 12, fontWeight: 600,
                                color: p.amb600,
                            }}>
                                Siège National
                            </span>
                        </div>
                    )}

                    {/* Role pill */}
                    <div style={{
                        background: `linear-gradient(135deg, ${p.red700}, ${p.red500})`,
                        borderRadius: r.pill, padding: '7px 18px',
                        display: 'flex', alignItems: 'center', gap: 7,
                        boxShadow: sh.red,
                    }}>
                        <CrescentMark size={16} />
                        <span style={{
                            fontFamily: fonts.body, fontSize: 13, fontWeight: 700,
                            color: '#fff',
                        }}>
                            {permissions.label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────
const AdminDash: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
    totalVolunteers: number; totalCommittees: number;
    totalStock: number; activeAlerts: number;
    committees: CommitteeOverview[]; alerts: StockAlertDTO[];
}> = ({ isDark, navigate, totalVolunteers, totalCommittees, totalStock, activeAlerts, committees, alerts }) => {
    const t = makeTheme(isDark);

    return (
        <>
            {/* KPI row */}
            <div className="nd-kpi-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16, marginBottom: 20,
            }}>
                {[
                    { icon: <TeamOutlined />, value: totalVolunteers, label: 'Volontaires', accent: p.grn600, trend: '↑ Actifs', trendUp: true, spark: [5, 10, 8, 15, 12, 20, totalVolunteers || 25], route: '/volunteers' },
                    { icon: <ApartmentOutlined />, value: totalCommittees, label: 'Comités', accent: '#5A78E6', trend: 'Réseau', trendUp: true, spark: [2, 5, 3, 8, 6, 10, totalCommittees || 12], route: '/committees' },
                    { icon: <InboxOutlined />, value: totalStock, label: 'En Stock', accent: '#7C3AED', trend: 'Articles', trendUp: true, spark: [3, 8, 5, 12, 10, 15, totalStock || 18], route: '/stocks' },
                    { icon: <AlertOutlined />, value: activeAlerts, label: 'Alertes', accent: p.red600, trend: activeAlerts > 0 ? 'Action!' : 'RAS', trendUp: activeAlerts === 0, route: '/stocks' },
                ].map((k, i) => (
                    <KpiCard key={k.label} isDark={isDark} delay={i * 70}
                        icon={k.icon} value={k.value} label={k.label} accent={k.accent}
                        trend={k.trend} trendUp={k.trendUp} sparkData={k.spark}
                        onClick={() => navigate(k.route)}
                    />
                ))}
            </div>

            {/* Charts row */}
            <div className="nd-two-col" style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20,
            }}>
                {/* Bar chart */}
                <SCard isDark={isDark} accentLine={p.red600}
                    title={
                        <><BarChartOutlined style={{ color: p.red600, fontSize: 16, marginRight: 8 }} />
                            <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                Volontaires par Comité
                            </span></>
                    }
                >
                    <BarChart data={committees} isDark={isDark} />
                </SCard>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Alerts list */}
                    <SCard isDark={isDark} accentLine={p.amb600}
                        title={
                            <><AlertOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                                <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                    Alertes Stock
                                </span></>
                        }
                    >
                        {alerts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '18px 0', fontFamily: fonts.body, color: makeTheme(isDark).textFaint }}>
                                <CheckCircleOutlined style={{ fontSize: 28, color: p.grn600, marginBottom: 8 }} />
                                <br />Aucune alerte active
                            </div>
                        ) : alerts.slice(0, 3).map((a, i) => {
                            const sev = SEVERITY_META[a.severity] || SEVERITY_META.MEDIUM;
                            return (
                                <div key={i} className="nd-row-hover" style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 0', borderBottom: i < 2 ? `1px solid ${makeTheme(isDark).divider}` : 'none',
                                }}>
                                    <div style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: sev.color, flexShrink: 0,
                                        boxShadow: `0 0 5px ${sev.color}`,
                                    }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: isDark ? '#F0F4FF' : p.ink }}>
                                            Alerte #{a.itemId.substring(0, 8)}
                                        </div>
                                        <div style={{ fontFamily: fonts.body, fontSize: 11, color: makeTheme(isDark).textFaint }}>
                                            {a.alertType} · {sev.label}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </SCard>

                    {/* Top committees progress */}
                    <SCard isDark={isDark} accentLine='#5A78E6'
                        title={
                            <><TrophyOutlined style={{ color: '#5A78E6', fontSize: 16, marginRight: 8 }} />
                                <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                    Top Comités
                                </span></>
                        }
                    >
                        {committees.slice(0, 5).map((c) => (
                            <ProgRow key={c.id} isDark={isDark}
                                label={c.region || c.name || '—'}
                                value={c.totalVolunteers || 0}
                                max={Math.max(...committees.map((x) => x.totalVolunteers || 0), 1)}
                                color={
                                    (c.totalVolunteers || 0) / Math.max(...committees.map(x => x.totalVolunteers || 0), 1) > 0.6
                                        ? p.red600 : (c.totalVolunteers || 0) > 0 ? p.amb600 : '#5A78E6'
                                }
                            />
                        ))}
                    </SCard>
                </div>
            </div>

            {/* Quick actions */}
            <SCard isDark={isDark} accentLine={p.amb600}
                title={
                    <><ThunderboltOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                            Administration Rapide
                        </span></>
                }
            >
                <div className="nd-action-grid" style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
                }}>
                    {[
                        { icon: <TeamOutlined style={{ fontSize: 26, color: p.red600 }} />, label: 'Volontaires', desc: 'Gérer profils', accent: p.red600, route: '/volunteers' },
                        { icon: <ApartmentOutlined style={{ fontSize: 26, color: '#5A78E6' }} />, label: 'Comités', desc: 'Organisation', accent: '#5A78E6', route: '/committees' },
                        { icon: <InboxOutlined style={{ fontSize: 26, color: '#7C3AED' }} />, label: 'Inventaire', desc: 'Stock en temps réel', accent: '#7C3AED', route: '/stocks' },
                        { icon: <FileTextOutlined style={{ fontSize: 26, color: p.grn600 }} />, label: 'Rapports', desc: 'SitRep · Mensuels', accent: p.grn600, route: '/reports' },
                        { icon: <HeartOutlined style={{ fontSize: 26, color: p.amb600 }} />, label: 'Donations', desc: 'Suivi des dons', accent: p.amb600, route: '/donations' },
                        { icon: <SafetyOutlined style={{ fontSize: 26, color: '#7C3AED' }} />, label: 'Validations', desc: 'Queue de rôles', accent: '#7C3AED', route: '/validation-queue' },
                        { icon: <AuditOutlined style={{ fontSize: 26, color: '#0284C7' }} />, label: 'Audit Trail', desc: '360° Vision', accent: '#0284C7', route: '/audit-logs' },
                        { icon: <SettingOutlined style={{ fontSize: 26, color: p.slate }} />, label: 'Paramètres', desc: 'Configuration', accent: p.slate, route: '/settings' },
                    ].map((a) => (
                        <QAction key={a.label} isDark={isDark}
                            icon={a.icon} label={a.label} desc={a.desc} accent={a.accent}
                            onClick={() => navigate(a.route)}
                        />
                    ))}
                </div>
            </SCard>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// TRAINER DASHBOARD
// ─────────────────────────────────────────────────────────────
const TrainerDash: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
    totalVolunteers: number; committees: CommitteeOverview[];
}> = ({ isDark, navigate, totalVolunteers, committees }) => {
    const sessions = [
        { title: 'Formation PSE2 — Niveau avancé', date: '15 Mars 2026', status: 'Planifiée', accent: p.blu600 },
        { title: 'Recyclage RCP — Comité Tunis', date: '22 Mars 2026', status: 'Confirmée', accent: p.grn600 },
        { title: 'Atelier DIH — Nouveaux volontaires', date: '5 Avril 2026', status: 'En préparation', accent: p.amb600 },
        { title: 'Formation Gestion de Crise', date: '12 Avril 2026', status: 'Planifiée', accent: '#7C3AED' },
    ];
    const t = makeTheme(isDark);

    return (
        <>
            <div className="nd-kpi-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20,
            }}>
                {[
                    { icon: <BookOutlined />, label: 'Sessions', value: 12, accent: p.blu600, spark: [3, 5, 4, 8, 6, 10, 12] },
                    { icon: <TeamOutlined />, label: 'Formés', value: totalVolunteers || 5, accent: p.grn600, spark: [10, 25, 18, 40, 35, 55, totalVolunteers || 5] },
                    { icon: <TrophyOutlined />, label: 'Certifications', value: 42, accent: p.amb600, spark: [8, 12, 15, 22, 30, 35, 42] },
                    { icon: <ClockCircleOutlined />, label: 'Heures Disp.', value: '1 500', accent: '#7C3AED', spark: [200, 400, 600, 800, 1000, 1200, 1500] },
                ].map((k, i) => (
                    <KpiCard key={k.label} isDark={isDark} delay={i * 70}
                        icon={k.icon} value={k.value} label={k.label} accent={k.accent} sparkData={k.spark}
                    />
                ))}
            </div>

            <div className="nd-two-col" style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20,
            }}>
                <SCard isDark={isDark} accentLine={p.blu600}
                    title={<><CalendarOutlined style={{ color: p.blu600, fontSize: 16, marginRight: 8 }} />
                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Prochaines Sessions</span></>}
                >
                    {sessions.map((s, i) => (
                        <div key={i} className="nd-row-hover" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 0', gap: 12,
                            borderBottom: i < sessions.length - 1 ? `1px solid ${t.divider}` : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: r.sm,
                                    background: `${s.accent}14`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 18, color: s.accent,
                                }}><BookOutlined /></div>
                                <div>
                                    <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 13, color: isDark ? '#F0F4FF' : p.ink }}>
                                        {s.title}
                                    </div>
                                    <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textFaint }}>{s.date}</div>
                                </div>
                            </div>
                            <div style={{
                                background: isDark ? `${s.accent}18` : `${s.accent}10`,
                                color: s.accent, borderRadius: r.pill,
                                padding: '3px 12px', fontSize: 11, fontWeight: 700, fontFamily: fonts.body,
                                border: `1px solid ${s.accent}20`, flexShrink: 0,
                            }}>
                                {s.status}
                            </div>
                        </div>
                    ))}
                </SCard>

                <SCard isDark={isDark} accentLine={p.amb600}
                    title={<><StarOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Mes Expertises</span></>}
                >
                    {[
                        { name: 'PSE1', pct: 94, color: p.grn600 },
                        { name: 'RCP', pct: 82, color: p.blu600 },
                        { name: 'Gestes qui sauvent', pct: 80, color: '#7C3AED' },
                        { name: 'PSE2', pct: 75, color: p.amb600 },
                        { name: 'Secourisme', pct: 78, color: p.red600 },
                    ].map((d) => (
                        <ProgRow key={d.name} isDark={isDark}
                            label={d.name} value={d.pct} max={100} color={d.color} suffix={`${d.pct}%`}
                        />
                    ))}
                </SCard>
            </div>

            <SCard isDark={isDark} accentLine={p.amb600}
                title={<><ThunderboltOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                    <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Actions Rapides</span></>}
            >
                <div className="nd-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {[
                        { icon: <AlertOutlined style={{ fontSize: 26, color: p.red600 }} />, label: 'Secourisme', desc: 'Équipements & cours', accent: p.red600, route: '/secourisme' },
                        { icon: <TeamOutlined style={{ fontSize: 26, color: '#5A78E6' }} />, label: 'Volontaires', desc: 'Mes apprenants', accent: '#5A78E6', route: '/volunteers' },
                        { icon: <FileTextOutlined style={{ fontSize: 26, color: p.grn600 }} />, label: 'Rapports', desc: 'Bilans formation', accent: p.grn600, route: '/reports' },
                        { icon: <InboxOutlined style={{ fontSize: 26, color: '#7C3AED' }} />, label: 'Matériel', desc: 'Stock formation', accent: '#7C3AED', route: '/stocks' },
                    ].map((a) => (
                        <QAction key={a.label} isDark={isDark}
                            icon={a.icon} label={a.label} desc={a.desc} accent={a.accent}
                            onClick={() => navigate(a.route)}
                        />
                    ))}
                </div>
            </SCard>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// DONOR DASHBOARD
// ─────────────────────────────────────────────────────────────
const DonorDash: React.FC<{ isDark: boolean; navigate: (p: string) => void }> = ({
    isDark, navigate,
}) => {
    const t = makeTheme(isDark);
    const history = [
        { type: 'Alimentaire', qty: '200 paniers', zone: 'Tunis', date: '20 Fév 2026', color: p.grn600 },
        { type: 'Médical', qty: '50 kits', zone: 'Sousse', date: '15 Fév 2026', color: p.blu600 },
        { type: 'Alimentaire', qty: '150 paniers', zone: 'Tunis', date: '1 Fév 2026', color: p.grn600 },
        { type: 'Équipement', qty: '10 tentes', zone: 'Sfax', date: '15 Jan 2026', color: '#7C3AED' },
    ];

    return (
        <>
            <div className="nd-kpi-grid" style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20,
            }}>
                {[
                    { icon: <GiftOutlined />, value: 12, label: 'Donations', accent: p.grn600, trend: '↑ +3', trendUp: true, spark: [2, 4, 3, 6, 8, 10, 12], route: '/donor/receipts' },
                    { icon: <HeartOutlined />, value: 340, label: 'Bénéficiaires', accent: '#EC4899', trend: 'Aidés', trendUp: true, spark: [50, 100, 120, 200, 250, 300, 340] },
                    { icon: <EnvironmentOutlined />, value: 3, label: 'Zones', accent: p.blu600, trend: 'Gouvernorats', trendUp: true, spark: [1, 1, 2, 2, 2, 3, 3] },
                    { icon: <StarOutlined />, value: 'A+', label: 'Impact Score', accent: '#7C3AED', trend: 'Excellent', trendUp: true },
                ].map((k, i) => (
                    <KpiCard key={k.label} isDark={isDark} delay={i * 70}
                        icon={k.icon} value={k.value} label={k.label} accent={k.accent}
                        trend={k.trend} trendUp={k.trendUp} sparkData={(k as any).spark}
                        onClick={(k as any).route ? () => navigate((k as any).route) : undefined}
                    />
                ))}
            </div>

            <div className="nd-two-col" style={{
                display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20,
            }}>
                <SCard isDark={isDark} accentLine={p.grn600}
                    title={<><AuditOutlined style={{ color: p.grn600, fontSize: 16, marginRight: 8 }} />
                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Historique Donations</span></>}
                >
                    {history.map((item, i) => (
                        <div key={i} className="nd-row-hover" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '11px 0', gap: 12,
                            borderBottom: i < history.length - 1 ? `1px solid ${t.divider}` : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: r.sm,
                                    background: `${item.color}12`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: item.color,
                                }}><GiftOutlined /></div>
                                <div>
                                    <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 13, color: isDark ? '#F0F4FF' : p.ink }}>
                                        {item.type} — {item.qty}
                                    </div>
                                    <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textFaint }}>
                                        {item.zone} · {item.date}
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                background: isDark ? `${p.grn600}18` : p.grn100, color: p.grn600,
                                borderRadius: r.pill, padding: '3px 12px',
                                fontSize: 11, fontWeight: 700, fontFamily: fonts.body, flexShrink: 0,
                            }}>Livré ✓</div>
                        </div>
                    ))}
                </SCard>

                <SCard isDark={isDark} accentLine='#EC4899'
                    title={<><HeartOutlined style={{ color: '#EC4899', fontSize: 16, marginRight: 8 }} />
                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Catégories</span></>}
                >
                    {[
                        { cat: 'Alimentaire', pct: 45, color: p.grn600 },
                        { cat: 'Médical', pct: 30, color: p.blu600 },
                        { cat: 'Équipement', pct: 15, color: '#7C3AED' },
                        { cat: 'Vestimentaire', pct: 10, color: p.amb600 },
                    ].map((item) => (
                        <ProgRow key={item.cat} isDark={isDark}
                            label={item.cat} value={item.pct} max={100} color={item.color} suffix={`${item.pct}%`}
                        />
                    ))}
                </SCard>
            </div>

            <SCard isDark={isDark} accentLine={p.amb600}
                title={<><ThunderboltOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                    <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Actions Rapides</span></>}
            >
                <div className="nd-action-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {[
                        { icon: <GiftOutlined style={{ fontSize: 26, color: p.grn600 }} />, label: 'Faire un don', desc: 'Nouvelle donation', accent: p.grn600, route: '/donor/donate' },
                        { icon: <BarChartOutlined style={{ fontSize: 26, color: '#7C3AED' }} />, label: 'Mon Impact', desc: 'Statistiques détaillées', accent: '#7C3AED', route: '/donor/dashboard' },
                        { icon: <SettingOutlined style={{ fontSize: 26, color: p.slate }} />, label: 'Préférences', desc: 'Zones & catégories', accent: p.slate, route: '/settings' },
                    ].map((a) => (
                        <QAction key={a.label} isDark={isDark}
                            icon={a.icon} label={a.label} desc={a.desc} accent={a.accent}
                            onClick={() => navigate(a.route)}
                        />
                    ))}
                </div>
            </SCard>
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// VOLUNTEER DASHBOARD
// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// VOLUNTEER KPI CARD
// ─────────────────────────────────────────────────────────────
interface VolunteerKpiProps {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtext: string;
    accent: string;
    isDark: boolean;
    delay?: number;
    sparkData?: number[];
    onClick?: () => void;
}

const VolunteerKpiCard: React.FC<VolunteerKpiProps> = ({
    icon, title, value, subtext, accent, isDark, delay = 0, sparkData, onClick
}) => {
    const t = makeTheme(isDark);
    return (
        <div
            className="nd-kpi nd-fade-up"
            onClick={onClick}
            style={{
                animationDelay: `${delay}ms`,
                background: isDark
                    ? `linear-gradient(150deg, ${t.cardBg}, ${accent}14)`
                    : `linear-gradient(150deg, #fff, ${accent}07)`,
                borderRadius: r.lg,
                padding: '20px 18px',
                border: `1px solid ${isDark ? `${accent}22` : `${accent}18`}`,
                boxShadow: isDark
                    ? `0 4px 22px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
                    : `0 3px 16px ${accent}14`,
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative', overflow: 'hidden',
                height: '100%', display: 'flex', flexDirection: 'column', gap: 12,
            }}
        >
            {/* Decorative corner arc */}
            <div style={{
                position: 'absolute', top: -28, right: -28,
                width: 88, height: 88, borderRadius: '50%',
                background: `${accent}10`, pointerEvents: 'none',
            }} />

            {/* Header row: Icon + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isDark ? `${accent}20` : `${accent}10`,
                    border: `1px solid ${accent}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: accent,
                }}>
                    {icon}
                </div>
                <div style={{
                    fontFamily: fonts.body, fontSize: 11, fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    flex: 1,
                }}>
                    {title}
                </div>
            </div>

            {/* Value + Sparkline */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 }}>
                <div>
                    <div style={{
                        fontFamily: fonts.heading, fontSize: 32, fontWeight: 700,
                        lineHeight: 1, color: isDark ? '#F0F4FF' : p.ink,
                        letterSpacing: '-0.5px',
                    }}>
                        {value}
                    </div>
                    <div style={{
                        fontFamily: fonts.body, fontSize: 11, fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        color: t.textSub, marginTop: 4,
                    }}>
                        {subtext}
                    </div>
                </div>
                {sparkData && <Sparkline data={sparkData} color={accent} h={30} />}
            </div>

            {/* Bottom gradient bar */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg, ${accent}, transparent)`,
            }} />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// VOLUNTEER DASHBOARD
// ─────────────────────────────────────────────────────────────
const VolunteerDash: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
    permissions: any; user: any;
    totalVolunteers: number; pendingVolunteers: number;
    totalCommittees: number; totalStock: number; activeAlerts: number;
    committees: CommitteeOverview[]; alerts: StockAlertDTO[];
    jeunesseFormsCount: number | string; jeunesseProjectsCount: number | string;
    santeActionsCount: number | string;
    socialFamiliesCount: number | string; socialActionsCount: number | string;
    vffCasesCount: number | string; immigrationCasesCount: number | string;
    secourismeEqCount: number | string; secourismeDvCount: number | string;
    upcomingEvents: CalendarEventDTO[];
    myQuizResults: QuizResultDTO[];
}> = (props) => {
    const { isDark, navigate, permissions, user,
        totalVolunteers, pendingVolunteers, totalCommittees, totalStock, activeAlerts,
        committees, alerts,
        jeunesseFormsCount, jeunesseProjectsCount, santeActionsCount,
        socialFamiliesCount, socialActionsCount, vffCasesCount, immigrationCasesCount,
        secourismeEqCount, secourismeDvCount,
        upcomingEvents, myQuizResults } = props;
    const t = makeTheme(isDark);

    const userRoles: string[] = (user?.roles || []).map((r: any) =>
        (typeof r === 'string' ? r : r?.role || '').toUpperCase()
    );
    const isLeadership = userRoles.some(r =>
        r.includes('PRESIDENT') || r.includes('VICE') || r.includes('SECRETAIRE') ||
        r.includes('TRESORIER') || r.includes('ADMIN')
    );
    const isDomainOnly = !isLeadership && userRoles.some(r => r.startsWith('RESP_'));
    const isSimpleVolunteer = !isLeadership && !isDomainOnly;

    // Dynamic calculations for simple volunteer dashboard
    const passedQuizzes = myQuizResults.filter(r => r.passed);
    const volunteerHours = user?.hoursVolunteered !== undefined ? user.hoursVolunteered : 0;
    const pendingMissionsCount = upcomingEvents.filter(e => !e.isRegistered).length;
    const passedFormationsCount = passedQuizzes.length;

    const displayMissions = upcomingEvents.slice(0, 4).map(e => ({
        title: e.title,
        schedule: `${calendarService.formatDate(e.startDate).split(' ')[0]} ${calendarService.formatTime(e.startDate)}`,
        color: e.type === 'FORMATION' ? '#7C3AED' : e.type === 'URGENCE' ? p.red600 : e.type === 'COLLECTE' ? p.grn600 : p.amb600
    }));

    const displayFormations = upcomingEvents.filter(e => e.type === 'FORMATION').slice(0, 2).map(e => ({
        title: e.title,
        schedule: `${calendarService.formatDate(e.startDate).split(' ')[0]} ${calendarService.formatTime(e.startDate)}`
    }));

    const displayCertificates = passedQuizzes.map(r => ({
        name: r.badgeEarned || r.quizTitle,
        color: r.badgeColor || p.grn600
    }));

    // Find domain
    const domainKey = Object.keys(DOMAIN_META).find(k => userRoles.some(r => r.includes(k)));
    const domainCfg = domainKey ? DOMAIN_META[domainKey] : null;
    const domainStats = domainKey === 'RESP_JEUNESSE'
        ? [{ icon: <FileTextOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Formulaires', val: jeunesseFormsCount }, { icon: <ThunderboltOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Projets', val: jeunesseProjectsCount }]
        : domainKey === 'RESP_SANTE'
            ? [{ icon: <MedicineBoxOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Interventions', val: santeActionsCount }, { icon: <CalendarOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Consultations', val: '—' }]
            : domainKey === 'RESP_SOCIAL'
                ? [{ icon: <HomeOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Familles', val: socialFamiliesCount }, { icon: <InboxOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Aides', val: socialActionsCount }]
                : domainKey === 'RESP_VFF'
                    ? [{ icon: <AlertOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Victimes', val: vffCasesCount }, { icon: <CheckCircleOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Traités', val: '—' }]
                    : domainKey === 'RESP_IMMIGRATION'
                        ? [{ icon: <FileTextOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Dossiers', val: immigrationCasesCount }, { icon: <TeamOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Assistances', val: '—' }]
                        : domainKey === 'RESP_SECOURISME'
                            ? [{ icon: <MedicineBoxOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Équipements', val: secourismeEqCount }, { icon: <EnvironmentOutlined style={{ fontSize: 26, color: domainCfg?.color }} />, label: 'Dispositifs', val: secourismeDvCount }]
                            : [];

    // Quick actions
    const qActions = [
        permissions.sidebarKeys.includes('/secourisme') && { icon: <AlertOutlined style={{ fontSize: 26, color: p.red600 }} />, label: 'Secourisme', desc: 'RCP & Formation', accent: p.red600, route: '/secourisme' },
        permissions.sidebarKeys.includes('/volunteers') && { icon: <TeamOutlined style={{ fontSize: 26, color: '#5A78E6' }} />, label: 'Volontaires', desc: 'Gérer profils', accent: '#5A78E6', route: '/volunteers' },
        permissions.sidebarKeys.includes('/reports') && { icon: <FileTextOutlined style={{ fontSize: 26, color: p.grn600 }} />, label: 'Rapports', desc: 'SitRep', accent: p.grn600, route: '/reports' },
        permissions.sidebarKeys.includes('/stocks') && { icon: <InboxOutlined style={{ fontSize: 26, color: '#7C3AED' }} />, label: 'Inventaire', desc: `${totalStock} art.`, accent: '#7C3AED', route: '/stocks' },
        permissions.sidebarKeys.includes('/donations') && { icon: <GiftOutlined style={{ fontSize: 26, color: p.amb600 }} />, label: 'Donations', desc: 'Suivi des dons', accent: p.amb600, route: '/donations' },
        permissions.sidebarKeys.includes('/diffusion') && { icon: <SoundOutlined style={{ fontSize: 26, color: '#EC4899' }} />, label: 'Diffusion', desc: 'Ressources', accent: '#EC4899', route: '/diffusion' },
        permissions.sidebarKeys.includes('/sante') && { icon: <MedicineBoxOutlined style={{ fontSize: 26, color: p.blu600 }} />, label: 'Santé', desc: 'Interventions', accent: p.blu600, route: '/sante' },
        permissions.sidebarKeys.includes('/social') && { icon: <HomeOutlined style={{ fontSize: 26, color: p.grn600 }} />, label: 'Social', desc: 'Familles aidées', accent: p.grn600, route: '/social' },
        permissions.sidebarKeys.includes('/catastrophes') && { icon: <ThunderboltOutlined style={{ fontSize: 26, color: p.red600 }} />, label: 'Météo', desc: 'Alertes & Suivi', accent: p.red600, route: '/catastrophes' },
    ].filter(Boolean) as any[];

    // Specialized quick actions for simple volunteers
    const volunteerActions = [
        { icon: <ApartmentOutlined style={{ fontSize: 26, color: '#5A78E6' }} />, label: 'Mon Comité', desc: 'Gérer mon comité', accent: '#5A78E6', route: '/volunteer/committee' },
        { icon: <BookOutlined style={{ fontSize: 26, color: p.grn600 }} />, label: 'Ressources', desc: 'Ressources & Guides', accent: p.grn600, route: '/volunteer/resources' },
        { icon: <AlertOutlined style={{ fontSize: 26, color: p.red600 }} />, label: 'Réclamations', desc: 'Déposer une plainte', accent: p.red600, route: '/volunteer/complaints' },
        { icon: <TrophyOutlined style={{ fontSize: 26, color: p.amb600 }} />, label: 'Quiz', desc: 'Passer des tests', accent: p.amb600, route: '/volunteer/quiz' },
        { icon: <GiftOutlined style={{ fontSize: 26, color: '#7C3AED' }} />, label: 'Réception Dons', desc: 'Réception de dons', accent: '#7C3AED', route: '/volunteer/reception' },
        { icon: <UserOutlined style={{ fontSize: 26, color: p.slate }} />, label: 'Mon Profil', desc: 'Mes informations', accent: p.slate, route: '/volunteer/profile' },
    ];

    const actionsToRender = isSimpleVolunteer ? volunteerActions : qActions;

    return (
        <>
            {isSimpleVolunteer ? (
                <>
                    {/* Personal KPIs row */}
                    <div className="nd-kpi-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 14,
                        marginBottom: 20,
                    }}>
                        <VolunteerKpiCard
                            isDark={isDark}
                            icon={<ClockCircleOutlined />}
                            title="Mes Heures de Volontariat"
                            value={`${volunteerHours} HRS`}
                            subtext="Mes Heures"
                            accent={p.grn600}
                        />
                        <VolunteerKpiCard
                            isDark={isDark}
                            icon={<CalendarOutlined />}
                            title="Missions en Attente"
                            value={pendingMissionsCount}
                            subtext="Mes Attente"
                            accent={p.amb600}
                            onClick={() => navigate('/volunteer/calendar')}
                        />
                        <VolunteerKpiCard
                            isDark={isDark}
                            icon={<AlertOutlined />}
                            title="Mes Alertes Personnelles"
                            value="0"
                            subtext="Mes Alertes"
                            accent={p.red600}
                        />
                        <VolunteerKpiCard
                            isDark={isDark}
                            icon={<InboxOutlined />}
                            title="Stocks Assignés"
                            value="0 ITEMS"
                            subtext="Assignés"
                            accent="#5A78E6"
                            onClick={() => navigate('/volunteer/resources')}
                        />
                        <VolunteerKpiCard
                            isDark={isDark}
                            icon={<BookOutlined />}
                            title="Mes Formations"
                            value={passedFormationsCount}
                            subtext="Mes Formations"
                            accent="#7C3AED"
                            onClick={() => navigate('/volunteer/quiz')}
                        />
                    </div>

                    {/* Dual-column section */}
                    <div className="nd-two-col" style={{
                        display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20,
                    }}>
                        {/* Left Column: Prochaines Missions & Suivi des Heures */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Prochaines Missions Card */}
                            <SCard isDark={isDark} accentLine={p.red600}
                                title={
                                    <><CalendarOutlined style={{ color: p.red600, fontSize: 16, marginRight: 8 }} />
                                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                            PROCHAINES MISSIONS
                                        </span></>
                                }
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {displayMissions.length > 0 ? (
                                        displayMissions.map((m, i) => (
                                            <div key={i} className="nd-row-hover" style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '10px 14px', borderRadius: r.sm,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : p.mist,
                                                borderLeft: `4px solid ${m.color}`,
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 13, color: isDark ? '#F0F4FF' : p.ink }}>
                                                        {m.title}
                                                    </span>
                                                    <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub, marginLeft: 6 }}>
                                                        ({m.schedule})
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <Empty description="Aucune mission planifiée" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                    )}
                                </div>
                            </SCard>

                            {/* Suivi des Heures Card */}
                            <SCard isDark={isDark} accentLine={p.amb600}
                                title={
                                    <><ClockCircleOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                            SUIVI DES HEURES
                                        </span></>
                                }
                            >
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body }}>
                                        <thead>
                                            <tr style={{ borderBottom: `1px solid ${t.divider}` }}>
                                                <th style={{ textAlign: 'left', padding: '10px 8px', fontSize: 12, color: t.textSub, fontWeight: 600 }}>Type</th>
                                                <th style={{ textAlign: 'right', padding: '10px 8px', fontSize: 12, color: t.textSub, fontWeight: 600 }}>Heures</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {volunteerHours > 0 ? (
                                                <tr>
                                                    <td style={{ padding: '10px 8px', fontSize: 13, color: isDark ? '#F0F4FF' : p.ink }}>Total accumulé</td>
                                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: p.grn600 }}>{volunteerHours} h</td>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td colSpan={2} style={{ textAlign: 'center', padding: '14px 0', fontSize: 12, color: t.textFaint }}>
                                                        Aucune heure de volontariat enregistrée
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </SCard>
                        </div>

                        {/* Right Column: Derniers Équipements, Mes Formations à Venir, Mes Certifications Obtenues */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Derniers Équipements Card */}
                            <SCard isDark={isDark} accentLine={p.amb600}
                                title={
                                    <><InboxOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                            DERNIERS ÉQUIPEMENTS
                                        </span></>
                                }
                            >
                                <Empty description="Aucun équipement assigné" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            </SCard>

                            {/* Mes Formations à Venir Card */}
                            <SCard isDark={isDark} accentLine="#7C3AED"
                                title={
                                    <><BookOutlined style={{ color: "#7C3AED", fontSize: 16, marginRight: 8 }} />
                                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                            MES FORMATIONS À VENIR
                                        </span></>
                                }
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {displayFormations.length > 0 ? (
                                        displayFormations.map((f, i) => (
                                            <div key={i} className="nd-row-hover" style={{
                                                padding: '12px 14px', borderRadius: r.sm,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : p.mist,
                                                borderBottom: i < displayFormations.length - 1 ? `1px solid ${t.divider}` : 'none',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <span style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 13, color: isDark ? '#F0F4FF' : p.ink }}>
                                                    {f.title}
                                                </span>
                                                <span style={{
                                                    fontFamily: fonts.body, fontSize: 11, fontWeight: 700,
                                                    color: '#7C3AED', background: isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.08)',
                                                    padding: '3px 10px', borderRadius: r.pill,
                                                    border: '1px solid rgba(124,58,237,0.20)'
                                                }}>
                                                    {f.schedule}
                                                </span>
                                            </div>
                                        ))
                                    ) : (
                                        <Empty description="Aucune formation à venir" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                    )}
                                </div>
                            </SCard>

                            {/* Mes Certifications Obtenues Card */}
                            <SCard isDark={isDark} accentLine={p.grn600}
                                title={
                                    <><TrophyOutlined style={{ color: p.grn600, fontSize: 16, marginRight: 8 }} />
                                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                            MES CERTIFICATIONS OBTENUES
                                        </span></>
                                }
                            >
                                {displayCertificates.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        {displayCertificates.map((c, i) => (
                                            <div key={i} className="nd-action" style={{
                                                textAlign: 'center', padding: '16px 12px', borderRadius: r.md,
                                                background: isDark ? 'rgba(255,255,255,0.02)' : p.mist,
                                                border: `1px solid ${isDark ? `${c.color}22` : `${c.color}15`}`,
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
                                            }}>
                                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 2px 6px ${c.color}22)` }}>
                                                    <circle cx="12" cy="9" r="6" fill={`${c.color}18`} />
                                                    <path d="M9 14.5l-1.5 6.5 4.5-2.5 4.5 2.5-1.5-6.5" />
                                                </svg>
                                                <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 11, color: isDark ? '#F0F4FF' : p.ink, lineHeight: 1.3 }}>
                                                    {c.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Empty description="Aucune certification obtenue" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                )}
                            </SCard>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* KPI */}
                    {!isDomainOnly && (
                        <div className="nd-kpi-grid" style={{
                            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20,
                        }}>
                            {[
                                { icon: <TeamOutlined />, value: totalVolunteers, label: 'Volontaires', accent: p.grn600, spark: [5, 10, 8, 15, 12, 20, totalVolunteers || 25], route: '/volunteers' },
                                { icon: <ClockCircleOutlined />, value: pendingVolunteers, label: 'En Attente', accent: p.amb600, route: '/validation-queue' },
                                { icon: <AlertOutlined />, value: activeAlerts, label: 'Alertes', accent: p.red600, route: '/stocks' },
                                { icon: <InboxOutlined />, value: totalStock, label: 'En Stock', accent: '#5A78E6', spark: [3, 8, 5, 12, 10, 15, totalStock || 18], route: '/stocks' },
                                { icon: <ApartmentOutlined />, value: totalCommittees, label: 'Comités', accent: '#7C3AED', spark: [1, 3, 2, 5, 4, 8, totalCommittees || 10], route: '/committees' },
                            ].map((k, i) => (
                                <KpiCard key={k.label} isDark={isDark} delay={i * 60}
                                    icon={k.icon} value={k.value} label={k.label} accent={k.accent}
                                    sparkData={(k as any).spark}
                                    onClick={(k as any).route ? () => navigate((k as any).route) : undefined}
                                />
                            ))}
                        </div>
                    )}

                    {/* National crisis center */}
                    {permissions.sidebarKeys.includes('/catastrophes') && user?.committeeType === 'NATIONAL' && (
                        <div className="nd-fade-up nd-scale-in" style={{
                            borderRadius: r.lg, padding: 22, marginBottom: 20,
                            background: isDark
                                ? `linear-gradient(135deg, ${p.redGlow}, rgba(0,0,0,0))`
                                : `linear-gradient(135deg, rgba(220,38,38,0.04), #fff)`,
                            border: `1px solid ${p.red600}25`,
                            boxShadow: isDark ? '0 4px 24px rgba(220,38,38,0.12)' : `0 4px 20px rgba(220,38,38,0.07)`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <GlobalOutlined style={{ fontSize: 22, color: p.red600 }} className="nd-pulse-red" />
                                    <div>
                                        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>
                                            Centre Opérationnel de Crise — NATIONAL
                                        </div>
                                        <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textFaint }}>
                                            Surveillance temps réel · AlphaEarth API
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/catastrophes')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8,
                                        background: `linear-gradient(135deg, ${p.red700}, ${p.red500})`,
                                        color: '#fff', border: 'none', borderRadius: r.md,
                                        padding: '10px 20px', fontFamily: fonts.body,
                                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                        boxShadow: sh.red,
                                    }}
                                    className="nd-action"
                                >
                                    <ThunderboltOutlined /> Ouvrir Radar AlphaEarth
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {[
                                    { icon: <SoundOutlined style={{ fontSize: 18, color: p.red600 }} />, title: 'Flux Météo', desc: 'Analyse prédictive · 27 variables · OpenWeather & USGS', color: p.red600, tag: <><AlertOutlined style={{ marginRight: 4 }} /> Alerte Orage</> },
                                    { icon: <ThunderboltOutlined style={{ fontSize: 18, color: p.blu600 }} />, title: 'Pipeline RMQ', desc: 'Création interventions de sauvetage · CDC persistant', color: p.blu600, tag: <><CheckCircleOutlined style={{ marginRight: 4 }} /> Actif</> },
                                    { icon: <TeamOutlined style={{ fontSize: 18, color: p.grn600 }} />, title: 'NDRT / RDRT', desc: '142 volontaires prêts au déploiement · Matching actif', color: p.grn600, tag: <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: p.grn600 }} /> 142 Prêts</span> },
                                ].map((c, i) => (
                                    <div key={i} style={{
                                        padding: 14, borderRadius: r.md,
                                        background: isDark ? 'rgba(0,0,0,0.28)' : '#fff',
                                        border: `1px solid ${c.color}20`,
                                    }}>
                                        <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center' }}>{c.icon}</div>
                                        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 12, color: c.color, marginBottom: 4 }}>{c.title}</div>
                                        <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, lineHeight: 1.5, marginBottom: 8 }}>{c.desc}</div>
                                        <div style={{
                                            display: 'inline-block', background: `${c.color}14`, color: c.color,
                                            borderRadius: r.pill, padding: '2px 10px', fontSize: 11, fontWeight: 600, fontFamily: fonts.body,
                                        }}>{c.tag}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Charts */}
                    {!isDomainOnly && (
                        <div className="nd-two-col" style={{
                            display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20,
                        }}>
                            <SCard isDark={isDark} accentLine={p.red600}
                                title={<><BarChartOutlined style={{ color: p.red600, fontSize: 16, marginRight: 8 }} />
                                    <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Volontaires par Comité</span></>}
                            >
                                <BarChart data={committees} isDark={isDark} />
                            </SCard>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                <SCard isDark={isDark} accentLine={p.amb600}
                                    title={<><AlertOutlined style={{ color: p.amb600, fontSize: 14, marginRight: 8 }} />
                                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Alertes Stock</span></>}
                                >
                                    {alerts.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '14px 0', fontFamily: fonts.body, color: t.textFaint }}>
                                            <CheckCircleOutlined style={{ fontSize: 24, color: p.grn600, marginBottom: 6 }} />
                                            <br />Aucune alerte
                                        </div>
                                    ) : alerts.slice(0, 3).map((a, i) => {
                                        const sev = SEVERITY_META[a.severity] || SEVERITY_META.MEDIUM;
                                        return (
                                            <div key={i} className="nd-row-hover" style={{
                                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0',
                                                borderBottom: i < 2 ? `1px solid ${t.divider}` : 'none',
                                            }}>
                                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: sev.color, flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: isDark ? '#F0F4FF' : p.ink }}>
                                                        Alerte #{a.itemId.substring(0, 8)}
                                                    </div>
                                                    <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint }}>{a.alertType} · {sev.label}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </SCard>

                                <SCard isDark={isDark} accentLine='#5A78E6'
                                    title={<><TrophyOutlined style={{ color: '#5A78E6', fontSize: 14, marginRight: 8 }} />
                                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Top Comités</span></>}
                                >
                                    {committees.slice(0, 5).map((c) => {
                                        const max = Math.max(...committees.map(x => x.totalVolunteers || 0), 1);
                                        const pct = (c.totalVolunteers || 0) / max;
                                        return (
                                            <ProgRow key={c.id} isDark={isDark}
                                                label={c.region || c.name || '—'}
                                                value={c.totalVolunteers || 0} max={max}
                                                color={pct > 0.6 ? p.red600 : pct > 0.3 ? p.amb600 : '#5A78E6'}
                                            />
                                        );
                                    })}
                                </SCard>
                            </div>
                        </div>
                    )}

                    {/* Domain widget */}
                    {domainCfg && (
                        <div className="nd-fade-up" style={{
                            borderRadius: r.lg, padding: 22, marginBottom: 20,
                            background: isDark ? `${domainCfg.color}08` : `${domainCfg.color}04`,
                            border: `1px solid ${domainCfg.color}20`,
                            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : sh.sm,
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                marginBottom: 18, flexWrap: 'wrap', gap: 14,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: r.md,
                                        background: `${domainCfg.color}15`,
                                        border: `1px solid ${domainCfg.color}22`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: domainCfg.color,
                                    }}>
                                        {domainCfg.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontFamily: fonts.display, fontSize: 17, fontWeight: 700, color: isDark ? '#F0F4FF' : p.ink }}>
                                            Mon Domaine — {domainCfg.label}
                                        </div>
                                        <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textFaint }}>
                                            Statistiques spécifiques à votre domaine
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(domainCfg.route)}
                                    className="nd-action"
                                    style={{
                                        background: `linear-gradient(135deg, ${domainCfg.color}dd, ${domainCfg.color})`,
                                        color: '#fff', border: 'none', borderRadius: r.md,
                                        padding: '10px 20px', fontFamily: fonts.body, fontSize: 13, fontWeight: 700,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    }}
                                >
                                    <BarChartOutlined /> Ouvrir {domainCfg.label}
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${domainStats.length}, 1fr)`, gap: 12 }}>
                                {domainStats.map((s: any) => (
                                    <div key={s.label} style={{
                                        textAlign: 'center', padding: '16px 10px',
                                        background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                                        borderRadius: r.md, border: `1px solid ${domainCfg.color}14`,
                                    }}>
                                        <div style={{ fontSize: 26, marginBottom: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>{s.icon}</div>
                                        <div style={{ fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, color: domainCfg.color }}>{s.val}</div>
                                        <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.textFaint }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Quick actions */}
            {actionsToRender.length > 0 && (
                <SCard isDark={isDark} accentLine={p.amb600}
                    title={<><ThunderboltOutlined style={{ color: p.amb600, fontSize: 16, marginRight: 8 }} />
                        <span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: isDark ? '#F0F4FF' : p.ink }}>Actions Rapides</span></>}
                >
                    <div className="nd-action-grid" style={{
                        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
                    }}>
                        {actionsToRender.slice(0, 8).map((a: any) => (
                            <QAction key={a.label} isDark={isDark}
                                icon={a.icon} label={a.label} desc={a.desc} accent={a.accent}
                                onClick={() => navigate(a.route)}
                            />
                        ))}
                    </div>
                </SCard>
            )}
        </>
    );
};

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeTheme(isDark);
    const permissions = getUserPermissions(user?.roles || [], user?.type);
    const [loading, setLoading] = useState(true);

    const [committees, setCommittees] = useState<CommitteeOverview[]>([]);
    const [inventory, setInventory] = useState<InventoryItemDTO[]>([]);
    const [alerts, setAlerts] = useState<StockAlertDTO[]>([]);
    const [volunteerData, setVolunteerData] = useState<CommitteeOverview[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventDTO[]>([]);
    const [myQuizResults, setMyQuizResults] = useState<QuizResultDTO[]>([]);
    const [secourismeEqCount, setSecourismeEqCount] = useState<number | string>('—');
    const [secourismeDvCount, setSecourismeDvCount] = useState<number | string>('—');
    const [jeunesseFormsCount, setJeunesseFormsCount] = useState<number | string>('—');
    const [jeunesseProjectsCount, setJeunesseProjectsCount] = useState<number | string>('—');
    const [santeActionsCount, setSanteActionsCount] = useState<number | string>('—');
    const [socialFamiliesCount, setSocialFamiliesCount] = useState<number | string>('—');
    const [socialActionsCount, setSocialActionsCount] = useState<number | string>('—');
    const [vffCasesCount, setVffCasesCount] = useState<number | string>('—');
    const [immigrationCasesCount, setImmigrationCasesCount] = useState<number | string>('—');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const comms = await committeeService.getHierarchy().catch(() => []);
                setCommittees(comms);
                if (permissions.sidebarKeys.includes('/volunteers')) {
                    setVolunteerData(await volunteerService.getVisible().catch(() => []));
                }
                if (permissions.sidebarKeys.includes('/stocks') && user?.committeeId) {
                    setInventory(await inventoryService.getByCommittee(user.committeeId).catch(() => []));
                    setAlerts(await inventoryService.getAlerts().catch(() => []));
                }
                if (permissions.sidebarKeys.includes('/secourisme') && user?.committeeId) {
                    const [eq, dv] = await Promise.all([
                        secourismeService.getEquipment(user.committeeId).catch(() => []),
                        secourismeService.getDevices(user.committeeId).catch(() => []),
                    ]);
                    setSecourismeEqCount(eq.length); setSecourismeDvCount(dv.length);
                }
                const ds = await import('@/services/domainServices');
                if (permissions.sidebarKeys.includes('/jeunesse')) {
                    const [f, pr] = await Promise.all([ds.jeunesseService.getForms().catch(() => []), ds.jeunesseService.getProjects().catch(() => [])]);
                    setJeunesseFormsCount(f.length); setJeunesseProjectsCount(pr.length);
                }
                if (permissions.sidebarKeys.includes('/sante') && user?.committeeId) {
                    setSanteActionsCount((await ds.santeService.getActions(user.committeeId).catch(() => [])).length);
                }
                if (permissions.sidebarKeys.includes('/social')) {
                    const [fam, act] = await Promise.all([ds.socialService.getFamilies().catch(() => []), ds.socialService.getAllActions().catch(() => [])]);
                    setSocialFamiliesCount(fam.length); setSocialActionsCount(act.length);
                }
                if (permissions.sidebarKeys.includes('/vff')) {
                    setVffCasesCount((await ds.vffService.getCases().catch(() => [])).length);
                }
                if (permissions.sidebarKeys.includes('/immigration')) {
                    setImmigrationCasesCount((await ds.immigrationService.getCases().catch(() => [])).length);
                }
                if (permissions.dashboardType === 'volunteer') {
                    // Fetch profile to sync fresh hours/matricule
                    await useAuthStore.getState().fetchProfile().catch(() => {});
                    // Fetch calendar events
                    const evs = await calendarService.getUpcomingEvents().catch(() => []);
                    setUpcomingEvents(evs);
                    // Fetch quiz results
                    const qres = await quizService.getMyResults().catch(() => []);
                    setMyQuizResults(qres);
                }
            } catch { /* silent */ }
            finally { setLoading(false); }
        })();
    }, [user?.committeeId]);

    const totalVolunteers = volunteerData.reduce((s, c) => s + (c.totalVolunteers || 0), 0);
    const pendingVolunteers = committees.reduce((s, c) => s + (c.pendingVolunteers || 0), 0);
    const totalCommittees = committees.length;
    const totalStock = inventory.length;
    const activeAlerts = alerts.filter(a => !a.resolvedAt).length;
    const dt = permissions.dashboardType;

    if (loading) return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexDirection: 'column', gap: 20,
            background: t.pageBg,
        }}>
            <CrescentMark size={52} />
            <Spin size="large" />
            <span style={{ fontFamily: fonts.body, fontSize: 14, color: t.textSub }}>
                Chargement du tableau de bord…
            </span>
        </div>
    );

    return (
        <div style={{
            background: t.pageBg,
            minHeight: '100vh',
            padding: '24px 24px 40px',
        }}>
            {/* Header */}
            <DashHeader
                user={user} dt={dt} permissions={permissions}
                activeAlerts={activeAlerts} isDark={isDark} navigate={navigate}
            />

            {/* Role-based content */}
            {dt === 'admin' && (
                <AdminDash isDark={isDark} navigate={navigate}
                    totalVolunteers={totalVolunteers} totalCommittees={totalCommittees}
                    totalStock={totalStock} activeAlerts={activeAlerts}
                    committees={committees} alerts={alerts}
                />
            )}
            {dt === 'trainer' && (
                <TrainerDash isDark={isDark} navigate={navigate}
                    totalVolunteers={totalVolunteers} committees={committees}
                />
            )}
            {dt === 'donor' && <DonorDash isDark={isDark} navigate={navigate} />}
            {dt === 'volunteer' && (
                <VolunteerDash isDark={isDark} navigate={navigate}
                    permissions={permissions} user={user}
                    totalVolunteers={totalVolunteers} pendingVolunteers={pendingVolunteers}
                    totalCommittees={totalCommittees} totalStock={totalStock}
                    activeAlerts={activeAlerts} committees={committees} alerts={alerts}
                    jeunesseFormsCount={jeunesseFormsCount} jeunesseProjectsCount={jeunesseProjectsCount}
                    santeActionsCount={santeActionsCount}
                    socialFamiliesCount={socialFamiliesCount} socialActionsCount={socialActionsCount}
                    vffCasesCount={vffCasesCount} immigrationCasesCount={immigrationCasesCount}
                    secourismeEqCount={secourismeEqCount} secourismeDvCount={secourismeDvCount}
                    upcomingEvents={upcomingEvents}
                    myQuizResults={myQuizResults}
                />
            )}

            {/* System status footer */}
            <div style={{
                marginTop: 24, borderRadius: r.md, padding: '12px 22px',
                background: isDark ? 'rgba(255,255,255,0.025)' : '#fff',
                border: `1px solid ${t.sectionBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 8,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: p.grn600, fontSize: 14 }} />
                    <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub }}>
                        Système opérationnel · Nexus-AID v4.0
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['API ✓', 'DB ✓', 'IA ✓'].map((tag) => (
                        <span key={tag} style={{
                            background: isDark ? `${p.grn600}14` : p.grn100,
                            color: p.grn600, borderRadius: r.pill,
                            padding: '3px 10px', fontSize: 11, fontWeight: 700, fontFamily: fonts.body,
                        }}>
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;