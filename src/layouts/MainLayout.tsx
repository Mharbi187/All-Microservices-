// ============================================================
// NEXUS-AID — Main Layout
// Dashboard layout with role-based sidebar, header, and content
// ============================================================

import { Suspense, useMemo, useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Spin, Avatar, Dropdown, Button, Space, Typography, Badge, Breadcrumb, Tooltip, Tag, Popover, List } from 'antd';
import {
    DashboardOutlined,
    TeamOutlined,
    ApartmentOutlined,
    InboxOutlined,
    FileTextOutlined,
    SettingOutlined,
    LogoutOutlined,
    UserOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    MoonOutlined,
    SunOutlined,
    GiftOutlined,
    BellOutlined,
    MedicineBoxOutlined,
    SoundOutlined,
    CalendarOutlined,
    ReadOutlined,
    SmileOutlined,
    HeartOutlined,
    HomeOutlined,
    GlobalOutlined,
    SafetyOutlined,
    AuditOutlined,
    RadarChartOutlined,
    TrophyOutlined,
    AppstoreOutlined,
    MessageOutlined,
    InfoCircleOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useTranslation } from 'react-i18next';
import { useUIStore, useAuthStore } from '@/stores';
import { useReportingStore } from '@/stores/reportingStore';
import { notificationService } from '@/services/notificationService';
import { getUserPermissions } from '@/config/roleConfig';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    const languageMenuItems = [
        { key: 'fr', label: 'Français (FR)' },
        { key: 'ar', label: 'العربية (AR)' },
        { key: 'en', label: 'English (EN)' },
    ];

    const { sidebarCollapsed, toggleSidebar, themeMode, toggleTheme } = useUIStore();
    const { user, logout } = useAuthStore();
    const { unreadCount, notifications, markRead, markAllRead } = useReportingStore();
    const [globalNotifCount, setGlobalNotifCount] = useState(0);
    const [dbNotifications, setDbNotifications] = useState<any[]>([]);
    const [popoverVisible, setPopoverVisible] = useState(false);

    const fetchDbNotifications = async () => {
        if (!user) return;
        try {
            const data = await notificationService.getMyNotifications();
            setDbNotifications(data || []);
        } catch (e) {
            // ignore
        }
    };

    // Poll for notifications — stops gracefully if endpoint returns 404
    useEffect(() => {
        if (!user) return;
        let stopped = false;
        const fetchNotifications = async () => {
            if (stopped) return;
            try {
                const res = await notificationService.getUnreadCount();
                setGlobalNotifCount(res.count || 0);
                await fetchDbNotifications();
            } catch (e: any) {
                // If the endpoint doesn't exist yet (404), stop polling silently
                const status = e?.response?.status;
                if (status === 404 || status === 501) {
                    stopped = true;
                    return;
                }
                // Other errors (network, 500…) — log but keep retrying
                console.warn('Failed to fetch notification count', e);
            }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 1000 * 60); // every 60s
        return () => { stopped = true; clearInterval(interval); };
    }, [user]);

    const actualNotifCount = unreadCount + globalNotifCount;

    const formatTimeLabel = (date: Date) => {
        const diffMs = new Date().getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return "À l'instant";
        if (diffMins < 60) return `${diffMins} min`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'heure' : 'heures'}`;
        const diffDays = Math.floor(diffHours / 24);
        return `${diffDays} ${diffDays === 1 ? 'jour' : 'jours'}`;
    };

    const getNotificationIcon = (iconType: string) => {
        const style = { fontSize: 16 };
        switch (iconType) {
            case 'chat':
            case 'REPORT_SUBMITTED':
                return <MessageOutlined style={{ ...style, color: '#4F46E5' }} />;
            case 'file':
            case 'REPORT_ASSIGNED':
                return <FileTextOutlined style={{ ...style, color: '#2563EB' }} />;
            case 'calendar':
            case 'REPORT_FINALIZED':
                return <CalendarOutlined style={{ ...style, color: '#10B981' }} />;
            case 'info':
            case 'REPORT_VALIDATED':
            default:
                return <InfoCircleOutlined style={{ ...style, color: '#F59E0B' }} />;
        }
    };

    const iconBgColor = (iconType: string) => {
        switch (iconType) {
            case 'chat': return '#EEF2FF';
            case 'file': return '#EFF6FF';
            case 'calendar': return '#ECFDF5';
            case 'info':
            default: return '#FFFBEB';
        }
    };

    const combinedNotifications = useMemo(() => {
        const list: any[] = [];

        // 1. Add real report notifications from store
        notifications.forEach((n) => {
            list.push({
                id: n.id,
                title: n.reportTitle || "Alerte Rapport",
                message: n.message,
                time: new Date(n.timestamp),
                read: n.read,
                iconType: n.type || 'info',
                onClick: () => {
                    markRead(n.id);
                    navigate(`/reporting/reports/${n.reportId}`);
                }
            });
        });

        // 2. Add database notifications
        dbNotifications.forEach((n) => {
            list.push({
                id: n.id,
                title: n.title,
                message: n.message,
                time: new Date(n.createdAt),
                read: n.read,
                iconType: n.type,
                onClick: async () => {
                    try {
                        await notificationService.markAsRead(n.id);
                        fetchDbNotifications();
                        setGlobalNotifCount(prev => Math.max(0, prev - 1));
                    } catch {}
                    if (n.link) navigate(n.link);
                    else navigate('/notifications');
                }
            });
        });

        // Sort by time descending
        list.sort((a, b) => b.time.getTime() - a.time.getTime());

        return list;
    }, [notifications, dbNotifications, navigate, markRead]);

    const popoverContent = (
        <div style={{ width: 360, margin: '-12px -16px' }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #F0F0F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <Text strong style={{ fontSize: 15, color: '#111827' }}>
                    Liste des Notifications
                </Text>
                {actualNotifCount > 0 && (
                    <Badge count={actualNotifCount} style={{ backgroundColor: '#DC2626' }} />
                )}
            </div>

            {/* List */}
            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                <List
                    dataSource={combinedNotifications}
                    renderItem={(item) => (
                        <div
                            key={item.id}
                            onClick={async () => {
                                setPopoverVisible(false);
                                if (item.onClick) await item.onClick();
                            }}
                            style={{
                                display: 'flex',
                                gap: 14,
                                padding: '12px 20px',
                                borderBottom: '1px solid #F3F4F6',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                background: item.read ? 'transparent' : 'rgba(220, 38, 38, 0.03)',
                                borderLeft: item.read ? '3px solid transparent' : '3px solid #DC2626'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = item.read ? 'transparent' : 'rgba(220, 38, 38, 0.03)'}
                        >
                            {/* Icon circle */}
                            <div style={{
                                width: 36, height: 36, borderRadius: '50%',
                                background: iconBgColor(item.iconType),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {getNotificationIcon(item.iconType)}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                    <Text strong style={{ fontSize: 13.5, color: '#111827', display: 'block', lineHeight: 1.3 }}>
                                        {item.title}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>
                                        {item.timeLabel || formatTimeLabel(item.time)}
                                    </Text>
                                </div>
                                <Text type="secondary" style={{ fontSize: 12.5, marginTop: 4, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                    {item.message}
                                </Text>
                            </div>
                        </div>
                    )}
                />
            </div>

            {/* Footer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #F0F0F0', textAlign: 'center' }}>
                <Button 
                    type="text" 
                    block 
                    onClick={async () => {
                        try {
                            markAllRead();
                            await notificationService.markAllAsRead();
                            fetchDbNotifications();
                            setGlobalNotifCount(0);
                        } catch {}
                    }}
                    style={{ fontSize: 13, fontWeight: 600, color: '#4b5563' }}
                >
                    Tout marquer comme lu
                </Button>
            </div>
        </div>
    );

    // Get permissions based on user type + committee roles
    const permissions = useMemo(() => {
        return getUserPermissions(user?.roles || [], user?.type);
    }, [user?.roles, user?.type]);

    // Helper to check if a route/key is allowed
    const isAllowed = (key: string) => permissions.sidebarKeys.includes(key);

    // ---- Build role-based sidebar menu items ----
    const menuItems: MenuProps['items'] = useMemo(() => {
        const items: MenuProps['items'] = [];

        // Dashboard — always visible
        items.push({
            key: '/dashboard',
            icon: <DashboardOutlined />,
            label: t('nav.dashboard'),
        });

        // Notifications — visible to everyone
        items.push({
            key: '/notifications',
            icon: <BellOutlined />,
            label: (
                <Space>
                    Mes Notifications
                    {actualNotifCount > 0 && <Badge count={actualNotifCount} size="small" />}
                </Space>
            ),
        });

        // Modifier l'Accueil — only for authorized national roles
        const canEditHomepage = user?.roles?.some(role => [
            'PRESIDENT_NATIONAL',
            'RESP_DIFFUSION_NATIONAL',
            'VICE_PRESIDENT_NATIONAL',
            'SECRETAIRE_GENERAL_NATIONAL'
        ].includes(role));

        if (canEditHomepage) {
            items.push({
                key: '/',
                icon: <GlobalOutlined />,
                label: "Modifier l'Accueil",
            });
        }

        // Volunteer Space
        const volunteerChildren: MenuProps['items'] = [];
        if (isAllowed('/volunteer/committee')) {
            volunteerChildren.push({
                key: '/volunteer/committee',
                icon: <ApartmentOutlined />,
                label: 'Mon Comité',
            });
        }

        // News — visible to all authenticated users
        volunteerChildren.push({
            key: '/volunteer/news',
            icon: <ReadOutlined />,
            label: 'Actualités',
        });

        // Calendar — visible to all authenticated users
        volunteerChildren.push({
            key: '/volunteer/calendar',
            icon: <CalendarOutlined />,
            label: 'Calendrier',
        });

        if (isAllowed('/volunteer/complaints')) {
            volunteerChildren.push({
                key: '/volunteer/complaints',
                icon: <SoundOutlined />, // or anything else
                label: 'Réclamations',
            });
        }
        if (isAllowed('/volunteer/resources')) {
            volunteerChildren.push({
                key: '/volunteer/resources',
                icon: <FileTextOutlined />,
                label: 'Ressources',
            });
        }
        if (isAllowed('/volunteer/youth')) {
            volunteerChildren.push({
                key: '/volunteer/youth',
                icon: <SmileOutlined />,
                label: 'Intégration Jeunes',
            });
        }
        if (isAllowed('/volunteer/reception')) {
            volunteerChildren.push({
                key: '/volunteer/reception',
                icon: <GiftOutlined />,
                label: 'Réception Dons',
            });
        }
        
        // My Interventions (NDRT/RDRT)
        // Check if the user is a volunteer (they usually have 'VOLUNTEER' role or we just allow it broadly in Volunteer space)
        volunteerChildren.push({
            key: '/volunteer/interventions',
            icon: <SafetyOutlined />,
            label: 'Mes Interventions (NDRT)',
        });

        // Salles de Crise
        volunteerChildren.push({
            key: '/volunteer/crisis-rooms',
            icon: <MessageOutlined />,
            label: 'Salles de Crise',
        });

        // Quiz — visible to all volunteers
        volunteerChildren.push({
            key: '/volunteer/quiz',
            icon: <TrophyOutlined />,
            label: 'Quiz & Certifications',
        });
        if (volunteerChildren.length > 0) {
            items.push({
                key: 'volunteer_space',
                icon: <HomeOutlined />,
                label: 'Mon Espace',
                children: volunteerChildren,
            });
        }

        // Management group (volunteers, committees)
        const managementChildren: MenuProps['items'] = [];
        if (isAllowed('/volunteers')) {
            managementChildren.push({
                key: '/volunteers',
                icon: <TeamOutlined />,
                label: t('nav.volunteers'),
            });
        }
        if (isAllowed('/committees')) {
            managementChildren.push({
                key: '/committees',
                icon: <ApartmentOutlined />,
                label: t('nav.committees'),
            });
        }
        if (isAllowed('/validation-queue')) {
            managementChildren.push({
                key: '/validation-queue',
                icon: <SafetyOutlined />,
                label: 'Validation Roles',
            });
        }
        if (isAllowed('/audit-logs')) {
            managementChildren.push({
                key: '/audit-logs',
                icon: <AuditOutlined />,
                label: 'Audit Trail',
            });
        }
        if (managementChildren.length > 0) {
            items.push({
                key: 'management',
                icon: <TeamOutlined />,
                label: 'Gestion',
                children: managementChildren,
            });
        }

        // Stocks
        if (isAllowed('/stocks')) {
            items.push({
                key: '/stocks',
                icon: <InboxOutlined />,
                label: t('nav.stocks'),
            });
        }

        // Donations
        if (isAllowed('/donations')) {
            items.push({
                key: '/donations',
                icon: <GiftOutlined />,
                label: t('nav.donations'),
            });
        }

        // Reporting Hub — Submenu
        if (isAllowed('/reports')) {
            items.push({
                key: 'reporting',
                icon: <AuditOutlined />,
                label: 'Système Reporting',
                children: [
                    {
                        key: '/reporting/dashboard',
                        icon: <DashboardOutlined />,
                        label: 'Tableau de bord',
                    },
                    {
                        key: '/reporting/list',
                        icon: <FileTextOutlined />,
                        label: 'Rapports',
                    },
                    {
                        key: '/reporting/templates',
                        icon: <AppstoreOutlined />,
                        label: 'Modèles',
                    },
                    {
                        key: '/reporting/notifications',
                        icon: <BellOutlined />,
                        label: (
                            <Space>
                                Notifications
                                {actualNotifCount > 0 && <Badge count={actualNotifCount} size="small" />}
                            </Space>
                        ),
                    },
                ],
            });
        }

        // Domain-specific pages
        const domainChildren: MenuProps['items'] = [];
        if (isAllowed('/secourisme')) {
            domainChildren.push({
                key: '/secourisme',
                icon: <MedicineBoxOutlined />,
                label: 'Secourisme',
            });
        }
        if (isAllowed('/diffusion')) {
            domainChildren.push({
                key: '/diffusion',
                icon: <SoundOutlined />,
                label: 'Diffusion',
            });
        }
        if (isAllowed('/jeunesse')) {
            domainChildren.push({
                key: '/jeunesse',
                icon: <SmileOutlined />,
                label: 'Jeunesse',
            });
        }
        if (isAllowed('/sante')) {
            domainChildren.push({
                key: '/sante',
                icon: <HeartOutlined />,
                label: 'Santé',
            });
        }
        if (isAllowed('/distribution-medicale')) {
            domainChildren.push({
                key: '/distribution-medicale',
                icon: <MedicineBoxOutlined />,
                label: (
                    <Space>
                        Distribution Méd.
                        {/* Badge shown dynamically via state if needed */}
                    </Space>
                ),
            });
        }
        if (isAllowed('/social')) {
            domainChildren.push({
                key: '/social',
                icon: <HomeOutlined />,
                label: 'Action Sociale',
            });
        }
        if (isAllowed('/immigration')) {
            domainChildren.push({
                key: '/immigration',
                icon: <GlobalOutlined />,
                label: 'Immigration',
            });
        }
        if (isAllowed('/vff')) {
            domainChildren.push({
                key: '/vff',
                icon: <SafetyOutlined />,
                label: 'VFF',
            });
        }
        if (isAllowed('/catastrophes')) {
            domainChildren.push({
                key: '/catastrophes',
                icon: <GlobalOutlined />,
                label: 'Catastrophes',
            });
        }
        if (isAllowed('/radar')) {
            domainChildren.push({
                key: '/radar',
                icon: <RadarChartOutlined />,
                label: 'Radar Catastrophes',
            });
        }

        if (domainChildren.length > 0) {
            items.push({
                key: 'domains',
                icon: <ApartmentOutlined />,
                label: 'Domaines',
                children: domainChildren,
            });
        }

        // Validation Center — President & Admin
        const isValidator = user?.roles?.some(r => r.includes('PRESIDENT')) || user?.type === 'ADMIN';

        if (isValidator) {
            items.push({
                key: '/validation-center',
                icon: <ThunderboltOutlined />,
                label: (
                    <Space>
                        Centre de Validation
                    </Space>
                ),
            });
        }

        // Divider + Profil
        items.push({ type: 'divider' });
        items.push({
            key: '/volunteer/profile',
            icon: <UserOutlined />,
            label: 'Mon Profil',
        });

        return items;
    }, [permissions, t, user, actualNotifCount]);

    // ---- User dropdown menu ----
    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: t('nav.profile'),
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: t('auth.logout'),
            danger: true,
        },
    ];

    const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
        navigate(key);
    };

    const handleUserMenuClick: MenuProps['onClick'] = ({ key }) => {
        if (key === 'logout') {
            logout();
            navigate('/login');
        } else if (key === 'profile') {
            navigate('/volunteer/profile');
        }
    };

    // Build breadcrumb labels including domain pages
    const breadcrumbLabels: Record<string, React.ReactNode> = {
        dashboard: t('nav.dashboard'),
        volunteers: t('nav.volunteers'),
        committees: t('nav.committees'),
        stocks: t('nav.stocks'),
        donations: t('nav.donations'),
        reports: t('nav.reports'),
        settings: t('nav.settings'),
        secourisme: 'Secourisme',
        diffusion: 'Diffusion',
        jeunesse: 'Jeunesse',
        sante: 'Santé',
        social: 'Action Sociale',
        immigration: 'Immigration',
        vff: 'VFF',
        catastrophes: 'Moniteur Météo',
        'distribution-medicale': <Space><MedicineBoxOutlined /> Distribution Médicale</Space>,
        reporting: 'Système Reporting',
        'admin-reports': 'Rapports Admin',
        templates: 'Modèles',
        'validation-queue': 'Validation Roles',
        'audit-logs': 'Audit Trail',
        'validation-center': 'Centre de Validation',
    };

    return (
        <Layout className="min-h-screen">
            <style dangerouslySetInnerHTML={{ __html: themeMode === 'dark' ? `
                .nexus-sider {
                    background: #141414 !important;
                    border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
                }
                .nexus-sider .ant-layout-sider-children {
                    background: #141414 !important;
                }
                .nexus-menu {
                    background: #141414 !important;
                }
                .nexus-menu .ant-menu-item,
                .nexus-menu .ant-menu-submenu-title {
                    color: #ffffff !important;
                    font-weight: 700 !important;
                    font-size: 13.5px !important;
                    transition: all 0.2s ease-in-out !important;
                    border-radius: 8px !important;
                    margin: 4px 10px !important;
                    width: calc(100% - 20px) !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .nexus-menu .ant-menu-item .anticon,
                .nexus-menu .ant-menu-submenu-title .anticon {
                    font-size: 16px !important;
                    color: #e2e8f0 !important;
                    transition: color 0.2s ease-in-out !important;
                }
                .nexus-menu .ant-menu-item:hover,
                .nexus-menu .ant-menu-submenu-title:hover {
                    color: #DC2626 !important;
                    background-color: rgba(220, 38, 38, 0.12) !important;
                }
                .nexus-menu .ant-menu-item:hover .anticon,
                .nexus-menu .ant-menu-submenu-title:hover .anticon {
                    color: #DC2626 !important;
                }
                .nexus-menu .ant-menu-item.ant-menu-item-selected {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #DC2626, #EF4444) !important;
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35) !important;
                }
                .nexus-menu .ant-menu-item.ant-menu-item-selected .anticon {
                    color: #ffffff !important;
                }
                .nexus-menu .ant-menu-submenu-arrow {
                    color: #e2e8f0 !important;
                }
                .nexus-menu .ant-menu-submenu:hover > .ant-menu-submenu-title .ant-menu-submenu-arrow {
                    color: #DC2626 !important;
                }
                .nexus-menu .ant-menu-sub {
                    background: #1f1f1f !important;
                    border-radius: 8px !important;
                    margin: 0 10px !important;
                    padding: 4px 0 !important;
                }
                .nexus-menu .ant-menu-sub .ant-menu-item {
                    width: calc(100% - 16px) !important;
                    margin: 3px 8px !important;
                }
                /* Sider collapse width fixes */
                .ant-layout-sider-collapsed .nexus-menu .ant-menu-item {
                    width: 40px !important;
                    margin: 4px auto !important;
                    padding: 0 !important;
                    justify-content: center !important;
                }
                .ant-layout-sider-collapsed .nexus-menu .ant-menu-submenu-title {
                    width: 40px !important;
                    margin: 4px auto !important;
                    padding: 0 !important;
                    justify-content: center !important;
                }
                .ant-layout-sider-collapsed .nexus-menu .ant-menu-submenu-arrow {
                    display: none !important;
                }
            ` : `
                .nexus-sider {
                    background: #ffffff !important;
                    border-right: 1px solid rgba(0, 0, 0, 0.08) !important;
                }
                .nexus-sider .ant-layout-sider-children {
                    background: #ffffff !important;
                }
                .nexus-menu {
                    background: #ffffff !important;
                }
                .nexus-menu .ant-menu-item,
                .nexus-menu .ant-menu-submenu-title {
                    color: #1e293b !important;
                    font-weight: 700 !important;
                    font-size: 13.5px !important;
                    transition: all 0.2s ease-in-out !important;
                    border-radius: 8px !important;
                    margin: 4px 10px !important;
                    width: calc(100% - 20px) !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .nexus-menu .ant-menu-item .anticon,
                .nexus-menu .ant-menu-submenu-title .anticon {
                    font-size: 16px !important;
                    color: #4b5563 !important;
                    transition: color 0.2s ease-in-out !important;
                }
                .nexus-menu .ant-menu-item:hover,
                .nexus-menu .ant-menu-submenu-title:hover {
                    color: #DC2626 !important;
                    background-color: rgba(220, 38, 38, 0.06) !important;
                }
                .nexus-menu .ant-menu-item:hover .anticon,
                .nexus-menu .ant-menu-submenu-title:hover .anticon {
                    color: #DC2626 !important;
                }
                .nexus-menu .ant-menu-item.ant-menu-item-selected {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #DC2626, #EF4444) !important;
                    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.24) !important;
                }
                .nexus-menu .ant-menu-item.ant-menu-item-selected .anticon {
                    color: #ffffff !important;
                }
                .nexus-menu .ant-menu-submenu-arrow {
                    color: #4b5563 !important;
                }
                .nexus-menu .ant-menu-submenu:hover > .ant-menu-submenu-title .ant-menu-submenu-arrow {
                    color: #DC2626 !important;
                }
                .nexus-menu .ant-menu-sub {
                    background: #f8fafc !important;
                    border-radius: 8px !important;
                    margin: 0 10px !important;
                    padding: 4px 0 !important;
                }
                .nexus-menu .ant-menu-sub .ant-menu-item {
                    width: calc(100% - 16px) !important;
                    margin: 3px 8px !important;
                }
                /* Sider collapse width fixes */
                .ant-layout-sider-collapsed .nexus-menu .ant-menu-item {
                    width: 40px !important;
                    margin: 4px auto !important;
                    padding: 0 !important;
                    justify-content: center !important;
                }
                .ant-layout-sider-collapsed .nexus-menu .ant-menu-submenu-title {
                    width: 40px !important;
                    margin: 4px auto !important;
                    padding: 0 !important;
                    justify-content: center !important;
                }
                .ant-layout-sider-collapsed .nexus-menu .ant-menu-submenu-arrow {
                    display: none !important;
                }
            ` }} />
            {/* ---- Sidebar ---- */}
            <Sider
                trigger={null}
                collapsible
                collapsed={sidebarCollapsed}
                width={260}
                collapsedWidth={80}
                className="fixed left-0 top-0 bottom-0 z-50 nexus-sider"
                style={{ overflow: 'auto', height: '100vh', position: 'fixed' }}
            >
                {/* Logo */}
                <div 
                    className="flex items-center justify-center h-16" 
                    style={{ 
                        borderBottom: themeMode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)', 
                        background: themeMode === 'dark' ? '#141414' : '#ffffff', 
                        padding: '0 16px' 
                    }}
                >
                    <img src="/logo.jpg" alt="CRT" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: themeMode === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)' }} />
                    {!sidebarCollapsed && (
                        <span style={{ 
                            marginLeft: 12, 
                            color: themeMode === 'dark' ? '#ffffff' : '#0C1523', 
                            fontSize: '18px', 
                            fontWeight: 800, 
                            letterSpacing: '0.5px', 
                            fontFamily: "'Sora', sans-serif" 
                        }}>
                            Nexus-AID
                        </span>
                    )}
                </div>

                {/* Navigation Menu */}
                <Menu
                    theme={themeMode}
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    defaultOpenKeys={['volunteer_space', 'management', 'domains']}
                    items={menuItems}
                    onClick={handleMenuClick}
                    className="border-none mt-2 nexus-menu"
                />
            </Sider>

            {/* ---- Main Content Area ---- */}
            <Layout style={{ marginLeft: sidebarCollapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
                {/* Header */}
                <Header className="flex items-center justify-between px-6 shadow-sm" style={{ background: 'inherit' }}>
                    <Space size="middle">
                        <Button
                            type="text"
                            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={toggleSidebar}
                            className="text-lg"
                        />
                        <Breadcrumb
                            items={[
                                { title: 'Nexus-AID' },
                                {
                                    title: (() => {
                                        const path = location.pathname.replace('/', '');
                                        return breadcrumbLabels[path] || path;
                                    })()
                                },
                            ]}
                            className="hidden sm:flex"
                        />
                    </Space>

                    <Space size="middle">
                        {/* Monitor Weather Button */}
                        {isAllowed('/radar') && user?.roles?.some((r: any) => r.committeeType === 'NATIONAL') && (
                            <Button
                                type="primary"
                                danger
                                icon={<GlobalOutlined />}
                                onClick={() => navigate('/radar')}
                            >
                                Radar Live
                            </Button>
                        )}

                        {/* Theme Toggle */}
                        <Tooltip title={themeMode === 'dark' ? 'Mode clair' : 'Mode sombre'}>
                            <Button
                                type="text"
                                icon={themeMode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                                onClick={toggleTheme}
                            />
                        </Tooltip>

                        {/* Language Switcher */}
                        <Dropdown
                            menu={{
                                items: languageMenuItems,
                                onClick: (e) => i18n.changeLanguage(e.key),
                                selectedKeys: [i18n.language],
                            }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Tooltip title={t('nav.language', 'Langue')}>
                                <Button type="text" icon={<GlobalOutlined />} />
                            </Tooltip>
                        </Dropdown>

                        {/* Notifications */}
                        <Popover
                            content={popoverContent}
                            trigger="click"
                            open={popoverVisible}
                            onOpenChange={setPopoverVisible}
                            placement="bottomRight"
                            arrow={{ pointAtCenter: true }}
                        >
                            <Badge count={actualNotifCount} size="small" style={{ cursor: 'pointer' }}>
                                <Button type="text" icon={<BellOutlined />} />
                            </Badge>
                        </Popover>

                        {/* User Avatar & Dropdown */}
                        <Dropdown
                            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Space className="cursor-pointer">
                                <Avatar
                                    size="small"
                                    icon={<UserOutlined />}
                                    src={user?.avatar}
                                    style={{ backgroundColor: '#C81E1E' }}
                                />
                                <div className="hidden sm:block" style={{ lineHeight: 1.3 }}>
                                    <Text style={{ fontSize: 13, display: 'block' }}>
                                        {user?.fullName || 'Utilisateur'}
                                    </Text>
                                    <Space size={4} align="center">
                                        <Text style={{ fontSize: 10, color: '#999' }}>
                                            {permissions.label}
                                        </Text>
                                        {user?.roles?.some((r: any) => r.committeeType === 'NATIONAL') && (
                                            <Tag color="gold" style={{ fontSize: 8, margin: 0, padding: '0 4px', lineHeight: '1.4' }}>NAT</Tag>
                                        )}
                                        {user?.roles?.some((r: any) => r.committeeType === 'REGIONAL') && (
                                            <Tag color="blue" style={{ fontSize: 8, margin: 0, padding: '0 4px', lineHeight: '1.4' }}>REG</Tag>
                                        )}
                                    </Space>
                                </div>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                {/* Page Content */}
                <Content className="m-4 sm:m-6">
                    <Suspense
                        fallback={
                            <div className="flex items-center justify-center h-96">
                                <Spin size="large" tip={t('common.loading')} />
                            </div>
                        }
                    >
                        <Outlet />
                    </Suspense>
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
