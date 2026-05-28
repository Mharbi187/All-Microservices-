// ============================================================
// NEXUS-AID — Donor Layout
// Dedicated layout for donors — focused, clean, social-impact oriented
// Navigation: Dashboard, Map, Donate, News, Receipts, Notifications, Profile, Complaints, Settings
// ============================================================

import { Suspense, useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Spin, Avatar, Dropdown, Button, Space, Typography, Badge, Tooltip } from 'antd';
import {
    DashboardOutlined,
    EnvironmentOutlined,
    HeartOutlined,
    ReadOutlined,
    FileProtectOutlined,
    BellOutlined,
    UserOutlined,
    SoundOutlined,
    SettingOutlined,
    LogoutOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    MoonOutlined,
    SunOutlined,
    GiftOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuthStore, useUIStore } from '@/stores';
import { notificationService } from '@/services/notificationService';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

// ---- Donor Navigation Items ----
const buildDonorMenu = (): MenuProps['items'] => [
    {
        key: '/donor/dashboard',
        icon: <DashboardOutlined />,
        label: 'Tableau de bord',
    },
    {
        key: '/donor/map',
        icon: <EnvironmentOutlined />,
        label: 'Carte des besoins',
    },
    {
        key: '/donor/donate',
        icon: <HeartOutlined />,
        label: (
            <span style={{ fontWeight: 600 }}>Faire un don</span>
        ),
    },
    { type: 'divider' },
    {
        key: '/donor/receipts',
        icon: <FileProtectOutlined />,
        label: 'Mes reçus',
    },
    {
        key: '/donor/notifications',
        icon: <BellOutlined />,
        label: 'Notifications',
    },
    {
        key: '/donor/news',
        icon: <ReadOutlined />,
        label: 'Actualités',
    },
    { type: 'divider' },
    {
        key: '/donor/profile',
        icon: <UserOutlined />,
        label: 'Mon profil',
    },
    {
        key: '/donor/complaints',
        icon: <SoundOutlined />,
        label: 'Réclamations',
    },
];

const DonorLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { sidebarCollapsed, toggleSidebar, themeMode, toggleTheme } = useUIStore();
    const { user, logout } = useAuthStore();
    const [notifCount, setNotifCount] = useState(0);

    // Fetch realtime notification count — stops gracefully on 404
    useEffect(() => {
        if (!user) return;
        let stopped = false;
        const fetchNotifications = async () => {
            if (stopped) return;
            try {
                const res = await notificationService.getUnreadCount();
                setNotifCount(res.count || 0);
            } catch (e: any) {
                const status = e?.response?.status;
                if (status === 404 || status === 501) {
                    stopped = true; // endpoint not implemented yet, stop polling
                    return;
                }
                console.warn('Failed to fetch donor notifications', e);
            }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 1000 * 60);
        return () => { stopped = true; clearInterval(interval); };
    }, [user]);

    const menuItems = buildDonorMenu();

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Mon profil',
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Déconnexion',
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
            navigate('/donor/profile');
        }
    };

    const isDark = themeMode === 'dark';

    const siderStyle: React.CSSProperties = {
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
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
            {/* ---- Donor Sidebar ---- */}
            <Sider
                trigger={null}
                collapsible
                collapsed={sidebarCollapsed}
                width={260}
                collapsedWidth={80}
                className="fixed left-0 top-0 bottom-0 z-50 nexus-sider"
                style={siderStyle}
            >
                {/* Logo + Brand */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    padding: sidebarCollapsed ? '16px 0' : '16px 20px',
                    height: 72,
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    gap: 10,
                }}>
                    <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                        boxShadow: '0 0 16px rgba(220,38,38,0.4)',
                    }}>
                        <GiftOutlined style={{ color: '#fff' }} />
                    </div>
                    {!sidebarCollapsed && (
                        <div>
                            <Text strong style={{ color: isDark ? '#fff' : '#1e293b', fontSize: 15, display: 'block', lineHeight: 1.2 }}>
                                Nexus-AID
                            </Text>
                            <Text style={{ color: '#ef4444', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Espace Donateur
                            </Text>
                        </div>
                    )}
                </div>

                {/* Welcome banner */}
                {!sidebarCollapsed && (
                    <div style={{
                        margin: '12px 12px 4px',
                        padding: '10px 14px',
                        background: isDark ? 'rgba(220,38,38,0.12)' : 'rgba(220,38,38,0.06)',
                        borderRadius: 10,
                        border: '1px solid rgba(220,38,38,0.2)',
                    }}>
                        <Text style={{ color: '#ef4444', fontSize: 11, display: 'block', fontWeight: 600 }}>
                            Bonjour, {user?.fullName?.split(' ')[0] || 'Donateur'}
                        </Text>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b', fontSize: 10 }}>
                            Votre générosité change des vies
                        </Text>
                    </div>
                )}

                {/* Navigation Menu */}
                <Menu
                    className="nexus-menu"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={menuItems}
                    onClick={handleMenuClick}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        marginTop: 8,
                    }}
                />

                {/* Bottom: Make Donation CTA */}
                {!sidebarCollapsed && (
                    <div style={{
                        position: 'absolute',
                        bottom: 20,
                        left: 12,
                        right: 12,
                    }}>
                        <Button
                            type="primary"
                            block
                            size="large"
                            icon={<HeartOutlined />}
                            onClick={() => navigate('/donor/donate')}
                            style={{
                                background: 'linear-gradient(135deg, #DC2626, #EF4444)',
                                border: 'none',
                                borderRadius: 12,
                                fontWeight: 700,
                                fontSize: 14,
                                height: 46,
                                boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
                            }}
                        >
                            Faire un don
                        </Button>
                    </div>
                )}
            </Sider>

            {/* ---- Main Content Area ---- */}
            <Layout style={{ marginLeft: sidebarCollapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
                {/* Header */}
                <Header
                    style={{
                        background: isDark ? '#141414' : '#fff',
                        padding: '0 24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                        boxShadow: isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.04)',
                        height: 64,
                    }}
                >
                    <Space size="middle">
                        <Button
                            type="text"
                            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                            onClick={toggleSidebar}
                            style={{ fontSize: 18, color: isDark ? '#fff' : '#333' }}
                        />
                        {/* Impact tagline */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: '#DC2626',
                                boxShadow: '0 0 8px rgba(220,38,38,0.6)',
                                animation: 'pulse 2s infinite',
                            }} />
                            <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13 }}>
                                Espace Donateur — Nexus-AID
                            </Text>
                        </div>
                    </Space>

                    <Space size="middle">
                        {/* Theme Toggle */}
                        <Tooltip title={isDark ? 'Mode clair' : 'Mode sombre'}>
                            <Button
                                type="text"
                                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                                onClick={toggleTheme}
                                style={{ color: isDark ? '#fff' : '#333' }}
                            />
                        </Tooltip>

                        {/* Notifications */}
                        <Tooltip title="Notifications">
                            <Badge count={notifCount} size="small">
                                <Button
                                    type="text"
                                    icon={<BellOutlined />}
                                    onClick={() => navigate('/donor/notifications')}
                                    style={{ color: isDark ? '#fff' : '#333' }}
                                />
                            </Badge>
                        </Tooltip>

                        {/* User Avatar & Dropdown */}
                        <Dropdown
                            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
                            placement="bottomRight"
                            trigger={['click']}
                        >
                            <Space className="cursor-pointer" style={{ gap: 8 }}>
                                <Avatar
                                    size={34}
                                    icon={<UserOutlined />}
                                    src={user?.avatar}
                                    style={{ backgroundColor: '#DC2626', cursor: 'pointer' }}
                                />
                                <div className="hidden sm:block" style={{ lineHeight: 1.3 }}>
                                    <Text style={{ fontSize: 13, display: 'block', fontWeight: 600 }}>
                                        {user?.fullName || 'Donateur'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#DC2626', fontWeight: 500 }}>
                                        Donateur
                                    </Text>
                                </div>
                            </Space>
                        </Dropdown>
                    </Space>
                </Header>

                {/* Page Content */}
                <Content style={{ margin: '24px', minHeight: 'calc(100vh - 64px - 48px)' }}>
                    <Suspense
                        fallback={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
                                <Spin size="large" />
                                <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }}>
                                    Chargement...
                                </Text>
                            </div>
                        }
                    >
                        <Outlet />
                    </Suspense>
                </Content>
            </Layout>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(220,38,38,0.6); }
                    50% { opacity: 0.6; box-shadow: 0 0 16px rgba(220,38,38,0.9); }
                }
            `}</style>
        </Layout>
    );
};

export default DonorLayout;
