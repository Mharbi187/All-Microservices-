// ============================================================
// NEXUS-AID — Validation Queue (Governance)
// Dynamic queue for Presidents to approve/reject role assignments
// ============================================================

import { useState, useEffect } from 'react';
import { 
    Table, Tag, Button, Space, Typography, Card, 
    Badge, Tooltip, Modal, Input, message, Empty,
    Avatar
} from 'antd';
import { 
    CheckCircleOutlined, CloseCircleOutlined, 
    ClockCircleOutlined,
    UserOutlined, ApartmentOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import committeeService from '@/services/committeeService';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PendingRole {
    id: string;
    volunteer: { fullName: string; email: string };
    committee: { name: string; type: string };
    title: string;
    proposedAt: string;
    proposedBy: string;
    reason: string;
}

const ValidationQueuePage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [proposals, setProposals] = useState<PendingRole[]>([]);
    const [selectedRole, setSelectedRole] = useState<PendingRole | null>(null);
    const [decisionModal, setDecisionModal] = useState<{ visible: boolean; approve: boolean }>({ 
        visible: false, approve: true 
    });
    const [reason, setReason] = useState('');

    const fetchProposals = async () => {
        setLoading(true);
        try {
            const data = await committeeService.getPendingRoles();
            setProposals(data);
        } catch (err) {
            message.error('Erreur lors du chargement des propositions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    const handleAction = async () => {
        if (!selectedRole) return;
        try {
            await committeeService.validateRole(selectedRole.id, decisionModal.approve, reason);
            message.success(decisionModal.approve ? 'Rôle approuvé avec succès.' : 'Proposition rejetée.');
            setDecisionModal({ visible: false, approve: true });
            setReason('');
            fetchProposals();
        } catch (err) {
            message.error('Échec de la validation du rôle.');
        }
    };

    const columns = [
        {
            title: 'Volontaire',
            key: 'volunteer',
            render: (r: PendingRole) => (
                <Space>
                    <Avatar icon={<UserOutlined />} style={{ background: '#f0f0f0', color: '#888' }} />
                    <div>
                        <Text strong>{r.volunteer?.fullName || 'Utilisateur inconnu'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{r.volunteer?.email || 'Pas d\'email'}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Rôle Proposé',
            dataIndex: 'title',
            key: 'title',
            render: (title: string) => <Tag color="blue">{title}</Tag>,
        },
        {
            title: 'Comité',
            key: 'committee',
            render: (r: PendingRole) => (
                <Space>
                    <ApartmentOutlined />
                    <div>
                        <Text>{r.committee?.name || 'Comité inconnu'}</Text>
                        <Tag style={{ fontSize: 10, marginLeft: 8 }}>{r.committee?.type || 'N/A'}</Tag>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Date Proposition',
            dataIndex: 'proposedAt',
            key: 'proposedAt',
            render: (date: string) => new Date(date).toLocaleString(),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (r: PendingRole) => (
                <Space>
                    <Tooltip title="Approuver">
                        <Button 
                            type="primary" 
                            shape="circle" 
                            icon={<CheckCircleOutlined />} 
                            onClick={() => {
                                setSelectedRole(r);
                                setDecisionModal({ visible: true, approve: true });
                            }}
                            style={{ background: '#16a34a', borderColor: '#16a34a' }}
                        />
                    </Tooltip>
                    <Tooltip title="Rejeter">
                        <Button 
                            danger 
                            shape="circle" 
                            icon={<CloseCircleOutlined />} 
                            onClick={() => {
                                setSelectedRole(r);
                                setDecisionModal({ visible: true, approve: false });
                            }}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
            {/* Header with Gradient Card */}
            <div style={{
                background: 'linear-gradient(135deg, #f59e0b12, transparent)',
                borderRadius: 20, padding: '24px 28px', marginBottom: 24,
                border: '1px solid #f59e0b18',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: 'rgba(245, 158, 11, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, color: '#f59e0b'
                    }}>
                        <ClockCircleOutlined />
                    </div>
                    <div>
                        <Title level={3} style={{ margin: 0 }}>File d'attente de Validation</Title>
                        <Text type="secondary">Gérez les nominations et affectations de rôles hiérarchiques</Text>
                    </div>
                </div>
                <Space>
                    <Badge count={proposals.length} overflowCount={99} style={{ backgroundColor: '#f59e0b' }}>
                        <Button onClick={fetchProposals} loading={loading} icon={<ReloadOutlined />}>
                            Actualiser
                        </Button>
                    </Badge>
                </Space>
            </div>

            <Card style={{ borderRadius: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Table 
                    columns={columns} 
                    dataSource={proposals} 
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: <Empty description="Aucune demande en attente" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                />
            </Card>

            <Modal
                title={decisionModal.approve ? "Approuver l'Assignation" : "Rejeter la Proposition"}
                open={decisionModal.visible}
                destroyOnHidden
                onOk={handleAction}
                onCancel={() => setDecisionModal({ ...decisionModal, visible: false })}
                okText="Confirmer"
                cancelText="Annuler"
                okButtonProps={{ danger: !decisionModal.approve }}
            >
                <div className="py-4">
                    <Text strong>Motif/Justification (optionnel) :</Text>
                    <TextArea 
                        rows={4} 
                        className="mt-2" 
                        placeholder="Expliquez brièvement votre décision..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
            </Modal>
        </div>
    );
};


export default ValidationQueuePage;
