// ============================================================
// NEXUS-AID — Donor Dashboard Page
// Impact-focused dashboard: KPIs, mini-map preview, recent donations, quick actions
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Row, Col, Typography, Space, Tag, Badge, Progress, Button, Avatar } from 'antd';
import {
    GiftOutlined, HeartOutlined, EnvironmentOutlined,
    FileProtectOutlined, BellOutlined, ReadOutlined,
    CheckCircleOutlined, ClockCircleOutlined, ArrowRightOutlined,
    ThunderboltOutlined, StarOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { useAuthStore, useUIStore } from '@/stores';
import { donationService } from '@/services/donationService';
import type { DonationNeed, DonorStats } from '@/services/donationService';
import type { UIRecipt } from './DonorReceiptsPage';

const { Title, Text } = Typography;

// Data fetched from API

const TYPE_COLORS: Record<string, string> = {
    'Alimentaire': '#16a34a',
    'Médical': '#0ea5e9',
    'Équipement': '#8b5cf6',
    'Vêtements': '#f59e0b',
    'Urgence': '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
    'URGENT': '#ef4444',
    'NORMAL': '#f59e0b',
    'LOW': '#16a34a',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    'PENDING_RECEPTION': { label: 'En attente', color: '#f59e0b', icon: <ClockCircleOutlined /> },
    'RECEIVED': { label: 'Reçu', color: '#0ea5e9', icon: <CheckCircleOutlined /> },
    'VALIDATED': { label: 'Validé ✅', color: '#16a34a', icon: <CheckCircleOutlined /> },
    'DEFAULT': { label: 'Inconnu', color: '#999', icon: <ClockCircleOutlined /> },
};

// ============================================================
// Stat Card
// ============================================================
const StatCard: React.FC<{
    icon: React.ReactNode; value: string | number; label: string;
    color: string; trend?: string; isDark: boolean; onClick?: () => void;
}> = ({ icon, value, label, color, trend, isDark, onClick }) => (
    <div
        onClick={onClick}
        style={{
            background: isDark ? `linear-gradient(135deg, ${color}15, ${color}05)` : '#fff',
            borderRadius: 20,
            padding: '24px',
            border: `1px solid ${isDark ? `${color}20` : '#f0f0f0'}`,
            boxShadow: isDark ? `0 4px 20px rgba(0,0,0,0.2)` : '0 2px 12px rgba(0,0,0,0.06)',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = isDark ? `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${color}30` : `0 8px 28px rgba(0,0,0,0.1)`;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = isDark ? `0 4px 20px rgba(0,0,0,0.2)` : '0 2px 12px rgba(0,0,0,0.06)';
        }}
    >
        {/* Background glow */}
        <div style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `${color}10`,
        }} />
        <div style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: isDark ? `${color}20` : `${color}10`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color,
            marginBottom: 16,
        }}>
            {icon}
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: isDark ? '#fff' : '#1a1a1a', lineHeight: 1, marginBottom: 6 }}>
            {value}
        </div>
        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : '#888', display: 'block', marginBottom: 4 }}>
            {label}
        </Text>
        {trend && (
            <Tag style={{ background: isDark ? `${color}20` : `${color}10`, color, border: 'none', borderRadius: 8, fontSize: 11 }}>
                {trend}
            </Tag>
        )}
    </div>
);

// ============================================================
// Donation Status Badge
// ============================================================
const DonationStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['DEFAULT'];
    return (
        <Tag style={{
            background: `${cfg.color}15`,
            color: cfg.color,
            border: `1px solid ${cfg.color}30`,
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 10px',
        }}>
            {cfg.icon} {cfg.label}
        </Tag>
    );
};

// ============================================================
// Impact Progress Section
// ============================================================
const ImpactSection: React.FC<{ isDark: boolean }> = ({ isDark }) => {
    const categories = [
        { name: 'Alimentaire', pct: 45, color: '#16a34a' },
        { name: 'Médical', pct: 28, color: '#0ea5e9' },
        { name: 'Équipement', pct: 18, color: '#8b5cf6' },
        { name: 'Vêtements', pct: 9, color: '#f59e0b' },
    ];
    return (
        <div style={{
            background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
            borderRadius: 20,
            padding: 24,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
        }}>
            <Space style={{ marginBottom: 20 }}>
                <TrophyOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                <Title level={5} style={{ margin: 0 }}>Mon Impact par Catégorie</Title>
            </Space>
            {categories.map((c) => (
                <div key={c.name} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</Text>
                        <Text style={{ fontSize: 13, color: c.color, fontWeight: 600 }}>{c.pct}%</Text>
                    </div>
                    <Progress
                        percent={c.pct}
                        showInfo={false}
                        strokeColor={c.color}
                        trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}
                        strokeWidth={8}
                        strokeLinecap="round"
                    />
                </div>
            ))}
        </div>
    );
};

// ============================================================
// Main Dashboard Component
// ============================================================
const DonorDashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const [, setCurrentTime] = useState(new Date());

    const [stats, setStats] = useState<DonorStats>({
        totalDonations: 0,
        validatedDonations: 0,
        /* @ts-ignore */
pendingDonations: 0,
        totalBeneficiaries: 0,
        impactScore: 'B+',
    });
    const [recentDonations, setRecentDonations] = useState<UIRecipt[]>([]);
    const [urgentNeeds, setUrgentNeeds] = useState<DonationNeed[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsData, receiptsData, needsData] = await Promise.all([
                    donationService.getMyStats(),
                    donationService.getMyReceipts(),
                    donationService.getAllNeeds()
                ]);
                setStats(statsData);
                setRecentDonations(receiptsData.slice(0, 4));
                setUrgentNeeds(needsData.filter(n => n.priority === 'URGENT').slice(0, 3));
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };
        fetchDashboardData();
    }, []);

    const bgStyle: React.CSSProperties = {
        background: isDark
            ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
            : 'linear-gradient(135deg, #f0fdf4 0%, #f8fafc 100%)',
        minHeight: '100vh',
        margin: -24,
        padding: 24,
    };

    return (
        <div style={bgStyle}>
            {/* ---- Welcome Header ---- */}
            <div style={{
                background: isDark
                    ? 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))'
                    : 'linear-gradient(135deg, rgba(22,163,74,0.08), rgba(255,255,255,0.9))',
                borderRadius: 24,
                padding: '28px 32px',
                marginBottom: 28,
                border: `1px solid ${isDark ? 'rgba(22,163,74,0.2)' : 'rgba(22,163,74,0.15)'}`,
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.2)' : '0 4px 24px rgba(22,163,74,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: 18,
                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 26,
                        boxShadow: '0 0 24px rgba(22,163,74,0.4)',
                    }}>
                        💝
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0, fontSize: 22 }}>
                            Bonjour, {user?.fullName?.split(' ')[0] || 'Donateur'} !
                        </Title>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#555', fontSize: 14 }}>
                            Votre générosité aide des familles dans le besoin. Merci pour votre soutien ! 🌟
                        </Text>
                    </div>
                </div>
                <Space wrap>
                    <Tag style={{
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 10,
                        padding: '6px 18px',
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: isDark ? '0 0 16px rgba(22,163,74,0.3)' : 'none',
                    }}>
                        <StarOutlined /> Score Impact: {(stats as any).impactScore}
                    </Tag>
                    <Button
                        type="primary"
                        size="large"
                        icon={<HeartOutlined />}
                        onClick={() => navigate('/donor/donate')}
                        style={{
                            background: 'linear-gradient(135deg, #C81E1E, #ef4444)',
                            border: 'none',
                            borderRadius: 12,
                            fontWeight: 700,
                            height: 44,
                            boxShadow: '0 4px 16px rgba(200,30,30,0.3)',
                        }}
                    >
                        Faire un don maintenant
                    </Button>
                </Space>
            </div>

            {/* ---- KPI Stats ---- */}
            <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        isDark={isDark}
                        icon={<GiftOutlined />}
                        value={stats.totalDonations}
                        label="Dons effectués"
                        color="#16a34a"
                        trend="↑ Ce mois"
                        onClick={() => navigate('/donor/receipts')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        isDark={isDark}
                        icon={<HeartOutlined />}
                        value={(stats as any).totalBeneficiaries}
                        label="Bénéficiaires aidés"
                        color="#ec4899"
                        trend="Personnes impactées"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        isDark={isDark}
                        icon={<EnvironmentOutlined />}
                        value={recentDonations.length > 0 ? new Set(recentDonations.map(r => r.committeeName)).size : 0}
                        label="Zones couvertes"
                        color="#0ea5e9"
                        trend="Gouvernorats"
                        onClick={() => navigate('/donor/map')}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        isDark={isDark}
                        icon={<CheckCircleOutlined />}
                        value={stats.validatedDonations}
                        label="Dons validés"
                        color="#8b5cf6"
                        trend="Réceptions confirmées"
                    />
                </Col>
            </Row>

            {/* ---- Main Content Grid ---- */}
            <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                {/* Recent Donations */}
                <Col xs={24} lg={14}>
                    <div style={{
                        background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                        borderRadius: 20,
                        padding: 24,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                        height: '100%',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <Space>
                                <ClockCircleOutlined style={{ color: '#16a34a', fontSize: 18 }} />
                                <Title level={5} style={{ margin: 0 }}>Mes derniers dons</Title>
                            </Space>
                            <Button
                                type="link"
                                size="small"
                                icon={<ArrowRightOutlined />}
                                onClick={() => navigate('/donor/receipts')}
                                style={{ color: '#16a34a', fontWeight: 600 }}
                            >
                                Voir tous les reçus
                            </Button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {recentDonations.length === 0 ? (
                                <Text style={{ textAlign: 'center', display: 'block', color: '#999', padding: '20px' }}>
                                    Vous n'avez pas encore effectué de don.
                                </Text>
                            ) : recentDonations.map((don) => (
                                <div key={don.id} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '14px 16px',
                                    borderRadius: 14,
                                    background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                                    gap: 12,
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#16a34a30'; e.currentTarget.style.background = isDark ? 'rgba(22,163,74,0.08)' : '#f0fdf4'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'; e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc'; }}
                                    onClick={() => navigate('/donor/receipts')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                                        <Avatar
                                            size={42}
                                            style={{
                                                background: `${TYPE_COLORS[don.donationType] || '#ccc'}15`,
                                                color: TYPE_COLORS[don.donationType] || '#ccc',
                                                fontSize: 18,
                                                flexShrink: 0,
                                            }}
                                        >
                                            {don.donationType === 'Alimentaire' ? '🍞' : don.donationType === 'Médical' ? '🏥' : don.donationType === 'Équipement' ? '⚙️' : '👕'}
                                        </Avatar>
                                        <div style={{ minWidth: 0 }}>
                                            <Text strong style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {don.committeeName}
                                            </Text>
                                            <Space size={4} wrap>
                                                <Tag style={{ background: `${TYPE_COLORS[don.donationType] || '#ccc'}15`, color: TYPE_COLORS[don.donationType] || '#999', border: 'none', borderRadius: 6, fontSize: 11, margin: 0 }}>
                                                    {don.donationType}
                                                </Tag>
                                                <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>
                                                    {don.quantity} · {new Date(don.createdAt).toLocaleDateString('fr-FR')}
                                                </Text>
                                            </Space>
                                        </div>
                                    </div>
                                    <DonationStatusBadge status={don.status} />
                                </div>
                            ))}
                        </div>
                    </div>
                </Col>

                {/* Right column: Impact + Urgent Needs */}
                <Col xs={24} lg={10}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Impact section */}
                        <ImpactSection isDark={isDark} />

                        {/* Quick Actions */}
                        <div style={{
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                            borderRadius: 20,
                            padding: 24,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                        }}>
                            <Space style={{ marginBottom: 16 }}>
                                <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                                <Title level={5} style={{ margin: 0 }}>Actions rapides</Title>
                            </Space>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[
                                    { icon: '🗺', label: 'Carte des besoins', route: '/donor/map', color: '#0ea5e9' },
                                    { icon: '💝', label: 'Faire un don', route: '/donor/donate', color: '#16a34a' },
                                    { icon: '🧾', label: 'Mes reçus', route: '/donor/receipts', color: '#8b5cf6' },
                                    { icon: '🔔', label: 'Notifications', route: '/donor/notifications', color: '#f59e0b' },
                                ].map((action) => (
                                    <div
                                        key={action.label}
                                        onClick={() => navigate(action.route)}
                                        style={{
                                            padding: '16px 14px',
                                            borderRadius: 14,
                                            background: isDark ? `${action.color}10` : `${action.color}06`,
                                            border: `1px solid ${action.color}20`,
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = isDark ? `${action.color}20` : `${action.color}10`; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.background = isDark ? `${action.color}10` : `${action.color}06`; }}
                                    >
                                        <div style={{ fontSize: 22, marginBottom: 6 }}>{action.icon}</div>
                                        <Text style={{ fontSize: 12, fontWeight: 600, color: action.color, display: 'block' }}>
                                            {action.label}
                                        </Text>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* ---- Urgent Needs Preview ---- */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                borderRadius: 20,
                padding: 24,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Space>
                        <span style={{ fontSize: 20 }}>🚨</span>
                        <Title level={5} style={{ margin: 0, color: '#ef4444' }}>Besoins urgents — Agissez maintenant</Title>
                    </Space>
                    <Button
                        type="link"
                        icon={<ArrowRightOutlined />}
                        onClick={() => navigate('/donor/map')}
                        style={{ color: '#16a34a', fontWeight: 600 }}
                    >
                        Voir tous les besoins
                    </Button>
                </div>

                <Row gutter={[16, 16]}>
                    {urgentNeeds.length === 0 ? (
                        <Col span={24}>
                            <Text style={{ display: 'block', textAlign: 'center', padding: '40px', color: '#999' }}>
                                Aucun besoin urgent pour le moment.
                            </Text>
                        </Col>
                    ) : urgentNeeds.map((need) => (
                        <Col xs={24} md={8} key={need.id}>
                            <div style={{
                                borderRadius: 16,
                                padding: 20,
                                background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                                border: `1px solid ${need.priority === 'URGENT' ? '#ef444430' : isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12,
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                onClick={() => navigate('/donor/donate', { state: { needId: need.id } })}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Tag style={{
                                        background: `${PRIORITY_COLORS[need.priority]}15`,
                                        color: PRIORITY_COLORS[need.priority],
                                        border: 'none',
                                        borderRadius: 8,
                                        fontWeight: 700,
                                        fontSize: 11,
                                    }}>
                                        {need.priority === 'URGENT' ? '🔴' : '🟡'} {need.priority}
                                    </Tag>
                                    <Tag style={{ background: `${TYPE_COLORS[need.type]}15`, color: TYPE_COLORS[need.type], border: 'none', borderRadius: 8, fontSize: 11 }}>
                                        {need.type}
                                    </Tag>
                                </div>

                                <div>
                                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 4 }}>
                                        {need.committeeName}
                                    </Text>
                                    <Space size={4}>
                                        <EnvironmentOutlined style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }} />
                                        <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{need.committeeRegion}</Text>
                                    </Space>
                                </div>

                                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : '#555', lineHeight: 1.5 }}>
                                    {need.description}
                                </Text>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Space>
                                        <HeartOutlined style={{ color: '#ec4899', fontSize: 14 }} />
                                        <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#888' }}>
                                            {need.beneficiaries} bénéficiaires
                                        </Text>
                                    </Space>
                                    <Badge
                                        color={need.status === 'OPEN' ? '#16a34a' : '#f59e0b'}
                                        text={<Text style={{ fontSize: 11, color: need.status === 'OPEN' ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
                                            {need.status === 'OPEN' ? 'Ouvert' : 'En cours'}
                                        </Text>}
                                    />
                                </div>

                                <Button
                                    type="primary"
                                    block
                                    icon={<HeartOutlined />}
                                    style={{
                                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                                        border: 'none',
                                        borderRadius: 10,
                                        fontWeight: 600,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/donor/donate', { state: { needId: need.id } });
                                    }}
                                >
                                    Faire un don
                                </Button>
                            </div>
                        </Col>
                    ))}
                </Row>
            </div>

            {/* Bottom transparency bar */}
            <div style={{
                marginTop: 24,
                padding: '14px 24px',
                borderRadius: 16,
                background: isDark ? 'rgba(22,163,74,0.05)' : 'rgba(22,163,74,0.04)',
                border: `1px solid rgba(22,163,74,0.15)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
            }}>
                <Space>
                    <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                    <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: 500 }}>
                        Transparence totale — Chaque don est tracé, validé et certifié
                    </Text>
                </Space>
                <Space split={<span style={{ color: isDark ? '#333' : '#ddd' }}>•</span>} wrap>
                    <Tag color="success" bordered={false} style={{ fontSize: 11 }}>Don → QR → Réception → Validation → Reçu PDF</Tag>
                    <Tag icon={<ReadOutlined />} color="processing" bordered={false} onClick={() => navigate('/donor/news')} style={{ cursor: 'pointer', fontSize: 11 }}>
                        Actualités
                    </Tag>
                </Space>
            </div>
        </div>
    );
};

export default DonorDashboardPage;
