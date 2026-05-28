import { useMemo } from 'react';
import { Tooltip, Progress } from 'antd';
import { motion } from 'framer-motion';
import {
    ThunderboltOutlined, AlertOutlined, SafetyOutlined,
    RadarChartOutlined, CloudOutlined, ApiOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont, riskColor } from './radarTheme';
import type { RadarResponse } from '@/types';

interface KpiCardsProps {
    data: RadarResponse | null;
}

export default function KpiCards({ data }: KpiCardsProps) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const stats = useMemo(() => {
        if (!data || !data.wilayats) return null;
        const entries = Object.values(data.wilayats);
        const total = entries.length;
        const highRisk = entries.filter(w => w.is_high_risk);
        const critical = entries.filter(w => w.risk_score > 0.85);
        const avgRisk = entries.reduce((sum, w) => sum + w.risk_score, 0) / (total || 1);
        const maxTemp = Math.max(...entries.map(w => w.weather?.temperature ?? 0));
        const maxWind = Math.max(...entries.map(w => w.weather?.wind_speed ?? 0));
        const safeZones = total - highRisk.length;
        const totalFires = entries.reduce((sum, w) => sum + (w.satellite?.fire_count ?? 0), 0);
        const sources = data.data_sources;
        const sourceCount = sources
            ? Object.values(sources).filter(s => s === 'online').length
            : 0;

        return { total, highRisk: highRisk.length, critical: critical.length, avgRisk, maxTemp, maxWind, safeZones, totalFires, sourceCount };
    }, [data]);

    const threatLevel = stats ? (stats.critical > 0 ? 'CRITIQUE' : stats.highRisk > 0 ? 'ÉLEVÉ' : 'NORMAL') : 'HORS LIGNE';
    const threatColor = stats
        ? (stats.critical > 0 ? rp.red500 : stats.highRisk > 0 ? rp.amb500 : rp.grn500)
        : rp.slate;

    const s = stats ?? { total: 0, highRisk: 0, critical: 0, avgRisk: 0, maxTemp: 0, maxWind: 0, safeZones: 0, totalFires: 0, sourceCount: 0 };

    const cards = [
        {
            id: 'threat',
            title: 'Niveau Menace',
            icon: <ThunderboltOutlined />,
            color: threatColor,
            content: (
                <div>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center',
                        background: `${threatColor}18`,
                        border: `1.5px solid ${threatColor}30`,
                        borderRadius: rr.pill,
                        padding: '4px 14px',
                        fontFamily: rfont.data,
                        fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
                        color: threatColor,
                    }}>
                        {threatLevel}
                    </div>
                    <Progress
                        percent={Math.round(s.avgRisk * 100)}
                        strokeColor={threatColor}
                        trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}
                        showInfo={false}
                        size="small"
                        style={{ marginTop: 8 }}
                    />
                </div>
            ),
            sub: `Score moyen : ${s.avgRisk.toFixed(3)}`,
        },
        {
            id: 'alerts',
            title: 'Alertes Actives',
            icon: <AlertOutlined />,
            color: s.highRisk > 0 ? rp.red500 : rp.grn500,
            content: (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{
                        fontFamily: rfont.data, fontSize: 32, fontWeight: 800, lineHeight: 1,
                        color: s.highRisk > 0 ? rp.red500 : rp.grn500,
                    }}>{s.highRisk}</span>
                    <span style={{ fontFamily: rfont.body, fontSize: 14, color: t.textSub }}>/ {s.total}</span>
                </div>
            ),
            sub: `${s.critical} critique · ${s.totalFires} foyer(s) feu`,
        },
        {
            id: 'safe',
            title: 'Zones Sûres',
            icon: <SafetyOutlined />,
            color: rp.grn500,
            content: (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: rfont.data, fontSize: 32, fontWeight: 800, lineHeight: 1, color: rp.grn500 }}>{s.safeZones}</span>
                    <span style={{ fontFamily: rfont.body, fontSize: 14, color: t.textSub }}>/ {s.total}</span>
                </div>
            ),
            sub: s.total > 0 ? `${Math.round((s.safeZones / s.total) * 100)}% dégagé` : '—',
        },
        {
            id: 'avgrisk',
            title: 'Risque Moyen',
            icon: <RadarChartOutlined />,
            color: riskColor(s.avgRisk),
            content: (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: rfont.data, fontSize: 32, fontWeight: 800, lineHeight: 1, color: riskColor(s.avgRisk) }}>
                        {s.avgRisk.toFixed(3)}
                    </span>
                </div>
            ),
            sub: 'Ensemble ML 27 variables',
        },
        {
            id: 'temp',
            title: 'Temp. Maximale',
            icon: <CloudOutlined />,
            color: rp.amb500,
            content: (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontFamily: rfont.data, fontSize: 32, fontWeight: 800, lineHeight: 1, color: rp.amb500 }}>{s.maxTemp.toFixed(1)}</span>
                    <span style={{ fontFamily: rfont.body, fontSize: 16, color: rp.amb500 }}>°C</span>
                </div>
            ),
            sub: `Rafale : ${s.maxWind.toFixed(1)} km/h`,
        },
        {
            id: 'sources',
            title: 'Sources Données',
            icon: <ApiOutlined />,
            color: rp.cyan500,
            content: (
                <Tooltip title="GEE · USGS · Météo · CHIRPS">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontFamily: rfont.data, fontSize: 32, fontWeight: 800, lineHeight: 1, color: rp.cyan500 }}>{s.sourceCount}</span>
                        <span style={{ fontFamily: rfont.body, fontSize: 14, color: t.textSub }}>/ 4</span>
                    </div>
                </Tooltip>
            ),
            sub: 'GEE · USGS · Météo · CHIRPS',
        },
    ];

    return (
        <div
            className="rd-kpi-grid"
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 10,
            }}
        >
            {cards.map((card, idx) => (
                <motion.div
                    key={card.id}
                    className="rd-kpi rd-fade-up"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07, duration: 0.4 }}
                    style={{
                        background: isDark
                            ? `linear-gradient(150deg, rgba(30,41,59,0.9), ${card.color}12)`
                            : `linear-gradient(150deg, #FFFFFF, ${card.color}08)`,
                        border: `1px solid ${card.color}22`,
                        borderRadius: rr.md,
                        padding: '14px 16px',
                        boxShadow: isDark
                            ? `0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`
                            : `0 2px 12px ${card.color}14`,
                        position: 'relative', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', gap: 10,
                    }}
                >
                    {/* Corner decoration */}
                    <div style={{
                        position: 'absolute', top: -20, right: -20,
                        width: 70, height: 70, borderRadius: '50%',
                        background: `${card.color}0C`, pointerEvents: 'none',
                    }} />

                    {/* Bottom accent line */}
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
                        background: `linear-gradient(90deg, ${card.color}, transparent)`,
                    }} />

                    {/* Header: icon + title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: rr.sm,
                            background: isDark ? `${card.color}18` : `${card.color}12`,
                            border: `1px solid ${card.color}25`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 15, color: card.color,
                            flexShrink: 0,
                        }}>
                            {card.icon}
                        </div>
                        <span style={{
                            fontFamily: rfont.body, fontSize: 11, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                            color: t.textSub,
                            lineHeight: 1.2,
                        }}>{card.title}</span>
                    </div>

                    {/* Value */}
                    <div>{card.content}</div>

                    {/* Sub label */}
                    {card.sub && (
                        <div style={{
                            fontFamily: rfont.body, fontSize: 10, color: t.textFaint,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {card.sub}
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    );
}
