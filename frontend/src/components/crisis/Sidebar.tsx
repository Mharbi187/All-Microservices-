import { Layout, Select, Menu, Badge, Typography, Space, Divider } from 'antd';
import { RadarChartOutlined, FileTextOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useCommandCenter } from '@/stores/commandCenterStore';
import type { RoleType } from '@/types';

const { Sider } = Layout;
const { Text, Title } = Typography;

interface SidebarProps {
    wilayatNames: string[];
    isConnected: boolean;
}

export default function Sidebar({ wilayatNames, isConnected }: SidebarProps) {
    const { role, selectedWilaya, setRole, setSelectedWilaya } = useCommandCenter();

    return (
        <Sider
            width={280}
            style={{
                background: '#1e293b',
                borderRight: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                overflow: 'hidden',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Brand Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 40, height: 40, borderRadius: 10, background: '#ef4444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
                    }}>
                        <ThunderboltOutlined style={{ color: '#fff', fontSize: 18 }} />
                    </div>
                    <div>
                        <Title level={5} style={{ color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Nexus-AID</Title>
                        <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Command Center</Text>
                    </div>
                </div>

                {/* Controls */}
                <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Role & Region</Text>

                    <div style={{ marginTop: 12 }}>
                        <Text style={{ color: '#cbd5e1', fontSize: 13, display: 'block', marginBottom: 6 }}>Access Level</Text>
                        <Select
                            value={role}
                            onChange={(val: RoleType) => setRole(val)}
                            style={{ width: '100%' }}
                            options={[
                                { value: 'NATIONAL', label: '🏛️ Comité National' },
                                { value: 'REGIONAL', label: '📍 Comité Régional' },
                            ]}
                        />
                    </div>

                    <div style={{ marginTop: 16, opacity: role === 'NATIONAL' ? 0.4 : 1, pointerEvents: role === 'NATIONAL' ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
                        <Text style={{ color: '#cbd5e1', fontSize: 13, display: 'block', marginBottom: 6 }}>Select Wilaya</Text>
                        <Select
                            value={selectedWilaya}
                            onChange={setSelectedWilaya}
                            placeholder="— Choose Wilaya —"
                            allowClear
                            showSearch
                            style={{ width: '100%' }}
                            options={wilayatNames.map(name => ({ value: name, label: name }))}
                        />
                    </div>

                    <Divider style={{ borderColor: '#334155', margin: '24px 0 12px' }} />

                    <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Navigation</Text>
                    <Menu
                        mode="inline"
                        selectedKeys={['radar']}
                        style={{ background: 'transparent', border: 'none', marginTop: 8 }}
                        items={[
                            { key: 'radar', icon: <RadarChartOutlined />, label: 'Live Radar' },
                            { key: 'incidents', icon: <FileTextOutlined />, label: 'Incident Log', disabled: true },
                            { key: 'responders', icon: <TeamOutlined />, label: 'Responders', disabled: true },
                        ]}
                    />
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 24px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                        Powered by <Text strong style={{ color: '#cbd5e1', fontSize: 12 }}>FastAPI</Text>
                    </Text>
                    <Space size={6}>
                        <Badge status={isConnected ? 'success' : 'error'} />
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>{isConnected ? 'Live' : 'Offline'}</Text>
                    </Space>
                </div>
            </div>
        </Sider>
    );
}
