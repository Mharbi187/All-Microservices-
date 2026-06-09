// ============================================================
// NEXUS-AID — Mon Comité (My Committee Page)
// Shows committee info, governance, and hierarchy
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Tag, Descriptions, Space, Spin, Row, Col, Timeline, Alert, Empty,
    Statistic, Progress, List, Avatar, Divider, Tooltip, Badge,
} from 'antd';
import {
    ApartmentOutlined, TeamOutlined, UserOutlined, CalendarOutlined,
    CheckCircleOutlined, WarningOutlined, CrownOutlined, SafetyOutlined,
    EnvironmentOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import committeeService from '@/services/committeeService';
import type { Committee, CommitteeGovernance, CommitteeOverview } from '@/types';

const { Title, Text } = Typography;

const committeeTypeColors: Record<string, string> = {
    NATIONAL: 'gold',
    REGIONAL: 'blue',
    LOCAL: 'green',
};

const statusColors: Record<string, string> = {
    ACTIVE: 'green',
    PENDING_CONSTITUTION: 'orange',
    SUSPENDED: 'red',
    DISSOLVED: 'default',
};

const MyCommitteePage: React.FC = () => {
    const { user } = useAuthStore();
    const [committee, setCommittee] = useState<Committee | null>(null);
    const [governance, setGovernance] = useState<CommitteeGovernance | null>(null);
    const [hierarchy, setHierarchy] = useState<CommitteeOverview[]>([]);
    const [loading, setLoading] = useState(true);

    const isApproved = user?.status === 'APPROVED';

    useEffect(() => {
        if (isApproved) loadData();
        else setLoading(false);
    }, [isApproved]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get all committees and find mine
            const committees = await committeeService.getAll();
            const myCommitteeId = user?.committeeId;

            if (myCommitteeId) {
                const found = committees.find((c) => c.id === myCommitteeId);
                if (found) setCommittee(found);

                // Load governance
                try {
                    const gov = await committeeService.getGovernance(myCommitteeId);
                    setGovernance(gov);
                } catch { /* governance may not be accessible */ }
            } else if (user?.roles && user.roles.length > 0) {
                // Try from profile roles – first committeeId
                const profileData = await import('@/services/authService').then(m => m.getProfile());
                const firstRole = profileData.roles?.[0];
                if (firstRole?.committeeId) {
                    const found = committees.find((c) => c.id === firstRole.committeeId);
                    if (found) setCommittee(found);
                    try {
                        const gov = await committeeService.getGovernance(firstRole.committeeId);
                        setGovernance(gov);
                    } catch { }
                }
            }

            // Load hierarchy overview
            try {
                const hier = await committeeService.getHierarchy();
                setHierarchy(hier);
            } catch { }
        } catch (err) {
            console.error('Failed to load committee:', err);
        } finally {
            setLoading(false);
        }
    };

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
                <Spin size="large" tip="Chargement du comité...">
                    <div style={{ width: 1, height: 1 }} />
                </Spin>
            </div>
        );
    }

    if (!committee) {
        return (
            <Card style={{ borderRadius: 12 }}>
                <Empty description="Aucun comité trouvé. Vous n'êtes pas encore affilié à un comité." />
            </Card>
        );
    }

    // Find my committee in hierarchy for extra info
    const myOverview = hierarchy.find((h) => h.id === committee.id);
    const mandateProgress = governance?.mandateEndDate
        ? (() => {
            const start = new Date(governance.mandateStartDate || Date.now());
            const end = new Date(governance.mandateEndDate);
            const now = new Date();
            const total = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
        })()
        : 0;

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            {/* Committee Header */}
            <Card
                style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}
                styles={{ body: { padding: 0 } }}
            >
                <div style={{
                    height: 120,
                    background: `linear-gradient(135deg, ${
                        committee.type === 'NATIONAL' ? '#92400e, #78350f' :
                        committee.type === 'REGIONAL' ? '#1e40af, #1e3a5f' :
                        '#166534, #14532d'
                    })`,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 32px',
                }}>
                    <ApartmentOutlined style={{ fontSize: 36, color: '#fff', marginRight: 16 }} />
                    <div>
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>{committee.name}</Title>
                        <Space style={{ marginTop: 4 }}>
                            <Tag color={committeeTypeColors[committee.type || '']}>{committee.type}</Tag>
                            <Tag color={statusColors[committee.status || '']}>{committee.status}</Tag>
                            {committee.region && (
                                <Tag icon={<EnvironmentOutlined />} color="default">{committee.region}</Tag>
                            )}
                        </Space>
                    </div>
                </div>

                <div style={{ padding: 24 }}>
                    <Row gutter={24}>
                        <Col xs={24} sm={8}>
                            <Statistic
                                title="Total Volontaires"
                                value={myOverview?.totalVolunteers || '—'}
                                prefix={<TeamOutlined style={{ color: '#C81E1E' }} />}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <Statistic
                                title="Rôles Attribués"
                                value={myOverview?.roles?.length || 0}
                                prefix={<CrownOutlined style={{ color: '#f59e0b' }} />}
                            />
                        </Col>
                        <Col xs={24} sm={8}>
                            <Statistic
                                title="Bureau Constitué"
                                value={governance?.hasMandatoryBureau ? 'Oui' : 'Non'}
                                valueStyle={{ color: governance?.hasMandatoryBureau ? '#16a34a' : '#dc2626' }}
                                prefix={governance?.hasMandatoryBureau ? <CheckCircleOutlined /> : <WarningOutlined />}
                            />
                        </Col>
                    </Row>
                </div>
            </Card>

            <Row gutter={24}>
                {/* Governance */}
                <Col xs={24} lg={14}>
                    <Card
                        title={<Space><SafetyOutlined style={{ color: '#C81E1E' }} /> Gouvernance</Space>}
                        style={{ borderRadius: 12, marginBottom: 24 }}
                    >
                        {governance ? (
                            <>
                                <Descriptions column={1} styles={{ label: { fontWeight: 600 } }}>
                                    <Descriptions.Item label="Début du mandat">
                                        {governance.mandateStartDate || '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Fin du mandat">
                                        {governance.mandateEndDate || '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Durée du mandat">
                                        {governance.mandateDurationYears} ans
                                    </Descriptions.Item>
                                </Descriptions>

                                {governance.mandateEndDate && (
                                    <div style={{ marginTop: 16 }}>
                                        <Text type="secondary">Progression du mandat</Text>
                                        <Progress
                                            percent={mandateProgress}
                                            status={governance.mandateExpired ? 'exception' : 'active'}
                                            strokeColor={governance.mandateExpired ? '#dc2626' : '#C81E1E'}
                                        />
                                    </div>
                                )}

                                {governance.mandateExpired && (
                                    <Alert
                                        message="Mandat expiré"
                                        description="Le mandat du bureau actuel est expiré. Un renouvellement est nécessaire."
                                        type="error"
                                        showIcon
                                        style={{ marginTop: 16, borderRadius: 8 }}
                                    />
                                )}

                                {governance.missingMandatoryRoles?.length > 0 && (
                                    <Alert
                                        message="Rôles obligatoires manquants"
                                        description={governance.missingMandatoryRoles.join(', ')}
                                        type="warning"
                                        showIcon
                                        style={{ marginTop: 16, borderRadius: 8 }}
                                    />
                                )}

                                {governance.warnings?.length > 0 && (
                                    <div style={{ marginTop: 16 }}>
                                        {governance.warnings.map((w, i) => (
                                            <Alert
                                                key={i}
                                                message={w}
                                                type="info"
                                                showIcon
                                                icon={<ExclamationCircleOutlined />}
                                                style={{ marginBottom: 8, borderRadius: 8 }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Empty description="Informations de gouvernance non disponibles" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                    </Card>

                    {/* Hierarchy */}
                    {hierarchy.length > 0 && (
                        <Card
                            title={<Space><ApartmentOutlined style={{ color: '#C81E1E' }} /> Hiérarchie</Space>}
                            style={{ borderRadius: 12, marginBottom: 24 }}
                        >
                            <Timeline
                                items={hierarchy
                                    .sort((a, b) => {
                                        const order = { NATIONAL: 0, REGIONAL: 1, LOCAL: 2 };
                                        return (order[a.type] || 3) - (order[b.type] || 3);
                                    })
                                    .slice(0, 10)
                                    .map((h) => ({
                                        color: h.id === committee.id ? '#C81E1E' : '#d9d9d9',
                                        dot: h.id === committee.id ? <CheckCircleOutlined style={{ color: '#C81E1E' }} /> : undefined,
                                        children: (
                                            <div>
                                                <Text strong={h.id === committee.id}>{h.name}</Text>
                                                <Space style={{ marginLeft: 8 }}>
                                                    <Tag color={committeeTypeColors[h.type]} style={{ fontSize: 11 }}>{h.type}</Tag>
                                                    {h.id === committee.id && <Tag color="red">Mon comité</Tag>}
                                                </Space>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {h.region} • {h.totalVolunteers} volontaires
                                                </Text>
                                            </div>
                                        ),
                                    }))}
                            />
                        </Card>
                    )}
                </Col>

                {/* Roles List */}
                <Col xs={24} lg={10}>
                    <Card
                        title={<Space><CrownOutlined style={{ color: '#f59e0b' }} /> Bureau du Comité</Space>}
                        style={{ borderRadius: 12, marginBottom: 24 }}
                    >
                        {myOverview?.roles && myOverview.roles.length > 0 ? (
                            <List
                                dataSource={myOverview.roles}
                                renderItem={(role) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar
                                                    style={{ backgroundColor: role.volunteerId === user?.id ? '#C81E1E' : '#8B5CF6' }}
                                                    icon={<UserOutlined />}
                                                />
                                            }
                                            title={
                                                <Space>
                                                    <Text strong>{role.title}</Text>
                                                    {role.volunteerId === user?.id && <Tag color="red" style={{ fontSize: 10 }}>Moi</Tag>}
                                                </Space>
                                            }
                                            description={
                                                <>
                                                    <Text type="secondary">{role.volunteerName}</Text>
                                                    <br />
                                                    <Text type="secondary" style={{ fontSize: 11 }}>{role.volunteerEmail}</Text>
                                                    {role.mandateExpired && (
                                                        <Tag color="red" style={{ marginLeft: 8, fontSize: 10 }}>
                                                            Mandat expiré
                                                        </Tag>
                                                    )}
                                                </>
                                            }
                                        />
                                    </List.Item>
                                )}
                            />
                        ) : (
                            <Empty description="Aucun rôle attribué" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        )}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default MyCommitteePage;
