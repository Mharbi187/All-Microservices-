import { Card, Statistic, Tag, Space, Typography, Divider } from 'antd';
import {
    WarningOutlined, CheckCircleOutlined, BellOutlined,
    FireOutlined, CloudOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont, riskColor } from './radarTheme';
import type { WilayaData } from '@/types';

const { Text, Title } = Typography;

interface RegionalOverlayProps {
    wilayaName: string;
    info: WilayaData;
}

export default function RegionalOverlay({ wilayaName, info }: RegionalOverlayProps) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const riskScore = info.risk_score;
    const color = riskColor(riskScore);

    const getRiskTag = () => {
        if (info.is_high_risk) {
            if (riskScore > 0.85) {
                return (
                    <Tag icon={<WarningOutlined />} style={{
                        background: `${rp.red500}18`, color: rp.red500,
                        border: `1px solid ${rp.red500}30`,
                        borderRadius: rr.pill, padding: '3px 10px',
                        fontSize: 12, fontWeight: 700, fontFamily: rfont.data,
                    }}>
                        CRITIQUE
                    </Tag>
                );
            }
            return (
                <Tag icon={<BellOutlined />} style={{
                    background: `${rp.amb500}18`, color: rp.amb500,
                    border: `1px solid ${rp.amb500}30`,
                    borderRadius: rr.pill, padding: '3px 10px',
                    fontSize: 12, fontWeight: 700, fontFamily: rfont.data,
                }}>
                    ALERTE
                </Tag>
            );
        }
        return (
            <Tag icon={<CheckCircleOutlined />} style={{
                background: `${rp.grn500}18`, color: rp.grn500,
                border: `1px solid ${rp.grn500}30`,
                borderRadius: rr.pill, padding: '3px 10px',
                fontSize: 12, fontWeight: 700, fontFamily: rfont.data,
            }}>
                NORMAL
            </Tag>
        );
    };

    const statStyle = (val: number, threshold: number, danger: string, safe?: string) => ({
        color: val > threshold ? danger : (safe ?? rp.grn500),
        fontSize: 20 as const, fontWeight: 700 as const,
        fontFamily: rfont.data,
    });

    return (
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16, zIndex: 1000 }}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
            >
                <div style={{
                    background: isDark
                        ? 'rgba(15,23,42,0.92)'
                        : 'rgba(255,255,255,0.96)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: `1px solid ${color}30`,
                    borderRadius: rr.lg,
                    boxShadow: isDark
                        ? `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`
                        : `0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px ${color}15`,
                    overflow: 'hidden',
                }}>
                    {/* Top accent line matching risk level */}
                    <div style={{
                        height: 3,
                        background: `linear-gradient(90deg, ${color}, ${color}40)`,
                    }} />

                    <div style={{
                        padding: '14px 20px',
                        display: 'flex', alignItems: 'center',
                        gap: 20, flexWrap: 'wrap',
                        overflowX: 'auto',
                    }}>
                        {/* Wilaya identity */}
                        <div style={{ minWidth: 140 }}>
                            <Text style={{
                                fontFamily: rfont.body, fontSize: 11, fontWeight: 600,
                                color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em',
                                display: 'block',
                            }}>
                                Wilaya Sélectionnée
                            </Text>
                            <Title level={5} style={{
                                fontFamily: rfont.display, color: t.text,
                                margin: '2px 0 4px', fontWeight: 700,
                            }}>
                                {wilayaName}
                            </Title>
                            <Space size={4} wrap>
                                {info.data_sources?.map(src => (
                                    <Tag key={src} style={{
                                        background: isDark ? 'rgba(59,130,246,0.12)' : rp.blu100,
                                        color: rp.blu500,
                                        border: `1px solid ${rp.blu500}20`,
                                        borderRadius: rr.pill, fontSize: 9,
                                        fontFamily: rfont.data, margin: 0,
                                    }}>
                                        {src}
                                    </Tag>
                                ))}
                            </Space>
                        </div>

                        <Divider type="vertical" style={{ height: 52, borderColor: t.divider, margin: 0 }} />

                        {/* Weather */}
                        <Space size={18} wrap={false} style={{ minWidth: 'max-content' }}>
                            {[
                                {
                                    label: '🌡️ Temp',
                                    value: info.weather?.temperature ?? 0,
                                    suffix: '°C',
                                    valueStyle: { color: rp.amb500, fontSize: 20, fontWeight: 700, fontFamily: rfont.data },
                                },
                                {
                                    label: '💨 Vent',
                                    value: info.weather?.wind_speed ?? 0,
                                    suffix: 'km/h',
                                    valueStyle: { color: t.text, fontSize: 20, fontWeight: 700, fontFamily: rfont.data },
                                },
                                {
                                    label: '💧 Humid.',
                                    value: info.weather?.humidity ?? 0,
                                    suffix: '%',
                                    valueStyle: { color: rp.blu500, fontSize: 20, fontWeight: 700, fontFamily: rfont.data },
                                },
                            ].map(stat => (
                                <Statistic
                                    key={stat.label}
                                    title={<Text style={{ color: t.textFaint, fontSize: 10, fontFamily: rfont.body }}>{stat.label}</Text>}
                                    value={stat.value}
                                    suffix={stat.suffix}
                                    valueStyle={stat.valueStyle}
                                />
                            ))}
                        </Space>

                        <Divider type="vertical" style={{ height: 52, borderColor: t.divider, margin: 0 }} />

                        {/* Satellite */}
                        <Space size={18} wrap={false} style={{ minWidth: 'max-content' }}>
                            {[
                                {
                                    label: '🔥 Foyers',
                                    value: info.satellite?.fire_count ?? 0,
                                    suffix: '',
                                    valueStyle: {
                                        color: (info.satellite?.fire_count ?? 0) > 0 ? rp.red500 : rp.grn500,
                                        fontSize: 20, fontWeight: 700, fontFamily: rfont.data,
                                    },
                                },
                                {
                                    label: '🌊 Inond.',
                                    value: info.satellite?.flood_area_km2 ?? 0,
                                    suffix: 'km²',
                                    valueStyle: {
                                        color: (info.satellite?.flood_area_km2 ?? 0) > 1 ? rp.blu500 : rp.grn500,
                                        fontSize: 20, fontWeight: 700, fontFamily: rfont.data,
                                    },
                                    precision: 1,
                                },
                                {
                                    label: '🌧️ Pluie 7j',
                                    value: info.satellite?.precipitation_7d_mm ?? 0,
                                    suffix: 'mm',
                                    valueStyle: { color: t.text, fontSize: 20, fontWeight: 700, fontFamily: rfont.data },
                                    precision: 1,
                                },
                            ].map(stat => (
                                <Statistic
                                    key={stat.label}
                                    title={<Text style={{ color: t.textFaint, fontSize: 10, fontFamily: rfont.body }}>{stat.label}</Text>}
                                    value={stat.value}
                                    suffix={stat.suffix}
                                    precision={(stat as any).precision}
                                    valueStyle={stat.valueStyle}
                                />
                            ))}
                        </Space>

                        <Divider type="vertical" style={{ height: 52, borderColor: t.divider, margin: 0 }} />

                        {/* Risk score */}
                        <div style={{ textAlign: 'right', minWidth: 140 }}>
                            <Text style={{
                                fontFamily: rfont.body, fontSize: 10, fontWeight: 600,
                                color: t.textFaint, display: 'block',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                                Score Risque ML ({info.confidence_pct}% conf)
                            </Text>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                                {getRiskTag()}
                                <Text style={{
                                    fontFamily: rfont.data, fontSize: 24, fontWeight: 800,
                                    color,
                                }}>
                                    {riskScore.toFixed(3)}
                                </Text>
                            </div>
                            {info.disaster_type !== 'NONE' && (
                                <Tag style={{
                                    marginTop: 4, fontSize: 10,
                                    background: isDark ? 'rgba(217,119,6,0.15)' : rp.amb100,
                                    color: rp.amb600, border: `1px solid ${rp.amb600}25`,
                                    borderRadius: rr.pill, fontFamily: rfont.data,
                                }}>
                                    {info.disaster_type}
                                </Tag>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
