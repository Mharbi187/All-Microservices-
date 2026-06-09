// ============================================================
// NEXUS-AID — Family Details Panel (Drawer)
// Contextual info, vulnerability score, and action history
// ============================================================

import { useState, useEffect } from 'react';
import {
    Drawer, Typography, Tag, Timeline, Card, Progress, Row, Col,
    Statistic, Descriptions, Spin, Empty, Button, Space, Divider, Badge,
} from 'antd';
import {
    TeamOutlined, EnvironmentOutlined, HeartOutlined,
    CalendarOutlined, TrophyOutlined, HistoryOutlined,
    ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
    PlusOutlined, MedicineBoxOutlined, ShoppingOutlined,
    HomeOutlined,
} from '@ant-design/icons';
import { socialService } from '@/services/domainServices';
import type { FamilyDTO, SocialActionDTO, VulnerabilityScoreDTO } from '@/types';

const { Title, Text } = Typography;

const TREND_MAP: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    IMPROVING: { icon: <ArrowDownOutlined />, color: '#10b981', label: 'En amélioration' },
    WORSENING: { icon: <ArrowUpOutlined />, color: '#ef4444', label: 'En détérioration' },
    STABLE: { icon: <MinusOutlined />, color: '#6366f1', label: 'Stable' },
};

const NEED_COLORS: Record<string, string> = {
    MEDICAL: '#ef4444', FOOD: '#f59e0b', SHELTER: '#6366f1',
    CLOTHING: '#8b5cf6', FINANCIAL: '#10b981', EDUCATION: '#0ea5e9',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
    FOOD_DELIVERY: <ShoppingOutlined />,
    MEDICAL_AID: <MedicineBoxOutlined />,
    FINANCIAL: <TrophyOutlined />,
    SHELTER_SUPPORT: <HomeOutlined />,
};

interface FamilyDetailsProps {
    family: FamilyDTO | null;
    open: boolean;
    onClose: () => void;
    onAddAction?: () => void;
}

const FamilyDetails: React.FC<FamilyDetailsProps> = ({ family, open, onClose, onAddAction }) => {
    const [loading, setLoading] = useState(false);
    const [actions, setActions] = useState<SocialActionDTO[]>([]);
    const [score, setScore] = useState<VulnerabilityScoreDTO | null>(null);
    const [scoreHistory, setScoreHistory] = useState<VulnerabilityScoreDTO[]>([]);

    useEffect(() => {
        if (!family?.id || !open) return;
        setLoading(true);
        Promise.all([
            socialService.getActions(family.id).catch(() => []),
            socialService.getScore(family.id).catch(() => null),
            socialService.getScoreHistory(family.id).catch(() => []),
        ]).then(([acts, sc, hist]) => {
            setActions(Array.isArray(acts) ? acts : []);
            setScore(sc);
            setScoreHistory(Array.isArray(hist) ? hist : []);
        }).finally(() => setLoading(false));
    }, [family?.id, open]);

    if (!family) return null;

    const trend = score ? TREND_MAP[score.trend] || TREND_MAP.STABLE : TREND_MAP.STABLE;
    const scoreColor = !score ? '#6366f1' : score.score >= 76 ? '#ef4444' : score.score >= 51 ? '#f97316' : score.score >= 26 ? '#f59e0b' : '#10b981';

    return (
        <Drawer
            title={null}
            placement="right"
            width={560}
            open={open}
            onClose={onClose}
            styles={{
                body: { padding: 0, background: '#f8fafc' },
                header: { display: 'none' },
            }}
        >
            {/* Header Banner */}
            <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                padding: '28px 24px 20px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <Title level={4} style={{ color: '#f1f5f9', margin: 0 }}>
                            {family.familyName}
                        </Title>
                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                            Chef: {family.headOfFamily}
                        </Text>
                    </div>
                    <Tag
                        color={family.status === 'ACTIVE' ? 'green' : family.status === 'SUPPORTED' ? 'blue' : 'default'}
                        bordered={false}
                        style={{ fontSize: 11, fontWeight: 600 }}
                    >
                        {family.status}
                    </Tag>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TeamOutlined style={{ color: '#6366f1' }} />
                        <Text style={{ color: '#cbd5e1', fontSize: 13 }}>{family.members} membres</Text>
                    </div>
                    {family.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <EnvironmentOutlined style={{ color: '#6366f1' }} />
                            <Text style={{ color: '#cbd5e1', fontSize: 13 }}>{family.address}</Text>
                        </div>
                    )}
                </div>
                {/* Event Tags */}
                {family.eventTags && family.eventTags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                        {family.eventTags.map(tag => (
                            <Tag key={tag} bordered={false} style={{
                                background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                                fontSize: 11, borderRadius: 6,
                            }}>
                                <CalendarOutlined /> {tag}
                            </Tag>
                        ))}
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Spin size="large" />
                </div>
            ) : (
                <div style={{ padding: '20px 24px' }}>
                    {/* ---- Vulnerability Score Card ---- */}
                    <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}
                        styles={{ body: { padding: '16px 20px' } }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 14 }}>🎯 Score de Vulnérabilité</Text>
                            <Tag bordered={false} style={{ color: trend.color, background: `${trend.color}15` }}>
                                {trend.icon} {trend.label}
                            </Tag>
                        </div>
                        <Row gutter={16} align="middle">
                            <Col span={8}>
                                <Progress
                                    type="dashboard"
                                    percent={score?.score || 0}
                                    size={90}
                                    strokeColor={scoreColor}
                                    format={p => <span style={{ fontSize: 18, fontWeight: 700 }}>{p}</span>}
                                />
                            </Col>
                            <Col span={16}>
                                {score?.factors ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {Object.entries(score.factors).map(([key, val]) => (
                                            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>
                                                    {key.replace(/([A-Z])/g, ' $1')}
                                                </Text>
                                                <div style={{ width: 80 }}>
                                                    <Progress
                                                        percent={val * 4} // Normalize to visual range
                                                        size="small"
                                                        showInfo={false}
                                                        strokeColor={val > 15 ? '#ef4444' : val > 8 ? '#f59e0b' : '#10b981'}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12 }}>Aucun score calculé</Text>
                                )}
                            </Col>
                        </Row>
                    </Card>

                    {/* ---- Needs ---- */}
                    {((family.needsType && family.needsType.length > 0) || (family.urgentNeeds && family.urgentNeeds.length > 0)) && (
                        <Card size="small" style={{ borderRadius: 12, marginBottom: 16 }}
                            styles={{ body: { padding: '14px 18px' } }}
                        >
                            <Text strong style={{ fontSize: 13 }}>📋 Besoins identifiés</Text>
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                {(family.needsType || []).map(n => (
                                    <Tag key={n} bordered={false} style={{
                                        background: `${NEED_COLORS[n] || '#6366f1'}15`,
                                        color: NEED_COLORS[n] || '#6366f1',
                                        borderRadius: 6,
                                    }}>
                                        {n}
                                    </Tag>
                                ))}
                            </div>
                            {family.urgentNeeds && family.urgentNeeds.length > 0 && (
                                <>
                                    <Divider style={{ margin: '10px 0' }} />
                                    <Text type="danger" style={{ fontSize: 12, fontWeight: 600 }}>⚠️ Besoins urgents</Text>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                        {family.urgentNeeds.map(n => (
                                            <Tag key={n} color="red" bordered={false} style={{ borderRadius: 6 }}>{n}</Tag>
                                        ))}
                                    </div>
                                </>
                            )}
                        </Card>
                    )}

                    {/* ---- Action History Timeline ---- */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 14 }}>
                            <HistoryOutlined /> Historique des Actions ({actions.length})
                        </Text>
                        <Button
                            type="primary" size="small"
                            icon={<PlusOutlined />}
                            style={{ background: '#C81E1E', borderRadius: 8 }}
                            onClick={onAddAction}
                        >
                            Nouvelle Action
                        </Button>
                    </div>

                    {actions.length > 0 ? (
                        <Timeline
                            items={actions
                                .sort((a, b) => (b.performedAt || '').localeCompare(a.performedAt || ''))
                                .map(action => ({
                                    dot: (
                                        <div style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: 'rgba(99,102,241,0.1)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#6366f1', fontSize: 13,
                                        }}>
                                            {ACTION_ICONS[action.actionType || ''] || <HeartOutlined />}
                                        </div>
                                    ),
                                    children: (
                                        <Card size="small" style={{ borderRadius: 10, marginBottom: 4 }}
                                            styles={{ body: { padding: '10px 14px' } }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Text strong style={{ fontSize: 13 }}>{action.actionType}</Text>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {action.performedAt ? new Date(action.performedAt).toLocaleDateString('fr-FR') : '—'}
                                                </Text>
                                            </div>
                                            {action.eventContext && (
                                                <Tag bordered={false} style={{ fontSize: 10, marginTop: 4, background: '#fef3c7', color: '#92400e' }}>
                                                    {action.eventContext}
                                                </Tag>
                                            )}
                                            {action.notes && (
                                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                                    {action.notes}
                                                </Text>
                                            )}
                                            {action.quantity != null && action.quantity > 0 && (
                                                <Text style={{ fontSize: 11, color: '#6366f1' }}>
                                                    Quantité: {action.quantity}
                                                </Text>
                                            )}
                                        </Card>
                                    ),
                                }))}
                        />
                    ) : (
                        <Empty description="Aucune action enregistrée" style={{ padding: '20px 0' }} />
                    )}
                </div>
            )}
        </Drawer>
    );
};

export default FamilyDetails;
