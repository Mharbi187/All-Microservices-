// ============================================================
// NEXUS-AID — Mes Réclamations (My Complaints Page)
// List + create complaints with status tracking
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Tag, Space, Spin, Row, Col, Table, Button, Modal, Form, Input, Select,
    Empty, Statistic, message, Badge, Tooltip, Timeline, Alert,
} from 'antd';
import {
    FileTextOutlined, PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
    CloseCircleOutlined, ExclamationCircleOutlined, SendOutlined,
    EyeOutlined, CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import complaintService from '@/services/complaintService';
import committeeService from '@/services/committeeService';
import { useAuthStore } from '@/stores';
import type { ComplaintDTO, Committee } from '@/types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    PENDING: { color: 'orange', icon: <ClockCircleOutlined />, label: 'En attente' },
    RESOLVED: { color: 'green', icon: <CheckCircleOutlined />, label: 'Résolue' },
    REJECTED: { color: 'red', icon: <CloseCircleOutlined />, label: 'Rejetée' },
};

const MyComplaintsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [complaints, setComplaints] = useState<ComplaintDTO[]>([]);
    const [committees, setCommittees] = useState<Committee[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDTO | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form] = Form.useForm();

    const isApproved = user?.status === 'APPROVED';

    useEffect(() => {
        if (isApproved) loadData();
        else setLoading(false);
    }, [isApproved]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [complaintsData, committeesData] = await Promise.all([
                complaintService.getMine(),
                committeeService.getAll(),
            ]);
            setComplaints(complaintsData);
            setCommittees(committeesData);
        } catch (err) {
            console.error('Failed to load complaints:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);
            await complaintService.create(values);
            message.success('Réclamation soumise avec succès !');
            setModalVisible(false);
            form.resetFields();
            loadData();
        } catch (err: any) {
            if (err?.errorFields) return; // form validation
            message.error('Erreur lors de la soumission.');
        } finally {
            setSubmitting(false);
        }
    };

    const counts = {
        total: complaints.length,
        pending: complaints.filter((c) => c.status === 'PENDING').length,
        resolved: complaints.filter((c) => c.status === 'RESOLVED').length,
        rejected: complaints.filter((c) => c.status === 'REJECTED').length,
    };

    const columns: ColumnsType<ComplaintDTO> = [
        {
            title: 'Sujet',
            dataIndex: 'subject',
            key: 'subject',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (status: string) => {
                const cfg = statusConfig[status] || statusConfig.PENDING;
                return (
                    <Tag color={cfg.color} icon={cfg.icon}>
                        {cfg.label}
                    </Tag>
                );
            },
            filters: [
                { text: 'En attente', value: 'PENDING' },
                { text: 'Résolue', value: 'RESOLVED' },
                { text: 'Rejetée', value: 'REJECTED' },
            ],
            onFilter: (value, record) => record.status === value,
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (date: string) => date ? new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
            sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 80,
            render: (_, record) => (
                <Tooltip title="Voir les détails">
                    <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => {
                            setSelectedComplaint(record);
                            setDetailVisible(true);
                        }}
                    />
                </Tooltip>
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

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* Stats Header */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 12, borderTop: '3px solid #C81E1E' }}>
                        <Statistic title="Total" value={counts.total} prefix={<FileTextOutlined style={{ color: '#C81E1E' }} />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 12, borderTop: '3px solid #f59e0b' }}>
                        <Statistic title="En attente" value={counts.pending} valueStyle={{ color: '#f59e0b' }} prefix={<ClockCircleOutlined />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 12, borderTop: '3px solid #16a34a' }}>
                        <Statistic title="Résolues" value={counts.resolved} valueStyle={{ color: '#16a34a' }} prefix={<CheckCircleOutlined />} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card style={{ borderRadius: 12, borderTop: '3px solid #dc2626' }}>
                        <Statistic title="Rejetées" value={counts.rejected} valueStyle={{ color: '#dc2626' }} prefix={<CloseCircleOutlined />} />
                    </Card>
                </Col>
            </Row>

            {/* Main Table */}
            <Card
                title={<Space><FileTextOutlined style={{ color: '#C81E1E' }} /> Mes Réclamations</Space>}
                extra={
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                        Nouvelle Réclamation
                    </Button>
                }
                style={{ borderRadius: 12 }}
            >
                <Table
                    dataSource={complaints}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 8, showSizeChanger: false }}
                    locale={{ emptyText: <Empty description="Aucune réclamation pour le moment" /> }}
                />
            </Card>

            {/* Create Modal */}
            <Modal
                title={<Space><PlusOutlined /> Nouvelle Réclamation</Space>}
                open={modalVisible}
                onCancel={() => { setModalVisible(false); form.resetFields(); }}
                footer={[
                    <Button key="cancel" onClick={() => { setModalVisible(false); form.resetFields(); }}>
                        Annuler
                    </Button>,
                    <Button key="submit" type="primary" icon={<SendOutlined />} loading={submitting} onClick={handleSubmit}>
                        Soumettre
                    </Button>,
                ]}
                width={560}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="subject" label="Sujet" rules={[{ required: true, message: 'Veuillez saisir un sujet' }]}>
                        <Input placeholder="Ex: Problème de matériel" />
                    </Form.Item>
                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Veuillez décrire votre réclamation' }]}>
                        <TextArea rows={4} placeholder="Décrivez votre réclamation en détail..." />
                    </Form.Item>
                    <Form.Item name="targetCommitteeId" label="Comité concerné" rules={[{ required: true, message: 'Sélectionnez un comité' }]}>
                        <Select
                            placeholder="Sélectionnez le comité"
                            options={committees.map((c) => ({ label: `${c.name} (${c.type})`, value: c.id }))}
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                title={<Space><EyeOutlined /> Détails de la réclamation</Space>}
                open={detailVisible}
                onCancel={() => setDetailVisible(false)}
                footer={<Button onClick={() => setDetailVisible(false)}>Fermer</Button>}
                width={520}
            >
                {selectedComplaint && (
                    <div style={{ marginTop: 16 }}>
                        <Card size="small" style={{ borderRadius: 8, background: '#fafafa', marginBottom: 16 }}>
                            <Title level={5} style={{ margin: 0 }}>{selectedComplaint.subject}</Title>
                            <Tag color={statusConfig[selectedComplaint.status]?.color} style={{ marginTop: 8 }}>
                                {statusConfig[selectedComplaint.status]?.icon} {statusConfig[selectedComplaint.status]?.label}
                            </Tag>
                        </Card>
                        <Paragraph>{selectedComplaint.description}</Paragraph>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <CalendarOutlined /> Créée le : {selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString('fr-FR') : '—'}
                        </Text>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MyComplaintsPage;
