// ============================================================
// NEXUS-AID — Jeunesse Dashboard (RESP_JEUNESSE)
// Comprehensive management for youth integration & projects
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Tooltip, Select, Drawer,
    Row, Col, Empty, Badge, App, Input, ColorPicker, List, Divider, Avatar, Descriptions,
    Form, DatePicker, Card
} from 'antd';
import {
    PlusOutlined, StarOutlined, BarChartOutlined,
    QrcodeOutlined, GlobalOutlined, RobotOutlined,
    EyeOutlined, FileTextOutlined,
    CalendarOutlined, TeamOutlined, SettingOutlined,
    CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined,
    SendOutlined, CopyOutlined, SaveOutlined,
    InfoCircleOutlined, FilterOutlined, AreaChartOutlined,
    EditOutlined, LikeOutlined, DislikeOutlined, CheckOutlined, CloseOutlined,
    ProjectOutlined, BulbOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

import jeunesseService from '@/services/jeunesseService';
import type { YouthIntegrationFormDTO, YouthRecommendationDTO, YouthFormTemplateDTO, MicroProjectDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';

// New Components
import YouthRecommendationView from './components/YouthRecommendationView';
import YouthFormBuilder from './components/YouthFormBuilder';
import YouthStatsDashboard from './components/YouthStatsDashboard';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const projectStatusColors: Record<string, string> = {
    PENDING_VALIDATION: 'gold',
    APPROVED: 'green',
    REJECTED: 'red',
    ACTIVE: 'blue',
    COMPLETED: 'default',
};

const themeColors: Record<string, string> = {
    ENVIRONNEMENT: 'green',
    CITOYENNETE: 'blue',
    SANTE: 'red',
    EDUCATION: 'purple',
    CULTURE: 'gold',
    SPORT: 'cyan',
};

const JeunessePage: React.FC = () => {
    const { modal, message: messageApi, notification } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('templates');
    const [forms, setForms] = useState<YouthIntegrationFormDTO[]>([]);
    const [templates, setTemplates] = useState<(YouthFormTemplateDTO & { _responseCount?: number })[]>([]);
    const [recommendations, setRecommendations] = useState<YouthRecommendationDTO[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // New states for projects and general recommendations
    const [projects, setProjects] = useState<MicroProjectDTO[]>([]);
    const [publishedRecommendations, setPublishedRecommendations] = useState<YouthRecommendationDTO[]>([]);
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isRecommendationModalOpen, setIsRecommendationModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<MicroProjectDTO | null>(null);
    const [editingRecommendation, setEditingRecommendation] = useState<YouthRecommendationDTO | null>(null);
    const [projectForm] = Form.useForm();
    const [recForm] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);
    const [selectedProjectDetails, setSelectedProjectDetails] = useState<MicroProjectDTO | null>(null);
    const [isProjectDetailsOpen, setIsProjectDetailsOpen] = useState(false);

    const user = useAuthStore((s) => s.user);
    const userRoles = user?.roles || [];
    const userRole = userRoles[0] || 'RESP_JEUNESSE';
    const userLevel = userRole.includes('NATIONAL') ? 'NATIONAL' : userRole.includes('REGIONAL') ? 'REGIONAL' : 'LOCAL';
    const [selectedCommittee, setSelectedCommittee] = useState<string>(user?.committeeId || 'ALL');

    const isPresident = userRoles.some(role => role.includes('PRESIDENT'));
    const isRespJeunesse = userRoles.some(role => role.includes('RESP_JEUNESSE'));

    // UI State
    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState<any>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [templateResponses, setTemplateResponses] = useState<any[]>([]);
    const [responsesLoading, setResponsesLoading] = useState(false);
    const [autoRecLoading, setAutoRecLoading] = useState<Record<string, boolean>>({});
    const [domainOptions, setDomainOptions] = useState<any[]>([]);

    const glassStyle = {
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        minHeight: 'calc(100vh - 120px)'
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        setStatsLoading(true);
        try {
            const [f, t, opts, proj, recs] = await Promise.all([
                jeunesseService.getForms().catch(() => []),
                jeunesseService.getTemplates().catch(() => []),
                jeunesseService.getOptions().catch(() => []),
                jeunesseService.getProjects().catch(() => []),
                jeunesseService.getRecommendations().catch(() => []),
            ]);
            setForms(Array.isArray(f) ? f : []);
            setDomainOptions(Array.isArray(opts) ? opts : []);
            setProjects(Array.isArray(proj) ? proj : []);
            setPublishedRecommendations(Array.isArray(recs) ? recs : []);

            const enriched = await Promise.all(
                (Array.isArray(t) ? t : []).map(async (tmpl: any) => {
                    try {
                        const responses = await jeunesseService.getResponsesByTemplate(tmpl.id);
                        return { ...tmpl, _responseCount: responses.length };
                    } catch {
                        return { ...tmpl, _responseCount: 0 };
                    }
                })
            );
            setTemplates(enriched);

            jeunesseService.getStats()
                .then(setStats)
                .catch(console.error)
                .finally(() => setStatsLoading(false));

            const allRecs: YouthRecommendationDTO[] = [];
            for (const form of (Array.isArray(f) ? f : [])) {
                if (form.id) {
                    try {
                        const rec = await jeunesseService.getRecommendation(form.id);
                        if (rec) allRecs.push(rec);
                    } catch { }
                }
            }
            setRecommendations(allRecs);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleViewResponses = async (template: any) => {
        setSelectedTemplate(template);
        setDrawerVisible(true);
        setResponsesLoading(true);
        try {
            const responses = await jeunesseService.getResponsesByTemplate(template.id);
            setTemplateResponses(responses);
        } catch {
            setTemplateResponses([]);
        } finally {
            setResponsesLoading(false);
        }
    };

    const handleAutoRecommend = async (formId: string) => {
        setAutoRecLoading(prev => ({ ...prev, [formId]: true }));
        try {
            await jeunesseService.autoGenerateRecommendation(formId);
            notification.success({
                message: 'Analyse IA Terminée',
                description: 'La recommandation a été générée automatiquement.',
                icon: <RobotOutlined style={{ color: '#e01c2e' }} />
            });
            loadData();
        } catch (error: any) {
            notification.error({ message: 'Erreur d\'Analyse', description: 'Échec de la génération IA.' });
        } finally {
            setAutoRecLoading(prev => ({ ...prev, [formId]: false }));
        }
    };

    // ----- Micro Project Proposal Handler -----
    const handleSaveProject = async () => {
        try {
            const values = await projectForm.validateFields();
            setSubmitting(true);
            const payload: MicroProjectDTO = {
                title: values.title,
                theme: values.theme,
                description: values.description,
                startDate: values.dates?.[0]?.format('YYYY-MM-DD') || '',
                endDate: values.dates?.[1]?.format('YYYY-MM-DD') || '',
            };
            await jeunesseService.createProject(payload);
            messageApi.success('Micro-projet proposé avec succès !');
            setIsProjectModalOpen(false);
            projectForm.resetFields();
            loadData();
        } catch (error) {
            console.error(error);
            messageApi.error('Erreur lors de la création du projet.');
        } finally {
            setSubmitting(false);
        }
    };

    // ----- General Recommendation Handlers -----
    const handleSaveRecommendation = async () => {
        try {
            const values = await recForm.validateFields();
            setSubmitting(true);
            const payload: YouthRecommendationDTO = {
                title: values.title,
                description: values.description,
                category: values.category,
                target: values.target,
                priority: values.priority,
                status: 'PENDING_VALIDATION'
            };
            if (editingRecommendation?.id) {
                await jeunesseService.updateRecommendation(editingRecommendation.id, payload);
                messageApi.success('Recommandation mise à jour !');
            } else {
                await jeunesseService.publishRecommendation(payload);
                messageApi.success('Recommandation publiée pour validation !');
            }
            setIsRecommendationModalOpen(false);
            setEditingRecommendation(null);
            recForm.resetFields();
            loadData();
        } catch (error) {
            console.error(error);
            messageApi.error('Erreur lors de l\'enregistrement de la recommandation.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRecommendation = async (id: string) => {
        modal.confirm({
            title: 'Supprimer la recommandation',
            content: 'Êtes-vous sûr de vouloir supprimer cette recommandation ?',
            okText: 'Supprimer',
            okType: 'danger',
            cancelText: 'Annuler',
            onOk: async () => {
                try {
                    await jeunesseService.deleteRecommendation(id);
                    messageApi.success('Recommandation supprimée.');
                    loadData();
                } catch {
                    messageApi.error('Erreur de suppression.');
                }
            }
        });
    };

    // ----- Validation Handlers -----
    const handleValidateProject = async (projectId: string, approve: boolean) => {
        try {
            await jeunesseService.validateProject(projectId, approve);
            notification.success({
                message: approve ? 'Projet Validé' : 'Projet Rejeté',
                description: `Le micro-projet a été ${approve ? 'approuvé' : 'rejeté'} avec succès.`,
                placement: 'topRight'
            });
            loadData();
        } catch {
            notification.error({ message: 'Erreur', description: 'Échec de la validation.' });
        }
    };

    const handleValidateRecommendation = async (recId: string, approve: boolean) => {
        try {
            await jeunesseService.validateRecommendation(recId, approve);
            notification.success({
                message: approve ? 'Recommandation Validée' : 'Recommandation Rejetée',
                description: `La recommandation a été ${approve ? 'approuvée' : 'rejetée'} avec succès.`,
                placement: 'topRight'
            });
            loadData();
        } catch {
            notification.error({ message: 'Erreur', description: 'Échec de la validation.' });
        }
    };

    // ----- Columns Definitions -----
    const formColumns: ColumnsType<YouthIntegrationFormDTO> = [
        {
            title: 'Volontaire', dataIndex: 'volunteerName', key: 'volunteerName',
            render: (n: string) => (
                <Space>
                    <Avatar size="small" style={{ background: 'linear-gradient(135deg, #e01c2e, #c0152a)' }}>{n?.[0]}</Avatar>
                    <Text strong>{n || '—'}</Text>
                </Space>
            )
        },
        {
            title: 'Date', dataIndex: 'submittedAt', key: 'submittedAt',
            render: (d: string) => <Text type="secondary">{d ? new Date(d).toLocaleDateString() : '—'}</Text>
        },
        {
            title: 'Actions', key: 'actions', align: 'right',
            render: (_, record) => (
                <Space>
                    <Button size="small" icon={<RobotOutlined />} loading={autoRecLoading[record.id!]} onClick={() => handleAutoRecommend(record.id!)}>IA</Button>
                    <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedForm(record); setIsRecModalOpen(true); }} />
                </Space>
            )
        }
    ];

    const projectColumns: ColumnsType<MicroProjectDTO> = [
        {
            title: 'Titre', dataIndex: 'title', key: 'title',
            render: (t: string) => <Text strong>{t}</Text>
        },
        {
            title: 'Thème', dataIndex: 'theme', key: 'theme',
            render: (th: string) => <Tag color={themeColors[th] || 'default'}>{th}</Tag>
        },
        {
            title: 'Dates', key: 'dates',
            render: (_, r) => <Text type="secondary" style={{ fontSize: 13 }}><CalendarOutlined /> {r.startDate || '—'} → {r.endDate || '—'}</Text>
        },
        {
            title: 'Statut', dataIndex: 'status', key: 'status',
            render: (st: string) => <Tag color={projectStatusColors[st] || 'default'}>{st}</Tag>
        },
        {
            title: 'Actions', key: 'actions', align: 'right',
            render: (_, r) => (
                <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedProjectDetails(r); setIsProjectDetailsOpen(true); }}>Détails</Button>
            )
        }
    ];

    const recommendationColumns: ColumnsType<YouthRecommendationDTO> = [
        {
            title: 'Titre', dataIndex: 'title', key: 'title',
            render: (t: string) => <Text strong>{t}</Text>
        },
        {
            title: 'Catégorie', dataIndex: 'category', key: 'category',
            render: (c: string) => <Tag color="blue">{c}</Tag>
        },
        {
            title: 'Cible', dataIndex: 'target', key: 'target',
        },
        {
            title: 'Priorité', dataIndex: 'priority', key: 'priority',
            render: (p: string) => {
                let color = 'green';
                if (p === 'ELEVEE') color = 'red';
                else if (p === 'MOYENNE') color = 'orange';
                return <Tag color={color}>{p}</Tag>;
            }
        },
        {
            title: 'Statut', dataIndex: 'status', key: 'status',
            render: (st: string) => <Tag color={st === 'APPROVED' ? 'green' : st === 'REJECTED' ? 'red' : 'gold'}>{st}</Tag>
        },
        {
            title: 'Actions', key: 'actions', align: 'right',
            render: (_, r) => (
                <Space>
                    {(isRespJeunesse || user?.type === 'ADMIN') && (
                        <>
                            <Button size="small" icon={<EditOutlined />} onClick={() => {
                                setEditingRecommendation(r);
                                recForm.setFieldsValue(r);
                                setIsRecommendationModalOpen(true);
                            }} />
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteRecommendation(r.id!)} />
                        </>
                    )}
                </Space>
            )
        }
    ];

    const pendingProjects = projects.filter(p => p.status === 'PENDING_VALIDATION');
    const pendingRecommendations = publishedRecommendations.filter(r => r.status === 'PENDING_VALIDATION');

    // Build the dynamic tab array
    const tabItems = [
        { key: 'templates', label: 'Formulaires Publiés' },
        { key: 'forms', label: 'Soumissions Jeunesse' },
        { key: 'projects', label: 'Micro-Projets' },
        { key: 'recommendations', label: 'Recommandations' },
        { key: 'stats', label: 'Analyses & Impact' },
    ];
    if (isPresident || user?.type === 'ADMIN') {
        tabItems.push({ key: 'validations', label: 'Demandes de Validation' });
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <Spin size="large" tip="Chargement du tableau de bord..." />
        </div>
    );

    return (
        <div style={{ padding: '0 40px 40px 40px', maxWidth: 1600, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div style={glassStyle}>
                    <Row gutter={0}>
                        {/* SIDEBAR (30%) */}
                        <Col xs={24} lg={7} style={{
                            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                            background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.5)',
                            padding: '40px 32px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: 20,
                                    background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 24, boxShadow: '0 12px 24px rgba(224,28,46,0.25)',
                                    color: '#fff'
                                }}>
                                    <TeamOutlined />
                                </div>
                                <div>
                                    <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Jeunesse</Title>
                                    <Tag color="blue" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontWeight: 700, fontSize: 11 }}>{userLevel}</Tag>
                                </div>
                            </div>

                            <div style={{ marginBottom: 40 }}>
                                <Text strong style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 16 }}>Tableau de bord</Text>
                                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Soumissions reçues</Text>
                                        <Text strong style={{ fontSize: 24 }}>{forms.length}</Text>
                                    </div>
                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Micro-Projets</Text>
                                        <Text strong style={{ fontSize: 24 }}>{projects.length}</Text>
                                    </div>
                                </Space>
                            </div>

                            <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                {(isRespJeunesse || user?.type === 'ADMIN') && (
                                    <>
                                        <Button
                                            type="primary"
                                            block
                                            icon={<PlusOutlined />}
                                            onClick={() => setIsBuilderOpen(true)}
                                            style={{ height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #e01c2e, #c0152a)', border: 'none', fontWeight: 700, boxShadow: '0 8px 20px rgba(224,28,46,0.2)' }}
                                        >
                                            Nouveau Formulaire
                                        </Button>
                                        <Button
                                            block
                                            icon={<ProjectOutlined />}
                                            onClick={() => setIsProjectModalOpen(true)}
                                            style={{ height: 52, borderRadius: 16, borderColor: '#cbd5e1', fontWeight: 600 }}
                                        >
                                            Proposer Micro-Projet
                                        </Button>
                                        <Button
                                            block
                                            icon={<BulbOutlined />}
                                            onClick={() => {
                                                setEditingRecommendation(null);
                                                recForm.resetFields();
                                                setIsRecommendationModalOpen(true);
                                            }}
                                            style={{ height: 52, borderRadius: 16, borderColor: '#cbd5e1', fontWeight: 600 }}
                                        >
                                            Publier Recommandation
                                        </Button>
                                    </>
                                )}
                            </Space>

                            <Divider style={{ margin: '32px 0' }} />

                            <Button block ghost icon={<SettingOutlined />} style={{ height: 48, borderRadius: 14, borderColor: '#cbd5e1', color: isDark ? '#e2e8f0' : '#475569' }}>
                                Paramètres du domaine
                            </Button>
                        </Col>

                        {/* MAIN HUB (70%) */}
                        <Col xs={24} lg={17} style={{ background: isDark ? 'transparent' : '#fff' }}>
                            <div style={{ padding: '0 40px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}` }}>
                                <Tabs
                                    activeKey={activeTab}
                                    onChange={setActiveTab}
                                    style={{ height: 80 }}
                                    className="domain-tabs-v3"
                                    items={tabItems}
                                />
                            </div>

                            <div style={{ padding: 40, minHeight: 600 }}>
                                <AnimatePresence mode="wait">
                                    {activeTab === 'templates' && (
                                        <motion.div key="templates" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <Row gutter={[24, 24]}>
                                                {templates.length === 0 ? (
                                                    <Col span={24}><Empty description="Aucun formulaire publié." /></Col>
                                                ) : (
                                                    templates.map((tmpl) => (
                                                        <Col key={tmpl.id} xs={24} lg={12}>
                                                            <div style={{
                                                                padding: 24, borderRadius: 24,
                                                                background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                                                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                                                transition: 'transform 0.3s ease'
                                                            }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                                                    <Space>
                                                                        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e01c2e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><FileTextOutlined /></div>
                                                                        <Text strong>{tmpl.title}</Text>
                                                                    </Space>
                                                                    <Tag color="cyan" style={{ margin: 0 }}>{tmpl._responseCount} Réponses</Tag>
                                                                </div>
                                                                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>{tmpl.description || 'Aucune description.'}</Text>
                                                                <div style={{ display: 'flex', gap: 8 }}>
                                                                    <Button type="primary" ghost style={{ flex: 1, borderRadius: 10 }} onClick={() => handleViewResponses(tmpl)}>Détails</Button>
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    ))
                                                )}
                                            </Row>
                                        </motion.div>
                                    )}

                                    {activeTab === 'forms' && (
                                        <motion.div key="forms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <Table columns={formColumns} dataSource={forms} rowKey="id" pagination={{ pageSize: 8 }} locale={{ emptyText: "Aucune soumission reçue" }} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'projects' && (
                                        <motion.div key="projects" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <Table columns={projectColumns} dataSource={projects} rowKey="id" pagination={{ pageSize: 8 }} locale={{ emptyText: "Aucun micro-projet proposé" }} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'recommendations' && (
                                        <motion.div key="recommendations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <Table columns={recommendationColumns} dataSource={publishedRecommendations} rowKey="id" pagination={{ pageSize: 8 }} locale={{ emptyText: "Aucune recommandation publiée" }} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'stats' && (
                                        <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <YouthStatsDashboard onExport={() => { }} data={stats} loading={statsLoading} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'validations' && (
                                        <motion.div key="validations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <Row gutter={[0, 32]}>
                                                <Col span={24}>
                                                    <Card title={<Space><ProjectOutlined /> Micro-projets en attente</Space>} style={{ borderRadius: 20 }} className="glass-card">
                                                        <Table
                                                            dataSource={pendingProjects}
                                                            rowKey="id"
                                                            pagination={{ pageSize: 4 }}
                                                            columns={[
                                                                { title: 'Titre', dataIndex: 'title', key: 'title', render: (t) => <Text strong>{t}</Text> },
                                                                { title: 'Thème', dataIndex: 'theme', key: 'theme', render: (th) => <Tag color={themeColors[th] || 'default'}>{th}</Tag> },
                                                                { title: 'Dates', key: 'dates', render: (_, r) => <Text type="secondary" style={{ fontSize: 13 }}>{r.startDate} → {r.endDate}</Text> },
                                                                {
                                                                    title: 'Actions', key: 'actions', align: 'right',
                                                                    render: (_, r) => (
                                                                        <Space>
                                                                            <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedProjectDetails(r); setIsProjectDetailsOpen(true); }} />
                                                                            <Button size="small" type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} icon={<CheckOutlined />} onClick={() => handleValidateProject(r.id!, true)}>Approuver</Button>
                                                                            <Button size="small" danger type="primary" icon={<CloseOutlined />} onClick={() => handleValidateProject(r.id!, false)}>Rejeter</Button>
                                                                        </Space>
                                                                    )
                                                                }
                                                            ]}
                                                        />
                                                    </Card>
                                                </Col>
                                                <Col span={24}>
                                                    <Card title={<Space><BulbOutlined /> Recommandations en attente</Space>} style={{ borderRadius: 20 }} className="glass-card">
                                                        <Table
                                                            dataSource={pendingRecommendations}
                                                            rowKey="id"
                                                            pagination={{ pageSize: 4 }}
                                                            columns={[
                                                                { title: 'Titre', dataIndex: 'title', key: 'title', render: (t) => <Text strong>{t}</Text> },
                                                                { title: 'Catégorie', dataIndex: 'category', key: 'category', render: (c) => <Tag color="blue">{c}</Tag> },
                                                                { title: 'Priorité', dataIndex: 'priority', key: 'priority', render: (p) => <Tag color={p === 'ELEVEE' ? 'red' : 'gold'}>{p}</Tag> },
                                                                {
                                                                    title: 'Actions', key: 'actions', align: 'right',
                                                                    render: (_, r) => (
                                                                        <Space>
                                                                            <Button size="small" type="primary" style={{ background: '#10b981', borderColor: '#10b981' }} icon={<CheckOutlined />} onClick={() => handleValidateRecommendation(r.id!, true)}>Approuver</Button>
                                                                            <Button size="small" danger type="primary" icon={<CloseOutlined />} onClick={() => handleValidateRecommendation(r.id!, false)}>Rejeter</Button>
                                                                        </Space>
                                                                    )
                                                                }
                                                            ]}
                                                        />
                                                    </Card>
                                                </Col>
                                            </Row>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* MODALS & DRAWERS */}
            <Modal open={isBuilderOpen} onCancel={() => setIsBuilderOpen(false)} footer={null} width={1000} title="Générateur de Formulaire Jeunesse">
                <YouthFormBuilder
                    onSave={async (data) => {
                        try {
                            await jeunesseService.createTemplate({
                                title: data.title,
                                description: data.description,
                                questions: JSON.stringify(data.questions),
                                targetLevel: data.targetLevel,
                                committeeId: data.targetCommitteeIds.length > 0 ? data.targetCommitteeIds[0] : 'ALL'
                            } as any);
                            messageApi.success('Formulaire publié avec succès');
                            setIsBuilderOpen(false);
                            loadData();
                        } catch (error) {
                            notification.error({ message: "Erreur", description: "Impossible de publier le formulaire." });
                        }
                    }}
                    onCancel={() => setIsBuilderOpen(false)}
                    userLevel={userLevel}
                    userCommitteeId={selectedCommittee}
                />
            </Modal>

            <Drawer open={drawerVisible} onClose={() => setDrawerVisible(false)} width={600} title={selectedTemplate?.title}>
                <Table columns={formColumns} dataSource={templateResponses} loading={responsesLoading} rowKey="id" />
            </Drawer>

            {/* Recommendation Modal */}
            <Modal open={isRecModalOpen} onCancel={() => setIsRecModalOpen(false)} footer={null} title="Détails de la Soumission">
                {selectedForm && (
                    <div style={{ padding: 20 }}>
                        <Descriptions title="Informations" bordered column={1}>
                            <Descriptions.Item label="Volontaire">{selectedForm.volunteerName}</Descriptions.Item>
                            <Descriptions.Item label="Date">{new Date(selectedForm.submittedAt).toLocaleString()}</Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        {(() => {
                            const rec = recommendations.find(r => r.formId === selectedForm.id);
                            return <YouthRecommendationView recommendation={rec} volunteerName={selectedForm.volunteerName} onClose={() => setIsRecModalOpen(false)} />;
                        })()}
                    </div>
                )}
            </Modal>

            {/* Micro Project Form Modal */}
            <Modal
                title={<Space><ProjectOutlined /> Proposer un Micro-Projet</Space>}
                open={isProjectModalOpen}
                onCancel={() => { setIsProjectModalOpen(false); projectForm.resetFields(); }}
                footer={[
                    <Button key="cancel" onClick={() => { setIsProjectModalOpen(false); projectForm.resetFields(); }}>Annuler</Button>,
                    <Button key="submit" type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSaveProject}>Proposer</Button>
                ]}
                width={560}
            >
                <Form form={projectForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="title" label="Titre du projet" rules={[{ required: true, message: 'Veuillez saisir un titre' }]}>
                        <Input placeholder="Ex: Nettoyage de la plage" />
                    </Form.Item>
                    <Form.Item name="theme" label="Thème" rules={[{ required: true, message: 'Veuillez choisir un thème' }]}>
                        <Select
                            placeholder="Sélectionnez"
                            options={[
                                { label: '🌿 Environnement', value: 'ENVIRONNEMENT' },
                                { label: '🏛️ Citoyenneté', value: 'CITOYENNETE' },
                                { label: '❤️ Santé', value: 'SANTE' },
                                { label: '📚 Éducation', value: 'EDUCATION' },
                                { label: '🎭 Culture', value: 'CULTURE' },
                                { label: '⚽ Sport', value: 'SPORT' },
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Veuillez décrire le projet' }]}>
                        <TextArea rows={4} placeholder="Décrivez le projet en détails..." />
                    </Form.Item>
                    <Form.Item name="dates" label="Dates (début — fin)" rules={[{ required: true, message: 'Sélectionnez des dates' }]}>
                        <DatePicker.RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* General Recommendation CRUD Modal */}
            <Modal
                title={<Space><BulbOutlined /> {editingRecommendation ? 'Modifier la Recommandation' : 'Publier une Recommandation Générale'}</Space>}
                open={isRecommendationModalOpen}
                onCancel={() => { setIsRecommendationModalOpen(false); setEditingRecommendation(null); recForm.resetFields(); }}
                footer={[
                    <Button key="cancel" onClick={() => { setIsRecommendationModalOpen(false); setEditingRecommendation(null); recForm.resetFields(); }}>Annuler</Button>,
                    <Button key="submit" type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSaveRecommendation}>Publier</Button>
                ]}
                width={560}
            >
                <Form form={recForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="title" label="Titre de la recommandation" rules={[{ required: true, message: 'Veuillez saisir un titre' }]}>
                        <Input placeholder="Ex: Campagne de formation secourisme" />
                    </Form.Item>
                    <Form.Item name="category" label="Catégorie" rules={[{ required: true, message: 'Sélectionnez une catégorie' }]}>
                        <Select
                            placeholder="Choisir une catégorie"
                            options={[
                                { label: 'Formations', value: 'Formations' },
                                { label: 'Sensibilisation', value: 'Sensibilisation' },
                                { label: 'Projets Civiques', value: 'Projets Civiques' },
                                { label: 'Intégration Bénévoles', value: 'Intégration Bénévoles' },
                                { label: 'Autre', value: 'Autre' }
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="target" label="Public cible" rules={[{ required: true, message: 'Veuillez définir la cible' }]}>
                        <Input placeholder="Ex: Nouveaux Bénévoles, Grand Public..." />
                    </Form.Item>
                    <Form.Item name="priority" label="Priorité" rules={[{ required: true, message: 'Choisissez la priorité' }]}>
                        <Select
                            options={[
                                { label: 'Faible', value: 'FAIBLE' },
                                { label: 'Moyenne', value: 'MOYENNE' },
                                { label: 'Élevée', value: 'ELEVEE' }
                            ]}
                        />
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Veuillez ajouter une description' }]}>
                        <TextArea rows={4} placeholder="Description détaillée de la recommandation..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Project Details Modal */}
            <Modal
                title={<Space><ProjectOutlined /> Détails du Micro-Projet</Space>}
                open={isProjectDetailsOpen}
                onCancel={() => setIsProjectDetailsOpen(false)}
                footer={<Button onClick={() => setIsProjectDetailsOpen(false)}>Fermer</Button>}
            >
                {selectedProjectDetails && (
                    <div style={{ marginTop: 16 }}>
                        <Title level={4}>{selectedProjectDetails.title}</Title>
                        <Tag color={themeColors[selectedProjectDetails.theme] || 'default'}>{selectedProjectDetails.theme}</Tag>
                        <Tag color={projectStatusColors[selectedProjectDetails.status!] || 'default'} style={{ marginLeft: 8 }}>{selectedProjectDetails.status}</Tag>
                        <Divider style={{ margin: '12px 0' }} />
                        <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{selectedProjectDetails.description}</Paragraph>
                        <Descriptions bordered column={1} size="small" style={{ marginTop: 16 }}>
                            <Descriptions.Item label="Date de début">{selectedProjectDetails.startDate}</Descriptions.Item>
                            <Descriptions.Item label="Date de fin">{selectedProjectDetails.endDate || 'Non spécifiée'}</Descriptions.Item>
                        </Descriptions>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default JeunessePage;
