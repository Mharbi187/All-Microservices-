// ============================================================
// NEXUS-AID — Teams Management Tab (NDRT/RDRT)
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import {
    Table, Input, Button, Tag, Space, Typography, Statistic, Row, Col,
    Avatar, Tooltip, message, Select, Spin, Empty, Popconfirm, Modal, Form
} from 'antd';
import {
    TeamOutlined, SearchOutlined, ReloadOutlined, UserOutlined,
    MailOutlined, PhoneOutlined, IdcardOutlined, BankOutlined,
    CheckCircleOutlined, PlusOutlined, EditOutlined, StopOutlined, DeleteOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores';
import { catastropheService } from '@/services/catastropheService';
import type { DisasterTeamMemberDTO } from '@/types';

const { Text } = Typography;
const { Option } = Select;

interface TeamsManagementTabProps {
    isDark: boolean;
}

const TeamsManagementTab: React.FC<TeamsManagementTabProps> = ({ isDark }) => {
    const user = useAuthStore((s) => s.user);
    const [members, setMembers] = useState<DisasterTeamMemberDTO[]>([]);
    const [availableVolunteers, setAvailableVolunteers] = useState<any[]>([]);
    const [filtered, setFiltered] = useState<DisasterTeamMemberDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');

    // Modals state
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const committeeId = isNational ? undefined : user?.committeeId;

    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await catastropheService.getTeamMembers(committeeId);
            setMembers(data);
            setFiltered(data);
            
            // Also fetch available volunteers
            const volunteers = await catastropheService.getAvailableVolunteers(committeeId);
            setAvailableVolunteers(volunteers);
        } catch {
            message.error('Erreur lors du chargement des membres');
        } finally {
            setLoading(false);
        }
    }, [committeeId]);

    useEffect(() => { void fetchMembers(); }, [fetchMembers]);

    useEffect(() => {
        let result = [...members];
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(m =>
                m.fullName.toLowerCase().includes(q) ||
                (m.matricule ?? '').toLowerCase().includes(q) ||
                (m.email ?? '').toLowerCase().includes(q) ||
                (m.committeeName ?? '').toLowerCase().includes(q)
            );
        }
        if (typeFilter !== 'ALL') {
            result = result.filter(m => m.teamType === typeFilter);
        }
        setFiltered(result);
    }, [search, typeFilter, members]);

    const handleAddMember = async (values: any) => {
        setSubmitting(true);
        try {
            await catastropheService.addTeamMember(values.volunteerId, values.teamType, values.specialty);
            message.success('Membre ajouté avec succès ! Un e-mail de notification a été envoyé.');
            setIsAddModalVisible(false);
            form.resetFields();
            fetchMembers();
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Erreur lors de l\'ajout du membre');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            await catastropheService.updateTeamMemberStatus(id, newStatus);
            message.success('Statut mis à jour avec succès.');
            fetchMembers();
        } catch {
            message.error('Erreur lors de la mise à jour du statut.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await catastropheService.deleteTeamMember(id);
            message.success('Membre retiré de l\'équipe.');
            fetchMembers();
        } catch {
            message.error('Erreur lors de la suppression.');
        }
    };

    const cardStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        padding: 20,
    };

    const columns: ColumnsType<DisasterTeamMemberDTO> = [
        {
            title: 'Membre',
            key: 'member',
            render: (_, rec) => (
                <Space>
                    <Avatar
                        size={38}
                        icon={<UserOutlined />}
                        style={{ background: 'linear-gradient(135deg,#e01c2e,#c0152a)', flexShrink: 0 }}
                    />
                    <div>
                        <Text strong style={{ fontSize: 14 }}>{rec.fullName}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <IdcardOutlined style={{ marginRight: 4 }} />
                            {rec.matricule ?? '—'}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Contact',
            key: 'contact',
            render: (_, rec) => (
                <Space direction="vertical" size={2}>
                    {rec.email && (
                        <Text style={{ fontSize: 12 }}>
                            <MailOutlined style={{ marginRight: 4, color: '#e01c2e' }} />
                            {rec.email}
                        </Text>
                    )}
                    {rec.phone && (
                        <Text style={{ fontSize: 12 }}>
                            <PhoneOutlined style={{ marginRight: 4, color: '#52c41a' }} />
                            {rec.phone}
                        </Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Comité / Équipe',
            key: 'committee',
            render: (_, rec) => (
                <Space direction="vertical" size={2}>
                    <Text style={{ fontSize: 13 }}>
                        <BankOutlined style={{ marginRight: 4, color: '#e01c2e' }} />
                        {rec.committeeName ?? '—'}
                    </Text>
                    <Tag
                        color={rec.teamType === 'NDRT' ? 'red' : 'orange'}
                        style={{ fontSize: 10, borderRadius: 4 }}
                    >
                        {rec.teamType}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Spécialité',
            dataIndex: 'specialty',
            key: 'specialty',
            render: (text) => <Text strong>{text || '—'}</Text>
        },
        {
            title: 'Statut',
            key: 'status',
            align: 'center' as const,
            render: (_, rec) => (
                <Tag
                    icon={rec.status === 'ACTIVE' ? <CheckCircleOutlined /> : <StopOutlined />}
                    color={rec.status === 'ACTIVE' ? 'success' : 'error'}
                    style={{ borderRadius: 6, fontWeight: 600 }}
                >
                    {rec.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                </Tag>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            align: 'right' as const,
            render: (_, rec) => (
                <Space size="small">
                    {rec.status === 'ACTIVE' ? (
                        <Popconfirm title="Suspendre ce membre ?" onConfirm={() => handleUpdateStatus(rec.id, 'SUSPENDED')}>
                            <Tooltip title="Suspendre"><Button size="small" icon={<StopOutlined />} danger /></Tooltip>
                        </Popconfirm>
                    ) : (
                        <Popconfirm title="Réactiver ce membre ?" onConfirm={() => handleUpdateStatus(rec.id, 'ACTIVE')}>
                            <Tooltip title="Réactiver"><Button size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }} /></Tooltip>
                        </Popconfirm>
                    )}
                    <Popconfirm title="Retirer définitivement ce membre de l'équipe ?" onConfirm={() => handleDelete(rec.id)}>
                        <Tooltip title="Supprimer"><Button size="small" icon={<DeleteOutlined />} danger type="text" /></Tooltip>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const ndrtCount = members.filter(m => m.teamType === 'NDRT').length;
    const rdrtCount = members.filter(m => m.teamType === 'RDRT').length;
    const activeCount = members.filter(m => m.status === 'ACTIVE').length;

    return (
        <div style={{ padding: '24px 0' }}>
            {/* Stats */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                {[
                    { title: 'Total Membres', value: members.length, color: '#e01c2e', icon: <TeamOutlined /> },
                    { title: 'Équipe Nationale (NDRT)', value: ndrtCount, color: '#1890ff', icon: <UserOutlined /> },
                    { title: 'Équipes Régionales/Locales (RDRT)', value: rdrtCount, color: '#fa8c16', icon: <TeamOutlined /> },
                    { title: 'Membres Actifs', value: activeCount, color: '#52c41a', icon: <CheckCircleOutlined /> },
                ].map((stat, i) => (
                    <Col xs={24} sm={12} lg={6} key={i}>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                        >
                            <div style={{ ...cardStyle, textAlign: 'center' }}>
                                <div style={{
                                    width: 44, height: 44, borderRadius: 12,
                                    background: `${stat.color}18`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto 12px', fontSize: 20, color: stat.color
                                }}>
                                    {stat.icon}
                                </div>
                                <Statistic
                                    title={<Text type="secondary" style={{ fontSize: 12 }}>{stat.title}</Text>}
                                    value={stat.value}
                                    valueStyle={{ fontSize: 24, fontWeight: 800, color: stat.color }}
                                />
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Filters & Actions */}
            <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <Input
                    placeholder="Rechercher par nom, matricule, comité..."
                    prefix={<SearchOutlined style={{ color: '#e01c2e' }} />}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, minWidth: 220, borderRadius: 10 }}
                    allowClear
                />
                <Select
                    value={typeFilter}
                    onChange={setTypeFilter}
                    style={{ width: 200, borderRadius: 10 }}
                >
                    <Option value="ALL">Toutes les équipes</Option>
                    <Option value="NDRT">National (NDRT)</Option>
                    <Option value="RDRT">Régional/Local (RDRT)</Option>
                </Select>
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => void fetchMembers()}
                    loading={loading}
                    style={{ borderRadius: 10 }}
                >
                    Actualiser
                </Button>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsAddModalVisible(true)}
                    style={{ borderRadius: 10, background: 'linear-gradient(135deg,#e01c2e,#c0152a)', border: 'none' }}
                >
                    Nouveau Membre
                </Button>
            </div>

            {/* Table */}
            <div style={cardStyle}>
                {loading ? (
                    <div style={{ padding: '60px 0', textAlign: 'center' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16, color: '#888' }}>Chargement des membres...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={search || typeFilter !== 'ALL' ? "Aucun membre ne correspond à vos critères." : "Aucun membre dans l'équipe d'intervention."}
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={filtered}
                        rowKey="id"
                        pagination={{ pageSize: 15, showSizeChanger: false }}
                        scroll={{ x: 'max-content' }}
                        size="middle"
                    />
                )}
            </div>

            {/* Add Member Modal */}
            <Modal
                title="Ajouter un membre à l'équipe d'intervention"
                open={isAddModalVisible}
                onCancel={() => { setIsAddModalVisible(false); form.resetFields(); }}
                footer={null}
                centered
            >
                <Form form={form} layout="vertical" onFinish={handleAddMember}>
                    <Form.Item
                        name="volunteerId"
                        label="Sélectionner un volontaire"
                        rules={[{ required: true, message: 'Veuillez sélectionner un volontaire' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Rechercher un volontaire (nom ou matricule)"
                            optionFilterProp="label"
                            options={availableVolunteers.map(v => ({
                                value: v.volunteerId,
                                label: `${v.fullName} (${v.matricule || 'Sans matricule'}) - ${v.committeeName}`
                            }))}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="teamType"
                                label="Type d'équipe"
                                rules={[{ required: true, message: 'Requis' }]}
                            >
                                <Select placeholder="NDRT / RDRT">
                                    <Option value="NDRT">NDRT (National)</Option>
                                    <Option value="RDRT">RDRT (Régional/Local)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="specialty"
                                label="Spécialité (Rôle)"
                                rules={[{ required: true, message: 'Requis' }]}
                            >
                                <Input placeholder="ex: Secouriste, Logisticien..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ marginTop: 24, textAlign: 'right' }}>
                        <Button onClick={() => setIsAddModalVisible(false)} style={{ marginRight: 8 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#e01c2e' }}>
                            Ajouter
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default TeamsManagementTab;
