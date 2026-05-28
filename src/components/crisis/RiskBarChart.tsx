import { useMemo } from 'react';
import { Typography, Tooltip } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont, riskColor } from './radarTheme';
import type { RadarResponse } from '@/types';

const { Text } = Typography;

interface RiskBarChartProps {
    data: RadarResponse | null;
}

export default function RiskBarChart({ data }: RiskBarChartProps) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const regions = useMemo(() => {
        if (!data?.wilayats) return [];
        return Object.entries(data.wilayats)
            .map(([name, info]) => ({
                name: name.length > 10 ? name.slice(0, 9) + '…' : name,
                fullName: name,
                score: info.risk_score,
                isHigh: info.is_high_risk,
                isCritical: info.risk_score > 0.85,
            }))
            .sort((a, b) => b.score - a.score);
    }, [data]);

    const maxScore = Math.max(...regions.map(r => r.score), 0.5);

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
                background: `linear-gradient(90deg, ${rp.blu500}, transparent)`,
            }} />

            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${t.divider}`,
                display: 'flex', alignItems: 'center', gap: 8,
                flexShrink: 0,
            }}>
                <div style={{
                    width: 30, height: 30, borderRadius: rr.sm,
                    background: isDark ? `${rp.blu500}18` : `${rp.blu500}0E`,
                    border: `1px solid ${rp.blu500}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: rp.blu500,
                }}>
                    <BarChartOutlined />
                </div>
                <Text style={{ fontFamily: rfont.body, fontSize: 13, fontWeight: 700, color: t.text }}>
                    Comparaison Régionale
                </Text>
            </div>

            {/* Chart */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 12px' }} className="rd-scroll">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {regions.map((region, i) => {
                        const width = (region.score / maxScore) * 100;
                        const color = riskColor(region.score);

                        return (
                            <motion.div
                                key={region.fullName}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04, duration: 0.35 }}
                                className="rd-row-hover"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '3px 6px', borderRadius: rr.xs,
                                }}
                            >
                                <Tooltip title={region.fullName}>
                                    <Text style={{
                                        fontFamily: rfont.body, fontSize: 11, fontWeight: 500,
                                        color: t.textSub, width: 72, textAlign: 'right',
                                        flexShrink: 0, overflow: 'hidden',
                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {region.name}
                                    </Text>
                                </Tooltip>

                                <div style={{
                                    flex: 1,
                                    background: isDark ? 'rgba(255,255,255,0.05)' : '#EFF1F5',
                                    borderRadius: rr.pill, height: 14, overflow: 'hidden',
                                }}>
                                    <motion.div
                                        className="rd-bar-animate"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${width}%` }}
                                        transition={{ delay: i * 0.04 + 0.2, duration: 0.6, ease: 'easeOut' }}
                                        style={{
                                            height: '100%',
                                            background: `linear-gradient(90deg, ${color}88, ${color})`,
                                            borderRadius: rr.pill,
                                            minWidth: 2,
                                        }}
                                    />
                                </div>

                                <Text style={{
                                    fontFamily: rfont.data, fontSize: 11, fontWeight: 700,
                                    color, width: 38, textAlign: 'right', flexShrink: 0,
                                }}>
                                    {region.score.toFixed(2)}
                                </Text>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
