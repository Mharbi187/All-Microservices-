// ============================================================
// NEXUS-AID — Mission Assignment Tab
// Create / manage disaster intervention missions with GPS,
// team assignment, materials, notifications and PDF order
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Button, Col, DatePicker, Form, Input, Modal, Row, Select, Space,
    Spin, Statistic, Tag, Typography, message, Checkbox, Divider,
    Tooltip, Badge, Empty, Popconfirm, Transfer, Alert
} from 'antd';
import type { TransferProps } from 'antd';
import {
    PlusOutlined, ReloadOutlined, EnvironmentOutlined, BellOutlined,
    FilePdfOutlined, EditOutlined, DeleteOutlined, UserOutlined,
    ClockCircleOutlined, TeamOutlined, ToolOutlined, CheckCircleOutlined,
    ExclamationCircleOutlined, StopOutlined, CalendarOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import LocationMapPicker from './LocationMapPicker';
import type { GpsLocation } from './LocationMapPicker';
import { useAuthStore } from '@/stores';
import { catastropheService } from '@/services/catastropheService';
import type {
    DisasterMissionDTO,
    DisasterTeamMemberDTO,
    MissionType,
    AssignedVolunteerEntry,
} from '@/types';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface MissionAssignmentTabProps {
    isDark: boolean;
    onGeneratePdf?: (mission: DisasterMissionDTO) => void;
}

const MISSION_TYPES: { value: MissionType; label: string; color: string }[] = [
    { value: 'SECOURS', label: 'Secours', color: '#e01c2e' },
    { value: 'EVACUATION', label: 'Évacuation', color: '#fa8c16' },
    { value: 'LOGISTIQUE', label: 'Logistique', color: '#1890ff' },
    { value: 'MEDICAL', label: 'Médical', color: '#52c41a' },
    { value: 'SURVEILLANCE', label: 'Surveillance', color: '#722ed1' },
];

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    PLANNED: { color: 'blue', label: 'Planifiée', icon: <CalendarOutlined /> },
    IN_PROGRESS: { color: 'orange', label: 'En cours', icon: <ClockCircleOutlined /> },
    COMPLETED: { color: 'green', label: 'Terminée', icon: <CheckCircleOutlined /> },
    CANCELLED: { color: 'red', label: 'Annulée', icon: <StopOutlined /> },
};

const MATERIALS_LIST = [
    'Radio VHF', 'Trousse de secours', 'Véhicule 4x4', 'Tentes (2 pers.)',
    'Eau potable (20L)', 'Nourriture (ration 24h)', 'Couvertures', 'Lampes torche',
    'Générateur', 'Gilets haute visibilité', 'Masques FFP2', 'Gants chirurgicaux',
    'Civière', 'Défibrillateur (DEA)', 'Extincteur', 'Cordes & harnais',
    'GPS portable', 'Kit communication satellite', 'Médicaments basiques', 'Oxygène médical'
];

const MissionAssignmentTab: React.FC<MissionAssignmentTabProps> = ({ isDark, onGeneratePdf }) => {
    const user = useAuthStore((s) => s.user);
    const [missions, setMissions] = useState<DisasterMissionDTO[]>([]);
    const [teamMembers, setTeamMembers] = useState<DisasterTeamMemberDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMission, setEditingMission] = useState<DisasterMissionDTO | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [notifying, setNotifying] = useState<string | null>(null);
    const [selectedVolunteers, setSelectedVolunteers] = useState<string[]>([]);
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
    const [gpsValue, setGpsValue] = useState({ lat: '', lng: '', address: '' });
    const [form] = Form.useForm();

    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const committeeId = user?.committeeId ?? '';

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [mData, tData] = await Promise.all([
                isNational
                    ? catastropheService.getAllMissions()
                    : catastropheService.getMissionsByCommittee(committeeId),
                catastropheService.getTeamMembers(isNational ? undefined : committeeId),
            ]);
            setMissions(mData);
            setTeamMembers(tData);
        } catch {
            message.error('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    }, [committeeId, isNational]);

    useEffect(() => { void load(); }, [load]);

    const openCreate = () => {
        setEditingMission(null);
        setSelectedVolunteers([]);
        setSelectedMaterials([]);
        setGpsValue({ lat: '', lng: '', address: '' });
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (mission: DisasterMissionDTO) => {
        setEditingMission(mission);
        setSelectedVolunteers(mission.assignedVolunteers?.map(v => v.volunteerId) ?? []);
        setSelectedMaterials(mission.requiredMaterials ?? []);
        setGpsValue({
            lat: String(mission.locationGps?.lat ?? ''),
            lng: String(mission.locationGps?.lng ?? ''),
            address: mission.locationGps?.address ?? '',
        });
        form.setFieldsValue({
            title: mission.title,
            description: mission.description,
            missionType: mission.missionType,
            instructions: mission.instructions,
            teamChiefId: mission.teamChiefId,
            startDatetime: mission.startDatetime ? dayjs(mission.startDatetime) : null,
            endDatetime: mission.endDatetime ? dayjs(mission.endDatetime) : null,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (values: Record<string, unknown>) => {
        setSubmitting(true);
        try {
            const chief = teamMembers.find(m => m.volunteerId === values.teamChiefId);
            const assigned: AssignedVolunteerEntry[] = selectedVolunteers.map(vid => {
                const member = teamMembers.find(m => m.volunteerId === vid);
                return {
                    volunteerId: vid,
                    fullName: member?.fullName ?? vid,
                    teamType: member?.committeeType === 'NATIONAL' ? 'NDRT' : 'RDRT',
                    matricule: member?.matricule,
                    committeeId: member?.committeeId,
                    committeeName: member?.committeeName,
                    phone: member?.phone,
                };
            });

            const payload: DisasterMissionDTO = {
                title: values.title as string,
                description: values.description as string,
                missionType: values.missionType as MissionType,
                instructions: values.instructions as string,
                teamChiefId: values.teamChiefId as string,
                teamChiefName: chief?.fullName,
                committeeId,
                startDatetime: (values.startDatetime as dayjs.Dayjs).toISOString(),
                endDatetime: values.endDatetime ? (values.endDatetime as dayjs.Dayjs).toISOString() : undefined,
                locationGps: gpsValue.lat && gpsValue.lng
                    ? { lat: Number(gpsValue.lat), lng: Number(gpsValue.lng), address: gpsValue.address }
                    : undefined,
                assignedVolunteers: assigned,
                requiredMaterials: selectedMaterials,
            };

            if (editingMission?.id) {
                await catastropheService.updateMission(editingMission.id, payload);
                message.success('Mission mise à jour');
            } else {
                await catastropheService.createMission(payload);
                message.success('Mission créée avec succès');
            }

            setModalOpen(false);
            void load();
        } catch {
            message.error('Erreur lors de la sauvegarde');
        } finally {
            setSubmitting(false);
        }
    };

    const handleNotify = async (missionId: string, sendEmail: boolean) => {
        setNotifying(missionId);
        try {
            await catastropheService.notifyVolunteers(missionId, sendEmail);
            message.success('Notifications envoyées aux volontaires assignés');
            void load();
        } catch {
            message.error('Erreur lors de l\'envoi des notifications');
        } finally {
            setNotifying(null);
        }
    };

    const handleStatusChange = async (missionId: string, status: string) => {
        try {
            await catastropheService.updateStatus(missionId, status);
            message.success('Statut mis à jour');
            void load();
        } catch {
            message.error('Erreur lors de la mise à jour du statut');
        }
    };

    const cardStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        padding: 20,
    };

    const statsData = [
        { label: 'Planifiées', value: missions.filter(m => m.status === 'PLANNED').length, color: '#1890ff' },
        { label: 'En cours', value: missions.filter(m => m.status === 'IN_PROGRESS').length, color: '#fa8c16' },
        { label: 'Terminées', value: missions.filter(m => m.status === 'COMPLETED').length, color: '#52c41a' },
        { label: 'Total missions', value: missions.length, color: '#e01c2e' },
    ];

    // Transfer data for volunteer selection
    const transferData: TransferProps['dataSource'] = teamMembers.map(m => ({
        key: m.volunteerId,
        title: `${m.fullName} (${m.committeeType === 'NATIONAL' ? 'NDRT' : 'RDRT'} — ${m.committeeName ?? '?'})`,
        description: m.matricule ?? '',
    }));

    return (
        <div style={{ padding: '24px 0' }}>
            {/* Stats Row */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                {statsData.map((stat, i) => (
                    <Col xs={12} lg={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                            <div style={{ ...cardStyle, textAlign: 'center' }}>
                                <Statistic
                                    title={<Text type="secondary" style={{ fontSize: 12 }}>{stat.label}</Text>}
                                    value={stat.value}
                                    valueStyle={{ fontSize: 26, fontWeight: 800, color: stat.color }}
                                />
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Toolbar */}
            <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <Title level={5} style={{ margin: 0 }}>
                    <TeamOutlined style={{ marginRight: 8, color: '#e01c2e' }} />
                    Missions d'Intervention
                </Title>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
                        Actualiser
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openCreate}
                        style={{
                            background: 'linear-gradient(135deg,#e01c2e,#c0152a)',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 600,
                        }}
                    >
                        Nouvelle Mission
                    </Button>
                </Space>
            </div>

            {/* Mission Cards */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}><Text type="secondary">Chargement des missions...</Text></div>
                </div>
            ) : missions.length === 0 ? (
                <div style={cardStyle}>
                    <Empty description="Aucune mission créée" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}
                            style={{ background: 'linear-gradient(135deg,#e01c2e,#c0152a)', border: 'none' }}>
                            Créer la première mission
                        </Button>
                    </Empty>
                </div>
            ) : (
                <Row gutter={[16, 16]}>
                    <AnimatePresence>
                        {missions.map((mission, idx) => {
                            const statusCfg = STATUS_CONFIG[mission.status ?? 'PLANNED'] ?? STATUS_CONFIG.PLANNED;
                            const mType = MISSION_TYPES.find(t => t.value === mission.missionType);
                            return (
                                <Col xs={24} md={12} xl={8} key={mission.id ?? idx}>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.96 }}
                                        transition={{ delay: idx * 0.05 }}
                                    >
                                        <div style={{
                                            ...cardStyle,
                                            padding: 0,
                                            overflow: 'hidden',
                                            transition: 'box-shadow 0.2s',
                                        }}>
                                            {/* Card Header */}
                                            <div style={{
                                                background: `linear-gradient(135deg, ${mType?.color ?? '#e01c2e'}20, ${mType?.color ?? '#e01c2e'}08)`,
                                                borderBottom: `1px solid ${mType?.color ?? '#e01c2e'}30`,
                                                padding: '16px 20px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'flex-start',
                                            }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                        <Tag color={mType?.color ?? 'red'} style={{ borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                                                            {mType?.label ?? mission.missionType}
                                                        </Tag>
                                                        <Tag icon={statusCfg.icon} color={statusCfg.color} style={{ borderRadius: 6, fontSize: 11 }}>
                                                            {statusCfg.label}
                                                        </Tag>
                                                        {mission.notificationSent && (
                                                            <Tag icon={<BellOutlined />} color="purple" style={{ borderRadius: 6, fontSize: 11 }}>
                                                                Notifié
                                                            </Tag>
                                                        )}
                                                    </div>
                                                    <Text strong style={{ fontSize: 15, display: 'block' }}>
                                                        {mission.title}
                                                    </Text>
                                                    {mission.missionNumber && (
                                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                                            N° {mission.missionNumber}
                                                        </Text>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Card Body */}
                                            <div style={{ padding: '14px 20px' }}>
                                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                    {/* Dates */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <ClockCircleOutlined style={{ color: '#e01c2e', fontSize: 13 }} />
                                                        <Text style={{ fontSize: 12 }}>
                                                            {mission.startDatetime
                                                                ? dayjs(mission.startDatetime).format('DD/MM/YYYY HH:mm')
                                                                : '—'}
                                                            {mission.endDatetime && (
                                                                <> → {dayjs(mission.endDatetime).format('DD/MM/YYYY HH:mm')}</>
                                                            )}
                                                        </Text>
                                                    </div>

                                                    {/* Location */}
                                                    {mission.locationGps && (
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                                            <EnvironmentOutlined style={{ color: '#e01c2e', fontSize: 13, marginTop: 2 }} />
                                                            <Text style={{ fontSize: 12, flex: 1 }}>
                                                                {mission.locationGps.address || `${mission.locationGps.lat}, ${mission.locationGps.lng}`}
                                                            </Text>
                                                        </div>
                                                    )}

                                                    {/* Team chief */}
                                                    {mission.teamChiefName && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <UserOutlined style={{ color: '#e01c2e', fontSize: 13 }} />
                                                            <Text style={{ fontSize: 12 }}>
                                                                Chef: <strong>{mission.teamChiefName}</strong>
                                                            </Text>
                                                        </div>
                                                    )}

                                                    {/* Volunteers count */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <TeamOutlined style={{ color: '#e01c2e', fontSize: 13 }} />
                                                        <Text style={{ fontSize: 12 }}>
                                                            {mission.assignedVolunteers?.length ?? 0} volontaire(s) assigné(s)
                                                        </Text>
                                                    </div>

                                                    {/* Materials count */}
                                                    {(mission.requiredMaterials?.length ?? 0) > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <ToolOutlined style={{ color: '#e01c2e', fontSize: 13 }} />
                                                            <Text style={{ fontSize: 12 }}>
                                                                {mission.requiredMaterials!.length} matériel(s) requis
                                                            </Text>
                                                        </div>
                                                    )}
                                                </Space>
                                            </div>

                                            {/* Card Footer — Actions */}
                                            <div style={{
                                                padding: '12px 16px',
                                                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                                                display: 'flex',
                                                gap: 6,
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                            }}>
                                                {/* Status quick actions */}
                                                {mission.status === 'PLANNED' && (
                                                    <Tooltip title="Démarrer la mission">
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={<CheckCircleOutlined />}
                                                            style={{ background: '#fa8c16', border: 'none', borderRadius: 6, fontSize: 11 }}
                                                            onClick={() => mission.id && void handleStatusChange(mission.id, 'IN_PROGRESS')}
                                                        >
                                                            Démarrer
                                                        </Button>
                                                    </Tooltip>
                                                )}
                                                {mission.status === 'IN_PROGRESS' && (
                                                    <Tooltip title="Terminer la mission">
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={<CheckCircleOutlined />}
                                                            style={{ background: '#52c41a', border: 'none', borderRadius: 6, fontSize: 11 }}
                                                            onClick={() => mission.id && void handleStatusChange(mission.id, 'COMPLETED')}
                                                        >
                                                            Terminer
                                                        </Button>
                                                    </Tooltip>
                                                )}

                                                <Tooltip title="Modifier">
                                                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(mission)} style={{ borderRadius: 6 }}>
                                                        Modifier
                                                    </Button>
                                                </Tooltip>

                                                <Tooltip title="Notifier les volontaires">
                                                    <Button
                                                        size="small"
                                                        icon={<BellOutlined />}
                                                        loading={notifying === mission.id}
                                                        onClick={() => mission.id && void handleNotify(mission.id, true)}
                                                        style={{ borderRadius: 6, color: '#722ed1', borderColor: '#722ed1' }}
                                                    >
                                                        Notifier
                                                    </Button>
                                                </Tooltip>

                                                <Tooltip title="Télécharger l'ordre de mission PDF">
                                                    <Button
                                                        size="small"
                                                        icon={<FilePdfOutlined />}
                                                        onClick={() => onGeneratePdf?.(mission)}
                                                        style={{ borderRadius: 6, color: '#e01c2e', borderColor: '#e01c2e' }}
                                                    >
                                                        PDF
                                                    </Button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </motion.div>
                                </Col>
                            );
                        })}
                    </AnimatePresence>
                </Row>
            )}

            {/* Create / Edit Mission Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg,#e01c2e,#c0152a)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 16
                        }}>
                            <TeamOutlined />
                        </div>
                        <span>{editingMission ? 'Modifier la Mission' : 'Nouvelle Mission d\'Intervention'}</span>
                    </div>
                }
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={820}
                destroyOnClose
                style={{ top: 20 }}
                styles={{ body: { maxHeight: '80vh', overflowY: 'auto', padding: '20px 24px' } }}
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Row gutter={16}>
                        <Col span={16}>
                            <Form.Item label="Titre de la mission" name="title"
                                rules={[{ required: true, message: 'Titre requis' }]}>
                                <Input placeholder="Ex: Intervention inondation Oued Wifak" style={{ borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Type de mission" name="missionType"
                                rules={[{ required: true, message: 'Type requis' }]}>
                                <Select placeholder="Sélectionner" style={{ borderRadius: 8 }}>
                                    {MISSION_TYPES.map(t => (
                                        <Option key={t.value} value={t.value}>
                                            <Tag color={t.color} style={{ marginRight: 6 }}>{t.label}</Tag>
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item label="Description" name="description">
                        <TextArea rows={2} placeholder="Description de la situation et objectifs de la mission..." style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Date & heure de début" name="startDatetime"
                                rules={[{ required: true, message: 'Date de début requise' }]}>
                                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%', borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Date & heure de fin (prévue)" name="endDatetime">
                                <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%', borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* GPS Location — Interactive Map Picker */}
                    <Divider style={{ margin: '12px 0' }}>
                        <EnvironmentOutlined style={{ marginRight: 6, color: '#e01c2e' }} />
                        Localisation de la Mission
                    </Divider>
                    <Form.Item>
                        <LocationMapPicker
                            value={gpsValue}
                            onChange={setGpsValue}
                            isDark={isDark}
                        />
                    </Form.Item>

                    {/* Team Assignment */}
                    <Divider style={{ margin: '12px 0' }}>
                        <TeamOutlined style={{ marginRight: 6, color: '#e01c2e' }} />
                        Assignation des Volontaires (NDRT/RDRT)
                    </Divider>
                    <Form.Item label="Sélectionner les volontaires">
                        <Transfer
                            dataSource={transferData}
                            showSearch
                            targetKeys={selectedVolunteers}
                            onChange={(keys) => setSelectedVolunteers(keys as string[])}
                            render={item => item.title ?? ''}
                            listStyle={{ width: '100%', height: 220 }}
                            titles={['Disponibles', 'Assignés']}
                            filterOption={(search, item) =>
                                (item.title ?? '').toLowerCase().includes(search.toLowerCase())
                            }
                        />
                    </Form.Item>

                    <Form.Item label="Chef d'équipe" name="teamChiefId">
                        <Select
                            placeholder="Sélectionner le chef d'équipe parmi les assignés"
                            allowClear
                            style={{ borderRadius: 8 }}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            options={teamMembers
                                .filter(m => selectedVolunteers.includes(m.volunteerId))
                                .map(m => ({ value: m.volunteerId, label: m.fullName }))}
                        />
                    </Form.Item>

                    {/* Materials */}
                    <Divider style={{ margin: '12px 0' }}>
                        <ToolOutlined style={{ marginRight: 6, color: '#e01c2e' }} />
                        Matériel Requis
                    </Divider>
                    <Form.Item label="Sélectionner le matériel nécessaire">
                        <Checkbox.Group
                            value={selectedMaterials}
                            onChange={(vals) => setSelectedMaterials(vals as string[])}
                        >
                            <Row gutter={[8, 8]}>
                                {MATERIALS_LIST.map(mat => (
                                    <Col span={12} key={mat}>
                                        <Checkbox value={mat} style={{ fontSize: 13 }}>{mat}</Checkbox>
                                    </Col>
                                ))}
                            </Row>
                        </Checkbox.Group>
                    </Form.Item>

                    {/* Instructions */}
                    <Form.Item label="Instructions & Notes de terrain" name="instructions">
                        <TextArea rows={3} placeholder="Instructions opérationnelles, points de rassemblement, contacts locaux, protocoles de sécurité..." style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 8 }}>
                        <Button onClick={() => setModalOpen(false)} style={{ borderRadius: 8 }}>
                            Annuler
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitting}
                            icon={<CheckCircleOutlined />}
                            style={{
                                background: 'linear-gradient(135deg,#e01c2e,#c0152a)',
                                border: 'none',
                                borderRadius: 8,
                                fontWeight: 600,
                                minWidth: 140,
                            }}
                        >
                            {editingMission ? 'Mettre à jour' : 'Créer la Mission'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default MissionAssignmentTab;
