import { useMemo } from 'react';
import { Typography, Space } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from './radarTheme';
import type { RadarResponse } from '@/types';

const { Text } = Typography;

interface RiskDistributionProps {
    data: RadarResponse | null;
}

export default function RiskDistribution({ data }: RiskDistributionProps) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const distribution = useMemo(() => {
        if (!data?.wilayats) return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
        const entries = Object.values(data.wilayats);
        const total = entries.length;
        const critical = entries.filter(w => w.risk_score > 0.85).length;
        const high = entries.filter(w => w.risk_score > 0.7 && w.risk_score <= 0.85).length;
        const moderate = entries.filter(w => w.risk_score > 0.4 && w.risk_score <= 0.7).length;
        const low = entries.filter(w => w.risk_score <= 0.4).length;
        return { critical, high, moderate, low, total };
    }, [data]);

    const segments = [
        { label: 'Critique', count: distribution.critical, color: rp.red500 },
        { label: 'Élevé', count: distribution.high, color: rp.amb500 },
        { label: 'Modéré', count: distribution.moderate, color: rp.blu500 },
        { label: 'Faible', count: distribution.low, color: rp.grn500 },
    ];

    const total = distribution.total || 1;

    return (
        <div style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: rr.md,
            boxShadow: t.cardShadow,
            overflow: 'hidden',
            height: '100%',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
        }}>
            {/* Top accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${rp.vio600}, transparent)`,
            }} />

            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${t.divider}`,
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <div style={{
                    width: 30, height: 30, borderRadius: rr.sm,
                    background: isDark ? `${rp.vio600}18` : `${rp.vio600}0E`,
                    border: `1px solid ${rp.vio600}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: rp.vio600,
                }}>
                    <PieChartOutlined />
                </div>
                <Text style={{ fontFamily: rfont.body, fontSize: 13, fontWeight: 700, color: t.text }}>
                    Répartition des Risques
                </Text>
            </div>

            {/* Body */}
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                {/* Donut ring */}
                <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                    <svg viewBox="0 0 36 36" style={{ width: 110, height: 110, transform: 'rotate(-90deg)' }}>
                        <circle
                            cx="18" cy="18" r="15.915"
                            fill="none"
                            stroke={isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'}
                            strokeWidth="3.5"
                        />
                        {(() => {
                            let offset = 0;
                            return segments.map((seg) => {
                                const pct = (seg.count / total) * 100;
                                const dash = `${pct} ${100 - pct}`;
                                const el = (
                                    <circle
                                        key={seg.label}
                                        cx="18" cy="18" r="15.915"
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth="3.5"
                                        strokeDasharray={dash}
                                        strokeDashoffset={-offset}
                                        strokeLinecap="round"
                                        style={{ transition: 'all 0.8s ease' }}
                                    />
                                );
                                offset += pct;
                                return el;
                            });
                        })()}
                    </svg>
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                    }}>
                        <div style={{
                            fontFamily: rfont.data, fontSize: 22, fontWeight: 800,
                            color: t.text, lineHeight: 1,
                        }}>
                            {distribution.total}
                        </div>
                        <div style={{
                            fontFamily: rfont.body, fontSize: 9, fontWeight: 600,
                            color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em',
                        }}>
                            Régions
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {segments.map((seg, i) => (
                        <motion.div
                            key={seg.label}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '6px 10px', borderRadius: rr.sm,
                                background: isDark ? `${seg.color}08` : `${seg.color}06`,
                                border: `1px solid ${seg.color}18`,
                            }}
                        >
                            <Space size={6}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: seg.color,
                                    boxShadow: `0 0 6px ${seg.color}60`,
                                }} />
                                <Text style={{ fontFamily: rfont.body, fontSize: 12, color: t.textSub }}>
                                    {seg.label}
                                </Text>
                            </Space>
                            <Space size={8}>
                                <Text strong style={{ fontFamily: rfont.data, fontSize: 13, color: seg.color }}>
                                    {seg.count}
                                </Text>
                                <Text style={{ fontFamily: rfont.body, fontSize: 10, color: t.textFaint }}>
                                    ({Math.round((seg.count / total) * 100)}%)
                                </Text>
                            </Space>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
