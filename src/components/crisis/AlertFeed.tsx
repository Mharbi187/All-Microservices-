import { useMemo } from 'react';
import { Timeline, Tag, Typography, Empty } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ClockCircleOutlined, FireOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from './radarTheme';
import type { RadarResponse } from '@/types';

const { Text } = Typography;

interface AlertFeedProps {
    data: RadarResponse | null;
}

export default function AlertFeed({ data }: AlertFeedProps) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const alerts = useMemo(() => {
        if (!data?.wilayats) return [];
        return Object.entries(data.wilayats)
            .filter(([, info]) => info.is_high_risk)
            .sort(([, a], [, b]) => b.risk_score - a.risk_score)
            .map(([name, info]) => ({
                name,
                score: info.risk_score,
                type: info.disaster_type,
                isCritical: info.risk_score > 0.85,
                temp: info.weather?.temperature ?? 0,
                wind: info.weather?.wind_speed ?? 0,
                confidence: info.confidence_pct ?? 0,
            }));
    }, [data]);

    const timestamp = data?.timestamp ? dayjs(data.timestamp).format('HH:mm:ss') : '--:--:--';

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
                background: `linear-gradient(90deg, ${rp.red500}, transparent)`,
            }} />

            {/* Header */}
            <div style={{
                padding: '14px 16px',
                borderBottom: `1px solid ${t.divider}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: rr.sm,
                        background: isDark ? `${rp.red500}18` : `${rp.red500}0E`,
                        border: `1px solid ${rp.red500}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: rp.red500,
                    }}>
                        <WarningOutlined />
                    </div>
                    <Text style={{
                        fontFamily: rfont.body, fontSize: 13, fontWeight: 700,
                        color: t.text,
                    }}>
                        Flux d'Alertes Live
                    </Text>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: isDark ? 'rgba(59,130,246,0.12)' : rp.blu100,
                    border: `1px solid ${rp.blu500}20`,
                    borderRadius: rr.pill, padding: '3px 10px',
                }}>
                    <ClockCircleOutlined style={{ color: rp.blu500, fontSize: 11 }} />
                    <span style={{ fontFamily: rfont.data, fontSize: 11, color: rp.blu500 }}>{timestamp}</span>
                </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }} className="rd-scroll">
                {alerts.length === 0 ? (
                    <Empty
                        image={
                            <div style={{ textAlign: 'center', padding: '16px 0' }}>
                                <CheckCircleOutlined style={{ fontSize: 44, color: rp.grn500 }} />
                            </div>
                        }
                        description={
                            <Text style={{
                                fontFamily: rfont.body, fontSize: 13,
                                color: t.textSub,
                            }}>
                                Toutes les régions fonctionnent normalement
                            </Text>
                        }
                        style={{ margin: '24px 0' }}
                    />
                ) : (
                    <Timeline
                        items={alerts.map((alert, i) => ({
                            color: alert.isCritical ? 'red' : 'orange',
                            dot: alert.isCritical ? (
                                <div className="rd-pulse-red" style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    background: rp.red500,
                                }} />
                            ) : undefined,
                            children: (
                                <motion.div
                                    key={alert.name}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.06 }}
                                    className="rd-row-hover"
                                    style={{
                                        paddingBottom: 8,
                                        borderRadius: rr.xs,
                                        padding: '6px 8px',
                                        background: alert.isCritical
                                            ? isDark ? `${rp.red500}08` : `${rp.red500}04`
                                            : 'transparent',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                        <Text strong style={{ fontFamily: rfont.body, fontSize: 13, color: t.text }}>
                                            {alert.name}
                                        </Text>
                                        <Tag
                                            color={alert.isCritical ? 'error' : 'warning'}
                                            style={{ fontFamily: rfont.data, fontSize: 11, fontWeight: 700, margin: 0 }}
                                        >
                                            {alert.score.toFixed(3)}
                                        </Tag>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                        {alert.type === 'FIRE' && <FireOutlined style={{ color: rp.amb500, fontSize: 11 }} />}
                                        <Text style={{ fontFamily: rfont.body, color: t.textSub, fontSize: 11 }}>
                                            {alert.type} · {alert.temp}°C · {alert.wind} km/h
                                        </Text>
                                        <Text style={{ fontFamily: rfont.data, color: t.textFaint, fontSize: 10 }}>
                                            ({alert.confidence}%)
                                        </Text>
                                    </div>
                                </motion.div>
                            ),
                        }))}
                    />
                )}
            </div>
        </div>
    );
}
