// ============================================================
// NEXUS-AID — Volunteers Page (Complete)
// Full volunteer management: multi-committee view, approve/reject/promote
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Select, Typography, Space,
    Statistic, Button, Avatar, message, Popconfirm, Spin, Empty,
    Modal, Form, Tabs, Descriptions, Tooltip, Badge, Drawer,
} from 'antd';
import {
    TeamOutlined, SearchOutlined, FilterOutlined,
    DownloadOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ClockCircleOutlined, UserOutlined,
    StarOutlined, EyeOutlined, ApartmentOutlined,
    ReloadOutlined, StopOutlined, IdcardOutlined,
    FieldTimeOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores';
import volunteerService from '@/services/volunteerService';
import type { CommitteeOverview } from '@/types';

const { Title, Text } = Typography;

// Backend Volunteer entity response shape
interface VolunteerRecord {
    id: string;
    email: string;
    fullName: string;
    cin?: string;
    phone?: string;
    type: string;
    accountStatus: string;
    matricule?: string;
    skills?: string;
    dateAdhesion?: string;
    hoursVolunteered?: number;
    committeeId?: string;
    trainingProgress?: string;
}

const statusCfg: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    APPROVED: { color: 'green', text: 'Approuvé', icon: <CheckCircleOutlined /> },
    PENDING: { color: 'orange', text: 'En attente', icon: <ClockCircleOutlined /> },
    REJECTED: { color: 'red', text: 'Rejeté', icon: <CloseCircleOutlined /> },
    SUSPENDED: { color: 'default', text: 'Suspendu', icon: <StopOutlined /> },
};

// Parse skills safely
const parseSkills = (s?: string): string[] => {
    if (!s) return [];
    try { return JSON.parse(s); } catch { return []; }
};

const VolunteersPage: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);

    // State
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [committeeFilter, setCommitteeFilter] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([]);
    const [committees, setCommittees] = useState<CommitteeOverview[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('all');

    // Detail drawer
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedVol, setSelectedVol] = useState<VolunteerRecord | null>(null);

    // Promote modal
    const [promoteVisible, setPromoteVisible] = useState(false);
    const [promoteVol, setPromoteVol] = useState<VolunteerRecord | null>(null);
    const [promoteForm] = Form.useForm();

    // Fetch all data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Get visible committees (works for presidents & non-presidents)
            const data = await volunteerService.getVisible().catch(() => []);
            setCommittees(data);

            // Get volunteers from all visible committees
            const allVols: VolunteerRecord[] = [];
            const committeeIds = data.map((c: CommitteeOverview) => c.id);

            // If user has a committee, add it
            if (user?.committeeId && !committeeIds.includes(user.committeeId)) {
                committeeIds.push(user.committeeId);
            }

            // Fetch volunteers for each committee in parallel
            const results = await Promise.allSettled(
                committeeIds.map((cid: string) => volunteerService.getByCommittee(cid))
            );

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    allVols.push(...(result.value as VolunteerRecord[]));
                }
            }

            // Also try to get pending volunteers
            const pendingResults = await Promise.allSettled(
                committeeIds.map((cid: string) => volunteerService.getPending(cid))
            );

            for (const result of pendingResults) {
                if (result.status === 'fulfilled') {
                    for (const pv of result.value as VolunteerRecord[]) {
                        if (!allVols.find(v => v.id === pv.id)) {
                            allVols.push(pv);
                        }
                    }
                }
            }

            // Deduplicate by ID
            const unique = Array.from(new Map(allVols.map(v => [v.id, v])).values());
            setVolunteers(unique);
        } catch {
            setVolunteers([]);
        } finally {
            setLoading(false);
        }
    }, [user?.committeeId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ---- Actions ----
    const handleApprove = async (volunteerId: string) => {
        setActionLoading(volunteerId);
        try {
            await volunteerService.approve(volunteerId);
            message.success('Volontaire approuvé avec succès');
            fetchData();
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: string } };
            message.error(errObj?.response?.data || 'Erreur lors de l\'approbation');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (volunteerId: string) => {
        setActionLoading(volunteerId);
        try {
            await volunteerService.reject(volunteerId);
            message.success('Volontaire rejeté');
            fetchData();
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: string } };
            message.error(errObj?.response?.data || 'Erreur lors du rejet');
        } finally {
            setActionLoading(null);
        }
    };

    const openPromote = (vol: VolunteerRecord) => {
        setPromoteVol(vol);
        promoteForm.resetFields();
        setPromoteVisible(true);
    };

    const handlePromote = async () => {
        if (!promoteVol) return;
        try {
            const values = await promoteForm.validateFields();
            setActionLoading(promoteVol.id);
            const domainsArray = values.expertiseDomains.split(',').map((d: string) => d.trim()).filter(Boolean);
            await volunteerService.promote(promoteVol.id, {
                expertiseDomains: JSON.stringify(domainsArray),
            });
            message.success(`${promoteVol.fullName} promu(e) formateur avec succès`);
            setPromoteVisible(false);
            fetchData();
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: string } };
            message.error(errObj?.response?.data || 'Erreur lors de la promotion');
        } finally {
            setActionLoading(null);
        }
    };

    const openDetail = (vol: VolunteerRecord) => {
        setSelectedVol(vol);
        setDetailVisible(true);
    };

    // ---- Filters ----
    const filtered = volunteers.filter(v => {
        const matchSearch = !search ||
            v.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            v.email?.toLowerCase().includes(search.toLowerCase()) ||
            v.matricule?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || v.accountStatus === statusFilter;
        const matchCommittee = !committeeFilter || v.committeeId === committeeFilter;

        // Tab filter
        if (activeTab === 'pending') return matchSearch && matchCommittee && v.accountStatus === 'PENDING';
        if (activeTab === 'approved') return matchSearch && matchCommittee && v.accountStatus === 'APPROVED';
        if (activeTab === 'trainers') return matchSearch && matchCommittee && v.type === 'TRAINER';

        return matchSearch && matchStatus && matchCommittee;
    });

    // ---- Columns ----
    const columns: ColumnsType<VolunteerRecord> = [
        {
            title: 'Volontaire',
            key: 'name',
            sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
            render: (_, r) => (
                <Space>
                    <Avatar
                        style={{
                            backgroundColor: r.accountStatus === 'APPROVED' ? '#16a34a'
                                : r.accountStatus === 'PENDING' ? '#f59e0b' : '#ef4444',
                        }}
                        size={38}
                        icon={<UserOutlined />}
                    />
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{r.fullName}</Text>
                        {r.type === 'TRAINER' && (
                            <Tag color="purple" bordered={false} style={{ fontSize: 10, marginLeft: 6 }}>Formateur</Tag>
                        )}
                        <div><Text style={{ fontSize: 11, color: '#999' }}>{r.email}</Text></div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Matricule',
            dataIndex: 'matricule',
            key: 'matricule',
            render: (m: string) => <Tag bordered={false} icon={<IdcardOutlined />}>{m || '—'}</Tag>,
            responsive: ['md'],
        },
        {
            title: 'Compétences',
            dataIndex: 'skills',
            key: 'skills',
            render: (s: string) => {
                const skills = parseSkills(s);
                if (skills.length === 0) return <Text style={{ fontSize: 12, color: '#999' }}>—</Text>;
                return (
                    <Space wrap size={[4, 4]}>
                        {skills.slice(0, 3).map((sk: string) => (
                            <Tag key={sk} bordered={false} color="blue" style={{ fontSize: 11 }}>{sk}</Tag>
                        ))}
                        {skills.length > 3 && (
                            <Tooltip title={skills.slice(3).join(', ')}>
                                <Tag bordered={false} style={{ fontSize: 11 }}>+{skills.length - 3}</Tag>
                            </Tooltip>
                        )}
                    </Space>
                );
            },
            responsive: ['lg'],
        },
        {
            title: 'Heures',
            dataIndex: 'hoursVolunteered',
            key: 'hours',
            sorter: (a, b) => (a.hoursVolunteered || 0) - (b.hoursVolunteered || 0),
            render: (h: number) => (
                <Space>
                    <FieldTimeOutlined style={{ color: '#6366f1' }} />
                    <Text style={{ fontSize: 13 }}>{h ? `${h.toLocaleString()}h` : '0h'}</Text>
                </Space>
            ),
            responsive: ['lg'],
        },
        {
            title: 'Comité',
            key: 'committee',
            render: (_, r) => {
                const c = committees.find(cm => cm.id === r.committeeId);
                return c ? (
                    <Tag bordered={false} icon={<ApartmentOutlined />} style={{ fontSize: 11 }}>
                        {c.name.replace('Comité ', '').replace('Régional ', '').replace('Local ', '')}
                    </Tag>
                ) : <Text style={{ fontSize: 12, color: '#999' }}>—</Text>;
            },
            responsive: ['xl'],
        },
        {
            title: 'Statut',
            dataIndex: 'accountStatus',
            key: 'status',
            filters: [
                { text: 'Approuvé', value: 'APPROVED' },
                { text: 'En attente', value: 'PENDING' },
                { text: 'Rejeté', value: 'REJECTED' },
                { text: 'Suspendu', value: 'SUSPENDED' },
            ],
            onFilter: (value, record) => record.accountStatus === value,
            render: (s: string) => {
                const cfg = statusCfg[s] || { color: 'default', text: s, icon: null };
                return <Tag icon={cfg.icon} color={cfg.color} bordered={false}>{cfg.text}</Tag>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, r) => (
                <Space size="small" wrap>
                    <Tooltip title="Voir détails">
                        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)} />
                    </Tooltip>
                    {r.accountStatus === 'PENDING' && (
                        <>
                            <Popconfirm title="Approuver ce volontaire ?" onConfirm={() => handleApprove(r.id)}>
                                <Button type="link" size="small" loading={actionLoading === r.id} icon={<CheckCircleOutlined />} style={{ color: '#16a34a', padding: '0 4px' }}>
                                    Approuver
                                </Button>
                            </Popconfirm>
                            <Popconfirm title="Rejeter ce volontaire ?" onConfirm={() => handleReject(r.id)}>
                                <Button type="link" size="small" loading={actionLoading === r.id} icon={<CloseCircleOutlined />} danger style={{ padding: '0 4px' }}>
                                    Rejeter
                                </Button>
                            </Popconfirm>
                        </>
                    )}
                    {r.accountStatus === 'APPROVED' && r.type !== 'TRAINER' && (
                        <Tooltip title="Promouvoir en formateur">
                            <Button type="link" size="small" loading={actionLoading === r.id} icon={<StarOutlined />} onClick={() => openPromote(r)} style={{ padding: '0 4px' }}>
                                Promouvoir
                            </Button>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    // ---- Stats ----
    const approved = volunteers.filter(v => v.accountStatus === 'APPROVED').length;
    const pending = volunteers.filter(v => v.accountStatus === 'PENDING').length;
    const trainers = volunteers.filter(v => v.type === 'TRAINER').length;
    const totalHours = volunteers.reduce((s, v) => s + (v.hoursVolunteered || 0), 0);

    // Committee options for filter
    const committeeOptions = committees.map(c => ({ value: c.id, label: c.name }));

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">{t('nav.volunteers')}</Title>
                    <Text type="secondary">Gestion des volontaires et formateurs du CRT</Text>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Actualiser</Button>
                    <Button icon={<DownloadOutlined />}>Exporter</Button>
                </Space>
            </div>

            {/* Stats Row */}
            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { title: 'Total', value: volunteers.length, icon: <TeamOutlined />, color: '#C81E1E' },
                    { title: 'Approuvés', value: approved, icon: <CheckCircleOutlined />, color: '#16a34a' },
                    { title: 'En attente', value: pending, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Formateurs', value: trainers, icon: <StarOutlined />, color: '#6366f1' },
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

            {/* Main Card */}
            <Card styles={{ body: { padding: '16px 20px' } }}>
                {/* Tabs */}
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                    { key: 'all', label: <Space><TeamOutlined />Tous <Badge count={volunteers.length} style={{ backgroundColor: '#C81E1E' }} /></Space> },
                    { key: 'pending', label: <Space><ClockCircleOutlined />En attente <Badge count={pending} style={{ backgroundColor: '#f59e0b' }} /></Space> },
                    { key: 'approved', label: <Space><CheckCircleOutlined />Approuvés <Badge count={approved} style={{ backgroundColor: '#16a34a' }} /></Space> },
                    { key: 'trainers', label: <Space><StarOutlined />Formateurs <Badge count={trainers} style={{ backgroundColor: '#6366f1' }} /></Space> },
                ]} />

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Input
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        placeholder="Rechercher par nom, email, matricule..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 280 }}
                        allowClear
                    />
                    {activeTab === 'all' && (
                        <Select
                            placeholder="Statut"
                            allowClear
                            style={{ width: 160 }}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            suffixIcon={<FilterOutlined />}
                            options={[
                                { value: 'APPROVED', label: '✅ Approuvé' },
                                { value: 'PENDING', label: '⏳ En attente' },
                                { value: 'REJECTED', label: '❌ Rejeté' },
                                { value: 'SUSPENDED', label: '🚫 Suspendu' },
                            ]}
                        />
                    )}
                    {committeeOptions.length > 1 && (
                        <Select
                            placeholder="Comité"
                            allowClear
                            style={{ width: 220 }}
                            value={committeeFilter}
                            onChange={setCommitteeFilter}
                            suffixIcon={<ApartmentOutlined />}
                            options={committeeOptions}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    )}
                    <Text style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                        {filtered.length} volontaire{filtered.length > 1 ? 's' : ''}
                        {totalHours > 0 && ` · ${totalHours.toLocaleString()}h total`}
                    </Text>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-12"><Spin size="large" /></div>
                ) : filtered.length > 0 ? (
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey="id"
                        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} volontaires` }}
                        size="middle"
                        scroll={{ x: 800 }}
                    />
                ) : (
                    <Empty description={
                        activeTab === 'pending' ? 'Aucun volontaire en attente' :
                        activeTab === 'trainers' ? 'Aucun formateur trouvé' :
                        'Aucun volontaire trouvé'
                    } />
                )}
            </Card>

            {/* ---- Detail Drawer ---- */}
            <Drawer
                title={selectedVol ? selectedVol.fullName : 'Détails volontaire'}
                open={detailVisible}
                onClose={() => setDetailVisible(false)}
                width={480}
            >
                {selectedVol && (
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <Avatar
                                size={64}
                                icon={<UserOutlined />}
                                style={{
                                    backgroundColor: selectedVol.accountStatus === 'APPROVED' ? '#16a34a' : '#f59e0b',
                                }}
                            />
                            <div>
                                <Title level={4} className="!mb-0">{selectedVol.fullName}</Title>
                                <Text type="secondary">{selectedVol.email}</Text>
                                <div className="mt-1">
                                    {(() => {
                                        const cfg = statusCfg[selectedVol.accountStatus] || { color: 'default', text: selectedVol.accountStatus, icon: null };
                                        return <Tag icon={cfg.icon} color={cfg.color} bordered={false}>{cfg.text}</Tag>;
                                    })()}
                                    {selectedVol.type === 'TRAINER' && <Tag color="purple" bordered={false}>Formateur</Tag>}
                                </div>
                            </div>
                        </div>

                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Matricule">{selectedVol.matricule || '—'}</Descriptions.Item>
                            <Descriptions.Item label="CIN">{selectedVol.cin || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Téléphone">{selectedVol.phone || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Type">{selectedVol.type}</Descriptions.Item>
                            <Descriptions.Item label="Date d'adhésion">{selectedVol.dateAdhesion || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Heures">{selectedVol.hoursVolunteered ? `${selectedVol.hoursVolunteered}h` : '0h'}</Descriptions.Item>
                            <Descriptions.Item label="Comité">
                                {(() => {
                                    const c = committees.find(cm => cm.id === selectedVol.committeeId);
                                    return c?.name || selectedVol.committeeId || '—';
                                })()}
                            </Descriptions.Item>
                            <Descriptions.Item label="Compétences">
                                <Space wrap size={[4, 4]}>
                                    {parseSkills(selectedVol.skills).map((sk) => (
                                        <Tag key={sk} color="blue" bordered={false}>{sk}</Tag>
                                    ))}
                                    {parseSkills(selectedVol.skills).length === 0 && '—'}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Actions in drawer */}
                        <div className="mt-6" style={{ display: 'flex', gap: 8 }}>
                            {selectedVol.accountStatus === 'PENDING' && (
                                <>
                                    <Popconfirm title="Approuver ce volontaire ?" onConfirm={() => { handleApprove(selectedVol.id); setDetailVisible(false); }}>
                                        <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#16a34a' }}>
                                            Approuver
                                        </Button>
                                    </Popconfirm>
                                    <Popconfirm title="Rejeter ce volontaire ?" onConfirm={() => { handleReject(selectedVol.id); setDetailVisible(false); }}>
                                        <Button danger icon={<CloseCircleOutlined />}>Rejeter</Button>
                                    </Popconfirm>
                                </>
                            )}
                            {selectedVol.accountStatus === 'APPROVED' && selectedVol.type !== 'TRAINER' && (
                                <Button icon={<StarOutlined />} onClick={() => { setDetailVisible(false); openPromote(selectedVol); }}>
                                    Promouvoir formateur
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>

            {/* ---- Promote Modal ---- */}
            <Modal
                title={`Promouvoir ${promoteVol?.fullName || ''} en formateur`}
                open={promoteVisible}
                onCancel={() => setPromoteVisible(false)}
                onOk={handlePromote}
                confirmLoading={!!actionLoading}
                okText="Promouvoir"
                cancelText="Annuler"
            >
                <div className="mb-4">
                    <Text type="secondary">
                        Cette action va convertir le volontaire en formateur. Veuillez spécifier les domaines d'expertise.
                    </Text>
                </div>
                <Form form={promoteForm} layout="vertical">
                    <Form.Item
                        name="expertiseDomains"
                        label="Domaines d'expertise"
                        rules={[{ required: true, message: 'Veuillez saisir au moins un domaine' }]}
                        help="Séparez les domaines par des virgules (ex: Secourisme, RCP, PSE2)"
                    >
                        <Input.TextArea rows={3} placeholder="Secourisme, RCP, PSE2, Formation" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default VolunteersPage;
