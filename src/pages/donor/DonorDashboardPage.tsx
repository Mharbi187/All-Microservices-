// ============================================================
// NEXUS-AID — Donor Dashboard (Redesigned)
// Croissant-Rouge · Modern · Responsive · Dual-mode
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Progress, Button, Avatar, Badge } from 'antd';
import {
    GiftOutlined, HeartOutlined, EnvironmentOutlined,
    CheckCircleOutlined, ClockCircleOutlined, ArrowRightOutlined,
    ThunderboltOutlined, StarOutlined, TrophyOutlined,
    ReadOutlined, BellOutlined,
} from '@ant-design/icons';
import { useAuthStore, useUIStore } from '@/stores';
import { donationService } from '@/services/donationService';
import type { DonationNeed, DonorStats } from '@/services/donationService';
import type { UIRecipt } from './DonorReceiptsPage';
import {
    palette, makeTheme, shadows, radius, transitions, fonts,
    STATUS_CONFIG, TYPE_META, PRIORITY_META, injectGlobalStyles,
} from './DonorDashboardStyles';

// ─── Inject fonts & keyframes once ───────────────────────────
injectGlobalStyles();

// ─────────────────────────────────────────────────────────────
// CrescentLogo — SVG crescent + cross emblem
// ─────────────────────────────────────────────────────────────
const CrescentLogo: React.FC<{ size?: number }> = ({ size = 40 }) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="19" fill="rgba(220,38,38,0.12)" stroke={palette.redCore} strokeWidth="1.5" />
        {/* Crescent */}
        <path
            d="M26 12a10 10 0 1 1-12 15.3A8 8 0 1 0 26 12z"
            fill={palette.redCore}
        />
        {/* Small cross */}
        <rect x="29" y="17" width="8" height="2.5" rx="1.2" fill={palette.redCore} />
        <rect x="31.75" y="14.25" width="2.5" height="8" rx="1.2" fill={palette.redCore} />
    </svg>
);

// ─────────────────────────────────────────────────────────────
// StatCard — KPI tile
// ─────────────────────────────────────────────────────────────
interface StatCardProps {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    accent: string;
    trend?: string;
    isDark: boolean;
    delay?: number;
    onClick?: () => void;
}
const StatCard: React.FC<StatCardProps> = ({
    icon, value, label, accent, trend, isDark, delay = 0, onClick,
}) => {
    const t = makeTheme(isDark);
    return (
        <div
            className="nexus-stat-hover nexus-fade-up"
            onClick={onClick}
            style={{
                animationDelay: `${delay}ms`,
                background: isDark
                    ? `linear-gradient(145deg, ${t.cardBg}, ${accent}18)`
                    : `linear-gradient(145deg, #fff, ${accent}08)`,
                borderRadius: radius.lg,
                padding: '26px 22px',
                border: `1px solid ${isDark ? `${accent}25` : `${accent}20`}`,
                boxShadow: isDark
                    ? `0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)`
                    : `0 4px 20px ${accent}18, 0 1px 0 ${accent}10`,
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Top-right decorative arc */}
            <div style={{
                position: 'absolute', top: -24, right: -24,
                width: 80, height: 80, borderRadius: '50%',
                background: `${accent}12`, pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', top: -10, right: -10,
                width: 48, height: 48, borderRadius: '50%',
                border: `1px solid ${accent}20`, pointerEvents: 'none',
            }} />

            {/* Icon */}
            <div style={{
                width: 50, height: 50, borderRadius: radius.md,
                background: isDark ? `${accent}22` : `${accent}12`,
                border: `1px solid ${accent}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: accent, marginBottom: 18,
            }}>
                {icon}
            </div>

            {/* Value */}
            <div style={{
                fontFamily: fonts.heading,
                fontSize: 42, fontWeight: 700, lineHeight: 1,
                color: isDark ? '#F1F5F9' : palette.ink,
                marginBottom: 6, letterSpacing: '-1px',
            }}>
                {value}
            </div>

            {/* Label */}
            <div style={{
                fontFamily: fonts.body, fontSize: 13,
                color: t.textMuted, marginBottom: 10,
            }}>
                {label}
            </div>

            {/* Trend pill */}
            {trend && (
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: isDark ? `${accent}18` : `${accent}10`,
                    color: accent, borderRadius: radius.pill,
                    padding: '3px 10px', fontSize: 11, fontWeight: 600,
                    fontFamily: fonts.body, border: `1px solid ${accent}20`,
                }}>
                    {trend}
                </div>
            )}

            {/* Bottom accent bar */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 3,
                background: `linear-gradient(90deg, ${accent}, transparent)`,
                borderRadius: '0 0 0 8px',
            }} />
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// DonationRow
// ─────────────────────────────────────────────────────────────
const DonationRow: React.FC<{ don: UIRecipt; isDark: boolean; onClick: () => void }> = ({
    don, isDark, onClick,
}) => {
    const t = makeTheme(isDark);
    const meta = TYPE_META[don.donationType] || { color: palette.slate, emoji: '📦' };
    const cfg = STATUS_CONFIG[don.status] || STATUS_CONFIG['DEFAULT'];

    return (
        <div
            className="nexus-donation-row"
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: radius.md,
                background: isDark ? 'rgba(255,255,255,0.025)' : palette.fog,
                border: `1px solid ${t.divider}`,
                cursor: 'pointer',
            }}
        >
            {/* Emoji avatar */}
            <div style={{
                width: 44, height: 44, borderRadius: radius.sm,
                background: `${meta.color}15`,
                border: `1px solid ${meta.color}25`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 20, flexShrink: 0,
            }}>
                {meta.emoji}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontFamily: fonts.body, fontWeight: 600, fontSize: 14,
                    color: isDark ? '#F1F5F9' : palette.ink,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                    {don.committeeName}
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, marginTop: 3,
                }}>
                    <span style={{
                        background: `${meta.color}15`, color: meta.color,
                        borderRadius: radius.xs, padding: '1px 8px',
                        fontSize: 11, fontWeight: 600, fontFamily: fonts.body,
                    }}>
                        {don.donationType}
                    </span>
                    <span style={{ fontSize: 12, color: t.textMuted, fontFamily: fonts.body }}>
                        {don.quantity} · {new Date(don.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                </div>
            </div>

            {/* Status badge */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: isDark ? `${cfg.color}18` : cfg.bg,
                color: cfg.color, borderRadius: radius.sm,
                padding: '4px 10px', fontSize: 11, fontWeight: 700,
                fontFamily: fonts.body, flexShrink: 0, border: `1px solid ${cfg.color}20`,
            }}>
                {cfg.icon} {cfg.label}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// ImpactChart — stacked horizontal bars
// ─────────────────────────────────────────────────────────────
const ImpactChart: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const t = makeTheme(isDark);
    const rows = [
        { name: 'Alimentaire', pct: 45, color: palette.greenCore },
        { name: 'Médical', pct: 28, color: '#0EA5E9' },
        { name: 'Équipement', pct: 18, color: '#8B5CF6' },
        { name: 'Vêtements', pct: 9, color: palette.goldCore },
    ];

    return (
        <div style={{
            background: t.cardBg, borderRadius: radius.lg, padding: 24,
            border: `1px solid ${t.cardBorder}`,
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : shadows.sm,
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: radius.sm,
                    background: `${palette.goldCore}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: palette.goldCore,
                }}>
                    <TrophyOutlined />
                </div>
                <div>
                    <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 16, color: isDark ? '#F1F5F9' : palette.ink }}>
                        Impact par Catégorie
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
                        Distribution de vos dons
                    </div>
                </div>
            </div>

            {/* Stacked overview bar */}
            <div style={{
                display: 'flex', height: 10, borderRadius: radius.pill,
                overflow: 'hidden', marginBottom: 22, gap: 2,
            }}>
                {rows.map((r) => (
                    <div key={r.name} style={{
                        width: `${r.pct}%`, background: r.color,
                        transition: 'width 1s ease',
                    }} />
                ))}
            </div>

            {/* Individual rows */}
            {rows.map((r, i) => (
                <div key={r.name} style={{ marginBottom: i < rows.length - 1 ? 16 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 10, height: 10, borderRadius: 3, background: r.color,
                            }} />
                            <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: isDark ? '#E2E8F0' : palette.inkLight }}>
                                {r.name}
                            </span>
                        </div>
                        <span style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: r.color }}>
                            {r.pct}%
                        </span>
                    </div>
                    <div style={{
                        height: 7, borderRadius: radius.pill,
                        background: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0',
                        overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', width: `${r.pct}%`,
                            background: `linear-gradient(90deg, ${r.color}, ${r.color}99)`,
                            borderRadius: radius.pill,
                            transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                            transitionDelay: `${i * 100}ms`,
                        }} />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// QuickActions — 2×2 grid
// ─────────────────────────────────────────────────────────────
const QuickActions: React.FC<{ isDark: boolean; onNavigate: (r: string) => void }> = ({
    isDark, onNavigate,
}) => {
    const t = makeTheme(isDark);
    const actions = [
        { icon: <EnvironmentOutlined />, label: 'Carte des besoins', route: '/donor/map', color: '#0EA5E9' },
        { icon: <HeartOutlined />, label: 'Faire un don', route: '/donor/donate', color: palette.redCore },
        { icon: <ReadOutlined />, label: 'Mes reçus', route: '/donor/receipts', color: '#8B5CF6' },
        { icon: <BellOutlined />, label: 'Notifications', route: '/donor/notifications', color: palette.goldCore },
    ];

    return (
        <div style={{
            background: t.cardBg, borderRadius: radius.lg, padding: 24,
            border: `1px solid ${t.cardBorder}`,
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : shadows.sm,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <ThunderboltOutlined style={{ fontSize: 18, color: palette.goldCore }} />
                <span style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 16, color: isDark ? '#F1F5F9' : palette.ink }}>
                    Actions Rapides
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {actions.map((a) => (
                    <div
                        key={a.label}
                        className="nexus-action-btn"
                        onClick={() => onNavigate(a.route)}
                        style={{
                            padding: '16px 12px',
                            borderRadius: radius.md,
                            background: isDark ? `${a.color}12` : `${a.color}08`,
                            border: `1px solid ${a.color}22`,
                            cursor: 'pointer',
                            textAlign: 'center',
                        }}
                    >
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{a.icon}</div>
                        <div style={{
                            fontFamily: fonts.body, fontSize: 12, fontWeight: 600,
                            color: a.color, lineHeight: 1.3,
                        }}>
                            {a.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// UrgentNeedCard
// ─────────────────────────────────────────────────────────────
const UrgentNeedCard: React.FC<{
    need: DonationNeed; isDark: boolean; onDonate: () => void; delay?: number;
}> = ({ need, isDark, onDonate, delay = 0 }) => {
    const t = makeTheme(isDark);
    const pMeta = PRIORITY_META[need.priority] || PRIORITY_META['NORMAL'];
    const tMeta = TYPE_META[need.type] || { color: palette.slate, emoji: '📦' };
    const isUrgent = need.priority === 'URGENT';

    return (
        <div
            className="nexus-urgent-card nexus-fade-up"
            onClick={onDonate}
            style={{
                animationDelay: `${delay}ms`,
                borderRadius: radius.lg, padding: 22,
                background: isDark
                    ? `linear-gradient(145deg, ${t.cardBg}, ${isUrgent ? palette.redGlow : 'transparent'})`
                    : `linear-gradient(145deg, #fff, ${isUrgent ? 'rgba(220,38,38,0.03)' : '#FAFAFA'})`,
                border: `1px solid ${isUrgent ? `${palette.redCore}30` : t.cardBorder}`,
                boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : shadows.sm,
                height: '100%', display: 'flex', flexDirection: 'column', gap: 14,
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
            }}
        >
            {isUrgent && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${palette.redCore}, ${palette.redBright})`,
                }} />
            )}

            {/* Tags row */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{
                    background: isDark ? `${pMeta.color}20` : `${pMeta.color}12`,
                    color: pMeta.color, borderRadius: radius.sm,
                    padding: '3px 10px', fontSize: 11, fontWeight: 700,
                    fontFamily: fonts.body, border: `1px solid ${pMeta.color}25`,
                }}>
                    {pMeta.dot} {pMeta.label}
                </span>
                <span style={{
                    background: `${tMeta.color}12`, color: tMeta.color,
                    borderRadius: radius.sm, padding: '3px 10px',
                    fontSize: 11, fontWeight: 600, fontFamily: fonts.body,
                }}>
                    {tMeta.emoji} {need.type}
                </span>
            </div>

            {/* Committee info */}
            <div>
                <div style={{
                    fontFamily: fonts.heading, fontWeight: 700, fontSize: 17,
                    color: isDark ? '#F1F5F9' : palette.ink, marginBottom: 4,
                }}>
                    {need.committeeName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <EnvironmentOutlined style={{ fontSize: 12, color: t.textMuted }} />
                    <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
                        {need.committeeRegion}
                    </span>
                </div>
            </div>

            {/* Description */}
            <p style={{
                fontFamily: fonts.body, fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : palette.inkLight,
                lineHeight: 1.6, margin: 0, flex: 1,
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
                {need.description}
            </p>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <HeartOutlined style={{ color: '#EC4899', fontSize: 13 }} />
                    <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
                        {need.beneficiaries} bénéficiaires
                    </span>
                </div>
                <div style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: need.status === 'OPEN' ? palette.greenCore : palette.goldCore,
                    boxShadow: `0 0 6px ${need.status === 'OPEN' ? palette.greenCore : palette.goldCore}`,
                }} />
            </div>

            {/* CTA */}
            <button
                onClick={(e) => { e.stopPropagation(); onDonate(); }}
                className="nexus-action-btn"
                style={{
                    width: '100%', padding: '11px',
                    borderRadius: radius.md, border: 'none',
                    background: isUrgent
                        ? `linear-gradient(135deg, ${palette.redDeep}, ${palette.redBright})`
                        : `linear-gradient(135deg, ${palette.greenDeep}, ${palette.greenBright})`,
                    color: '#fff', fontSize: 13, fontWeight: 700,
                    fontFamily: fonts.body, cursor: 'pointer',
                    boxShadow: isUrgent ? shadows.redGlow : shadows.greenGlow,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
            >
                <HeartOutlined />
                {isUrgent ? 'Répondre d\'urgence' : 'Faire un don'}
            </button>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────
const DonorDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeTheme(isDark);

    const [stats, setStats] = useState<DonorStats & { impactScore?: string; pendingDonations?: number }>({
        totalDonations: 0,
        validatedDonations: 0,
        beneficiariesHelped: 0,
        zonesCovered: 0,
        donationsByCategory: {},
        impactScore: 'B+',
    });
    const [recentDonations, setRecentDonations] = useState<UIRecipt[]>([]);
    const [urgentNeeds, setUrgentNeeds] = useState<DonationNeed[]>([]);

    useEffect(() => {
        const fetch = async () => {
            try {
                const [statsData, receiptsData, needsData] = await Promise.all([
                    donationService.getMyStats(),
                    donationService.getMyReceipts(),
                    donationService.getAllNeeds(),
                ]);
                setStats(statsData);
                setRecentDonations(receiptsData.slice(0, 4));
                setUrgentNeeds(needsData.filter((n: DonationNeed) => n.priority === 'URGENT').slice(0, 3));
            } catch (e) {
                console.error(e);
            }
        };
        fetch();
    }, []);

    const firstName = user?.fullName?.split(' ')[0] || 'Donateur';
    const zonesCount = recentDonations.length > 0
        ? new Set(recentDonations.map((r) => r.committeeName)).size
        : 0;

    return (
        <div style={{
            background: t.bg, minHeight: '100vh',
            margin: -24, padding: '28px 24px 40px',
            fontFamily: fonts.body,
        }}>

            {/* ══════════════════════════════════════════
          HERO HEADER
      ══════════════════════════════════════════ */}
            <div
                className="nexus-fade-up"
                style={{
                    position: 'relative', overflow: 'hidden',
                    borderRadius: radius.xl, marginBottom: 28,
                    padding: '32px 36px',
                    background: isDark
                        ? `linear-gradient(135deg, ${palette.redDeep}22 0%, ${palette.darkCard} 60%, ${palette.greenDeep}18 100%)`
                        : `linear-gradient(135deg, #FFF5F5 0%, #FFFFFF 50%, #F0FDF4 100%)`,
                    border: `1px solid ${isDark ? `${palette.redCore}25` : `${palette.redCore}15`}`,
                    boxShadow: isDark
                        ? `0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
                        : `0 6px 32px rgba(220,38,38,0.08), 0 1px 0 rgba(22,163,74,0.08)`,
                }}
            >
                {/* Background decorative elements */}
                <div style={{
                    position: 'absolute', top: -40, right: -40,
                    width: 180, height: 180, borderRadius: '50%',
                    background: `${palette.redCore}08`, pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: -20, right: 80,
                    width: 100, height: 100, borderRadius: '50%',
                    background: `${palette.greenCore}08`, pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: 20, right: 20,
                    opacity: isDark ? 0.12 : 0.07, pointerEvents: 'none',
                }}>
                    <CrescentLogo size={80} />
                </div>

                {/* Left: Greeting */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: radius.lg,
                            background: `linear-gradient(135deg, ${palette.redDeep}, ${palette.redBright})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 30, color: '#fff', boxShadow: shadows.redGlow,
                        }} className="float-anim">
                            <HeartOutlined />
                        </div>
                        <div style={{
                            position: 'absolute', bottom: -2, right: -2,
                            width: 18, height: 18, borderRadius: '50%',
                            background: palette.greenCore, border: '2px solid',
                            borderColor: isDark ? palette.darkCard : '#fff',
                        }} className="pulse-green" />
                    </div>

                    <div>
                        <div style={{
                            fontFamily: fonts.display, fontSize: 26, fontWeight: 800,
                            color: isDark ? '#F8FAFC' : palette.ink,
                            lineHeight: 1.1, marginBottom: 6,
                        }}>
                            Bonjour, {firstName} !
                        </div>
                        <div style={{
                            fontFamily: fonts.body, fontSize: 14,
                            color: isDark ? 'rgba(255,255,255,0.55)' : palette.inkLight,
                        }}>
                            Votre générosité transforme des vies. Merci pour votre soutien continu 🌟
                        </div>
                    </div>
                </div>

                {/* Right: Impact score + CTA */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    flexWrap: 'wrap', marginTop: 24,
                }}>
                    {/* Impact score badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(220,38,38,0.06)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : `${palette.redCore}20`}`,
                        borderRadius: radius.md, padding: '8px 16px',
                    }}>
                        <StarOutlined style={{ color: palette.goldCore, fontSize: 16 }} />
                        <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: isDark ? '#F1F5F9' : palette.ink }}>
                            Score Impact :
                        </span>
                        <span style={{
                            fontFamily: fonts.heading, fontSize: 20, fontWeight: 700,
                            color: palette.greenCore,
                        }}>
                            {stats.impactScore}
                        </span>
                    </div>

                    {/* Croissant-Rouge badge */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: isDark ? `${palette.redCore}18` : `${palette.redCore}08`,
                        border: `1px solid ${palette.redCore}25`,
                        borderRadius: radius.md, padding: '8px 14px',
                    }}>
                        <CrescentLogo size={22} />
                        <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: palette.redCore }}>
                            Croissant-Rouge Tunisien
                        </span>
                    </div>

                    {/* Donate CTA */}
                    <button
                        className="nexus-action-btn"
                        onClick={() => navigate('/donor/donate')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: `linear-gradient(135deg, ${palette.redDeep}, ${palette.redBright})`,
                            color: '#fff', border: 'none', borderRadius: radius.md,
                            padding: '11px 22px', fontSize: 14, fontWeight: 700,
                            fontFamily: fonts.body, cursor: 'pointer',
                            boxShadow: shadows.redGlow,
                        }}
                    >
                        <HeartOutlined />
                        Faire un don maintenant
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════
          KPI STAT CARDS
      ══════════════════════════════════════════ */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16, marginBottom: 28,
            }}>
                <StatCard isDark={isDark} delay={0}
                    icon={<GiftOutlined />}
                    value={stats.totalDonations}
                    label="Dons effectués"
                    accent={palette.redCore}
                    trend="↑ Ce mois"
                    onClick={() => navigate('/donor/receipts')}
                />
                <StatCard isDark={isDark} delay={80}
                    icon={<HeartOutlined />}
                    value={stats.beneficiariesHelped ?? 0}
                    label="Bénéficiaires aidés"
                    accent="#EC4899"
                    trend="Personnes impactées"
                />
                <StatCard isDark={isDark} delay={160}
                    icon={<EnvironmentOutlined />}
                    value={zonesCount}
                    label="Zones couvertes"
                    accent="#0EA5E9"
                    trend="Gouvernorats"
                    onClick={() => navigate('/donor/map')}
                />
                <StatCard isDark={isDark} delay={240}
                    icon={<CheckCircleOutlined />}
                    value={stats.validatedDonations}
                    label="Dons validés"
                    accent="#8B5CF6"
                    trend="Confirmés ✓"
                />
            </div>

            {/* ══════════════════════════════════════════
          MAIN GRID: Donations + Right Column
      ══════════════════════════════════════════ */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.55fr) minmax(0, 1fr)',
                gap: 20, marginBottom: 24,
            }}
                className="responsive-grid"
            >
                {/* Left: Recent donations */}
                <div style={{
                    background: t.cardBg, borderRadius: radius.lg, padding: 24,
                    border: `1px solid ${t.cardBorder}`,
                    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : shadows.sm,
                }}>
                    {/* Section header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: radius.sm,
                                background: `${palette.redCore}12`, color: palette.redCore,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 17,
                            }}>
                                <ClockCircleOutlined />
                            </div>
                            <div>
                                <div style={{ fontFamily: fonts.heading, fontWeight: 700, fontSize: 17, color: isDark ? '#F1F5F9' : palette.ink }}>
                                    Mes Derniers Dons
                                </div>
                                <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
                                    Historique récent
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/donor/receipts')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: palette.redCore, fontSize: 13, fontWeight: 600,
                                fontFamily: fonts.body,
                            }}
                        >
                            Voir tous <ArrowRightOutlined />
                        </button>
                    </div>

                    {/* Donation list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {recentDonations.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '40px 20px',
                                fontFamily: fonts.body, color: t.textMuted,
                            }}>
                                <div style={{ fontSize: 32, marginBottom: 12, color: palette.redCore }}>
                                    <GiftOutlined />
                                </div>
                                Vous n'avez pas encore effectué de don.
                            </div>
                        ) : recentDonations.map((don) => (
                            <DonationRow
                                key={don.id} don={don} isDark={isDark}
                                onClick={() => navigate('/donor/receipts')}
                            />
                        ))}
                    </div>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <ImpactChart isDark={isDark} />
                    <QuickActions isDark={isDark} onNavigate={navigate} />
                </div>
            </div>

            {/* ══════════════════════════════════════════
          URGENT NEEDS SECTION
      ══════════════════════════════════════════ */}
            <div style={{
                background: t.cardBg, borderRadius: radius.xl, padding: 28,
                border: `1px solid ${isDark ? `${palette.redCore}20` : `${palette.redCore}12`}`,
                boxShadow: isDark ? '0 4px 28px rgba(0,0,0,0.3)' : shadows.md,
            }}>
                {/* Section header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 42, height: 42, borderRadius: radius.md,
                            background: `${palette.redCore}15`, color: palette.redCore,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 20,
                        }} className="pulse-red">
                            <BellOutlined />
                        </div>
                        <div>
                            <div style={{
                                fontFamily: fonts.heading, fontWeight: 700, fontSize: 19,
                                color: palette.redCore, letterSpacing: '0.3px',
                            }}>
                                Besoins Urgents — Agissez Maintenant
                            </div>
                            <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textMuted }}>
                                Ces situations nécessitent votre aide immédiate
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/donor/map')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: palette.greenCore, fontSize: 13, fontWeight: 600,
                            fontFamily: fonts.body,
                        }}
                    >
                        Voir tout <ArrowRightOutlined />
                    </button>
                </div>

                {/* Needs grid */}
                {urgentNeeds.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '48px',
                        fontFamily: fonts.body, color: t.textMuted,
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12, color: palette.greenCore }}>
                            <CheckCircleOutlined />
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600 }}>Aucun besoin urgent pour le moment</div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>Merci à tous les donateurs !</div>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 16,
                    }}>
                        {urgentNeeds.map((need, i) => (
                            <UrgentNeedCard
                                key={need.id} need={need} isDark={isDark}
                                delay={i * 100}
                                onDonate={() => navigate('/donor/donate', { state: { needId: need.id } })}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════
          TRANSPARENCY FOOTER BAR
      ══════════════════════════════════════════ */}
            <div style={{
                marginTop: 24, borderRadius: radius.md,
                background: isDark
                    ? 'rgba(22,163,74,0.07)'
                    : 'linear-gradient(90deg, rgba(22,163,74,0.05), rgba(220,38,38,0.03))',
                border: `1px solid ${palette.greenCore}20`,
                padding: '14px 22px',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleOutlined style={{ color: palette.greenCore, fontSize: 15 }} />
                    <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: palette.greenCore }}>
                        Transparence totale — Chaque don est tracé, validé et certifié
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                        background: `${palette.greenCore}12`, color: palette.greenCore,
                        borderRadius: radius.sm, padding: '4px 12px',
                        fontSize: 11, fontWeight: 600, fontFamily: fonts.body,
                    }}>
                        Don → QR → Réception → Validation → Reçu PDF
                    </span>
                    <button
                        onClick={() => navigate('/donor/news')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            background: `${palette.redCore}10`, color: palette.redCore,
                            border: `1px solid ${palette.redCore}20`,
                            borderRadius: radius.sm, padding: '4px 12px',
                            fontSize: 11, fontWeight: 600, fontFamily: fonts.body,
                            cursor: 'pointer',
                        }}
                    >
                        <ReadOutlined /> Actualités
                    </button>
                </div>
            </div>

            {/* Responsive override for main grid on mobile */}
            <style>{`
        @media (max-width: 900px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .nexus-fade-up { animation-duration: 0.3s; }
        }
      `}</style>
        </div>
    );
};

export default DonorDashboardPage;