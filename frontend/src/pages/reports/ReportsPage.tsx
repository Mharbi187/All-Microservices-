// ============================================================
// NEXUS-AID — Reports Page
// Real API data for monthly reports
// ============================================================

import { useState, useEffect } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Select, Typography, Space,
    Statistic, Button, Dropdown, Spin, Empty, message,
} from 'antd';
import {
    FileTextOutlined, SearchOutlined, FilterOutlined, PlusOutlined,
    DownloadOutlined, MoreOutlined, EyeOutlined, EditOutlined,
    DeleteOutlined, CheckCircleOutlined, ClockCircleOutlined,
    SendOutlined, FilePdfOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores';
import reportService from '@/services/reportService';
import type { MonthlyReportDTO } from '@/types';

const { Title, Text } = Typography;

const statusCfg: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    DRAFT: { color: 'default', text: 'Brouillon', icon: <EditOutlined /> },
    VALIDATED: { color: 'blue', text: 'Validé', icon: <CheckCircleOutlined /> },
    FINALIZED: { color: 'green', text: 'Finalisé', icon: <FilePdfOutlined /> },
};

const ReportsPage: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<MonthlyReportDTO[]>([]);

    const fetchData = async () => {
        if (!user?.committeeId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await reportService.getByCommittee(user.committeeId);
            setReports(Array.isArray(data) ? data : []);
        } catch {
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user?.committeeId]);

    const handleValidate = async (id: string) => {
        try {
            await reportService.validate(id);
            message.success('Rapport validé');
            fetchData();
        } catch {
            message.error('Erreur lors de la validation');
        }
    };

    const handleFinalize = async (id: string) => {
        try {
            await reportService.finalize(id);
            message.success('Rapport finalisé');
            fetchData();
        } catch {
            message.error('Erreur lors de la finalisation');
        }
    };

    const safeReports = Array.isArray(reports) ? reports : [];
    const filtered = safeReports.filter(r => {
        const matchSearch = !search || r.period?.toLowerCase().includes(search.toLowerCase()) || r.committeeName?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || r.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const columns: ColumnsType<MonthlyReportDTO> = [
        {
            title: 'Rapport',
            key: 'title',
            render: (_, r) => (
                <Space>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileTextOutlined style={{ color: '#6366f1' }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 13 }}>Rapport — {r.period}</Text>
                        <div><Text style={{ fontSize: 11, color: '#999' }}>{r.committeeName || 'Comité'}</Text></div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => {
                const cfg = statusCfg[s] || { color: 'default', text: s, icon: null };
                return <Tag icon={cfg.icon} color={cfg.color} bordered={false}>{cfg.text}</Tag>;
            },
        },
        {
            title: 'Dernière modification',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
            render: (d: string) => <Text style={{ fontSize: 12, color: '#888' }}>{d ? new Date(d).toLocaleDateString('fr-FR') : '—'}</Text>,
            responsive: ['lg'],
        },
        {
            title: '',
            key: 'actions',
            width: 48,
            render: (_, r) => (
                <Dropdown menu={{
                    items: [
                        { key: 'view', icon: <EyeOutlined />, label: 'Consulter' },
                        ...(r.status === 'DRAFT' ? [{ key: 'validate', icon: <CheckCircleOutlined />, label: 'Valider', onClick: () => handleValidate(r.id) }] : []),
                        ...(r.status === 'VALIDATED' ? [{ key: 'finalize', icon: <FilePdfOutlined />, label: 'Finaliser', onClick: () => handleFinalize(r.id) }] : []),
                        { key: 'pdf', icon: <FilePdfOutlined />, label: 'Exporter PDF' },
                    ]
                }} trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined />} size="small" />
                </Dropdown>
            ),
        },
    ];

    const drafts = safeReports.filter(r => r.status === 'DRAFT').length;
    const validated = safeReports.filter(r => r.status === 'VALIDATED').length;
    const finalized = safeReports.filter(r => r.status === 'FINALIZED').length;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">{t('nav.reports')}</Title>
                    <Text type="secondary">Rapports mensuels — {user?.committeeName || 'Comité'}</Text>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />}>Exporter</Button>
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: '#C81E1E' }}>Créer rapport</Button>
                </Space>
            </div>

            {/* Stats */}
            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { title: 'Total rapports', value: safeReports.length, icon: <FileTextOutlined />, color: '#6366f1' },
                    { title: 'Finalisés', value: finalized, icon: <FilePdfOutlined />, color: '#16a34a' },
                    { title: 'Validés', value: validated, icon: <CheckCircleOutlined />, color: '#0ea5e9' },
                    { title: 'Brouillons', value: drafts, icon: <EditOutlined />, color: '#888' },
                ].map((s) => (
                    <Col xs={12} md={6} key={s.title}>
                        <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 16 }}>
                                    {s.icon}
                                </div>
                                <Statistic title={s.title} value={s.value} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Table */}
            <Card styles={{ body: { padding: '16px 20px' } }}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Input prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="Rechercher un rapport..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
                    <Select placeholder="Statut" allowClear style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter}
                        options={Object.entries(statusCfg).map(([k, v]) => ({ value: k, label: v.text }))}
                    />
                    <Text style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>{filtered.length} rapport{filtered.length > 1 ? 's' : ''}</Text>
                </div>
                {loading ? (
                    <div className="flex justify-center py-12"><Spin size="large" /></div>
                ) : filtered.length > 0 ? (
                    <Table columns={columns} dataSource={filtered} rowKey="id" pagination={{ pageSize: 10 }} size="middle" scroll={{ x: 600 }} />
                ) : (
                    <Empty description="Aucun rapport" />
                )}
            </Card>
        </div>
    );
};

export default ReportsPage;
