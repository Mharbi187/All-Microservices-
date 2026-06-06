// ============================================================
// NEXUS-AID — Volunteers Page (Complete)
// Full volunteer management: multi-committee view, approve/reject/promote
// Trainer tab: list from DB, edit domains, remove status, Secourisme alerts
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Select, Typography, Space,
    Statistic, Button, Avatar, message, Popconfirm, Spin, Empty,
    Modal, Form, Tabs, Descriptions, Tooltip, Badge, Drawer, Alert,
} from 'antd';
import {
    TeamOutlined, SearchOutlined, FilterOutlined,
    DownloadOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ClockCircleOutlined, UserOutlined,
    StarOutlined, EyeOutlined, ApartmentOutlined,
    ReloadOutlined, StopOutlined, IdcardOutlined,
    FieldTimeOutlined, EditOutlined, DeleteOutlined,
    WarningOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores';
import volunteerService, { type TrainerDto } from '@/services/volunteerService';
import type { CommitteeOverview } from '@/types';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

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
    bloodType?: string;
}

const statusCfg: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
    APPROVED: { color: 'green', text: 'Approuvé', icon: <CheckCircleOutlined /> },
    PENDING: { color: 'orange', text: 'En attente', icon: <ClockCircleOutlined /> },
    REJECTED: { color: 'red', text: 'Rejeté', icon: <CloseCircleOutlined /> },
    SUSPENDED: { color: 'default', text: 'Suspendu', icon: <StopOutlined /> },
};

const getErrMsg = (err: unknown, fallback: string): string => {
    const e = err as { response?: { data?: unknown } };
    const d = e?.response?.data;
    if (!d) return fallback;
    if (typeof d === 'string' && d.length > 0) return d;
    if (typeof d === 'object' && d !== null) {
        const msg = (d as Record<string, unknown>).message;
        if (typeof msg === 'string' && msg.length > 0) return msg;
    }
    return fallback;
};

const parseSkills = (s?: string): string[] => {
    if (!s) return [];
    try {
        if (s.startsWith('[')) return JSON.parse(s);
        return s.split(',').map((x: string) => x.trim()).filter(Boolean);
    } catch {
        return s.split(',').map((x: string) => x.trim()).filter(Boolean);
    }
};

const DOMAIN_COLORS: Record<string, string> = {
    secourisme: 'red', rcp: 'volcano', pse1: 'orange', pse2: 'gold',
    logistique: 'blue', communication: 'cyan', premiers: 'red',
};
const getDomainColor = (d: string) => DOMAIN_COLORS[d.toLowerCase()] || 'purple';

const VolunteersPage: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);

    const userRoles = user?.roles || [];
    const isPresident = userRoles.some(r => r.includes('PRESIDENT')) || user?.type === 'ADMIN';
    const isRespJeunesse = userRoles.some(r => r.includes('RESP_JEUNESSE'));
    const isVicePresident = userRoles.some(r => r.includes('VICE_PRESIDENT'));
    const canValidate = isPresident || isRespJeunesse;
    const canManageTrainers = isPresident || isRespJeunesse || isVicePresident;

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [committeeFilter, setCommitteeFilter] = useState<string | null>(null);
    const [bloodFilter, setBloodFilter] = useState<string | null>(null);
    const [skillsFilter, setSkillsFilter] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [trainersLoading, setTrainersLoading] = useState(false);
    const [volunteers, setVolunteers] = useState<VolunteerRecord[]>([]);
    const [trainers, setTrainers] = useState<TrainerDto[]>([]);
    const [committees, setCommittees] = useState<CommitteeOverview[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>('all');

    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedVol, setSelectedVol] = useState<VolunteerRecord | null>(null);

    const [promoteVisible, setPromoteVisible] = useState(false);
    const [promoteVol, setPromoteVol] = useState<VolunteerRecord | null>(null);
    const [promoteForm] = Form.useForm();

    const [editVisible, setEditVisible] = useState(false);
    const [editVol, setEditVol] = useState<VolunteerRecord | null>(null);
    const [editForm] = Form.useForm();

    // Trainer edit modal
    const [trainerEditVisible, setTrainerEditVisible] = useState(false);
    const [editingTrainer, setEditingTrainer] = useState<TrainerDto | null>(null);
    const [trainerEditForm] = Form.useForm();

    // Fetch volunteers
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await volunteerService.getVisible().catch(() => []);
            setCommittees(data);

            const allVols: VolunteerRecord[] = [];
            const committeeIds = data.map((c: CommitteeOverview) => c.id);
            if (user?.committeeId && !committeeIds.includes(user.committeeId)) {
                committeeIds.push(user.committeeId);
            }

            const results = await Promise.allSettled(
                committeeIds.map((cid: string) => volunteerService.getByCommittee(cid))
            );
            for (const result of results) {
                if (result.status === 'fulfilled') allVols.push(...(result.value as VolunteerRecord[]));
            }

            const pendingResults = await Promise.allSettled(
                committeeIds.map((cid: string) => volunteerService.getPending(cid))
            );
            for (const result of pendingResults) {
                if (result.status === 'fulfilled') {
                    for (const pv of result.value as VolunteerRecord[]) {
                        if (!allVols.find(v => v.id === pv.id)) allVols.push(pv);
                    }
                }
            }

            setVolunteers(Array.from(new Map(allVols.map(v => [v.id, v])).values()));
        } catch {
            setVolunteers([]);
        } finally {
            setLoading(false);
        }
    }, [user?.committeeId]);

    // Fetch trainers from dedicated API
    const fetchTrainers = useCallback(async () => {
        if (!canManageTrainers) return;
        setTrainersLoading(true);
        try {
            const data = await volunteerService.getTrainers();
            setTrainers(data);
        } catch {
            setTrainers([]);
        } finally {
            setTrainersLoading(false);
        }
    }, [canManageTrainers]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { if (activeTab === 'trainers') fetchTrainers(); }, [activeTab, fetchTrainers]);

    // ---- Actions ----
    const handleApprove = async (volunteerId: string) => {
        setActionLoading(volunteerId);
        try {
            await volunteerService.approve(volunteerId);
            message.success('Volontaire approuvé avec succès');
            fetchData();
        } catch (err: unknown) {
            message.error(getErrMsg(err, "Erreur lors de l'approbation"));
        } finally { setActionLoading(null); }
    };

    const handleReject = async (volunteerId: string) => {
        setActionLoading(volunteerId);
        try {
            await volunteerService.reject(volunteerId);
            message.success('Volontaire rejeté');
            fetchData();
        } catch (err: unknown) {
            message.error(getErrMsg(err, 'Erreur lors du rejet'));
        } finally { setActionLoading(null); }
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
            await volunteerService.promote(promoteVol.id, { expertiseDomains: JSON.stringify(domainsArray) });
            message.success(`${promoteVol.fullName} promu(e) formateur — email de félicitation envoyé !`);
            setPromoteVisible(false);
            fetchData();
            fetchTrainers();
        } catch (err: unknown) {
            message.error(getErrMsg(err, 'Erreur lors de la promotion'));
        } finally { setActionLoading(null); }
    };

    const openEdit = (vol: VolunteerRecord) => {
        setEditVol(vol);
        editForm.setFieldsValue({ bloodType: vol.bloodType, skills: parseSkills(vol.skills).join(', ') });
        setEditVisible(true);
    };

    const handleEdit = async () => {
        if (!editVol) return;
        try {
            const values = await editForm.validateFields();
            setActionLoading(editVol.id);
            const skillsArray = values.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
            await volunteerService.updateDetails(editVol.id, { skills: JSON.stringify(skillsArray), bloodType: values.bloodType });
            message.success('Informations mises à jour avec succès');
            setEditVisible(false);
            fetchData();
        } catch (err: unknown) {
            message.error(getErrMsg(err, 'Erreur lors de la mise à jour'));
        } finally { setActionLoading(null); }
    };

    // ---- Trainer Actions ----
    const openTrainerEdit = (trainer: TrainerDto) => {
        setEditingTrainer(trainer);
        trainerEditForm.setFieldsValue({ domains: trainer.expertiseDomains.join(', ') });
        setTrainerEditVisible(true);
    };

    const handleTrainerEdit = async () => {
        if (!editingTrainer) return;
        try {
            const values = await trainerEditForm.validateFields();
            setActionLoading(editingTrainer.id);
            const domainsArray = values.domains.split(',').map((d: string) => d.trim()).filter(Boolean);
            await volunteerService.updateTrainer(editingTrainer.id, domainsArray);
            message.success(`Domaines mis à jour — email d'information envoyé à ${editingTrainer.fullName}`);
            setTrainerEditVisible(false);
            fetchTrainers();
        } catch (err: unknown) {
            message.error(getErrMsg(err, 'Erreur lors de la mise à jour'));
        } finally { setActionLoading(null); }
    };

    const handleRemoveTrainer = async (trainer: TrainerDto) => {
        setActionLoading(trainer.id);
        try {
            await volunteerService.removeTrainer(trainer.id);
            message.success(`Statut formateur retiré — ${trainer.fullName} redevient volontaire. Email envoyé.`);
            fetchTrainers();
            fetchData();
        } catch (err: unknown) {
            message.error(getErrMsg(err, 'Erreur lors du retrait'));
        } finally { setActionLoading(null); }
    };

    // ---- Filters ----
    const filtered = volunteers.filter(v => {
        const matchSearch = !search ||
            v.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            v.email?.toLowerCase().includes(search.toLowerCase()) ||
            v.matricule?.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || v.accountStatus === statusFilter;
        const matchCommittee = !committeeFilter || v.committeeId === committeeFilter;
        const matchBlood = !bloodFilter || v.bloodType === bloodFilter;
        const vSkillsStr = parseSkills(v.skills).join(', ').toLowerCase();
        const matchSkills = !skillsFilter || vSkillsStr.includes(skillsFilter.toLowerCase());

        if (activeTab === 'pending') return matchSearch && matchCommittee && matchBlood && matchSkills && v.accountStatus === 'PENDING';
        if (activeTab === 'approved') return matchSearch && matchCommittee && matchBlood && matchSkills && v.accountStatus === 'APPROVED';
        return matchSearch && matchStatus && matchCommittee && matchBlood && matchSkills;
    });

    const filteredTrainers = trainers.filter(t => {
        const matchSearch = !search ||
            t.fullName?.toLowerCase().includes(search.toLowerCase()) ||
            t.email?.toLowerCase().includes(search.toLowerCase()) ||
            t.expertiseDomains.some(d => d.toLowerCase().includes(search.toLowerCase()));
        const matchCommittee = !committeeFilter || t.committeeId === committeeFilter;
        return matchSearch && matchCommittee;
    });

    // ---- Volunteer Columns ----
    const columns: ColumnsType<VolunteerRecord> = [
        {
            title: 'Volontaire', key: 'name',
            sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
            render: (_, r) => (
                <Space>
                    <Avatar style={{ backgroundColor: r.accountStatus === 'APPROVED' ? '#16a34a' : r.accountStatus === 'PENDING' ? '#f59e0b' : '#ef4444' }} size={38} icon={<UserOutlined />} />
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{r.fullName}</Text>
                        <div><Text style={{ fontSize: 11, color: '#999' }}>{r.email}</Text></div>
                    </div>
                </Space>
            ),
        },
        { title: 'Matricule', dataIndex: 'matricule', key: 'matricule', render: (m: string) => <Tag bordered={false} icon={<IdcardOutlined />}>{m || '—'}</Tag>, responsive: ['md'] },
        { title: 'Groupe Sanguin', dataIndex: 'bloodType', key: 'bloodType', render: (bt: string) => bt ? <Tag color="red" style={{ fontWeight: 'bold' }}>{bt}</Tag> : <Text type="secondary">—</Text>, responsive: ['md'] },
        {
            title: 'Compétences', dataIndex: 'skills', key: 'skills', responsive: ['lg'],
            render: (s: string) => {
                const skills = parseSkills(s);
                if (skills.length === 0) return <Text style={{ fontSize: 12, color: '#999' }}>—</Text>;
                return (
                    <Space wrap size={[4, 4]}>
                        {skills.slice(0, 3).map((sk: string) => <Tag key={sk} bordered={false} color="blue" style={{ fontSize: 11 }}>{sk}</Tag>)}
                        {skills.length > 3 && <Tooltip title={skills.slice(3).join(', ')}><Tag bordered={false} style={{ fontSize: 11 }}>+{skills.length - 3}</Tag></Tooltip>}
                    </Space>
                );
            },
        },
        {
            title: 'Heures', dataIndex: 'hoursVolunteered', key: 'hours', responsive: ['lg'],
            sorter: (a, b) => (a.hoursVolunteered || 0) - (b.hoursVolunteered || 0),
            render: (h: number) => <Space><FieldTimeOutlined style={{ color: '#6366f1' }} /><Text style={{ fontSize: 13 }}>{h ? `${h.toLocaleString()}h` : '0h'}</Text></Space>,
        },
        {
            title: 'Comité', key: 'committee', responsive: ['xl'],
            render: (_, r) => {
                const c = committees.find(cm => cm.id === r.committeeId);
                return c ? <Tag bordered={false} icon={<ApartmentOutlined />} style={{ fontSize: 11 }}>{c.name.replace('Comité ', '').replace('Régional ', '').replace('Local ', '')}</Tag> : <Text style={{ fontSize: 12, color: '#999' }}>—</Text>;
            },
        },
        {
            title: 'Statut', dataIndex: 'accountStatus', key: 'status',
            render: (s: string) => { const cfg = statusCfg[s] || { color: 'default', text: s, icon: null }; return <Tag icon={cfg.icon} color={cfg.color} bordered={false}>{cfg.text}</Tag>; },
        },
        {
            title: 'Actions', key: 'actions', width: 220,
            render: (_, r) => (
                <Space size="small" wrap>
                    <Tooltip title="Voir détails">
                        <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => { setSelectedVol(r); setDetailVisible(true); }} />
                    </Tooltip>
                    {canValidate && r.accountStatus === 'PENDING' && (
                        <>
                            <Popconfirm title="Approuver ce volontaire ?" onConfirm={() => handleApprove(r.id)}>
                                <Button type="link" size="small" loading={actionLoading === r.id} icon={<CheckCircleOutlined />} style={{ color: '#16a34a', padding: '0 4px' }}>Approuver</Button>
                            </Popconfirm>
                            <Popconfirm title="Rejeter ce volontaire ?" onConfirm={() => handleReject(r.id)}>
                                <Button type="link" size="small" loading={actionLoading === r.id} icon={<CloseCircleOutlined />} danger style={{ padding: '0 4px' }}>Rejeter</Button>
                            </Popconfirm>
                        </>
                    )}
                    {canValidate && r.accountStatus === 'APPROVED' && (
                        <Tooltip title="Promouvoir en formateur">
                            <Button type="link" size="small" loading={actionLoading === r.id} icon={<StarOutlined />} onClick={() => openPromote(r)} style={{ padding: '0 4px' }}>Promouvoir</Button>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    // ---- Trainer Columns ----
    const trainerColumns: ColumnsType<TrainerDto> = [
        {
            title: 'Formateur', key: 'name',
            sorter: (a, b) => (a.fullName || '').localeCompare(b.fullName || ''),
            render: (_, r) => (
                <Space>
                    <Avatar style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }} size={38} icon={<StarOutlined />} />
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{r.fullName}</Text>
                        {r.secourismeExpired && <Tag color="red" style={{ marginLeft: 6, fontSize: 10 }}>Secourisme Expiré</Tag>}
                        {r.secourismeExpiringSoon && !r.secourismeExpired && <Tag color="orange" style={{ marginLeft: 6, fontSize: 10 }}>⚠ Expire bientôt</Tag>}
                        <div><Text style={{ fontSize: 11, color: '#999' }}>{r.email}</Text></div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Domaines d\'expertise', key: 'domains',
            render: (_, r) => (
                <Space wrap size={[4, 4]}>
                    {r.expertiseDomains.map(d => (
                        <Tag key={d} color={getDomainColor(d)} bordered={false} style={{ fontSize: 11 }}>{d}</Tag>
                    ))}
                    {r.expertiseDomains.length === 0 && <Text type="secondary">—</Text>}
                </Space>
            ),
        },
        {
            title: 'Date de promotion', key: 'promotedAt',
            render: (_, r) => r.promotedAt ? (
                <Space>
                    <CalendarOutlined style={{ color: '#6366f1' }} />
                    <Text style={{ fontSize: 12 }}>{dayjs(r.promotedAt).format('DD/MM/YYYY')}</Text>
                </Space>
            ) : <Text type="secondary">—</Text>,
            responsive: ['md'],
        },
        {
            title: 'Comité', key: 'committee', responsive: ['lg'],
            render: (_, r) => r.committeeName
                ? <Tag bordered={false} icon={<ApartmentOutlined />} style={{ fontSize: 11 }}>{r.committeeName.replace('Comité ', '')}</Tag>
                : <Text type="secondary">—</Text>,
        },
        {
            title: 'Actions', key: 'actions', width: 160,
            render: (_, r) => canManageTrainers ? (
                <Space size="small">
                    <Tooltip title="Modifier les domaines">
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openTrainerEdit(r)} loading={actionLoading === r.id}>Modifier</Button>
                    </Tooltip>
                    <Popconfirm
                        title={`Retirer le statut formateur de ${r.fullName} ?`}
                        description="Il/elle redeviendra volontaire. Un email d'information lui sera envoyé."
                        onConfirm={() => handleRemoveTrainer(r)}
                        okText="Retirer"
                        cancelText="Annuler"
                        okButtonProps={{ danger: true }}
                    >
                        <Button type="link" size="small" danger icon={<DeleteOutlined />} loading={actionLoading === r.id}>Retirer</Button>
                    </Popconfirm>
                </Space>
            ) : null,
        },
    ];

    // ---- Stats ----
    const approved = volunteers.filter(v => v.accountStatus === 'APPROVED').length;
    const pending = volunteers.filter(v => v.accountStatus === 'PENDING').length;
    const totalHours = volunteers.reduce((s, v) => s + (v.hoursVolunteered || 0), 0);
    const secourismeAlerts = trainers.filter(t => t.secourismeExpired || t.secourismeExpiringSoon).length;

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
                    <Button icon={<ReloadOutlined />} onClick={() => { fetchData(); fetchTrainers(); }} loading={loading}>Actualiser</Button>
                    <Button icon={<DownloadOutlined />}>Exporter</Button>
                </Space>
            </div>

            {/* Secourisme alert banner */}
            {secourismeAlerts > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message={`⚠️ ${secourismeAlerts} formateur(s) avec certification Secourisme expirée ou bientôt expirée`}
                    description="Consultez l'onglet Formateurs pour voir les détails et planifier les recyclages."
                    closable
                    className="mb-5"
                    style={{ borderRadius: 10 }}
                />
            )}

            {/* Stats Row */}
            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { title: 'Total', value: volunteers.length, icon: <TeamOutlined />, color: '#C81E1E' },
                    { title: 'Approuvés', value: approved, icon: <CheckCircleOutlined />, color: '#16a34a' },
                    { title: 'En attente', value: pending, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    { title: 'Formateurs', value: trainers.length, icon: <StarOutlined />, color: '#7c3aed' },
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

            {/* Committee breakdown */}
            {isPresident && committees.length > 0 && (
                <Card size="small" className="mb-5" title={<Space><ApartmentOutlined style={{ color: '#C81E1E' }} /><span>Répartition des Volontaires par Comité</span></Space>} styles={{ body: { padding: '12px 16px' } }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {committees.map(c => (
                            <Tag key={c.id} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, border: 'none', background: 'rgba(200,30,30,0.06)', color: '#C81E1E', fontWeight: 600 }}>
                                {c.name.replace('Comité ', '').replace('Régional ', '').replace('Local ', '')} : {c.totalVolunteers}
                            </Tag>
                        ))}
                    </div>
                </Card>
            )}

            {/* Main Card */}
            <Card styles={{ body: { padding: '16px 20px' } }}>
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                    { key: 'all', label: <Space><TeamOutlined />Tous <Badge count={volunteers.length} style={{ backgroundColor: '#C81E1E' }} /></Space> },
                    { key: 'pending', label: <Space><ClockCircleOutlined />En attente <Badge count={pending} style={{ backgroundColor: '#f59e0b' }} /></Space> },
                    { key: 'approved', label: <Space><CheckCircleOutlined />Approuvés <Badge count={approved} style={{ backgroundColor: '#16a34a' }} /></Space> },
                    { key: 'trainers', label: <Space><StarOutlined />Formateurs <Badge count={trainers.length} style={{ backgroundColor: '#7c3aed' }} /></Space> },
                ]} />

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <Input
                        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                        placeholder={activeTab === 'trainers' ? 'Rechercher par nom, email, domaine...' : 'Rechercher par nom, email, matricule...'}
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        style={{ width: 280 }} allowClear
                    />
                    {activeTab !== 'trainers' && (
                        <Select placeholder="Groupe Sanguin" allowClear style={{ width: 140 }} value={bloodFilter} onChange={setBloodFilter}
                            options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }))}
                        />
                    )}
                    {activeTab !== 'trainers' && (
                        <Input placeholder="Compétence / expertise..." value={skillsFilter} onChange={(e) => setSkillsFilter(e.target.value)} style={{ width: 180 }} allowClear />
                    )}
                    {activeTab === 'all' && (
                        <Select placeholder="Statut" allowClear style={{ width: 150 }} value={statusFilter} onChange={setStatusFilter} suffixIcon={<FilterOutlined />}
                            options={[
                                { value: 'APPROVED', label: <Space><CheckCircleOutlined style={{ color: '#16a34a' }} />Approuvé</Space> },
                                { value: 'PENDING', label: <Space><ClockCircleOutlined style={{ color: '#f59e0b' }} />En attente</Space> },
                                { value: 'REJECTED', label: <Space><CloseCircleOutlined style={{ color: '#ef4444' }} />Rejeté</Space> },
                                { value: 'SUSPENDED', label: <Space><StopOutlined style={{ color: '#999' }} />Suspendu</Space> },
                            ]}
                        />
                    )}
                    {committeeOptions.length > 1 && (
                        <Select placeholder="Comité" allowClear style={{ width: 200 }} value={committeeFilter} onChange={setCommitteeFilter}
                            suffixIcon={<ApartmentOutlined />} options={committeeOptions} showSearch
                            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                        />
                    )}
                    <Text style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                        {activeTab === 'trainers'
                            ? `${filteredTrainers.length} formateur${filteredTrainers.length > 1 ? 's' : ''}`
                            : `${filtered.length} volontaire${filtered.length > 1 ? 's' : ''} · ${totalHours.toLocaleString()}h total`}
                    </Text>
                </div>

                {/* Table */}
                {activeTab === 'trainers' ? (
                    trainersLoading ? (
                        <div className="flex justify-center py-12"><Spin size="large" /></div>
                    ) : filteredTrainers.length > 0 ? (
                        <Table
                            columns={trainerColumns}
                            dataSource={filteredTrainers}
                            rowKey="id"
                            pagination={{ pageSize: 10, showSizeChanger: true }}
                            size="middle"
                            scroll={{ x: 800 }}
                            rowClassName={(r) => r.secourismeExpired ? 'ant-table-row-danger' : r.secourismeExpiringSoon ? 'ant-table-row-warning' : ''}
                        />
                    ) : (
                        <Empty description="Aucun formateur trouvé" />
                    )
                ) : loading ? (
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
                    <Empty description={activeTab === 'pending' ? 'Aucun volontaire en attente' : 'Aucun volontaire trouvé'} />
                )}
            </Card>

            {/* ---- Detail Drawer ---- */}
            <Drawer title={selectedVol ? selectedVol.fullName : 'Détails volontaire'} open={detailVisible} onClose={() => setDetailVisible(false)} width={480}>
                {selectedVol && (
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <Avatar size={64} icon={<UserOutlined />} style={{ backgroundColor: selectedVol.accountStatus === 'APPROVED' ? '#16a34a' : '#f59e0b' }} />
                            <div>
                                <Title level={4} className="!mb-0">{selectedVol.fullName}</Title>
                                <Text type="secondary">{selectedVol.email}</Text>
                                <div className="mt-1">
                                    {(() => { const cfg = statusCfg[selectedVol.accountStatus] || { color: 'default', text: selectedVol.accountStatus, icon: null }; return <Tag icon={cfg.icon} color={cfg.color} bordered={false}>{cfg.text}</Tag>; })()}
                                </div>
                            </div>
                        </div>
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Matricule">{selectedVol.matricule || '—'}</Descriptions.Item>
                            <Descriptions.Item label="CIN">{selectedVol.cin || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Téléphone">{selectedVol.phone || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Groupe Sanguin">{selectedVol.bloodType ? <Tag color="red" style={{ fontWeight: 'bold' }}>{selectedVol.bloodType}</Tag> : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Date d'adhésion">{selectedVol.dateAdhesion || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Heures">{selectedVol.hoursVolunteered ? `${selectedVol.hoursVolunteered}h` : '0h'}</Descriptions.Item>
                            <Descriptions.Item label="Comité">{committees.find(cm => cm.id === selectedVol.committeeId)?.name || selectedVol.committeeId || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Compétences">
                                <Space wrap size={[4, 4]}>
                                    {parseSkills(selectedVol.skills).map((sk) => <Tag key={sk} color="blue" bordered={false}>{sk}</Tag>)}
                                    {parseSkills(selectedVol.skills).length === 0 && '—'}
                                </Space>
                            </Descriptions.Item>
                        </Descriptions>
                        <div className="mt-6" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {selectedVol.accountStatus === 'PENDING' && canValidate && (
                                <>
                                    <Popconfirm title="Approuver ce volontaire ?" onConfirm={() => { handleApprove(selectedVol.id); setDetailVisible(false); }}>
                                        <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#16a34a' }}>Approuver</Button>
                                    </Popconfirm>
                                    <Popconfirm title="Rejeter ce volontaire ?" onConfirm={() => { handleReject(selectedVol.id); setDetailVisible(false); }}>
                                        <Button danger icon={<CloseCircleOutlined />}>Rejeter</Button>
                                    </Popconfirm>
                                </>
                            )}
                            {selectedVol.accountStatus === 'APPROVED' && canValidate && (
                                <Button icon={<StarOutlined />} onClick={() => { setDetailVisible(false); openPromote(selectedVol); }}>Promouvoir formateur</Button>
                            )}
                            {canValidate && (
                                <Button icon={<UserOutlined />} onClick={() => openEdit(selectedVol)}>Modifier les infos</Button>
                            )}
                        </div>
                    </div>
                )}
            </Drawer>

            {/* ---- Promote Modal ---- */}
            <Modal title={`Promouvoir ${promoteVol?.fullName || ''} en formateur`} open={promoteVisible}
                onCancel={() => setPromoteVisible(false)} onOk={handlePromote} confirmLoading={!!actionLoading}
                okText="Promouvoir" cancelText="Annuler">
                <div className="mb-3">
                    <Alert type="info" showIcon message="Un email de félicitation et une notification seront envoyés automatiquement au volontaire." />
                </div>
                <Form form={promoteForm} layout="vertical">
                    <Form.Item name="expertiseDomains" label="Domaines d'expertise"
                        rules={[{ required: true, message: 'Veuillez saisir au moins un domaine' }]}
                        help="Séparez les domaines par des virgules (ex: Secourisme, RCP, PSE2)">
                        <Input.TextArea rows={3} placeholder="Secourisme, RCP, PSE2, Formation" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* ---- Trainer Edit Modal ---- */}
            <Modal title={`Modifier les domaines de ${editingTrainer?.fullName || ''}`} open={trainerEditVisible}
                onCancel={() => setTrainerEditVisible(false)} onOk={handleTrainerEdit} confirmLoading={!!actionLoading}
                okText="Enregistrer" cancelText="Annuler">
                <div className="mb-3">
                    <Alert type="info" showIcon message="Un email de notification sera envoyé au formateur après modification." />
                </div>
                {editingTrainer?.secourismeExpired && (
                    <Alert type="error" showIcon icon={<WarningOutlined />} className="mb-3"
                        message="Certification Secourisme expirée" description="La certification de ce formateur a dépassé les 2 ans." />
                )}
                {editingTrainer?.secourismeExpiringSoon && !editingTrainer?.secourismeExpired && (
                    <Alert type="warning" showIcon icon={<WarningOutlined />} className="mb-3"
                        message="Certification Secourisme bientôt expirée" description="Moins de 30 jours avant expiration." />
                )}
                <Form form={trainerEditForm} layout="vertical">
                    <Form.Item name="domains" label="Domaines d'expertise"
                        rules={[{ required: true, message: 'Veuillez saisir au moins un domaine' }]}
                        help="Séparez les domaines par des virgules (ex: Secourisme, RCP, PSE2)">
                        <Input.TextArea rows={3} placeholder="Secourisme, RCP, PSE2" />
                    </Form.Item>
                    {editingTrainer?.promotedAt && (
                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#666' }}>
                            <CalendarOutlined style={{ marginRight: 6 }} />
                            Formateur depuis le <strong>{dayjs(editingTrainer.promotedAt).format('DD/MM/YYYY')}</strong>
                            {editingTrainer.expertiseDomains.some(d => d.toLowerCase().includes('secourisme')) && (
                                <span> — Expiration Secourisme : <strong style={{ color: editingTrainer.secourismeExpired ? '#e01c2e' : '#D97706' }}>{dayjs(editingTrainer.promotedAt).add(2, 'year').format('DD/MM/YYYY')}</strong></span>
                            )}
                        </div>
                    )}
                </Form>
            </Modal>

            {/* ---- Edit Details Modal ---- */}
            <Modal title={`Modifier les informations de ${editVol?.fullName || ''}`} open={editVisible}
                onCancel={() => setEditVisible(false)} onOk={handleEdit} confirmLoading={!!actionLoading}
                okText="Enregistrer" cancelText="Annuler">
                <Form form={editForm} layout="vertical">
                    <Form.Item name="bloodType" label="Groupe Sanguin">
                        <Select placeholder="Sélectionner le groupe sanguin" allowClear
                            options={['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v => ({ value: v, label: v }))}
                        />
                    </Form.Item>
                    <Form.Item name="skills" label="Compétences / Expertises"
                        help="Séparez les compétences par des virgules (ex: Secourisme, Logistique, Cuisine)">
                        <Input.TextArea rows={3} placeholder="Secourisme, Logistique" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default VolunteersPage;
