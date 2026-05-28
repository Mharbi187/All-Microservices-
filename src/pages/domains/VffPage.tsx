// ============================================================
// NEXUS-AID — VFF (Violence, Femmes, Famille) Page
// Victim support & Protection campaigns management
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Form, Input, Select, App, DatePicker, Avatar, Progress, Tooltip, InputNumber
} from 'antd';
import {
    WomanOutlined, PlusOutlined, SafetyOutlined, NotificationOutlined,
    GlobalOutlined, CheckCircleOutlined, LockOutlined,
    SearchOutlined, FilterOutlined, SettingOutlined,
    InfoCircleOutlined, SafetyCertificateOutlined, BarChartOutlined, HeartOutlined, CalendarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '@/stores';
import { vffService } from '@/services/domainServices';
import type { VictimCaseDTO, ProtectionCampaignDTO } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const VffPage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('cases');
    const [cases, setCases] = useState<VictimCaseDTO[]>([]);
    const [campaigns, setCampaigns] = useState<ProtectionCampaignDTO[]>([]);

    // Modal states
    const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [caseForm] = Form.useForm();
    const [campaignForm] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [c, cam] = await Promise.all([
                vffService.getCases().catch(() => []),
                vffService.getCampaigns().catch(() => []),
            ]);
            setCases(c || []);
            setCampaigns(cam || []);
        } catch (error) {
            console.error("Failed to load vff data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateCase = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: VictimCaseDTO = {
                victimName: values.victimName,
                age: values.age,
                gender: values.gender,
                typeOfViolence: values.typeOfViolence,
                description: values.description,
                status: values.status || 'REPORTED',
                priority: values.priority || 'MEDIUM'
            };
            await vffService.createCase(payload);
            messageApi.success('Dossier de protection créé, confidentialité garantie.');
            setIsCaseModalOpen(false);
            caseForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la création du dossier.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateCampaign = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: ProtectionCampaignDTO = {
                title: values.title,
                targetAudience: values.targetAudience,
                startDate: values.dates && values.dates[0] ? values.dates[0].format('YYYY-MM-DD') : undefined,
                endDate: values.dates && values.dates[1] ? values.dates[1].format('YYYY-MM-DD') : undefined,
                location: values.location,
                status: values.status || 'PLANNED'
            };
            await vffService.createCampaign(payload);
            messageApi.success('Campagne de prévention enregistrée !');
            setIsCampaignModalOpen(false);
            campaignForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'enregistrement de la campagne.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const caseColumns: ColumnsType<VictimCaseDTO> = [
        {
            title: 'SIGNALEMENT (DÉTAILS)',
            key: 'victimName',
            render: (_: any, record: VictimCaseDTO) => (
                <Space size={14}>
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<LockOutlined />}
                        style={{ background: isDark ? 'rgba(224,28,46,0.1)' : '#fef2f2', color: '#e01c2e', border: `1px solid ${isDark ? 'rgba(224,28,46,0.2)' : '#fee2e2'}`, borderRadius: 12 }}
                    />
                    <div>
                        <Text strong style={{ fontSize: 16, display: 'block' }}>{record.victimName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.typeOfViolence} • {record.gender}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'ÂGE',
            dataIndex: 'age',
            key: 'age',
            render: (a: number) => <Text strong>{a} ans</Text>
        },
        {
            title: 'PRIORITÉ',
            dataIndex: 'priority',
            key: 'priority',
            render: (p: string) => (
                <Tag color={p === 'CRITICAL' ? 'red' : p === 'HIGH' ? 'orange' : 'green'} style={{ borderRadius: 8, padding: '2px 12px', fontWeight: 800 }}>
                    {p}
                </Tag>
            )
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => (
                <Tag bordered={false} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 8, fontWeight: 600 }}>
                    {s}
                </Tag>
            )
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            render: () => (
                <Space>
                    <Tooltip title="Détails confidentiels"><Button type="text" icon={<InfoCircleOutlined />} size="small" /></Tooltip>
                    <Button type="text" icon={<SettingOutlined />} size="small" />
                </Space>
            )
        }
    ];

    const camColumns: ColumnsType<ProtectionCampaignDTO> = [
        {
            title: 'CAMPAGNE DE PRÉVENTION',
            key: 'title',
            render: (_: any, record: ProtectionCampaignDTO) => (
                <Space size={14}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: isDark ? 'rgba(224,28,46,0.1)' : '#fef2f2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#e01c2e', border: `1px solid ${isDark ? 'rgba(224,28,46,0.2)' : '#fee2e2'}`
                    }}>
                        <SafetyOutlined style={{ fontSize: 20 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{record.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.location} • {record.targetAudience}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'CALENDRIER',
            key: 'period',
            render: (_: any, r: ProtectionCampaignDTO) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CalendarOutlined style={{ color: '#e01c2e' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ fontSize: 13 }}>{r.startDate ? new Date(r.startDate).toLocaleDateString('fr-FR') : '—'}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>au {r.endDate ? new Date(r.endDate).toLocaleDateString('fr-FR') : '—'}</Text>
                    </div>
                </div>
            )
        },
        {
            title: 'ÉTAT',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => (
                <Tag color={s === 'ACTIVE' ? 'success' : 'processing'} style={{ borderRadius: 8, padding: '2px 12px', fontWeight: 700 }}>
                    {s}
                </Tag>
            )
        }
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement de la direction de la protection...</Text>
        </div>
    );

    const glassStyle = {
        background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.06)',
        overflow: 'hidden'
    };

    return (
        <div style={{ padding: '0 40px 40px 40px', maxWidth: 1600, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }}>
                <div style={glassStyle}>
                    <Row gutter={0}>
                        {/* LEFT SIDEBAR (30%) */}
                        <Col xs={24} lg={7} style={{
                            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                            background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.5)',
                            padding: '40px 32px'
                        }}>
                            <div style={{ position: 'sticky', top: 40 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                                    <div style={{
                                        width: 60, height: 60, borderRadius: 20,
                                        background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28, boxShadow: '0 12px 24px rgba(224,28,46,0.25)',
                                        color: '#fff'
                                    }}>
                                        <SafetyOutlined />
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Protection</Title>
                                        <Tag color="red" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontWeight: 700, fontSize: 11 }}>
                                            NATIONAL
                                        </Tag>
                                    </div>
                                </div>

                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <div style={{ padding: 24, borderRadius: 24, background: isDark ? 'rgba(224,28,46,0.04)' : '#fff', border: `1px solid ${isDark ? 'rgba(224,28,46,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(224,28,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e01c2e' }}>
                                                <HeartOutlined style={{ fontSize: 20 }} />
                                            </div>
                                            <BarChartOutlined style={{ color: '#e01c2e', fontSize: 22 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact / Suivi</Text>
                                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{cases.length}</Title>
                                    </div>

                                    <div style={{ padding: 24, borderRadius: 24, background: isDark ? 'rgba(31,31,31,0.5)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(224,28,46,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e01c2e' }}>
                                                <SafetyOutlined style={{ fontSize: 20 }} />
                                            </div>
                                            <Progress type="circle" percent={campaigns.filter(c => c.status === 'ACTIVE').length * 20} size={40} strokeColor="#e01c2e" />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prévention Actives</Text>
                                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{campaigns.filter(c => c.status === 'ACTIVE').length}</Title>
                                    </div>

                                    <Button
                                        type="primary"
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => activeTab === 'cases' ? setIsCaseModalOpen(true) : setIsCampaignModalOpen(true)}
                                        style={{ height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #e01c2e, #c0152a)', border: 'none', fontWeight: 700, marginTop: 12, boxShadow: '0 8px 20px rgba(224,28,46,0.2)' }}
                                    >
                                        {activeTab === 'cases' ? 'Nouveau Dossier' : 'Nouvelle Campagne'}
                                    </Button>
                                </Space>
                            </div>
                        </Col>

                        {/* RIGHT HUB (70%) */}
                        <Col xs={24} lg={17} style={{ padding: '40px 48px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 6, borderRadius: 16 }}>
                                    {[
                                        { key: 'cases', label: 'Suivi Victimes', icon: <WomanOutlined /> },
                                        { key: 'campaigns', label: 'Action Prévention', icon: <NotificationOutlined /> }
                                    ].map(tab => (
                                        <Button
                                            key={tab.key}
                                            type="text"
                                            icon={tab.icon}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{
                                                height: 42, padding: '0 24px', borderRadius: 12,
                                                fontWeight: 800,
                                                background: activeTab === tab.key ? (isDark ? 'rgba(224,28,46,0.2)' : '#fff') : 'transparent',
                                                color: activeTab === tab.key ? '#e01c2e' : (isDark ? 'rgba(255,255,255,0.4)' : '#64748b'),
                                                boxShadow: activeTab === tab.key && !isDark ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </div>

                                <Space>
                                    <Button icon={<SearchOutlined />} style={{ borderRadius: 12, height: 44, width: 44 }} />
                                    <Button icon={<FilterOutlined />} style={{ borderRadius: 12, height: 44, width: 44 }} />
                                </Space>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Table
                                        columns={activeTab === 'cases' ? (caseColumns as any) : (camColumns as any)}
                                        dataSource={(activeTab === 'cases' ? cases : campaigns) as any}
                                        rowKey="id"
                                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                        className="premium-table"
                                        locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucune donnée</Title><Text type="secondary">Initié un nouveau signalement ou une campagne.</Text></div> }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* MODAL: SIGNALEMENT (Case) */}
            <Modal
                title={<Space><LockOutlined style={{ color: '#e01c2e' }} /><Text strong style={{ fontSize: 18 }}>Signalement Confidentiel</Text></Space>}
                open={isCaseModalOpen}
                onCancel={() => setIsCaseModalOpen(false)}
                footer={null}
                width={650}
                centered
                styles={{ content: { borderRadius: 28, padding: 32 } }}
            >
                <div style={{ padding: '12px 20px', borderRadius: 12, background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: '1px solid #fee2e2', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
                    <SafetyCertificateOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                    <Text type="danger" style={{ fontSize: 13, fontWeight: 600 }}>Confidentialité absolue requise pour ce dossier.</Text>
                </div>

                <Form form={caseForm} layout="vertical" onFinish={handleCreateCase} requiredMark={false}>
                    <Form.Item name="victimName" label="Identité (ou Alias)" rules={[{ required: true }]}>
                        <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Madame X" />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="age" label="Âge (Estimatif)">
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 12 }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="gender" label="Sexe / Statut">
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="FEMALE">Femme</Option>
                                    <Option value="MALE">Homme</Option>
                                    <Option value="CHILD">Enfant</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="typeOfViolence" label="Nature de la situation" rules={[{ required: true }]}>
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="PHYSIQUE">Violence Physique</Option>
                                    <Option value="PSYCHOLOGIQUE">Psychologique</Option>
                                    <Option value="ECONOMIQUE">Économique</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="priority" label="Niveau d'Urgence">
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="CRITICAL">Critique / Immédiat</Option>
                                    <Option value="HIGH">Élevé (Protection)</Option>
                                    <Option value="MEDIUM">Suivi standard</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Observations & Besoins (Santé, Hébergement...)">
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détails du support requis..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsCaseModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: 'linear-gradient(135deg, #e01c2e, #c0152a)', border: 'none', fontWeight: 700 }}>
                            Générer le dossier
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: CAMPAGNE */}
            <Modal
                title={<Space><SafetyOutlined style={{ color: '#e01c2e' }} /><Text strong style={{ fontSize: 18 }}>Action Préventive</Text></Space>}
                open={isCampaignModalOpen}
                onCancel={() => setIsCampaignModalOpen(false)}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 28, padding: 32 } }}
            >
                <Form form={campaignForm} layout="vertical" onFinish={handleCreateCampaign} requiredMark={false}>
                    <Form.Item name="title" label="Dénomination de l'action" rules={[{ required: true }]}>
                        <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Sensibilisation Droits des Femmes" />
                    </Form.Item>

                    <Form.Item name="dates" label="Calendrier" rules={[{ required: true }]}>
                        <RangePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="location" label="Zone géographique">
                                <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Zone Rurale" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="État d'avancement">
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="PLANNED">Planifiée</Option>
                                    <Option value="ACTIVE">En cours</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="targetAudience" label="Public cible / Groupes focus">
                        <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Familles, Jeunes..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsCampaignModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: 'linear-gradient(135deg, #e01c2e, #c0152a)', border: 'none', fontWeight: 700 }}>
                            Lancer la campagne
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default VffPage;

