// ============================================================
// NEXUS-AID — Secourisme Page (RESP_SECOURISME)
// Rescue equipment & planned devices management
// Version 3: Unified Glass Architecture
// ============================================================

import { useState, useEffect } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Form, Input, Select, App, DatePicker, InputNumber, Dropdown, Avatar, Progress
} from 'antd';
import type { MenuProps } from 'antd';
import {
    PlusOutlined, ToolOutlined, CalendarOutlined,
    GlobalOutlined, SafetyCertificateOutlined, AlertOutlined,
    CheckCircleOutlined, InfoCircleOutlined, FilterOutlined,
    ArrowRightOutlined, SettingOutlined, MedicineBoxOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '@/stores';
import { secourismeService } from '@/services/domainServices';
import type { RescueEquipmentDTO, RescueDeviceDTO } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

const SecourismePage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory');
    const [equipment, setEquipment] = useState<RescueEquipmentDTO[]>([]);
    const [devices, setDevices] = useState<RescueDeviceDTO[]>([]);

    // Modal states
    const [isEqModalOpen, setIsEqModalOpen] = useState(false);
    const [isDvModalOpen, setIsDvModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [eqForm] = Form.useForm();
    const [dvForm] = Form.useForm();

    const loadData = async () => {
        if (!user?.committeeId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [eq, dv] = await Promise.all([
                secourismeService.getEquipment(user.committeeId).catch(() => []),
                secourismeService.getDevices(user.committeeId).catch(() => []),
            ]);
            setEquipment(Array.isArray(eq) ? eq : []);
            setDevices(Array.isArray(dv) ? dv : []);
        } catch (error) {
            console.error("Failed to load secourisme data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.committeeId]);

    const handleCreateEquipment = async (values: any) => {
        if (!user?.committeeId) return;
        setSubmitLoading(true);
        try {
            const payload: RescueEquipmentDTO = {
                name: values.name,
                type: values.type,
                quantity: values.quantity,
                status: values.status || 'OPERATIONAL',
                lastInspectionDate: values.lastInspectionDate ? values.lastInspectionDate.format('YYYY-MM-DD') : undefined
            };
            await secourismeService.addEquipment(user.committeeId, payload);
            messageApi.success('Équipement ajouté avec succès !');
            setIsEqModalOpen(false);
            eqForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'ajout de l\'équipement.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateDevice = async (values: any) => {
        if (!user?.committeeId) return;
        setSubmitLoading(true);
        try {
            const payload: RescueDeviceDTO = {
                eventName: values.eventName,
                eventDate: values.eventDate ? values.eventDate.format('YYYY-MM-DD') : undefined,
                location: values.location,
                requiredRescuers: values.requiredRescuers,
                status: values.status || 'PLANNED'
            };
            await secourismeService.createDevice(user.committeeId, payload);
            messageApi.success('Dispositif planifié avec succès !');
            setIsDvModalOpen(false);
            dvForm.resetFields();
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la planification du dispositif.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const eqColumns: ColumnsType<RescueEquipmentDTO> = [
        {
            title: 'ÉQUIPEMENT',
            dataIndex: 'name',
            key: 'name',
            render: (n, record) => (
                <Space size={16}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', border: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2'}`
                    }}>
                        <MedicineBoxOutlined style={{ fontSize: 20 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{n}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.type || 'MATÉRIEL'}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'RESERVE',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (q) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Text strong style={{ fontSize: 15 }}>{q}</Text>
                    <div style={{ width: 80 }}>
                        <Progress
                            percent={q > 10 ? 100 : (q / 10) * 100}
                            size="small"
                            showInfo={false}
                            strokeColor={q < 3 ? '#ef4444' : '#10b981'}
                        />
                    </div>
                </div>
            )
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => {
                const isOp = s === 'OPERATIONAL';
                return (
                    <Tag icon={isOp ? <CheckCircleOutlined /> : <AlertOutlined />} color={isOp ? 'success' : 'error'} style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>
                        {s}
                    </Tag>
                );
            }
        },
        {
            title: 'INSPECTION',
            dataIndex: 'lastInspectionDate',
            key: 'lastInspectionDate',
            render: (d) => d ? <Text style={{ fontFamily: 'monospace' }}>{new Date(d).toLocaleDateString()}</Text> : <Text type="secondary">—</Text>
        }
    ];

    const dvColumns: ColumnsType<RescueDeviceDTO> = [
        {
            title: 'ÉVÉNEMENT',
            dataIndex: 'eventName',
            key: 'eventName',
            render: (n, record) => (
                <Space size={16}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                        <CalendarOutlined style={{ fontSize: 20 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{n}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.location}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'PLANIFICATION',
            dataIndex: 'eventDate',
            key: 'eventDate',
            render: (d) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong>{d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : 'À définir'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{d ? new Date(d).getFullYear() : ''}</Text>
                </div>
            )
        },
        {
            title: 'ÉQUIPE',
            dataIndex: 'requiredRescuers',
            key: 'requiredRescuers',
            render: (n) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar.Group size="small" maxCount={3}>
                        {[...Array(Math.min(n, 5))].map((_, i) => (
                            <Avatar key={i} style={{ backgroundColor: '#ef4444' }} icon={<SafetyCertificateOutlined />} />
                        ))}
                    </Avatar.Group>
                    <Text strong>{n} requis</Text>
                </div>
            )
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag color={s === 'ACTIVE' ? 'volcano' : 'blue'} style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>
                    {s}
                </Tag>
            )
        }
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement de l'unité opérationnelle...</Text>
        </div>
    );

    const glassStyle = {
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.06)',
        overflow: 'hidden'
    };

    return (
        <div style={{ padding: '0 40px 40px 40px', maxWidth: 1600, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                {/* UNIFIED CONTAINER */}
                <div style={glassStyle}>
                    <Row gutter={0}>
                        {/* LEFT SIDEBAR (30%) */}
                        <Col xs={24} lg={7} style={{
                            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                            background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.5)',
                            padding: 40
                        }}>
                            <div style={{ position: 'sticky', top: 40 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                                    <div style={{
                                        width: 60, height: 60, borderRadius: 20,
                                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28, boxShadow: '0 12px 24px rgba(239,68,68,0.25)'
                                    }}>
                                        🚑
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Secourisme</Title>
                                        <Tag color="red" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontSize: 11, fontWeight: 700 }}>
                                            {user?.committeeName?.toUpperCase() || 'UNITÉ CENTRALE'}
                                        </Tag>
                                    </div>
                                </div>

                                {/* OPERATIONAL STATS */}
                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(239,68,68,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                                <ToolOutlined />
                                            </div>
                                            <Tag color="red" style={{ borderRadius: 10 }}>CRITIQUE</Tag>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Inventaire Actif</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{equipment.length} Éléments</Title>
                                    </div>

                                    <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(30,41,59,0.2)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                                                <CalendarOutlined />
                                            </div>
                                            <Tag color="purple" style={{ borderRadius: 10 }}>PLANIFIÉ</Tag>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Prochains Dispositifs</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>{devices.length} Missions</Title>
                                    </div>

                                    <Button
                                        type="primary"
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => activeTab === 'inventory' ? setIsEqModalOpen(true) : setIsDvModalOpen(true)}
                                        style={{ height: 50, borderRadius: 16, background: '#ef4444', borderColor: '#ef4444', fontWeight: 700, marginTop: 20, boxShadow: '0 8px 24px rgba(239,68,68,0.2)' }}
                                    >
                                        Nouvelle Entrée
                                    </Button>
                                </Space>

                                <div style={{ marginTop: 'auto', paddingTop: 60 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                                        <InfoCircleOutlined style={{ color: '#ef4444' }} />
                                        <Text style={{ fontSize: 13 }}>Toutes les inspections sont à jour pour le mois en cours.</Text>
                                    </div>
                                </div>
                            </div>
                        </Col>

                        {/* RIGHT CONTENT (70%) */}
                        <Col xs={24} lg={17} style={{ padding: '40px 50px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 6, borderRadius: 16 }}>
                                    {[
                                        { key: 'inventory', label: 'Inventaire', icon: <ToolOutlined /> },
                                        { key: 'devices', label: 'Dispositifs', icon: <CalendarOutlined /> }
                                    ].map(tab => (
                                        <Button
                                            key={tab.key}
                                            type={activeTab === tab.key ? 'text' : 'text'}
                                            icon={tab.icon}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{
                                                height: 40, padding: '0 24px', borderRadius: 12,
                                                fontWeight: 600,
                                                background: activeTab === tab.key ? (isDark ? 'rgba(239,68,68,0.15)' : '#fff') : 'transparent',
                                                color: activeTab === tab.key ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.45)' : '#64748b'),
                                                boxShadow: activeTab === tab.key && !isDark ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }}
                                        >
                                            {tab.label}
                                        </Button>
                                    ))}
                                </div>

                                <Space size={12}>
                                    <Button icon={<FilterOutlined />} style={{ borderRadius: 12, height: 44, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                                    <Button icon={<SettingOutlined />} style={{ borderRadius: 12, height: 44, width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                                </Space>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {activeTab === 'inventory' ? (
                                        <Table
                                            columns={eqColumns}
                                            dataSource={equipment}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucun équipement</Title><Text type="secondary">Ajoutez du matériel pour commencer.</Text></div> }}
                                        />
                                    ) : (
                                        <Table
                                            columns={dvColumns}
                                            dataSource={devices}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucun dispositif</Title><Text type="secondary">Planifiez un événement de secours.</Text></div> }}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* MODAL: Ajouter Équipement */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <ToolOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Nouvel Équipement</Text>
                    </div>
                }
                open={isEqModalOpen}
                onCancel={() => setIsEqModalOpen(false)}
                footer={null}
                width={550}
                centered
                styles={{ content: { borderRadius: 24, padding: 30 } }}
            >
                <Form form={eqForm} layout="vertical" onFinish={handleCreateEquipment} requiredMark={false}>
                    <Form.Item name="name" label="Libellé de l'équipement" rules={[{ required: true, message: 'Champ requis' }]}>
                        <Input size="large" placeholder="Ex: Défibrillateur Automatisé" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="type" label="Catégorie" rules={[{ required: true }]}>
                                <Select size="large" style={{ borderRadius: 12 }}>
                                    <Option value="MEDICAL">Matériel Médical</Option>
                                    <Option value="VEHICLE">Véhicule / Ambulance</Option>
                                    <Option value="COMMUNICATION">Transmissions</Option>
                                    <Option value="CLOTHING">Équipements (EPI)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Stock initial" rules={[{ required: true }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="status" label="État Opérationnel" initialValue="OPERATIONAL">
                                <Select size="large">
                                    <Option value="OPERATIONAL">Opérationnel</Option>
                                    <Option value="MAINTENANCE">Maintenance</Option>
                                    <Option value="BROKEN">HS</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="lastInspectionDate" label="Dernière Inspection">
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" placeholder="Date" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsEqModalOpen(false)} style={{ height: 45, borderRadius: 12, padding: '0 25px' }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, padding: '0 30px', background: '#ef4444', borderColor: '#ef4444' }}>
                            Enregistrer le matériel
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: Planifier Dispositif */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                            <CalendarOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Nouveau Dispositif (DPS)</Text>
                    </div>
                }
                open={isDvModalOpen}
                onCancel={() => setIsDvModalOpen(false)}
                footer={null}
                width={550}
                centered
                styles={{ content: { borderRadius: 24, padding: 30 } }}
            >
                <Form form={dvForm} layout="vertical" onFinish={handleCreateDevice} requiredMark={false}>
                    <Form.Item name="eventName" label="Nom de la mission / événement" rules={[{ required: true }]}>
                        <Input size="large" placeholder="Ex: Marathon de Tunis, Grand Concert..." style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="eventDate" label="Date prévue" rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="requiredRescuers" label="Effectif Secouriste" rules={[{ required: true }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="location" label="Emplacement précis" rules={[{ required: true }]}>
                        <Input size="large" prefix={<GlobalOutlined style={{ color: '#8b5cf6' }} />} placeholder="Ex: Palais de Carthage, Zone A" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <Form.Item name="status" label="Niveau de préparation" initialValue="PLANNED">
                        <Select size="large">
                            <Option value="PLANNED">Planification</Option>
                            <Option value="ACTIVE">Activation Immédiate</Option>
                        </Select>
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => setIsDvModalOpen(false)} style={{ height: 45, borderRadius: 12, padding: '0 25px' }}>Fermer</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, padding: '0 30px', background: '#8b5cf6', borderColor: '#8b5cf6' }}>
                            Confirmer la planification
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default SecourismePage;

