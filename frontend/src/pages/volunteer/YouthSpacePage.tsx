// ============================================================
// NEXUS-AID — Espace Jeunesse (Youth Space Page)
// Integration forms, recommendations, and micro-projects
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Tag, Space, Spin, Row, Col, Tabs, Table, Button, Modal, Form, Input,
    Select, Empty, Statistic, message, List, Avatar, DatePicker, Divider, Badge, Result,
} from 'antd';
import {
    SmileOutlined, PlusOutlined, ProjectOutlined, FormOutlined, BulbOutlined,
    CalendarOutlined, TeamOutlined, RocketOutlined, CheckCircleOutlined,
    SendOutlined, EyeOutlined, StarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { jeunesseService } from '@/services/jeunesseService';
import { useAuthStore } from '@/stores';
import type { MicroProjectDTO, YouthIntegrationFormDTO, YouthFormTemplateDTO } from '@/types';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const projectStatusColors: Record<string, string> = {
    PROPOSED: 'blue',
    ACTIVE: 'green',
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

const YouthSpacePage: React.FC = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('projects');
    const [projects, setProjects] = useState<MicroProjectDTO[]>([]);
    const [templates, setTemplates] = useState<YouthFormTemplateDTO[]>([]);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [projectModalVisible, setProjectModalVisible] = useState(false);
    const [formModalVisible, setFormModalVisible] = useState(false);
    const [recommendationVisible, setRecommendationVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [projectForm] = Form.useForm();
    const [integrationForm] = Form.useForm();

    const isApproved = user?.status === 'APPROVED';

    useEffect(() => {
        if (isApproved) loadData();
        else setLoading(false);
    }, [isApproved]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [projectsData, templatesData] = await Promise.all([
                jeunesseService.getProjects(),
                jeunesseService.getTemplates().catch(() => []),
            ]);
            setProjects(projectsData);
            setTemplates(templatesData);
        } catch (err) {
            console.error('Failed to load youth data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Submit integration form
    const handleSubmitForm = async () => {
        try {
            const values = await integrationForm.validateFields();
            setSubmitting(true);
            const payload: YouthIntegrationFormDTO = {
                aspirations: values.aspirations || [],
                skills: values.skills || [],
                aptitudes: values.aptitudes || [],
                interestAreas: values.interestAreas || [],
            };
            await jeunesseService.submitForm(payload);
            message.success('Formulaire d\'intégration soumis avec succès !');
            setFormModalVisible(false);
            integrationForm.resetFields();
        } catch (err: any) {
            if (err?.errorFields) return;
            message.error('Erreur lors de la soumission du formulaire.');
        } finally {
            setSubmitting(false);
        }
    };

    // Create micro project
    const handleCreateProject = async () => {
        try {
            const values = await projectForm.validateFields();
            setSubmitting(true);
            const payload: MicroProjectDTO = {
                title: values.title,
                theme: values.theme,
                description: values.description,
                startDate: values.dates?.[0]?.format('YYYY-MM-DD') || '',
                endDate: values.dates?.[1]?.format('YYYY-MM-DD'),
            };
            await jeunesseService.createProject(payload);
            message.success('Micro-projet proposé avec succès !');
            setProjectModalVisible(false);
            projectForm.resetFields();
            loadData();
        } catch (err: any) {
            if (err?.errorFields) return;
            message.error('Erreur lors de la création du projet.');
        } finally {
            setSubmitting(false);
        }
    };

    // Load recommendation for a form
    const handleViewRecommendation = async (formId: string) => {
        try {
            const rec = await jeunesseService.getRecommendation(formId);
            setRecommendation(rec);
            setRecommendationVisible(true);
        } catch {
            message.info('Aucune recommandation disponible pour ce formulaire.');
        }
    };

    const myProjects = projects.filter((p) => p.leadVolunteerId === user?.id);
    const otherProjects = projects.filter((p) => p.leadVolunteerId !== user?.id);

    const projectColumns: ColumnsType<MicroProjectDTO> = [
        {
            title: 'Titre',
            dataIndex: 'title',
            key: 'title',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Thème',
            dataIndex: 'theme',
            key: 'theme',
            width: 140,
            render: (theme: string) => (
                <Tag color={themeColors[theme] || 'default'}>{theme}</Tag>
            ),
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => (
                <Tag color={projectStatusColors[status || ''] || 'default'}>{status || 'PROPOSED'}</Tag>
            ),
        },
        {
            title: 'Dates',
            key: 'dates',
            width: 190,
            render: (_, record) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                    <CalendarOutlined /> {record.startDate || '—'} → {record.endDate || '—'}
                </Text>
            ),
        },
    ];

    if (!isApproved) {
        return (
            <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 24px' }}>
                <Alert
                    message="Accès restreint"
                    description="Vous devez être approuvé par le président de votre comité pour accéder à cette section. Votre demande est en cours de traitement."
                    type="warning"
                    showIcon
                    style={{ borderRadius: 12 }}
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Chargement de l'espace jeunesse...">
                    <div style={{ width: 1, height: 1 }} />
                </Spin>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <Card
                style={{
                    borderRadius: 16,
                    marginBottom: 24,
                    background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)',
                    border: 'none',
                }}
            >
                <Row align="middle" gutter={24}>
                    <Col>
                        <SmileOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.9 }} />
                    </Col>
                    <Col flex={1}>
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>Espace Jeunesse</Title>
                        <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                            Formulaires d'intégration, recommandations et micro-projets
                        </Text>
                    </Col>
                    <Col>
                        <Space>
                            <Button
                                icon={<FormOutlined />}
                                onClick={() => setFormModalVisible(true)}
                                style={{ borderColor: '#fff', color: '#fff' }}
                                ghost
                            >
                                Formulaire
                            </Button>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setProjectModalVisible(true)}
                                style={{ background: '#fff', color: '#059669', borderColor: '#fff' }}
                            >
                                Nouveau Projet
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Stats */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={8}>
                    <Card style={{ borderRadius: 12, borderTop: '3px solid #059669' }}>
                        <Statistic
                            title="Mes Projets"
                            value={myProjects.length}
                            prefix={<RocketOutlined style={{ color: '#059669' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card style={{ borderRadius: 12, borderTop: '3px solid #7c3aed' }}>
                        <Statistic
                            title="Tous les Projets"
                            value={projects.length}
                            prefix={<ProjectOutlined style={{ color: '#7c3aed' }} />}
                        />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card style={{ borderRadius: 12, borderTop: '3px solid #f59e0b' }}>
                        <Statistic
                            title="Templates"
                            value={templates.length}
                            prefix={<FormOutlined style={{ color: '#f59e0b' }} />}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Tabs */}
            <Card style={{ borderRadius: 12 }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: 'projects',
                            label: <Space><RocketOutlined /> Micro-Projets</Space>,
                            children: (
                                <>
                                    {myProjects.length > 0 && (
                                        <>
                                            <Title level={5}><StarOutlined style={{ color: '#f59e0b' }} /> Mes Projets</Title>
                                            <Table
                                                dataSource={myProjects}
                                                columns={projectColumns}
                                                rowKey="id"
                                                pagination={false}
                                                size="small"
                                                style={{ marginBottom: 24 }}
                                            />
                                            <Divider />
                                        </>
                                    )}
                                    <Title level={5}><ProjectOutlined /> Tous les Projets</Title>
                                    <Table
                                        dataSource={projects}
                                        columns={projectColumns}
                                        rowKey="id"
                                        pagination={{ pageSize: 8 }}
                                        locale={{ emptyText: <Empty description="Aucun micro-projet disponible" /> }}
                                    />
                                </>
                            ),
                        },
                        {
                            key: 'templates',
                            label: <Space><FormOutlined /> Formulaires</Space>,
                            children: (
                                <>
                                    {templates.length > 0 ? (
                                        <List
                                            dataSource={templates}
                                            renderItem={(template) => (
                                                <List.Item
                                                    actions={[
                                                        <Button type="link" icon={<SendOutlined />} key="fill">
                                                            Remplir
                                                        </Button>,
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        avatar={
                                                            <Avatar
                                                                style={{ backgroundColor: '#f0fdf4' }}
                                                                icon={<FormOutlined style={{ color: '#059669' }} />}
                                                            />
                                                        }
                                                        title={<Text strong>{template.title}</Text>}
                                                        description={
                                                            <Space direction="vertical" size={2}>
                                                                <Text type="secondary">{template.description}</Text>
                                                                <Tag>{template.targetLevel}</Tag>
                                                            </Space>
                                                        }
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                    ) : (
                                        <Empty description="Aucun template de formulaire disponible" />
                                    )}
                                </>
                            ),
                        },
                    ]}
                />
            </Card>

            {/* Create Project Modal */}
            <Modal
                title={<Space><RocketOutlined /> Proposer un Micro-Projet</Space>}
                open={projectModalVisible}
                onCancel={() => { setProjectModalVisible(false); projectForm.resetFields(); }}
                footer={[
                    <Button key="cancel" onClick={() => { setProjectModalVisible(false); projectForm.resetFields(); }}>
                        Annuler
                    </Button>,
                    <Button key="submit" type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleCreateProject}>
                        Proposer
                    </Button>,
                ]}
                width={560}
            >
                <Form form={projectForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="title" label="Titre du projet" rules={[{ required: true, message: 'Saisissez un titre' }]}>
                        <Input placeholder="Ex: Nettoyage de la plage" />
                    </Form.Item>
                    <Form.Item name="theme" label="Thème" rules={[{ required: true, message: 'Choisissez un thème' }]}>
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
                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Décrivez le projet' }]}>
                        <TextArea rows={3} placeholder="Décrivez le projet en quelques lignes..." />
                    </Form.Item>
                    <Form.Item name="dates" label="Dates (début — fin)">
                        <DatePicker.RangePicker style={{ width: '100%' }} />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Integration Form Modal */}
            <Modal
                title={<Space><FormOutlined /> Formulaire d'Intégration Jeunesse</Space>}
                open={formModalVisible}
                onCancel={() => { setFormModalVisible(false); integrationForm.resetFields(); }}
                footer={[
                    <Button key="cancel" onClick={() => { setFormModalVisible(false); integrationForm.resetFields(); }}>
                        Annuler
                    </Button>,
                    <Button key="submit" type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmitForm}>
                        Soumettre
                    </Button>,
                ]}
                width={600}
            >
                <Form form={integrationForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="aspirations" label="Vos aspirations" rules={[{ required: true, message: 'Ajoutez au moins une aspiration' }]}>
                        <Select mode="tags" placeholder="Ex: Leadership, Formation..." tokenSeparators={[',']} />
                    </Form.Item>
                    <Form.Item name="skills" label="Vos compétences" rules={[{ required: true, message: 'Ajoutez au moins une compétence' }]}>
                        <Select mode="tags" placeholder="Ex: Communication, Premiers secours..." tokenSeparators={[',']} />
                    </Form.Item>
                    <Form.Item name="aptitudes" label="Vos aptitudes">
                        <Select mode="tags" placeholder="Ex: Travail en équipe, Organisation..." tokenSeparators={[',']} />
                    </Form.Item>
                    <Form.Item name="interestAreas" label="Centres d'intérêt">
                        <Select
                            mode="multiple"
                            placeholder="Sélectionnez vos centres d'intérêt"
                            options={[
                                { label: 'Secourisme', value: 'Secourisme' },
                                { label: 'Santé', value: 'Santé' },
                                { label: 'Environnement', value: 'Environnement' },
                                { label: 'Éducation', value: 'Éducation' },
                                { label: 'Action Sociale', value: 'Action Sociale' },
                                { label: 'Jeunesse', value: 'Jeunesse' },
                                { label: 'Immigration', value: 'Immigration' },
                                { label: 'Communication', value: 'Communication' },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Recommendation Detail Modal */}
            <Modal
                title={<Space><BulbOutlined /> Recommandation</Space>}
                open={recommendationVisible}
                onCancel={() => setRecommendationVisible(false)}
                footer={<Button onClick={() => setRecommendationVisible(false)}>Fermer</Button>}
            >
                {recommendation ? (
                    <div>
                        <Title level={5}>{recommendation.title}</Title>
                        <Paragraph>{recommendation.description}</Paragraph>
                        <Space wrap>
                            <Tag color="blue">{recommendation.category}</Tag>
                            <Tag color="green">{recommendation.priority}</Tag>
                            <Tag>{recommendation.target}</Tag>
                        </Space>
                    </div>
                ) : (
                    <Empty description="Aucune recommandation" />
                )}
            </Modal>
        </div>
    );
};

export default YouthSpacePage;
