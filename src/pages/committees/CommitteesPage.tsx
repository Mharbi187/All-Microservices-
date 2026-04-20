// ============================================================
// NEXUS-AID — Committees Page (Complete)
// Full committee management: hierarchy, create, assign roles, view volunteers
// Conformément au décret-loi n° 88-2011 et aux statuts du CRT
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Card, Col, Row, Typography, Space, Tag, Input, Spin, Empty,
    Statistic, List, Avatar, Badge, Collapse, Tooltip, Button,
    Modal, Form, Select, message, Drawer, Descriptions, Table, Divider,
    Alert, Progress,
} from 'antd';
import {
    ApartmentOutlined, SearchOutlined, TeamOutlined,
    EnvironmentOutlined, CrownOutlined, UserOutlined,
    PlusOutlined, ReloadOutlined, UserAddOutlined,
    EyeOutlined,
    CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined,
    StopOutlined, WarningOutlined, CalendarOutlined,
    SafetyCertificateOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores';
import committeeService from '@/services/committeeService';
import volunteerService from '@/services/volunteerService';
import type { CommitteeOverview, CommitteeRoleInfo, RoleTitle, CommitteeStatus } from '@/types';

const { Title, Text } = Typography;

// 24 gouvernorats tunisiens (découpage administratif officiel)
const GOUVERNORATS = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

// Backend Volunteer entity response
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
}

const typeCfg: Record<string, { color: string; label: string }> = {
    NATIONAL: { color: '#C81E1E', label: 'National' },
    REGIONAL: { color: '#6366f1', label: 'Régional' },
    LOCAL: { color: '#16a34a', label: 'Local' },
};

const committeeStatusCfg: Record<CommitteeStatus, { color: string; text: string; icon: React.ReactNode }> = {
    PENDING_CONSTITUTION: { color: 'orange', text: 'En constitution', icon: <ClockCircleOutlined /> },
    ACTIVE: { color: 'green', text: 'Actif', icon: <CheckCircleOutlined /> },
    SUSPENDED: { color: 'default', text: 'Suspendu', icon: <StopOutlined /> },
    DISSOLVED: { color: 'red', text: 'Dissous', icon: <CloseCircleOutlined /> },
};

const roleLabelMap: Record<string, string> = {
    PRESIDENT: 'Président',
    VICE_PRESIDENT: 'Vice-Président',
    SECRETAIRE_GENERAL: 'Secrétaire Général',
    RESP_SECOURISME: 'Resp. Secourisme',
    RESP_DIFFUSION: 'Resp. Diffusion',
    RESP_JEUNESSE: 'Resp. Jeunesse',
    RESP_SANTE: 'Resp. Santé',
    RESP_CATASTROPHES: 'Resp. Catastrophes',
    RESP_ACTION_SOCIALE: 'Resp. Action Sociale',
    RESP_IMMIGRATION: 'Resp. Immigration',
    RESP_VFF: 'Resp. VFF',
};

const roleColorMap: Record<string, string> = {
    PRESIDENT: '#C81E1E',
    VICE_PRESIDENT: '#b91c1c',
    SECRETAIRE_GENERAL: '#6366f1',
    RESP_SECOURISME: '#0891b2',
    RESP_DIFFUSION: '#7c3aed',
    RESP_JEUNESSE: '#059669',
    RESP_SANTE: '#dc2626',
    RESP_CATASTROPHES: '#d97706',
    RESP_ACTION_SOCIALE: '#2563eb',
    RESP_IMMIGRATION: '#4f46e5',
    RESP_VFF: '#9333ea',
};

const accountStatusCfg: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    APPROVED: { color: 'green', text: 'Approuvé', icon: <CheckCircleOutlined /> },
    PENDING: { color: 'orange', text: 'En attente', icon: <ClockCircleOutlined /> },
    REJECTED: { color: 'red', text: 'Rejeté', icon: <CloseCircleOutlined /> },
    SUSPENDED: { color: 'default', text: 'Suspendu', icon: <StopOutlined /> },
};

/** Rôles obligatoires du bureau (décret-loi n° 88-2011) */
const MANDATORY_ROLES: RoleTitle[] = ['PRESIDENT', 'SECRETAIRE_GENERAL'];

/** Rôles recommandés (organigramme officiel CRT) */
const RECOMMENDED_ROLES: RoleTitle[] = [
    'RESP_SANTE', 'RESP_CATASTROPHES', 'RESP_ACTION_SOCIALE', 'RESP_DIFFUSION',
];

const ALL_ROLE_TITLES: RoleTitle[] = [
    'PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL',
    'RESP_SECOURISME', 'RESP_DIFFUSION', 'RESP_JEUNESSE', 'RESP_SANTE',
    'RESP_CATASTROPHES', 'RESP_ACTION_SOCIALE', 'RESP_IMMIGRATION', 'RESP_VFF',
];

/** Durée du mandat en années */
const MANDATE_DURATION_YEARS = 4;

/** Calculate mandate progress percentage */
const getMandateProgress = (startDate?: string, endDate?: string): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
};

const CommitteesPage: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);

    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [committees, setCommittees] = useState<CommitteeOverview[]>([]);

    // Create committee modal
    const [createVisible, setCreateVisible] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createForm] = Form.useForm();
    const [selectedType, setSelectedType] = useState<string | undefined>();

    // Assign role modal
    const [assignVisible, setAssignVisible] = useState(false);
    const [assignLoading, setAssignLoading] = useState(false);
    const [assignForm] = Form.useForm();
    const [assignCommittee, setAssignCommittee] = useState<CommitteeOverview | null>(null);
    const [availableVolunteers, setAvailableVolunteers] = useState<VolunteerRecord[]>([]);
    const [volsLoading, setVolsLoading] = useState(false);

    // Committee detail drawer
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailCommittee, setDetailCommittee] = useState<CommitteeOverview | null>(null);
    const [committeeVolunteers, setCommitteeVolunteers] = useState<VolunteerRecord[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // ---- Fetch data ----
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await committeeService.getHierarchy().catch(async () => {
                const visible = await volunteerService.getVisible().catch(() => []);
                return visible;
            });
            setCommittees(data);
        } catch {
            setCommittees([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ---- Create Committee ----
    const handleCreate = async () => {
        try {
            const values = await createForm.validateFields();
            setCreateLoading(true);
            await committeeService.create({
                name: values.name,
                type: values.type,
                region: values.region,
                parentId: values.parentId || undefined,
            });
            message.success('Comité créé avec succès (statut : En constitution). Assignez le bureau obligatoire pour l\'activer.');
            setCreateVisible(false);
            createForm.resetFields();
            setSelectedType(undefined);
            fetchData();
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: string } };
            if (errObj?.response?.data) {
                message.error(errObj.response.data);
            }
        } finally {
            setCreateLoading(false);
        }
    };

    // ---- Approve Committee ----
    const handleApprove = async (committeeId: string) => {
        try {
            await committeeService.approve(committeeId);
            message.success('Comité approuvé et activé. Mandat de 4 ans démarré.');
            fetchData();
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: string } };
            if (errObj?.response?.data) {
                message.error(errObj.response.data);
            } else {
                message.error('Erreur lors de l\'approbation');
            }
        }
    };

    // ---- Assign Role ----
    const openAssignRole = async (committee: CommitteeOverview) => {
        setAssignCommittee(committee);
        assignForm.resetFields();
        setAssignVisible(true);

        setVolsLoading(true);
        try {
            const vols = await volunteerService.getByCommittee(committee.id);
            setAvailableVolunteers(vols as VolunteerRecord[]);
        } catch {
            setAvailableVolunteers([]);
        } finally {
            setVolsLoading(false);
        }
    };

    const handleAssignRole = async () => {
        if (!assignCommittee) return;
        try {
            const values = await assignForm.validateFields();
            setAssignLoading(true);
            await committeeService.proposeRole(assignCommittee.id, {
                volunteerId: values.volunteerId,
                title: values.title,
                reason: values.reason || 'Assigné via interface',
            });
            message.success(`Rôle assigné avec succès (mandat de ${MANDATE_DURATION_YEARS} ans)`);
            setAssignVisible(false);
            fetchData();
        } catch (err: unknown) {
            const errObj = err as { response?: { data?: { message?: string } | string } };
            const msg = typeof errObj?.response?.data === 'string' ? errObj.response.data :
                (errObj?.response?.data as { message?: string })?.message || 'Erreur lors de l\'assignation';
            message.error(msg);
        } finally {
            setAssignLoading(false);
        }
    };

    // ---- Committee Detail ----
    const openDetail = async (committee: CommitteeOverview) => {
        setDetailCommittee(committee);
        setDetailVisible(true);
        setDetailLoading(true);
        try {
            const vols = await volunteerService.getByCommittee(committee.id);
            setCommitteeVolunteers(vols as VolunteerRecord[]);
        } catch {
            setCommitteeVolunteers([]);
        } finally {
            setDetailLoading(false);
        }
    };

    // ---- Filters ----
    const filtered = committees.filter(c =>
        !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.region?.toLowerCase().includes(search.toLowerCase())
    );

    const national = filtered.filter(c => c.type === 'NATIONAL');
    const regional = filtered.filter(c => c.type === 'REGIONAL');
    const local = filtered.filter(c => c.type === 'LOCAL');
    const totalVolunteers = committees.reduce((s, c) => s + (c.totalVolunteers || 0), 0);
    const totalRoles = committees.reduce((s, c) => s + (c.roles?.length || 0), 0);
    const pendingCount = committees.filter(c => c.status === 'PENDING_CONSTITUTION').length;
    const expiredMandates = committees.filter(c => c.mandateExpired).length;

    // Check if user can create/manage
    const canManage = user?.type === 'ADMIN' || user?.roles?.some(r =>
        ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL'].includes(r)
    );

    // Filtered parent committee options based on selected type
    const getParentOptions = () => {
        if (selectedType === 'LOCAL') {
            return committees.filter(c => c.type === 'REGIONAL').map(c => ({
                value: c.id,
                label: `${c.name} (Régional — ${c.region})`,
            }));
        }
        if (selectedType === 'REGIONAL') {
            return committees.filter(c => c.type === 'NATIONAL').map(c => ({
                value: c.id,
                label: `${c.name} (National)`,
            }));
        }
        return [];
    };

    // Regions already used (territorial exclusivity)
    const usedRegions = committees
        .filter(c => c.type === selectedType)
        .map(c => c.region);

    // Available role titles for assignment (exclude already occupied unique roles)
    const getAvailableRoles = () => {
        if (!assignCommittee) return ALL_ROLE_TITLES;
        const occupiedTitles = assignCommittee.roles?.map(r => r.title) || [];
        return ALL_ROLE_TITLES.filter(r => !occupiedTitles.includes(r));
    };

    // Volunteer columns for detail drawer
    const volColumns: ColumnsType<VolunteerRecord> = [
        {
            title: 'Nom',
            key: 'name',
            render: (_, r) => (
                <Space>
                    <Avatar size="small" icon={<UserOutlined />} style={{
                        backgroundColor: r.accountStatus === 'APPROVED' ? '#16a34a' : '#f59e0b',
                    }} />
                    <div>
                        <Text strong style={{ fontSize: 12 }}>{r.fullName}</Text>
                        <div><Text style={{ fontSize: 10, color: '#999' }}>{r.email}</Text></div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Matricule',
            dataIndex: 'matricule',
            render: (m: string) => <Text style={{ fontSize: 12 }}>{m || '—'}</Text>,
        },
        {
            title: 'Statut',
            dataIndex: 'accountStatus',
            render: (s: string) => {
                const cfg = accountStatusCfg[s] || { color: 'default', text: s, icon: null };
                return <Tag icon={cfg.icon} color={cfg.color} bordered={false} style={{ fontSize: 11 }}>{cfg.text}</Tag>;
            },
        },
        {
            title: 'Heures',
            dataIndex: 'hoursVolunteered',
            render: (h: number) => <Text style={{ fontSize: 12 }}>{h ? `${h}h` : '0h'}</Text>,
        },
    ];

    if (loading) {
        return <div className="flex items-center justify-center" style={{ minHeight: 400 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">{t('nav.committees')}</Title>
                    <Text type="secondary">Hiérarchie organisationnelle du CRT — Conformité décret-loi n° 88-2011</Text>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Actualiser</Button>
                    {canManage && (
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateVisible(true)} style={{ background: '#C81E1E' }}>
                            Nouveau comité
                        </Button>
                    )}
                </Space>
            </div>

            {/* Governance Alerts */}
            {pendingCount > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<ExclamationCircleOutlined />}
                    message={`${pendingCount} comité(s) en attente de constitution`}
                    description="Ces comités n'ont pas encore le bureau obligatoire complet (Président + Secrétaire Général). Assignez les rôles puis approuvez."
                    className="mb-4"
                    closable
                />
            )}
            {expiredMandates > 0 && (
                <Alert
                    type="error"
                    showIcon
                    icon={<WarningOutlined />}
                    message={`${expiredMandates} comité(s) avec mandat expiré`}
                    description="Le mandat quadriennal (4 ans) de ces comités est terminé. Un renouvellement par assemblée générale élective est nécessaire."
                    className="mb-4"
                    closable
                />
            )}

            {/* Stats */}
            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { title: 'Total Comités', value: committees.length, icon: <ApartmentOutlined />, color: '#C81E1E' },
                    { title: 'Actifs', value: committees.filter(c => c.status === 'ACTIVE').length, icon: <CheckCircleOutlined />, color: '#16a34a' },
                    { title: 'En constitution', value: pendingCount, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Volontaires', value: totalVolunteers, icon: <TeamOutlined />, color: '#6366f1' },
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
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Input prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="Rechercher un comité..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 300 }} allowClear />
                    <Text style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                        {filtered.length} comité{filtered.length > 1 ? 's' : ''} · {totalRoles} rôles assignés
                    </Text>
                </div>

                {filtered.length === 0 ? (
                    <Empty description="Aucun comité trouvé" />
                ) : (
                    <Collapse
                        defaultActiveKey={['NATIONAL', 'REGIONAL', 'LOCAL']}
                        items={[
                            ...(national.length > 0 ? [{
                                key: 'NATIONAL',
                                label: <Space><CrownOutlined style={{ color: '#C81E1E' }} /><Text strong>Siège National</Text><Badge count={national.length} style={{ backgroundColor: '#C81E1E' }} /></Space>,
                                children: <CommitteeList committees={national} onDetail={openDetail} onAssignRole={canManage ? openAssignRole : undefined} onApprove={canManage ? handleApprove : undefined} />,
                            }] : []),
                            ...(regional.length > 0 ? [{
                                key: 'REGIONAL',
                                label: <Space><EnvironmentOutlined style={{ color: '#6366f1' }} /><Text strong>Comités Régionaux</Text><Badge count={regional.length} style={{ backgroundColor: '#6366f1' }} /><Text style={{ fontSize: 11, color: '#999' }}>1 par gouvernorat</Text></Space>,
                                children: <CommitteeList committees={regional} onDetail={openDetail} onAssignRole={canManage ? openAssignRole : undefined} onApprove={canManage ? handleApprove : undefined} />,
                            }] : []),
                            ...(local.length > 0 ? [{
                                key: 'LOCAL',
                                label: <Space><ApartmentOutlined style={{ color: '#16a34a' }} /><Text strong>Comités Locaux</Text><Badge count={local.length} style={{ backgroundColor: '#16a34a' }} /><Text style={{ fontSize: 11, color: '#999' }}>1 par délégation</Text></Space>,
                                children: <CommitteeList committees={local} onDetail={openDetail} onAssignRole={canManage ? openAssignRole : undefined} onApprove={canManage ? handleApprove : undefined} />,
                            }] : []),
                        ]}
                    />
                )}
            </Card>

            {/* ---- Create Committee Modal ---- */}
            <Modal
                title={
                    <Space>
                        <ApartmentOutlined style={{ color: '#C81E1E' }} />
                        <span>Créer un nouveau comité</span>
                    </Space>
                }
                open={createVisible}
                onCancel={() => { setCreateVisible(false); setSelectedType(undefined); createForm.resetFields(); }}
                onOk={handleCreate}
                confirmLoading={createLoading}
                okText="Créer"
                cancelText="Annuler"
                width={600}
            >
                {/* Governance info banner */}
                <Alert
                    type="info"
                    showIcon
                    icon={<SafetyCertificateOutlined />}
                    message="Règles de création CRT"
                    description={
                        <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 12 }}>
                            <li><strong>Compétence territoriale exclusive :</strong> 1 seul comité REGIONAL par gouvernorat, 1 seul LOCAL par délégation</li>
                            <li><strong>Bureau obligatoire :</strong> Président + Secrétaire Général (minimum)</li>
                            <li><strong>Hiérarchie :</strong> LOCAL → REGIONAL → NATIONAL</li>
                            <li><strong>Mandat :</strong> {MANDATE_DURATION_YEARS} ans (quadriennal), démarré après approbation</li>
                            <li><strong>Agrément :</strong> Validation par le Comité Central requise</li>
                        </ul>
                    }
                    className="mb-4"
                    style={{ marginTop: 8 }}
                />

                <Form form={createForm} layout="vertical">
                    <Form.Item name="name" label="Nom du comité" rules={[{ required: true, message: 'Nom requis' }]}>
                        <Input placeholder="Comité Régional de Sousse" />
                    </Form.Item>

                    <Form.Item name="type" label="Type" rules={[{ required: true, message: 'Type requis' }]}>
                        <Select
                            options={[
                                { value: 'NATIONAL', label: 'National (Siège unique)', disabled: committees.some(c => c.type === 'NATIONAL') },
                                { value: 'REGIONAL', label: 'Régional (1 par gouvernorat)' },
                                { value: 'LOCAL', label: 'Local (1 par délégation)' },
                            ]}
                            placeholder="Sélectionner le type"
                            onChange={(val) => {
                                setSelectedType(val);
                                createForm.setFieldsValue({ region: undefined, parentId: undefined });
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="region"
                        label={selectedType === 'REGIONAL' ? 'Gouvernorat' : selectedType === 'LOCAL' ? 'Délégation' : 'Région'}
                        rules={[{ required: true, message: 'Région requise' }]}
                        extra={selectedType === 'REGIONAL' ? 'Sélectionnez le gouvernorat (compétence territoriale exclusive)' : undefined}
                    >
                        {selectedType === 'REGIONAL' ? (
                            <Select
                                placeholder="Sélectionner le gouvernorat"
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={GOUVERNORATS.map(g => ({
                                    value: g,
                                    label: g,
                                    disabled: usedRegions.includes(g),
                                }))}
                            />
                        ) : (
                            <Input placeholder={selectedType === 'LOCAL' ? 'Nom de la délégation' : 'Région'} />
                        )}
                    </Form.Item>

                    {(selectedType === 'LOCAL' || selectedType === 'REGIONAL') && (
                        <Form.Item
                            name="parentId"
                            label={selectedType === 'LOCAL' ? 'Comité Régional parent (obligatoire)' : 'Siège National (obligatoire)'}
                            rules={[{ required: true, message: 'Le comité parent est obligatoire pour la hiérarchie CRT' }]}
                        >
                            <Select
                                placeholder={selectedType === 'LOCAL' ? 'Sélectionner le comité régional' : 'Sélectionner le siège national'}
                                options={getParentOptions()}
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                            />
                        </Form.Item>
                    )}

                    {selectedType === 'NATIONAL' && (
                        <Form.Item name="parentId" hidden>
                            <Input />
                        </Form.Item>
                    )}
                </Form>

                <Alert
                    type="warning"
                    showIcon
                    message="Prochaine étape"
                    description="Après la création, le comité sera en statut « En constitution ». Assignez le Président et le Secrétaire Général, puis approuvez pour activer le mandat de 4 ans."
                    style={{ marginTop: 8 }}
                />
            </Modal>

            {/* ---- Assign Role Modal ---- */}
            <Modal
                title={`Assigner un rôle — ${assignCommittee?.name || ''}`}
                open={assignVisible}
                onCancel={() => setAssignVisible(false)}
                onOk={handleAssignRole}
                confirmLoading={assignLoading}
                okText="Assigner"
                cancelText="Annuler"
                width={560}
            >
                {/* Missing mandatory roles alert */}
                {assignCommittee && !assignCommittee.hasMandatoryBureau && (
                    <Alert
                        type="error"
                        showIcon
                        icon={<ExclamationCircleOutlined />}
                        message="Bureau obligatoire incomplet"
                        description={
                            <div>
                                <Text style={{ fontSize: 12 }}>
                                    Le bureau minimum exige : <strong>Président</strong> + <strong>Secrétaire Général</strong>.
                                </Text>
                                <div className="mt-1">
                                    {!assignCommittee.roles?.some(r => r.title === 'PRESIDENT') && (
                                        <Tag color="red" bordered={false}>Président manquant</Tag>
                                    )}
                                    {!assignCommittee.roles?.some(r => r.title === 'SECRETAIRE_GENERAL') && (
                                        <Tag color="red" bordered={false}>Secrétaire Général manquant</Tag>
                                    )}
                                </div>
                            </div>
                        }
                        className="mb-3"
                    />
                )}

                <Form form={assignForm} layout="vertical" className="mt-2">
                    <Form.Item name="volunteerId" label="Volontaire" rules={[{ required: true, message: 'Sélectionnez un volontaire' }]}>
                        <Select
                            loading={volsLoading}
                            placeholder="Sélectionner un volontaire"
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={availableVolunteers.filter(v => v.accountStatus === 'APPROVED').map(v => ({
                                value: v.id,
                                label: `${v.fullName} (${v.email})`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="title" label="Rôle" rules={[{ required: true, message: 'Sélectionnez un rôle' }]}>
                        <Select
                            placeholder="Sélectionner le rôle"
                            options={getAvailableRoles().map(r => ({
                                value: r,
                                label: `${roleLabelMap[r] || r}${MANDATORY_ROLES.includes(r) ? ' ★ obligatoire' : RECOMMENDED_ROLES.includes(r) ? ' (recommandé)' : ''}`,
                            }))}
                        />
                    </Form.Item>
                    <Form.Item name="reason" label="Raison (optionnel)">
                        <Input.TextArea rows={2} placeholder="Raison de l'assignation (ex: élu par assemblée générale)..." />
                    </Form.Item>
                </Form>

                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginTop: 4 }}>
                    <Text strong style={{ fontSize: 12 }}>
                        <CalendarOutlined /> Mandat : {MANDATE_DURATION_YEARS} ans à partir de la date d'assignation
                    </Text>
                </div>

                {assignCommittee?.roles && assignCommittee.roles.length > 0 && (
                    <div className="mt-3">
                        <Text type="secondary" style={{ fontSize: 12 }}>Rôles actuels :</Text>
                        <div className="mt-1">
                            {assignCommittee.roles.map((r) => (
                                <Tag key={r.title} color={r.mandateExpired ? 'red' : roleColorMap[r.title]} bordered={false} style={{ fontSize: 11, marginBottom: 4 }}>
                                    {roleLabelMap[r.title] || r.title}: {r.volunteerName}
                                    {r.mandateExpired && ' ⚠ expiré'}
                                    {r.mandateEndDate && !r.mandateExpired && (
                                        <span style={{ opacity: 0.7 }}> → {r.mandateEndDate}</span>
                                    )}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ---- Committee Detail Drawer ---- */}
            <Drawer
                title={detailCommittee?.name || 'Détails du comité'}
                open={detailVisible}
                onClose={() => setDetailVisible(false)}
                width={680}
            >
                {detailCommittee && (
                    <div>
                        {/* Committee Info */}
                        <div className="flex items-center gap-4 mb-4">
                            <Avatar
                                size={56}
                                icon={<ApartmentOutlined />}
                                style={{ backgroundColor: typeCfg[detailCommittee.type]?.color || '#888' }}
                            />
                            <div>
                                <Title level={4} className="!mb-0">{detailCommittee.name}</Title>
                                <Space className="mt-1">
                                    <Tag color={typeCfg[detailCommittee.type]?.color} bordered={false}>
                                        {typeCfg[detailCommittee.type]?.label}
                                    </Tag>
                                    {detailCommittee.region && (
                                        <Tag icon={<EnvironmentOutlined />} bordered={false}>{detailCommittee.region}</Tag>
                                    )}
                                    {detailCommittee.status && (
                                        <Tag
                                            icon={committeeStatusCfg[detailCommittee.status]?.icon}
                                            color={committeeStatusCfg[detailCommittee.status]?.color}
                                            bordered={false}
                                        >
                                            {committeeStatusCfg[detailCommittee.status]?.text}
                                        </Tag>
                                    )}
                                </Space>
                            </div>
                        </div>

                        {/* Governance alerts */}
                        {!detailCommittee.hasMandatoryBureau && (
                            <Alert
                                type="error"
                                showIcon
                                message="Bureau obligatoire incomplet"
                                description="Le Président et le Secrétaire Général doivent être assignés (décret-loi n° 88-2011)."
                                className="mb-4"
                            />
                        )}
                        {detailCommittee.mandateExpired && (
                            <Alert
                                type="warning"
                                showIcon
                                message="Mandat expiré"
                                description="Le mandat quadriennal de ce comité est terminé. Un renouvellement par élection est nécessaire."
                                className="mb-4"
                            />
                        )}

                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Type">{typeCfg[detailCommittee.type]?.label}</Descriptions.Item>
                            <Descriptions.Item label="Région / Territoire">{detailCommittee.region || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Comité parent">{detailCommittee.parentCommitteeName || '— (niveau supérieur)'}</Descriptions.Item>
                            <Descriptions.Item label="Statut">
                                <Tag
                                    icon={committeeStatusCfg[detailCommittee.status]?.icon}
                                    color={committeeStatusCfg[detailCommittee.status]?.color}
                                    bordered={false}
                                >
                                    {committeeStatusCfg[detailCommittee.status]?.text}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Total volontaires">{detailCommittee.totalVolunteers}</Descriptions.Item>
                            <Descriptions.Item label="Bureau obligatoire">
                                {detailCommittee.hasMandatoryBureau ? (
                                    <Tag color="green" icon={<CheckCircleOutlined />} bordered={false}>Complet</Tag>
                                ) : (
                                    <Tag color="red" icon={<ExclamationCircleOutlined />} bordered={false}>Incomplet</Tag>
                                )}
                            </Descriptions.Item>
                        </Descriptions>

                        {/* Mandate Progress */}
                        {detailCommittee.mandateStartDate && detailCommittee.mandateEndDate && (
                            <Card size="small" className="mt-4" styles={{ body: { padding: '12px 16px' } }}>
                                <div className="flex items-center gap-2 mb-2">
                                    <CalendarOutlined style={{ color: '#6366f1' }} />
                                    <Text strong style={{ fontSize: 13 }}>Mandat quadriennal ({MANDATE_DURATION_YEARS} ans)</Text>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <Text style={{ fontSize: 11 }}>Début : {detailCommittee.mandateStartDate}</Text>
                                    <Text style={{ fontSize: 11 }}>Fin : {detailCommittee.mandateEndDate}</Text>
                                </div>
                                <Progress
                                    percent={getMandateProgress(detailCommittee.mandateStartDate, detailCommittee.mandateEndDate)}
                                    status={detailCommittee.mandateExpired ? 'exception' : 'active'}
                                    strokeColor={detailCommittee.mandateExpired ? '#ff4d4f' : '#6366f1'}
                                    size="small"
                                />
                            </Card>
                        )}

                        {/* Approve button for pending committees */}
                        {canManage && detailCommittee.status === 'PENDING_CONSTITUTION' && detailCommittee.hasMandatoryBureau && (
                            <div className="mt-4">
                                <Button
                                    type="primary"
                                    icon={<SafetyCertificateOutlined />}
                                    onClick={() => handleApprove(detailCommittee.id)}
                                    style={{ background: '#16a34a', width: '100%' }}
                                    size="large"
                                >
                                    Approuver et activer le comité (démarrer mandat de {MANDATE_DURATION_YEARS} ans)
                                </Button>
                            </div>
                        )}

                        {/* Roles */}
                        <Divider orientation="left"><Space><CrownOutlined /> Rôles du bureau</Space></Divider>

                        {/* Show mandatory roles status */}
                        <div className="mb-3">
                            {MANDATORY_ROLES.map(role => {
                                const assigned = detailCommittee.roles?.find(r => r.title === role);
                                return (
                                    <Tag
                                        key={role}
                                        color={assigned ? 'green' : 'red'}
                                        icon={assigned ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                                        bordered={false}
                                        style={{ marginBottom: 4 }}
                                    >
                                        {roleLabelMap[role]} {assigned ? `✓ ${assigned.volunteerName}` : '— Non assigné (obligatoire)'}
                                    </Tag>
                                );
                            })}
                        </div>

                        {detailCommittee.roles && detailCommittee.roles.length > 0 ? (
                            <List
                                size="small"
                                dataSource={detailCommittee.roles}
                                renderItem={(r: CommitteeRoleInfo) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={<Avatar size="small" style={{ backgroundColor: r.mandateExpired ? '#ff4d4f' : (roleColorMap[r.title] || '#888') }} icon={<UserOutlined />} />}
                                            title={
                                                <Space>
                                                    <Tag color={r.mandateExpired ? 'red' : roleColorMap[r.title]} bordered={false} style={{ fontSize: 11 }}>
                                                        {roleLabelMap[r.title] || r.title}
                                                        {MANDATORY_ROLES.includes(r.title) && ' ★'}
                                                    </Tag>
                                                    {r.mandateExpired && <Tag color="red" bordered={false} style={{ fontSize: 10 }}>Mandat expiré</Tag>}
                                                </Space>
                                            }
                                            description={
                                                <div>
                                                    <Text style={{ fontSize: 12 }}>{r.volunteerName} — {r.volunteerEmail}</Text>
                                                    {r.mandateEndDate && (
                                                        <div>
                                                            <Text style={{ fontSize: 10, color: r.mandateExpired ? '#ff4d4f' : '#999' }}>
                                                                <CalendarOutlined /> Fin de mandat : {r.mandateEndDate}
                                                            </Text>
                                                        </div>
                                                    )}
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun rôle assigné" />
                        )}

                        {/* Volunteers */}
                        <Divider orientation="left"><Space><TeamOutlined /> Volontaires</Space></Divider>
                        {detailLoading ? (
                            <div className="flex justify-center py-6"><Spin /></div>
                        ) : committeeVolunteers.length > 0 ? (
                            <Table
                                columns={volColumns}
                                dataSource={committeeVolunteers}
                                rowKey="id"
                                size="small"
                                pagination={{ pageSize: 5, size: 'small' }}
                                scroll={{ x: 400 }}
                            />
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucun volontaire" />
                        )}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

// ---- Committee List Sub-component ----
interface CommitteeListProps {
    committees: CommitteeOverview[];
    onDetail: (c: CommitteeOverview) => void;
    onAssignRole?: (c: CommitteeOverview) => void;
    onApprove?: (id: string) => void;
}

const CommitteeList: React.FC<CommitteeListProps> = ({ committees, onDetail, onAssignRole, onApprove }) => (
    <List
        dataSource={committees}
        renderItem={(c) => {
            const cfg = typeCfg[c.type] || { color: '#888', label: c.type };
            const stCfg = committeeStatusCfg[c.status];
            return (
                <List.Item
                    style={{ padding: '12px 0' }}
                    actions={[
                        <Tooltip key="view" title="Voir détails">
                            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => onDetail(c)} />
                        </Tooltip>,
                        ...(onAssignRole ? [
                            <Tooltip key="assign" title="Assigner un rôle">
                                <Button type="text" size="small" icon={<UserAddOutlined />} onClick={() => onAssignRole(c)} />
                            </Tooltip>,
                        ] : []),
                        ...(onApprove && c.status === 'PENDING_CONSTITUTION' && c.hasMandatoryBureau ? [
                            <Tooltip key="approve" title="Approuver le comité">
                                <Button type="text" size="small" icon={<SafetyCertificateOutlined />} style={{ color: '#16a34a' }} onClick={() => onApprove(c.id)} />
                            </Tooltip>,
                        ] : []),
                    ]}
                >
                    <List.Item.Meta
                        avatar={<Avatar style={{ backgroundColor: cfg.color }} icon={<ApartmentOutlined />} />}
                        title={
                            <Space wrap>
                                <Text strong>{c.name}</Text>
                                <Tag color={cfg.color} bordered={false} style={{ fontSize: 11 }}>{cfg.label}</Tag>
                                {stCfg && (
                                    <Tag icon={stCfg.icon} color={stCfg.color} bordered={false} style={{ fontSize: 10 }}>
                                        {stCfg.text}
                                    </Tag>
                                )}
                                <Badge count={c.totalVolunteers} style={{ backgroundColor: '#16a34a' }} overflowCount={999} />
                                {!c.hasMandatoryBureau && (
                                    <Tooltip title="Bureau obligatoire incomplet (Président + SG requis)">
                                        <Tag color="red" bordered={false} style={{ fontSize: 10 }}>
                                            <ExclamationCircleOutlined /> Bureau incomplet
                                        </Tag>
                                    </Tooltip>
                                )}
                                {c.mandateExpired && (
                                    <Tooltip title="Mandat quadriennal expiré — Renouvellement nécessaire">
                                        <Tag color="red" bordered={false} style={{ fontSize: 10 }}>
                                            <WarningOutlined /> Mandat expiré
                                        </Tag>
                                    </Tooltip>
                                )}
                            </Space>
                        }
                        description={
                            <div>
                                <Space size="large" className="mb-1">
                                    {c.region && <Text style={{ fontSize: 12 }}><EnvironmentOutlined /> {c.region}</Text>}
                                    <Text style={{ fontSize: 12 }}><TeamOutlined /> {c.totalVolunteers} volontaires</Text>
                                    {c.parentCommitteeName && <Text style={{ fontSize: 12, color: '#999' }}>↑ {c.parentCommitteeName}</Text>}
                                    {c.mandateEndDate && (
                                        <Text style={{ fontSize: 11, color: c.mandateExpired ? '#ff4d4f' : '#999' }}>
                                            <CalendarOutlined /> Mandat → {c.mandateEndDate}
                                        </Text>
                                    )}
                                </Space>
                                <div className="mt-1">
                                    {c.roles?.map((r) => (
                                        <Tooltip key={`${r.title}-${r.volunteerId}`} title={`${r.volunteerName} (${r.volunteerEmail})${r.mandateEndDate ? ` — Fin mandat: ${r.mandateEndDate}` : ''}${r.mandateExpired ? ' ⚠ EXPIRÉ' : ''}`}>
                                            <Tag
                                                bordered={false}
                                                color={r.mandateExpired ? 'red' : roleColorMap[r.title]}
                                                style={{ fontSize: 10, marginBottom: 2 }}
                                            >
                                                <UserOutlined /> {roleLabelMap[r.title] || r.title.replace('RESP_', '')}
                                                {MANDATORY_ROLES.includes(r.title) && ' ★'}
                                            </Tag>
                                        </Tooltip>
                                    ))}
                                    {(!c.roles || c.roles.length === 0) && (
                                        <Text style={{ fontSize: 11, color: '#999' }}>Aucun rôle assigné</Text>
                                    )}
                                </div>
                            </div>
                        }
                    />
                </List.Item>
            );
        }}
    />
);

export default CommitteesPage;
