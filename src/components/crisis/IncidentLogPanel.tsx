import { useMemo, useState } from 'react';
import { Button, Segmented, Tag, Space, Typography, Tooltip, Empty } from 'antd';
import {
    FileTextOutlined, FilterOutlined, ExportOutlined,
    FireOutlined, CloudOutlined, AlertOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont, riskColor } from './radarTheme';
import type { RadarResponse } from '@/types';

const { Text } = Typography;

interface IncidentLogPanelProps {
    data: RadarResponse | null;
    onFocusWilaya: (wilaya: string) => void;
    onCreateRoom: (wilaya: string) => void;
}

type FilterMode = 'critical' | 'high' | 'all';

function statusTag(status?: 'online' | 'offline' | 'degraded', isDark = false) {
    const meta = status === 'online'
        ? { color: rp.grn500, label: 'EN LIGNE' }
        : status === 'degraded'
            ? { color: rp.amb500, label: 'DÉGRADÉ' }
            : { color: rp.red500, label: 'HORS LIGNE' };
    return (
        <span style={{
            background: `${meta.color}15`,
            color: meta.color,
            border: `1px solid ${meta.color}25`,
            borderRadius: rr.pill, padding: '1px 8px',
            fontSize: 10, fontWeight: 700, fontFamily: rfont.data,
        }}>
            {meta.label}
        </span>
    );
}

function disasterIcon(type: string) {
    if (type === 'FIRE') return <FireOutlined style={{ color: rp.amb500 }} />;
    if (type === 'FLOOD') return <CloudOutlined style={{ color: rp.blu500 }} />;
    return <AlertOutlined style={{ color: rp.vio600 }} />;
}

export default function IncidentLogPanel({ data, onFocusWilaya, onCreateRoom }: IncidentLogPanelProps) {
    const [mode, setMode] = useState<FilterMode>('all');
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const rows = useMemo(() => {
        if (!data?.wilayats) return [];
        const mapped = Object.entries(data.wilayats)
            .map(([wilaya, payload]) => ({
                key: wilaya,
                wilaya,
                risk: payload.risk_score,
                confidence: payload.confidence_pct,
                type: payload.disaster_type,
                high: payload.is_high_risk,
                critical: payload.risk_score > 0.85,
                rain7d: payload.satellite?.precipitation_7d_mm ?? 0,
                flood: payload.satellite?.flood_area_km2 ?? 0,
                sourceHealth: (payload.source_health?.status ?? 'offline') as 'online' | 'offline' | 'degraded',
                precipSource: payload.source_health?.precipitation_source ?? 'manquant',
            }))
            .sort((a, b) => b.risk - a.risk);

        if (mode === 'critical') return mapped.filter(row => row.critical);
        if (mode === 'high') return mapped.filter(row => row.high);
        return mapped;
    }, [data, mode]);

    const columns = [
        { key: 'wilaya', label: 'Wilaya', width: '18%' },
        { key: 'risk', label: 'Risque', width: '14%' },
        { key: 'type', label: 'Type', width: '14%' },
        { key: 'flood', label: 'Inond. km²', width: '12%' },
        { key: 'rain7d', label: 'Pluie 7j', width: '12%' },
        { key: 'sources', label: 'Sources', width: '16%' },
        { key: 'action', label: 'Action', width: '14%' },
    ];

    return (
        <div style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: rr.lg,
            boxShadow: t.cardShadow,
            overflow: 'hidden',
            height: '100%',
            display: 'flex', flexDirection: 'column',
            position: 'relative',
        }}>
            {/* Top accent */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, ${rp.red500}, ${rp.amb500}, transparent)`,
            }} />

            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: `1px solid ${t.divider}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 10,
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 34, height: 34, borderRadius: rr.sm,
                        background: isDark ? `${rp.red500}18` : `${rp.red500}0E`,
                        border: `1px solid ${rp.red500}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, color: rp.red500,
                    }}>
                        <FileTextOutlined />
                    </div>
                    <div>
                        <Text style={{ fontFamily: rfont.body, fontSize: 14, fontWeight: 700, color: t.text, display: 'block' }}>
                            Journal des Incidents
                        </Text>
                        <Text style={{ fontFamily: rfont.body, fontSize: 11, color: t.textFaint }}>
                            {rows.length} incidents • {data?.wilayats ? Object.keys(data.wilayats).length : 0} régions surveillées
                        </Text>
                    </div>
                </div>

                <Segmented
                    value={mode}
                    onChange={val => setMode(val as FilterMode)}
                    options={[
                        { label: 'Tout', value: 'all' },
                        { label: 'Élevé+', value: 'high' },
                        { label: 'Critique', value: 'critical' },
                    ]}
                    style={{
                        background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                    }}
                />
            </div>

            {/* Column headers */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: columns.map(c => c.width).join(' '),
                padding: '8px 20px',
                borderBottom: `1px solid ${t.divider}`,
                background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC',
                flexShrink: 0,
            }}>
                {columns.map(col => (
                    <Text key={col.key} style={{
                        fontFamily: rfont.body, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.07em',
                        color: t.textFaint,
                    }}>{col.label}</Text>
                ))}
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto' }} className="rd-scroll">
                {rows.length === 0 ? (
                    <Empty
                        description={
                            <Text style={{ fontFamily: rfont.body, color: t.textSub }}>
                                Aucun incident pour ce filtre
                            </Text>
                        }
                        style={{ margin: '40px 0' }}
                    />
                ) : rows.map((row, i) => {
                    const color = riskColor(row.risk);
                    return (
                        <motion.div
                            key={row.key}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="rd-row-hover"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: columns.map(c => c.width).join(' '),
                                padding: '10px 20px',
                                borderBottom: `1px solid ${t.divider}`,
                                alignItems: 'center',
                                background: row.critical
                                    ? isDark ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)'
                                    : 'transparent',
                            }}
                        >
                            {/* Wilaya name */}
                            <Button
                                type="link"
                                onClick={() => onFocusWilaya(row.wilaya)}
                                style={{
                                    padding: 0, height: 'auto', fontFamily: rfont.body,
                                    fontSize: 13, fontWeight: 600, color: t.text,
                                    textAlign: 'left',
                                }}
                            >
                                {row.wilaya}
                            </Button>

                            {/* Risk */}
                            <Tooltip title={`Confiance: ${row.confidence.toFixed(1)}%`}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Text style={{ fontFamily: rfont.data, fontSize: 13, fontWeight: 700, color }}>
                                        {row.risk.toFixed(3)}
                                    </Text>
                                    <Text style={{ fontFamily: rfont.body, fontSize: 10, color: t.textFaint }}>
                                        {row.confidence.toFixed(0)}% conf
                                    </Text>
                                </div>
                            </Tooltip>

                            {/* Type */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                {disasterIcon(row.type)}
                                <Text style={{ fontFamily: rfont.data, fontSize: 11, color: t.textSub }}>
                                    {row.type}
                                </Text>
                            </div>

                            {/* Flood */}
                            <Text style={{ fontFamily: rfont.data, fontSize: 12, color: row.flood > 1 ? rp.blu500 : t.textSub }}>
                                {row.flood.toFixed(1)}
                            </Text>

                            {/* Rain */}
                            <Text style={{ fontFamily: rfont.data, fontSize: 12, color: t.textSub }}>
                                {row.rain7d.toFixed(1)} mm
                            </Text>

                            {/* Sources */}
                            <div>
                                {statusTag(row.sourceHealth, isDark)}
                            </div>

                            {/* Action */}
                            <Button
                                type="primary"
                                danger
                                size="small"
                                onClick={() => onCreateRoom(row.wilaya)}
                                style={{
                                    borderRadius: rr.sm,
                                    fontFamily: rfont.body,
                                    fontSize: 11, fontWeight: 700,
                                    height: 28,
                                }}
                            >
                                Activer
                            </Button>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
