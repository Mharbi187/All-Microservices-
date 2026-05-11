// ============================================================
// NEXUS-AID — Jeunesse Dashboard (RESP_JEUNESSE)
// Comprehensive management for youth integration & projects
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Tooltip, Select, Drawer,
    Row, Col, Empty, Badge, App, Input, ColorPicker, List, Divider, Avatar, Descriptions
} from 'antd';
import {
    PlusOutlined, StarOutlined, BarChartOutlined,
    QrcodeOutlined, GlobalOutlined, RobotOutlined,
    EyeOutlined, FileTextOutlined,
    CalendarOutlined, TeamOutlined, SettingOutlined,
    CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined,
    SendOutlined, CopyOutlined, SaveOutlined,
    InfoCircleOutlined, FilterOutlined, AreaChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

import jeunesseService from '@/services/jeunesseService';
import type { YouthIntegrationFormDTO, YouthRecommendationDTO, YouthFormTemplateDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';



// New Components
import YouthRecommendationView from './components/YouthRecommendationView';
import YouthFormBuilder from './components/YouthFormBuilder';
import YouthStatsDashboard from './components/YouthStatsDashboard';

const { Title, Text } = Typography;

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

    const user = useAuthStore((s) => s.user);
    const userRole = user?.roles?.[0] || 'RESP_JEUNESSE';
    const userLevel = userRole.includes('NATIONAL') ? 'NATIONAL' : userRole.includes('REGIONAL') ? 'REGIONAL' : 'LOCAL';
    const [selectedCommittee, setSelectedCommittee] = useState<string>(user?.committeeId || 'ALL');

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
    const [newOption, setNewOption] = useState({ type: 'CATEGORY', label: '', value: '', color: '#4F46E5' });

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
            const [f, t, opts] = await Promise.all([
                jeunesseService.getForms().catch(() => []),
                jeunesseService.getTemplates().catch(() => []),
                jeunesseService.getOptions().catch(() => []),
            ]);
            setForms(Array.isArray(f) ? f : []);
            setDomainOptions(Array.isArray(opts) ? opts : []);

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
                icon: <RobotOutlined style={{ color: '#4F46E5' }} />
            });
            loadData();
        } catch (error: any) {
            notification.error({ message: 'Erreur d\'Analyse', description: 'Échec de la génération IA.' });
        } finally {
            setAutoRecLoading(prev => ({ ...prev, [formId]: false }));
        }
    };

    const formColumns: ColumnsType<YouthIntegrationFormDTO> = [
        {
            title: 'Volontaire', dataIndex: 'volunteerName', key: 'volunteerName',
            render: (n: string) => (
                <Space>
                    <Avatar size="small" style={{ background: 'linear-gradient(135deg, #4F46E5, #818cf8)' }}>{n?.[0]}</Avatar>
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
                                    background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 28, boxShadow: '0 12px 24px rgba(79,70,229,0.25)'
                                }}>🎓</div>
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
                                        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Formulaires actifs</Text>
                                        <Text strong style={{ fontSize: 24 }}>{templates.length}</Text>
                                    </div>
                                </Space>
                            </div>

                            <Button
                                type="primary"
                                block
                                icon={<PlusOutlined />}
                                onClick={() => setIsBuilderOpen(true)}
                                style={{ height: 52, borderRadius: 16, background: '#4f46e5', fontWeight: 700, boxShadow: '0 8px 20px rgba(79,70,229,0.2)' }}
                            >
                                Nouveau Formulaire
                            </Button>

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
                                    items={[
                                        { key: 'templates', label: 'Formulaires Publiés' },
                                        { key: 'forms', label: 'Soumissions Jeunesse' },
                                        { key: 'stats', label: 'Analyses & Impact' },
                                    ]}
                                />
                            </div>

                            <div style={{ padding: 40, minHeight: 600 }}>
                                <AnimatePresence mode="wait">
                                    {activeTab === 'templates' && (
                                        <motion.div key="templates" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <Row gutter={[24, 24]}>
                                                {templates.map((tmpl, idx) => (
                                                    <Col key={tmpl.id} xs={24} lg={12}>
                                                        <div style={{
                                                            padding: 24, borderRadius: 24,
                                                            background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                                            transition: 'transform 0.3s ease'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                                                <Space>
                                                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><FileTextOutlined /></div>
                                                                    <Text strong>{tmpl.title}</Text>
                                                                </Space>
                                                                <Tag color="cyan" style={{ margin: 0 }}>{tmpl._responseCount} Réponses</Tag>
                                                            </div>
                                                            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>{tmpl.description || 'Aucune description.'}</Text>
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                <Button type="primary" ghost style={{ flex: 1, borderRadius: 10 }} onClick={() => handleViewResponses(tmpl)}>Détails</Button>
                                                                <Button icon={<QrcodeOutlined />} style={{ borderRadius: 10 }} onClick={() => { }} />
                                                                <Button icon={<CopyOutlined />} style={{ borderRadius: 10 }} onClick={() => { }} />
                                                            </div>
                                                        </div>
                                                    </Col>
                                                ))}
                                            </Row>
                                        </motion.div>
                                    )}

                                    {activeTab === 'forms' && (
                                        <motion.div key="forms" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <Table columns={formColumns} dataSource={forms} rowKey="id" pagination={{ pageSize: 8 }} />
                                        </motion.div>
                                    )}

                                    {activeTab === 'stats' && (
                                        <motion.div key="stats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                            <YouthStatsDashboard onExport={() => { }} data={stats} loading={statsLoading} />
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
                    onSave={() => { setIsBuilderOpen(false); loadData(); }}
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
        </div>
    );
};

export default JeunessePage;
