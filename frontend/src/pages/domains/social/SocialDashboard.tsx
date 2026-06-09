// ============================================================
// NEXUS-AID — Social Analytics Dashboard
// KPI cards, vulnerability bands, needs distribution, priority families
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Row, Col, Typography, Tag, Statistic, Progress,
    Spin, Empty, Table, Space, Badge,
} from 'antd';
import {
    HomeOutlined, HeartOutlined, TeamOutlined,
    AlertOutlined, TrophyOutlined, CalendarOutlined,
    ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
    BarChartOutlined, PieChartFilled,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { socialService } from '@/services/domainServices';
import type { SocialAnalyticsDTO } from '@/types';

const { Title, Text } = Typography;

// ---- Band colors ----
const BAND_COLORS: Record<string, string> = {
    critical: '#ef4444', high: '#f97316', moderate: '#f59e0b', low: '#10b981',
};
const BAND_LABELS: Record<string, string> = {
    critical: 'Critique (76-100)', high: 'Élevé (51-75)', moderate: 'Modéré (26-50)', low: 'Faible (0-25)',
};

const TREND_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
    WORSENING: { icon: <ArrowUpOutlined />, color: '#ef4444' },
    IMPROVING: { icon: <ArrowDownOutlined />, color: '#10b981' },
    STABLE: { icon: <MinusOutlined />, color: '#6366f1' },
};

const SocialDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<SocialAnalyticsDTO | null>(null);

    useEffect(() => {
        socialService.getAnalytics()
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>;
    if (!data) return <Empty description="Aucune donnée analytique disponible" />;

    const totalScored = Object.values(data?.vulnerabilityBands || {}).reduce((s, v) => s + v, 0);

    // Priority families table columns
    const prioColumns: ColumnsType<SocialAnalyticsDTO['priorityFamilies'][0]> = [
        {
            title: '#', key: 'rank', width: 40,
            render: (_, __, idx) => (
                <Badge count={idx + 1} style={{
                    background: idx < 3 ? '#ef4444' : '#64748b',
                    fontWeight: 700, fontSize: 11,
                }} />
            ),
        },
        {
            title: 'Famille', dataIndex: 'familyName', key: 'familyName',
            render: (n: string) => <Text strong>{n || '—'}</Text>,
        },
        {
            title: 'Membres', dataIndex: 'members', key: 'members',
            render: (m: number) => <Tag bordered={false}><TeamOutlined /> {m || 0}</Tag>,
        },
        {
            title: 'Score', dataIndex: 'score', key: 'score',
            render: (s: number) => (
                <Tag bordered={false} style={{
                    color: s >= 76 ? '#ef4444' : s >= 51 ? '#f97316' : s >= 26 ? '#f59e0b' : '#10b981',
                    background: `${s >= 76 ? '#ef4444' : s >= 51 ? '#f97316' : s >= 26 ? '#f59e0b' : '#10b981'}15`,
                    fontWeight: 700,
                }}>
                    {s}/100
                </Tag>
            ),
        },
        {
            title: 'Tendance', dataIndex: 'trend', key: 'trend',
            render: (t: string) => {
                const cfg = TREND_CONFIG[t] || TREND_CONFIG.STABLE;
                return <Tag bordered={false} style={{ color: cfg.color }}>{cfg.icon} {t}</Tag>;
            },
        },
    ];

    return (
        <div>
            {/* ---- KPI Row ---- */}
            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                {[
                    { label: 'Familles', value: data.totalFamilies, icon: <HomeOutlined />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                    { label: 'Membres', value: data.totalMembers, icon: <TeamOutlined />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { label: 'Cas urgents', value: data.urgentCases, icon: <AlertOutlined />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                    { label: 'Actions réalisées', value: data.totalActions, icon: <HeartOutlined />, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                ].map(kpi => (
                    <Col xs={12} sm={6} key={kpi.label}>
                        <Card size="small" style={{ borderRadius: 12 }} styles={{ body: { padding: '14px 18px' } }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: kpi.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: kpi.color, fontSize: 18,
                                }}>
                                    {kpi.icon}
                                </div>
                                <Statistic
                                    title={<span style={{ fontSize: 12 }}>{kpi.label}</span>}
                                    value={kpi.value}
                                    valueStyle={{ fontSize: 22, fontWeight: 700 }}
                                />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[12, 12]}>
                {/* ---- Vulnerability Distribution ---- */}
                <Col xs={24} md={12}>
                    <Card size="small" style={{ borderRadius: 12, height: '100%' }}
                        styles={{ body: { padding: '16px 20px' } }}
                        title={<span><PieChartFilled style={{ color: '#6366f1' }} /> Distribution de Vulnérabilité</span>}
                    >
                        {totalScored === 0 ? (
                            <Empty description="Aucun score disponible" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {Object.entries(data.vulnerabilityBands).map(([band, count]) => {
                                    const pct = totalScored ? Math.round((count / totalScored) * 100) : 0;
                                    return (
                                        <div key={band}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <Text style={{ fontSize: 12, fontWeight: 500 }}>
                                                    {BAND_LABELS[band]}
                                                </Text>
                                                <Text style={{ fontSize: 12, fontWeight: 700, color: BAND_COLORS[band] }}>
                                                    {count} ({pct}%)
                                                </Text>
                                            </div>
                                            <Progress
                                                percent={pct}
                                                showInfo={false}
                                                strokeColor={BAND_COLORS[band]}
                                                trailColor="rgba(0,0,0,0.04)"
                                                size="small"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>
                </Col>

                {/* ---- Needs Distribution ---- */}
                <Col xs={24} md={12}>
                    <Card size="small" style={{ borderRadius: 12, height: '100%' }}
                        styles={{ body: { padding: '16px 20px' } }}
                        title={<span><BarChartOutlined style={{ color: '#f59e0b' }} /> Distribution des Besoins</span>}
                    >
                        {Object.keys(data.needsDistribution).length === 0 ? (
                            <Empty description="Aucune donnée" />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {Object.entries(data.needsDistribution)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([need, count]) => {
                                        const maxCount = Math.max(...Object.values(data.needsDistribution));
                                        const pct = maxCount ? Math.round((count / maxCount) * 100) : 0;
                                        const color = { MEDICAL: '#ef4444', FOOD: '#f59e0b', SHELTER: '#6366f1', CLOTHING: '#8b5cf6', FINANCIAL: '#10b981' }[need] || '#64748b';
                                        return (
                                            <div key={need}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <Text style={{ fontSize: 12 }}>{need}</Text>
                                                    <Text strong style={{ fontSize: 12 }}>{count}</Text>
                                                </div>
                                                <div style={{
                                                    height: 6, borderRadius: 3,
                                                    background: 'rgba(0,0,0,0.04)',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        width: `${pct}%`, height: '100%',
                                                        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                                                        borderRadius: 3,
                                                        transition: 'width 0.8s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        )}
                    </Card>
                </Col>
            </Row>

            {/* ---- Event Tag Distribution ---- */}
            {Object.keys(data.eventTagDistribution).length > 0 && (
                <Card size="small" style={{ borderRadius: 12, marginTop: 12 }}
                    styles={{ body: { padding: '16px 20px' } }}
                    title={<span><CalendarOutlined style={{ color: '#8b5cf6' }} /> Couverture par Événement</span>}
                >
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {Object.entries(data.eventTagDistribution).map(([event, count]) => (
                            <Card key={event} size="small" style={{
                                borderRadius: 10, minWidth: 140, textAlign: 'center',
                                border: '1px solid rgba(139,92,246,0.15)',
                            }}
                                styles={{ body: { padding: '12px 16px' } }}
                            >
                                <Text type="secondary" style={{ fontSize: 11 }}>{event}</Text>
                                <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6', marginTop: 4 }}>
                                    {count}
                                </div>
                                <Text type="secondary" style={{ fontSize: 10 }}>familles</Text>
                            </Card>
                        ))}
                    </div>
                </Card>
            )}

            {/* ---- Priority Families ---- */}
            <Card size="small" style={{ borderRadius: 12, marginTop: 12 }}
                styles={{ body: { padding: '16px 20px' } }}
                title={<span><TrophyOutlined style={{ color: '#ef4444' }} /> Familles Prioritaires (Top 10)</span>}
            >
                {data.priorityFamilies.length > 0 ? (
                    <Table
                        columns={prioColumns}
                        dataSource={data.priorityFamilies}
                        rowKey="familyId"
                        size="small"
                        pagination={false}
                    />
                ) : (
                    <Empty description="Aucune famille avec score" />
                )}
            </Card>

            {/* ---- Actions by Type ---- */}
            {Object.keys(data.actionsByType).length > 0 && (
                <Card size="small" style={{ borderRadius: 12, marginTop: 12 }}
                    styles={{ body: { padding: '16px 20px' } }}
                    title={<span><HeartOutlined style={{ color: '#10b981' }} /> Actions par Type</span>}
                >
                    <Row gutter={[12, 12]}>
                        {Object.entries(data.actionsByType).map(([type, count]) => (
                            <Col xs={12} sm={8} md={6} key={type}>
                                <div style={{
                                    padding: '14px 16px', borderRadius: 10,
                                    background: 'rgba(16,185,129,0.06)',
                                    border: '1px solid rgba(16,185,129,0.12)',
                                    textAlign: 'center',
                                }}>
                                    <Text style={{ fontSize: 11, color: '#64748b' }}>{type}</Text>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981', marginTop: 4 }}>
                                        {count}
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Card>
            )}
        </div>
    );
};

export default SocialDashboard;
