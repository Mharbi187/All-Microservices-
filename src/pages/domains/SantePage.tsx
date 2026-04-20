// ============================================================
// NEXUS-AID — Santé Page (RESP_SANTE)
// Health actions & blood donations management
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Form, Input, Select, App, DatePicker, InputNumber, Avatar, Progress, Tooltip
} from 'antd';
import {
    HeartOutlined, PlusOutlined, MedicineBoxOutlined,
    ExperimentOutlined, GlobalOutlined, CheckCircleOutlined,
    InfoCircleOutlined, FilterOutlined, SettingOutlined,
    EnvironmentOutlined, TeamOutlined, RiseOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { santeService } from '@/services/domainServices';
import type { HealthActionDTO, BloodDonationDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SantePage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('actions');
    const [actions, setActions] = useState<HealthActionDTO[]>([]);
    const [donations, setDonations] = useState<BloodDonationDTO[]>([]);

    // Modal states
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [actionForm] = Form.useForm();
    const [donationForm] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [acts, dons] = await Promise.all([
                user?.committeeId ? santeService.getActions(user.committeeId).catch(() => []) : Promise.resolve([]),
                santeService.getBloodDonations().catch(() => []),
            ]);
            setActions(acts || []);
            setDonations(dons || []);
        } catch (error) {
            console.error("Failed to load sante data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.committeeId]);

    const handleCreateAction = async (values: any) => {
        if (!user?.committeeId) {
            messageApi.error('Erreur: impossible de déterminer votre comité.');
            return;
        }
        setSubmitLoading(true);
        try {
            const payload: HealthActionDTO = {
                title: values.title,
                type: values.type,
                date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
                location: values.location,
                beneficiaries: values.beneficiaries,
                status: values.status || 'PLANNED',
                description: values.description
            };
            await santeService.createAction(user.committeeId, payload);
            messageApi.success('Action sanitaire planifiée avec succès !');
            setIsActionModalOpen(false);
            actionForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la création de l\'action sanitaire.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateDonation = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: BloodDonationDTO = {
                bloodType: values.bloodType,
                donationDate: values.donationDate ? values.donationDate.format('YYYY-MM-DD') : undefined,
                quantity: values.quantity,
                collectionCenter: values.collectionCenter,
                zone: values.zone,
                status: 'ACCEPTED',
                donorId: values.donorId || null
            };
            await santeService.createBloodDonation(payload);
            messageApi.success('Don de sang enregistré avec succès !');
            setIsDonationModalOpen(false);
            donationForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'enregistrement du don.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const actColumns: ColumnsType<HealthActionDTO> = [
        {
            title: 'ACTION SANITAIRE',
            key: 'title',
            render: (_, record) => (
                <Space size={16}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: isDark ? 'rgba(14,165,233,0.1)' : '#f0f9ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0ea5e9', border: `1px solid ${isDark ? 'rgba(14,165,233,0.2)' : '#e0f2fe'}`
                    }}>
                        <MedicineBoxOutlined style={{ fontSize: 20 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{record.title || record.type}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <EnvironmentOutlined style={{ marginRight: 4 }} />
                            {record.location || 'Terrain'}
                        </Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'BÉNÉFICIAIRES',
            dataIndex: 'beneficiaries',
            key: 'beneficiaries',
            render: (b) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text strong style={{ fontSize: 15 }}>{b || 0}</Text>
                    <div style={{ width: 80 }}>
                        <Progress
                            percent={Math.min((b / 200) * 100, 100)}
                            size="small"
                            showInfo={false}
                            strokeColor="#0ea5e9"
                        />
                    </div>
                </div>
            )
        },
        {
            title: 'PLANIFICATION',
            dataIndex: 'date',
            key: 'date',
            render: (d) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong>{d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'À venir'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{d ? new Date(d).getFullYear() : ''}</Text>
                </div>
            )
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag color={s === 'COMPLETED' ? 'success' : 'processing'} style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>
                    {s}
                </Tag>
            )
        }
    ];

    const donColumns: ColumnsType<BloodDonationDTO> = [
        {
            title: 'GROUPE',
            dataIndex: 'bloodType',
            key: 'bloodType',
            render: (t) => (
                <Space size={12}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, fontWeight: 800,
                        boxShadow: '0 4px 10px rgba(239,68,68,0.3)'
                    }}>
                        {t}
                    </div>
                    <Text strong>{t}</Text>
                </Space>
            )
        },
        {
            title: 'VOLUME',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (q) => <Text strong style={{ fontSize: 15 }}>{q} <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>ml</Text></Text>
        },
        {
            title: 'CENTRE DE COLLECTE',
            dataIndex: 'collectionCenter',
            key: 'collectionCenter',
            render: (c) => <Text style={{ fontSize: 13 }}>{c}</Text>
        },
        {
            title: 'RÉGION',
            dataIndex: 'zone',
            key: 'zone',
            render: (z) => <Tag style={{ borderRadius: 6 }}>{z || 'TN'}</Tag>
        }
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement de l'unité santé...</Text>
        </div>
    );

    const glassStyle = {
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.06)',
        overflow: 'hidden'
    };

    return (
        <div style={{ padding: '0 40px 40px 40px', maxWidth: 1600, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {/* UNIFIED CONTAINER */}
                <div style={glassStyle}>
                    <Row gutter={0}>
                        {/* LEFT SIDEBAR (30%) */}
                        <Col xs={24} lg={7} style={{
                            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                            background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.5)',
                            padding: 40
                        }}>
                            <div style={{ position: 'sticky', top: 40 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                                    <div style={{
                                        width: 60, height: 60, borderRadius: 20,
                                        background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28, boxShadow: '0 12px 24px rgba(14,165,233,0.25)'
                                    }}>
                                        🏥
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Santé</Title>
                                        <Tag color="blue" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontSize: 11, fontWeight: 700 }}>
                                            NATIONAL
                                        </Tag>
                                    </div>
                                </div>

                                {/* OPERATIONAL STATS */}
                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(14,165,233,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(14,165,233,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
                                                <MedicineBoxOutlined />
                                            </div>
                                            <RiseOutlined style={{ color: '#0ea5e9', fontSize: 20 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Actions Sanitaires</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{actions.length} Missions</Title>
                                    </div>

                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(239,68,68,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                                <ExperimentOutlined />
                                            </div>
                                            <HeartOutlined style={{ color: '#ef4444', fontSize: 20 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Réserve de Sang</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{donations.length} Unités</Title>
                                    </div>

                                    <Button
                                        type="primary"
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => activeTab === 'actions' ? setIsActionModalOpen(true) : setIsDonationModalOpen(true)}
                                        style={{ height: 50, borderRadius: 16, background: '#0ea5e9', borderColor: '#0ea5e9', fontWeight: 700, marginTop: 20, boxShadow: '0 8px 24px rgba(14,165,233,0.2)' }}
                                    >
                                        Nouvelle Saisie
                                    </Button>
                                </Space>

                                <div style={{ marginTop: 'auto', paddingTop: 60 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                                        <TeamOutlined style={{ color: '#0ea5e9' }} />
                                        <Text style={{ fontSize: 13 }}>
                                            Total bénéficiaires: <Text strong>{actions.reduce((acc, act) => acc + (act.beneficiaries || 0), 0)}</Text>
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </Col>

                        {/* RIGHT CONTENT (70%) */}
                        <Col xs={24} lg={17} style={{ padding: '40px 50px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 6, borderRadius: 16 }}>
                                    {[
                                        { key: 'actions', label: 'Actions Terrain', icon: <MedicineBoxOutlined /> },
                                        { key: 'donations', label: 'Dons de Sang', icon: <ExperimentOutlined /> }
                                    ].map(tab => (
                                        <Button
                                            key={tab.key}
                                            type="text"
                                            icon={tab.icon}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{
                                                height: 40, padding: '0 24px', borderRadius: 12,
                                                fontWeight: 600,
                                                background: activeTab === tab.key ? (isDark ? 'rgba(14,165,233,0.15)' : '#fff') : 'transparent',
                                                color: activeTab === tab.key ? '#0ea5e9' : (isDark ? 'rgba(255,255,255,0.45)' : '#64748b'),
                                                boxShadow: activeTab === tab.key && !isDark ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </div>

                                <Space size={12}>
                                    <Button icon={<FilterOutlined />} style={{ borderRadius: 12, height: 44, width: 44 }} />
                                    <Button icon={<SettingOutlined />} style={{ borderRadius: 12, height: 44, width: 44 }} />
                                </Space>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {activeTab === 'actions' ? (
                                        <Table<HealthActionDTO>
                                            columns={actColumns}
                                            dataSource={actions}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucune donnee</Title><Text type="secondary">Veuillez saisir une activite sante.</Text></div> }}
                                        />
                                    ) : (
                                        <Table<BloodDonationDTO>
                                            columns={donColumns}
                                            dataSource={donations}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucune donnee</Title><Text type="secondary">Veuillez saisir un don de sang.</Text></div> }}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* MODAL: Planifier Action */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(14,165,233,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
                            <MedicineBoxOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Planifier une Action Terrain</Text>
                    </div>
                }
                open={isActionModalOpen}
                onCancel={() => setIsActionModalOpen(false)}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 24, padding: 30 } }}
            >
                <Form form={actionForm} layout="vertical" onFinish={handleCreateAction} requiredMark={false}>
                    <Form.Item name="title" label="Désignation de l'action" rules={[{ required: true }]}>
                        <Input size="large" placeholder="Ex: Caravane Ophtalmologique" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="type" label="Type d'intervention" rules={[{ required: true }]}>
                                <Select size="large">
                                    <Option value="CARAVANE_MEDICALE">Caravane Médicale</Option>
                                    <Option value="CONSULTATION_GRATUITE">Consultation</Option>
                                    <Option value="DISTRIBUTION_MEDICAMENTS">Pharmacie Sociale</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="date" label="Date prévue" rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="location" label="Lieu / Secteur" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: Siliana, Zone Rurale" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="beneficiaries" label="Objectif (nb personnes)">
                                <InputNumber size="large" min={0} style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Notes cliniques / logistiques">
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détails supplémentaires..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsActionModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: '#0ea5e9', borderColor: '#0ea5e9' }}>
                            Confirmer la planification
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: Enregistrer Don de Sang */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <ExperimentOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Enregistrer un Don de Sang</Text>
                    </div>
                }
                open={isDonationModalOpen}
                onCancel={() => setIsDonationModalOpen(false)}
                footer={null}
                width={550}
                centered
                styles={{ content: { borderRadius: 24, padding: 30 } }}
            >
                <Form form={donationForm} layout="vertical" onFinish={handleCreateDonation} requiredMark={false}>
                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="bloodType" label="Groupe Sanguin" rules={[{ required: true }]}>
                                <Select size="large">
                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <Option key={t} value={t}>{t}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Volume Collecté (ml)" rules={[{ required: true }]}>
                                <InputNumber size="large" min={100} step={50} style={{ width: '100%', borderRadius: 12 }} defaultValue={450} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="donationDate" label="Date de prélèvement" rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="zone" label="Zone CRT" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: Grand Tunis" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="collectionCenter" label="Unité / Centre Hospitalier" rules={[{ required: true }]}>
                        <Input size="large" placeholder="Ex: Centre National de Transfusion" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsDonationModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Fermer</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: '#ef4444', borderColor: '#ef4444' }}>
                            Valider l'enregistrement
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SantePage;

