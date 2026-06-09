// ============================================================
// NEXUS-AID — Diffusion Page (RESP_DIFFUSION)
// Educational resources & awareness campaigns
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Table, Tag, Typography, Space, Statistic, Button,
    Spin, Empty, Tabs,
} from 'antd';
import {
    SoundOutlined, PlusOutlined, BookOutlined,
    VideoCameraOutlined, FileTextOutlined, NotificationOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { diffusionService } from '@/services/domainServices';
import type { EducationalResourceDTO, AwarenessCampaignDTO } from '@/types';

const { Title, Text } = Typography;

const DiffusionPage: React.FC = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState<EducationalResourceDTO[]>([]);
    const [campaigns, setCampaigns] = useState<AwarenessCampaignDTO[]>([]);

    useEffect(() => {
        Promise.all([
            diffusionService.getResources().catch(() => []),
            diffusionService.getCampaigns().catch(() => []),
        ]).then(([res, cam]) => { setResources(res); setCampaigns(cam); })
            .finally(() => setLoading(false));
    }, []);

    const resColumns: ColumnsType<EducationalResourceDTO> = [
        { title: 'Titre', dataIndex: 'title', key: 'title', render: (t: string) => <Text strong>{t}</Text> },
        { title: 'Catégorie', dataIndex: 'category', key: 'category', render: (c: string) => <Tag bordered={false}>{c}</Tag> },
        { title: 'Type', dataIndex: 'contentType', key: 'contentType', render: (ct: string) => <Tag icon={ct === 'VIDEO' ? <VideoCameraOutlined /> : <FileTextOutlined />} bordered={false} color={ct === 'VIDEO' ? 'blue' : 'green'}>{ct}</Tag> },
        { title: 'Langue', dataIndex: 'language', key: 'language', render: (l: string) => <Tag bordered={false}>{l}</Tag>, responsive: ['md'] as any },
    ];

    const camColumns: ColumnsType<AwarenessCampaignDTO> = [
        { title: 'Campagne', key: 'name', render: (_, r) => <Text strong>{r.name || r.title || '—'}</Text> },
        { title: 'Début', dataIndex: 'startDate', key: 'startDate', render: (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—' },
        { title: 'Fin', dataIndex: 'endDate', key: 'endDate', render: (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—', responsive: ['md'] as any },
        { title: 'Statut', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'ACTIVE' ? 'green' : 'blue'} bordered={false}>{s || '—'}</Tag> },
    ];

    if (loading) return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><Spin size="large" /></div>;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div><Title level={3} className="!mb-1">📢 Diffusion</Title><Text type="secondary">Ressources éducatives et campagnes de sensibilisation</Text></div>
                <Button type="primary" icon={<PlusOutlined />} style={{ background: '#C81E1E' }}>Ajouter</Button>
            </div>
            <Row gutter={[12, 12]} className="mb-5">
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', fontSize: 16 }}><BookOutlined /></div><Statistic title="Ressources" value={resources.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 16 }}><NotificationOutlined /></div><Statistic title="Campagnes" value={campaigns.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
            </Row>
            <Card>
                <Tabs items={[
                    { key: 'resources', label: <><BookOutlined /> Ressources</>, children: resources.length > 0 ? <Table columns={resColumns} dataSource={resources} rowKey="id" size="middle" pagination={{ pageSize: 10 }} /> : <Empty description="Aucune ressource" /> },
                    { key: 'campaigns', label: <><NotificationOutlined /> Campagnes</>, children: campaigns.length > 0 ? <Table columns={camColumns} dataSource={campaigns} rowKey="id" size="middle" pagination={{ pageSize: 10 }} /> : <Empty description="Aucune campagne" /> },
                ]} />
            </Card>
        </div>
    );
};

export default DiffusionPage;
