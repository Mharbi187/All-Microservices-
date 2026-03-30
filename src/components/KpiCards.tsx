import { useMemo } from 'react';
import { Card, Statistic, Row, Col, Tag, Space, Progress, Tooltip } from 'antd';
import { AlertOutlined, SafetyOutlined, DashboardOutlined, CloudOutlined, ThunderboltOutlined, ApiOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { RadarResponse } from '../types';

interface KpiCardsProps {
    data: RadarResponse | null;
}

export default function KpiCards({ data }: KpiCardsProps) {
    const stats = useMemo(() => {
        if (!data || !data.wilayats) return null;
        const entries = Object.values(data.wilayats);
        const total = entries.length;
        const highRisk = entries.filter(w => w.is_high_risk);
        const critical = entries.filter(w => w.risk_score > 0.85);
        const avgRisk = entries.reduce((sum, w) => sum + w.risk_score, 0) / (total || 1);
        const maxTemp = Math.max(...entries.map(w => w.weather?.temperature ?? 0));
        const maxWind = Math.max(...entries.map(w => w.weather?.wind_speed ?? 0));
        const totalPrecip = entries.reduce((sum, w) => sum + (w.satellite?.precipitation_7d_mm ?? 0), 0);
        const safeZones = total - highRisk.length;
        const totalFires = entries.reduce((sum, w) => sum + (w.satellite?.fire_count ?? 0), 0);

        // Data source health
        const sources = data.data_sources;
        const sourceCount = sources
            ? Object.values(sources).filter(s => s === 'online').length
            : 0;

        return { total, highRisk: highRisk.length, critical: critical.length, avgRisk, maxTemp, maxWind, totalPrecip, safeZones, totalFires, sourceCount };
    }, [data]);

    const threatLevel = stats ? (stats.critical > 0 ? 'CRITICAL' : stats.highRisk > 0 ? 'ELEVATED' : 'NORMAL') : 'OFFLINE';
    const threatColor = stats ? (stats.critical > 0 ? '#ef4444' : stats.highRisk > 0 ? '#f59e0b' : '#22c55e') : '#64748b';

    const s = stats ?? { total: 0, highRisk: 0, critical: 0, avgRisk: 0, maxTemp: 0, maxWind: 0, totalPrecip: 0, safeZones: 0, totalFires: 0, sourceCount: 0 };

    const sourceHealthLabel = data?.data_sources
        ? `GEE: ${data.data_sources.gee_satellite === 'online' ? '✅' : '❌'} | USGS: ${data.data_sources.usgs_seismic === 'online' ? '✅' : '❌'} | Weather: ${data.data_sources.openweather === 'online' ? '✅' : '❌'}`
        : 'No data';

    const cards = [
        {
            title: 'Threat Level',
            icon: <ThunderboltOutlined style={{ fontSize: 20 }} />,
            content: (
                <div>
                    <Tag color={threatColor} style={{ fontSize: 16, padding: '4px 16px', fontWeight: 700, letterSpacing: 1 }}>{threatLevel}</Tag>
                    <Progress percent={Math.round(s.avgRisk * 100)} strokeColor={threatColor} showInfo={false} size="small" style={{ marginTop: 8 }} />
                </div>
            ),
            color: threatColor,
        },
        {
            title: 'Active Alerts',
            icon: <AlertOutlined style={{ fontSize: 20, color: '#ef4444' }} />,
            content: (
                <Statistic value={s.highRisk} suffix={`/ ${s.total}`} valueStyle={{ color: s.highRisk > 0 ? '#ef4444' : '#22c55e', fontSize: 28, fontWeight: 700 }} />
            ),
            sub: `${s.critical} critical | ${s.totalFires} fire hotspot${s.totalFires !== 1 ? 's' : ''}`,
            color: '#ef4444',
        },
        {
            title: 'Safe Zones',
            icon: <SafetyOutlined style={{ fontSize: 20, color: '#22c55e' }} />,
            content: (
                <Statistic value={s.safeZones} suffix={`/ ${s.total}`} valueStyle={{ color: '#22c55e', fontSize: 28, fontWeight: 700 }} />
            ),
            sub: s.total > 0 ? `${Math.round((s.safeZones / s.total) * 100)}% clear` : '-- %',
            color: '#22c55e',
        },
        {
            title: 'Avg Risk Score',
            icon: <DashboardOutlined style={{ fontSize: 20, color: '#3b82f6' }} />,
            content: (
                <Statistic value={s.avgRisk} precision={3} valueStyle={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700 }} />
            ),
            sub: '27-feature ML ensemble',
            color: '#3b82f6',
        },
        {
            title: 'Peak Temperature',
            icon: <CloudOutlined style={{ fontSize: 20, color: '#f59e0b' }} />,
            content: (
                <Statistic value={s.maxTemp} suffix="°C" precision={1} valueStyle={{ color: '#f59e0b', fontSize: 28, fontWeight: 700 }} />
            ),
            sub: `Wind gust: ${s.maxWind.toFixed(1)} km/h`,
            color: '#f59e0b',
        },
        {
            title: 'Data Sources',
            icon: <ApiOutlined style={{ fontSize: 20, color: '#06b6d4' }} />,
            content: (
                <Tooltip title={sourceHealthLabel}>
                    <Statistic value={s.sourceCount} suffix="/ 4" valueStyle={{ color: '#06b6d4', fontSize: 28, fontWeight: 700 }} />
                </Tooltip>
            ),
            sub: sourceHealthLabel,
            color: '#06b6d4',
        },
    ];

    return (
        <Row gutter={[12, 12]}>
            {cards.map((card, idx) => (
                <Col key={idx} span={4}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08, duration: 0.4 }}>
                        <Card
                            size="small"
                            style={{
                                background: 'rgba(30,41,59,0.85)',
                                border: `1px solid ${card.color}22`,
                                borderRadius: 10,
                                backdropFilter: 'blur(8px)',
                            }}
                            styles={{ body: { padding: '12px 16px' } }}
                        >
                            <Space size={8} align="center" style={{ marginBottom: 8 }}>
                                {card.icon}
                                <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.title}</span>
                            </Space>
                            {card.content}
                            {card.sub && <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{card.sub}</div>}
                        </Card>
                    </motion.div>
                </Col>
            ))}
        </Row>
    );
}
