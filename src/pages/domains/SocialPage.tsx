// ============================================================
// NEXUS-AID — Social Page (RESP_SOCIAL)
// Vulnerable families & social actions management
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Form, Input, Select, App, InputNumber, DatePicker, Avatar, Progress
} from 'antd';
import {
    TeamOutlined, PlusOutlined, HeartOutlined, HomeOutlined,
    GlobalOutlined, CoffeeOutlined, SmileOutlined, BarChartOutlined,
    FilterOutlined, SettingOutlined, PhoneOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '@/stores';
import { socialService } from '@/services/domainServices';
import type { FamilyDTO, SocialActionDTO, SocialAnalyticsDTO } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SocialPage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('families');
    const [families, setFamilies] = useState<FamilyDTO[]>([]);
    const [actions, setActions] = useState<SocialActionDTO[]>([]);
    const [analytics, setAnalytics] = useState<SocialAnalyticsDTO | null>(null);

    // Modal states
    const [isFamModalOpen, setIsFamModalOpen] = useState(false);
    const [isActModalOpen, setIsActModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [famForm] = Form.useForm();
    const [actForm] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        try {
            const [fams, acts, stats] = await Promise.all([
                socialService.getFamilies().catch(() => []),
                socialService.getAllActions().catch(() => []),
                socialService.getAnalytics().catch(() => null),
            ]);
            setFamilies(fams || []);
            setActions(acts || []);
            setAnalytics(stats);
        } catch (error) {
            console.error("Failed to load social data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateFamily = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: FamilyDTO = {
                headOfHousehold: values.headOfHousehold,
                address: values.address,
                phoneNumber: values.phoneNumber,
                householdSize: values.householdSize,
                incomeCategory: values.incomeCategory || 'LOW_INCOME',
                status: values.status || 'ACTIVE'
            };
            await socialService.createFamily(payload);
            messageApi.success('Dossier familial créé avec succès !');
            setIsFamModalOpen(false);
            famForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la création du dossier familial.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateAction = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: SocialActionDTO = {
                familyId: values.familyId,
                type: values.type,
                description: values.description,
                date: values.date ? values.date.format('YYYY-MM-DD') : new Date().toISOString().split('T')[0],
                status: values.status || 'COMPLETED',
                assignedVolunteerId: null
            };
            await socialService.createAction(payload);
            messageApi.success('Action sociale enregistrée avec succès !');
            setIsActModalOpen(false);
            actForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'enregistrement de l\'action sociale.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const famColumns: ColumnsType<FamilyDTO> = [
        {
            title: 'CHEF DE FAMILLE',
            key: 'headOfHousehold',
            render: (_, record) => (
                <Space size={14}>
                    <Avatar
                        shape="square"
                        size={44}
                        icon={<HomeOutlined />}
                        style={{ background: isDark ? 'rgba(245,158,11,0.1)' : '#fff7ed', color: '#f59e0b', border: `1px solid ${isDark ? 'rgba(245,158,11,0.2)' : '#ffedd5'}`, borderRadius: 12 }}
                    />
                    <div>
                        <Text strong style={{ fontSize: 16, display: 'block' }}>{record.headOfHousehold}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.address}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'FOYER',
            dataIndex: 'householdSize',
            key: 'householdSize',
            render: (size) => <Tag bordered={false} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 8, padding: '2px 12px', fontWeight: 600 }}>{size} Pers.</Tag>
        },
        {
            title: 'REVENU',
            dataIndex: 'incomeCategory',
            key: 'incomeCategory',
            render: (c) => (
                <Tag color={c === 'NO_INCOME' ? 'error' : 'warning'} bordered={false} style={{ borderRadius: 6 }}>
                    {c?.replace('_', ' ')}
                </Tag>
            )
        },
        {
            title: 'CONTACT',
            dataIndex: 'phoneNumber',
            key: 'phoneNumber',
            render: (phone) => <Space><PhoneOutlined style={{ color: '#94a3b8' }} /><Text copyable>{phone}</Text></Space>
        },
        {
            title: 'ÉLIGIBILITÉ',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <Tag icon={<SafetyCertificateOutlined />} color="success" style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 700 }}>{s || 'ACTIVE'}</Tag>
        }
    ];

    const actColumns: ColumnsType<SocialActionDTO> = [
        {
            title: 'INTERVENTION',
            key: 'type',
            render: (_, record) => (
                <Space size={14}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#10b981', border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : '#dcfce7'}`
                    }}>
                        <HeartOutlined style={{ fontSize: 18 }} />
                    </div>
                    <div>
                        <Text strong style={{ display: 'block' }}>{record.type?.replace('_', ' ')}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>Action Sociale</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'BÉNÉFICIAIRE',
            dataIndex: 'familyId',
            key: 'familyId',
            render: (id) => {
                const fam = families.find(f => f.id === id);
                return <Text strong style={{ color: '#10b981' }}>{fam?.headOfHousehold || `Famille #${id?.substring(0, 4)}`}</Text>;
            }
        },
        {
            title: 'DÉTAILS EXÉCUTION',
            dataIndex: 'description',
            key: 'description',
            render: (desc) => <Text type="secondary" style={{ fontSize: 12 }}>{desc?.substring(0, 40) || 'Aucun détail'}...</Text>
        },
        {
            title: 'DATE',
            dataIndex: 'date',
            key: 'date',
            render: (d) => <Text strong>{d ? new Date(d).toLocaleDateString('fr-FR') : '—'}</Text>
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <Tag color={s === 'COMPLETED' ? 'success' : 'processing'} style={{ borderRadius: 8 }}>{s}</Tag>
        }
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement de la direction sociale...</Text>
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
                        {/* SIDEBAR: INTERVENTION (30%) */}
                        <Col xs={24} lg={7} style={{
                            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                            background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.5)',
                            padding: '40px 32px'
                        }}>
                            <div style={{ position: 'sticky', top: 40 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                                    <div style={{
                                        width: 60, height: 60, borderRadius: 20,
                                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28, boxShadow: '0 12px 24px rgba(245,158,11,0.25)'
                                    }}>
                                        🤝
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Sociaux</Title>
                                        <Tag color="orange" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontWeight: 700, fontSize: 11 }}>
                                            NATIONAL
                                        </Tag>
                                    </div>
                                </div>

                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <div style={{ padding: 24, borderRadius: 24, background: isDark ? 'rgba(245,158,11,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(245,158,11,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                                <HomeOutlined style={{ fontSize: 20 }} />
                                            </div>
                                            <BarChartOutlined style={{ color: '#f59e0b', fontSize: 22 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Familles Actives</Text>
                                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{families.length}</Title>
                                    </div>

                                    <div style={{ padding: 24, borderRadius: 24, background: isDark ? 'rgba(16,185,129,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(16,185,129,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                                <HeartOutlined style={{ fontSize: 20 }} />
                                            </div>
                                            <Progress type="circle" percent={actions.filter(a => a.status === 'COMPLETED').length} size={40} strokeColor="#10b981" />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aides Livrées</Text>
                                        <Title level={2} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{actions.length}</Title>
                                    </div>

                                    <Button
                                        type="primary"
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => activeTab === 'families' ? setIsFamModalOpen(true) : setIsActModalOpen(true)}
                                        style={{ height: 52, borderRadius: 16, background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700, marginTop: 12, boxShadow: '0 8px 20px rgba(245,158,11,0.2)' }}
                                    >
                                        {activeTab === 'families' ? 'Nouvelle Famille' : 'Enregistrer Aide'}
                                    </Button>
                                </Space>
                            </div>
                        </Col>

                        {/* CONTENT: HUB INTERVENTION (70%) */}
                        <Col xs={24} lg={17} style={{ padding: '40px 48px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 6, borderRadius: 16 }}>
                                    {[
                                        { key: 'families', label: 'Bénéficiaires', icon: <TeamOutlined /> },
                                        { key: 'actions', label: 'Historique Aide', icon: <HeartOutlined /> }
                                    ].map(tab => (
                                        <Button
                                            key={tab.key}
                                            type="text"
                                            icon={tab.icon}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{
                                                height: 42, padding: '0 24px', borderRadius: 12,
                                                fontWeight: 800,
                                                background: activeTab === tab.key ? (isDark ? 'rgba(245,158,11,0.2)' : '#fff') : 'transparent',
                                                color: activeTab === tab.key ? '#f59e0b' : (isDark ? 'rgba(255,255,255,0.4)' : '#64748b'),
                                                boxShadow: activeTab === tab.key && !isDark ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </div>

                                <Space>
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
                                        columns={activeTab === 'families' ? (famColumns as any) : (actColumns as any)}
                                        dataSource={activeTab === 'families' ? families : actions}
                                        rowKey="id"
                                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                        className="premium-table"
                                        locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Dossier vide</Title><Text type="secondary">Aucune intervention sociale pour le moment.</Text></div> }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* MODAL: AJOUTER FAMILLE */}
            <Modal
                title={<Space><HomeOutlined style={{ color: '#f59e0b' }} /><Text strong style={{ fontSize: 18 }}>Enregistrer une Famille</Text></Space>}
                open={isFamModalOpen}
                onCancel={() => setIsFamModalOpen(false)}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 28, padding: 32 } }}
            >
                <Form form={famForm} layout="vertical" onFinish={handleCreateFamily} requiredMark={false}>
                    <Form.Item name="headOfHousehold" label="Nom & Prénom du Chef de Famille" rules={[{ required: true }]}>
                        <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Jean Dupont" />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="householdSize" label="Nombre de membres" rules={[{ required: true }]}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 12 }} min={1} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="incomeCategory" label="Classification sociale">
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="NO_INCOME">Sans Revenu</Option>
                                    <Option value="LOW_INCOME">Revenu Modeste</Option>
                                    <Option value="IRREGULAR_INCOME">Revenu Irrégulier</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="phoneNumber" label="Numéro de contact">
                                <Input size="large" style={{ borderRadius: 12 }} placeholder="00 000 000" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="État du dossier">
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="ACTIVE">Vérifié & Actif</Option>
                                    <Option value="EVALUATING">En cours d'étude</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="address" label="Adresse de résidence" rules={[{ required: true }]}>
                        <TextArea rows={2} style={{ borderRadius: 12 }} placeholder="Localisation précise..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsFamModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Abandonner</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: '#f59e0b', borderColor: '#f59e0b', fontWeight: 700 }}>
                            Valider le dossier
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: ENREGISTRER ACTION */}
            <Modal
                title={<Space><HeartOutlined style={{ color: '#10b981' }} /><Text strong style={{ fontSize: 18 }}>Consigner une Aide</Text></Space>}
                open={isActModalOpen}
                onCancel={() => setIsActModalOpen(false)}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 28, padding: 32 } }}
            >
                <Form form={actForm} layout="vertical" onFinish={handleCreateAction} requiredMark={false}>
                    <Form.Item name="familyId" label="Famille Bénéficiaire" rules={[{ required: true }]}>
                        <Select
                            size="large"
                            showSearch
                            style={{ borderRadius: 12 }}
                            placeholder="Sélectionner par nom..."
                            optionFilterProp="children"
                        >
                            {families.map(f => (
                                <Option key={f.id} value={f.id}>{f.headOfHousehold}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="type" label="Nature de l'intervention" rules={[{ required: true }]}>
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="AIDE_ALIMENTAIRE">Panier Alimentaire</Option>
                                    <Option value="AIDE_FINANCIERE">Subvention Directe</Option>
                                    <Option value="VETEMENTS">Vêtements / Literie</Option>
                                    <Option value="RENTREE_SCOLAIRE">Kit Scolaire</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="date" label="Date de distribution">
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Notes d'intervention" rules={[{ required: true }]}>
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détaillez le contenu de l'aide..." />
                    </Form.Item>

                    <Form.Item name="status" label="Statut d'exécution">
                        <Select size="large" style={{ borderRadius: 12 }}>
                            <Option value="COMPLETED">Distribué avec succès</Option>
                            <Option value="PLANNED">Planifié pour livraison</Option>
                        </Select>
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsActModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}>
                            Enregistrer l'aide
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SocialPage;

