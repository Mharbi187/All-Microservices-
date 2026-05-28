// ============================================================
// NEXUS-AID — Distribution Médicale Page
// Page dédiée à la gestion des distributions de ressources médicales
// Accessible : RESP_SANTE (créer), PRESIDENT/VP (approuver)
// ============================================================

import { useState, useEffect, useRef } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Modal, Form, Input, Select, App, InputNumber,
    Divider, Badge
} from 'antd';
import {
    SendOutlined, PlusOutlined, CheckOutlined, StopOutlined,
    ClockCircleOutlined, BoxPlotOutlined, EnvironmentOutlined,
    FileTextOutlined, CameraOutlined, FilterOutlined,
    CloseOutlined, ExclamationCircleOutlined, CheckCircleOutlined,
    CarOutlined, MedicineBoxOutlined, GlobalOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { santeService } from '@/services/domainServices';
import type { MedicalDistributionDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================================
// CRC Color Palette
// ============================================================
const CRC = {
    red: '#e01c2e',
    redDark: '#c0152a',
    redLight: '#ff6b6b',
    redBg: '#fff5f5',
    redBgDark: 'rgba(224,28,46,0.08)',
    redBorder: 'rgba(224,28,46,0.2)',
    gradient: 'linear-gradient(135deg, #e01c2e, #c0152a)',
    green: '#16a34a',
    orange: '#ea580c',
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    PENDING: { color: 'warning', label: 'En attente validation', icon: <ClockCircleOutlined /> },
    APPROVED: { color: 'success', label: 'Approuvé', icon: <CheckCircleOutlined /> },
    REJECTED: { color: 'error', label: 'Rejeté', icon: <CloseOutlined /> },
    DISTRIBUTED: { color: 'cyan', label: 'Distribué', icon: <BoxPlotOutlined /> },
};

const RESOURCE_TYPES = [
    { value: 'MEDICAMENTS', label: 'Médicaments', icon: <MedicineBoxOutlined /> },
    { value: 'KITS_MEDICAUX', label: 'Kits Médicaux', icon: <MedicineBoxOutlined /> },
    { value: 'POCHES_SANG', label: 'Poches de Sang', icon: <MedicineBoxOutlined /> },
    { value: 'EQUIPEMENTS', label: 'Équipements Médicaux', icon: <MedicineBoxOutlined /> },
    { value: 'DISPOSITIFS_MEDICAUX', label: 'Dispositifs Médicaux', icon: <MedicineBoxOutlined /> },
    { value: 'DOCUMENTS_MEDICAUX', label: 'Documents & Protocoles', icon: <FileTextOutlined /> },
    { value: 'AUTRES', label: 'Autres', icon: <BoxPlotOutlined /> },
];

// ============================================================
// FileUploadZone Component (reusable)
// ============================================================
const FileUploadZone: React.FC<{
    label: string; accept: string; multiple?: boolean;
    onFilesChange: (b64: string[]) => void; preview?: string[]; icon?: React.ReactNode;
}> = ({ label, accept, multiple = true, onFilesChange, preview = [], icon }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<string[]>(preview);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        const readers = selected.map(f => new Promise<string>(res => {
            const r = new FileReader();
            r.onloadend = () => res(r.result as string);
            r.readAsDataURL(f);
        }));
        Promise.all(readers).then(results => {
            const updated = multiple ? [...files, ...results] : results;
            setFiles(updated);
            onFilesChange(updated);
        });
    };

    const remove = (i: number) => {
        const updated = files.filter((_, idx) => idx !== i);
        setFiles(updated);
        onFilesChange(updated);
    };

    return (
        <div>
            <div
                onClick={() => inputRef.current?.click()}
                style={{ border: `2px dashed ${CRC.redBorder}`, borderRadius: 14, padding: '16px', textAlign: 'center', cursor: 'pointer', background: CRC.redBg, transition: 'all 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = CRC.red)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = CRC.redBorder)}
            >
                <div style={{ color: CRC.red, fontSize: 24, marginBottom: 4 }}>{icon || <FileTextOutlined />}</div>
                <Text style={{ color: CRC.red, fontWeight: 600, fontSize: 13 }}>{label}</Text>
            </div>
            <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} onChange={handleChange} />
            {files.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {files.map((f, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            {f.startsWith('data:image') ? (
                                <img src={f} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: `2px solid ${CRC.redBorder}` }} />
                            ) : (
                                <div style={{ width: 64, height: 64, borderRadius: 10, background: CRC.redBg, border: `2px solid ${CRC.redBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CRC.red }}>
                                    <FileTextOutlined style={{ fontSize: 22 }} />
                                </div>
                            )}
                            <Button size="small" type="text" icon={<CloseOutlined />} onClick={() => remove(i)}
                                style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, padding: 0 }} />
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
const DistributionMedicalePage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore(s => s.themeMode);
    const user = useAuthStore(s => s.user);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(true);
    const [distributions, setDistributions] = useState<MedicalDistributionDTO[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const [photos, setPhotos] = useState<string[]>([]);
    const [docs, setDocs] = useState<string[]>([]);

    const [form] = Form.useForm();

    // Role checks
    const roles = user?.roles || [];
    const isPresident = roles.some((r: string) => ['PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'].includes(r));
    const isRespSante = roles.some((r: string) => ['RESP_SANTE', 'PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'].includes(r));

    const loadData = async () => {
        setLoading(true);
        try {
            let data: MedicalDistributionDTO[] = [];
            if (isPresident) {
                data = await santeService.getPendingDistributions().catch(() => []);
                const allData = user?.committeeId
                    ? await santeService.getDistributionsByCommittee(user.committeeId).catch(() => [])
                    : [];
                // Merge, deduplicate
                const map = new Map<string, MedicalDistributionDTO>();
                [...data, ...allData].forEach(d => { if (d.id) map.set(d.id, d); });
                data = Array.from(map.values());
            } else if (user?.committeeId) {
                data = await santeService.getDistributionsByCommittee(user.committeeId).catch(() => []);
            }
            setDistributions(data || []);
        } catch {
            messageApi.error('Impossible de charger les distributions médicales.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [user?.committeeId]);

    const handleCreate = async (values: any) => {
        if (!user?.committeeId) {
            messageApi.error('Comité introuvable.');
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
                photosUrls: photos.length > 0 ? photos : undefined,
                documentsUrls: docs.length > 0 ? docs : undefined,
            };
            await santeService.createDistribution(payload);
            messageApi.success('Demande soumise au Président pour validation !');
            setIsModalOpen(false);
            form.resetFields();
            setPhotos([]);
            setDocs([]);
            loadData();
        } catch {
            messageApi.error('Erreur lors de la soumission.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await santeService.approveDistribution(id, user?.fullName || '');
            messageApi.success('Distribution approuvée ! Visible dans Diffusion > Distribution Méd.');
            loadData();
        } catch { messageApi.error('Erreur approbation.'); }
    };

    const handleReject = async (id: string) => {
        try {
            await santeService.rejectDistribution(id, 'Rejeté par le Président');
            messageApi.success('Distribution rejetée.');
            loadData();
        } catch { messageApi.error('Erreur rejet.'); }
    };

    const handleMarkDistributed = async (id: string) => {
        try {
            await santeService.markDistributed(id);
            messageApi.success('Distribution marquée comme effectuée !');
            loadData();
        } catch { messageApi.error('Erreur lors de la mise à jour.'); }
    };

    // Filter
    const filtered = filterStatus === 'ALL' ? distributions : distributions.filter(d => d.status === filterStatus);
    const pendingCount = distributions.filter(d => d.status === 'PENDING').length;
    const approvedCount = distributions.filter(d => d.status === 'APPROVED').length;
    const totalCount = distributions.length;

    // Glass styles
    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.08)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(224,28,46,0.06)',
        overflow: 'hidden'
    };

    const columns: ColumnsType<MedicalDistributionDTO> = [
        {
            title: 'RESSOURCE',
            key: 'resource',
            width: 260,
            render: (_, r) => {
                const rt = RESOURCE_TYPES.find(t => t.value === r.resourceType);
                return (
                    <Space size={14}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 14,
                            background: CRC.redBgDark,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0
                        }}>
                            {rt?.icon || <BoxPlotOutlined />}
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 14, display: 'block' }}>{r.title}</Text>
                            <Tag style={{ borderRadius: 6, background: CRC.redBg, color: CRC.red, border: `1px solid ${CRC.redBorder}`, fontSize: 11 }}>
                                {rt?.label || r.resourceType}
                            </Tag>
                        </div>
                    </Space>
                );
            }
        },
        {
            title: 'DESTINATION',
            key: 'destination',
            render: (_, r) => (
                <div>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{r.destinationName || '—'}</Text>
                    {r.destinationType && (
                        <Tag style={{ borderRadius: 6, fontSize: 11 }} color={
                            r.destinationType === 'HOPITAL' ? 'blue' :
                            r.destinationType === 'MISSION' ? 'orange' :
                            r.destinationType === 'COMITE' ? 'purple' : 'default'
                        }>
                            {r.destinationType}
                        </Tag>
                    )}
                    {r.destinationAddress && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                            <EnvironmentOutlined style={{ marginRight: 3 }} />{r.destinationAddress}
                        </Text>
                    )}
                </div>
            )
        },
        {
            title: 'QUANTITÉ',
            key: 'qty',
            width: 100,
            render: (_, r) => (
                <Text strong style={{ color: CRC.red, fontSize: 15 }}>
                    {r.quantity || '—'} <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>{r.unit || 'u.'}</Text>
                </Text>
            )
        },
        {
            title: 'DEMANDÉ PAR',
            key: 'requestedBy',
            width: 150,
            render: (_, r) => (
                <div>
                    <Text style={{ fontSize: 13 }}>{r.requestedByName || '—'}</Text>
                    {r.requestedAt && (
                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                            {new Date(r.requestedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </Text>
                    )}
                </div>
            )
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            width: 180,
            render: (s) => {
                const cfg = STATUS_CONFIG[s] || STATUS_CONFIG.PENDING;
                return (
                    <Tag icon={cfg.icon} color={cfg.color} style={{ borderRadius: 8, padding: '3px 12px', fontWeight: 600, fontSize: 12 }}>
                        {cfg.label}
                    </Tag>
                );
            }
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            width: 220,
            render: (_, r) => {
                if (isPresident && r.status === 'PENDING') {
                    return (
                        <Space>
                            <Button size="small" type="primary" icon={<CheckOutlined />}
                                onClick={() => r.id && handleApprove(r.id)}
                                style={{ background: CRC.green, borderColor: CRC.green, borderRadius: 8 }}>
                                Approuver
                            </Button>
                            <Button size="small" danger icon={<StopOutlined />}
                                onClick={() => r.id && handleReject(r.id)}
                                style={{ borderRadius: 8 }}>
                                Rejeter
                            </Button>
                        </Space>
                    );
                }
                if (isPresident && r.status === 'APPROVED') {
                    return (
                        <Button size="small" icon={<CarOutlined />}
                            onClick={() => r.id && handleMarkDistributed(r.id)}
                            style={{ borderRadius: 8, borderColor: '#0891b2', color: '#0891b2' }}>
                            Marquer Distribué
                        </Button>
                    );
                }
                if (r.status === 'REJECTED' && r.rejectionReason) {
                    return <Text type="secondary" style={{ fontSize: 11 }}>❌ {r.rejectionReason}</Text>;
                }
                return null;
            }
        }
    ];

    if (loading) return (
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
            <Spin size="large" />
            <Text type="secondary">Chargement des distributions médicales...</Text>
        </div>
    );

    return (
        <div style={{ padding: '0 24px 40px 24px', maxWidth: 1400, margin: '0 auto' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div style={glassStyle}>
                    <Row>
                        {/* SIDEBAR */}
                        <Col xs={24} lg={5} style={{
                            borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.08)'}`,
                            background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,250,250,0.6)',
                            padding: '36px 24px'
                        }}>
                            <div style={{ position: 'sticky', top: 40 }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
                                        <MedicineBoxOutlined />
                                    <div>
                                        <Title level={4} style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Distribution</Title>
                                        <Text type="secondary" style={{ fontSize: 12 }}>Ressources Médicales</Text>
                                    </div>
                                </div>

                                {/* Stats */}
                                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                    {[
                                        { label: 'Total demandes', value: totalCount, icon: <FileTextOutlined />, color: CRC.red },
                                        { label: 'En attente', value: pendingCount, icon: <ClockCircleOutlined />, color: '#ea580c' },
                                        { label: 'Approuvées', value: approvedCount, icon: <CheckCircleOutlined />, color: '#16a34a' },
                                    ].map((s, i) => (
                                        <div key={i} style={{ padding: '14px 16px', borderRadius: 16, background: isDark ? CRC.redBgDark : '#fff', border: `1px solid ${CRC.redBorder}` }}>
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', display: 'block' }}>
                                                {s.icon} {s.label}
                                            </Text>
                                            <Title level={4} style={{ margin: '4px 0 0', fontWeight: 800, color: s.color }}>
                                                {s.value}
                                                {s.label === 'En attente' && s.value > 0 && isPresident && (
                                                    <Badge count={s.value} color={CRC.red} style={{ marginLeft: 8 }} />
                                                )}
                                            </Title>
                                        </div>
                                    ))}
                                </Space>

                                {/* CTA */}
                                {isRespSante && (
                                    <Button
                                        type="primary" block icon={<PlusOutlined />}
                                        onClick={() => setIsModalOpen(true)}
                                        style={{ marginTop: 20, height: 50, borderRadius: 14, background: CRC.gradient, border: 'none', fontWeight: 700, fontSize: 14, boxShadow: '0 6px 20px rgba(224,28,46,0.3)' }}
                                    >
                                        Nouvelle Demande
                                    </Button>
                                )}

                                {/* Info box */}
                                {isPresident && pendingCount > 0 && (
                                    <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 14, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                                        <Space>
                                            <ExclamationCircleOutlined style={{ color: '#ca8a04' }} />
                                            <Text style={{ color: '#ca8a04', fontSize: 12, fontWeight: 600 }}>
                                                {pendingCount} demande(s) attendent votre approbation
                                            </Text>
                                        </Space>
                                    </div>
                                )}

                                {/* Info workflow */}
                                <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 14, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}>
                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', lineHeight: 1.8 }}>
                                        <FileTextOutlined /> <Text strong>Workflow :</Text><br />
                                        1. RESP_SANTE crée une demande<br />
                                        2. Président approuve ou rejette<br />
                                        3. Ressource visible dans Diffusion
                                    </Text>
                                </div>
                            </div>
                        </Col>

                        {/* CONTENT */}
                        <Col xs={24} lg={19} style={{ padding: '36px 40px' }}>
                            {/* Toolbar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <Title level={4} style={{ margin: 0, fontWeight: 800, fontSize: 20 }}>
                                        {isPresident ? <><CheckCircleOutlined /> Validation des Demandes</> : <><BoxPlotOutlined /> Mes Demandes de Distribution</>}
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        {isPresident ? 'Approuvez ou rejetez les demandes de votre comité' : 'Gérez vos demandes de ressources médicales'}
                                    </Text>
                                </div>
                                <Space>
                                    <Select
                                        value={filterStatus}
                                        onChange={setFilterStatus}
                                        style={{ width: 160, borderRadius: 10 }}
                                        size="middle"
                                    >
                                        <Option value="ALL"><GlobalOutlined /> Tous les statuts</Option>
                                        <Option value="PENDING"><ClockCircleOutlined /> En attente</Option>
                                        <Option value="APPROVED"><CheckCircleOutlined /> Approuvé</Option>
                                        <Option value="REJECTED"><CloseOutlined /> Rejeté</Option>
                                        <Option value="DISTRIBUTED"><BoxPlotOutlined /> Distribué</Option>
                                    </Select>
                                    <Button icon={<FilterOutlined />} style={{ borderRadius: 10, height: 36, borderColor: CRC.redBorder }} />
                                </Space>
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.div key={filterStatus} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
                                    <Table<MedicalDistributionDTO>
                                        columns={columns}
                                        dataSource={filtered}
                                        rowKey="id"
                                        scroll={{ x: 900 }}
                                        pagination={{ pageSize: 10, hideOnSinglePage: true }}
                                        className="premium-table"
                                        rowClassName={(r) => r.status === 'PENDING' && isPresident ? 'row-urgent' : ''}
                                        locale={{
                                            emptyText: (
                                                <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                                    <div style={{ fontSize: 52, marginBottom: 12, color: CRC.redBorder }}><BoxPlotOutlined /></div>
                                                    <Title level={5} style={{ color: CRC.red }}>Aucune demande de distribution</Title>
                                                    <Text type="secondary">
                                                        {isRespSante ? 'Cliquez sur "Nouvelle Demande" pour soumettre une demande au Président.' : 'Aucune distribution enregistrée.'}
                                                    </Text>
                                                </div>
                                            )
                                        }}
                                    />
                                </motion.div>
                            </AnimatePresence>
                        </Col>
                    </Row>
                </div>
            </motion.div>

            {/* ======================================================= */}
            {/* MODAL: Nouvelle Demande */}
            {/* ======================================================= */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: CRC.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <SendOutlined />
                        </div>
                        <Text strong style={{ fontSize: 18 }}>Nouvelle Demande de Distribution Médicale</Text>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setPhotos([]); setDocs([]); }}
                footer={null}
                width={720}
                centered
                styles={{ content: { borderRadius: 24, padding: 28 } }}
            >
                {/* Info banner */}
                <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 12, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                    <Text style={{ color: '#ca8a04', fontSize: 13 }}>
                        <ClockCircleOutlined style={{ marginRight: 6 }} />
                        Cette demande sera soumise au <Text strong style={{ color: '#ca8a04' }}>Président de votre comité</Text> pour validation. Une fois approuvée, la ressource sera visible dans la page <Text strong style={{ color: '#ca8a04' }}>Diffusion</Text>.
                    </Text>
                </div>

                <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}><FileTextOutlined style={{ marginRight: 6 }} /> Ressource à distribuer</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="resourceType" label="Type de ressource" rules={[{ required: true }]}>
                                <Select size="large" placeholder="Sélectionner">
                                    {RESOURCE_TYPES.map(t => (
                                        <Option key={t.value} value={t.value}>{t.label}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="title" label="Titre de la demande" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: Kits premiers soins urgence Sfax" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description détaillée">
                        <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détails sur les ressources et leur utilisation prévue..." />
                    </Form.Item>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}><EnvironmentOutlined style={{ marginRight: 6 }} /> Destination</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col xs={24} sm={8}>
                            <Form.Item name="destinationType" label="Type" rules={[{ required: true }]}>
                                <Select size="large">
                                    <Option value="HOPITAL"><MedicineBoxOutlined /> Hôpital</Option>
                                    <Option value="ASSOCIATION"><GlobalOutlined /> Association</Option>
                                    <Option value="MISSION"><CarOutlined /> Mission Terrain</Option>
                                    <Option value="COMITE"><GlobalOutlined /> Comité</Option>
                                    <Option value="BENEFICIAIRE"><EnvironmentOutlined /> Bénéficiaire</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="destinationName" label="Nom" rules={[{ required: true }]}>
                                <Input size="large" placeholder="Ex: CHR Sfax" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} sm={8}>
                            <Form.Item name="destinationAddress" label="Adresse (optionnel)">
                                <Input size="large" prefix={<EnvironmentOutlined style={{ color: CRC.red }} />} placeholder="Adresse" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Quantité" rules={[{ required: true }]}>
                                <InputNumber size="large" min={1} style={{ width: '100%', borderRadius: 12 }} placeholder="Ex: 50" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="unit" label="Unité de mesure">
                                <Input size="large" placeholder="Ex: boîtes, unités, kg, L, poches" style={{ borderRadius: 12 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" orientationMargin={0} style={{ color: CRC.red, borderColor: CRC.redBorder }}>
                        <Text style={{ color: CRC.red, fontWeight: 700, fontSize: 13 }}><FileTextOutlined style={{ marginRight: 6 }} /> Preuves & Justificatifs</Text>
                    </Divider>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item label="Photos">
                                <FileUploadZone label="Ajouter des photos" accept="image/*" multiple icon={<CameraOutlined />} onFilesChange={setPhotos} preview={photos} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Documents (PDF, Word)">
                                <FileUploadZone label="Ajouter documents" accept=".pdf,.doc,.docx,.xlsx" multiple icon={<FileTextOutlined />} onFilesChange={setDocs} preview={docs} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="notes" label="Notes additionnelles">
                        <TextArea rows={2} style={{ borderRadius: 12 }} placeholder="Informations supplémentaires pour le Président..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
                        <Button onClick={() => setIsModalOpen(false)} style={{ height: 46, borderRadius: 12 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading}
                            style={{ height: 46, borderRadius: 12, background: CRC.gradient, border: 'none', paddingLeft: 32, paddingRight: 32 }}>
                            <SendOutlined /> Soumettre pour validation
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default DistributionMedicalePage;
