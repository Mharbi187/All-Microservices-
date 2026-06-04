// ============================================================
// NEXUS-AID — Espace Jeunesse (Youth Space Page)
// Integration forms, recommendations, and micro-projects
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Tag, Space, Spin, Row, Col, Tabs, Table, Button, Modal, Form, Input,
    Select, Empty, Statistic, message, List, Avatar, DatePicker, Divider, Badge, Result, Alert,
} from 'antd';
import {
    SmileOutlined, PlusOutlined, ProjectOutlined, FormOutlined, BulbOutlined,
    CalendarOutlined, TeamOutlined, RocketOutlined, CheckCircleOutlined,
    SendOutlined, EyeOutlined, StarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { jeunesseService } from '@/services/jeunesseService';
import { useAuthStore } from '@/stores';
import type { MicroProjectDTO, YouthIntegrationFormDTO, YouthFormTemplateDTO, YouthRecommendationDTO } from '@/types';
import dayjs from 'dayjs';

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

const YouthSpacePage: React.FC = () => {
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('projects');
    const [projects, setProjects] = useState<MicroProjectDTO[]>([]);
    const [templates, setTemplates] = useState<YouthFormTemplateDTO[]>([]);
    const [recommendation, setRecommendation] = useState<any>(null);
    const [publishedRecommendations, setPublishedRecommendations] = useState<YouthRecommendationDTO[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [projectModalVisible, setProjectModalVisible] = useState(false);
    const [formModalVisible, setFormModalVisible] = useState(false);
    const [recommendationVisible, setRecommendationVisible] = useState(false);
    const [isDynamicFormModalOpen, setIsDynamicFormModalOpen] = useState(false);
    const [selectedTemplateForFill, setSelectedTemplateForFill] = useState<YouthFormTemplateDTO | null>(null);
    
    const [submitting, setSubmitting] = useState(false);
    const [projectForm] = Form.useForm();
    const [integrationForm] = Form.useForm();
    const [dynamicForm] = Form.useForm();

    const isApproved = user?.status === 'APPROVED';
    // Restrict "Integration Jeunesse" exclusively to classic volunteers (no responsible roles)
    const isClassicVolunteer = user?.roles?.every(role =>
        !role.startsWith('RESP_') &&
        role !== 'PRESIDENT' &&
        role !== 'VICE_PRESIDENT'
    );

    useEffect(() => {
        if (isApproved) loadData();
        else setLoading(false);
    }, [isApproved]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [projectsData, templatesData, recsData] = await Promise.all([
                jeunesseService.getProjects(),
                jeunesseService.getTemplates().catch(() => []),
                jeunesseService.getRecommendations().catch(() => [])
            ]);
            setProjects(projectsData);
            setTemplates(templatesData);
            setPublishedRecommendations(recsData);
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
            const formRes = await jeunesseService.submitForm(payload);
            message.success('Formulaire d\'intégration soumis avec succès !');
            setFormModalVisible(false);
            integrationForm.resetFields();

            // Live instant AI recommendation generation
            if (formRes.id) {
                try {
                    message.loading({ content: 'Génération de votre orientation personnalisée par l\'IA...', key: 'ai-rec', duration: 0 });
                    const rec = await jeunesseService.autoGenerateRecommendation(formRes.id);
                    message.success({ content: 'Orientation IA générée avec succès !', key: 'ai-rec' });
                    setRecommendation(rec);
                    setRecommendationVisible(true);
                } catch (err) {
                    message.destroy('ai-rec');
                    console.error('Failed to auto-generate AI recommendation:', err);
                }
            }
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
            message.success('Micro-projet proposé avec succès ! (En attente de validation du Président)');
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

    // Submit dynamic template form response
    const handleSubmitDynamicForm = async () => {
        if (!selectedTemplateForFill) return;
        try {
            const values = await dynamicForm.validateFields();
            setSubmitting(true);

            // Format values (especially date picker formatting)
            const formattedAnswers: Record<string, any> = {};
            Object.keys(values).forEach(key => {
                const val = values[key];
                if (dayjs.isDayjs(val)) {
                    formattedAnswers[key] = val.format('YYYY-MM-DD');
                } else {
                    formattedAnswers[key] = val;
                }
            });

            const payload: any = {
                idFormTemplate: selectedTemplateForFill.id!,
                idVolunteer: user?.id || '',
                responses: JSON.stringify(formattedAnswers),
            };

            await jeunesseService.submitDynamicResponse(payload);
            message.success('Votre réponse a été enregistrée avec succès !');
            setIsDynamicFormModalOpen(false);
            setSelectedTemplateForFill(null);
            dynamicForm.resetFields();
            loadData();
        } catch (error: any) {
            if (error?.errorFields) return;
            message.error('Échec de la soumission de votre réponse.');
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
            width: 150,
            render: (status: string) => (
                <Tag color={projectStatusColors[status || ''] || 'default'}>{status || 'PENDING_VALIDATION'}</Tag>
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
                            {isClassicVolunteer && (
                                <Button
                                    icon={<FormOutlined />}
                                    onClick={() => setFormModalVisible(true)}
                                    style={{ borderColor: '#fff', color: '#fff' }}
                                    ghost
                                >
                                    Formulaire d'Intégration
                                </Button>
                            )}
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
                            title="Formulaires Disponibles"
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
                                                        <Button
                                                            type="primary"
                                                            icon={<SendOutlined />}
                                                            key="fill"
                                                            onClick={() => {
                                                                setSelectedTemplateForFill(template);
                                                                dynamicForm.resetFields();
                                                                setIsDynamicFormModalOpen(true);
                                                            }}
                                                        >
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
                        {
                            key: 'recommendations',
                            label: <Space><BulbOutlined /> Orientation & Conseils</Space>,
                            children: (
                                <List
                                    grid={{ gutter: 16, column: 2 }}
                                    dataSource={publishedRecommendations}
                                    locale={{ emptyText: <Empty description="Aucune recommandation publiée" /> }}
                                    renderItem={(rec) => (
                                        <List.Item>
                                            <Card style={{ borderRadius: 12, borderLeft: '4px solid #059669', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text strong style={{ fontSize: 16 }}>{rec.title}</Text>
                                                        <Tag color={rec.priority === 'ELEVEE' ? 'red' : rec.priority === 'MOYENNE' ? 'orange' : 'green'}>{rec.priority}</Tag>
                                                    </div>
                                                    <Tag color="blue">{rec.category}</Tag>
                                                    <Paragraph type="secondary" style={{ margin: 0 }}>{rec.description}</Paragraph>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>Cible : <Text strong>{rec.target}</Text></Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>Date : {rec.dateCreation ? new Date(rec.dateCreation).toLocaleDateString() : '—'}</Text>
                                                    </div>
                                                </Space>
                                            </Card>
                                        </List.Item>
                                    )}
                                />
                            )
                        }
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

            {/* Dynamic Form Filler Modal */}
            <Modal
                title={selectedTemplateForFill?.title}
                open={isDynamicFormModalOpen}
                onCancel={() => {
                    setIsDynamicFormModalOpen(false);
                    setSelectedTemplateForFill(null);
                    dynamicForm.resetFields();
                }}
                footer={[
                    <Button key="cancel" onClick={() => {
                        setIsDynamicFormModalOpen(false);
                        setSelectedTemplateForFill(null);
                        dynamicForm.resetFields();
                    }}>
                        Annuler
                    </Button>,
                    <Button key="submit" type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmitDynamicForm}>
                        Soumettre
                    </Button>
                ]}
                width={650}
            >
                {selectedTemplateForFill && (
                    <Form form={dynamicForm} layout="vertical" style={{ marginTop: 16 }}>
                        <Paragraph type="secondary">{selectedTemplateForFill.description}</Paragraph>
                        <Divider />
                        {(() => {
                            try {
                                const qs = JSON.parse(selectedTemplateForFill.questions) as any[];
                                return qs.map((q: any) => {
                                    return (
                                        <Form.Item
                                            key={q.id}
                                            name={q.id}
                                            label={q.label}
                                            rules={[{ required: q.required, message: 'Ce champ est obligatoire' }]}
                                        >
                                            {q.type === 'TEXT' && (
                                                <Input placeholder="Saisissez votre réponse..." />
                                            )}
                                            {q.type === 'RADIO' && (
                                                <Select
                                                    placeholder="Choisissez une option"
                                                    options={(q.options || []).map((o: string) => ({ label: o, value: o }))}
                                                />
                                            )}
                                            {q.type === 'CHECKBOX' && (
                                                <Select
                                                    mode="multiple"
                                                    placeholder="Choisissez une ou plusieurs options"
                                                    options={(q.options || []).map((o: string) => ({ label: o, value: o }))}
                                                />
                                            )}
                                            {q.type === 'SATISFACTION' && (
                                                <Select
                                                    placeholder="Niveau de satisfaction"
                                                    options={[1, 2, 3, 4, 5].map(v => ({ label: `${v} / 5`, value: v }))}
                                                />
                                            )}
                                            {q.type === 'BOOLEAN' && (
                                                <Select
                                                    placeholder="Oui ou Non"
                                                    options={[
                                                        { label: 'Oui', value: 'Oui' },
                                                        { label: 'Non', value: 'Non' }
                                                    ]}
                                                />
                                            )}
                                            {q.type === 'DATE' && (
                                                <DatePicker style={{ width: '100%' }} />
                                            )}
                                            {q.type === 'RATING' && (
                                                <Select
                                                    placeholder="Évaluation"
                                                    options={[1, 2, 3, 4, 5].map(v => ({ label: `${v} Étoiles`, value: v }))}
                                                />
                                            )}
                                        </Form.Item>
                                    );
                                });
                            } catch (e) {
                                return <Alert type="error" message="Erreur de parsing des questions de ce formulaire." />;
                            }
                        })()}
                    </Form>
                )}
            </Modal>
        </div>
    );
};

export default YouthSpacePage;
