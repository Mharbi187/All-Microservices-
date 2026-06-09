// ============================================================
// NEXUS-AID — Secourisme Page (RESP_SECOURISME)
// Rescue equipment & planned devices
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Typography, Space,
    Statistic, Button, Spin, Empty, Tabs,
} from 'antd';
import {
    MedicineBoxOutlined, SearchOutlined, PlusOutlined,
    ToolOutlined, CalendarOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores';
import { secourismeService } from '@/services/domainServices';
import type { RescueEquipmentDTO, RescueDeviceDTO } from '@/types';

const { Title, Text } = Typography;

const SecourismePage: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const [loading, setLoading] = useState(true);
    const [equipment, setEquipment] = useState<RescueEquipmentDTO[]>([]);
    const [devices, setDevices] = useState<RescueDeviceDTO[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!user?.committeeId) { setLoading(false); return; }
        Promise.all([
            secourismeService.getEquipment(user.committeeId).catch(() => []),
            secourismeService.getDevices(user.committeeId).catch(() => []),
        ]).then(([eq, dv]) => {
            setEquipment(eq);
            setDevices(dv);
        }).finally(() => setLoading(false));
    }, [user?.committeeId]);

    const eqColumns: ColumnsType<RescueEquipmentDTO> = [
        { title: 'Équipement', dataIndex: 'name', key: 'name', render: (n: string) => <Text strong>{n || '—'}</Text> },
        { title: 'Type', dataIndex: 'type', key: 'type', render: (t: string) => <Tag bordered={false}>{t || '—'}</Tag> },
        { title: 'Quantité', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Statut', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'OPERATIONAL' ? 'green' : 'orange'} bordered={false}>{s || '—'}</Tag> },
    ];

    const dvColumns: ColumnsType<RescueDeviceDTO> = [
        { title: 'Événement', dataIndex: 'eventName', key: 'eventName', render: (n: string) => <Text strong>{n}</Text> },
        { title: 'Date', dataIndex: 'eventDate', key: 'eventDate', render: (d: string) => <Text style={{ fontSize: 12 }}>{d ? new Date(d).toLocaleDateString('fr-FR') : '—'}</Text> },
        { title: 'Lieu', dataIndex: 'location', key: 'location', responsive: ['md'] as any },
        { title: 'Secouristes', dataIndex: 'requiredRescuers', key: 'requiredRescuers', render: (n: number) => <Tag bordered={false}><TeamOutlined /> {n}</Tag> },
        { title: 'Statut', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'PLANNED' ? 'blue' : s === 'ACTIVE' ? 'green' : 'default'} bordered={false}>{s || '—'}</Tag> },
    ];

    if (loading) return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><Spin size="large" /></div>;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">🚑 Secourisme</Title>
                    <Text type="secondary">Équipements et dispositifs prévisionnels</Text>
                </div>
                <Button type="primary" icon={<PlusOutlined />} style={{ background: '#C81E1E' }}>Ajouter</Button>
            </div>

            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { title: 'Équipements', value: equipment.length, icon: <ToolOutlined />, color: '#C81E1E' },
                    { title: 'Dispositifs', value: devices.length, icon: <CalendarOutlined />, color: '#6366f1' },
                ].map((s) => (
                    <Col xs={12} md={6} key={s.title}>
                        <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 16 }}>{s.icon}</div>
                                <Statistic title={s.title} value={s.value} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Card>
                <Tabs items={[
                    { key: 'equipment', label: <><ToolOutlined /> Équipements</>, children: equipment.length > 0 ? <Table columns={eqColumns} dataSource={equipment} rowKey="id" size="middle" pagination={{ pageSize: 10 }} /> : <Empty description="Aucun équipement" /> },
                    { key: 'devices', label: <><CalendarOutlined /> Dispositifs</>, children: devices.length > 0 ? <Table columns={dvColumns} dataSource={devices} rowKey="id" size="middle" pagination={{ pageSize: 10 }} /> : <Empty description="Aucun dispositif" /> },
                ]} />
            </Card>
        </div>
    );
};

export default SecourismePage;
