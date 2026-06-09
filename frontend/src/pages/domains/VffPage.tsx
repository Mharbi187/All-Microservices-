// ============================================================
// NEXUS-AID — VFF Page (RESP_VFF)
// Victim cases, support paths, protection campaigns
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Table, Tag, Typography, Space, Statistic, Button,
    Spin, Empty, Tabs,
} from 'antd';
import {
    SafetyOutlined, PlusOutlined, WarningOutlined,
    NotificationOutlined, HeartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { vffService } from '@/services/domainServices';
import type { VictimCaseDTO, ProtectionCampaignDTO } from '@/types';

const { Title, Text } = Typography;

const riskColors: Record<string, string> = { HIGH: 'red', MEDIUM: 'orange', LOW: 'blue', CRITICAL: 'magenta' };

const VffPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState<VictimCaseDTO[]>([]);
    const [campaigns, setCampaigns] = useState<ProtectionCampaignDTO[]>([]);

    useEffect(() => {
        Promise.all([
            vffService.getCases().catch(() => []),
            vffService.getCampaigns().catch(() => []),
        ]).then(([c, cam]) => { setCases(c); setCampaigns(cam); })
            .finally(() => setLoading(false));
    }, []);

    const caseColumns: ColumnsType<VictimCaseDTO> = [
        { title: 'Type de victime', dataIndex: 'victimType', key: 'victimType', render: (t: string) => <Tag bordered={false}>{t === 'WOMAN' ? '👩 Femme' : t === 'CHILD' ? '👶 Enfant' : t}</Tag> },
        { title: 'Type d\'incident', dataIndex: 'incidentType', key: 'incidentType', render: (t: string) => <Text>{t?.replace(/_/g, ' ')}</Text> },
        { title: 'Date', dataIndex: 'incidentDate', key: 'incidentDate', render: (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—' },
        { title: 'Risque', dataIndex: 'riskLevel', key: 'riskLevel', render: (r: string) => <Tag color={riskColors[r] || 'default'} bordered={false}>{r}</Tag> },
        { title: 'Confidentiel', dataIndex: 'isConfidential', key: 'isConfidential', render: (c: boolean) => c ? <Tag color="red" bordered={false}>🔒 Oui</Tag> : <Tag bordered={false}>Non</Tag> },
    ];

    const camColumns: ColumnsType<ProtectionCampaignDTO> = [
        { title: 'Campagne', key: 'name', render: (_, r) => <Text strong>{r.name || '—'}</Text> },
        { title: 'Description', dataIndex: 'description', key: 'description', render: (d: string) => <Text style={{ fontSize: 12 }}>{d?.substring(0, 80) || '—'}</Text>, responsive: ['md'] as any },
        { title: 'Statut', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color="blue" bordered={false}>{s || '—'}</Tag> },
    ];

    if (loading) return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><Spin size="large" /></div>;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div><Title level={3} className="!mb-1">🛡️ VFF — Violence Femmes & Enfants</Title><Text type="secondary">Cas de victimes et campagnes de protection</Text></div>
                <Button type="primary" icon={<PlusOutlined />} style={{ background: '#C81E1E' }}>Signaler un cas</Button>
            </div>
            <Row gutter={[12, 12]} className="mb-5">
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 16 }}><WarningOutlined /></div><Statistic title="Cas signalés" value={cases.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontSize: 16 }}><NotificationOutlined /></div><Statistic title="Campagnes" value={campaigns.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
            </Row>
            <Card>
                <Tabs items={[
                    { key: 'cases', label: <><WarningOutlined /> Cas de victimes</>, children: cases.length > 0 ? <Table columns={caseColumns} dataSource={cases} rowKey="id" size="middle" /> : <Empty description="Aucun cas" /> },
                    { key: 'campaigns', label: <><NotificationOutlined /> Campagnes</>, children: campaigns.length > 0 ? <Table columns={camColumns} dataSource={campaigns} rowKey="id" size="middle" /> : <Empty description="Aucune campagne" /> },
                ]} />
            </Card>
        </div>
    );
};

export default VffPage;
