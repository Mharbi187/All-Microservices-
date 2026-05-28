// ============================================================
// NEXUS-AID — Santé Page (RESP_SANTE)
// Health actions, blood donations & medical distributions
// Version 4: Complete CRC Design + Full Features
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Modal, Form, Input, Select, App, DatePicker,
    InputNumber, Progress, Tooltip, Badge, Upload, Divider, Switch, Tabs
} from 'antd';
import {
    HeartOutlined, PlusOutlined, MedicineBoxOutlined,
    ExperimentOutlined, GlobalOutlined, CheckCircleOutlined,
    FilterOutlined, SettingOutlined, EnvironmentOutlined,
    TeamOutlined, RiseOutlined, UserOutlined, PaperClipOutlined,
    CameraOutlined, FileTextOutlined, CloseOutlined, SearchOutlined,
    ClockCircleOutlined, WarningOutlined, SendOutlined,
    CheckOutlined, StopOutlined, CarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { santeService } from '@/services/domainServices';
import type { HealthActionDTO, BloodDonationDTO, MedicalDistributionDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================================
// CRC Color Palette (Croissant Rouge)
// ============================================================
const CRC = {
    red: '#e01c2e',
    redDark: '#c0152a',
    redDeep: '#9b0e1c',
    redLight: '#ff6b6b',
    redBg: '#fff5f5',
    redBgDark: 'rgba(224,28,46,0.08)',
    redBorder: 'rgba(224,28,46,0.2)',
    gradient: 'linear-gradient(135deg, #e01c2e, #c0152a)',
    gradientSoft: 'linear-gradient(135deg, rgba(224,28,46,0.1), rgba(192,21,42,0.05))',
};

const PRIORITY_COLORS: Record<string, string> = {
    URGENCE: '#dc2626',
    HAUTE: '#ea580c',
    NORMALE: '#0ea5e9',
    FAIBLE: '#6b7280',
};

const STATUS_COLORS: Record<string, string> = {
    PLANNED: 'processing',
    ONGOING: 'warning',
    COMPLETED: 'success',
    PENDING: 'default',
    APPROVED: 'success',
    REJECTED: 'error',
    DISTRIBUTED: 'cyan',
};

// ============================================================
// FileUploadZone Component
// ============================================================
interface FileUploadZoneProps {
    label: string;
    accept: string;
    multiple?: boolean;
    onFilesChange: (base64List: string[]) => void;
    preview?: string[];
    icon?: React.ReactNode;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
    label, accept, multiple = true, onFilesChange, preview = [], icon
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<string[]>(preview);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const readers = selectedFiles.map(file => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
        });
        Promise.all(readers).then(results => {
            const updated = multiple ? [...files, ...results] : results;
            setFiles(updated);
            onFilesChange(updated);
        });
    };

    const removeFile = (index: number) => {
        const updated = files.filter((_, i) => i !== index);
        setFiles(updated);
        onFilesChange(updated);
    };

    return (
        <div>
            <div
                onClick={() => inputRef.current?.click()}
                style={{
                    border: `2px dashed ${CRC.redBorder}`,
                    borderRadius: 16,
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: CRC.redBg,
                    transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,28,46,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = CRC.redBg)}
            >
                <div style={{ color: CRC.red, fontSize: 28, marginBottom: 8 }}>
                    {icon || <PaperClipOutlined />}
                </div>
                <Text style={{ color: CRC.red, fontWeight: 600 }}>{label}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>Cliquez pour sélectionner {multiple ? 'des fichiers' : 'un fichier'}</Text>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                style={{ display: 'none' }}
                onChange={handleChange}
            />
            {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {files.map((f, i) => (
                        <div key={i} style={{ position: 'relative', display: 'inline-block' }}>
                            {f.startsWith('data:image') ? (
                                <img src={f} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 10, border: `2px solid ${CRC.redBorder}` }} />
                            ) : (
                                <div style={{
                                    width: 70, height: 70, borderRadius: 10,
                                    background: CRC.redBg,
                                    border: `2px solid ${CRC.redBorder}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 10, color: CRC.red, fontWeight: 700
                                }}>
                                    <FileTextOutlined style={{ fontSize: 24 }} />
                                </div>
                            )}
                            <Button
                                size="small"
                                type="text"
                                icon={<CloseOutlined />}
                                onClick={() => removeFile(i)}
                                style={{
                                    position: 'absolute', top: -6, right: -6,
                                    width: 20, height: 20, borderRadius: '50%',
                                    background: '#ef4444', color: '#fff', fontSize: 10, padding: 0
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================
// Main Component
// ============================================================
const SantePage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('actions');
    const [actions, setActions] = useState<HealthActionDTO[]>([]);
    const [donations, setDonations] = useState<BloodDonationDTO[]>([]);
    const [distributions, setDistributions] = useState<MedicalDistributionDTO[]>([]);

    // Modal states
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
    const [isDistribModalOpen, setIsDistribModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    // File upload states
    const [actionPhotos, setActionPhotos] = useState<string[]>([]);
    const [actionFiles, setActionFiles] = useState<string[]>([]);
    const [donationPhotos, setDonationPhotos] = useState<string[]>([]);
    const [chiefPhoto, setChiefPhoto] = useState<string>('');
    const [distribPhotos, setDistribPhotos] = useState<string[]>([]);
    const [distribDocs, setDistribDocs] = useState<string[]>([]);

    // Volunteer states
    const [actionNeedsVolunteers, setActionNeedsVolunteers] = useState(false);
    const [donationNeedsVolunteers, setDonationNeedsVolunteers] = useState(false);
    const [volunteerSearch, setVolunteerSearch] = useState('');
    const [volunteerSearchModal, setVolunteerSearchModal] = useState(false);
    const [selectedVolunteers, setSelectedVolunteers] = useState<Array<{ id?: string; name: string; committeeId?: string }>>([]);

    const [actionForm] = Form.useForm();
    const [donationForm] = Form.useForm();
    const [distribForm] = Form.useForm();

    // Role checks
    const roles = user?.roles || [];
    const isPresident = roles.some(r => ['PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL'].includes(r));
    const isVicePresident = roles.some(r => ['VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'].includes(r));
    const canApprove = isPresident || isVicePresident;

    const loadData = async () => {
        setLoading(true);
        try {
            const committeeId = user?.committeeId;
            const [acts, dons, dists] = await Promise.all([
                committeeId ? santeService.getActions(committeeId).catch(() => []) : Promise.resolve([]),
                committeeId ? santeService.getBloodDonationsByCommittee(committeeId).catch(() => santeService.getBloodDonations().catch(() => [])) : santeService.getBloodDonations().catch(() => []),
                committeeId ? santeService.getDistributionsByCommittee(committeeId).catch(() => []) : Promise.resolve([]),
            ]);
            setActions(acts || []);
            setDonations(dons || []);
            setDistributions(dists || []);
        } catch (error) {
            console.error("Failed to load sante data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.committeeId]);

    // ---- Handlers ----

    const handleCreateAction = async (values: any) => {
        if (!user?.committeeId) {
            messageApi.error('Erreur: impossible de déterminer votre comité.');
            return;
        }
        setSubmitLoading(true);
        try {
            const payload: HealthActionDTO = {
                title: values.title,
                type: values.type,
                actionType: values.type,
                date: values.date ? values.date.format('YYYY-MM-DD') : undefined,
                startDate: values.date ? values.date.format('YYYY-MM-DD') : undefined,
                location: values.location,
                address: values.address,
                beneficiaries: values.beneficiaries,
                beneficiariesCount: values.beneficiaries,
                status: 'PLANNED',
                description: values.description,
                priority: values.priority || 'NORMALE',
                category: values.category,
                volunteersNeeded: actionNeedsVolunteers,
                volunteersCount: actionNeedsVolunteers ? values.volunteersCount : 0,
                collaborationType: values.collaborationType || 'INTERNAL',
                actionChiefName: values.actionChiefName,
                actionChiefPhotoUrl: chiefPhoto || undefined,
                hospitalDestination: values.hospitalDestination,
                photosUrls: actionPhotos.length > 0 ? actionPhotos : undefined,
                filesUrls: actionFiles.length > 0 ? actionFiles : undefined,
                volunteersList: selectedVolunteers.length > 0 ? selectedVolunteers : undefined,
            };
            await santeService.createAction(user.committeeId, payload);
            messageApi.success('Action sanitaire planifiée avec succès !');
            setIsActionModalOpen(false);
            actionForm.resetFields();
            setActionPhotos([]);
            setActionFiles([]);
            setChiefPhoto('');
            setSelectedVolunteers([]);
            setActionNeedsVolunteers(false);
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la création de l\'action sanitaire.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateDonation = async (values: any) => {
        setSubmitLoading(true);
        try {
            const payload: BloodDonationDTO = {
                bloodType: values.bloodType,
                donationDate: values.donationDate ? values.donationDate.format('YYYY-MM-DD') : '',
                collectionCenter: values.collectionCenter,
                zone: values.zone,
                quantity: values.quantity,
                status: 'ACCEPTED',
                donorVolunteerId: values.donorId || undefined,
                committeeId: user?.committeeId,
                hospitalDestination: values.hospitalDestination,
                beneficiaryName: values.beneficiaryName,
                volunteersNeeded: donationNeedsVolunteers,
                volunteersCount: donationNeedsVolunteers ? values.volunteersCount : 0,
                actionChiefName: values.actionChiefName,
                photosUrls: donationPhotos.length > 0 ? donationPhotos : undefined,
                notes: values.notes,
            };
            await santeService.createBloodDonation(payload);
            messageApi.success('🩸 Don de sang enregistré avec succès !');
            setIsDonationModalOpen(false);
            donationForm.resetFields();
            setDonationPhotos([]);
            setDonationNeedsVolunteers(false);
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de l\'enregistrement du don.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateDistribution = async (values: any) => {
        if (!user?.committeeId) {
            messageApi.error('Erreur: impossible de déterminer votre comité.');
            return;
        }
        setSubmitLoading(true);
        try {
            const payload: MedicalDistributionDTO = {
                committeeId: user.committeeId,
                resourceType: values.resourceType,
                title: values.title,
                description: values.description,
                destinationType: values.destinationType,
                destinationName: values.destinationName,
                destinationAddress: values.destinationAddress,
                quantity: values.quantity,
                unit: values.unit,
                notes: values.notes,
                requestedByName: user.fullName,
                photosUrls: distribPhotos.length > 0 ? distribPhotos : undefined,
                documentsUrls: distribDocs.length > 0 ? distribDocs : undefined,
            };
            await santeService.createDistribution(payload);
            messageApi.success('Demande de distribution soumise pour validation au Président !');
            setIsDistribModalOpen(false);
            distribForm.resetFields();
            setDistribPhotos([]);
            setDistribDocs([]);
            loadData();
        } catch (error) {
            messageApi.error('Erreur lors de la soumission de la demande.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleApproveDistribution = async (distId: string) => {
        try {
            await santeService.approveDistribution(distId, user?.fullName || '');
            messageApi.success('Distribution approuvée ! Elle sera visible dans la page Ressources.');
            loadData();
        } catch {
            messageApi.error('Erreur lors de l\'approbation.');
        }
    };

    const handleRejectDistribution = async (distId: string) => {
        try {
            await santeService.rejectDistribution(distId, 'Rejeté par le Président');
            messageApi.success('Distribution rejetée.');
            loadData();
        } catch {
            messageApi.error('Erreur lors du rejet.');
        }
    };

    // ---- Glass Style ----
    const glassStyle = {
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.08)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(224,28,46,0.06)',
        overflow: 'hidden'
    };

    // ---- Table Columns ----
    const actColumns: ColumnsType<HealthActionDTO> = [
        {
            title: 'ACTION SANITAIRE',
            key: 'title',
            render: (_, record) => (
                <Space size={12}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: record.priority === 'URGENCE'
                            ? 'linear-gradient(135deg, #e01c2e, #c0152a)'
                            : CRC.redBgDark,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: record.priority === 'URGENCE' ? '#fff' : CRC.red,
                        flexShrink: 0
                    }}>
                        <MedicineBoxOutlined style={{ fontSize: 22 }} />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 14, display: 'block' }}>{record.title || record.type}</Text>
                        <Space size={6}>
                            {record.priority && (
                                <Tag color={PRIORITY_COLORS[record.priority] || CRC.red}
                                    style={{ borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none' }}>
                                    {record.priority}
                                </Tag>
                            )}
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                <EnvironmentOutlined style={{ marginRight: 3 }} />
                                {record.location || record.address || 'Terrain'}
                            </Text>
                        </Space>
                    </div>
                </Space>
            )
        },
        {
            title: 'ÉQUIPE',
            key: 'team',
            render: (_, record) => (
                <div>
                    {record.actionChiefName && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <UserOutlined style={{ color: CRC.red, fontSize: 12 }} />
                            <Text style={{ fontSize: 12 }}>{record.actionChiefName}</Text>
                        </div>
                    )}
                    {record.volunteersNeeded && (
                        <Tag icon={<TeamOutlined />} color="volcano" style={{ borderRadius: 6, fontSize: 11 }}>
                            {record.volunteersCount || '?'} vol.
                        </Tag>
                    )}
                </div>
            )
        },
        {
            title: 'BÉNÉFICIAIRES',
            dataIndex: 'beneficiaries',
            key: 'beneficiaries',
            render: (b, record) => {
                const count = b || record.beneficiariesCount || 0;
                return (
                    <div>
                        <Text strong style={{ fontSize: 15, color: CRC.red }}>{count}</Text>
                        <Progress percent={Math.min((count / 200) * 100, 100)} size="small"
                            showInfo={false} strokeColor={CRC.red} style={{ marginTop: 4 }} />
                    </div>
                );
            }
        },
        {
            title: 'DATE',
            key: 'date',
            render: (_, record) => {
                const d = record.date || record.startDate;
                return (
                    <div>
                        <Text strong style={{ fontSize: 13 }}>
                            {d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'À planifier'}
                        </Text>
                        {d && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{new Date(d).getFullYear()}</Text>}
                    </div>
                );
            }
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag color={STATUS_COLORS[s] || 'default'} style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>
                    {s}
                </Tag>
            )
        }
    ];

    const donColumns: ColumnsType<BloodDonationDTO> = [
        {
            title: 'GROUPE SANGUIN',
            dataIndex: 'bloodType',
            key: 'bloodType',
            render: (t) => (
                <Space size={12}>
                    <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: CRC.gradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 13, fontWeight: 800,
                        boxShadow: '0 4px 12px rgba(224,28,46,0.35)'
                    }}>
                        {t}
                    </div>
                    <Text strong>{t}</Text>
                </Space>
            )
        },
        {
            title: 'VOLUME',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (q) => <Text strong style={{ fontSize: 15, color: CRC.red }}>{q} <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>ml</Text></Text>
        },
        {
            title: 'HÔPITAL / CENTRE',
            key: 'hospital',
            render: (_, r) => (
                <div>
                    {r.hospitalDestination && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CarOutlined style={{ color: CRC.red, fontSize: 12 }} />
                            <Text style={{ fontSize: 12 }}>{r.hospitalDestination}</Text>
                        </div>
                    )}
                    <Text type="secondary" style={{ fontSize: 12 }}>{r.collectionCenter}</Text>
                </div>
            )
        },
        {
            title: 'CHEF / ÉQUIPE',
            key: 'chief',
            render: (_, r) => (
                <div>
                    {r.actionChiefName && <Text style={{ fontSize: 12 }}><UserOutlined /> {r.actionChiefName}</Text>}
                    {r.volunteersNeeded && <Tag color="volcano" style={{ marginTop: 4, borderRadius: 6 }}><TeamOutlined /> {r.volunteersCount} vol.</Tag>}
                </div>
            )
        },
        {
            title: 'DATE',
            dataIndex: 'donationDate',
            key: 'donationDate',
            render: (d) => <Text style={{ fontSize: 13 }}>{d ? new Date(d).toLocaleDateString('fr-FR') : '-'}</Text>
        },
    ];

    const distColumns: ColumnsType<MedicalDistributionDTO> = [
        {
            title: 'RESSOURCE',
            key: 'resource',
            render: (_, r) => (
                <div>
                    <Text strong style={{ display: 'block', fontSize: 14 }}>{r.title}</Text>
                    <Tag style={{ borderRadius: 6, background: CRC.redBg, color: CRC.red, border: `1px solid ${CRC.redBorder}`, fontSize: 11 }}>
                        {r.resourceType?.replace(/_/g, ' ')}
                    </Tag>
                </div>
            )
        },
        {
            title: 'DESTINATION',
            key: 'destination',
            render: (_, r) => (
                <div>
                    <Text style={{ fontSize: 13 }}>{r.destinationName || '-'}</Text>
                    {r.destinationType && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{r.destinationType}</Text>}
                </div>
            )
        },
        {
            title: 'QUANTITÉ',
            key: 'qty',
            render: (_, r) => <Text strong style={{ color: CRC.red }}>{r.quantity} {r.unit || 'unités'}</Text>
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => (
                <Tag color={STATUS_COLORS[s] || 'default'} style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 600 }}>
                    {s === 'PENDING' ? <Space size={4}><ClockCircleOutlined /> En attente</Space> : s === 'APPROVED' ? <Space size={4}><CheckCircleOutlined /> Approuvé</Space> : s === 'REJECTED' ? <Space size={4}><StopOutlined /> Rejeté</Space> : <Space size={4}><CarOutlined /> Distribué</Space>}
                </Tag>
            )
        },
        ...(canApprove ? [{
            title: 'ACTIONS',
            key: 'actions',
            render: (_: any, r: MedicalDistributionDTO) => r.status === 'PENDING' ? (
                <Space>
                    <Button
                        size="small"
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={() => r.id && handleApproveDistribution(r.id)}
                        style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8 }}
                    >
                        Approuver
                    </Button>
                    <Button
                        size="small"
                        danger
                        icon={<StopOutlined />}
                        onClick={() => r.id && handleRejectDistribution(r.id)}
                        style={{ borderRadius: 8 }}
                    >
                        Rejeter
                    </Button>
                </Space>
            ) : null
        }] : [])
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement de l'unité santé...</Text>
        </div>
    );

    const tabItems = [
        { key: 'actions', label: 'Actions Terrain', icon: <MedicineBoxOutlined /> },
        { key: 'donations', label: 'Dons de Sang', icon: <ExperimentOutlined /> },
        { key: 'distributions', label: 'Distribution Médicale', icon: <SendOutlined /> },
    ];

    const pendingDistributions = distributions.filter(d => d.status === 'PENDING');

    return (
        <div style={{ padding: '0 24px 40px 24px', maxWidth: 1600, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div style={glassStyle}>
                    <Row gutter={0}>
                        {/* LEFT SIDEBAR */}
                        <Col xs={24} lg={6} style={{
                            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.08)'}`,
                            background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,250,250,0.6)',
                            padding: '36px 28px'
                        }}>
                            <div style={{ position: 'sticky', top: 40 }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
                                    <div style={{
                                        width: 60, height: 60, borderRadius: 20,
                                        background: CRC.gradient,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 28, boxShadow: '0 12px 24px rgba(224,28,46,0.3)'
                                    }}>
                                        🏥
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Santé</Title>
                                        <Tag color="red" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: '4px 0 0 0', fontSize: 11, fontWeight: 700 }}>
                                            CRC
                                        </Tag>
                                    </div>
                                </div>

                                {/* Stats */}
                                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                    <div style={{
                                        padding: '18px 20px', borderRadius: 20,
                                        background: isDark ? CRC.redBgDark : '#fff',
                                        border: `1px solid ${CRC.redBorder}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: CRC.redBgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CRC.red }}>
                                                <MedicineBoxOutlined />
                                            </div>
                                            <RiseOutlined style={{ color: CRC.red, fontSize: 18 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Actions Sanitaires</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800, color: CRC.red }}>{actions.length}</Title>
                                    </div>

                                    <div style={{
                                        padding: '18px 20px', borderRadius: 20,
                                        background: isDark ? CRC.redBgDark : '#fff',
                                        border: `1px solid ${CRC.redBorder}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: CRC.redBgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CRC.red }}>
                                                <ExperimentOutlined />
                                            </div>
                                            <HeartOutlined style={{ color: CRC.red, fontSize: 18 }} />
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Dons de Sang</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800, color: CRC.red }}>{donations.length}</Title>
                                    </div>

                                    <div style={{
                                        padding: '18px 20px', borderRadius: 20,
                                        background: isDark ? CRC.redBgDark : '#fff',
                                        border: `1px solid ${CRC.redBorder}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: CRC.redBgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CRC.red }}>
                                                <SendOutlined />
                                            </div>
                                            {canApprove && pendingDistributions.length > 0 && (
                                                <Badge count={pendingDistributions.length} color={CRC.red} />
                                            )}
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Distributions</Text>
                                        <Title level={4} style={{ margin: '4px 0 0 0', fontWeight: 800, color: CRC.red }}>{distributions.length}</Title>
                                    </div>

                                    {/* Main Action Button */}
                                    <Button
                                        type="primary"
                                        block
                                        icon={<PlusOutlined />}
                                        onClick={() => {
                                            if (activeTab === 'actions') setIsActionModalOpen(true);
                                            else if (activeTab === 'donations') setIsDonationModalOpen(true);
                                            else setIsDistribModalOpen(true);
                                        }}
                                        style={{
                                            height: 52, borderRadius: 16,
                                            background: CRC.gradient,
                                            border: 'none',
                                            fontWeight: 700, fontSize: 15,
                                            boxShadow: '0 8px 24px rgba(224,28,46,0.3)'
                                        }}
                                    >
                                        {activeTab === 'actions' ? 'Planifier Action' : activeTab === 'donations' ? 'Enregistrer Don' : 'Demander Distribution'}
                                    </Button>
                                </Space>

                                {/* Urgency panel */}
                                {actions.filter(a => a.priority === 'URGENCE').length > 0 && (
                                    <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 16, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
                                        <Space>
                                            <WarningOutlined style={{ color: '#dc2626' }} />
                                            <Text style={{ color: '#dc2626', fontWeight: 600, fontSize: 13 }}>
                                                {actions.filter(a => a.priority === 'URGENCE').length} action(s) urgentes
                                            </Text>
                                        </Space>
                                    </div>
                                )}

                                {/* Summary */}
                                <div style={{ marginTop: 24, padding: '14px 16px', borderRadius: 16, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                                    <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748b' }}>
                                        <TeamOutlined style={{ marginRight: 6 }} />
                                        Bénéficiaires total: <Text strong>{actions.reduce((acc, a) => acc + (a.beneficiaries || a.beneficiariesCount || 0), 0)}</Text>
                                    </Text>
                                </div>
                            </div>
                        </Col>

                        {/* RIGHT CONTENT */}
                        <Col xs={24} lg={18} style={{ padding: '36px 40px' }}>
                            {/* Tabs */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
                                <div style={{ display: 'flex', gap: 8, background: isDark ? 'rgba(255,255,255,0.05)' : '#f8f4f4', padding: 6, borderRadius: 18, flexWrap: 'wrap' }}>
                                    {tabItems.map(tab => (
                                        <Button
                                            key={tab.key}
                                            type="text"
                                            icon={tab.icon}
                                            onClick={() => setActiveTab(tab.key)}
                                            style={{
                                                height: 42, padding: '0 20px', borderRadius: 13, fontWeight: 600,
                                                background: activeTab === tab.key ? (isDark ? CRC.redBgDark : '#fff') : 'transparent',
                                                color: activeTab === tab.key ? CRC.red : (isDark ? 'rgba(255,255,255,0.45)' : '#64748b'),
                                                boxShadow: activeTab === tab.key && !isDark ? '0 4px 12px rgba(224,28,46,0.12)' : 'none',
                                                transition: 'all 0.3s ease',
                                            }}
                                        >
                                            {tab.label}
                                            {tab.key === 'distributions' && canApprove && pendingDistributions.length > 0 && (
                                                <Badge count={pendingDistributions.length} color={CRC.red} style={{ marginLeft: 8 }} />
                                            )}
                                        </Button>
                                    ))}
                                </div>
                                <Space>
                                    <Button icon={<FilterOutlined />} style={{ borderRadius: 12, height: 42, borderColor: CRC.redBorder }} />
                                    <Button icon={<SettingOutlined />} style={{ borderRadius: 12, height: 42, borderColor: CRC.redBorder }} />
                                </Space>
                            </div>

                            {/* Tables */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {activeTab === 'actions' && (
                                        <Table<HealthActionDTO>
                                            columns={actColumns}
                                            dataSource={actions}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><MedicineBoxOutlined style={{ fontSize: 48, color: CRC.redBorder }} /><br /><Title level={5}>Aucune action planifiée</Title><Text type="secondary">Cliquez sur "Planifier Action" pour commencer.</Text></div> }}
                                        />
                                    )}
                                    {activeTab === 'donations' && (
                                        <Table<BloodDonationDTO>
                                            columns={donColumns}
                                            dataSource={donations}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><ExperimentOutlined style={{ fontSize: 48, color: CRC.redBorder }} /><br /><Title level={5}>Aucun don enregistré</Title><Text type="secondary">Enregistrez un don de sang.</Text></div> }}
                                        />
                                    )}
                                    {activeTab === 'distributions' && (
                                        <Table<MedicalDistributionDTO>
                                            columns={distColumns}
                                            dataSource={distributions}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                            className="premium-table"
                                            locale={{ emptyText: <div style={{ padding: '60px 0' }}><SendOutlined style={{ fontSize: 48, color: CRC.redBorder }} /><br /><Title level={5}>Aucune distribution</Title><Text type="secondary">Soumettez une demande de distribution médicale.</Text></div> }}
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* ======================================================= */}
            {/* MODAL: Planifier Action Terrain */}
            {/* ======================================================= */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: CRC.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <MedicineBoxOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Planifier une Action Terrain</Text>
                    </div>
                }
                open={isActionModalOpen}
                onCancel={() => { setIsActionModalOpen(false); actionForm.resetFields(); setActionPhotos([]); setActionFiles([]); setChiefPhoto(''); setSelectedVolunteers([]); setActionNeedsVolunteers(false); }}
                footer={null}
                width={760}
                centered
                styles={{ content: { borderRadius: 24, padding: 28 } }}
            >
                <Form form={actionForm} layout="vertical" onFinish={handleCreateAction} requiredMark={false}>
                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>📋 Informations Générales</Text>
                    </Divider>

                    <Form.Item name="title" label="Titre de l'action" rules={[{ required: true, message: 'Titre requis' }]}>
                        <Input size="large" placeholder="Ex: Caravane Ophtalmologique Siliana" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="type" label="Type d'intervention" rules={[{ required: true }]}>
                                <Select size="large" placeholder="Choisir">
                                    <Option value="CARAVANE_MEDICALE">Caravane Médicale</Option>
                                    <Option value="CONSULTATION_GRATUITE">Consultation Gratuite</Option>
                                    <Option value="DISTRIBUTION_MEDICAMENTS">Distribution Médicaments</Option>
                                    <Option value="VACCINATION">Vaccination</Option>
                                    <Option value="SENSIBILISATION">Sensibilisation</Option>
                                    <Option value="AUTRE">Autre</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="priority" label="Priorité">
                                <Select size="large" defaultValue="NORMALE">
                                    <Option value="URGENCE"><span style={{ color: '#dc2626', fontWeight: 700 }}>🔴 URGENCE</span></Option>
                                    <Option value="HAUTE">🟠 HAUTE</Option>
                                    <Option value="NORMALE">🔵 NORMALE</Option>
                                    <Option value="FAIBLE">⚫ FAIBLE</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="date" label="Date prévue" rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description / Notes">
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détails, protocoles, logistique..." />
                    </Form.Item>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>📍 Localisation</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="location" label="Lieu / Région">
                                <Input size="large" prefix={<EnvironmentOutlined style={{ color: CRC.red }} />} placeholder="Ex: Siliana, Zone Rurale" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="address" label="Adresse précise">
                                <Input size="large" placeholder="Ex: Rue de l'Hôpital, 1230" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="beneficiaries" label="Objectif bénéficiaires">
                                <InputNumber size="large" min={0} style={{ width: '100%', borderRadius: 12 }} placeholder="Nombre de personnes" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="hospitalDestination" label="Hôpital / Établissement destinataire">
                                <Input size="large" placeholder="Ex: CHR Siliana" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>👥 Chef d'Action & Équipe</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="actionChiefName" label="Nom du Chef d'action">
                                <Input size="large" prefix={<UserOutlined style={{ color: CRC.red }} />} placeholder="Nom complet" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="collaborationType" label="Type de collaboration">
                                <Select size="large" defaultValue="INTERNAL">
                                    <Option value="INTERNAL">🟢 Même comité</Option>
                                    <Option value="EXTERNAL">🔵 Autre comité / Collaboration</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label="Photo du Chef d'action">
                        <FileUploadZone
                            label="Photo chef d'action"
                            accept="image/*"
                            multiple={false}
                            icon={<CameraOutlined />}
                            onFilesChange={(files) => setChiefPhoto(files[0] || '')}
                            preview={chiefPhoto ? [chiefPhoto] : []}
                        />
                    </Form.Item>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <Switch
                            checked={actionNeedsVolunteers}
                            onChange={setActionNeedsVolunteers}
                            style={{ background: actionNeedsVolunteers ? CRC.red : undefined }}
                        />
                        <Text>Besoin de volontaires ?</Text>
                    </div>
                    {actionNeedsVolunteers && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="volunteersCount" label="Nombre de volontaires nécessaires">
                                    <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Rechercher des volontaires">
                                    <Button
                                        icon={<SearchOutlined />}
                                        block
                                        style={{ borderRadius: 12, height: 40, borderColor: CRC.red, color: CRC.red }}
                                        onClick={() => setVolunteerSearchModal(true)}
                                    >
                                        {selectedVolunteers.length > 0 ? `${selectedVolunteers.length} volontaire(s) sélectionné(s)` : 'Rechercher des volontaires'}
                                    </Button>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>📷 Photos & Documents</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Photos de l'action">
                                <FileUploadZone
                                    label="Ajouter des photos"
                                    accept="image/*"
                                    multiple={true}
                                    icon={<CameraOutlined />}
                                    onFilesChange={setActionPhotos}
                                    preview={actionPhotos}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Documents (PDF, Word, Excel)">
                                <FileUploadZone
                                    label="Ajouter des documents"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                                    multiple={true}
                                    icon={<FileTextOutlined />}
                                    onFilesChange={setActionFiles}
                                    preview={actionFiles}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                        <Button onClick={() => setIsActionModalOpen(false)} style={{ height: 46, borderRadius: 12 }}>Annuler</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitLoading}
                            style={{ height: 46, borderRadius: 12, background: CRC.gradient, border: 'none', paddingLeft: 32, paddingRight: 32 }}
                        >
                            Confirmer la planification
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ======================================================= */}
            {/* MODAL: Enregistrer Don de Sang */}
            {/* ======================================================= */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: CRC.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <ExperimentOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Enregistrer un Don de Sang</Text>
                    </div>
                }
                open={isDonationModalOpen}
                onCancel={() => { setIsDonationModalOpen(false); donationForm.resetFields(); setDonationPhotos([]); setDonationNeedsVolunteers(false); }}
                footer={null}
                width={680}
                centered
                styles={{ content: { borderRadius: 24, padding: 28 } }}
            >
                <Form form={donationForm} layout="vertical" onFinish={handleCreateDonation} requiredMark={false}>
                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>🩸 Informations du Don</Text>
                    </Divider>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="bloodType" label="Groupe Sanguin" rules={[{ required: true }]}>
                                <Select size="large">
                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <Option key={t} value={t}>{t}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="quantity" label="Volume (ml)" rules={[{ required: true }]}>
                                <InputNumber size="large" min={100} step={50} defaultValue={450} style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="donationDate" label="Date de prélèvement" rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="collectionCenter" label="Centre de collecte" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: Centre National de Transfusion" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="zone" label="Zone CRT" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: Grand Tunis" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>🏥 Destination & Bénéficiaire</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="hospitalDestination" label="Hôpital / Établissement destinataire">
                                <Input size="large" placeholder="Ex: CHU Tunis" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="beneficiaryName" label="Nom du bénéficiaire (si connu)">
                                <Input size="large" placeholder="Optionnel" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>👥 Chef & Équipe</Text>
                    </Divider>
                    <Form.Item name="actionChiefName" label="Chef d'action">
                        <Input size="large" prefix={<UserOutlined style={{ color: CRC.red }} />} placeholder="Nom du responsable" style={{ borderRadius: 12 }} />
                    </Form.Item>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <Switch
                            checked={donationNeedsVolunteers}
                            onChange={setDonationNeedsVolunteers}
                            style={{ background: donationNeedsVolunteers ? CRC.red : undefined }}
                        />
                        <Text>Besoin de volontaires ?</Text>
                    </div>
                    {donationNeedsVolunteers && (
                        <Form.Item name="volunteersCount" label="Nombre de volontaires nécessaires">
                            <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} />
                        </Form.Item>
                    )}

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>📷 Photos de l'action</Text>
                    </Divider>
                    <FileUploadZone
                        label="Photos de la collecte de sang"
                        accept="image/*"
                        multiple={true}
                        icon={<CameraOutlined />}
                        onFilesChange={setDonationPhotos}
                        preview={donationPhotos}
                    />

                    <Form.Item name="notes" label="Notes" style={{ marginTop: 16 }}>
                        <TextArea rows={2} style={{ borderRadius: 12 }} placeholder="Informations complémentaires..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
                        <Button onClick={() => setIsDonationModalOpen(false)} style={{ height: 46, borderRadius: 12 }}>Fermer</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitLoading}
                            style={{ height: 46, borderRadius: 12, background: CRC.gradient, border: 'none', paddingLeft: 32, paddingRight: 32 }}
                        >
                            Valider l'enregistrement
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ======================================================= */}
            {/* MODAL: Demande Distribution Médicale */}
            {/* ======================================================= */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: CRC.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <SendOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Demande de Distribution Médicale</Text>
                    </div>
                }
                open={isDistribModalOpen}
                onCancel={() => { setIsDistribModalOpen(false); distribForm.resetFields(); setDistribPhotos([]); setDistribDocs([]); }}
                footer={null}
                width={700}
                centered
                styles={{ content: { borderRadius: 24, padding: 28 } }}
            >
                <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <Text style={{ color: '#ca8a04', fontSize: 13 }}>
                        <ClockCircleOutlined style={{ marginRight: 6 }} />
                        Cette demande sera soumise au <Text strong style={{ color: '#ca8a04' }}>Président du Comité</Text> pour validation. Après approbation, la ressource sera visible dans la page Ressources.
                    </Text>
                </div>
                <Form form={distribForm} layout="vertical" onFinish={handleCreateDistribution} requiredMark={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="resourceType" label="Type de ressource" rules={[{ required: true }]}>
                                <Select size="large" placeholder="Choisir le type">
                                    <Option value="MEDICAMENTS">💊 Médicaments</Option>
                                    <Option value="KITS_MEDICAUX">🧰 Kits Médicaux</Option>
                                    <Option value="POCHES_SANG">🩸 Poches de Sang</Option>
                                    <Option value="EQUIPEMENTS">🏥 Équipements</Option>
                                    <Option value="DISPOSITIFS_MEDICAUX">🔬 Dispositifs Médicaux</Option>
                                    <Option value="DOCUMENTS_MEDICAUX">📄 Documents Médicaux</Option>
                                    <Option value="AUTRES">📦 Autres</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="title" label="Titre de la demande" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: Kits premiers soins urgence" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Description">
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détails de la ressource et son utilisation..." />
                    </Form.Item>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>🎯 Destination</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="destinationType" label="Type de destination" rules={[{ required: true }]}>
                                <Select size="large">
                                    <Option value="HOPITAL">🏥 Hôpital</Option>
                                    <Option value="ASSOCIATION">🤝 Association</Option>
                                    <Option value="MISSION">🚑 Mission</Option>
                                    <Option value="COMITE">🏛️ Comité</Option>
                                    <Option value="BENEFICIAIRE">👤 Bénéficiaire</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="destinationName" label="Nom de la destination" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: CHR Sfax" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="destinationAddress" label="Adresse (optionnel)">
                                <Input size="large" placeholder="Adresse complète" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Quantité">
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="unit" label="Unité">
                                <Input size="large" placeholder="Ex: boîtes, unités, kg, L" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}>📎 Preuves & Documents</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Photos">
                                <FileUploadZone label="Ajouter photos" accept="image/*" multiple icon={<CameraOutlined />} onFilesChange={setDistribPhotos} preview={distribPhotos} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Documents justificatifs">
                                <FileUploadZone label="Ajouter documents" accept=".pdf,.doc,.docx" multiple icon={<FileTextOutlined />} onFilesChange={setDistribDocs} preview={distribDocs} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Notes additionnelles">
                        <TextArea rows={2} style={{ borderRadius: 12 }} placeholder="Informations supplémentaires..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
                        <Button onClick={() => setIsDistribModalOpen(false)} style={{ height: 46, borderRadius: 12 }}>Annuler</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={submitLoading}
                            style={{ height: 46, borderRadius: 12, background: CRC.gradient, border: 'none', paddingLeft: 32, paddingRight: 32 }}
                        >
                            Soumettre pour validation
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ======================================================= */}
            {/* MODAL: Recherche Volontaires */}
            {/* ======================================================= */}
            <Modal
                title={<Text strong><SearchOutlined /> Rechercher des Volontaires</Text>}
                open={volunteerSearchModal}
                onCancel={() => setVolunteerSearchModal(false)}
                footer={
                    <Button type="primary" onClick={() => setVolunteerSearchModal(false)}
                        style={{ background: CRC.gradient, border: 'none', borderRadius: 12 }}>
                        Confirmer la sélection ({selectedVolunteers.length})
                    </Button>
                }
                width={560}
                centered
                styles={{ content: { borderRadius: 24, padding: 24 } }}
            >
                <Input
                    size="large"
                    placeholder="Rechercher par nom..."
                    prefix={<SearchOutlined style={{ color: CRC.red }} />}
                    value={volunteerSearch}
                    onChange={e => setVolunteerSearch(e.target.value)}
                    style={{ borderRadius: 12, marginBottom: 16 }}
                />
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {['Même comité', 'Autre comité'].map((group, gi) => (
                        <div key={gi} style={{ marginBottom: 12 }}>
                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                                {gi === 0 ? '🟢' : '🔵'} {group}
                            </Text>
                            <div style={{ padding: '10px 14px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}
                                onClick={() => {
                                    const vol = { name: `Volontaire ${gi + 1}`, committeeId: gi === 0 ? user?.committeeId : 'other' };
                                    if (!selectedVolunteers.find(v => v.name === vol.name)) {
                                        setSelectedVolunteers([...selectedVolunteers, vol]);
                                    }
                                }}>
                                <Space>
                                    <UserOutlined style={{ color: CRC.red }} />
                                    <Text>{gi === 0 ? 'Ahmed Ben Ali (Même comité)' : 'Sami Mejri (Autre comité)'}</Text>
                                    <Tag color={gi === 0 ? 'green' : 'blue'} style={{ borderRadius: 6 }}>{gi === 0 ? 'Local' : 'Externe'}</Tag>
                                </Space>
                            </div>
                        </div>
                    ))}
                </div>
                {selectedVolunteers.length > 0 && (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: CRC.redBg }}>
                        <Text style={{ color: CRC.red, fontWeight: 600, fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircleOutlined /> {selectedVolunteers.length} volontaire(s) sélectionné(s) :
                        </Text>
                        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {selectedVolunteers.map((v, i) => (
                                <Tag key={i} closable onClose={() => setSelectedVolunteers(selectedVolunteers.filter((_, idx) => idx !== i))}
                                    style={{ borderRadius: 8, borderColor: CRC.redBorder, color: CRC.red }}>
                                    {v.name}
                                </Tag>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SantePage;
