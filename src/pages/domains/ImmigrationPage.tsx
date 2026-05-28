// ============================================================
// NEXUS-AID — Immigration Page (RESP_IMMIGRATION)
// Migrant cases & Family Links (RLF) management
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Form, Input, Select, App, DatePicker, Avatar, Progress, Tooltip
} from 'antd';
import {
    UsergroupAddOutlined, PlusOutlined, UserOutlined, NodeIndexOutlined,
    GlobalOutlined, SafetyCertificateOutlined, SwapOutlined,
    SearchOutlined, FilterOutlined, SettingOutlined,
    InfoCircleOutlined, CompassOutlined, BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '@/stores';
import { immigrationService } from '@/services/domainServices';
import type { MigrantCaseDTO, FamilyLinkCaseDTO } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ImmigrationPage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('cases');
    const [cases, setCases] = useState<MigrantCaseDTO[]>([]);
    const [links, setLinks] = useState<FamilyLinkCaseDTO[]>([]);

    // Modal states
    const [isCaseModalOpen, setIsCaseModalOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [caseForm] = Form.useForm();
    const [linkForm] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [c, l] = await Promise.all([
                immigrationService.getCases().catch(() => []),
                immigrationService.getFamilyLinks().catch(() => []),
            ]);
            setCases(c || []);
            setLinks(l || []);
        } catch (error) {
            console.error("Failed to load immigration data", error);
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
            const payload: MigrantCaseDTO = {
                migrantName: values.migrantName,
                nationality: values.nationality,
                dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
                status: values.status || 'ASSESSMENT',
                notes: values.notes,
                gender: values.gender || 'UNKNOWN'
            };
            await immigrationService.createCase(payload);
            messageApi.success('Dossier migrant créé avec succès !');
            setIsCaseModalOpen(false);
            caseForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la création du dossier migrant.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateLink = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: FamilyLinkCaseDTO = {
                migrant1Id: values.migrant1Id,
                migrant2Id: values.migrant2Id,
                relationshipType: values.relationshipType,
                status: 'OPEN',
                resolutionNotes: values.resolutionNotes
            };
            await immigrationService.createFamilyLink(payload);
            messageApi.success('Requête de recherche (RLF) enregistrée !');
            setIsLinkModalOpen(false);
            linkForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'enregistrement de la requête RLF.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const caseColumns: ColumnsType<MigrantCaseDTO> = [
        {
            title: 'MIGRANT(E)',
            key: 'migrantName',
            render: (_: any, record: MigrantCaseDTO) => (
                <Space size={14}>
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<UserOutlined />}
                        style={{ background: isDark ? 'rgba(224,28,46,0.1)' : '#fef2f2', color: '#e01c2e', border: `1px solid ${isDark ? 'rgba(224,28,46,0.2)' : '#fee2e2'}`, borderRadius: 12 }}
                    />
                    <div>
                        <Text strong style={{ fontSize: 16, display: 'block' }}>{record.migrantName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.nationality}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'SEXE',
            dataIndex: 'gender',
            key: 'gender',
            render: (g: string) => <Tag bordered={false} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 8, padding: '2px 10px' }}>{g}</Tag>
        },
        {
            title: 'ÂGE (EST.)',
            dataIndex: 'dateOfBirth',
            key: 'age',
            render: (dob: string) => {
                if (!dob) return '—';
                const age = new Date().getFullYear() - new Date(dob).getFullYear();
                return <Text strong>{age} ans</Text>;
            }
        },
        {
            title: 'STATUT OPÉRATIONNEL',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => (
                <Tag color={s === 'RESETTLED' ? 'success' : 'processing'} style={{ borderRadius: 8, padding: '2px 12px', fontWeight: 700 }}>
                    {s}
                </Tag>
            )
        },
        {
            title: 'NOTES',
            dataIndex: 'notes',
            key: 'notes',
            render: (n: string) => <Tooltip title={n}><InfoCircleOutlined style={{ color: '#94a3b8' }} /></Tooltip>
        }
    ];

    const linkColumns: ColumnsType<FamilyLinkCaseDTO> = [
        {
            title: 'LIEN FAMILIAL (RLF)',
            key: 'persons',
            render: (_: any, r: FamilyLinkCaseDTO) => {
                const p1 = cases.find(c => c.id === r.migrant1Id)?.migrantName || `ID: ${r.migrant1Id?.substring(0, 4)}`;
                const p2 = cases.find(c => c.id === r.migrant2Id)?.migrantName || `ID: ${r.migrant2Id?.substring(0, 4)}`;
                return (
                    <Space size={12}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Text strong style={{ fontSize: 14 }}>{p1}</Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>Source</Text>
                        </div>
                        <div style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(224,28,46,0.1)', color: '#e01c2e', fontSize: 12 }}>
                            <SwapOutlined />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Text strong style={{ fontSize: 14 }}>{p2}</Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>Recherché</Text>
                        </div>
                    </Space>
                )
            }
        },
        {
            title: 'RELATION',
            dataIndex: 'relationshipType',
            key: 'relationshipType',
            render: (t: string) => <Tag color="red" style={{ borderRadius: 6 }}>{t}</Tag>
        },
        {
            title: 'ÉTAT DE TRACING',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => <Tag color={s === 'RESOLVED' ? 'success' : 'warning'} style={{ borderRadius: 8 }}>{s}</Tag>
        },
        {
            title: 'RÉSOLUTION',
            dataIndex: 'resolvedDate',
            key: 'resolvedDate',
            render: (d: string) => d ? <Text strong>{new Date(d).toLocaleDateString('fr-FR')}</Text> : <Progress percent={60} size="small" showInfo={false} strokeColor="#f59e0b" />
        }
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement de la direction de l'immigration...</Text>
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
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                <div style={glassStyle}>
                    <Row gutter={0}>
                        {/* SIDEBAR: MISSION (30%) */}
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
                                        fontSize: 24, boxShadow: '0 12px 24px rgba(224,28,46,0.25)',
                                        color: '#fff'
                                    }}>
                                        <GlobalOutlined />
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Immigration</Title>
                                        <Tag color="red" icon={<CompassOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontWeight: 700, fontSize: 11 }}>
                                            NATIONAL
                                        </Tag>
                                    </div>
                                </div>

                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <div style={{ padding: 24, borderRadius: 24, background: isDark ? 'rgba(224,28,46,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(224,28,46,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(224,28,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e01c2e' }}>
                                                <UsergroupAddOutlined style={{ fontSize: 20 }} />
                                            </div>
                                            <BarChartOutlined style={{ color: '#e01c2e', fontSize: 22 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dossiers Migrants</Text>
                                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{cases.length}</Title>
                                    </div>

                                    <div style={{ padding: 24, borderRadius: 24, background: isDark ? 'rgba(224,28,46,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(224,28,46,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(224,28,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e01c2e' }}>
                                                <NodeIndexOutlined style={{ fontSize: 20 }} />
                                            </div>
                                            <Progress type="circle" percent={Math.floor((links.filter(l => l.status === 'RESOLVED').length / (links.length || 1)) * 100)} size={40} strokeColor="#e01c2e" />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>RLF Résolus</Text>
                                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{links.filter(l => l.status === 'RESOLVED').length}</Title>
                                    </div>

                                    <Button
                                        type="primary"
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => activeTab === 'cases' ? setIsCaseModalOpen(true) : setIsLinkModalOpen(true)}
                                        style={{ height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #e01c2e, #c0152a)', border: 'none', fontWeight: 700, marginTop: 12, boxShadow: '0 8px 20px rgba(224,28,46,0.2)' }}
                                    >
                                        {activeTab === 'cases' ? 'Nouveau Migrant' : 'Nouvel RLF'}
                                    </Button>
                                </Space>
                            </div>
                        </Col>

                        {/* CONTENT: HUB OPÉRATIONNEL (70%) */}
                        <Col xs={24} lg={17} style={{ padding: '40px 48px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 6, borderRadius: 16 }}>
                                    {[
                                        { key: 'cases', label: 'Suivi Migrants', icon: <UsergroupAddOutlined /> },
                                        { key: 'rlf', label: 'Tracing RLF', icon: <NodeIndexOutlined /> }
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
                                    <Button icon={<SettingOutlined />} style={{ borderRadius: 12, height: 44, width: 44 }} />
                                </Space>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Table
                                        columns={activeTab === 'cases' ? (caseColumns as any) : (linkColumns as any)}
                                        dataSource={(activeTab === 'cases' ? cases : links) as any}
                                        rowKey="id"
                                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                        className="premium-table"
                                        locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucun dossier</Title><Text type="secondary">Aucune donnée d'immigration enregistrée.</Text></div> }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* MODAL: AJOUTER MIGRANT */}
            <Modal
                title={<Space><UserOutlined style={{ color: '#e01c2e' }} /><Text strong style={{ fontSize: 18 }}>Enregistrer un Migrant</Text></Space>}
                open={isCaseModalOpen}
                onCancel={() => setIsCaseModalOpen(false)}
                footer={null}
                width={650}
                centered
                styles={{ content: { borderRadius: 28, padding: 32 } }}
            >
                <Form form={caseForm} layout="vertical" onFinish={handleCreateCase} requiredMark={false}>
                    <Form.Item name="migrantName" label="Nom & Prénom complet" rules={[{ required: true }]}>
                        <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Moussa Ibrahim" />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="nationality" label="Nationalité d'origine" rules={[{ required: true }]}>
                                <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Soudan" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="gender" label="Sexe">
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="MALE">Homme</Option>
                                    <Option value="FEMALE">Femme</Option>
                                    <Option value="UNKNOWN">Non spécifié</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="dateOfBirth" label="Date de naissance (Approx.)">
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="Statut de prise en charge">
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="ASSESSMENT">En évaluation</Option>
                                    <Option value="ACCOMMODATED">Hébergé</Option>
                                    <Option value="RESETTLED">Relocalisé</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notes" label="Observations (Points de santé / Vulnérabilités)">
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détails importants..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsCaseModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Abandonner</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: 'linear-gradient(135deg, #e01c2e, #c0152a)', border: 'none', fontWeight: 700 }}>
                            Valider l'entrée
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: ENREGISTRER RLF */}
            <Modal
                title={<Space><NodeIndexOutlined style={{ color: '#e01c2e' }} /><Text strong style={{ fontSize: 18 }}>Lien Familial (RLF)</Text></Space>}
                open={isLinkModalOpen}
                onCancel={() => setIsLinkModalOpen(false)}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 28, padding: 32 } }}
            >
                <Form form={linkForm} layout="vertical" onFinish={handleCreateLink} requiredMark={false}>
                    <Form.Item name="migrant1Id" label="Demandeur principal" rules={[{ required: true }]}>
                        <Select size="large" showSearch style={{ borderRadius: 12 }} placeholder="Sélectionner le migrant...">
                            {cases.map(c => <Option key={c.id} value={c.id}>{c.migrantName}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="relationshipType" label="Type de lien recherché" rules={[{ required: true }]}>
                        <Select size="large" style={{ borderRadius: 12 }}>
                            <Option value="PARENT">Parent direct</Option>
                            <Option value="CHILD">Enfant</Option>
                            <Option value="SIBLING">Fratrie</Option>
                            <Option value="SPOUSE">Conjoint(e)</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item name="migrant2Id" label="Personne identifiée (Cible)" rules={[{ required: true }]}>
                        <Select size="large" showSearch style={{ borderRadius: 12 }} placeholder="Sélectionner la cible...">
                            {cases.map(c => <Option key={c.id} value={c.id}>{c.migrantName}</Option>)}
                        </Select>
                    </Form.Item>

                    <Form.Item name="resolutionNotes" label="Notes de tracing">
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Informations de recherche..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsLinkModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: 'linear-gradient(135deg, #e01c2e, #c0152a)', border: 'none', fontWeight: 700 }}>
                            Établir le lien
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default ImmigrationPage;

