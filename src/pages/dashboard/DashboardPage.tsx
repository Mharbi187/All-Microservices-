// ============================================================
// NEXUS-AID — Enterprise Dashboard v3.0
// Clean enterprise UX matching mockup designs
// Light & Dark modes, responsive layout
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Col, Row, Typography, Space, Tag, List, Avatar,
    Progress, Tooltip, Badge, Spin, Empty, Button
} from 'antd';
import {
    TeamOutlined, AlertOutlined, InboxOutlined, GiftOutlined,
    HeartOutlined, ApartmentOutlined,
    ClockCircleOutlined, EnvironmentOutlined,
    FileTextOutlined, ThunderboltOutlined,
    BellOutlined, CheckCircleOutlined,
    BarChartOutlined, MedicineBoxOutlined, SoundOutlined,
    HomeOutlined, GlobalOutlined,
    CrownOutlined, BookOutlined,
    TrophyOutlined, SettingOutlined,
    FundOutlined, CalendarOutlined, StarOutlined,
    SafetyOutlined, AuditOutlined,
    InfoCircleOutlined, PlusOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/stores';
import { getUserPermissions } from '@/config/roleConfig';
import committeeService from '@/services/committeeService';
import volunteerService from '@/services/volunteerService';
import inventoryService from '@/services/inventoryService';
import { secourismeService } from '@/services/domainServices';
import type { CommitteeOverview, InventoryItemDTO, StockAlertDTO } from '@/types';

const { Title, Text } = Typography;

// ============================================================
// Mini Sparkline SVG
// ============================================================
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({
    data, color, height = 36,
}) => {
    const max = Math.max(...data, 1);
    const w = 80;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * (height - 4)}`).join(' ');
    return (
        <svg width={w} height={height} style={{ opacity: 0.6 }}>
            <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
    );
};

// ============================================================
// KPI Card — Matches mockup exactly
// ============================================================
interface KpiCardProps {
    icon: React.ReactNode;
    iconBg: string;         // icon container bg color
    iconColor: string;      // icon color
    title: string;
    value: number | string;
    badge?: { label: string; color: string; bg: string };
    sparkData?: number[];
    sparkColor?: string;
    isDark: boolean;
    onClick?: () => void;
}

const KpiCard: React.FC<KpiCardProps> = ({
    icon, iconBg, iconColor, title, value, badge, sparkData, sparkColor, isDark, onClick,
}) => (
    <div
        onClick={onClick}
        style={{
            background: isDark ? '#1C1C1E' : '#FFFFFF',
            borderRadius: 16,
            padding: '20px 22px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#EBEBEB'}`,
            transition: 'all 0.25s ease',
            cursor: onClick ? 'pointer' : 'default',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
        }}
        onMouseEnter={(e) => {
            if (onClick) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = isDark
                    ? '0 8px 24px rgba(0,0,0,0.4)'
                    : '0 8px 24px rgba(0,0,0,0.10)';
            }
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        {/* Top row: icon + badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: iconColor,
            }}>
                {icon}
            </div>
            {badge && (
                <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: badge.color,
                    background: badge.bg,
                    borderRadius: 20, padding: '3px 10px',
                    border: `1px solid ${badge.color}30`,
                }}>
                    {badge.label}
                </span>
            )}
        </div>

        {/* Bottom row: title + value + sparkline */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <Text style={{
                    fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    color: isDark ? 'rgba(255,255,255,0.45)' : '#8A8A8E',
                    display: 'block', marginBottom: 6,
                }}>
                    {title}
                </Text>
                <span style={{
                    fontSize: 34, fontWeight: 800, lineHeight: 1,
                    color: isDark ? '#FFFFFF' : '#1C1C1E',
                    fontFamily: "'Inter', 'DM Sans', sans-serif",
                }}>
                    {value}
                </span>
            </div>
            {sparkData && sparkColor && (
                <Sparkline data={sparkData} color={sparkColor} />
            )}
        </div>
    </div>
);

// ============================================================
// Bar Chart — Matching the design image exactly
// ============================================================
const VolunteersBarChart: React.FC<{ committees: CommitteeOverview[]; isDark: boolean }> = ({ committees, isDark }) => {
    const data = committees.slice(0, 7);
    if (data.length === 0) return <Empty description="Aucune donnée" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
    const max = Math.max(...data.map(c => c.totalVolunteers || 0), 1);

    return (
        <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '16px 0 8px' }}>
            {data.map((c) => {
                const pct = ((c.totalVolunteers || 0) / max) * 100;
                const barH = Math.max((pct / 100) * 160, 8);
                return (
                    <Tooltip key={c.id} title={`${c.name}: ${c.totalVolunteers || 0} volontaires`}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 11, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.75)' : '#3C3C43' }}>
                                {c.totalVolunteers || 0}
                            </Text>
                            <div style={{
                                width: '80%', height: barH,
                                borderRadius: '6px 6px 4px 4px',
                                background: '#E8001D',
                                transition: 'height 0.8s ease',
                                boxShadow: isDark ? '0 0 10px rgba(232,0,29,0.35)' : '0 2px 8px rgba(232,0,29,0.25)',
                            }} />
                            <Text style={{ fontSize: 10, color: isDark ? 'rgba(255,255,255,0.35)' : '#8A8A8E', textAlign: 'center' }}>
                                {c.region || c.name}
                            </Text>
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
};

// ============================================================
// Section Card Wrapper
// ============================================================
const SectionCard: React.FC<{
    title: React.ReactNode;
    extra?: React.ReactNode;
    children: React.ReactNode;
    isDark: boolean;
    style?: React.CSSProperties;
}> = ({ title, extra, children, isDark, style }) => (
    <div style={{
        background: isDark ? '#1C1C1E' : '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#EBEBEB'}`,
        overflow: 'hidden',
        ...style,
    }}>
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7'}`,
        }}>
            <Space size={8}>
                {title}
            </Space>
            {extra}
        </div>
        <div style={{ padding: '12px 20px 20px' }}>
            {children}
        </div>
    </div>
);

// ============================================================
// Quick Action Button
// ============================================================
const QuickAction: React.FC<{
    icon: React.ReactNode; label: string; desc: string;
    color: string; onClick: () => void; isDark: boolean;
}> = ({ icon, label, desc, color, onClick, isDark }) => (
    <div onClick={onClick} style={{
        borderRadius: 14, padding: '16px 14px', cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F0'}`,
    }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = isDark ? `${color}14` : `${color}08`;
            e.currentTarget.style.borderColor = `${color}40`;
            e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA';
            e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.07)' : '#F0F0F0';
            e.currentTarget.style.transform = 'none';
        }}>
        <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: isDark ? `${color}20` : `${color}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color, marginBottom: 10,
        }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#8A8A8E' }}>{desc}</Text>
    </div>
);

// ============================================================
// Main Dashboard Component
// ============================================================
const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const themeMode = useUIStore((s) => s.themeMode);
    const isDark = themeMode === 'dark';
    const permissions = getUserPermissions(user?.roles || [], user?.type);
    const [loading, setLoading] = useState(true);

    const [committees, setCommittees] = useState<CommitteeOverview[]>([]);
    const [inventory, setInventory] = useState<InventoryItemDTO[]>([]);
    const [alerts, setAlerts] = useState<StockAlertDTO[]>([]);
    const [volunteerData, setVolunteerData] = useState<CommitteeOverview[]>([]);
    const [secourismeEqCount, setSecourismeEqCount] = useState<number | string>('—');
    const [secourismeDvCount, setSecourismeDvCount] = useState<number | string>('—');
    const [jeunesseFormsCount, setJeunesseFormsCount] = useState<number | string>('—');
    const [jeunesseProjectsCount, setJeunesseProjectsCount] = useState<number | string>('—');
    const [santeActionsCount, setSanteActionsCount] = useState<number | string>('—');
    const [socialFamiliesCount, setSocialFamiliesCount] = useState<number | string>('—');
    const [socialActionsCount, setSocialActionsCount] = useState<number | string>('—');
    const [vffCasesCount, setVffCasesCount] = useState<number | string>('—');
    const [immigrationCasesCount, setImmigrationCasesCount] = useState<number | string>('—');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const comms = await committeeService.getHierarchy().catch(() => []);
                setCommittees(comms);
                if (permissions.sidebarKeys.includes('/volunteers')) {
                    const vols = await volunteerService.getVisible().catch(() => []);
                    setVolunteerData(vols);
                }
                if (permissions.sidebarKeys.includes('/stocks') && user?.committeeId) {
                    const inv = await inventoryService.getByCommittee(user.committeeId).catch(() => []);
                    setInventory(inv);
                    const al = await inventoryService.getAlerts().catch(() => []);
                    setAlerts(al);
                }
                if (permissions.sidebarKeys.includes('/secourisme') && user?.committeeId) {
                    const eq = await secourismeService.getEquipment(user.committeeId).catch(() => []);
                    const dv = await secourismeService.getDevices(user.committeeId).catch(() => []);
                    setSecourismeEqCount(eq.length);
                    setSecourismeDvCount(dv.length);
                }
                if (permissions.sidebarKeys.includes('/jeunesse')) {
                    const forms = await import('@/services/domainServices').then(m => m.jeunesseService.getForms()).catch(() => []);
                    const projects = await import('@/services/domainServices').then(m => m.jeunesseService.getProjects()).catch(() => []);
                    setJeunesseFormsCount(forms.length);
                    setJeunesseProjectsCount(projects.length);
                }
                if (permissions.sidebarKeys.includes('/sante') && user?.committeeId) {
                    const actions = await import('@/services/domainServices').then(m => m.santeService.getActions(user.committeeId!)).catch(() => []);
                    setSanteActionsCount(actions.length);
                }
                if (permissions.sidebarKeys.includes('/social')) {
                    const families = await import('@/services/domainServices').then(m => m.socialService.getFamilies()).catch(() => []);
                    const actions = await import('@/services/domainServices').then(m => m.socialService.getAllActions()).catch(() => []);
                    setSocialFamiliesCount(families.length);
                    setSocialActionsCount(actions.length);
                }
                if (permissions.sidebarKeys.includes('/vff')) {
                    const cases = await import('@/services/domainServices').then(m => m.vffService.getCases()).catch(() => []);
                    setVffCasesCount(cases.length);
                }
                if (permissions.sidebarKeys.includes('/immigration')) {
                    const cases = await import('@/services/domainServices').then(m => m.immigrationService.getCases()).catch(() => []);
                    setImmigrationCasesCount(cases.length);
                }
            } catch { /* silent */ } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user?.committeeId]);

    const totalVolunteers = volunteerData.reduce((s, c) => s + (c.totalVolunteers || 0), 0);
    const pendingVolunteers = committees.reduce((s, c) => s + (c.pendingVolunteers || 0), 0);
    const totalCommittees = committees.length;
    const totalStock = inventory.length;
    const activeAlerts = alerts.filter(a => !a.resolvedAt).length;

    if (loading) {
        return (
            <div style={{
                minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 16,
            }}>
                <Spin size="large" />
                <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#8A8A8E' }}>
                    Chargement du tableau de bord...
                </Text>
            </div>
        );
    }

    const dt = permissions.dashboardType;

    return (
        <div style={{
            maxWidth: 1440, margin: '0 auto',
            background: isDark ? '#111113' : '#F2F2F7',
            minHeight: '100vh', padding: '0 0 32px',
        }}>
            {/* ── Dashboard Header ── */}
            <DashboardHeader
                user={user} permissions={permissions} dt={dt}
                activeAlerts={activeAlerts} isDark={isDark} navigate={navigate}
            />

            {/* ── Dashboard by Type ── */}
            <div style={{ padding: '0 24px' }}>
                {dt === 'admin' && (
                    <AdminDashboard
                        isDark={isDark} navigate={navigate} user={user}
                        totalVolunteers={totalVolunteers} totalCommittees={totalCommittees}
                        totalStock={totalStock} activeAlerts={activeAlerts}
                        committees={committees} alerts={alerts}
                    />
                )}
                {dt === 'trainer' && (
                    <TrainerDashboard
                        isDark={isDark} navigate={navigate}
                        totalVolunteers={totalVolunteers} committees={committees}
                    />
                )}
                {dt === 'donor' && <DonorDashboard isDark={isDark} navigate={navigate} />}
                {dt === 'volunteer' && (
                    <VolunteerDashboard
                        isDark={isDark} navigate={navigate} user={user}
                        permissions={permissions}
                        totalVolunteers={totalVolunteers} pendingVolunteers={pendingVolunteers}
                        totalCommittees={totalCommittees} totalStock={totalStock}
                        activeAlerts={activeAlerts}
                        committees={committees} alerts={alerts}
                        jeunesseFormsCount={jeunesseFormsCount} jeunesseProjectsCount={jeunesseProjectsCount}
                        santeActionsCount={santeActionsCount}
                        socialFamiliesCount={socialFamiliesCount} socialActionsCount={socialActionsCount}
                        vffCasesCount={vffCasesCount} immigrationCasesCount={immigrationCasesCount}
                        secourismeEqCount={secourismeEqCount} secourismeDvCount={secourismeDvCount}
                    />
                )}
            </div>

            {/* System Status Footer */}
            <div style={{
                margin: '20px 24px 0',
                padding: '12px 20px',
                borderRadius: 12,
                background: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#EBEBEB'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 8,
            }}>
                <Space>
                    <CheckCircleOutlined style={{ color: '#34C759', fontSize: 14 }} />
                    <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#8A8A8E' }}>
                        Système opérationnel
                    </Text>
                </Space>
                <Space split={<span style={{ color: isDark ? '#333' : '#ddd' }}>•</span>} wrap>
                    <Tag bordered={false} color="success" style={{ fontSize: 11 }}>API ✓</Tag>
                    <Tag bordered={false} color="success" style={{ fontSize: 11 }}>DB ✓</Tag>
                    <Tag bordered={false} color="success" style={{ fontSize: 11 }}>IA ✓</Tag>
                </Space>
            </div>
        </div>
    );
};

// ============================================================
// Dashboard Header
// ============================================================
const DashboardHeader: React.FC<{
    user: any; permissions: any; dt: string;
    activeAlerts: number; isDark: boolean; navigate: (p: string) => void;
}> = ({ user, permissions, dt, activeAlerts, isDark, navigate }) => {
    const roleConfig: Record<string, { color: string; icon: React.ReactNode; title: string; subtitle: string }> = {
        admin: { color: '#6366F1', icon: <CrownOutlined />, title: 'Administration Système', subtitle: 'Vue d\'ensemble complète du système Nexus-AID' },
        trainer: { color: '#0EA5E9', icon: <BookOutlined />, title: 'Espace Formateur', subtitle: 'Gérez vos formations et suivez vos apprenants' },
        donor: { color: '#16A34A', icon: <GiftOutlined />, title: 'Espace Donateur', subtitle: 'Suivez vos contributions et leur impact' },
        volunteer: { color: '#E8001D', icon: <UserOutlined />, title: 'Tableau de Bord', subtitle: `Bienvenue ${user?.fullName?.split(' ')[0] || ''} — ${permissions.label}` },
    };
    const cfg = roleConfig[dt] || roleConfig.volunteer;
    const firstName = user?.fullName?.split(' ')[0] || 'Utilisateur';

    return (
        <div style={{
            padding: '24px 24px 20px',
            background: isDark ? '#111113' : '#F2F2F7',
            marginBottom: 4,
        }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.35)' : '#8A8A8E' }}>
                    Nexus-AID &nbsp;/&nbsp;
                </Text>
                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.75)' : '#3C3C43', fontWeight: 600 }}>
                    {cfg.title}
                </Text>
            </div>

            {/* Header main */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                justifyContent: 'space-between', gap: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Avatar circle */}
                    <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: `${cfg.color}18`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22, color: cfg.color,
                        border: `2px solid ${cfg.color}30`,
                    }}>
                        {cfg.icon}
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>
                            {cfg.title}
                        </Title>
                        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.45)' : '#8A8A8E' }}>
                            Bienvenue {firstName} — {permissions.label}
                        </Text>
                    </div>
                </div>

                {/* Right badges */}
                <Space wrap>
                    {activeAlerts > 0 && (
                        <Badge count={activeAlerts} size="small">
                            <div
                                onClick={() => navigate('/stocks')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 14px', borderRadius: 20,
                                    background: isDark ? 'rgba(255,59,48,0.15)' : '#FFF0EE',
                                    border: '1px solid rgba(255,59,48,0.3)',
                                    cursor: 'pointer', fontSize: 13, color: '#FF3B30', fontWeight: 600,
                                }}>
                                <BellOutlined />
                                Alertes
                            </div>
                        </Badge>
                    )}
                    {user?.roles?.some((r: any) => r.committeeType === 'NATIONAL') && (
                        <Tag icon={<GlobalOutlined />} style={{
                            background: isDark ? 'rgba(255,214,10,0.15)' : '#FFFDE7',
                            border: '1px solid rgba(255,214,10,0.4)',
                            color: '#C09000', fontWeight: 600, borderRadius: 20,
                            padding: '4px 14px', fontSize: 13,
                        }}>
                            Siège National
                        </Tag>
                    )}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 16px', borderRadius: 20,
                        background: '#E8001D', color: '#fff',
                        fontSize: 13, fontWeight: 700,
                    }}>
                        <UserOutlined />
                        {permissions.label}
                    </div>
                </Space>
            </div>
        </div>
    );
};

// ============================================================
// ADMIN Dashboard
// ============================================================
const AdminDashboard: React.FC<{
    isDark: boolean; navigate: (p: string) => void; user: any;
    totalVolunteers: number; totalCommittees: number; totalStock: number; activeAlerts: number;
    committees: CommitteeOverview[]; alerts: StockAlertDTO[];
}> = ({ isDark, navigate, totalVolunteers, totalCommittees, totalStock, activeAlerts, committees, alerts }) => (
    <>
        {/* KPI Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark}
                    icon={<TeamOutlined />}
                    iconBg={isDark ? 'rgba(52,199,89,0.15)' : '#EAFAF0'}
                    iconColor="#34C759"
                    title="Volontaires Actifs"
                    value={totalVolunteers}
                    badge={{ label: 'Approuvés', color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.15)' : '#EAFAF0' }}
                    sparkData={[5, 10, 8, 15, 12, 20, totalVolunteers || 25]}
                    sparkColor="#34C759"
                    onClick={() => navigate('/volunteers')}
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark}
                    icon={<ClockCircleOutlined />}
                    iconBg={isDark ? 'rgba(255,149,0,0.15)' : '#FFF3E0'}
                    iconColor="#FF9500"
                    title="En Attente"
                    value={0}
                    badge={{ label: 'Validation Requise', color: '#FF9500', bg: isDark ? 'rgba(255,149,0,0.15)' : '#FFF3E0' }}
                    onClick={() => navigate('/validation-queue')}
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark}
                    icon={<AlertOutlined />}
                    iconBg={isDark ? 'rgba(255,59,48,0.15)' : '#FDEEED'}
                    iconColor="#FF3B30"
                    title="Alertes Actives"
                    value={activeAlerts}
                    badge={{ label: 'RAS', color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.12)' : '#EAFAF0' }}
                    onClick={() => navigate('/stocks')}
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark}
                    icon={<InboxOutlined />}
                    iconBg={isDark ? 'rgba(130,87,229,0.15)' : '#F0EEFF'}
                    iconColor="#8257E5"
                    title="Articles en Stock"
                    value={totalStock}
                    sparkData={[3, 8, 5, 12, 10, 15, totalStock || 18]}
                    sparkColor="#8257E5"
                    onClick={() => navigate('/stocks')}
                />
            </Col>
        </Row>

        {/* Second KPI row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={8}>
                <KpiCard isDark={isDark}
                    icon={<ApartmentOutlined />}
                    iconBg={isDark ? 'rgba(90,120,230,0.15)' : '#EEF0FF'}
                    iconColor="#5A78E6"
                    title="Comités"
                    value={totalCommittees}
                    sparkData={[2, 5, 3, 8, 6, 10, totalCommittees || 12]}
                    sparkColor="#5A78E6"
                    onClick={() => navigate('/committees')}
                />
            </Col>
            <Col xs={24} sm={12} lg={8}>
                <KpiCard isDark={isDark}
                    icon={<SafetyOutlined />}
                    iconBg={isDark ? 'rgba(255,149,0,0.15)' : '#FFF3E0'}
                    iconColor="#FF9500"
                    title="Validations en attente"
                    value={0}
                    badge={{ label: 'Validation Requise', color: '#FF9500', bg: isDark ? 'rgba(255,149,0,0.12)' : '#FFF3E0' }}
                    onClick={() => navigate('/validation-queue')}
                />
            </Col>
            <Col xs={24} sm={12} lg={8}>
                <KpiCard isDark={isDark}
                    icon={<AuditOutlined />}
                    iconBg={isDark ? 'rgba(10,132,255,0.15)' : '#E8F4FF'}
                    iconColor="#0A84FF"
                    title="Journaux d'audit"
                    value="—"
                    onClick={() => navigate('/audit-logs')}
                />
            </Col>
        </Row>

        {/* Charts Row */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} lg={14}>
                <SectionCard isDark={isDark}
                    title={
                        <Space>
                            <BarChartOutlined style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#8A8A8E', fontSize: 14 }} />
                            <Text strong style={{ fontSize: 14 }}>Volontaires par comité</Text>
                        </Space>
                    }
                >
                    <VolunteersBarChart committees={committees} isDark={isDark} />
                </SectionCard>
            </Col>
            <Col xs={24} lg={10}>
                <Space direction="vertical" style={{ width: '100%', gap: 16 }}>
                    <SectionCard isDark={isDark}
                        title={
                            <Space>
                                <InfoCircleOutlined style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#8A8A8E', fontSize: 14 }} />
                                <Text strong style={{ fontSize: 14 }}>Alertes stock</Text>
                            </Space>
                        }
                    >
                        {alerts.length > 0 ? (
                            <List size="small" dataSource={alerts.slice(0, 4)} renderItem={(item) => (
                                <List.Item style={{ padding: '8px 0', border: 'none' }}>
                                    <List.Item.Meta
                                        avatar={<Badge status={item.severity === 'CRITICAL' ? 'error' : 'warning'} />}
                                        title={<Text style={{ fontSize: 13 }}>{`Alerte #${item.itemId.substring(0, 8)}`}</Text>}
                                        description={<Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#8A8A8E' }}>{item.alertType} — {item.severity}</Text>}
                                    />
                                </List.Item>
                            )} />
                        ) : (
                            <div style={{ textAlign: 'center', padding: '24px 0' }}>
                                <InboxOutlined style={{ fontSize: 32, color: isDark ? 'rgba(255,255,255,0.15)' : '#D1D1D6', display: 'block', marginBottom: 8 }} />
                                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.35)' : '#8A8A8E' }}>Aucune alerte</Text>
                            </div>
                        )}
                    </SectionCard>
                    <SectionCard isDark={isDark}
                        title={
                            <Space>
                                <EnvironmentOutlined style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#8A8A8E', fontSize: 14 }} />
                                <Text strong style={{ fontSize: 14 }}>Top comités</Text>
                            </Space>
                        }
                    >
                        {committees.length > 0 ? committees.slice(0, 5).map((c) => {
                            const max = Math.max(...committees.map(x => x.totalVolunteers || 0), 1);
                            const pct = Math.min(100, Math.round(((c.totalVolunteers || 0) / max) * 100));
                            return (
                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                    <Text style={{ width: 72, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{c.region || c.name}</Text>
                                    <Progress percent={pct} showInfo={false}
                                        strokeColor={pct > 60 ? '#E8001D' : pct > 30 ? '#FF9500' : '#5A78E6'}
                                        style={{ flex: 1 }} size="small" />
                                    <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#8A8A8E', width: 28, textAlign: 'right' }}>
                                        {c.totalVolunteers}
                                    </Text>
                                </div>
                            );
                        }) : <Empty description="Aucun comité" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </SectionCard>
                </Space>
            </Col>
        </Row>

        {/* Quick Actions */}
        <SectionCard isDark={isDark}
            title={
                <Space>
                    <ThunderboltOutlined style={{ color: '#FF9500', fontSize: 14 }} />
                    <Text strong style={{ fontSize: 14 }}>Administration rapide</Text>
                </Space>
            }
        >
            <Row gutter={[12, 12]}>
                {[
                    { icon: <TeamOutlined />, label: 'Volontaires', desc: 'Gérer les profils', color: '#E8001D', route: '/volunteers' },
                    { icon: <ApartmentOutlined />, label: 'Comités', desc: 'Organisation', color: '#5A78E6', route: '/committees' },
                    { icon: <InboxOutlined />, label: 'Inventaire', desc: 'Articles en stock', color: '#8257E5', route: '/stocks' },
                    { icon: <FileTextOutlined />, label: 'Rapports', desc: 'SitRep / Mensuels', color: '#34C759', route: '/reports' },
                    { icon: <GiftOutlined />, label: 'Donations', desc: 'Suivi des dons', color: '#FF9500', route: '/donations' },
                    { icon: <SafetyOutlined />, label: 'Validations', desc: 'Queue de rôles', color: '#8257E5', route: '/validation-queue' },
                    { icon: <AuditOutlined />, label: 'Audit Trail', desc: '360° Vision', color: '#5A78E6', route: '/audit-logs' },
                    { icon: <SettingOutlined />, label: 'Paramètres', desc: 'Configuration', color: '#8A8A8E', route: '/settings' },
                ].map((a) => (
                    <Col xs={12} sm={8} md={6} key={a.label}>
                        <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                    </Col>
                ))}
            </Row>
        </SectionCard>
    </>
);

// ============================================================
// TRAINER Dashboard
// ============================================================
const TrainerDashboard: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
    totalVolunteers: number; committees: CommitteeOverview[];
}> = ({ isDark, navigate, totalVolunteers, committees }) => (
    <>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<BookOutlined />}
                    iconBg={isDark ? 'rgba(10,132,255,0.15)' : '#E8F4FF'} iconColor="#0A84FF"
                    title="Sessions Dispensées" value={12}
                    badge={{ label: 'Ce mois', color: '#0A84FF', bg: isDark ? 'rgba(10,132,255,0.12)' : '#E8F4FF' }}
                    sparkData={[3, 5, 4, 8, 6, 10, 12]} sparkColor="#0A84FF"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<TeamOutlined />}
                    iconBg={isDark ? 'rgba(52,199,89,0.15)' : '#EAFAF0'} iconColor="#34C759"
                    title="Apprenants Formés" value={totalVolunteers || 5}
                    sparkData={[10, 25, 18, 40, 35, 55, totalVolunteers || 5]} sparkColor="#34C759"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<TrophyOutlined />}
                    iconBg={isDark ? 'rgba(255,149,0,0.15)' : '#FFF3E0'} iconColor="#FF9500"
                    title="Certifications" value={42}
                    badge={{ label: '↑ +8', color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.12)' : '#EAFAF0' }}
                    sparkData={[8, 12, 15, 22, 30, 35, 42]} sparkColor="#FF9500"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<ClockCircleOutlined />}
                    iconBg={isDark ? 'rgba(130,87,229,0.15)' : '#F0EEFF'} iconColor="#8257E5"
                    title="Heures de Formation" value="1,500"
                    sparkData={[200, 400, 600, 800, 1000, 1200, 1500]} sparkColor="#8257E5"
                />
            </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} lg={14}>
                <SectionCard isDark={isDark}
                    title={<Space><CalendarOutlined style={{ color: '#8A8A8E', fontSize: 14 }} /><Text strong style={{ fontSize: 14 }}>Prochaines sessions</Text></Space>}
                >
                    {[
                        { title: 'Formation PSE2 — Niveau avancé', date: '15 Mars 2026', status: 'Planifiée', color: '#0A84FF' },
                        { title: 'Recyclage RCP — Comité Tunis', date: '22 Mars 2026', status: 'Confirmée', color: '#34C759' },
                        { title: 'Atelier DIH — Nouveaux volontaires', date: '5 Avril 2026', status: 'En préparation', color: '#FF9500' },
                        { title: 'Formation Gestion de Crise', date: '12 Avril 2026', status: 'Planifiée', color: '#8257E5' },
                    ].map((s, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 0',
                            borderBottom: i < 3 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7'}` : 'none',
                            gap: 12,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar style={{ background: isDark ? `${s.color}20` : `${s.color}12`, color: s.color }} icon={<BookOutlined />} />
                                <div>
                                    <Text strong style={{ fontSize: 13, display: 'block' }}>{s.title}</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#8A8A8E' }}>{s.date}</Text>
                                </div>
                            </div>
                            <Tag style={{ background: isDark ? `${s.color}20` : `${s.color}12`, color: s.color, border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                {s.status}
                            </Tag>
                        </div>
                    ))}
                </SectionCard>
            </Col>
            <Col xs={24} lg={10}>
                <SectionCard isDark={isDark}
                    title={<Space><StarOutlined style={{ color: '#0A84FF', fontSize: 14 }} /><Text strong style={{ fontSize: 14 }}>Mes domaines d'expertise</Text></Space>}
                >
                    {[
                        { name: 'Secourisme', pct: 78, color: '#E8001D' },
                        { name: 'RCP', pct: 82, color: '#0A84FF' },
                        { name: 'PSE1', pct: 94, color: '#34C759' },
                        { name: 'PSE2', pct: 75, color: '#FF9500' },
                        { name: 'Gestes qui sauvent', pct: 80, color: '#8257E5' },
                    ].map((d) => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <Text style={{ width: 120, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{d.name}</Text>
                            <Progress percent={d.pct} size="small" style={{ flex: 1 }} strokeColor={d.color} showInfo={false} />
                            <Text style={{ fontSize: 12, fontWeight: 600, width: 32, textAlign: 'right', color: d.color }}>{d.pct}%</Text>
                        </div>
                    ))}
                </SectionCard>
            </Col>
        </Row>

        <SectionCard isDark={isDark}
            title={<Space><ThunderboltOutlined style={{ color: '#FF9500', fontSize: 14 }} /><Text strong style={{ fontSize: 14 }}>Actions rapides</Text></Space>}
        >
            <Row gutter={[12, 12]}>
                {[
                    { icon: <MedicineBoxOutlined />, label: 'Secourisme', desc: 'Équipements & cours', color: '#E8001D', route: '/secourisme' },
                    { icon: <TeamOutlined />, label: 'Volontaires', desc: 'Mes apprenants', color: '#5A78E6', route: '/volunteers' },
                    { icon: <FileTextOutlined />, label: 'Rapports', desc: 'Bilans formation', color: '#34C759', route: '/reports' },
                    { icon: <InboxOutlined />, label: 'Matériel', desc: 'Stock formation', color: '#8257E5', route: '/stocks' },
                ].map((a) => (
                    <Col xs={12} sm={12} md={6} key={a.label}>
                        <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                    </Col>
                ))}
            </Row>
        </SectionCard>
    </>
);

// ============================================================
// DONOR Dashboard
// ============================================================
const DonorDashboard: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
}> = ({ isDark, navigate }) => (
    <>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<GiftOutlined />}
                    iconBg={isDark ? 'rgba(52,199,89,0.15)' : '#EAFAF0'} iconColor="#34C759"
                    title="Donations Effectuées" value={12}
                    badge={{ label: '↑ +3', color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.12)' : '#EAFAF0' }}
                    sparkData={[2, 4, 3, 6, 8, 10, 12]} sparkColor="#34C759"
                    onClick={() => navigate('/donor/receipts')}
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<HeartOutlined />}
                    iconBg={isDark ? 'rgba(255,45,85,0.15)' : '#FDEEED'} iconColor="#FF2D55"
                    title="Bénéficiaires Aidés" value={340}
                    sparkData={[50, 100, 120, 200, 250, 300, 340]} sparkColor="#FF2D55"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<EnvironmentOutlined />}
                    iconBg={isDark ? 'rgba(10,132,255,0.15)' : '#E8F4FF'} iconColor="#0A84FF"
                    title="Zones Couvertes" value={3}
                    sparkData={[1, 1, 2, 2, 2, 3, 3]} sparkColor="#0A84FF"
                />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<FundOutlined />}
                    iconBg={isDark ? 'rgba(130,87,229,0.15)' : '#F0EEFF'} iconColor="#8257E5"
                    title="Impact Score" value="A+"
                    badge={{ label: 'Excellent', color: '#8257E5', bg: isDark ? 'rgba(130,87,229,0.12)' : '#F0EEFF' }}
                />
            </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={24} lg={14}>
                <SectionCard isDark={isDark}
                    title={<Space><CalendarOutlined style={{ color: '#8A8A8E', fontSize: 14 }} /><Text strong style={{ fontSize: 14 }}>Historique des donations</Text></Space>}
                >
                    {[
                        { type: 'Alimentaire', date: '20 Fév 2026', zone: 'Tunis', qty: '200 paniers', color: '#34C759' },
                        { type: 'Médical', date: '15 Fév 2026', zone: 'Sousse', qty: '50 kits', color: '#0A84FF' },
                        { type: 'Alimentaire', date: '1 Fév 2026', zone: 'Tunis', qty: '150 paniers', color: '#34C759' },
                        { type: 'Équipement', date: '15 Jan 2026', zone: 'Sfax', qty: '10 tentes', color: '#8257E5' },
                    ].map((item, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '12px 0',
                            borderBottom: i < 3 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7'}` : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Avatar style={{ background: isDark ? `${item.color}20` : `${item.color}12`, color: item.color }} icon={<GiftOutlined />} />
                                <div>
                                    <Text strong style={{ fontSize: 13 }}>{item.type} — {item.qty}</Text>
                                    <Text style={{ display: 'block', fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#8A8A8E' }}>{item.zone} • {item.date}</Text>
                                </div>
                            </div>
                            <Tag style={{ background: isDark ? 'rgba(52,199,89,0.15)' : '#EAFAF0', color: '#34C759', border: 'none', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                Livré ✓
                            </Tag>
                        </div>
                    ))}
                </SectionCard>
            </Col>
            <Col xs={24} lg={10}>
                <SectionCard isDark={isDark}
                    title={<Space><HeartOutlined style={{ color: '#FF2D55', fontSize: 14 }} /><Text strong style={{ fontSize: 14 }}>Catégories préférées</Text></Space>}
                >
                    {[
                        { cat: 'Alimentaire', pct: 45, color: '#34C759' },
                        { cat: 'Médical', pct: 30, color: '#0A84FF' },
                        { cat: 'Équipement', pct: 15, color: '#8257E5' },
                        { cat: 'Vestimentaire', pct: 10, color: '#FF9500' },
                    ].map((item) => (
                        <div key={item.cat} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <Text style={{ width: 90, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{item.cat}</Text>
                            <Progress percent={item.pct} size="small" style={{ flex: 1 }} strokeColor={item.color} showInfo={false} />
                            <Text style={{ fontSize: 12, fontWeight: 600, width: 32, textAlign: 'right', color: item.color }}>{item.pct}%</Text>
                        </div>
                    ))}
                </SectionCard>
            </Col>
        </Row>

        <SectionCard isDark={isDark}
            title={<Space><ThunderboltOutlined style={{ color: '#FF9500', fontSize: 14 }} /><Text strong style={{ fontSize: 14 }}>Actions rapides</Text></Space>}
        >
            <Row gutter={[12, 12]}>
                {[
                    { icon: <PlusOutlined />, label: 'Faire un don', desc: 'Nouvelle donation', color: '#34C759', route: '/donor/donate' },
                    { icon: <FundOutlined />, label: 'Mon impact', desc: 'Statistiques', color: '#8257E5', route: '/donor/dashboard' },
                    { icon: <SettingOutlined />, label: 'Préférences', desc: 'Zones & catégories', color: '#8A8A8E', route: '/settings' },
                ].map((a) => (
                    <Col xs={24} sm={8} key={a.label}>
                        <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                    </Col>
                ))}
            </Row>
        </SectionCard>
    </>
);

// ============================================================
// VOLUNTEER Dashboard — Matches screenshots
// ============================================================
const VolunteerDashboard: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
    permissions: any; user: any;
    totalVolunteers: number; pendingVolunteers: number; totalCommittees: number; totalStock: number; activeAlerts: number;
    committees: CommitteeOverview[]; alerts: StockAlertDTO[];
    jeunesseFormsCount: number | string; jeunesseProjectsCount: number | string;
    santeActionsCount: number | string;
    socialFamiliesCount: number | string; socialActionsCount: number | string;
    vffCasesCount: number | string; immigrationCasesCount: number | string;
    secourismeEqCount: number | string; secourismeDvCount: number | string;
}> = ({
    isDark, navigate, permissions, user,
    totalVolunteers, pendingVolunteers, totalCommittees, totalStock, activeAlerts,
    committees, alerts,
    jeunesseFormsCount, jeunesseProjectsCount, santeActionsCount,
    socialFamiliesCount, socialActionsCount, vffCasesCount, immigrationCasesCount,
    secourismeEqCount, secourismeDvCount
}) => {
    const userRoles: string[] = (user?.roles || []).map((r: any) =>
        (typeof r === 'string' ? r : r?.role || '').toUpperCase()
    );
    const isLeadership = userRoles.some(r =>
        r.includes('PRESIDENT') || r.includes('VICE') || r.includes('SECRETAIRE') || r.includes('TRESORIER') || r.includes('ADMIN')
    );
    const isDomainOnly = !isLeadership && userRoles.some(r => r.startsWith('RESP_'));

    return (
        <>
            {/* KPI Cards Row — 5 cards like the design */}
            {!isDomainOnly && (
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} sm={12} lg={5}>
                        <KpiCard isDark={isDark}
                            icon={<TeamOutlined />}
                            iconBg={isDark ? 'rgba(52,199,89,0.15)' : '#EAFAF0'}
                            iconColor="#34C759"
                            title="Volontaires Actifs"
                            value={totalVolunteers}
                            badge={{ label: 'Approuvés', color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.12)' : '#EAFAF0' }}
                            sparkData={[5, 10, 8, 15, 12, 20, totalVolunteers || 25]}
                            sparkColor="#34C759"
                            onClick={() => navigate('/volunteers')}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={5}>
                        <KpiCard isDark={isDark}
                            icon={<ClockCircleOutlined />}
                            iconBg={isDark ? 'rgba(255,149,0,0.15)' : '#FFF3E0'}
                            iconColor="#FF9500"
                            title="En Attente"
                            value={pendingVolunteers}
                            badge={{ label: 'Validation Requise', color: '#FF9500', bg: isDark ? 'rgba(255,149,0,0.12)' : '#FFF3E0' }}
                            onClick={() => navigate('/validation-queue')}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={5}>
                        <KpiCard isDark={isDark}
                            icon={<AlertOutlined />}
                            iconBg={isDark ? 'rgba(255,59,48,0.15)' : '#FDEEED'}
                            iconColor="#FF3B30"
                            title="Alertes Actives"
                            value={activeAlerts}
                            badge={{ label: 'RAS', color: '#34C759', bg: isDark ? 'rgba(52,199,89,0.12)' : '#EAFAF0' }}
                            onClick={() => navigate('/stocks')}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={5}>
                        <KpiCard isDark={isDark}
                            icon={<InboxOutlined />}
                            iconBg={isDark ? 'rgba(90,120,230,0.15)' : '#EEF0FF'}
                            iconColor="#5A78E6"
                            title="Articles en Stock"
                            value={totalStock}
                            sparkData={[3, 8, 5, 12, 10, 15, totalStock || 18]}
                            sparkColor="#5A78E6"
                            onClick={() => navigate('/stocks')}
                        />
                    </Col>
                    <Col xs={24} sm={12} lg={4}>
                        <KpiCard isDark={isDark}
                            icon={<ApartmentOutlined />}
                            iconBg={isDark ? 'rgba(130,87,229,0.15)' : '#F0EEFF'}
                            iconColor="#8257E5"
                            title="Comités"
                            value={totalCommittees}
                            sparkData={[1, 3, 2, 5, 4, 8, totalCommittees || 10]}
                            sparkColor="#8257E5"
                            onClick={() => navigate('/committees')}
                        />
                    </Col>
                </Row>
            )}

            {/* Crisis Command — national only */}
            {permissions.sidebarKeys.includes('/catastrophes') && user?.committeeType === 'NATIONAL' && (
                <div style={{
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(232,0,29,0.12), rgba(185,28,28,0.06))'
                        : 'linear-gradient(135deg, rgba(254,226,226,0.6), #FFFFFF)',
                    borderRadius: 16, padding: 20, marginBottom: 20,
                    border: `1px solid ${isDark ? 'rgba(232,0,29,0.2)' : '#FECACA'}`,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                        <Space>
                            <GlobalOutlined style={{ color: '#E8001D' }} />
                            <Text strong style={{ fontSize: 14 }}>Centre Opérationnel de Crise (NATIONAL)</Text>
                        </Space>
                        <Button type="primary" danger icon={<ThunderboltOutlined />} onClick={() => navigate('/catastrophes')}>
                            Ouvrir Radar AlphaEarth
                        </Button>
                    </div>
                    <Row gutter={[12, 12]}>
                        {[
                            { title: '📡 Flux Météo AlphaEarth', desc: 'Analyse prédictive de 27 variables avec l\'API OpenWeather & USGS.', color: '#E8001D', content: <Space><Tag color="red" bordered={false}>Alerte Orage : Nord</Tag><Tag color="volcano" bordered={false}>Feu : Faible</Tag></Space> },
                            { title: '⚡ Pipeline RabbitMQ', desc: 'Création d\'interventions de sauvetage. CDC en écoute persistante.', color: '#5A78E6', content: <Progress percent={100} size="small" status="active" strokeColor="#5A78E6" /> },
                            { title: '🚁 NDRT / RDRT Readiness', desc: 'Profilage actif. Volontaires mobilisés via matching compétences.', color: '#34C759', content: <Space><Badge status="processing" color="green" /><Text style={{ fontSize: 13, color: '#34C759' }}>142 Prêts au déploiement</Text></Space> },
                        ].map((c, i) => (
                            <Col xs={24} md={8} key={i}>
                                <div style={{ padding: 16, borderRadius: 12, background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF', border: `1px solid ${c.color}25` }}>
                                    <Text strong style={{ display: 'block', marginBottom: 6, color: c.color, fontSize: 13 }}>{c.title}</Text>
                                    <Text style={{ fontSize: 12, color: isDark ? '#AAA' : '#666', display: 'block', marginBottom: 10 }}>{c.desc}</Text>
                                    {c.content}
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            {/* Charts + Alerts + Top Comités */}
            {!isDomainOnly && (
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                    <Col xs={24} lg={14}>
                        <SectionCard isDark={isDark}
                            title={
                                <Space>
                                    <BarChartOutlined style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#8A8A8E', fontSize: 14 }} />
                                    <Text strong style={{ fontSize: 14 }}>Volontaires par comité</Text>
                                </Space>
                            }
                        >
                            <VolunteersBarChart committees={committees} isDark={isDark} />
                        </SectionCard>
                    </Col>
                    <Col xs={24} lg={10}>
                        <Space direction="vertical" style={{ width: '100%', gap: 16 }}>
                            {/* Alertes stock */}
                            <SectionCard isDark={isDark}
                                title={
                                    <Space>
                                        <InfoCircleOutlined style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#8A8A8E', fontSize: 14 }} />
                                        <Text strong style={{ fontSize: 14 }}>Alertes stock</Text>
                                    </Space>
                                }
                            >
                                {alerts.length > 0 ? (
                                    <List size="small" dataSource={alerts.slice(0, 3)} renderItem={(item) => (
                                        <List.Item style={{ padding: '8px 0', border: 'none' }}>
                                            <List.Item.Meta
                                                avatar={<Badge status={item.severity === 'CRITICAL' ? 'error' : 'warning'} />}
                                                title={<Text style={{ fontSize: 13 }}>{`Alerte #${item.itemId.substring(0, 8)}`}</Text>}
                                                description={<Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#8A8A8E' }}>{item.alertType} — {item.severity}</Text>}
                                            />
                                        </List.Item>
                                    )} />
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        <InboxOutlined style={{ fontSize: 28, color: isDark ? 'rgba(255,255,255,0.15)' : '#D1D1D6', display: 'block', marginBottom: 8 }} />
                                        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.35)' : '#8A8A8E' }}>Aucune alerte</Text>
                                    </div>
                                )}
                            </SectionCard>

                            {/* Top comités */}
                            <SectionCard isDark={isDark}
                                title={
                                    <Space>
                                        <EnvironmentOutlined style={{ color: isDark ? 'rgba(255,255,255,0.55)' : '#8A8A8E', fontSize: 14 }} />
                                        <Text strong style={{ fontSize: 14 }}>Top comités</Text>
                                    </Space>
                                }
                            >
                                {committees.length > 0 ? committees.slice(0, 5).map((c) => {
                                    const max = Math.max(...committees.map(x => x.totalVolunteers || 0), 1);
                                    const pct = Math.min(100, Math.round(((c.totalVolunteers || 0) / max) * 100));
                                    return (
                                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                            <Text style={{ width: 68, fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{c.region || c.name}</Text>
                                            <Progress percent={pct} showInfo={false}
                                                strokeColor={pct > 60 ? '#E8001D' : pct > 30 ? '#FF9500' : '#5A78E6'}
                                                style={{ flex: 1 }} size="small" />
                                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#8A8A8E', width: 28, textAlign: 'right' }}>
                                                {c.totalVolunteers}
                                            </Text>
                                        </div>
                                    );
                                }) : <Empty description="Aucun comité" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                            </SectionCard>
                        </Space>
                    </Col>
                </Row>
            )}

            {/* Domain Widget */}
            {(() => {
                const roles: string[] = (user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r?.role || ''));
                const hasDomain = (code: string) => roles.some((r: string) => r.includes(code));

                const cfg = hasDomain('RESP_JEUNESSE') ? {
                    emoji: '🎓', label: 'Espace Jeunesse', color: '#5A78E6', route: '/jeunesse',
                    stats: [{ label: 'Formulaires', icon: '📋', value: jeunesseFormsCount }, { label: 'Projets Actifs', icon: '🚀', value: jeunesseProjectsCount }]
                } : hasDomain('RESP_SANTE') ? {
                    emoji: '🏥', label: 'Espace Santé', color: '#0A84FF', route: '/sante',
                    stats: [{ label: 'Interventions', icon: '🩺', value: santeActionsCount }, { label: 'Consultations', icon: '📅', value: '—' }]
                } : hasDomain('RESP_SOCIAL') ? {
                    emoji: '🏘', label: 'Espace Social', color: '#34C759', route: '/social',
                    stats: [{ label: 'Familles', icon: '🏠', value: socialFamiliesCount }, { label: 'Aides', icon: '📦', value: socialActionsCount }]
                } : hasDomain('RESP_VFF') ? {
                    emoji: '🔴', label: 'Espace VFF', color: '#E8001D', route: '/vff',
                    stats: [{ label: 'Victimes', icon: '🆘', value: vffCasesCount }, { label: 'Cas Traités', icon: '✅', value: '—' }]
                } : hasDomain('RESP_IMMIGRATION') ? {
                    emoji: '🌍', label: 'Immigration', color: '#8257E5', route: '/immigration',
                    stats: [{ label: 'Dossiers Actifs', icon: '📑', value: immigrationCasesCount }, { label: 'Assistances', icon: '🤝', value: '—' }]
                } : hasDomain('RESP_SECOURISME') ? {
                    emoji: '🚑', label: 'Espace Secourisme', color: '#FF3B30', route: '/secourisme',
                    stats: [{ label: 'Équipements', icon: '🩺', value: secourismeEqCount }, { label: 'Dispositifs', icon: '📍', value: secourismeDvCount }]
                } : null;

                if (!cfg) return null;
                return (
                    <div style={{
                        borderRadius: 16, padding: 20, marginBottom: 20,
                        background: isDark ? `${cfg.color}08` : `${cfg.color}04`,
                        border: `1px solid ${cfg.color}25`,
                    }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                                    {cfg.emoji}
                                </div>
                                <div>
                                    <Text strong style={{ fontSize: 15 }}>Mon Domaine — {cfg.label}</Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Statistiques et actions spécifiques à votre domaine</Text>
                                </div>
                            </div>
                            <Button type="primary" icon={<BarChartOutlined />} onClick={() => navigate(cfg.route)}
                                style={{ background: cfg.color, border: 'none', borderRadius: 20, fontWeight: 700 }}>
                                Ouvrir {cfg.label}
                            </Button>
                        </div>
                        <Row gutter={[12, 12]}>
                            {cfg.stats.map((s: any) => (
                                <Col key={s.label} xs={12} sm={6}>
                                    <div style={{ textAlign: 'center', padding: '14px 8px', background: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF', borderRadius: 12, border: `1px solid ${cfg.color}18` }}>
                                        <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>{s.value !== undefined ? s.value : '—'}</div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{s.label}</Text>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                );
            })()}

            {/* Quick Actions */}
            {(() => {
                const actions: { icon: React.ReactNode; label: string; desc: string; color: string; route: string }[] = [];
                if (permissions.sidebarKeys.includes('/secourisme')) actions.push({ icon: <HeartOutlined />, label: 'Secourisme', desc: 'RCP & Formation', color: '#E8001D', route: '/secourisme' });
                if (permissions.sidebarKeys.includes('/volunteers')) actions.push({ icon: <TeamOutlined />, label: 'Volontaires', desc: 'Gérer profils', color: '#5A78E6', route: '/volunteers' });
                if (permissions.sidebarKeys.includes('/reports')) actions.push({ icon: <FileTextOutlined />, label: 'Rapports', desc: 'SitRep', color: '#34C759', route: '/reports' });
                if (permissions.sidebarKeys.includes('/stocks')) actions.push({ icon: <InboxOutlined />, label: 'Inventaire', desc: `${totalStock} articles`, color: '#8257E5', route: '/stocks' });
                if (permissions.sidebarKeys.includes('/donations')) actions.push({ icon: <GiftOutlined />, label: 'Donations', desc: 'Suivi des dons', color: '#FF9500', route: '/donations' });
                if (permissions.sidebarKeys.includes('/diffusion')) actions.push({ icon: <SoundOutlined />, label: 'Diffusion', desc: 'Ressources', color: '#FF2D55', route: '/diffusion' });
                if (permissions.sidebarKeys.includes('/sante')) actions.push({ icon: <MedicineBoxOutlined />, label: 'Santé', desc: 'Interventions', color: '#0A84FF', route: '/sante' });
                if (permissions.sidebarKeys.includes('/social')) actions.push({ icon: <HomeOutlined />, label: 'Social', desc: 'Familles aidées', color: '#34C759', route: '/social' });
                if (permissions.sidebarKeys.includes('/catastrophes')) actions.push({ icon: <GlobalOutlined />, label: 'Météo', desc: 'Alertes & Suivi', color: '#FF3B30', route: '/catastrophes' });
                if (actions.length === 0) return null;
                return (
                    <SectionCard isDark={isDark}
                        title={<Space><ThunderboltOutlined style={{ color: '#FF9500', fontSize: 14 }} /><Text strong style={{ fontSize: 14 }}>Actions rapides</Text></Space>}
                    >
                        <Row gutter={[12, 12]}>
                            {actions.slice(0, 8).map((a) => (
                                <Col xs={12} sm={8} md={6} key={a.label}>
                                    <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                                </Col>
                            ))}
                        </Row>
                    </SectionCard>
                );
            })()}
        </>
    );
};

export default DashboardPage;
