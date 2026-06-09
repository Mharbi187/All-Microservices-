// ============================================================
// NEXUS-AID — Donations Page
// Donation tracking with KPIs, table, and status tags
// ============================================================

import { useState } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Select, Typography, Space,
    Statistic, Button, Dropdown, Avatar,
} from 'antd';
import {
    GiftOutlined, SearchOutlined, FilterOutlined, PlusOutlined,
    DownloadOutlined, MoreOutlined, EyeOutlined, EditOutlined,
    CheckCircleOutlined, ClockCircleOutlined, FilePdfOutlined,
    DollarOutlined, UserOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface DonationData {
    key: string;
    donor: string;
    amount: number;
    type: 'monetary' | 'material';
    description: string;
    status: 'pending' | 'confirmed' | 'receipted';
    date: string;
}

const donations: DonationData[] = [
    { key: '1', donor: 'Société ABC Tunisie', amount: 5000, type: 'monetary', description: 'Don annuel entreprise', status: 'receipted', date: '2024-01-20' },
    { key: '2', donor: 'Ahmed Khelifi', amount: 500, type: 'monetary', description: 'Don personnel', status: 'confirmed', date: '2024-01-18' },
    { key: '3', donor: 'Pharmacie Centrale', amount: 2500, type: 'material', description: '200 kits premiers secours', status: 'receipted', date: '2024-01-15' },
    { key: '4', donor: 'Fondation Solidarité', amount: 15000, type: 'monetary', description: 'Programme jeunesse 2024', status: 'confirmed', date: '2024-01-12' },
    { key: '5', donor: 'Carrefour Tunisie', amount: 3200, type: 'material', description: 'Colis alimentaires (150)', status: 'pending', date: '2024-01-10' },
    { key: '6', donor: 'Mme Sonia Trabelsi', amount: 200, type: 'monetary', description: 'Don mensuel', status: 'receipted', date: '2024-01-08' },
    { key: '7', donor: 'Orange Tunisie', amount: 8000, type: 'monetary', description: 'Sponsoring caravane médicale', status: 'pending', date: '2024-01-05' },
];

const statusCfg = {
    pending: { color: 'orange', text: 'En attente', icon: <ClockCircleOutlined /> },
    confirmed: { color: 'blue', text: 'Confirmé', icon: <CheckCircleOutlined /> },
    receipted: { color: 'green', text: 'Reçu fiscal', icon: <FilePdfOutlined /> },
};

const DonationsPage: React.FC = () => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const totalAmount = donations.reduce((s, d) => s + d.amount, 0);
    const filtered = donations.filter(d => {
        const matchSearch = !search || d.donor.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || d.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const columns: ColumnsType<DonationData> = [
        {
            title: 'Donateur',
            dataIndex: 'donor',
            key: 'donor',
            render: (name: string, r) => (
                <Space>
                    <Avatar style={{ backgroundColor: r.type === 'monetary' ? '#16a34a' : '#6366f1' }} size={32}>
                        {r.type === 'monetary' ? <DollarOutlined /> : <GiftOutlined />}
                    </Avatar>
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{name}</Text>
                        <div><Text style={{ fontSize: 11, color: '#999' }}>{r.description}</Text></div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Montant',
            dataIndex: 'amount',
            key: 'amount',
            sorter: (a, b) => a.amount - b.amount,
            render: (a: number) => <Text strong style={{ fontSize: 14 }}>{a.toLocaleString('fr-FR')} TND</Text>,
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (t: string) => <Tag color={t === 'monetary' ? 'green' : 'purple'} bordered={false}>{t === 'monetary' ? '💰 Financier' : '📦 Matériel'}</Tag>,
            responsive: ['md'],
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s: 'pending' | 'confirmed' | 'receipted') => {
                const cfg = statusCfg[s];
                return <Tag icon={cfg.icon} color={cfg.color} bordered={false}>{cfg.text}</Tag>;
            },
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            render: (d: string) => <Text style={{ fontSize: 12, color: '#888' }}>{new Date(d).toLocaleDateString('fr-FR')}</Text>,
            responsive: ['lg'],
        },
        {
            title: '',
            key: 'actions',
            width: 48,
            render: () => (
                <Dropdown menu={{
                    items: [
                        { key: 'view', icon: <EyeOutlined />, label: 'Détails' },
                        { key: 'edit', icon: <EditOutlined />, label: 'Modifier' },
                        { key: 'receipt', icon: <FilePdfOutlined />, label: 'Générer reçu' },
                    ]
                }} trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined />} size="small" />
                </Dropdown>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">{t('nav.donations')}</Title>
                    <Text type="secondary">Suivi des donations et génération de reçus fiscaux</Text>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />}>Exporter</Button>
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: '#C81E1E' }}>Enregistrer</Button>
                </Space>
            </div>

            {/* Stats */}
            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { title: 'Total ce mois', value: totalAmount, suffix: ' TND', icon: <GiftOutlined />, color: '#C81E1E' },
                    { title: 'Donateurs', value: donations.length, icon: <UserOutlined />, color: '#6366f1' },
                    { title: 'Reçus générés', value: donations.filter(d => d.status === 'receipted').length, icon: <FilePdfOutlined />, color: '#16a34a' },
                    { title: 'En attente', value: donations.filter(d => d.status === 'pending').length, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                ].map((s) => (
                    <Col xs={12} md={6} key={s.title}>
                        <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 16 }}>
                                    {s.icon}
                                </div>
                                <Statistic title={s.title} value={s.value} suffix={s.suffix} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Table */}
            <Card styles={{ body: { padding: '16px 20px' } }}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Input prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="Rechercher un donateur..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
                    <Select placeholder="Statut" allowClear style={{ width: 160 }} value={statusFilter} onChange={setStatusFilter} suffixIcon={<FilterOutlined />}
                        options={[
                            { value: 'pending', label: '⏳ En attente' },
                            { value: 'confirmed', label: '✅ Confirmé' },
                            { value: 'receipted', label: '📄 Reçu fiscal' },
                        ]}
                    />
                    <Text style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>{filtered.length} donation{filtered.length > 1 ? 's' : ''}</Text>
                </div>
                <Table columns={columns} dataSource={filtered} pagination={{ pageSize: 10, showTotal: (total) => `${total} donations` }} size="middle" scroll={{ x: 600 }} />
            </Card>
        </div>
    );
};

export default DonationsPage;
