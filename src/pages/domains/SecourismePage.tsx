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
    ArrowRightOutlined, SettingOutlined, MedicineBoxOutlined,
    AuditOutlined, BarChartOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useUIStore } from '@/stores';
import { secourismeService } from '@/services/domainServices';
import type { RescueEquipmentDTO, RescueDeviceDTO } from '@/types';
import RcpEvaluationsTab from './components/RcpEvaluationsTab';
import RcpNationalDashboard from './components/RcpNationalDashboard';

const { Title, Text } = Typography;
const { Option } = Select;

const SecourismePage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('inventory');
    const [equipment, setEquipment] = useState<RescueEquipmentDTO[]>([]);
    const [devices, setDevices] = useState<RescueDeviceDTO[]>([]);

    // Image state for Nouvel Equipement
    const [equipmentImage, setEquipmentImage] = useState<string>('');

    // Volunteers fields state
    const [needsVolunteers, setNeedsVolunteers] = useState<boolean>(false);

    // President approval modal states
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<RescueDeviceDTO | null>(null);

    // Modal states
    const [isEqModalOpen, setIsEqModalOpen] = useState(false);
    const [isDvModalOpen, setIsDvModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    const [eqForm] = Form.useForm();
    const [dvForm] = Form.useForm();
    const [approveForm] = Form.useForm();

    // Check roles for President / Vice President
    const roles = user?.roles || [];
    const isPresident = roles.some(r => ['PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'].includes(r));
    const isVicePresident = roles.some(r => ['VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'].includes(r));
    const isNationalPresident = roles.some(r => ['PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL'].includes(r));
    const isRespSecourisme = roles.some(r => r === 'RESP_SECOURISME');
    const isTrainer = user?.type === 'TRAINER';
    const canApprove = isPresident || isVicePresident;
    // Trainers + RESP_SECOURISME can access RCP evaluations form and committee tab
    const canAccessRcp = isTrainer || isRespSecourisme || isPresident || isVicePresident;

    const loadData = async () => {
        if (!user?.committeeId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const isManager = isRespSecourisme || isPresident || isVicePresident;
            if (isManager) {
                const [eq, dv] = await Promise.all([
                    secourismeService.getEquipment(user.committeeId).catch(() => []),
                    secourismeService.getDevices(user.committeeId).catch(() => []),
                ]);
                setEquipment(Array.isArray(eq) ? eq : []);
                setDevices(Array.isArray(dv) ? dv : []);
            } else {
                setEquipment([]);
                setDevices([]);
            }
        } catch (error) {
            console.error("Failed to load secourisme data", error);
        } finally {
            setLoading(false);
        }
    };

    const location = useLocation();

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tabParam = queryParams.get('tab');
        const isManager = isRespSecourisme || isPresident || isVicePresident;
        
        if (tabParam && ['inventory', 'devices', 'validations', 'rcpEvaluations', 'rcpNational'].includes(tabParam)) {
            setActiveTab(tabParam);
        } else if (!isManager && isTrainer) {
            setActiveTab('rcpEvaluations');
        } else {
            setActiveTab('inventory');
        }
    }, [location.search, isRespSecourisme, isPresident, isVicePresident, isTrainer]);

    useEffect(() => {
        loadData();
    }, [user?.committeeId]);

    const handleEquipmentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEquipmentImage(reader.result as string);
                eqForm.setFieldsValue({ imageUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCreateEquipment = async (values: any) => {
        if (!user?.committeeId) return;
        setSubmitLoading(true);
        try {
            const payload: RescueEquipmentDTO = {
                name: values.name,
                type: values.type,
                quantity: values.quantity,
                status: values.status || 'OPERATIONAL',
                lastInspectionDate: values.lastInspectionDate ? values.lastInspectionDate.format('YYYY-MM-DD') : undefined,
                imageUrl: equipmentImage || undefined
            };
            await secourismeService.addEquipment(user.committeeId, payload);
            messageApi.success('Équipement ajouté avec succès !');
            setIsEqModalOpen(false);
            setEquipmentImage('');
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
            const isAutoApproved = canApprove;
            const payload: RescueDeviceDTO = {
                eventName: values.eventName,
                eventDate: values.eventDate ? values.eventDate.format('YYYY-MM-DD') : undefined,
                location: values.location,
                requiredRescuers: values.requiredRescuers,
                status: isAutoApproved ? 'ACTIVE' : 'PLANNED',
                approvalStatus: isAutoApproved ? 'APPROVED' : 'PENDING',
                volunteersNeeded: values.volunteersNeeded,
                volunteersCount: values.volunteersNeeded ? values.volunteersCount : 0,
                actionChiefName: values.actionChiefName || '',
                eventTime: values.eventTime ? values.eventTime.format('HH:mm') : undefined
            };
            await secourismeService.createDevice(user.committeeId, payload);
            messageApi.success(isAutoApproved ? 'Dispositif créé et activé immédiatement !' : 'Dispositif soumis pour validation au Président !');
            setIsDvModalOpen(false);
            dvForm.resetFields();
            setNeedsVolunteers(false);
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la planification du dispositif.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const openApprovalModal = (device: RescueDeviceDTO) => {
        setSelectedDevice(device);
        setIsApproveModalOpen(true);
        approveForm.setFieldsValue({ actionChiefName: device.actionChiefName || '' });
    };

    const handleApproveDevice = async (values: any) => {
        if (!selectedDevice?.id) return;
        setSubmitLoading(true);
        try {
            await secourismeService.approveDevice(selectedDevice.id, values.actionChiefName, 'APPROVED');
            messageApi.success('Dispositif approuvé et activé avec succès !');
            setIsApproveModalOpen(false);
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'approbation du dispositif.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleRejectDevice = async (deviceId: string) => {
        setSubmitLoading(true);
        try {
            await secourismeService.approveDevice(deviceId, '', 'REJECTED');
            messageApi.success('Dispositif rejeté.');
            setIsApproveModalOpen(false);
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors du rejet du dispositif.');
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
                        width: 50, height: 50, borderRadius: 14,
                        background: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', border: `1px solid ${isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2'}`,
                        overflow: 'hidden'
                    }}>
                        {record.imageUrl ? (
                            <img src={record.imageUrl} alt={n} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <MedicineBoxOutlined style={{ fontSize: 20 }} />
                        )}
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
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.location} {record.eventTime ? `• ${record.eventTime}` : ''}</Text>
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
            title: 'CHEF D\'ACTION',
            dataIndex: 'actionChiefName',
            key: 'actionChiefName',
            render: (c) => c ? <Text strong style={{ color: '#ef4444' }}>{c}</Text> : <Text type="secondary" italic>Non assigné</Text>
        },
        {
            title: 'VOLONTAIRES',
            key: 'volunteers',
            render: (_, record) => record.volunteersNeeded ? (
                <Tag color="orange">{record.volunteersCount} requis</Tag>
            ) : (
                <Tag color="default">Non requis</Tag>
            )
        },
        {
            title: 'STATUT DE VALIDATION',
            dataIndex: 'approvalStatus',
            key: 'approvalStatus',
            render: (s, record) => {
                const status = s || (record.status === 'ACTIVE' ? 'APPROVED' : 'PENDING');
                if (status === 'PENDING') {
                    return <Tag color="warning" style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>En attente</Tag>;
                } else if (status === 'APPROVED') {
                    return <Tag color="success" style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>Approuvé</Tag>;
                } else if (status === 'REJECTED') {
                    return <Tag color="error" style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>Refusé</Tag>;
                }
                return <Tag color="blue" style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>{status}</Tag>;
            }
        }
    ];

    const pendingColumns: ColumnsType<RescueDeviceDTO> = [
        {
            title: 'ÉVÉNEMENT',
            dataIndex: 'eventName',
            key: 'eventName',
            render: (n, record) => (
                <Space size={16}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, #ef4444, #991b1b)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', boxShadow: '0 4px 12px rgba(239,68,68,0.1)'
                    }}>
                        <AlertOutlined style={{ fontSize: 20 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{n}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.location}</Text>
                    </div>
                </Space>
            )
        },
        {
            title: 'DATE & HEURE',
            key: 'dateTime',
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong>{record.eventDate ? new Date(record.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'À définir'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.eventTime || 'Toute la journée'}</Text>
                </div>
            )
        },
        {
            title: 'VOLONTAIRES',
            key: 'volunteers',
            render: (_, record) => record.volunteersNeeded ? (
                <Tag color="orange">{record.volunteersCount} volontaires requis</Tag>
            ) : (
                <Tag color="default">Non requis</Tag>
            )
        },
        {
            title: 'CHEF PROPOSÉ',
            dataIndex: 'actionChiefName',
            key: 'actionChiefName',
            render: (c) => c ? <Text strong style={{ color: '#ef4444' }}>{c}</Text> : <Text type="secondary" italic>Aucun</Text>
        },
        {
            title: 'ACTION',
            key: 'action',
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    onClick={() => openApprovalModal(record)}
                    style={{ borderRadius: 8, background: '#ef4444', borderColor: '#ef4444', fontWeight: 600 }}
                >
                    Valider / Décider
                </Button>
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

    const isManager = isRespSecourisme || isPresident || isVicePresident;
    const tabsList = [];

    if (isManager) {
        tabsList.push({ key: 'inventory', label: 'Inventaire', icon: <ToolOutlined /> });
        tabsList.push({ key: 'devices', label: 'Dispositifs', icon: <CalendarOutlined /> });
        if (canApprove) {
            const pendingCount = devices.filter(d => d.approvalStatus === 'PENDING' || !d.approvalStatus).length;
            tabsList.push({
                key: 'validations',
                label: `Demandes (${pendingCount})`,
                icon: <SafetyCertificateOutlined />
            });
        }
    }

    if (canAccessRcp && !isNationalPresident) {
        tabsList.push({ key: 'rcpEvaluations', label: 'Évaluations RCP', icon: <AuditOutlined /> });
    }
    if (isNationalPresident) {
        tabsList.push({ key: 'rcpNational', label: 'Dashboard RCP National', icon: <BarChartOutlined /> });
    }

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
                                        <MedicineBoxOutlined style={{ fontSize: 28, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Secourisme</Title>
                                        <Tag color="red" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontSize: 11, fontWeight: 700 }}>
                                            {user?.committeeName?.toUpperCase() || 'UNITÉ CENTRALE'}
                                        </Tag>
                                    </div>
                                </div>

                                {/* OPERATIONAL STATS */}
                                {isManager ? (
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
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                        <div style={{ padding: 20, borderRadius: 20, background: isDark ? 'rgba(239,68,68,0.05)' : '#fff', border: `1px solid ${isDark ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                                    <SafetyCertificateOutlined />
                                                </div>
                                                <Tag color="red" style={{ borderRadius: 10 }}>ACTIF</Tag>
                                            </div>
                                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Rôle Formateur</Text>
                                            <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800 }}>Évaluation RCP</Title>
                                        </div>

                                        <Button
                                            type="primary"
                                            block
                                            icon={<PlusOutlined />}
                                            onClick={() => navigate('/secourisme/rcp-evaluation')}
                                            style={{ height: 50, borderRadius: 16, background: '#ef4444', borderColor: '#ef4444', fontWeight: 700, marginTop: 20, boxShadow: '0 8px 24px rgba(239,68,68,0.2)' }}
                                        >
                                            Nouvelle évaluation
                                        </Button>
                                    </Space>
                                )}

                                <div style={{ marginTop: 'auto', paddingTop: 60 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                                        <InfoCircleOutlined style={{ color: '#ef4444' }} />
                                        <Text style={{ fontSize: 13 }}>
                                            {isManager 
                                                ? "Toutes les inspections sont à jour pour le mois en cours." 
                                                : "Évaluez les participants sur les techniques de massage cardiaque et RCP."}
                                        </Text>
                                    </div>
                                </div>
                            </div>
                        </Col>

                        {/* RIGHT CONTENT (70%) */}
                        <Col xs={24} lg={17} style={{ padding: '40px 50px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', padding: 6, borderRadius: 16 }}>
                                    {tabsList.map(tab => (
                                        <Button
                                            key={tab.key}
                                            type="text"
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
                                    {canAccessRcp && (
                                        <Button
                                            icon={<SafetyCertificateOutlined />}
                                            onClick={() => navigate('/secourisme/rcp-evaluation')}
                                            style={{ borderRadius: 12, height: 44, padding: '0 16px', background: 'rgba(239,68,68,0.1)', borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, fontSize: 12 }}
                                        >
                                            Nouvelle éval. RCP
                                        </Button>
                                    )}
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
                                    ) : activeTab === 'devices' ? (
                                        <Table
                                            columns={dvColumns}
                                            dataSource={devices}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucun dispositif</Title><Text type="secondary">Planifiez un événement de secours.</Text></div> }}
                                        />
                                    ) : activeTab === 'rcpEvaluations' ? (
                                        <RcpEvaluationsTab committeeId={user?.committeeId || ''} isDark={isDark} />
                                    ) : activeTab === 'rcpNational' ? (
                                        <RcpNationalDashboard isDark={isDark} />
                                    ) : (
                                        <Table
                                            columns={pendingColumns}
                                            dataSource={devices.filter(d => d.approvalStatus === 'PENDING' || !d.approvalStatus)}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><Title level={5}>Aucune demande</Title><Text type="secondary">Toutes les demandes de dispositif ont été traitées.</Text></div> }}
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
                onCancel={() => {
                    setIsEqModalOpen(false);
                    setEquipmentImage('');
                }}
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

                    <Form.Item name="imageUrl" label="Photo de l'équipement">
                        <div style={{
                            border: `2px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'}`,
                            borderRadius: 16,
                            padding: '24px 16px',
                            textAlign: 'center',
                            background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'border-color 0.3s ease'
                        }}
                        onClick={() => document.getElementById('eq-image-upload')?.click()}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1'; }}
                        >
                            <input
                                id="eq-image-upload"
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleEquipmentImageChange}
                            />
                            {equipmentImage ? (
                                <div style={{ position: 'relative' }}>
                                    <img src={equipmentImage} alt="Equipment preview" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 12, objectFit: 'cover' }} />
                                    <Button
                                        type="primary"
                                        danger
                                        shape="circle"
                                        size="small"
                                        icon={<PlusOutlined style={{ transform: 'rotate(45deg)' }} />}
                                        style={{ position: 'absolute', top: -10, right: -10 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEquipmentImage('');
                                            eqForm.setFieldsValue({ imageUrl: '' });
                                        }}
                                    />
                                </div>
                            ) : (
                                <div>
                                    <PlusOutlined style={{ fontSize: 24, color: '#ef4444', marginBottom: 8 }} />
                                    <div><Text strong>Glissez ou sélectionnez une photo</Text></div>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Format JPG, PNG (Max 5MB)</Text></div>
                                </div>
                            )}
                        </div>
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => {
                            setIsEqModalOpen(false);
                            setEquipmentImage('');
                        }} style={{ height: 45, borderRadius: 12, padding: '0 25px' }}>Annuler</Button>
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
                onCancel={() => {
                    setIsDvModalOpen(false);
                    setNeedsVolunteers(false);
                }}
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
                            <Form.Item name="eventTime" label="Heure prévue" rules={[{ required: true }]}>
                                <DatePicker picker="time" format="HH:mm" size="large" style={{ width: '100%', borderRadius: 12 }} placeholder="Ex: 14:30" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="requiredRescuers" label="Effectif Secouriste" rules={[{ required: true }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="actionChiefName" label="Chef d'action proposé (Optionnel)">
                                <Input size="large" placeholder="Nom du responsable" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="location" label="Emplacement précis" rules={[{ required: true }]}>
                        <Input size="large" prefix={<GlobalOutlined style={{ color: '#8b5cf6' }} />} placeholder="Ex: Palais de Carthage, Zone A" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <Row gutter={20}>
                        <Col span={12}>
                            <Form.Item name="volunteersNeeded" label="Besoin de volontaires ?" initialValue={false}>
                                <Select size="large" onChange={(val) => setNeedsVolunteers(val)}>
                                    <Option value={false}>Non</Option>
                                    <Option value={true}>Oui</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        {needsVolunteers && (
                            <Col span={12}>
                                <Form.Item name="volunteersCount" label="Nombre de volontaires requis" rules={[{ required: true, message: 'Champ requis' }]}>
                                    <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 40 }}>
                        <Button onClick={() => {
                            setIsDvModalOpen(false);
                            setNeedsVolunteers(false);
                        }} style={{ height: 45, borderRadius: 12, padding: '0 25px' }}>Fermer</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 45, borderRadius: 12, padding: '0 30px', background: '#8b5cf6', borderColor: '#8b5cf6' }}>
                            Confirmer la planification
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL: Validation / Approbation du Président */}
            <Modal
                title={
                    <Space>
                        <SafetyCertificateOutlined style={{ color: '#ef4444' }} />
                        <Text strong style={{ fontSize: 18 }}>Validation du Dispositif (DPS)</Text>
                    </Space>
                }
                open={isApproveModalOpen}
                onCancel={() => setIsApproveModalOpen(false)}
                footer={null}
                width={500}
                centered
                styles={{ content: { borderRadius: 24, padding: 30 } }}
            >
                {selectedDevice && (
                    <Form form={approveForm} layout="vertical" onFinish={handleApproveDevice}>
                        <div style={{ marginBottom: 24, padding: 16, borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}>
                            <div style={{ marginBottom: 8 }}><Text type="secondary">Événement :</Text> <Text strong>{selectedDevice.eventName}</Text></div>
                            <div style={{ marginBottom: 8 }}><Text type="secondary">Date & Heure :</Text> <Text strong>{selectedDevice.eventDate ? new Date(selectedDevice.eventDate).toLocaleDateString('fr-FR') : ''} {selectedDevice.eventTime ? `à ${selectedDevice.eventTime}` : ''}</Text></div>
                            <div style={{ marginBottom: 8 }}><Text type="secondary">Lieu :</Text> <Text strong>{selectedDevice.location}</Text></div>
                            {selectedDevice.volunteersNeeded && (
                                <div><Text type="secondary">Volontaires requis :</Text> <Text strong>{selectedDevice.volunteersCount}</Text></div>
                            )}
                        </div>

                        <Form.Item name="actionChiefName" label="Chef d'action désigné" rules={[{ required: true, message: 'Veuillez désigner le chef d\'action' }]}>
                            <Input size="large" style={{ borderRadius: 12 }} placeholder="Nom complet du chef d'action" />
                        </Form.Item>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 30 }}>
                            <Button onClick={() => setIsApproveModalOpen(false)} style={{ height: 45, borderRadius: 12 }}>Annuler</Button>
                            <Button
                                onClick={() => handleRejectDevice(selectedDevice.id!)}
                                danger
                                style={{ height: 45, borderRadius: 12, fontWeight: 700 }}
                            >
                                Rejeter
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={submitLoading}
                                style={{ height: 45, borderRadius: 12, background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                            >
                                Approuver et Activer
                            </Button>
                        </div>
                    </Form>
                )}
            </Modal>
        </div>
    );
};

export default SecourismePage;

