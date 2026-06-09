// ============================================================
// NEXUS-AID — Action Sociale Page (RESP_ACTION_SOCIALE)
// Tabbed layout: Cartographie | Registre | Analytique
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Card, Col, Row, Table, Tag, Typography, Space, Statistic, Button,
    Spin, Empty, Tabs, Input, Select, Badge,
} from 'antd';
import {
    HomeOutlined, PlusOutlined, TeamOutlined, HeartOutlined,
    EnvironmentOutlined, BarChartOutlined, UnorderedListOutlined,
    SearchOutlined, AlertOutlined, EyeOutlined, CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { socialService } from '@/services/domainServices';
import type { FamilyDTO, VulnerabilityScoreDTO } from '@/types';

// Sub-components
import SocialMap from './social/SocialMap';
import FamilyDetails from './social/FamilyDetails';
import ActionModal from './social/ActionModal';
import AddFamilyModal from './social/AddFamilyModal';
import SocialDashboard from './social/SocialDashboard';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'green', SUPPORTED: 'blue', ARCHIVED: 'default',
};

const NEED_COLORS: Record<string, string> = {
    MEDICAL: '#ef4444', FOOD: '#f59e0b', SHELTER: '#6366f1',
    CLOTHING: '#8b5cf6', FINANCIAL: '#10b981', EDUCATION: '#0ea5e9',
};

const SocialPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [families, setFamilies] = useState<FamilyDTO[]>([]);
    const [scores, setScores] = useState<Record<string, VulnerabilityScoreDTO>>({});
    const [activeTab, setActiveTab] = useState('registry');

    // Modal states
    const [selectedFamily, setSelectedFamily] = useState<FamilyDTO | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [addFamilyOpen, setAddFamilyOpen] = useState(false);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const loadFamilies = useCallback(async () => {
        setLoading(true);
        try {
            const data = await socialService.getFamilies();
            const fams = Array.isArray(data) ? data : [];
            setFamilies(fams);

            // Load scores for all families
            const scoreMap: Record<string, VulnerabilityScoreDTO> = {};
            await Promise.all(
                fams.filter(f => f.id).map(async (f) => {
                    try {
                        const sc = await socialService.getScore(f.id!);
                        if (sc) scoreMap[f.id!] = sc;
                    } catch { /* no score yet */ }
                })
            );
            setScores(scoreMap);
        } catch {
            setFamilies([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadFamilies(); }, [loadFamilies]);

    // Filtered families
    const filtered = families.filter(f => {
        const matchesSearch = !searchText ||
            f.familyName.toLowerCase().includes(searchText.toLowerCase()) ||
            f.headOfFamily.toLowerCase().includes(searchText.toLowerCase()) ||
            f.address?.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = !statusFilter || f.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleViewFamily = (family: FamilyDTO) => {
        setSelectedFamily(family);
        setDetailsOpen(true);
    };

    const handleAddAction = () => {
        setDetailsOpen(false);
        setActionModalOpen(true);
    };

    // ---- Table Columns ----
    const columns: ColumnsType<FamilyDTO> = [
        {
            title: 'Famille', dataIndex: 'familyName', key: 'familyName',
            sorter: (a, b) => a.familyName.localeCompare(b.familyName),
            render: (name: string, record) => (
                <div>
                    <Text strong>{name}</Text>
                    {record.urgentNeeds && record.urgentNeeds.length > 0 && (
                        <Badge dot status="error" style={{ marginLeft: 6 }} />
                    )}
                </div>
            ),
        },
        {
            title: 'Chef de famille', dataIndex: 'headOfFamily', key: 'headOfFamily',
        },
        {
            title: 'Membres', dataIndex: 'members', key: 'members', width: 100,
            sorter: (a, b) => a.members - b.members,
            render: (m: number) => <Tag bordered={false}><TeamOutlined /> {m}</Tag>,
        },
        {
            title: 'Besoins', key: 'needs', responsive: ['lg'] as any, width: 200,
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(record.needsType || []).slice(0, 3).map(n => (
                        <Tag key={n} bordered={false} style={{
                            fontSize: 10, padding: '0 6px',
                            background: `${NEED_COLORS[n] || '#6366f1'}15`,
                            color: NEED_COLORS[n] || '#6366f1',
                        }}>
                            {n}
                        </Tag>
                    ))}
                    {(record.needsType || []).length > 3 && (
                        <Tag bordered={false} style={{ fontSize: 10, padding: '0 6px' }}>
                            +{(record.needsType || []).length - 3}
                        </Tag>
                    )}
                </div>
            ),
        },
        {
            title: 'Score', key: 'score', width: 90,
            sorter: (a, b) => (scores[a.id!]?.score || 0) - (scores[b.id!]?.score || 0),
            render: (_, record) => {
                const sc = record.id ? scores[record.id] : undefined;
                if (!sc) return <Text type="secondary" style={{ fontSize: 11 }}>—</Text>;
                const color = sc.score >= 76 ? '#ef4444' : sc.score >= 51 ? '#f97316' : sc.score >= 26 ? '#f59e0b' : '#10b981';
                return (
                    <Tag bordered={false} style={{
                        fontWeight: 700, color,
                        background: `${color}15`,
                    }}>
                        {sc.score}/100
                    </Tag>
                );
            },
        },
        {
            title: 'Événements', key: 'events', responsive: ['xl'] as any, width: 160,
            render: (_, record) => (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(record.eventTags || []).slice(0, 2).map(t => (
                        <Tag key={t} bordered={false} style={{
                            fontSize: 10, background: '#f0f9ff', color: '#0369a1',
                        }}>
                            <CalendarOutlined /> {t}
                        </Tag>
                    ))}
                </div>
            ),
        },
        {
            title: 'Statut', dataIndex: 'status', key: 'status', width: 100,
            render: (s: string) => (
                <Tag color={STATUS_COLORS[s] || 'default'} bordered={false}>{s}</Tag>
            ),
        },
        {
            title: '', key: 'actions', width: 50,
            render: (_, record) => (
                <Button
                    type="text" size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewFamily(record)}
                    style={{ color: '#6366f1' }}
                />
            ),
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
                <Spin size="large" />
            </div>
        );
    }

    // ---- KPI Stats ----
    const urgentCount = families.filter(f => f.urgentNeeds && f.urgentNeeds.length > 0).length;
    const geoCount = families.filter(f => f.gpsCoordinates?.lat && f.gpsCoordinates?.lng).length;

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* ---- Header ---- */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">🏠 Action Sociale</Title>
                    <Text type="secondary">Gestion intelligente des familles et cas sociaux</Text>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    style={{ background: '#C81E1E', borderRadius: 8 }}
                    onClick={() => setAddFamilyOpen(true)}
                >
                    Enregistrer famille
                </Button>
            </div>

            {/* ---- KPI Cards ---- */}
            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { label: 'Familles', value: families.length, icon: <HomeOutlined />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                    { label: 'Membres total', value: (Array.isArray(families) ? families : []).reduce((s, f) => s + (f.members || 0), 0), icon: <HeartOutlined />, color: '#C81E1E', bg: 'rgba(200,30,30,0.1)' },
                    { label: 'Cas urgents', value: urgentCount, icon: <AlertOutlined />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                    { label: 'Géolocalisées', value: geoCount, icon: <EnvironmentOutlined />, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                ].map(kpi => (
                    <Col xs={12} md={6} key={kpi.label}>
                        <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: kpi.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: kpi.color, fontSize: 16,
                                }}>
                                    {kpi.icon}
                                </div>
                                <Statistic
                                    title={kpi.label}
                                    value={kpi.value}
                                    valueStyle={{ fontSize: 20, fontWeight: 700 }}
                                />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* ---- Tabbed Content ---- */}
            <Card styles={{ body: { padding: '0 20px 20px' } }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'registry',
                            label: (
                                <span><UnorderedListOutlined /> Registre ({families.length})</span>
                            ),
                            children: (
                                <div>
                                    {/* Filters */}
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                                        <Input
                                            placeholder="Rechercher par nom, chef, adresse..."
                                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                            value={searchText}
                                            onChange={e => setSearchText(e.target.value)}
                                            style={{ maxWidth: 320 }}
                                            allowClear
                                        />
                                        <Select
                                            placeholder="Filtrer par statut"
                                            value={statusFilter}
                                            onChange={setStatusFilter}
                                            allowClear
                                            style={{ minWidth: 160 }}
                                            options={[
                                                { value: 'ACTIVE', label: 'Active' },
                                                { value: 'SUPPORTED', label: 'Prise en charge' },
                                                { value: 'ARCHIVED', label: 'Archivée' },
                                            ]}
                                        />
                                    </div>
                                    {filtered.length > 0 ? (
                                        <Table
                                            columns={columns}
                                            dataSource={filtered}
                                            rowKey="id"
                                            size="middle"
                                            pagination={{ pageSize: 10, showSizeChanger: true }}
                                            onRow={(record) => ({
                                                onClick: () => handleViewFamily(record),
                                                style: { cursor: 'pointer' },
                                            })}
                                        />
                                    ) : (
                                        <Empty description="Aucune famille enregistrée" />
                                    )}
                                </div>
                            ),
                        },
                        {
                            key: 'map',
                            label: (
                                <span>
                                    <EnvironmentOutlined /> Cartographie
                                    {geoCount > 0 && (
                                        <Badge count={geoCount} style={{
                                            marginLeft: 6, background: '#6366f1',
                                            fontSize: 10, height: 18, lineHeight: '18px',
                                        }} />
                                    )}
                                </span>
                            ),
                            children: (
                                <SocialMap
                                    families={families}
                                    scores={scores}
                                    onViewFamily={handleViewFamily}
                                />
                            ),
                        },
                        {
                            key: 'analytics',
                            label: (
                                <span><BarChartOutlined /> Analytique</span>
                            ),
                            children: <SocialDashboard />,
                        },
                    ]}
                />
            </Card>

            {/* ---- Modals / Drawers ---- */}
            <FamilyDetails
                family={selectedFamily}
                open={detailsOpen}
                onClose={() => setDetailsOpen(false)}
                onAddAction={handleAddAction}
            />

            <ActionModal
                family={selectedFamily}
                open={actionModalOpen}
                onClose={() => setActionModalOpen(false)}
                onSuccess={loadFamilies}
            />

            <AddFamilyModal
                open={addFamilyOpen}
                onClose={() => setAddFamilyOpen(false)}
                onSuccess={loadFamilies}
            />
        </div>
    );
};

export default SocialPage;
