// ============================================================
// NEXUS-AID — Registre des Sources & Contacts par Région
// Onglet 4 : Comités + contacts dynamiques depuis API
// Filtrage par rôle utilisateur (régional vs national)
// ============================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    Button, Col, Form, Input, InputNumber, Modal, Row, Select,
    Spin, Tag, Typography, message
} from 'antd';
import {
    EnvironmentOutlined, MailOutlined, PhoneOutlined,
    PlusOutlined, TeamOutlined, EditOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import committeeContactService from '@/services/committeeContactService';
import type { CommitteeContact } from '@/services/committeeContactService';
import { catastropheService } from '@/services/catastropheService';
import { useAuthStore } from '@/stores';
import type { DisasterMissionDTO } from '@/types';

const { Text, Title } = Typography;

const CONFIDENCE_LEVELS = [
    { value: 5, label: '⭐⭐⭐⭐⭐ Très haute', color: '#22c55e' },
    { value: 4, label: '⭐⭐⭐⭐ Haute', color: '#84cc16' },
    { value: 3, label: '⭐⭐⭐ Moyenne', color: '#eab308' },
    { value: 2, label: '⭐⭐ Basse', color: '#f97316' },
    { value: 1, label: '⭐ Très basse', color: '#e01c2e' },
];

const TYPE_COLOR: Record<string, string> = {
    NATIONAL: '#e01c2e',
    REGIONAL: '#1890ff',
    LOCAL: '#22c55e',
};

interface ExtendedContact extends CommitteeContact {
    confidenceLevel?: number;
    lastUpdate?: string;
    missionCount?: number;
    activeMissions?: number;
}

interface RegistreSourcesTabProps {
    isDark: boolean;
}

const RegistreSourcesTab: React.FC<RegistreSourcesTabProps> = ({ isDark }) => {
    const user = useAuthStore(s => s.user);
    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const isPresident = user?.roles?.includes('PRESIDENT') || user?.roles?.includes('VICE_PRESIDENT');
    const userCommitteeId = user?.committeeId ?? '';

    const [contacts, setContacts] = useState<ExtendedContact[]>([]);
    const [missions, setMissions] = useState<DisasterMissionDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCommittee, setSelectedCommittee] = useState<ExtendedContact | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ExtendedContact | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'NATIONAL' | 'REGIONAL' | 'LOCAL'>('all');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [comms, missionData] = await Promise.all([
                    committeeContactService.getAll(),
                    isNational
                        ? catastropheService.getAllMissions()
                        : catastropheService.getMissionsByCommittee(userCommitteeId),
                ]);

                const stored = JSON.parse(localStorage.getItem('nexusaid_contact_meta') ?? '{}') as Record<string, { confidenceLevel?: number; lastUpdate?: string }>;

                const extended: ExtendedContact[] = comms.map(c => ({
                    ...c,
                    confidenceLevel: stored[c.id]?.confidenceLevel ?? 3,
                    lastUpdate: stored[c.id]?.lastUpdate ?? new Date().toLocaleDateString('fr-TN'),
                    missionCount: missionData.filter(m => m.committeeId === c.id).length,
                    activeMissions: missionData.filter(m => m.committeeId === c.id && m.status === 'IN_PROGRESS').length,
                }));

                setContacts(extended);
                setMissions(missionData);
            } catch { /* ignore */ } finally {
                setLoading(false);
            }
        };
        void load();
    }, [isNational, userCommitteeId]);

    const visibleContacts = useMemo(() => {
        return contacts.filter(c => {
            if (!isNational && c.id !== userCommitteeId && c.type !== 'NATIONAL') return false;
            if (filterType !== 'all' && c.type !== filterType) return false;
            if (search) {
                const q = search.toLowerCase();
                return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q);
            }
            return true;
        });
    }, [contacts, isNational, userCommitteeId, filterType, search]);

    const handleSaveContact = async (values: Record<string, unknown>) => {
        if (!editTarget) return;
        try {
            const updated = await committeeContactService.update(editTarget.id, {
                phone: values.phone as string,
                email: values.email as string,
                address: values.address as string,
            });
            const stored = JSON.parse(localStorage.getItem('nexusaid_contact_meta') ?? '{}');
            stored[editTarget.id] = {
                confidenceLevel: values.confidenceLevel,
                lastUpdate: new Date().toLocaleDateString('fr-TN'),
            };
            localStorage.setItem('nexusaid_contact_meta', JSON.stringify(stored));
            setContacts(prev => prev.map(c => c.id === editTarget.id ? {
                ...c, ...updated,
                confidenceLevel: values.confidenceLevel as number,
                lastUpdate: new Date().toLocaleDateString('fr-TN'),
            } : c));
            message.success('Contact mis à jour');
            setEditModalOpen(false);
        } catch {
            message.error('Erreur lors de la mise à jour');
        }
    };

    const cardStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
        borderRadius: 16,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease',
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
                <Spin size="large" />
                <Text type="secondary" style={{ fontWeight: 600 }}>Chargement du registre...</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamOutlined style={{ color: '#e01c2e' }} />
                    Registre des Sources & Contacts
                </Title>
                {!isNational && (
                    <Tag color="orange" style={{ borderRadius: 6 }}>Accès régional</Tag>
                )}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <Input
                    placeholder="Rechercher un comité..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ maxWidth: 280, borderRadius: 10, height: 38 }}
                />
                {(['all', 'NATIONAL', 'REGIONAL', 'LOCAL'] as const).map(type => (
                    <Tag
                        key={type}
                        onClick={() => setFilterType(type)}
                        style={{
                            cursor: 'pointer', borderRadius: 8, padding: '4px 14px',
                            fontWeight: 700, fontSize: 12, border: 'none',
                            background: filterType === type
                                ? (type === 'all' ? '#e01c2e' : TYPE_COLOR[type] ?? '#64748b')
                                : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                            color: filterType === type ? '#fff' : (isDark ? '#94a3b8' : '#64748b'),
                        }}
                    >
                        {type === 'all' ? 'Tous' : type.charAt(0) + type.slice(1).toLowerCase()}
                    </Tag>
                ))}
            </div>

            <Row gutter={[16, 16]}>
                {/* List panel */}
                <Col xs={24} lg={selectedCommittee ? 10 : 24}>
                    <Row gutter={[12, 12]}>
                        <AnimatePresence>
                            {visibleContacts.map((contact, i) => {
                                const confidence = CONFIDENCE_LEVELS.find(l => l.value === contact.confidenceLevel) ?? CONFIDENCE_LEVELS[2];
                                const isSelected = selectedCommittee?.id === contact.id;
                                return (
                                    <Col xs={24} sm={selectedCommittee ? 24 : 12} xl={selectedCommittee ? 24 : 8} key={contact.id}>
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            whileHover={{ y: -2 }}
                                        >
                                            <div
                                                style={{
                                                    ...cardStyle,
                                                    borderTop: `3px solid ${TYPE_COLOR[contact.type] ?? '#64748b'}`,
                                                    boxShadow: isSelected
                                                        ? `0 0 0 2px ${TYPE_COLOR[contact.type] ?? '#e01c2e'}`
                                                        : undefined,
                                                }}
                                                onClick={() => setSelectedCommittee(isSelected ? null : contact)}
                                            >
                                                <div style={{ padding: '14px 16px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                                                        <div>
                                                            <Text strong style={{ fontSize: 13, display: 'block', lineHeight: 1.3 }}>{contact.name}</Text>
                                                            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                                                                <Tag
                                                                    color={TYPE_COLOR[contact.type]}
                                                                    style={{ borderRadius: 4, fontSize: 10, padding: '0 5px', margin: 0, fontWeight: 700 }}
                                                                >
                                                                    {contact.type}
                                                                </Tag>
                                                                {(contact.activeMissions ?? 0) > 0 && (
                                                                    <Tag color="error" style={{ borderRadius: 4, fontSize: 10, padding: '0 5px', margin: 0 }}>
                                                                        {contact.activeMissions} mission(s) active(s)
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span style={{ fontSize: 11, color: confidence.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                            {'⭐'.repeat(contact.confidenceLevel ?? 3)}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        {contact.phone && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <PhoneOutlined style={{ fontSize: 11, color: '#22c55e' }} />
                                                                <a href={`tel:${contact.phone}`} style={{ fontSize: 12, color: '#22c55e' }} onClick={e => e.stopPropagation()}>
                                                                    {contact.phone}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {contact.email && (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <MailOutlined style={{ fontSize: 11, color: '#1890ff' }} />
                                                                <a href={`mailto:${contact.email}`} style={{ fontSize: 12, color: '#1890ff' }} onClick={e => e.stopPropagation()}>
                                                                    {contact.email}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {contact.address && (
                                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                                                <EnvironmentOutlined style={{ fontSize: 11, color: '#f97316', marginTop: 1 }} />
                                                                <Text type="secondary" style={{ fontSize: 11 }}>{contact.address}</Text>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                                            MAJ: {contact.lastUpdate} · {contact.missionCount ?? 0} mission(s)
                                                        </Text>
                                                        {(isNational || isPresident) && (
                                                            <Button
                                                                size="small"
                                                                icon={<EditOutlined />}
                                                                style={{ borderRadius: 6, fontSize: 11 }}
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    setEditTarget(contact);
                                                                    form.setFieldsValue({
                                                                        phone: contact.phone,
                                                                        email: contact.email,
                                                                        address: contact.address,
                                                                        confidenceLevel: contact.confidenceLevel ?? 3,
                                                                    });
                                                                    setEditModalOpen(true);
                                                                }}
                                                            >
                                                                Modifier
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </Col>
                                );
                            })}
                        </AnimatePresence>
                    </Row>
                </Col>

                {/* Detail panel */}
                <AnimatePresence>
                    {selectedCommittee && (
                        <Col xs={24} lg={14}>
                            <motion.div
                                initial={{ opacity: 0, x: 24 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 24 }}
                                transition={{ duration: 0.2 }}
                                style={{ position: 'sticky', top: 16 }}
                            >
                                <div style={{
                                    background: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                    borderRadius: 20,
                                    overflow: 'hidden',
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        background: `linear-gradient(135deg, ${TYPE_COLOR[selectedCommittee.type] ?? '#e01c2e'}15, ${TYPE_COLOR[selectedCommittee.type] ?? '#e01c2e'}05)`,
                                        borderBottom: `1px solid ${TYPE_COLOR[selectedCommittee.type] ?? '#e01c2e'}20`,
                                        padding: '20px 24px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <Tag color={TYPE_COLOR[selectedCommittee.type]} style={{ borderRadius: 6, fontWeight: 700, marginBottom: 6 }}>
                                                    {selectedCommittee.type}
                                                </Tag>
                                                <Title level={4} style={{ margin: 0 }}>{selectedCommittee.name}</Title>
                                            </div>
                                            <Button size="small" onClick={() => setSelectedCommittee(null)} style={{ borderRadius: 8 }}>✕</Button>
                                        </div>
                                    </div>

                                    <div style={{ padding: 24 }}>
                                        {/* Stats */}
                                        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                                            {[
                                                { label: 'Missions totales', value: selectedCommittee.missionCount ?? 0, color: '#64748b' },
                                                { label: 'Actives', value: selectedCommittee.activeMissions ?? 0, color: '#e01c2e' },
                                                {
                                                    label: 'Terminées',
                                                    value: missions.filter(m => m.committeeId === selectedCommittee.id && m.status === 'COMPLETED').length,
                                                    color: '#22c55e',
                                                },
                                            ].map((s, i) => (
                                                <Col span={8} key={i}>
                                                    <div style={{
                                                        background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                                                        borderRadius: 12, padding: '12px 16px', textAlign: 'center',
                                                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
                                                    }}>
                                                        <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>
                                                    </div>
                                                </Col>
                                            ))}
                                        </Row>

                                        {/* Contact details */}
                                        <div style={{ marginBottom: 16 }}>
                                            {[
                                                { icon: <PhoneOutlined style={{ color: '#22c55e' }} />, label: 'Téléphone', value: selectedCommittee.phone, href: `tel:${selectedCommittee.phone}`, color: '#22c55e' },
                                                { icon: <MailOutlined style={{ color: '#1890ff' }} />, label: 'Email', value: selectedCommittee.email, href: `mailto:${selectedCommittee.email}`, color: '#1890ff' },
                                                { icon: <EnvironmentOutlined style={{ color: '#f97316' }} />, label: 'Adresse', value: selectedCommittee.address, href: null, color: undefined },
                                            ].map((item, i) => (
                                                <div key={i} style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
                                                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                                                }}>
                                                    <span style={{ fontSize: 16, marginTop: 1 }}>{item.icon}</span>
                                                    <div>
                                                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.label}</Text>
                                                        {item.href ? (
                                                            <a href={item.href} style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value || '—'}</a>
                                                        ) : (
                                                            <Text style={{ fontSize: 13, fontWeight: 600 }}>{item.value || '—'}</Text>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Confidence */}
                                        <div style={{ marginBottom: 20 }}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Niveau de confiance</Text>
                                            <br />
                                            <Text style={{ fontSize: 18 }}>{'⭐'.repeat(selectedCommittee.confidenceLevel ?? 3)}</Text>
                                            <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                                {CONFIDENCE_LEVELS.find(l => l.value === selectedCommittee.confidenceLevel)?.label.split(' ').slice(1).join(' ')}
                                            </Text>
                                        </div>

                                        {/* Active missions */}
                                        {missions.filter(m => m.committeeId === selectedCommittee.id && m.status === 'IN_PROGRESS').length > 0 && (
                                            <div>
                                                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Missions Actives</Text>
                                                {missions
                                                    .filter(m => m.committeeId === selectedCommittee.id && m.status === 'IN_PROGRESS')
                                                    .map(m => (
                                                        <div key={m.id} style={{
                                                            padding: '8px 12px', borderRadius: 8, marginBottom: 6,
                                                            background: isDark ? 'rgba(224,28,46,0.06)' : 'rgba(224,28,46,0.03)',
                                                            border: '1px solid rgba(224,28,46,0.15)',
                                                            borderLeft: '3px solid #e01c2e',
                                                        }}>
                                                            <Text strong style={{ fontSize: 12 }}>{m.title}</Text>
                                                            {m.teamChiefName && (
                                                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                                                    Chef: {m.teamChiefName}
                                                                </Text>
                                                            )}
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </Col>
                    )}
                </AnimatePresence>
            </Row>

            {/* Edit Modal */}
            <Modal
                title={`Modifier — ${editTarget?.name}`}
                open={editModalOpen}
                onCancel={() => setEditModalOpen(false)}
                footer={null}
                width={500}
                destroyOnClose
                style={{ top: 40 }}
            >
                <Form form={form} layout="vertical" onFinish={handleSaveContact} style={{ marginTop: 16 }}>
                    <Form.Item label="Téléphone" name="phone">
                        <Input prefix={<PhoneOutlined />} placeholder="+216 XX XXX XXX" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item label="Email" name="email">
                        <Input prefix={<MailOutlined />} placeholder="contact@croissantrouge.tn" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item label="Adresse" name="address">
                        <Input prefix={<EnvironmentOutlined />} placeholder="Adresse postale" style={{ borderRadius: 8 }} />
                    </Form.Item>
                    <Form.Item label="Niveau de confiance" name="confidenceLevel">
                        <Select style={{ borderRadius: 8 }}>
                            {CONFIDENCE_LEVELS.map(l => (
                                <Select.Option key={l.value} value={l.value}>{l.label}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button onClick={() => setEditModalOpen(false)} style={{ borderRadius: 8 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" style={{ borderRadius: 8, background: '#e01c2e', border: 'none' }}>
                            Sauvegarder
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default RegistreSourcesTab;
