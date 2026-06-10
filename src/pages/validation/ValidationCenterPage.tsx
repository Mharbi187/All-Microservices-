// ============================================================
// NEXUS-AID — Centre de Validation (President Only)
// Centralized approval hub for all pending domain actions
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Row, Col, Typography, Tag, Space, Button, Spin, Badge, Empty,
    Tabs, Card, Modal, Input, App, Avatar, Tooltip
} from 'antd';
import {
    CheckOutlined, CloseOutlined, SoundOutlined, HeartOutlined,
    TeamOutlined, FileTextOutlined, EyeOutlined, ClockCircleOutlined,
    ThunderboltOutlined, SafetyOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, useAuthStore } from '@/stores';
import api from '@/services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Types ─────────────────────────────────────────────────────

interface PendingItem {
    id: string;
    type: 'CAMPAIGN' | 'RESOURCE' | 'FAMILY' | 'NEWS';
    title: string;
    description?: string;
    createdBy?: string;
    createdAt?: string;
    committeeId?: string;
    extra?: Record<string, any>;
}

// ── API helpers ───────────────────────────────────────────────

async function fetchPendingCampaigns(): Promise<PendingItem[]> {
    try {
        const res = await api.get<any[]>('/diffusion/campaigns');
        return (res.data || [])
            .filter((c: any) => c.status === 'EN_ATTENTE' || c.status === 'PENDING')
            .map((c: any) => ({
                id: c.id,
                type: 'CAMPAIGN' as const,
                title: c.title || 'Campagne sans titre',
                description: c.description,
                createdAt: c.startDate,
                committeeId: c.committeeId,
                extra: { channels: c.channels, targetAudience: c.targetAudience },
            }));
    } catch { return []; }
}

async function fetchPendingResources(): Promise<PendingItem[]> {
    try {
        const res = await api.get<any[]>('/diffusion/resources');
        return (res.data || [])
            .filter((r: any) => r.status === 'EN_ATTENTE' || r.status === 'PENDING')
            .map((r: any) => ({
                id: r.id,
                type: 'RESOURCE' as const,
                title: r.title || 'Ressource sans titre',
                description: r.description,
                createdAt: r.createdAt,
                committeeId: r.committeeId,
                extra: { category: r.category, contentType: r.contentType },
            }));
    } catch { return []; }
}

async function fetchPendingFamilies(): Promise<PendingItem[]> {
    try {
        const res = await api.get<any[]>('/social/families');
        return (res.data || [])
            .filter((f: any) => f.status === 'PENDING')
            .map((f: any) => ({
                id: f.id,
                type: 'FAMILY' as const,
                title: f.familyName || f.headOfFamily || 'Famille',
                description: f.address,
                createdAt: f.registeredAt,
                committeeId: f.committeeId,
                extra: { members: f.members, incomeCategory: f.incomeCategory },
            }));
    } catch { return []; }
}

async function fetchPendingNews(): Promise<PendingItem[]> {
    try {
        const res = await api.get<any[]>('/news', { params: { status: 'EN_ATTENTE' } });
        return (res.data || [])
            .filter((n: any) => n.status === 'EN_ATTENTE')
            .map((n: any) => ({
                id: n.id,
                type: 'NEWS' as const,
                title: n.title || 'Actualité',
                description: n.summary,
                createdBy: n.authorName,
                createdAt: n.publishedAt,
                committeeId: n.committeeId,
                extra: { category: n.category, scope: n.targetScope },
            }));
    } catch { return []; }
}

async function approveItem(item: PendingItem): Promise<void> {
    switch (item.type) {
        case 'CAMPAIGN':
            await api.patch(`/diffusion/campaigns/${item.id}/status`, { status: 'PUBLIE' });
            break;
        case 'RESOURCE':
            await api.patch(`/diffusion/resources/${item.id}/status`, { status: 'PUBLIE' });
            break;
        case 'FAMILY':
            await api.patch(`/social/families/${item.id}/status`, { status: 'ACTIVE' });
            break;
        case 'NEWS':
            await api.put(`/news/${item.id}/status`, { status: 'PUBLIE' });
            break;
    }
}

async function rejectItem(item: PendingItem): Promise<void> {
    switch (item.type) {
        case 'CAMPAIGN':
            await api.patch(`/diffusion/campaigns/${item.id}/status`, { status: 'REJETE' });
            break;
        case 'RESOURCE':
            await api.patch(`/diffusion/resources/${item.id}/status`, { status: 'REJETE' });
            break;
        case 'FAMILY':
            await api.patch(`/social/families/${item.id}/status`, { status: 'REJECTED' });
            break;
        case 'NEWS':
            await api.put(`/news/${item.id}/status`, { status: 'REJETE' });
            break;
    }
}

// ── Item type config ──────────────────────────────────────────

const TYPE_CONFIG = {
    CAMPAIGN: { label: 'Campagne de Sensibilisation', icon: <SoundOutlined />, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
    RESOURCE: { label: 'Ressource Éducative', icon: <FileTextOutlined />, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
    FAMILY: { label: 'Dossier Famille', icon: <HeartOutlined />, color: '#e01c2e', bg: 'rgba(224,28,46,0.08)' },
    NEWS: { label: 'Actualité', icon: <TeamOutlined />, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
};

// ── Sub-component: PendingCard ────────────────────────────────

const PendingCard: React.FC<{
    item: PendingItem;
    isDark: boolean;
    onApprove: (item: PendingItem) => void;
    onReject: (item: PendingItem) => void;
    onView: (item: PendingItem) => void;
}> = ({ item, isDark, onApprove, onReject, onView }) => {
    const cfg = TYPE_CONFIG[item.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
        >
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                borderRadius: 20,
                padding: 20,
                marginBottom: 14,
                borderLeft: `4px solid ${cfg.color}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 14, flex: 1 }}>
                        {/* Icon */}
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: cfg.bg, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: cfg.color, fontSize: 18,
                            flexShrink: 0
                        }}>
                            {cfg.icon}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 15 }}>{item.title}</Text>
                                <Tag style={{ borderRadius: 6, fontSize: 11, margin: 0, background: cfg.bg, borderColor: cfg.color, color: cfg.color }}>
                                    {cfg.label}
                                </Tag>
                            </div>
                            {item.description && (
                                <Text type="secondary" style={{ fontSize: 12.5, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.description}
                                </Text>
                            )}
                            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                                {item.createdBy && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        <TeamOutlined style={{ marginRight: 4 }} />
                                        {item.createdBy}
                                    </Text>
                                )}
                                {item.createdAt && (
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                        {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                                    </Text>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <Space>
                        <Tooltip title="Voir les détails">
                            <Button size="small" icon={<EyeOutlined />} onClick={() => onView(item)} style={{ borderRadius: 8 }} />
                        </Tooltip>
                        <Tooltip title="Rejeter">
                            <Button size="small" danger icon={<CloseOutlined />} onClick={() => onReject(item)} style={{ borderRadius: 8 }} />
                        </Tooltip>
                        <Tooltip title="Approuver">
                            <Button
                                size="small"
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => onApprove(item)}
                                style={{ borderRadius: 8, background: '#059669', borderColor: '#059669' }}
                            >
                                Approuver
                            </Button>
                        </Tooltip>
                    </Space>
                </div>
            </div>
        </motion.div>
    );
};

// ── Main Page ─────────────────────────────────────────────────

const ValidationCenterPage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState<PendingItem[]>([]);
    const [activeTab, setActiveTab] = useState('ALL');
    const [detailItem, setDetailItem] = useState<PendingItem | null>(null);
    const [approving, setApproving] = useState<string | null>(null);

    const roles = user?.roles || [];
    const isPresident = roles.some(r => r.includes('PRESIDENT') || r.includes('VICE_PRESIDENT')) || user?.type === 'ADMIN';
    const isRespDiffusion = roles.includes('RESP_DIFFUSION') || roles.includes('RESP_DIFFUSION_NATIONAL');
    const isRespSocial = roles.includes('RESP_ACTION_SOCIALE');
    
    // Determine allowed item types for the current user
    const allowedTypes = new Set<string>();
    if (isPresident) {
        allowedTypes.add('CAMPAIGN');
        allowedTypes.add('RESOURCE');
        allowedTypes.add('FAMILY');
        allowedTypes.add('NEWS');
    } else {
        if (isRespDiffusion) {
            allowedTypes.add('CAMPAIGN');
            allowedTypes.add('RESOURCE');
            allowedTypes.add('NEWS');
        }
        if (isRespSocial) {
            allowedTypes.add('FAMILY');
        }
    }
    const isValidator = allowedTypes.size > 0;

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [campaigns, resources, families, news] = await Promise.all([
                allowedTypes.has('CAMPAIGN') ? fetchPendingCampaigns() : Promise.resolve([]),
                allowedTypes.has('RESOURCE') ? fetchPendingResources() : Promise.resolve([]),
                allowedTypes.has('FAMILY') ? fetchPendingFamilies() : Promise.resolve([]),
                allowedTypes.has('NEWS') ? fetchPendingNews() : Promise.resolve([]),
            ]);
            setPending([...campaigns, ...resources, ...families, ...news]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleApprove = async (item: PendingItem) => {
        setApproving(item.id);
        try {
            await approveItem(item);
            messageApi.success(`"${item.title}" a été approuvé et publié.`);
            setPending(prev => prev.filter(p => p.id !== item.id));
        } catch {
            messageApi.error('Erreur lors de l\'approbation.');
        } finally {
            setApproving(null);
        }
    };

    const handleReject = async (item: PendingItem) => {
        Modal.confirm({
            title: 'Rejeter cette action ?',
            content: (
                <div>
                    <Text>Vous êtes sur le point de rejeter : <strong>{item.title}</strong></Text>
                </div>
            ),
            okText: 'Rejeter',
            okButtonProps: { danger: true },
            cancelText: 'Annuler',
            onOk: async () => {
                try {
                    await rejectItem(item);
                    messageApi.warning(`"${item.title}" a été rejeté.`);
                    setPending(prev => prev.filter(p => p.id !== item.id));
                } catch {
                    messageApi.error('Erreur lors du rejet.');
                }
            }
        });
    };

    const handleApproveAll = async () => {
        Modal.confirm({
            title: `Approuver tous les ${filtered.length} éléments en attente ?`,
            content: 'Cette action publiera immédiatement tous les éléments filtrés.',
            okText: 'Tout Approuver',
            okButtonProps: { style: { background: '#059669', borderColor: '#059669' } },
            cancelText: 'Annuler',
            onOk: async () => {
                for (const item of filtered) {
                    try { await approveItem(item); } catch { /**/ }
                }
                messageApi.success(`${filtered.length} éléments approuvés et publiés !`);
                loadAll();
            }
        });
    };

    const filtered = activeTab === 'ALL' ? pending : pending.filter(p => p.type === activeTab);

    const countByType = (type: string) => pending.filter(p => p.type === type).length;

    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.06)',
        overflow: 'hidden',
    };

    if (!isValidator) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 20 }}>
                <SafetyOutlined style={{ fontSize: 48, color: '#e01c2e' }} />
                <Title level={4}>Accès Restreint</Title>
                <Text type="secondary">Cette page est réservée aux Présidents et Responsables.</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 40px 40px 40px', maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: 16,
                                background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: 22, boxShadow: '0 12px 24px rgba(224,28,46,0.25)'
                            }}>
                                <ThunderboltOutlined />
                            </div>
                            <div>
                                <Title level={2} style={{ margin: 0, fontWeight: 900 }}>Centre de Validation</Title>
                                <Text type="secondary">Approuvez ou rejetez les actions en attente de votre comité</Text>
                            </div>
                        </div>
                    </div>

                    {filtered.length > 0 && (
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={handleApproveAll}
                            size="large"
                            style={{
                                height: 48, borderRadius: 16, fontWeight: 700,
                                background: 'linear-gradient(135deg, #059669, #10b981)',
                                border: 'none', boxShadow: '0 8px 20px rgba(5,150,105,0.3)'
                            }}
                        >
                            Tout Approuver ({filtered.length})
                        </Button>
                    )}
                </div>

                {/* KPI Summary Row */}
                <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
                    {[
                        { label: 'Total En Attente', value: pending.length, color: '#e01c2e', icon: <ClockCircleOutlined /> },
                        { label: 'Campagnes', value: countByType('CAMPAIGN'), color: '#7c3aed', icon: <SoundOutlined /> },
                        { label: 'Ressources', value: countByType('RESOURCE'), color: '#2563eb', icon: <FileTextOutlined /> },
                        { label: 'Familles', value: countByType('FAMILY'), color: '#e01c2e', icon: <HeartOutlined /> },
                        { label: 'Actualités', value: countByType('NEWS'), color: '#059669', icon: <TeamOutlined /> },
                    ].map((kpi) => (
                        <Col key={kpi.label} xs={12} sm={8} lg={24 / 5}>
                            <div style={{
                                background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                                borderRadius: 20, padding: '20px 16px', textAlign: 'center',
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                                borderTop: `3px solid ${kpi.color}`,
                            }}>
                                <div style={{ color: kpi.color, fontSize: 20, marginBottom: 6 }}>{kpi.icon}</div>
                                <div style={{ fontSize: 28, fontWeight: 900, color: kpi.color }}>{kpi.value}</div>
                                <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {kpi.label}
                                </Text>
                            </div>
                        </Col>
                    ))}
                </Row>

                {/* Main Panel */}
                <div style={glassStyle}>
                    <div style={{ padding: '0 32px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}` }}>
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            style={{ height: 64 }}
                            items={[
                                { key: 'ALL', label: <Space>Tout <Badge count={pending.length} showZero style={{ backgroundColor: '#e01c2e' }} /></Space> },
                                ...(allowedTypes.has('CAMPAIGN') ? [{ key: 'CAMPAIGN', label: <Space>Campagnes <Badge count={countByType('CAMPAIGN')} showZero style={{ backgroundColor: '#7c3aed' }} /></Space> }] : []),
                                ...(allowedTypes.has('RESOURCE') ? [{ key: 'RESOURCE', label: <Space>Ressources <Badge count={countByType('RESOURCE')} showZero style={{ backgroundColor: '#2563eb' }} /></Space> }] : []),
                                ...(allowedTypes.has('FAMILY') ? [{ key: 'FAMILY', label: <Space>Familles <Badge count={countByType('FAMILY')} showZero style={{ backgroundColor: '#e01c2e' }} /></Space> }] : []),
                                ...(allowedTypes.has('NEWS') ? [{ key: 'NEWS', label: <Space>Actualités <Badge count={countByType('NEWS')} showZero style={{ backgroundColor: '#059669' }} /></Space> }] : []),
                            ]}
                        />
                    </div>

                    <div style={{ padding: 32, minHeight: 400 }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 0' }}>
                                <Spin size="large" />
                                <div style={{ marginTop: 16 }}><Text type="secondary">Chargement des actions en attente...</Text></div>
                            </div>
                        ) : filtered.length === 0 ? (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <div style={{ textAlign: 'center' }}>
                                            <CheckOutlined style={{ fontSize: 40, color: '#059669', display: 'block', marginBottom: 12 }} />
                                            <Text strong style={{ fontSize: 16 }}>Tout est à jour !</Text>
                                            <br />
                                            <Text type="secondary">Aucune action en attente de validation pour le moment.</Text>
                                        </div>
                                    }
                                />
                            </motion.div>
                        ) : (
                            <AnimatePresence>
                                {filtered.map((item) => (
                                    <PendingCard
                                        key={item.id}
                                        item={item}
                                        isDark={isDark}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        onView={setDetailItem}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Detail Modal */}
            <Modal
                open={!!detailItem}
                onCancel={() => setDetailItem(null)}
                footer={detailItem ? [
                    <Button key="cancel" onClick={() => setDetailItem(null)}>Fermer</Button>,
                    <Button key="reject" danger icon={<CloseOutlined />} onClick={() => { handleReject(detailItem!); setDetailItem(null); }}>Rejeter</Button>,
                    <Button key="approve" type="primary" icon={<CheckOutlined />}
                        style={{ background: '#059669', borderColor: '#059669' }}
                        onClick={() => { handleApprove(detailItem!); setDetailItem(null); }}
                    >
                        Approuver
                    </Button>
                ] : []}
                title={detailItem && (
                    <Space>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: TYPE_CONFIG[detailItem.type].bg,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: TYPE_CONFIG[detailItem.type].color
                        }}>
                            {TYPE_CONFIG[detailItem.type].icon}
                        </div>
                        <span>{detailItem.title}</span>
                        <Tag color={TYPE_CONFIG[detailItem.type].color}>{TYPE_CONFIG[detailItem.type].label}</Tag>
                    </Space>
                )}
                width={560}
                centered
            >
                {detailItem && (
                    <div style={{ padding: '8px 0' }}>
                        {detailItem.description && (
                            <div style={{ marginBottom: 16, padding: 14, background: 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</Text>
                                <Text>{detailItem.description}</Text>
                            </div>
                        )}
                        {detailItem.extra && Object.entries(detailItem.extra).map(([k, v]) => v && (
                            <div key={k} style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 110 }}>{k}</Text>
                                <Text strong>{Array.isArray(v) ? v.join(', ') : String(v)}</Text>
                            </div>
                        ))}
                        {detailItem.createdAt && (
                            <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(224,28,46,0.04)', borderRadius: 10 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    <ClockCircleOutlined style={{ marginRight: 6 }} />
                                    Soumis le {new Date(detailItem.createdAt).toLocaleString('fr-FR')}
                                </Text>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default ValidationCenterPage;
