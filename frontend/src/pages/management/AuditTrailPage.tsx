// ============================================================
// NEXUS-AID — Hierarchical Audit Trail
// Complete 360° log of governance actions (National/Regional/Local)
// ============================================================

import { useState, useEffect } from 'react';
import { 
    Table, Tag, Button, Space, Typography, Card, 
    Input, message, Empty 
} from 'antd';
import { 
    AuditOutlined, SearchOutlined, 
    ReloadOutlined, HistoryOutlined,
    GlobalOutlined
} from '@ant-design/icons';
import committeeService from '@/services/committeeService';
import { useAuthStore } from '@/stores';

const { Title, Text } = Typography;

interface AuditLog {
    id: string;
    action: string;
    performedBy: string;
    targetCommitteeId: string;
    targetVolunteerId: string;
    reason: string;
    timestamp: string;
}

const AuditTrailPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [search, setSearch] = useState('');
    const user = useAuthStore((s) => s.user);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await committeeService.getAuditLogs();
            setLogs(data);
        } catch (err) {
            message.error('Erreur lors du chargement des journaux d\'audit.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = logs.filter(l => 
        l.action.toLowerCase().includes(search.toLowerCase()) || 
        l.reason?.toLowerCase().includes(search.toLowerCase())
    );

    const columns = [
        {
            title: 'Action',
            dataIndex: 'action',
            key: 'action',
            render: (action: string) => {
                let color = 'default';
                if (action.includes('PROPOSE')) color = 'blue';
                if (action.includes('APPROVE')) color = 'green';
                if (action.includes('REJECT')) color = 'red';
                if (action.includes('REVOKE')) color = 'orange';
                return <Tag color={color} style={{ borderRadius: 4, fontWeight: 600 }}>{action}</Tag>;
            },
        },
        {
            title: 'Par (ID)',
            dataIndex: 'performedBy',
            key: 'performedBy',
            render: (id: string) => <Text code>{id ? id.substring(0, 8) : 'System'}</Text>,
        },
        {
            title: 'Justification',
            dataIndex: 'reason',
            key: 'reason',
            ellipsis: true,
            render: (reason: string) => <Text style={{ fontSize: 13 }}>{reason || 'N/A'}</Text>,
        },
        {
            title: 'Date & Heure',
            dataIndex: 'timestamp',
            key: 'timestamp',
            sorter: (a: AuditLog, b: AuditLog) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            render: (date: string) => (
                <Space>
                    <HistoryOutlined style={{ fontSize: 12, color: '#999' }} />
                    <Text style={{ fontSize: 13 }}>{date ? new Date(date).toLocaleString() : 'Date inconnue'}</Text>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
            {/* Header with Gradient Card */}
            <div style={{
                background: 'linear-gradient(135deg, #C81E1E12, transparent)',
                borderRadius: 20, padding: '24px 28px', marginBottom: 24,
                border: '1px solid #C81E1E18',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: 'rgba(200, 30, 30, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, color: '#C81E1E'
                    }}>
                        <AuditOutlined />
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>Journal d'Audit Hiérarchique</Title>
                        <Text type="secondary">Traçabilité complète des actions de gouvernance</Text>
                    </div>
                </div>
                <Space>
                    <Tag icon={<GlobalOutlined />} color="blue" style={{ padding: '4px 12px', borderRadius: 8 }}>
                        {user?.type === 'ADMIN' ? 'Vision 360°' : 'Vision Hiérarchique'}
                    </Tag>
                    <Button icon={<ReloadOutlined />} onClick={fetchLogs} loading={loading}>
                        Actualiser
                    </Button>
                </Space>
            </div>

            <Card style={{ borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: 20 }}>
                    <Input 
                        placeholder="Rechercher une action ou un motif..." 
                        prefix={<SearchOutlined />} 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ width: '100%', maxWidth: 400, borderRadius: 10, height: 40 }}
                    />
                </div>

                <Table 
                    columns={columns} 
                    dataSource={filteredLogs} 
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 12 }}
                    locale={{ emptyText: <Empty description="Aucun log d'audit trouvé" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                />
            </Card>
        </div>
    );
};

export default AuditTrailPage;
