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
    {
        key: '/settings',
        icon: <SettingOutlined />,
        label: 'Paramètres',
    },
];

const DonorLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { sidebarCollapsed, toggleSidebar, themeMode, toggleTheme } = useUIStore();
    const { user, logout } = useAuthStore();
    const [notifCount, setNotifCount] = useState(2);

    // Simulate notification count
    useEffect(() => {
        setNotifCount(2);
    }, []);

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

    // Sidebar gradient for donor: green-tinted
    const siderStyle: React.CSSProperties = {
        overflow: 'auto',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        background: isDark
            ? 'linear-gradient(180deg, #0f1a0f 0%, #1a2e1a 50%, #0f1a0f 100%)'
            : 'linear-gradient(180deg, #1a3a1a 0%, #1e4a1e 50%, #1a3a1a 100%)',
    };

    return (
        <Layout className="min-h-screen">
            {/* ---- Donor Sidebar ---- */}
            <Sider
                trigger={null}
                collapsible
                collapsed={sidebarCollapsed}
                width={260}
                collapsedWidth={80}
                className="fixed left-0 top-0 bottom-0 z-50"
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
                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                        boxShadow: '0 0 16px rgba(22,163,74,0.4)',
                    }}>
                        <GiftOutlined style={{ color: '#fff' }} />
                    </div>
                    {!sidebarCollapsed && (
                        <div>
                            <Text strong style={{ color: '#fff', fontSize: 15, display: 'block', lineHeight: 1.2 }}>
                                Nexus-AID
                            </Text>
                            <Text style={{ color: '#4ade80', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
                        background: 'rgba(22,163,74,0.12)',
                        borderRadius: 10,
                        border: '1px solid rgba(22,163,74,0.2)',
                    }}>
                        <Text style={{ color: '#4ade80', fontSize: 11, display: 'block', fontWeight: 600 }}>
                            Bonjour, {user?.fullName?.split(' ')[0] || 'Donateur'} 👋
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                            Votre générosité change des vies
                        </Text>
                    </div>
                )}

                {/* Navigation Menu */}
                <Menu
                    theme="dark"
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
                                background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                                border: 'none',
                                borderRadius: 12,
                                fontWeight: 700,
                                fontSize: 14,
                                height: 46,
                                boxShadow: '0 4px 16px rgba(22,163,74,0.4)',
                            }}
                        >
                            💝 Faire un don
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
                                background: '#16a34a',
                                boxShadow: '0 0 8px rgba(22,163,74,0.6)',
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
                                    style={{ backgroundColor: '#16a34a', cursor: 'pointer' }}
                                />
                                <div className="hidden sm:block" style={{ lineHeight: 1.3 }}>
                                    <Text style={{ fontSize: 13, display: 'block', fontWeight: 600 }}>
                                        {user?.fullName || 'Donateur'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
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
                    0%, 100% { opacity: 1; box-shadow: 0 0 8px rgba(22,163,74,0.6); }
                    50% { opacity: 0.6; box-shadow: 0 0 16px rgba(22,163,74,0.9); }
                }
                .ant-menu-dark .ant-menu-item-selected {
                    background: rgba(22,163,74,0.2) !important;
                    border-right: 3px solid #16a34a;
                }
                .ant-menu-dark .ant-menu-item:hover {
                    background: rgba(22,163,74,0.1) !important;
                }
            `}</style>
        </Layout>
    );
};

export default DonorLayout;
