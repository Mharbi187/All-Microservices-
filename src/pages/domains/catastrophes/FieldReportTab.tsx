// ============================================================
// NEXUS-AID — Field Reports Tab
// Assign templates to missions & manage submitted field reports
// ============================================================
import React, { useCallback, useEffect, useState } from 'react';
import {
    Button, Col, Empty, Form, message, Modal, Row, Select, Spin,
    Statistic, Table, Tag, Typography, Space, Input, Divider,
    Collapse, Badge, DatePicker
} from 'antd';
import {
    FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined,
    EyeOutlined, ReloadOutlined, LinkOutlined, UserOutlined,
    SendOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { useAuthStore } from '@/stores';
import { catastropheService } from '@/services/catastropheService';
import { templateBuilderService } from '@/services/templateBuilderService';
import type { DisasterMissionDTO, DisasterFieldReportDTO } from '@/types';
import type { TemplateDTO } from '@/types/template.types';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface FieldReportTabProps {
    isDark: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    PENDING: { color: 'orange', label: 'En attente', icon: <ClockCircleOutlined /> },
    SUBMITTED: { color: 'blue', label: 'Soumis', icon: <SendOutlined /> },
    VALIDATED: { color: 'green', label: 'Validé', icon: <CheckCircleOutlined /> },
};

const FieldReportTab: React.FC<FieldReportTabProps> = ({ isDark }) => {
    const user = useAuthStore((s) => s.user);
    const [missions, setMissions] = useState<DisasterMissionDTO[]>([]);
    const [reports, setReports] = useState<Record<string, DisasterFieldReportDTO[]>>({});
    const [templates, setTemplates] = useState<TemplateDTO[]>([]);
    const [myReports, setMyReports] = useState<DisasterFieldReportDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedMission, setSelectedMission] = useState<DisasterMissionDTO | null>(null);
    const [assignSubmitting, setAssignSubmitting] = useState(false);
    const [validateModalOpen, setValidateModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState<DisasterFieldReportDTO | null>(null);
    const [validatorNotes, setValidatorNotes] = useState('');
    const [form] = Form.useForm<{ templateId: string }>();

    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const committeeId = user?.committeeId ?? '';
    const isManager = user?.roles?.includes('RESP_CATASTROPHES') ||
        user?.roles?.some(r => ['PRESIDENT', 'PRESIDENT_NATIONAL', 'PRESIDENT_REGIONAL', 'VICE_PRESIDENT'].includes(r));

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [mData, tData] = await Promise.all([
                isNational
                    ? catastropheService.getAllMissions()
                    : catastropheService.getMissionsByCommittee(committeeId),
                templateBuilderService.list(),
            ]);
            setMissions(mData);
            setTemplates(tData);

            if (!isManager) {
                const myData = await catastropheService.getMyFieldReports();
                setMyReports(myData);
            }

            // Load reports for each mission
            const reportsMap: Record<string, DisasterFieldReportDTO[]> = {};
            await Promise.all(
                mData.filter(m => m.id).map(async (m) => {
                    try {
                        reportsMap[m.id!] = await catastropheService.getFieldReportsByMission(m.id!);
                    } catch {
                        reportsMap[m.id!] = [];
                    }
                })
            );
            setReports(reportsMap);
        } catch {
            message.error('Erreur lors du chargement');
        } finally {
            setLoading(false);
        }
    }, [committeeId, isManager, isNational]);

    useEffect(() => { void load(); }, [load]);

    const handleAssignTemplate = async (values: { templateId: string, deadline?: dayjs.Dayjs }) => {
        if (!selectedMission?.id) return;
        setAssignSubmitting(true);
        try {
            const deadlineIso = values.deadline ? values.deadline.toISOString() : undefined;
            await catastropheService.assignTemplate(selectedMission.id, values.templateId, deadlineIso);
            message.success('Template assigné avec succès à la mission');
            setAssignModalOpen(false);
            void load();
        } catch {
            message.error('Erreur lors de l\'assignation du template');
        } finally {
            setAssignSubmitting(false);
        }
    };

    const handleValidate = async () => {
        if (!selectedReport?.id) return;
        try {
            await catastropheService.validateFieldReport(selectedReport.id, validatorNotes);
            message.success('Rapport validé');
            setValidateModalOpen(false);
            setValidatorNotes('');
            void load();
        } catch {
            message.error('Erreur lors de la validation');
        }
    };

    const cardStyle = {
        background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        padding: 20,
    };

    const allReports = Object.values(reports).flat();
    const statsData = [
        { label: 'Missions avec template', value: missions.filter(m => m.reportTemplateId).length, color: '#1890ff' },
        { label: 'Rapports soumis', value: allReports.filter(r => r.status === 'SUBMITTED').length, color: '#fa8c16' },
        { label: 'Rapports validés', value: allReports.filter(r => r.status === 'VALIDATED').length, color: '#52c41a' },
        { label: 'Total rapports', value: allReports.length, color: '#e01c2e' },
    ];

    const reportColumns: ColumnsType<DisasterFieldReportDTO> = [
        {
            title: 'Volontaire',
            key: 'volunteer',
            render: (_, rec) => (
                <Space>
                    <UserOutlined style={{ color: '#e01c2e' }} />
                    <Text style={{ fontSize: 13 }}>{rec.volunteerName ?? rec.volunteerId ?? '—'}</Text>
                </Space>
            ),
        },
        {
            title: 'Statut',
            key: 'status',
            render: (_, rec) => {
                const cfg = STATUS_CONFIG[rec.status ?? 'PENDING'] ?? STATUS_CONFIG.PENDING;
                return (
                    <Tag icon={cfg.icon} color={cfg.color} style={{ borderRadius: 6 }}>
                        {cfg.label}
                    </Tag>
                );
            },
        },
        {
            title: 'Soumis le',
            key: 'submittedAt',
            render: (_, rec) => rec.submittedAt ? dayjs(rec.submittedAt).format('DD/MM/YYYY HH:mm') : '—',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, rec) => (
                <Space size={6}>
                    {isManager && rec.status === 'SUBMITTED' && (
                        <Button
                            size="small"
                            type="primary"
                            icon={<CheckCircleOutlined />}
                            style={{ background: '#52c41a', border: 'none', borderRadius: 6 }}
                            onClick={() => {
                                setSelectedReport(rec);
                                setValidateModalOpen(true);
                            }}
                        >
                            Valider
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        style={{ borderRadius: 6 }}
                        onClick={() => {
                            Modal.info({
                                title: `Rapport de ${rec.volunteerName ?? 'Volontaire'}`,
                                content: (
                                    <pre style={{ fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                                        {JSON.stringify(rec.responses, null, 2)}
                                    </pre>
                                ),
                                width: 600,
                            });
                        }}
                    >
                        Voir
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px 0' }}>
            {/* Stats */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                {statsData.map((stat, i) => (
                    <Col xs={12} lg={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                            <div style={{ ...cardStyle, textAlign: 'center' }}>
                                <Statistic
                                    title={<Text type="secondary" style={{ fontSize: 12 }}>{stat.label}</Text>}
                                    value={stat.value}
                                    valueStyle={{ fontSize: 24, fontWeight: 800, color: stat.color }}
                                />
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* Toolbar */}
            <div style={{ ...cardStyle, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={5} style={{ margin: 0 }}>
                    <FileTextOutlined style={{ marginRight: 8, color: '#e01c2e' }} />
                    Rapports de Terrain par Mission
                </Title>
                <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
                    Actualiser
                </Button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spin size="large" />
                    <div style={{ marginTop: 16 }}><Text type="secondary">Chargement...</Text></div>
                </div>
            ) : missions.length === 0 ? (
                <div style={cardStyle}>
                    <Empty description="Aucune mission trouvée" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
                </div>
            ) : (
                <Collapse accordion ghost style={{ background: 'transparent' }}>
                    {missions.map((mission) => {
                        const missionReports = reports[mission.id ?? ''] ?? [];
                        const pendingCount = missionReports.filter(r => r.status === 'SUBMITTED').length;
                        return (
                            <Panel
                                key={mission.id ?? ''}
                                style={{
                                    ...cardStyle,
                                    marginBottom: 12,
                                    padding: 0,
                                    overflow: 'hidden',
                                }}
                                header={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', padding: '4px 0', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <FileTextOutlined style={{ color: '#e01c2e' }} />
                                            <Text strong style={{ fontSize: 14 }}>{mission.title}</Text>
                                            {pendingCount > 0 && (
                                                <Badge count={pendingCount} style={{ background: '#fa8c16' }} />
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            {mission.reportTemplateId ? (
                                                <Tag icon={<LinkOutlined />} color="blue" style={{ borderRadius: 6, fontSize: 11 }}>
                                                    Template assigné
                                                </Tag>
                                            ) : (
                                                <Tag style={{ borderRadius: 6, fontSize: 11 }}>Pas de template</Tag>
                                            )}
                                            <Tag color="default" style={{ borderRadius: 6, fontSize: 11 }}>
                                                {missionReports.length} rapport(s)
                                            </Tag>
                                            {isManager && (
                                                <Button
                                                    size="small"
                                                    icon={<LinkOutlined />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMission(mission);
                                                        form.setFieldsValue({ templateId: mission.reportTemplateId ?? undefined });
                                                        setAssignModalOpen(true);
                                                    }}
                                                    style={{ borderRadius: 6, fontSize: 11 }}
                                                >
                                                    {mission.reportTemplateId ? 'Changer template' : 'Assigner template'}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                }
                            >
                                <div style={{ padding: '0 16px 16px' }}>
                                    {missionReports.length === 0 ? (
                                        <Empty
                                            description={
                                                mission.reportTemplateId
                                                    ? 'Aucun rapport soumis pour cette mission'
                                                    : 'Assignez un template pour permettre aux volontaires de soumettre des rapports'
                                            }
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        />
                                    ) : (
                                        <Table<DisasterFieldReportDTO>
                                            dataSource={missionReports}
                                            columns={reportColumns}
                                            rowKey={r => r.id ?? r.volunteerId ?? Math.random().toString()}
                                            pagination={false}
                                            size="small"
                                        />
                                    )}
                                </div>
                            </Panel>
                        );
                    })}
                </Collapse>
            )}

            {/* Assign Template Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <LinkOutlined style={{ color: '#e01c2e' }} />
                        Assigner un Template de Rapport
                    </div>
                }
                open={assignModalOpen}
                onCancel={() => setAssignModalOpen(false)}
                footer={null}
                width={500}
                destroyOnClose
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Mission: <strong>{selectedMission?.title}</strong></Text>
                </div>
                <Form form={form} layout="vertical" onFinish={handleAssignTemplate}>
                    <Form.Item label="Template de rapport" name="templateId"
                        rules={[{ required: true, message: 'Sélectionner un template' }]}>
                        <Select
                            placeholder="Choisir un template..."
                            showSearch
                            filterOption={(input, option) =>
                                String((option as any)?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            style={{ borderRadius: 8 }}
                        >
                            {templates.map(t => (
                                <Option key={t.id} value={t.id}>{t.title ?? `Template ${t.id?.slice(0, 8)}`}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label="Temps maximal (Deadline)" name="deadline"
                        rules={[{ required: true, message: 'Sélectionner une date limite' }]}>
                        <DatePicker showTime style={{ width: '100%', borderRadius: 8 }} placeholder="Sélectionner date et heure" />
                    </Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button onClick={() => setAssignModalOpen(false)}>Annuler</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={assignSubmitting}
                            style={{ background: 'linear-gradient(135deg,#e01c2e,#c0152a)', border: 'none', borderRadius: 8 }}
                        >
                            Assigner
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* Validate Report Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        Valider le Rapport
                    </div>
                }
                open={validateModalOpen}
                onCancel={() => setValidateModalOpen(false)}
                onOk={() => void handleValidate()}
                okText="Valider"
                okButtonProps={{ style: { background: '#52c41a', border: 'none' } }}
                cancelText="Annuler"
                destroyOnClose
            >
                <div style={{ marginBottom: 12 }}>
                    <Text type="secondary">Rapport de: <strong>{selectedReport?.volunteerName}</strong></Text>
                </div>
                <Form.Item label="Notes du validateur (optionnel)">
                    <TextArea
                        rows={3}
                        placeholder="Commentaires, observations, corrections..."
                        value={validatorNotes}
                        onChange={e => setValidatorNotes(e.target.value)}
                        style={{ borderRadius: 8 }}
                    />
                </Form.Item>
            </Modal>
        </div>
    );
};

export default FieldReportTab;
