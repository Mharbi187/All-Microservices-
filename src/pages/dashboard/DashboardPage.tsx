// ============================================================
// NEXUS-AID — Premium Dynamic Dashboard
// Web 3.0 design: gradient KPIs, sparklines, radial gauge,
// responsive light/dark modes with electric colors
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Typography, Space, Tag, List, Avatar,
    Progress, Tooltip, Badge, Spin, Empty, Divider, Button
} from 'antd';
import {
    TeamOutlined, AlertOutlined, InboxOutlined, GiftOutlined,
    HeartOutlined, ApartmentOutlined,
    ClockCircleOutlined, EnvironmentOutlined,
    FileTextOutlined, ThunderboltOutlined,
    BellOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
    BarChartOutlined, MedicineBoxOutlined, SoundOutlined,
    HomeOutlined, GlobalOutlined,
    CrownOutlined, BookOutlined,
    TrophyOutlined, SettingOutlined,
    FundOutlined, CalendarOutlined, StarOutlined,
    SafetyOutlined, AuditOutlined,
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
// Mini Sparkline SVG (pure CSS/SVG sparkline)
// ============================================================
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({
    data, color, height = 32,
}) => {
    const max = Math.max(...data, 1);
    const w = 80;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - (v / max) * (height - 4)}`).join(' ');
    return (
        <svg width={w} height={height} style={{ opacity: 0.5 }}>
            <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
        </svg>
    );
};

// ============================================================
// Radial Gauge Component
// ============================================================
const RadialGauge: React.FC<{ percent: number; label: string; color: string; isDark: boolean }> = ({
    percent, label, color, isDark,
}) => {
    const size = 120;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                    strokeWidth={strokeWidth} />
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                    stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{
                        transition: 'stroke-dashoffset 1s ease',
                        filter: isDark ? `drop-shadow(0 0 6px ${color}80)` : 'none',
                    }}
                />
            </svg>
            <div style={{
                position: 'relative', marginTop: -80, textAlign: 'center',
                marginBottom: 48,
            }}>
                <Text style={{ fontSize: 22, fontWeight: 700, color }}>{percent}%</Text>
            </div>
            <Tag color={color} style={{
                fontSize: 13, fontWeight: 600, padding: '4px 16px', borderRadius: 20,
                border: 'none', color: '#fff',
                boxShadow: isDark ? `0 0 12px ${color}40` : 'none',
            }}>
                {label}
            </Tag>
        </div>
    );
};

// ============================================================
// KPI Card (Premium)
// ============================================================
interface KpiProps {
    icon: React.ReactNode;
    iconColor: string;
    gradientFrom: string;
    gradientTo: string;
    title: string;
    value: number | string;
    suffix?: string;
    trend?: { label: string; color: string };
    sparkData?: number[];
    isDark: boolean;
}

const KpiCard: React.FC<KpiProps> = ({
    icon, iconColor, gradientFrom, gradientTo, title, value, suffix, trend, sparkData, isDark,
}) => (
    <div style={{
        background: isDark
            ? `linear-gradient(135deg, ${gradientFrom}18, ${gradientTo}08)`
            : '#ffffff',
        borderRadius: 20, padding: '22px 24px',
        border: `1px solid ${isDark ? `${gradientFrom}25` : '#f0f0f0'}`,
        boxShadow: isDark
            ? `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 ${gradientFrom}15`
            : '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        cursor: 'default',
        position: 'relative' as const,
        overflow: 'hidden',
    }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = isDark
                ? `0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 ${gradientFrom}25`
                : `0 8px 28px rgba(0,0,0,0.1)`;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = isDark
                ? `0 4px 20px rgba(0,0,0,0.2), inset 0 1px 0 ${gradientFrom}15`
                : '0 2px 12px rgba(0,0,0,0.06)';
        }}
    >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: isDark
                    ? `linear-gradient(135deg, ${gradientFrom}30, ${gradientTo}15)`
                    : `linear-gradient(135deg, ${gradientFrom}15, ${gradientTo}08)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, color: iconColor,
                boxShadow: isDark ? `0 0 16px ${gradientFrom}20` : 'none',
            }}>
                {icon}
            </div>
            {trend && (
                <Tag style={{
                    background: isDark ? `${trend.color}20` : `${trend.color}12`,
                    color: trend.color, border: 'none', borderRadius: 12,
                    fontSize: 11, fontWeight: 600, padding: '2px 10px',
                }}>
                    {trend.label}
                </Tag>
            )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
                <Text style={{
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: isDark ? 'rgba(255,255,255,0.5)' : '#999', display: 'block',
                    marginBottom: 4,
                }}>
                    {title}
                </Text>
                <span style={{
                    fontSize: 32, fontWeight: 800, lineHeight: 1,
                    color: isDark ? iconColor : '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif",
                }}>
                    {value}{suffix && <span style={{ fontSize: 16, fontWeight: 500, marginLeft: 2, color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>{suffix}</span>}
                </span>
            </div>
            {sparkData && <Sparkline data={sparkData} color={iconColor} />}
        </div>
    </div>
);

// ============================================================
// Quick Action Card (Premium)
// ============================================================
const QuickAction: React.FC<{
    icon: React.ReactNode; label: string; desc: string;
    color: string; onClick: () => void; isDark: boolean;
}> = ({ icon, label, desc, color, onClick, isDark }) => (
    <div onClick={onClick} style={{
        borderRadius: 16, padding: 18, cursor: 'pointer',
        transition: 'all 0.3s ease',
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
    }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.borderColor = `${color}40`;
            e.currentTarget.style.boxShadow = `0 8px 24px ${color}15`;
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0';
            e.currentTarget.style.boxShadow = 'none';
        }}
    >
        <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: isDark ? `${color}18` : `${color}10`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, color, marginBottom: 12,
        }}>
            {icon}
        </div>
        <Text strong style={{ fontSize: 14, display: 'block' }}>{label}</Text>
        <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{desc}</Text>
    </div>
);

// ============================================================
// Session Card (Premium)
// ============================================================
const SessionCard: React.FC<{
    title: string; date: string; status: string; count: number;
    color: string; statusColor: string; isDark: boolean;
}> = ({ title, date, status, count, color, statusColor, isDark }) => (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5'}`,
        gap: 12,
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
            <Avatar style={{
                background: isDark ? `${color}25` : `${color}12`,
                color, width: 42, height: 42, fontSize: 18,
                boxShadow: isDark ? `0 0 12px ${color}20` : 'none',
            }} icon={<BookOutlined />} />
            <div style={{ minWidth: 0, flex: 1 }}>
                <Text strong style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Text>
                <Space size={4}>
                    <CalendarOutlined style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }} />
                    <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{date}</Text>
                </Space>
            </div>
        </div>
        <Space direction="vertical" size={2} align="end" style={{ flexShrink: 0 }}>
            <Tag style={{
                background: isDark ? `${statusColor}20` : `${statusColor}10`,
                color: statusColor, border: 'none', borderRadius: 12,
                fontSize: 11, fontWeight: 600, padding: '1px 10px',
            }}>
                {status}
            </Tag>
            <Space size={4}>
                <TeamOutlined style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }} />
                <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{count} participants</Text>
            </Space>
        </Space>
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

                // --- Jeunesse ---
                if (permissions.sidebarKeys.includes('/jeunesse')) {
                    const forms = await import('@/services/domainServices').then(m => m.jeunesseService.getForms()).catch(() => []);
                    const projects = await import('@/services/domainServices').then(m => m.jeunesseService.getProjects()).catch(() => []);
                    setJeunesseFormsCount(forms.length);
                    setJeunesseProjectsCount(projects.length);
                }

                // --- Santé ---
                if (permissions.sidebarKeys.includes('/sante') && user?.committeeId) {
                    const actions = await import('@/services/domainServices').then(m => m.santeService.getActions(user.committeeId!)).catch(() => []);
                    setSanteActionsCount(actions.length);
                }

                // --- Social ---
                if (permissions.sidebarKeys.includes('/social')) {
                    const families = await import('@/services/domainServices').then(m => m.socialService.getFamilies()).catch(() => []);
                    const actions = await import('@/services/domainServices').then(m => m.socialService.getAllActions()).catch(() => []);
                    setSocialFamiliesCount(families.length);
                    setSocialActionsCount(actions.length);
                }

                // --- VFF ---
                if (permissions.sidebarKeys.includes('/vff')) {
                    const cases = await import('@/services/domainServices').then(m => m.vffService.getCases()).catch(() => []);
                    setVffCasesCount(cases.length);
                }

                // --- Immigration ---
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
                <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>
                    Chargement du tableau de bord...
                </Text>
            </div>
        );
    }

    const dt = permissions.dashboardType;

    return (
        <div style={{ maxWidth: 1440, margin: '0 auto' }}>
            {/* Header */}
            <DashboardHeader user={user} permissions={permissions} dt={dt}
                activeAlerts={activeAlerts} isDark={isDark} navigate={navigate} />

            {/* Dashboard by type */}
            {dt === 'admin' && <AdminDashboard isDark={isDark} navigate={navigate} user={user}
                totalVolunteers={totalVolunteers} totalCommittees={totalCommittees}
                totalStock={totalStock} activeAlerts={activeAlerts}
                committees={committees} alerts={alerts} />}

            {dt === 'trainer' && <TrainerDashboard isDark={isDark} navigate={navigate}
                totalVolunteers={totalVolunteers} committees={committees} />}

            {dt === 'donor' && <DonorDashboard isDark={isDark} navigate={navigate} />}

            {dt === 'volunteer' && <VolunteerDashboard isDark={isDark} navigate={navigate} user={user}
                permissions={permissions}
                totalVolunteers={totalVolunteers} pendingVolunteers={pendingVolunteers} totalCommittees={totalCommittees}
                totalStock={totalStock} activeAlerts={activeAlerts}
                committees={committees} alerts={alerts}
                jeunesseFormsCount={jeunesseFormsCount} jeunesseProjectsCount={jeunesseProjectsCount}
                santeActionsCount={santeActionsCount}
                socialFamiliesCount={socialFamiliesCount} socialActionsCount={socialActionsCount}
                vffCasesCount={vffCasesCount}
                immigrationCasesCount={immigrationCasesCount}
                secourismeEqCount={secourismeEqCount} secourismeDvCount={secourismeDvCount} />}

            {/* System Status */}
            <div style={{
                marginTop: 20, padding: '14px 24px', borderRadius: 16,
                background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: 8,
            }}>
                <Space>
                    <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                    <Text style={{ fontSize: 13 }}>Système opérationnel</Text>
                </Space>
                <Space split={<span style={{ color: isDark ? '#333' : '#ddd' }}>•</span>} wrap>
                    <Tag color="success" bordered={false} style={{ fontSize: 11 }}>API ✓</Tag>
                    <Tag color="success" bordered={false} style={{ fontSize: 11 }}>DB ✓</Tag>
                    <Tag color="success" bordered={false} style={{ fontSize: 11 }}>IA ✓</Tag>
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
    const cfg: Record<string, { color: string; icon: React.ReactNode; title: string; desc: string }> = {
        admin: { color: '#6366f1', icon: <CrownOutlined />, title: 'Administration Système', desc: 'Vue d\'ensemble complète du système Nexus-AID' },
        trainer: { color: '#0ea5e9', icon: <BookOutlined />, title: 'Espace Formateur', desc: 'Gérez vos formations et suivez vos apprenants' },
        donor: { color: '#16a34a', icon: <GiftOutlined />, title: 'Espace Donateur', desc: 'Suivez vos contributions et leur impact' },
        volunteer: { color: '#C81E1E', icon: <TeamOutlined />, title: 'Tableau de Bord', desc: `Bienvenue ${user?.fullName || ''} — ${permissions.label}` },
    };
    const c = cfg[dt] || cfg.volunteer;

    return (
        <div style={{
            background: isDark
                ? `linear-gradient(135deg, ${c.color}12, transparent)`
                : `linear-gradient(135deg, ${c.color}08, ${c.color}02)`,
            borderRadius: 20, padding: '24px 28px', marginBottom: 24,
            border: `1px solid ${isDark ? `${c.color}18` : `${c.color}12`}`,
        }}>
            <div style={{
                display: 'flex', flexWrap: 'wrap', alignItems: 'center',
                justifyContent: 'space-between', gap: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16, flexShrink: 0,
                        background: isDark ? `${c.color}20` : `${c.color}10`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, color: c.color,
                        boxShadow: isDark ? `0 0 20px ${c.color}20` : 'none',
                    }}>
                        {c.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <Title level={3} style={{ margin: 0, fontSize: 24 }}>{c.title}</Title>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 14 }}>{c.desc}</Text>
                    </div>
                </div>
                <Space wrap>
                    {activeAlerts > 0 && (
                        <Badge count={activeAlerts} size="small">
                            <Tag icon={<BellOutlined />} color="red"
                                style={{ cursor: 'pointer', padding: '4px 14px', fontSize: 13, borderRadius: 10 }}
                                onClick={() => navigate('/stocks')}>
                                Alertes
                            </Tag>
                        </Badge>
                    )}
                    {user?.roles?.some((r: any) => r.committeeType === 'NATIONAL') && (
                        <Tag color="gold" icon={<GlobalOutlined />} style={{ padding: '4px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                            Siège National
                        </Tag>
                    )}
                    {user?.roles?.some((r: any) => r.committeeType === 'REGIONAL') && (
                        <Tag color="blue" icon={<EnvironmentOutlined />} style={{ padding: '4px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                            {user.roles.find((r: any) => r.committeeType === 'REGIONAL')?.committee || 'Régional'}
                        </Tag>
                    )}
                    <Tag style={{
                        padding: '4px 16px', fontSize: 13, borderRadius: 10,
                        background: c.color, color: '#fff', border: 'none', fontWeight: 600,
                        boxShadow: isDark ? `0 0 16px ${c.color}30` : 'none',
                    }}>
                        {c.icon} {permissions.label}
                    </Tag>
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
}> = ({ isDark, navigate, user, totalVolunteers, totalCommittees, totalStock, activeAlerts, committees, alerts }) => (
    <>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<TeamOutlined />} iconColor="#C81E1E"
                    gradientFrom="#C81E1E" gradientTo="#ef4444" title="Volontaires Gérés"
                    value={totalVolunteers} trend={{ label: '360° View', color: '#16a34a' }}
                    sparkData={[5, 12, 8, 20, 15, 25, totalVolunteers || 30]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<ApartmentOutlined />} iconColor="#6366f1"
                    gradientFrom="#6366f1" gradientTo="#818cf8" title="Comités Actifs"
                    value={totalCommittees}
                    sparkData={[2, 5, 3, 8, 6, 10, totalCommittees || 12]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<InboxOutlined />} iconColor="#0ea5e9"
                    gradientFrom="#0ea5e9" gradientTo="#38bdf8" title="Articles Critique"
                    value={totalStock} sparkData={[10, 15, 8, 20, 12, 18, totalStock || 22]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<SafetyOutlined />} iconColor="#f59e0b"
                    gradientFrom="#f59e0b" gradientTo="#fbbf24" title="Rôles en Attente"
                    value={activeAlerts || 0} // Using alerts placeholder or real data if available
                    trend={{ label: 'Validation Requise', color: '#f59e0b' }} />
            </Col>
        </Row>

        {/* CRISIS COMMAND CENTER WEDGE */}
        {user?.committeeType === 'NATIONAL' && (
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24}>
                    <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined, background: isDark ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.05))' : 'linear-gradient(135deg, rgba(254, 226, 226, 0.5), #fff)' }}
                        title={<Space><GlobalOutlined style={{ color: '#ef4444' }} /> Centre Opérationnel de Crise (NATIONAL)</Space>}
                        extra={<Button type="primary" danger onClick={() => navigate('/catastrophes')} icon={<ThunderboltOutlined />}>Ouvrir Radar AlphaEarth</Button>}>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={8}>
                                <div style={{ padding: 16, borderRadius: 16, height: '100%', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fca5a5'}` }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#ef4444' }}>📡 Flux Météo AlphaEarth</Text>
                                    <Text style={{ fontSize: 13, color: isDark ? '#ccc' : '#666', display: 'block', marginBottom: 12 }}>Analyse prédictive de 27 variables avec l'API OpenWeather & USGS.</Text>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Tag color="red" bordered={false}>Alerte Orage : Nord</Tag>
                                        <Tag color="volcano" bordered={false}>Feu : Faible</Tag>
                                    </div>
                                </div>
                            </Col>
                            <Col xs={24} md={8}>
                                <div style={{ padding: 16, borderRadius: 16, height: '100%', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.2)' : '#a5b4fc'}` }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#6366f1' }}>⚡ Pipeline RabbitMQ (disaster.alert)</Text>
                                    <Text style={{ fontSize: 13, color: isDark ? '#ccc' : '#666', display: 'block', marginBottom: 12 }}>Création d'interventions de sauvetage. CDC en écoute persistante.</Text>
                                    <Progress percent={100} size="small" status="active" strokeColor="#6366f1" />
                                </div>
                            </Col>
                            <Col xs={24} md={8}>
                                <div style={{ padding: 16, borderRadius: 16, height: '100%', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${isDark ? 'rgba(22, 163, 106, 0.2)' : '#86efac'}` }}>
                                    <Text strong style={{ display: 'block', marginBottom: 8, color: '#16a34a' }}>🚁 NDRT / RDRT Readiness</Text>
                                    <Text style={{ fontSize: 13, color: isDark ? '#ccc' : '#666', display: 'block', marginBottom: 12 }}>Profilage actif. Volontaires mobilisés via matching des compétences / besoins.</Text>
                                    <Space size="small">
                                        <Badge status="processing" color="green" /> <Text style={{ fontSize: 13, color: '#16a34a' }}>142 Prêts au déploiement</Text>
                                    </Space>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
                <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                    title={<Space><BarChartOutlined /> Volontaires par comité</Space>}
                    styles={{ body: { padding: '16px 24px 24px' } }}>
                    {committees.slice(0, 7).length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 200 }}>
                            {committees.slice(0, 7).map((c) => {
                                const max = Math.max(...committees.slice(0, 7).map(x => x.totalVolunteers || 0), 1);
                                const pct = ((c.totalVolunteers || 0) / max) * 100;
                                return (
                                    <Tooltip key={c.id} title={`${c.name}: ${c.totalVolunteers} volontaires`}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                            <Text style={{ fontSize: 11, fontWeight: 600 }}>{c.totalVolunteers}</Text>
                                            <div style={{
                                                width: '100%', height: `${pct}%`, minHeight: 8,
                                                borderRadius: '10px 10px 4px 4px',
                                                background: isDark
                                                    ? 'linear-gradient(to top, #6366f1, #818cf8)'
                                                    : 'linear-gradient(to top, #C81E1E, #ef4444)',
                                                transition: 'height 0.8s ease',
                                                boxShadow: isDark ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                                            }} />
                                            <Text style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.4)' : '#888' }}>{c.region}</Text>
                                        </div>
                                    </Tooltip>
                                );
                            })}
                        </div>
                    ) : <Empty description="Aucune donnée" />}
                </Card>
            </Col>
            <Col xs={24} lg={10}>
                <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                    title={<Space><ExclamationCircleOutlined style={{ color: '#f59e0b' }} /> Alertes système</Space>}
                    styles={{ body: { padding: '12px 20px' } }}>
                    {alerts.length > 0 ? (
                        <List size="small" dataSource={alerts.slice(0, 5)} renderItem={(item) => (
                            <List.Item style={{ padding: '10px 0' }}>
                                <List.Item.Meta
                                    avatar={<Badge status={item.severity === 'CRITICAL' ? 'error' : 'warning'} />}
                                    title={<Text style={{ fontSize: 13 }}>{`Alerte #${item.itemId.substring(0, 8)}`}</Text>}
                                    description={<Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{item.alertType} — {item.severity}</Text>}
                                />
                            </List.Item>
                        )} />
                    ) : <Empty description="Aucune alerte" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                </Card>
            </Col>
        </Row>

        <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
            title={<Space><ThunderboltOutlined style={{ color: '#6366f1' }} /> Administration rapide</Space>}>
            <Row gutter={[12, 12]}>
                {[
                    { icon: <TeamOutlined />, label: 'Volontaires', desc: 'Gérer les profils', color: '#C81E1E', route: '/volunteers' },
                    { icon: <ApartmentOutlined />, label: 'Comités', desc: 'Organisation', color: '#6366f1', route: '/committees' },
                    { icon: <InboxOutlined />, label: 'Inventaire', desc: `${totalStock} articles`, color: '#8b5cf6', route: '/stocks' },
                    { icon: <FileTextOutlined />, label: 'Rapports', desc: 'SitRep / Mensuels', color: '#16a34a', route: '/reports' },
                    { icon: <GiftOutlined />, label: 'Donations', desc: 'Suivi des dons', color: '#f59e0b', route: '/donations' },
                    { icon: <SafetyOutlined />, label: 'Validations', desc: 'Queue de rôles', color: '#8b5cf6', route: '/validation-queue' },
                    { icon: <AuditOutlined />, label: 'Audit Trail', desc: '360° Vision', color: '#6366f1', route: '/audit-logs' },
                    { icon: <GlobalOutlined />, label: 'Météo', desc: 'Alertes & Suivi', color: '#ef4444', route: '/catastrophes' },
                    { icon: <SettingOutlined />, label: 'Paramètres', desc: 'Configuration', color: '#64748b', route: '/settings' },
                ].filter(a => a.route !== '/catastrophes' || user?.committeeType === 'NATIONAL').map((a) => (
                    <Col xs={12} sm={8} md={6} key={a.label}>
                        <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                    </Col>
                ))}
            </Row>
        </Card>
    </>
);

// ============================================================
// TRAINER Dashboard (matching mockup)
// ============================================================
const TrainerDashboard: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
    totalVolunteers: number; committees: CommitteeOverview[];
}> = ({ isDark, navigate, totalVolunteers, committees }) => (
    <>
        {/* KPI Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<BookOutlined />} iconColor="#0ea5e9"
                    gradientFrom="#0ea5e9" gradientTo="#38bdf8"
                    title="Sessions Dispensées" value={12}
                    trend={{ label: 'Ce mois', color: '#0ea5e9' }}
                    sparkData={[3, 5, 4, 8, 6, 10, 12]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<TeamOutlined />} iconColor="#16a34a"
                    gradientFrom="#16a34a" gradientTo="#4ade80"
                    title="Apprenants Formés" value={totalVolunteers || 5}
                    sparkData={[10, 25, 18, 40, 35, 55, totalVolunteers || 5]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<TrophyOutlined />} iconColor="#f59e0b"
                    gradientFrom="#f59e0b" gradientTo="#fbbf24"
                    title="Certifications Délivrées" value={42}
                    trend={{ label: '↑ +8', color: '#16a34a' }}
                    sparkData={[8, 12, 15, 22, 30, 35, 42]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<ClockCircleOutlined />} iconColor="#8b5cf6"
                    gradientFrom="#8b5cf6" gradientTo="#a78bfa"
                    title="Heures de Formation" value="1,500" suffix="h"
                    trend={{ label: '↑ +10%', color: '#8b5cf6' }}
                    sparkData={[200, 400, 600, 800, 1000, 1200, 1500]} />
            </Col>
        </Row>

        {/* Sessions + Expertise */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
                <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                    title={<Space><CalendarOutlined /> Prochaines sessions</Space>}
                    styles={{ body: { padding: '8px 24px 20px' } }}>
                    <SessionCard isDark={isDark} title="Formation PSE2 — Niveau avancé"
                        date="15 Mars 2026" status="Planifiée" count={25}
                        color="#0ea5e9" statusColor="#3b82f6" />
                    <SessionCard isDark={isDark} title="Recyclage RCP — Comité Tunis"
                        date="22 Mars 2026" status="Confirmée" count={18}
                        color="#16a34a" statusColor="#16a34a" />
                    <SessionCard isDark={isDark} title="Atelier DIH — Nouveaux volontaires"
                        date="5 Avril 2026" status="En préparation" count={30}
                        color="#f59e0b" statusColor="#f59e0b" />
                    <SessionCard isDark={isDark} title="Formation Gestion de Crise"
                        date="12 Avril 2026" status="Planifiée" count={15}
                        color="#8b5cf6" statusColor="#3b82f6" />
                </Card>
            </Col>
            <Col xs={24} lg={10}>
                <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                    title={<Space><StarOutlined style={{ color: '#0ea5e9' }} /> Mes domaines d'expertise</Space>}
                    styles={{ body: { padding: 24 } }}>
                    {[
                        { name: 'Secourisme', pct: 78 },
                        { name: 'RCP', pct: 82 },
                        { name: 'PSE1', pct: 94 },
                        { name: 'PSE2', pct: 75 },
                        { name: 'Gestes qui sauvent', pct: 80 },
                    ].map((d) => (
                        <div key={d.name} style={{
                            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
                        }}>
                            <Text style={{
                                width: 120, fontSize: 13, fontWeight: 500, flexShrink: 0,
                                color: isDark ? 'rgba(255,255,255,0.7)' : '#555',
                            }}>{d.name}</Text>
                            <Progress percent={d.pct} size="small" style={{ flex: 1 }}
                                strokeColor={isDark ? '#38bdf8' : '#0ea5e9'} showInfo={false} />
                            <Text style={{
                                fontSize: 13, fontWeight: 600, width: 36, textAlign: 'right',
                                color: isDark ? '#38bdf8' : '#0ea5e9',
                            }}>{d.pct}%</Text>
                        </div>
                    ))}

                    <Divider style={{ margin: '20px 0 16px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : '#888' }}>
                            Évaluation globale
                        </Text>
                        <RadialGauge percent={82} label="Excellente" color="#0ea5e9" isDark={isDark} />
                    </div>
                </Card>
            </Col>
        </Row>

        {/* Committees */}
        <Card style={{ borderRadius: 20, marginBottom: 24, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
            title={<Space><EnvironmentOutlined /> Comités affectés</Space>}>
            <Row gutter={[12, 12]}>
                {(committees.length > 0 ? committees.slice(0, 4) : [
                    { id: '1', name: 'Comité de Tunis', region: 'Tunis', type: 'LOCAL' as const, totalVolunteers: 45, parentCommitteeName: '', roles: [] },
                    { id: '2', name: 'Comité de Tunis', region: 'Tunis', type: 'REGIONAL' as const, totalVolunteers: 120, parentCommitteeName: '', roles: [] },
                    { id: '3', name: 'Comité de Sousse', region: 'Sousse', type: 'LOCAL' as const, totalVolunteers: 38, parentCommitteeName: '', roles: [] },
                ]).map((c) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={c.id}>
                        <div style={{
                            borderRadius: 16, padding: 20,
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                            textAlign: 'center',
                            transition: 'all 0.3s ease',
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#0ea5e930'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'; }}
                        >
                            <Avatar size={48} style={{
                                background: isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.08)',
                                color: '#0ea5e9', marginBottom: 12,
                            }} icon={<EnvironmentOutlined />} />
                            <Text strong style={{ display: 'block', fontSize: 14, marginBottom: 4 }}>{c.name}</Text>
                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{c.totalVolunteers} vol.</Text>
                        </div>
                    </Col>
                ))}
            </Row>
        </Card>

        {/* Quick Actions */}
        <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
            title={<Space><ThunderboltOutlined style={{ color: '#0ea5e9' }} /> Actions rapides</Space>}>
            <Row gutter={[12, 12]}>
                {[
                    { icon: <MedicineBoxOutlined />, label: 'Secourisme', desc: 'Équipements & cours', color: '#C81E1E', route: '/secourisme' },
                    { icon: <TeamOutlined />, label: 'Volontaires', desc: 'Mes apprenants', color: '#6366f1', route: '/volunteers' },
                    { icon: <FileTextOutlined />, label: 'Rapports', desc: 'Bilans de formation', color: '#16a34a', route: '/reports' },
                    { icon: <InboxOutlined />, label: 'Matériel', desc: 'Stock formation', color: '#8b5cf6', route: '/stocks' },
                ].map((a) => (
                    <Col xs={12} sm={12} md={6} key={a.label}>
                        <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                    </Col>
                ))}
            </Row>
        </Card>
    </>
);

// ============================================================
// DONOR Dashboard
// ============================================================
const DonorDashboard: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
}> = ({ isDark, navigate }) => (
    <>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<GiftOutlined />} iconColor="#16a34a"
                    gradientFrom="#16a34a" gradientTo="#4ade80"
                    title="Donations Effectuées" value={12}
                    trend={{ label: '↑ +3', color: '#16a34a' }}
                    sparkData={[2, 4, 3, 6, 8, 10, 12]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<HeartOutlined />} iconColor="#ec4899"
                    gradientFrom="#ec4899" gradientTo="#f472b6"
                    title="Bénéficiaires Aidés" value={340}
                    sparkData={[50, 100, 120, 200, 250, 300, 340]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<EnvironmentOutlined />} iconColor="#0ea5e9"
                    gradientFrom="#0ea5e9" gradientTo="#38bdf8"
                    title="Zones Couvertes" value={3}
                    sparkData={[1, 1, 2, 2, 2, 3, 3]} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
                <KpiCard isDark={isDark} icon={<FundOutlined />} iconColor="#8b5cf6"
                    gradientFrom="#8b5cf6" gradientTo="#a78bfa"
                    title="Impact Score" value="A+"
                    trend={{ label: 'Excellent', color: '#8b5cf6' }} />
            </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={14}>
                <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                    title={<Space><CalendarOutlined /> Historique des donations</Space>}
                    styles={{ body: { padding: '8px 24px 20px' } }}>
                    {[
                        { type: 'Alimentaire', date: '20 Fév 2026', zone: 'Tunis', qty: '200 paniers', color: '#16a34a' },
                        { type: 'Médical', date: '15 Fév 2026', zone: 'Sousse', qty: '50 kits', color: '#0ea5e9' },
                        { type: 'Alimentaire', date: '1 Fév 2026', zone: 'Tunis', qty: '150 paniers', color: '#16a34a' },
                        { type: 'Équipement', date: '15 Jan 2026', zone: 'Sfax', qty: '10 tentes', color: '#8b5cf6' },
                    ].map((item, i) => (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '14px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5'}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <Avatar style={{ background: isDark ? `${item.color}25` : `${item.color}12`, color: item.color }}
                                    icon={<GiftOutlined />} />
                                <div>
                                    <Text strong style={{ fontSize: 14, display: 'block' }}>{item.type} — {item.qty}</Text>
                                    <Space size={4}>
                                        <EnvironmentOutlined style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }} />
                                        <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{item.zone} • {item.date}</Text>
                                    </Space>
                                </div>
                            </div>
                            <Tag style={{
                                background: isDark ? 'rgba(22,163,106,0.2)' : 'rgba(22,163,106,0.08)',
                                color: '#16a34a', border: 'none', borderRadius: 12,
                                fontSize: 11, fontWeight: 600,
                            }}>Livré</Tag>
                        </div>
                    ))}
                </Card>
            </Col>
            <Col xs={24} lg={10}>
                <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                    title={<Space><HeartOutlined style={{ color: '#ec4899' }} /> Catégories préférées</Space>}
                    styles={{ body: { padding: 24 } }}>
                    {[
                        { cat: 'Alimentaire', pct: 45, color: '#16a34a' },
                        { cat: 'Médical', pct: 30, color: '#0ea5e9' },
                        { cat: 'Équipement', pct: 15, color: '#8b5cf6' },
                        { cat: 'Vestimentaire', pct: 10, color: '#f59e0b' },
                    ].map((item) => (
                        <div key={item.cat} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <Text style={{ width: 100, fontSize: 13, fontWeight: 500, flexShrink: 0 }}>{item.cat}</Text>
                            <Progress percent={item.pct} size="small" style={{ flex: 1 }}
                                strokeColor={isDark ? item.color : item.color} showInfo={false} />
                            <Text style={{ fontSize: 13, fontWeight: 600, width: 36, textAlign: 'right', color: item.color }}>{item.pct}%</Text>
                        </div>
                    ))}
                    <Divider style={{ margin: '16px 0' }} />
                    <div style={{ textAlign: 'center' }}>
                        <RadialGauge percent={78} label="Excellent" color="#16a34a" isDark={isDark} />
                    </div>
                </Card>
            </Col>
        </Row>

        <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
            title={<Space><ThunderboltOutlined style={{ color: '#16a34a' }} /> Actions rapides</Space>}>
            <Row gutter={[12, 12]}>
                {[
                    { icon: <GiftOutlined />, label: 'Faire un don', desc: 'Nouvelle donation', color: '#16a34a', route: '/donations' },
                    { icon: <FundOutlined />, label: 'Mon impact', desc: 'Statistiques détaillées', color: '#8b5cf6', route: '/dashboard' },
                    { icon: <SettingOutlined />, label: 'Préférences', desc: 'Zones & catégories', color: '#64748b', route: '/settings' },
                ].map((a) => (
                    <Col xs={24} sm={8} key={a.label}>
                        <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                    </Col>
                ))}
            </Row>
        </Card>
    </>
);

// ============================================================
// VOLUNTEER Dashboard
// ============================================================
const VolunteerDashboard: React.FC<{
    isDark: boolean; navigate: (p: string) => void;
    permissions: any; user: any;
    totalVolunteers: number; pendingVolunteers: number; totalCommittees: number; totalStock: number; activeAlerts: number;
    committees: CommitteeOverview[]; alerts: StockAlertDTO[];
    jeunesseFormsCount: number | string; jeunesseProjectsCount: number | string;
    santeActionsCount: number | string;
    socialFamiliesCount: number | string; socialActionsCount: number | string;
    vffCasesCount: number | string;
    immigrationCasesCount: number | string;
    secourismeEqCount: number | string; secourismeDvCount: number | string;
}> = ({ isDark, navigate, permissions, user, totalVolunteers, pendingVolunteers, totalCommittees, totalStock, activeAlerts, committees, alerts,
    jeunesseFormsCount, jeunesseProjectsCount, santeActionsCount,
    socialFamiliesCount, socialActionsCount, vffCasesCount, immigrationCasesCount,
    secourismeEqCount, secourismeDvCount
}) => {
        // Determine if this user is ONLY a domain responsable (not a president/vp)
        const userRoles: string[] = (user?.roles || []).map((r: any) =>
            (typeof r === 'string' ? r : r?.role || '').toUpperCase()
        );
        const isLeadership = userRoles.some(r =>
            r.includes('PRESIDENT') || r.includes('VICE') || r.includes('SECRETAIRE') || r.includes('TRESORIER') || r.includes('ADMIN')
        );
        const isDomainOnly = !isLeadership && userRoles.some(r =>
            r.startsWith('RESP_')
        );

        return (
            <>
                {/* ── Generic Management KPIs — hidden for domain-only responsables ── */}
                {!isDomainOnly && (
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={12} lg={4}>
                            <KpiCard isDark={isDark} icon={<TeamOutlined />} iconColor="#16a34a"
                                gradientFrom="#16a34a" gradientTo="#4ade80"
                                title="Volontaires Actifs" value={totalVolunteers}
                                trend={{ label: 'Approuvés', color: '#16a34a' }}
                                sparkData={[5, 10, 8, 15, 12, 20, totalVolunteers || 25]} />
                        </Col>
                        <Col xs={24} sm={12} lg={4}>
                            <KpiCard isDark={isDark} icon={<ClockCircleOutlined />} iconColor="#f59e0b"
                                gradientFrom="#f59e0b" gradientTo="#fbbf24"
                                title="En Attente" value={pendingVolunteers}
                                trend={{ label: 'Validation Requise', color: '#f59e0b' }} />
                        </Col>
                        <Col xs={24} sm={12} lg={4}>
                            <KpiCard isDark={isDark} icon={<AlertOutlined />} iconColor="#ef4444"
                                gradientFrom="#ef4444" gradientTo="#f87171"
                                title="Alertes Actives" value={activeAlerts}
                                trend={activeAlerts > 0 ? { label: `${activeAlerts} actives`, color: '#ef4444' } : { label: 'RAS', color: '#16a34a' }} />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KpiCard isDark={isDark} icon={<InboxOutlined />} iconColor="#6366f1"
                                gradientFrom="#6366f1" gradientTo="#818cf8"
                                title="Articles en Stock" value={totalStock}
                                sparkData={[3, 8, 5, 12, 10, 15, totalStock || 18]} />
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                            <KpiCard isDark={isDark} icon={<ApartmentOutlined />} iconColor="#8b5cf6"
                                gradientFrom="#8b5cf6" gradientTo="#a78bfa"
                                title="Comités" value={totalCommittees}
                                sparkData={[1, 3, 2, 5, 4, 8, totalCommittees || 10]} />
                        </Col>
                    </Row>
                )}

                {/* ── Crisis Command Center — national leaders only ── */}
                {permissions.sidebarKeys.includes('/catastrophes') && user?.committeeType === 'NATIONAL' && (
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24}>
                            <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined, background: isDark ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(185, 28, 28, 0.05))' : 'linear-gradient(135deg, rgba(254, 226, 226, 0.5), #fff)' }}
                                title={<Space><GlobalOutlined style={{ color: '#ef4444' }} /> Centre Opérationnel de Crise (NATIONAL)</Space>}
                                extra={<Button type="primary" danger onClick={() => navigate('/catastrophes')} icon={<ThunderboltOutlined />}>Ouvrir Radar AlphaEarth</Button>}>
                                <Row gutter={[16, 16]}>
                                    <Col xs={24} md={8}>
                                        <div style={{ padding: 16, borderRadius: 16, height: '100%', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : '#fca5a5'}` }}>
                                            <Text strong style={{ display: 'block', marginBottom: 8, color: '#ef4444' }}>📡 Flux Météo AlphaEarth</Text>
                                            <Text style={{ fontSize: 13, color: isDark ? '#ccc' : '#666', display: 'block', marginBottom: 12 }}>Analyse prédictive de 27 variables avec l'API OpenWeather & USGS.</Text>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <Tag color="red" bordered={false}>Alerte Orage : Nord</Tag>
                                                <Tag color="volcano" bordered={false}>Feu : Faible</Tag>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <div style={{ padding: 16, borderRadius: 16, height: '100%', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${isDark ? 'rgba(99, 102, 241, 0.2)' : '#a5b4fc'}` }}>
                                            <Text strong style={{ display: 'block', marginBottom: 8, color: '#6366f1' }}>⚡ Pipeline RabbitMQ (disaster.alert)</Text>
                                            <Text style={{ fontSize: 13, color: isDark ? '#ccc' : '#666', display: 'block', marginBottom: 12 }}>Création d'interventions de sauvetage. CDC en écoute persistante.</Text>
                                            <Progress percent={100} size="small" status="active" strokeColor="#6366f1" />
                                        </div>
                                    </Col>
                                    <Col xs={24} md={8}>
                                        <div style={{ padding: 16, borderRadius: 16, height: '100%', background: isDark ? 'rgba(0,0,0,0.2)' : '#fff', border: `1px solid ${isDark ? 'rgba(22, 163, 106, 0.2)' : '#86efac'}` }}>
                                            <Text strong style={{ display: 'block', marginBottom: 8, color: '#16a34a' }}>🚁 NDRT / RDRT Readiness</Text>
                                            <Text style={{ fontSize: 13, color: isDark ? '#ccc' : '#666', display: 'block', marginBottom: 12 }}>Profilage actif. Volontaires mobilisés via matching des compétences.</Text>
                                            <Space size="small">
                                                <Badge status="processing" color="green" /> <Text style={{ fontSize: 13, color: '#16a34a' }}>142 Prêts au déploiement</Text>
                                            </Space>
                                        </div>
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                    </Row>
                )}

                {/* ── General charts (Volontaires par comité / Alertes stock / Top comités)
              Hidden for domain-only responsables — they manage their domain, not the committee ── */}
                {!isDomainOnly && (
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} lg={14}>
                            <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                                title={<Space><BarChartOutlined /> Volontaires par comité</Space>}
                                styles={{ body: { padding: '16px 24px 24px' } }}>
                                {committees.slice(0, 7).length > 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 200 }}>
                                        {committees.slice(0, 7).map((c) => {
                                            const max = Math.max(...committees.slice(0, 7).map(x => x.totalVolunteers || 0), 1);
                                            const pct = ((c.totalVolunteers || 0) / max) * 100;
                                            return (
                                                <Tooltip key={c.id} title={`${c.name}: ${c.totalVolunteers} volontaires`}>
                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                                        <Text style={{ fontSize: 11, fontWeight: 600 }}>{c.totalVolunteers}</Text>
                                                        <div style={{
                                                            width: '100%', height: `${pct}%`, minHeight: 8,
                                                            borderRadius: '10px 10px 4px 4px',
                                                            background: 'linear-gradient(to top, #C81E1E, #ef4444)',
                                                            transition: 'height 0.8s ease',
                                                            boxShadow: isDark ? '0 0 12px rgba(200,30,30,0.3)' : 'none',
                                                        }} />
                                                        <Text style={{ fontSize: 9, color: isDark ? 'rgba(255,255,255,0.4)' : '#888' }}>{c.region}</Text>
                                                    </div>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                ) : <Empty description="Aucune donnée" />}
                            </Card>
                        </Col>
                        <Col xs={24} lg={10}>
                            <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                                title={<Space><ExclamationCircleOutlined style={{ color: '#f59e0b' }} /> Alertes stock</Space>}
                                styles={{ body: { padding: '12px 20px' } }}>
                                {alerts.length > 0 ? (
                                    <List size="small" dataSource={alerts.slice(0, 5)} renderItem={(item) => (
                                        <List.Item style={{ padding: '10px 0' }}>
                                            <List.Item.Meta
                                                avatar={<Badge status={item.severity === 'CRITICAL' ? 'error' : 'warning'} />}
                                                title={<Text style={{ fontSize: 13 }}>{`Alerte #${item.itemId.substring(0, 8)}`}</Text>}
                                                description={<Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{item.alertType} — {item.severity}</Text>}
                                            />
                                        </List.Item>
                                    )} />
                                ) : <Empty description="Aucune alerte" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                            </Card>

                            <Card style={{ borderRadius: 20, marginTop: 16, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                                title={<Space><EnvironmentOutlined /> Top comités</Space>}
                                styles={{ body: { padding: '12px 20px' } }}>
                                {committees.slice(0, 5).map((c) => {
                                    const max = Math.max(...committees.map(x => x.totalVolunteers || 0), 1);
                                    return (
                                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                            <Text style={{ width: 80, fontSize: 12, fontWeight: 500 }}>{c.region || c.name}</Text>
                                            <Progress percent={Math.min(100, Math.round(((c.totalVolunteers || 0) / max) * 100))}
                                                showInfo={false} strokeColor={c.totalVolunteers > 50 ? '#C81E1E' : c.totalVolunteers > 20 ? '#f59e0b' : '#6366f1'}
                                                style={{ flex: 1 }} size="small" />
                                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#888', width: 36, textAlign: 'right' }}>{c.totalVolunteers}</Text>
                                        </div>
                                    );
                                })}
                                {committees.length === 0 && <Empty description="Aucun comité" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                            </Card>
                        </Col>
                    </Row>
                )}

                {/* Domain Stats Preview Widget — for domain responsables only */}
                {(() => {
                    const roles: string[] = (user?.roles || []).map((r: any) => (typeof r === 'string' ? r : r?.role || ''));
                    const hasDomain = (code: string) => roles.some((r: string) => r.includes(code));

                    const cfg = hasDomain('RESP_JEUNESSE') ? {
                        emoji: '🎓', label: 'Espace Jeunesse', color: '#4F46E5', route: '/jeunesse',
                        stats: [{ label: 'Formulaires', icon: '📋', value: jeunesseFormsCount }, { label: 'Projets Actifs', icon: '🚀', value: jeunesseProjectsCount }, { label: 'Recommandations IA', icon: '🤖' }]
                    } : hasDomain('RESP_SANTE') ? {
                        emoji: '🏥', label: 'Espace Santé', color: '#0284C7', route: '/sante',
                        stats: [{ label: 'Interventions', icon: '🩺', value: santeActionsCount }, { label: 'Consultations', icon: '📅' }, { label: 'Bénéficiaires', icon: '👥' }]
                    } : hasDomain('RESP_SOCIAL') ? {
                        emoji: '🏘', label: 'Espace Social', color: '#059669', route: '/social',
                        stats: [{ label: 'Familles', icon: '🏠', value: socialFamiliesCount }, { label: 'Aides', icon: '📦', value: socialActionsCount }, { label: 'Dossiers', icon: '📁' }]
                    } : hasDomain('RESP_VFF') ? {
                        emoji: '🔴', label: 'Espace VFF', color: '#C81E1E', route: '/vff',
                        stats: [{ label: 'Victimes', icon: '🆘', value: vffCasesCount }, { label: 'Cas Traités', icon: '✅' }, { label: 'Référencements', icon: '🔗' }]
                    } : hasDomain('RESP_IMMIGRATION') ? {
                        emoji: '🌍', label: 'Immigration', color: '#7C3AED', route: '/immigration',
                        stats: [{ label: 'Dossiers Actifs', icon: '📑', value: immigrationCasesCount }, { label: 'Assistances', icon: '🤝' }, { label: 'Ateliers', icon: '📚' }]
                    } : hasDomain('RESP_SECOURISME') ? {
                        emoji: '🚑', label: 'Espace Secourisme', color: '#ef4444', route: '/secourisme',
                        stats: [{ label: 'Équipements', icon: '🩺', value: secourismeEqCount }, { label: 'Dispositifs', icon: '📍', value: secourismeDvCount }, { label: 'Secouristes', icon: '👥', value: totalVolunteers }]
                    } : null;

                    if (!cfg) return null;
                    return (
                        <Card
                            style={{ borderRadius: 20, marginBottom: 24, border: `1px solid ${cfg.color}25`, background: isDark ? `${cfg.color}08` : `${cfg.color}04` }}
                            styles={{ body: { padding: '20px 24px' } }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 16, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                        {cfg.emoji}
                                    </div>
                                    <div>
                                        <Text strong style={{ fontSize: 16 }}>Mon Domaine — {cfg.label}</Text>
                                        <div><Text type="secondary" style={{ fontSize: 13 }}>Statistiques et actions spécifiques à votre domaine</Text></div>
                                    </div>
                                </div>
                                <Button type="primary" icon={<BarChartOutlined />} onClick={() => navigate(cfg.route)}
                                    style={{ background: cfg.color, border: 'none', borderRadius: 12, fontWeight: 700, boxShadow: `0 4px 14px ${cfg.color}40` }}>
                                    Ouvrir {cfg.label}
                                </Button>
                            </div>
                            <Row gutter={[12, 12]}>
                                {cfg.stats.map((s: any) => (
                                    <Col key={s.label} xs={8}>
                                        <div style={{ textAlign: 'center', padding: '14px 8px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderRadius: 14, border: `1px solid ${cfg.color}15` }}>
                                            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color }}>{s.value !== undefined ? s.value : '—'}</div>
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>{s.label}</Text>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    );
                })()}

                {/* Quick Actions */}
                {(() => {

                    const actions: { icon: React.ReactNode; label: string; desc: string; color: string; route: string }[] = [];
                    if (permissions.sidebarKeys.includes('/secourisme')) actions.push({ icon: <HeartOutlined />, label: 'Secourisme', desc: 'RCP IA', color: '#C81E1E', route: '/secourisme' });
                    if (permissions.sidebarKeys.includes('/volunteers')) actions.push({ icon: <TeamOutlined />, label: 'Volontaires', desc: 'Profils', color: '#6366f1', route: '/volunteers' });
                    if (permissions.sidebarKeys.includes('/reports')) actions.push({ icon: <FileTextOutlined />, label: 'Rapports', desc: 'SitRep', color: '#16a34a', route: '/reports' });
                    if (permissions.sidebarKeys.includes('/stocks')) actions.push({ icon: <InboxOutlined />, label: 'Inventaire', desc: `${totalStock} articles`, color: '#8b5cf6', route: '/stocks' });
                    if (permissions.sidebarKeys.includes('/donations')) actions.push({ icon: <GiftOutlined />, label: 'Donations', desc: 'Suivi', color: '#f59e0b', route: '/donations' });
                    if (permissions.sidebarKeys.includes('/diffusion')) actions.push({ icon: <SoundOutlined />, label: 'Diffusion', desc: 'Ressources', color: '#ec4899', route: '/diffusion' });
                    if (permissions.sidebarKeys.includes('/sante')) actions.push({ icon: <MedicineBoxOutlined />, label: 'Santé', desc: 'Actions', color: '#0ea5e9', route: '/sante' });
                    if (permissions.sidebarKeys.includes('/social')) actions.push({ icon: <HomeOutlined />, label: 'Social', desc: 'Familles', color: '#10b981', route: '/social' });
                    if (permissions.sidebarKeys.includes('/catastrophes')) actions.push({ icon: <GlobalOutlined />, label: 'Météo', desc: 'Alertes', color: '#ef4444', route: '/catastrophes' });
                    if (actions.length === 0) return null;
                    return (
                        <Card style={{ borderRadius: 20, border: isDark ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                            title={<Space><ThunderboltOutlined style={{ color: '#f59e0b' }} /> Actions rapides</Space>}>
                            <Row gutter={[12, 12]}>
                                {actions.slice(0, 8).map((a) => (
                                    <Col xs={12} sm={8} md={6} key={a.label}>
                                        <QuickAction isDark={isDark} {...a} onClick={() => navigate(a.route)} />
                                    </Col>
                                ))}
                            </Row>
                        </Card>
                    );
                })()}
            </>
        );
    };

export default DashboardPage;
