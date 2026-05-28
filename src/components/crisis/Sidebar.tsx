import { Layout, Select, Menu, Badge, Typography, Space, Divider, Tooltip } from 'antd';
import {
    RadarChartOutlined, FileTextOutlined, TeamOutlined,
    ThunderboltOutlined, SunOutlined, MoonOutlined,
    DatabaseOutlined,
} from '@ant-design/icons';
import { useCommandCenter } from '@/stores/commandCenterStore';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from './radarTheme';
import type { RoleType } from '@/types';
import type { CommandCenterPanel } from '@/stores/commandCenterStore';

const { Sider } = Layout;
const { Text } = Typography;

// Croissant SVG for brand
const CrescentIcon = () => (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="15" fill="rgba(220,38,38,0.15)" stroke={rp.red500} strokeWidth="1.2" />
        <path d="M21 8a9 9 0 1 1-10.5 13.5A7.2 7.2 0 1 0 21 8z" fill={rp.red500} />
        <rect x="23" y="14.5" width="7" height="2.2" rx="1.1" fill={rp.red500} />
        <rect x="25.4" y="12.1" width="2.2" height="7" rx="1.1" fill={rp.red500} />
    </svg>
);

interface SidebarProps {
    wilayatNames: string[];
    isConnected: boolean;
    incidentCount?: number;
    responderCount?: number;
}

export default function Sidebar({ wilayatNames, isConnected, incidentCount = 0, responderCount = 0 }: SidebarProps) {
    const { role, selectedWilaya, panel, setRole, setSelectedWilaya, setPanel } = useCommandCenter();
    const { themeMode, toggleTheme } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const navItems = [
        {
            key: 'radar',
            icon: <RadarChartOutlined style={{ fontSize: 16 }} />,
            label: 'Radar Live',
            badge: null,
        },
        {
            key: 'incidents',
            icon: <FileTextOutlined style={{ fontSize: 16 }} />,
            label: 'Journal Incidents',
            badge: incidentCount > 0 ? incidentCount : null,
        },
        {
            key: 'responders',
            icon: <TeamOutlined style={{ fontSize: 16 }} />,
            label: 'Intervenants',
            badge: responderCount > 0 ? responderCount : null,
        },
    ];

    return (
        <Sider
            width={260}
            style={{
                background: t.sidebarBg,
                borderRight: `1px solid ${t.sidebarBorder}`,
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
                boxShadow: isDark ? '4px 0 20px rgba(0,0,0,0.25)' : '4px 0 16px rgba(0,0,0,0.05)',
                flexShrink: 0,
                zIndex: 10,
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                {/* ── Brand Header ── */}
                <div style={{
                    padding: '18px 20px',
                    borderBottom: `1px solid ${t.sidebarBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: isDark
                        ? 'linear-gradient(135deg, rgba(220,38,38,0.12), rgba(15,23,42,0.0))'
                        : 'linear-gradient(135deg, rgba(220,38,38,0.05), rgba(255,255,255,0.0))',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="rd-float" style={{
                            width: 40, height: 40, borderRadius: rr.md,
                            background: `linear-gradient(135deg, ${rp.red600}, ${rp.red500})`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
                        }}>
                            <CrescentIcon />
                        </div>
                        <div>
                            <div style={{
                                fontFamily: rfont.display, fontSize: 15, fontWeight: 700,
                                color: t.text, letterSpacing: '-0.02em',
                            }}>
                                Nexus-AID
                            </div>
                            <div style={{
                                fontFamily: rfont.body, fontSize: 10, fontWeight: 700,
                                color: rp.red500, textTransform: 'uppercase', letterSpacing: '0.1em',
                            }}>
                                Centre de Commande
                            </div>
                        </div>
                    </div>

                    {/* Theme toggle */}
                    <Tooltip title={isDark ? 'Mode clair' : 'Mode sombre'}>
                        <div
                            onClick={toggleTheme}
                            className="rd-action"
                            style={{
                                width: 32, height: 32, borderRadius: rr.sm,
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', fontSize: 14,
                                color: isDark ? rp.amb500 : rp.slate,
                            }}
                        >
                            {isDark ? <SunOutlined /> : <MoonOutlined />}
                        </div>
                    </Tooltip>
                </div>

                {/* ── Connection Status ── */}
                <div style={{
                    padding: '10px 20px',
                    borderBottom: `1px solid ${t.sidebarBorder}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isConnected
                        ? isDark ? 'rgba(22,163,74,0.06)' : 'rgba(22,163,74,0.04)'
                        : isDark ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.04)',
                }}>
                    <div
                        className={isConnected ? 'rd-pulse-live' : ''}
                        style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: isConnected ? rp.grn500 : rp.red500,
                            flexShrink: 0,
                        }}
                    />
                    <Text style={{ fontFamily: rfont.body, fontSize: 12, fontWeight: 600, color: isConnected ? rp.grn500 : rp.red500 }}>
                        {isConnected ? 'Télémétrie En Ligne' : 'Télémétrie Hors Ligne'}
                    </Text>
                </div>

                {/* ── Controls ── */}
                <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto' }} className="rd-scroll">

                    {/* Role label */}
                    <Text style={{
                        fontFamily: rfont.body, fontSize: 10, fontWeight: 700,
                        color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em',
                        display: 'block', marginBottom: 10,
                    }}>
                        Accès & Région
                    </Text>

                    {/* Role select */}
                    <div style={{ marginBottom: 14 }}>
                        <Text style={{
                            fontFamily: rfont.body, fontSize: 12, fontWeight: 600,
                            color: t.textSub, display: 'block', marginBottom: 6,
                        }}>
                            Niveau d'accès
                        </Text>
                        <Select
                            value={role}
                            onChange={(val: RoleType) => setRole(val)}
                            style={{ width: '100%' }}
                            className={!isDark ? 'rd-select-light' : ''}
                            options={[
                                { value: 'NATIONAL', label: '🏛️ Comité National' },
                                { value: 'REGIONAL', label: '📍 Comité Régional' },
                            ]}
                        />
                    </div>

                    {/* Wilaya select */}
                    <div style={{
                        opacity: role === 'NATIONAL' ? 0.45 : 1,
                        pointerEvents: role === 'NATIONAL' ? 'none' : 'auto',
                        transition: 'opacity 0.3s',
                        marginBottom: 20,
                    }}>
                        <Text style={{
                            fontFamily: rfont.body, fontSize: 12, fontWeight: 600,
                            color: t.textSub, display: 'block', marginBottom: 6,
                        }}>
                            Sélectionner Wilaya
                        </Text>
                        <Select
                            value={selectedWilaya}
                            onChange={setSelectedWilaya}
                            placeholder="— Choisir Wilaya —"
                            allowClear
                            showSearch
                            style={{ width: '100%' }}
                            className={!isDark ? 'rd-select-light' : ''}
                            options={wilayatNames.map(name => ({ value: name, label: name }))}
                        />
                    </div>

                    <Divider style={{ borderColor: t.divider, margin: '0 0 16px' }} />

                    {/* Navigation label */}
                    <Text style={{
                        fontFamily: rfont.body, fontSize: 10, fontWeight: 700,
                        color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em',
                        display: 'block', marginBottom: 8,
                    }}>
                        Navigation
                    </Text>

                    {/* Nav items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {navItems.map(item => {
                            const isActive = panel === item.key;
                            return (
                                <div
                                    key={item.key}
                                    className="rd-action"
                                    onClick={() => setPanel(item.key as CommandCenterPanel)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        borderRadius: rr.sm,
                                        background: isActive
                                            ? isDark ? `${rp.red500}18` : `${rp.red500}0E`
                                            : 'transparent',
                                        border: `1px solid ${isActive ? `${rp.red500}25` : 'transparent'}`,
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Space size={10}>
                                        <span style={{ color: isActive ? rp.red500 : t.textSub, fontSize: 16 }}>
                                            {item.icon}
                                        </span>
                                        <span style={{
                                            fontFamily: rfont.body, fontSize: 13, fontWeight: isActive ? 700 : 500,
                                            color: isActive ? (isDark ? '#F0F4FF' : rp.ink) : t.textSub,
                                        }}>
                                            {item.label}
                                        </span>
                                    </Space>
                                    {item.badge !== null && (
                                        <div style={{
                                            background: rp.red500,
                                            color: '#fff',
                                            borderRadius: rr.pill,
                                            padding: '1px 7px',
                                            fontSize: 11, fontWeight: 700,
                                            fontFamily: rfont.data,
                                            minWidth: 20, textAlign: 'center',
                                        }}>
                                            {item.badge}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Footer ── */}
                <div style={{
                    padding: '12px 20px',
                    borderTop: `1px solid ${t.sidebarBorder}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DatabaseOutlined style={{ color: t.textFaint, fontSize: 12 }} />
                        <Text style={{ fontFamily: rfont.body, fontSize: 11, color: t.textFaint }}>
                            Alimenté par <strong style={{ color: t.textSub }}>FastAPI</strong>
                        </Text>
                    </div>
                    <Badge
                        status={isConnected ? 'success' : 'error'}
                        text={
                            <Text style={{ fontFamily: rfont.body, fontSize: 11, color: t.textFaint }}>
                                {isConnected ? 'En direct' : 'Hors ligne'}
                            </Text>
                        }
                    />
                </div>
            </div>
        </Sider>
    );
}
