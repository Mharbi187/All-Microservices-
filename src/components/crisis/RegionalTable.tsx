import { useMemo } from 'react';
import { Typography, Tag, Tooltip } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont, riskColor } from './radarTheme';
import type { RadarResponse } from '@/types';

const { Text } = Typography;

interface RegionalTableProps {
    data: RadarResponse | null;
    onSelect: (name: string) => void;
}

export default function RegionalTable({ data, onSelect }: RegionalTableProps) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const rows = useMemo(() => {
        if (!data?.wilayats) return [];
        return Object.entries(data.wilayats)
            .map(([name, info]) => ({
                key: name,
                name,
                risk_score: info.risk_score,
                is_high_risk: info.is_high_risk,
                disaster_type: info.disaster_type,
                temperature: info.weather?.temperature ?? 0,
                fire_count: info.satellite?.fire_count ?? 0,
                rain_mm: info.weather?.precipitation ?? 0,
                is_raining: info.weather?.is_raining ?? false,
                condition: info.weather?.condition ?? 'Dégagé',
                confidence: info.confidence_pct ?? 0,
            }))
            .sort((a, b) => b.risk_score - a.risk_score);
    }, [data]);

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
                background: `linear-gradient(90deg, ${rp.cyan500}, transparent)`,
            }} />

            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${t.divider}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: rr.sm,
                        background: isDark ? `${rp.cyan500}18` : `${rp.cyan500}0E`,
                        border: `1px solid ${rp.cyan500}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: rp.cyan500,
                    }}>
                        <UnorderedListOutlined />
                    </div>
                    <Text style={{ fontFamily: rfont.body, fontSize: 13, fontWeight: 700, color: t.text }}>
                        Toutes les Régions ({rows.length})
                    </Text>
                </div>
            </div>

            {/* Column headers */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 52px 80px 36px 36px 30px',
                padding: '7px 14px',
                borderBottom: `1px solid ${t.divider}`,
                background: isDark ? 'rgba(15,23,42,0.5)' : '#F8FAFC',
                flexShrink: 0,
            }}>
                {['Wilaya', 'Risque', 'Statut', '°C', '🔥', '🌧️'].map(h => (
                    <Text key={h} style={{
                        fontFamily: rfont.body, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        color: t.textFaint,
                    }}>{h}</Text>
                ))}
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="rd-scroll">
                {rows.map((row, i) => {
                    const color = riskColor(row.risk_score);
                    return (
                        <motion.div
                            key={row.key}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="rd-row-hover"
                            onClick={() => onSelect(row.name)}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 52px 80px 36px 36px 30px',
                                padding: '8px 14px',
                                borderBottom: `1px solid ${t.divider}`,
                                alignItems: 'center',
                            }}
                        >
                            {/* Name */}
                            <Text style={{
                                fontFamily: rfont.body, fontSize: 12, fontWeight: 600,
                                color: t.text, cursor: 'pointer',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                                {row.name}
                            </Text>

                            {/* Risk score */}
                            <Tooltip title={`Confiance: ${row.confidence}%`}>
                                <Text style={{ fontFamily: rfont.data, fontSize: 12, fontWeight: 700, color }}>
                                    {row.risk_score.toFixed(2)}
                                </Text>
                            </Tooltip>

                            {/* Status */}
                            {row.is_high_risk
                                ? <Tag color="error" style={{ fontSize: 10, fontFamily: rfont.body, margin: 0, maxWidth: 72 }}>
                                    {row.disaster_type}
                                </Tag>
                                : <Tag color="success" style={{ fontSize: 10, fontFamily: rfont.body, margin: 0 }}>
                                    DÉGAGÉ
                                </Tag>
                            }

                            {/* Temp */}
                            <Text style={{ fontFamily: rfont.data, fontSize: 11, color: t.textSub }}>
                                {row.temperature}
                            </Text>

                            {/* Fire */}
                            <Text style={{
                                fontFamily: rfont.data, fontSize: 11, fontWeight: row.fire_count > 0 ? 700 : 400,
                                color: row.fire_count > 0 ? rp.red500 : t.divider,
                            }}>
                                {row.fire_count}
                            </Text>

                            {/* Rain */}
                            <Tooltip title={row.condition}>
                                <Text style={{
                                    fontFamily: rfont.data, fontSize: 11, fontWeight: row.is_raining ? 700 : 400,
                                    color: row.is_raining ? rp.blu500 : t.textFaint,
                                }}>
                                    {row.rain_mm > 0 ? row.rain_mm.toFixed(0) : '-'}
                                </Text>
                            </Tooltip>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
