// ============================================================
// NEXUS-AID — Diffusion Page (RESP_DIFFUSION)
// Educational resources & awareness campaigns
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Form, Input, Select, App, DatePicker, Avatar, Progress, Tooltip
} from 'antd';
import {
    PlusOutlined, BookOutlined, VideoCameraOutlined,
    FileTextOutlined, NotificationOutlined, GlobalOutlined,
    AudioOutlined, FilterOutlined, SettingOutlined,
    ShareAltOutlined, EyeOutlined, BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { diffusionService } from '@/services/domainServices';
import type { EducationalResourceDTO, AwarenessCampaignDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const DiffusionPage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('resources');
    const [resources, setResources] = useState<EducationalResourceDTO[]>([]);
    const [campaigns, setCampaigns] = useState<AwarenessCampaignDTO[]>([]);

    // Modal states
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [resourceForm] = Form.useForm();
    const [campaignForm] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [res, cam] = await Promise.all([
                diffusionService.getResources().catch(() => []),
                diffusionService.getCampaigns().catch(() => []),
            ]);
            setResources(res || []);
            setCampaigns(cam || []);
        } catch (error) {
            console.error("Failed to load diffusion data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateResource = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: EducationalResourceDTO = {
                title: values.title,
                description: values.description,
                category: values.category,
                contentType: values.contentType,
                contentUrl: values.contentUrl || '',
                language: values.language,
                tags: values.tags || 'sensibilisation'
            };
            await diffusionService.createResource(payload);
            messageApi.success('Ressource ajoutée avec succès !');
            setIsResourceModalOpen(false);
            resourceForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'ajout de la ressource.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateCampaign = async (values: any) => {
        setSubmitLoading(true);
        try {
            const startDate = values.dates && values.dates[0] ? values.dates[0].format('YYYY-MM-DD') : undefined;
            const endDate = values.dates && values.dates[1] ? values.dates[1].format('YYYY-MM-DD') : undefined;

            const payload: AwarenessCampaignDTO = {
                name: values.name,
                description: values.description,
                startDate,
                endDate,
                targetAudience: values.targetAudience,
                channels: (values.channels || []).join(','),
                status: values.status || 'PLANNED'
            };
            await diffusionService.createCampaign(payload);
            messageApi.success('Campagne créée avec succès !');
            setIsCampaignModalOpen(false);
            campaignForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la création de la campagne.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const resColumns: ColumnsType<EducationalResourceDTO> = [
        {
            title: 'MÉDIA & CONTENU',
            key: 'title',
            render: (_, record) => (
                <Space size={16}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: record.contentType === 'VIDEO'
                            ? (isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2')
                            : (isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: record.contentType === 'VIDEO' ? '#ef4444' : '#10b981',
                        border: `1px solid ${record.contentType === 'VIDEO'
                            ? (isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2')
                            : (isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7')}`
                    }}>
                        {record.contentType === 'VIDEO' ? <VideoCameraOutlined style={{ fontSize: 20 }} /> : <FileTextOutlined style={{ fontSize: 20 }} />}
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{record.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.category} • {record.language}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'ENGAGEMENT',
            key: 'engagement',
            render: () => (
                <div style={{ width: 100 }}>
                    <Progress percent={Math.floor(Math.random() * 40) + 60} size="small" strokeColor="#F59E0B" />
                </div>
            )
        },
        {
            title: 'FORMAT',
            dataIndex: 'contentType',
            key: 'contentType',
            render: (ct) => (
                <Tag bordered={false} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 6, fontWeight: 600 }}>
                    {ct}
                </Tag>
            )
        },
        {
            title: 'ACTION',
            key: 'action',
            render: () => (
                <Space>
                    <Button type="text" icon={<EyeOutlined />} size="small" />
                    <Button type="text" icon={<ShareAltOutlined />} size="small" />
                </Space>
            )
        }
    ];

    const camColumns: ColumnsType<AwarenessCampaignDTO> = [
        {
            title: 'DÉSIGNATION CAMPAGNE',
            key: 'name',
            render: (_, record) => (
                <Space size={16}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#6366f1', border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : '#e0e7ff'}`
                    }}>
                        <NotificationOutlined style={{ fontSize: 20 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{record.name || record.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>Cible: {record.targetAudience || 'Public'}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'PLANIFICATION',
            key: 'period',
            render: (_, r) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong>{r.startDate ? new Date(r.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>au {r.endDate ? new Date(r.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</Text>
                </div>
            )
        },
        {
            title: 'CANAUX',
            dataIndex: 'channels',
            key: 'channels',
            render: (c) => (
                <Space size={[4, 8]} wrap>
                    {(c || '').split(',').map((ch: string, i: number) => (
                        <Tag key={i} color="blue" bordered={false} style={{ borderRadius: 6, fontSize: 11 }}>{ch.trim()}</Tag>
                    ))}
                </Space>
            )
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag color={s === 'ACTIVE' ? 'success' : 'processing'} style={{ borderRadius: 8, padding: '2px 12px', fontWeight: 700 }}>
                    {s}
                </Tag>
            )
        }
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement de la direction communication...</Text>
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
                                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28, boxShadow: '0 12px 24px rgba(245,158,11,0.25)'
                                    }}>
                                        📢
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Diffusion</Title>
                                        <Tag color="orange" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontSize: 11, fontWeight: 700 }}>
                                            NATIONAL
                                        </Tag>
                                    </div>
                                </div>

                                {/* COMMUNICATION STATS */}
                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(16,185,129,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                                <BookOutlined />
                                            </div>
                                            <BarChartOutlined style={{ color: '#10b981', fontSize: 20 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Assets Éducatifs</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{resources.length} Contenus</Title>
                                    </div>

                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(99,102,241,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(99,102,241,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                                                <NotificationOutlined />
                                            </div>
                                            <ShareAltOutlined style={{ color: '#6366f1', fontSize: 20 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Campagnes Actives</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{campaigns.filter(c => c.status === 'ACTIVE').length} En cours</Title>
                                    </div>

                                    <Button
                                        type="primary"
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => activeTab === 'resources' ? setIsResourceModalOpen(true) : setIsCampaignModalOpen(true)}
                                        style={{ height: 50, borderRadius: 16, background: '#F59E0B', borderColor: '#F59E0B', fontWeight: 700, marginTop: 20, boxShadow: '0 8px 24px rgba(245,158,11,0.2)' }}
                                    >
                                        Nouveau Contenu
                                    </Button>
                                </Space>
                            </div>
                        </Col>

                        {/* RIGHT CONTENT (70%) */}
                        <Col xs={24} lg={17} style={{ padding: '40px 50px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 6, borderRadius: 16 }}>
                                    {[
                                        { key: 'resources', label: 'Ressources', icon: <BookOutlined /> },
                                        { key: 'campaigns', label: 'Campagnes', icon: <NotificationOutlined /> }
                                    ].map(tab => (
                                        <Button
                                            key={tab.key}
                                            type="text"
                                            icon={tab.icon}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{
                                                height: 40, padding: '0 24px', borderRadius: 12,
                                                fontWeight: 600,
                                                background: activeTab === tab.key ? (isDark ? 'rgba(245,158,11,0.15)' : '#fff') : 'transparent',
                                                color: activeTab === tab.key ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.45)' : '#64748b'),
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
                                    <Table
                                        columns={(activeTab === 'resources' ? resColumns : camColumns) as any}
                                        dataSource={(activeTab === 'resources' ? resources : campaigns) as any}
                                        rowKey="id"
                                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                        className="premium-table"
                                        locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucun média</Title><Text type="secondary">Commencez par ajouter une ressource communication.</Text></div> }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* MODAL: Ajouter Ressource */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <BookOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Ajouter une Ressource</Text>
                    </div>
                }
                open={isResourceModalOpen}
                onCancel={() => setIsResourceModalOpen(false)}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 24, padding: 30 } }}
            >
                <Form form={resourceForm} layout="vertical" onFinish={handleCreateResource} requiredMark={false}>
                    <Form.Item name="title" label="Intitulé de la ressource" rules={[{ required: true }]}>
                        <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Guide des premiers secours" />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="category" label="Thématique" rules={[{ required: true }]}>
                                <Select size="large">
                                    <Option value="PREMIERS_SECOURS">Secourisme</Option>
                                    <Option value="HYGIENE">Santé & Hygiène</Option>
                                    <Option value="GOUVERNANCE">Gouvernance</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="contentType" label="Format du média" rules={[{ required: true }]}>
                                <Select size="large">
                                    <Option value="DOCUMENT">Document (PDF)</Option>
                                    <Option value="VIDEO">Vidéo</Option>
                                    <Option value="AUDIO">Audio</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="language" label="Langue" rules={[{ required: true }]}>
                                <Select size="large">
                                    <Option value="ARABIC">Arabe</Option>
                                    <Option value="FRENCH">Français</Option>
                                    <Option value="ENGLISH">Anglais</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="contentUrl" label="Lien de téléchargement">
                                <Input size="large" style={{ borderRadius: 12 }} placeholder="https://" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description sommaire" rules={[{ required: true }]}>
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détails sur l'utilisation du média..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsResourceModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: '#10b981', borderColor: '#10b981' }}>
                            Enregistrer la ressource
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: Créer Campagne */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                            <NotificationOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Lancer une Campagne</Text>
                    </div>
                }
                open={isCampaignModalOpen}
                onCancel={() => setIsCampaignModalOpen(false)}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 24, padding: 30 } }}
            >
                <Form form={campaignForm} layout="vertical" onFinish={handleCreateCampaign} requiredMark={false}>
                    <Form.Item name="name" label="Nom de la campagne" rules={[{ required: true }]}>
                        <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Sensibilisation Routière 2026" />
                    </Form.Item>

                    <Form.Item name="dates" label="Calendrier d'exécution" rules={[{ required: true }]}>
                        <RangePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="targetAudience" label="Public Cible">
                                <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Écoles, Lycées" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="État initial">
                                <Select size="large">
                                    <Option value="PLANNED">Planifiée</Option>
                                    <Option value="ACTIVE">En cours</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="channels" label="Canaux (Multisélection)">
                        <Select mode="tags" size="large" style={{ borderRadius: 12 }} placeholder="Réseaux sociaux, Radio, Terrain...">
                            <Option value="Radio">Radio</Option>
                            <Option value="Social Media">Social Media</Option>
                            <Option value="Print">Affichage</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="description" label="Objectifs stratégiques" rules={[{ required: true }]}>
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Indicateurs de succès attendus..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsCampaignModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Fermer</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: '#6366f1', borderColor: '#6366f1' }}>
                            Valider la campagne
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default DiffusionPage;

