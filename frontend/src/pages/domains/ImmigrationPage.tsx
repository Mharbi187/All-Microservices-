// ============================================================
// NEXUS-AID — Immigration Page (RESP_IMMIGRATION)
// Migrant cases & family link cases
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Table, Tag, Typography, Space, Statistic, Button,
    Spin, Empty, Tabs,
} from 'antd';
import {
    GlobalOutlined, PlusOutlined, UserOutlined,
    LinkOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { immigrationService } from '@/services/domainServices';
import type { MigrantCaseDTO, FamilyLinkCaseDTO } from '@/types';

const { Title, Text } = Typography;

const ImmigrationPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState<MigrantCaseDTO[]>([]);
    const [familyLinks, setFamilyLinks] = useState<FamilyLinkCaseDTO[]>([]);

    useEffect(() => {
        Promise.all([
            immigrationService.getCases().catch(() => []),
            immigrationService.getFamilyLinks().catch(() => []),
        ]).then(([c, fl]) => { setCases(c); setFamilyLinks(fl); })
            .finally(() => setLoading(false));
    }, []);

    const caseColumns: ColumnsType<MigrantCaseDTO> = [
        { title: 'Nom', dataIndex: 'fullName', key: 'fullName', render: (n: string) => <Text strong>{n}</Text> },
        { title: 'Nationalité', dataIndex: 'nationality', key: 'nationality', render: (n: string) => <Tag bordered={false}>{n}</Tag> },
        { title: 'Arrivée', dataIndex: 'arrivalDate', key: 'arrivalDate', render: (d: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—' },
        { title: 'Situation', dataIndex: 'legalSituation', key: 'legalSituation', responsive: ['md'] as any },
        { title: 'Hébergement', dataIndex: 'accommodationType', key: 'accommodationType', responsive: ['lg'] as any },
    ];

    const linkColumns: ColumnsType<FamilyLinkCaseDTO> = [
        { title: 'ID', dataIndex: 'id', key: 'id', render: (id: string) => <Text style={{ fontSize: 12 }}>{id?.substring(0, 8)}...</Text> },
        { title: 'Statut', dataIndex: 'status', key: 'status', render: (s: string) => <Tag color={s === 'RESOLVED' ? 'green' : 'orange'} bordered={false}>{s || 'En cours'}</Tag> },
    ];

    if (loading) return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><Spin size="large" /></div>;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div><Title level={3} className="!mb-1">🌍 Immigration</Title><Text type="secondary">Cas de migrants et reconstitution de liens familiaux</Text></div>
                <Button type="primary" icon={<PlusOutlined />} style={{ background: '#C81E1E' }}>Nouveau cas</Button>
            </div>
            <Row gutter={[12, 12]} className="mb-5">
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', fontSize: 16 }}><UserOutlined /></div><Statistic title="Cas migrants" value={cases.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
                <Col xs={12} md={6}><Card size="small" styles={{ body: { padding: '14px 18px' } }}><div className="flex items-center gap-3"><div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 16 }}><LinkOutlined /></div><Statistic title="Liens familiaux" value={familyLinks.length} valueStyle={{ fontSize: 20, fontWeight: 700 }} /></div></Card></Col>
            </Row>
            <Card>
                <Tabs items={[
                    { key: 'cases', label: <><UserOutlined /> Cas de migrants</>, children: cases.length > 0 ? <Table columns={caseColumns} dataSource={cases} rowKey="id" size="middle" /> : <Empty description="Aucun cas" /> },
                    { key: 'links', label: <><LinkOutlined /> Liens familiaux (RLF)</>, children: familyLinks.length > 0 ? <Table columns={linkColumns} dataSource={familyLinks} rowKey="id" size="middle" /> : <Empty description="Aucun cas RLF" /> },
                ]} />
            </Card>
        </div>
    );
};

export default ImmigrationPage;
