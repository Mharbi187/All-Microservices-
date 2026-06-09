// ============================================================
// NEXUS-AID — Santé Page (RESP_SANTE)
// Health actions & blood donations
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Table, Tag, Typography, Space, Statistic, Button,
    Spin, Empty, Tabs,
} from 'antd';
import {
    HeartOutlined, PlusOutlined, MedicineBoxOutlined,
    ExperimentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores';
import { santeService } from '@/services/domainServices';
import type { HealthActionDTO, BloodDonationDTO } from '@/types';

const { Title, Text } = Typography;

const SantePage: React.FC = () => {
    const user = useAuthStore((s) => s.user);
    const [loading, setLoading] = useState(true);
    const [actions, setActions] = useState<HealthActionDTO[]>([]);
    const [donations, setDonations] = useState<BloodDonationDTO[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const acts = user?.committeeId ? await santeService.getActions(user.committeeId).catch(() => []) : [];
            const dons = await santeService.getBloodDonations().catch(() => []);
            setActions(acts);
            setDonations(dons);
            setLoading(false);
        };
        fetchData();
    }, [user?.committeeId]);

    const actColumns: ColumnsType<HealthActionDTO> = [
        { title: 'Action', key: 'title', render: (_, r) => <Text strong>{r.title || r.type || '—'}</Text> },
        { title: 'Date', dataIndex: 'date', key: 'date', render: (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—' },
    ];

    const donColumns: ColumnsType<BloodDonationDTO> = [
        { title: 'Groupe sanguin', dataIndex: 'bloodType', key: 'bloodType', render: (t: string) => <Tag color="red" bordered={false}>{t}</Tag> },
        { title: 'Date', dataIndex: 'donationDate', key: 'donationDate', render: (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—' },
        { title: 'Centre', dataIndex: 'collectionCenter', key: 'collectionCenter', responsive: ['md'] as any },
        { title: 'Zone', dataIndex: 'zone', key: 'zone', responsive: ['lg'] as any },
        { title: 'Quantité (ml)', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Statut', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'ACCEPTED' ? 'green' : 'orange'} bordered={false}>{s || '—'}</Tag> },
    ];

    if (loading) return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><Spin size="large" /></div>;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div><Title level={3} className="!mb-1">🏥 Santé</Title><Text type="secondary">Actions sanitaires et dons de sang</Text></div>
                <Button type="primary" icon={<PlusOutlined />} style={{ background: '#C81E1E' }}>Ajouter</Button>
            </div>
            <Row gutter={[12, 12]} className="mb-5">
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', fontSize: 16 }}><MedicineBoxOutlined /></div><Statistic title="Actions" value={actions.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(200,30,30,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C81E1E', fontSize: 16 }}><ExperimentOutlined /></div><Statistic title="Dons de sang" value={donations.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
            </Row>
            <Card>
                <Tabs items={[
                    { key: 'actions', label: <><MedicineBoxOutlined /> Actions sanitaires</>, children: actions.length > 0 ? <Table columns={actColumns} dataSource={actions} rowKey="id" size="middle" /> : <Empty description="Aucune action" /> },
                    { key: 'donations', label: <><ExperimentOutlined /> Dons de sang</>, children: donations.length > 0 ? <Table columns={donColumns} dataSource={donations} rowKey="id" size="middle" /> : <Empty description="Aucun don" /> },
                ]} />
            </Card>
        </div>
    );
};

export default SantePage;
