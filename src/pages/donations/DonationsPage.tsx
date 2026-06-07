// ============================================================
// NEXUS-AID — Donations Page
// Donation tracking, Needs validation, KPIs
// ============================================================

import { useState } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Select, Typography, Space,
    Statistic, Button, Avatar, Tabs, Modal, Form, message, Badge, Tooltip,
    Radio, Divider, InputNumber, Image, Upload
} from 'antd';
import {
    GiftOutlined, SearchOutlined, FilterOutlined, PlusOutlined,
    DownloadOutlined, CheckCircleOutlined, ClockCircleOutlined, FilePdfOutlined,
    DollarOutlined, UserOutlined, StopOutlined, AppstoreAddOutlined,
    PlusCircleOutlined, DeleteOutlined, ReconciliationOutlined, CameraOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminDonationService } from '@/services/adminDonationService';
import type { AdminDonationNeed } from '@/services/adminDonationService';
import { donationService } from '@/services/donationService';
import type { DonationReceipt } from '@/services/donationService';
import { useAuthStore } from '@/stores/authStore';

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusCfg: Record<string, { color: string, text: string, icon: React.ReactNode }> = {
    PENDING_VALIDATION: { color: 'orange', text: 'En attente', icon: <ClockCircleOutlined /> },
    VALIDATED: { color: 'blue', text: 'Validé', icon: <CheckCircleOutlined /> },
    REJECTED: { color: 'red', text: 'Rejeté', icon: <StopOutlined /> },
    FULFILLED: { color: 'green', text: 'Atteint', icon: <GiftOutlined /> },
    CANCELLED: { color: 'default', text: 'Annulé', icon: <StopOutlined /> },
};

// Translate backend categories to French display
const categoryDisplay: Record<string, string> = {
    FOOD: 'Alimentaire',
    MEDICAL: 'Médical',
    CLOTHING: 'Vêtements',
    SHELTER: 'Abris / Logement',
    FINANCIAL: 'Soutien Financier',
    OTHER: 'Autre équipement',
};

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'doxmfj1cw';
const CLOUDINARY_UPLOAD_PRESET = 'exus_aid_preset';

interface ItemPhotoUploaderProps {
    value?: string;
    onChange?: (value: string) => void;
}

const ItemPhotoUploader: React.FC<ItemPhotoUploaderProps> = ({ value, onChange }) => {
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (info: any) => {
        const file = info.file;
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            message.error('Seuls JPG/PNG/WEBP acceptés.');
            return false;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { 
                method: 'POST', 
                body: formData 
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            if (onChange) {
                onChange(data.secure_url);
            }
            message.success('Image téléversée avec succès !');
        } catch (e: any) {
            message.error(`Échec de l'upload: ${e.message}`);
        } finally {
            setUploading(false);
        }
        return false;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
            <Input 
                value={value} 
                onChange={(e) => onChange?.(e.target.value)} 
                placeholder="Ex: https://..." 
                style={{ flex: 1 }}
                allowClear
            />
            <Upload
                accept="image/*"
                showUploadList={false}
                beforeUpload={(file) => { handleUpload({ file }); return false; }}
            >
                <Button 
                    icon={uploading ? <LoadingOutlined spin /> : <CameraOutlined />} 
                    loading={uploading}
                    title="Uploader une photo"
                />
            </Upload>
            {value && (
                <Image
                    src={value}
                    alt="preview"
                    width={32}
                    height={32}
                    style={{ borderRadius: 4, objectFit: 'cover', border: '1px solid #d9d9d9', flexShrink: 0 }}
                    preview={{ mask: null }}
                />
            )}
        </div>
    );
};

const DonationsPage: React.FC = () => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    
    // Auth roles
    const isPresident = (user?.roles as string[])?.includes('PRESIDENT') || 
                        (user?.roles as string[])?.includes('PRESIDENT_LOCAL') || 
                        (user?.roles as string[])?.includes('PRESIDENT_REGIONAL') || 
                        (user?.roles as string[])?.includes('PRESIDENT_NATIONAL') || 
                        (user?.roles as string[])?.includes('VICE_PRESIDENT') || 
                        (user?.roles as string[])?.includes('VICE_PRESIDENT_LOCAL') || 
                        (user?.roles as string[])?.includes('VICE_PRESIDENT_REGIONAL') || 
                        (user?.roles as string[])?.includes('VICE_PRESIDENT_NATIONAL') || 
                        (user?.roles as string[])?.includes('ADMIN');

    const isResponsible = (user?.roles as string[])?.includes('RESP_CATASTROPHES') || 
                          (user?.roles as string[])?.includes('RESP_ACTION_SOCIALE') || 
                          (user?.roles as string[])?.includes('RESP_SANTE');

    const canRegisterDonations = isPresident || 
                                 (user?.roles as string[])?.includes('RESP_CATASTROPHES') || 
                                 (user?.roles as string[])?.includes('RESP_ACTION_SOCIALE');

    // State
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [viewType, setViewType] = useState<'pending' | 'committee'>('pending');
    
    const [isCreateNeedModalVisible, setIsCreateNeedModalVisible] = useState(false);
    const [isRegisterDonationVisible, setIsRegisterDonationVisible] = useState(false);
    const [successReceipt, setSuccessReceipt] = useState<any | null>(null);
    
    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [selectedNeed, setSelectedNeed] = useState<AdminDonationNeed | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    
    const [form] = Form.useForm();
    const [donationForm] = Form.useForm();
    const [donationType, setDonationType] = useState<'monetary' | 'inkind'>('inkind');

    // Queries
    const { data: stats } = useQuery({
        queryKey: ['adminDonationStats'],
        queryFn: () => adminDonationService.getStats(),
        enabled: isPresident,
    });

    const { data: needsData, isLoading: isLoadingNeeds } = useQuery({
        queryKey: ['donationNeeds', isPresident ? viewType : 'my'],
        queryFn: async (): Promise<AdminDonationNeed[]> => {
            if (isPresident) {
                if (viewType === 'pending') {
                    const res = await adminDonationService.getPendingNeeds(0, 100);
                    return res.content;
                } else {
                    const res = await adminDonationService.getCommitteeNeeds(0, 100);
                    return res.content;
                }
            } else {
                return await adminDonationService.getMyCreatedNeeds();
            }
        }
    });

    const { data: activeNeeds } = useQuery({
        queryKey: ['activePublicNeeds'],
        queryFn: () => adminDonationService.getActivePublicNeeds(),
    });

    const { data: receiptsData, isLoading: isLoadingReceipts } = useQuery({
        queryKey: ['donationReceipts', user?.committeeId],
        queryFn: () => user?.committeeId ? donationService.getCommitteeDonations(user.committeeId) : Promise.resolve([]),
        enabled: !!user?.committeeId,
    });

    // Mutations
    const validateNeedMutation = useMutation({
        mutationFn: ({ id, approve, reason }: { id: string, approve: boolean, reason?: string }) => 
            adminDonationService.validateNeed(id, { 
                action: approve ? 'VALIDATE' : 'REJECT', 
                reason, 
                validatorName: user?.fullName || 'Président/VP' 
            }),
        onSuccess: () => {
            message.success('Statut du besoin mis à jour');
            queryClient.invalidateQueries({ queryKey: ['donationNeeds'] });
            queryClient.invalidateQueries({ queryKey: ['adminDonationStats'] });
            setRejectModalVisible(false);
            setRejectReason('');
        },
        onError: () => message.error('Erreur lors de la mise à jour')
    });

    const createNeedMutation = useMutation({
        mutationFn: (values: any) => {
            const req = {
                ...values,
                committeeId: user?.committeeId || '',
                committeeName: user?.committeeName || 'Mon Comité',
                committeeType: user?.rawRoles?.[0]?.committeeType || 'LOCAL',
            };
            return adminDonationService.createNeed(req);
        },
        onSuccess: () => {
            message.success('Besoin créé avec succès !');
            setIsCreateNeedModalVisible(false);
            form.resetFields();
            queryClient.invalidateQueries({ queryKey: ['donationNeeds'] });
        },
        onError: () => message.error('Erreur lors de la création du besoin')
    });

    const registerDonationMutation = useMutation({
        mutationFn: async (values: any) => {
            // Serialize items array to JSON
            const itemsJson = JSON.stringify(values.items || []);
            return await adminDonationService.processInKindDonation({
                donorName: values.donorName,
                donorEmail: values.donorEmail || undefined,
                donorCin: values.donorCin || undefined,
                needId: values.needId || undefined,
                itemsDescription: itemsJson,
            });
        },
        onSuccess: (data) => {
            message.success('Don enregistré avec succès !');
            setIsRegisterDonationVisible(false);
            donationForm.resetFields();
            setDonationType('inkind');
            setSuccessReceipt(data);
            queryClient.invalidateQueries({ queryKey: ['donationReceipts'] });
            queryClient.invalidateQueries({ queryKey: ['donationNeeds'] });
            queryClient.invalidateQueries({ queryKey: ['adminDonationStats'] });
        },
        onError: () => message.error("Erreur lors de l'enregistrement du don")
    });

    // Filtering
    const needsList = needsData || [];
    const filteredNeeds = needsList.filter((n: AdminDonationNeed) => {
        const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
        const matchStatus = !statusFilter || n.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const receiptsList = receiptsData || [];

    // Columns - Needs
    const needColumns: ColumnsType<AdminDonationNeed> = [
        {
            title: 'Titre',
            dataIndex: 'title',
            key: 'title',
            render: (title: string, r) => (
                <Space>
                    <Avatar style={{ backgroundColor: '#e01c2e' }} size={32}>
                        <AppstoreAddOutlined />
                    </Avatar>
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{title}</Text>
                        <div><Text style={{ fontSize: 11, color: '#999' }}>{r.committeeName} • {categoryDisplay[r.category] || r.category}</Text></div>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Objectif',
            key: 'target',
            render: (_, r) => (
                <Text strong style={{ fontSize: 14 }}>
                    {r.targetAmount ? `${r.targetAmount.toLocaleString('fr-FR')} TND` : `${r.targetQuantity} unités`}
                </Text>
            ),
        },
        {
            title: 'Progression',
            key: 'progress',
            render: (_, r) => {
                const current = r.targetAmount ? r.currentAmount : r.currentQuantity;
                const target = r.targetAmount || r.targetQuantity || 1;
                const percent = Math.min(100, Math.round(((current || 0) / target) * 100));
                return <Text style={{ color: percent >= 100 ? '#16a34a' : '#333', fontWeight: 'bold' }}>{percent}%</Text>;
            }
        },
        {
            title: 'Créé par',
            dataIndex: 'creatorName',
            key: 'creatorName',
            render: (creator: string, r) => (
                <div>
                    <Text>{creator}</Text>
                    <div><Text style={{ fontSize: 11, color: '#999' }}>{r.creatorRoleName}</Text></div>
                </div>
            )
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (s: string) => {
                const cfg = statusCfg[s] || { color: 'default', text: s, icon: null };
                return <Tag icon={cfg.icon} color={cfg.color} bordered={false}>{cfg.text}</Tag>;
            },
        },
        {
            title: 'Raison (si rejeté)',
            dataIndex: 'rejectionReason',
            key: 'reason',
            render: (text) => text ? <Tooltip title={text}><Text style={{ color: '#ef4444', fontSize: 12, maxWidth: 150 }} ellipsis>{text}</Text></Tooltip> : <Text type="secondary">—</Text>
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 120,
            render: (_, r) => (
                <Space>
                    {isPresident && r.status === 'PENDING_VALIDATION' && (
                        <>
                            <Tooltip title="Valider">
                                <Button 
                                    type="primary" 
                                    size="small" 
                                    icon={<CheckCircleOutlined />} 
                                    style={{ background: '#10b981', borderColor: '#10b981' }}
                                    onClick={() => validateNeedMutation.mutate({ id: r.id, approve: true })}
                                />
                            </Tooltip>
                            <Tooltip title="Rejeter">
                                <Button 
                                    type="primary" 
                                    danger 
                                    size="small" 
                                    icon={<StopOutlined />}
                                    onClick={() => { setSelectedNeed(r); setRejectModalVisible(true); }}
                                />
                            </Tooltip>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    // Columns - Receipts
    const receiptColumns: ColumnsType<DonationReceipt> = [
        {
            title: 'N° Reçu',
            dataIndex: 'receiptNumber',
            key: 'receiptNumber',
            render: (num) => <Text strong>{num || '—'}</Text>
        },
        {
            title: 'Donation',
            dataIndex: 'donationType',
            key: 'type',
            render: (type) => <Tag color={type === 'MONETARY' ? 'green' : 'blue'}>{type === 'MONETARY' ? 'MONÉTAIRE' : 'EN NATURE'}</Tag>
        },
        {
            title: 'Comité',
            dataIndex: 'committeeName',
            key: 'committee'
        },
        {
            title: 'Détails / Description',
            dataIndex: 'description',
            key: 'desc',
            render: (text, record) => {
                if (record.donationType === 'INKIND' || record.donationType === 'IN_KIND') {
                    try {
                        const items = JSON.parse(text || '[]');
                        if (!Array.isArray(items)) {
                            return <Text>{text}</Text>;
                        }
                        return (
                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                {items.map((i: any, idx: number) => (
                                    <div 
                                        key={idx} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '10px', 
                                            padding: '4px 8px', 
                                            borderRadius: '6px', 
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #f3f4f6'
                                        }}
                                    >
                                        {i.photoUrl ? (
                                            <Image 
                                                src={i.photoUrl} 
                                                alt={i.item} 
                                                width={40} 
                                                height={40} 
                                                fallback="https://placehold.co/100x100?text=Pas+d'image"
                                                style={{ borderRadius: '4px', objectFit: 'cover', border: '1px solid #e5e7eb' }} 
                                            />
                                        ) : (
                                            <Avatar size={40} shape="square" icon={<GiftOutlined />} style={{ background: '#eff6ff', color: '#3b82f6', borderRadius: '4px' }} />
                                        )}
                                        <div style={{ flex: 1, lineHeight: '1.3' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                <Text strong style={{ fontSize: 13, color: '#1f2937' }}>{i.item}</Text>
                                                <Tag color="blue" bordered={false} style={{ fontSize: 11, padding: '0 4px', margin: 0, height: '18px', display: 'inline-flex', alignItems: 'center' }}>
                                                    {i.quantity} {i.unit}
                                                </Tag>
                                            </div>
                                            {i.note && (
                                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: '2px', fontStyle: 'italic' }}>
                                                    Note: {i.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </Space>
                        );
                    } catch {
                        return <Text>{text}</Text>;
                    }
                }
                return <Text>{text}</Text>;
            }
        },
        {
            title: 'Montant / Quantité',
            key: 'amountQty',
            render: (_, r) => {
                if (r.donationType === 'MONETARY') {
                    return `${r.description || '0'} TND`;
                }
                try {
                    const items = JSON.parse(r.description || '[]');
                    if (Array.isArray(items)) {
                        const totalQty = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
                        const uniqueUnits = Array.from(new Set(items.map((item: any) => item.unit).filter(Boolean)));
                        const unitStr = uniqueUnits.length === 1 ? ` ${uniqueUnits[0]}` : ' art.';
                        return <Text strong>{totalQty}{unitStr}</Text>;
                    }
                } catch {}
                return r.quantity || '—';
            }
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'date',
            render: (d) => new Date(d).toLocaleDateString('fr-FR')
        },
        {
            title: 'Action',
            key: 'actions',
            render: (_, r) => (
                <Button 
                    type="text" 
                    icon={<DownloadOutlined style={{ color: '#e01c2e' }} />} 
                    size="small" 
                    onClick={() => {
                        if (r.receiptNumber) {
                            adminDonationService.downloadReceiptPdf(r.receiptNumber)
                                .catch(() => message.error('Erreur lors du téléchargement du PDF'));
                        }
                    }}
                >
                    Reçu PDF
                </Button>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">{t('nav.donations', 'Gestion des Dons')}</Title>
                    <Text type="secondary">Gérez les besoins du comité, validez les propositions et suivez les dons</Text>
                </div>
                <Space>
                    {canRegisterDonations && (
                        <Button 
                            type="primary" 
                            icon={<PlusCircleOutlined />} 
                            style={{ background: '#10b981', borderColor: '#10b981' }} 
                            onClick={() => setIsRegisterDonationVisible(true)}
                        >
                            Enregistrer un Don
                        </Button>
                    )}
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: '#e01c2e', borderColor: '#e01c2e' }} onClick={() => setIsCreateNeedModalVisible(true)}>
                        Déclarer un Besoin
                    </Button>
                </Space>
            </div>

            {/* Stats */}
            {isPresident && stats && (
                <Row gutter={[12, 12]} className="mb-5">
                    {[
                        { title: 'Besoins Validés', value: stats.validatedNeeds || 0, icon: <AppstoreAddOutlined />, color: '#6366f1' },
                        { title: 'Total Collecté', value: stats.totalMonetaryReceived || 0, suffix: ' TND', icon: <DollarOutlined />, color: '#16a34a' },
                        { title: 'Besoins Atteints', value: stats.fulfilledNeeds || 0, icon: <GiftOutlined />, color: '#e01c2e' },
                        { title: 'En attente de validation', value: stats.pendingNeeds || 0, icon: <ClockCircleOutlined />, color: '#f59e0b' },
                    ].map((s) => (
                        <Col xs={12} md={6} key={s.title}>
                            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
                                <div className="flex items-center gap-3">
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 16 }}>
                                        {s.icon}
                                    </div>
                                    <Statistic title={s.title} value={s.value} suffix={s.suffix} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                                </div>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            <Card styles={{ body: { padding: '0 20px 20px 20px' } }}>
                <Tabs 
                    defaultActiveKey="1" 
                    items={[
                        {
                            key: '1',
                            label: (
                                <span className="flex items-center gap-2 py-3">
                                    <AppstoreAddOutlined /> Besoins de Dons
                                    {isPresident && <Badge count={needsList.filter(n => n.status === 'PENDING_VALIDATION').length} style={{ backgroundColor: '#f59e0b' }} />}
                                </span>
                            ),
                            children: (
                                <>
                                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 mt-2">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <Input prefix={<SearchOutlined style={{ color: '#bbb' }} />} placeholder="Rechercher un besoin..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 260 }} allowClear />
                                            <Select placeholder="Statut" allowClear style={{ width: 180 }} value={statusFilter} onChange={setStatusFilter} suffixIcon={<FilterOutlined />}
                                                options={[
                                                    { value: 'PENDING_VALIDATION', label: <Space><ClockCircleOutlined style={{ color: '#f59e0b' }} />En attente</Space> },
                                                    { value: 'VALIDATED', label: <Space><CheckCircleOutlined style={{ color: '#1890ff' }} />Validé</Space> },
                                                    { value: 'FULFILLED', label: <Space><GiftOutlined style={{ color: '#16a34a' }} />Atteint</Space> },
                                                    { value: 'REJECTED', label: <Space><StopOutlined style={{ color: '#e01c2e' }} />Rejeté</Space> },
                                                ]}
                                            />
                                        </div>
                                        {isPresident && (
                                            <Radio.Group value={viewType} onChange={e => setViewType(e.target.value)}>
                                                <Radio.Button value="pending">En attente de validation</Radio.Button>
                                                <Radio.Button value="committee">Tous les besoins du comité</Radio.Button>
                                            </Radio.Group>
                                        )}
                                    </div>
                                    <Table 
                                        columns={needColumns} 
                                        dataSource={filteredNeeds} 
                                        rowKey="id"
                                        loading={isLoadingNeeds}
                                        pagination={{ pageSize: 10 }} 
                                        size="middle" 
                                        scroll={{ x: 800 }} 
                                    />
                                </>
                            )
                        },
                        {
                            key: '2',
                            label: (
                                <span className="flex items-center gap-2 py-3">
                                    <GiftOutlined /> Historique des Dons du Comité
                                </span>
                            ),
                            children: (
                                <Table 
                                    columns={receiptColumns} 
                                    dataSource={receiptsList} 
                                    rowKey="donationId"
                                    loading={isLoadingReceipts}
                                    pagination={{ pageSize: 10 }} 
                                    size="middle" 
                                    scroll={{ x: 800 }} 
                                    className="mt-2"
                                />
                            )
                        }
                    ]} 
                />
            </Card>

            {/* Modal: Create Need */}
            <Modal
                title="Déclarer un Nouveau Besoin de Don"
                open={isCreateNeedModalVisible}
                onCancel={() => setIsCreateNeedModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={createNeedMutation.isPending}
                okText="Soumettre pour validation"
                cancelText="Annuler"
            >
                <Form form={form} layout="vertical" onFinish={(values) => createNeedMutation.mutate(values)}>
                    <Form.Item name="title" label="Titre du besoin" rules={[{ required: true, message: 'Requis' }]}>
                        <Input placeholder="Ex: 50 Couvertures pour l'hiver" />
                    </Form.Item>
                    <Form.Item name="category" label="Catégorie" rules={[{ required: true, message: 'Requis' }]}>
                        <Select>
                            <Select.Option value="FOOD">Alimentaire</Select.Option>
                            <Select.Option value="MEDICAL">Médical</Select.Option>
                            <Select.Option value="CLOTHING">Vêtements / Habillement</Select.Option>
                            <Select.Option value="SHELTER">Abris / Logement</Select.Option>
                            <Select.Option value="FINANCIAL">Soutien Financier</Select.Option>
                            <Select.Option value="OTHER">Autre équipement</Select.Option>
                        </Select>
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="targetAmount" label="Montant cible (TND)">
                                <Input type="number" placeholder="Ex: 1000" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="targetQuantity" label="Quantité cible (Articles)">
                                <Input type="number" placeholder="Ex: 50" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Description détaillée" rules={[{ required: true }]}>
                        <TextArea rows={4} placeholder="Détaillez le besoin, les bénéficiaires cibles, etc." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal: Reject Need */}
            <Modal
                title="Rejeter le besoin"
                open={rejectModalVisible}
                onCancel={() => setRejectModalVisible(false)}
                onOk={() => validateNeedMutation.mutate({ id: selectedNeed?.id || '', approve: false, reason: rejectReason })}
                okButtonProps={{ danger: true }}
                okText="Confirmer le rejet"
            >
                <p>Veuillez indiquer la raison du rejet pour <strong>{selectedNeed?.title}</strong> :</p>
                <TextArea 
                    rows={4} 
                    value={rejectReason} 
                    onChange={e => setRejectReason(e.target.value)} 
                    placeholder="Ex: Doublon, budget déjà alloué, etc."
                />
            </Modal>

            {/* Modal: Register Donation */}
            <Modal
                title="Enregistrer la Réception d'un Don (Dons en Nature)"
                open={isRegisterDonationVisible}
                onCancel={() => setIsRegisterDonationVisible(false)}
                onOk={() => donationForm.submit()}
                confirmLoading={registerDonationMutation.isPending}
                okText="Enregistrer et générer le reçu"
                cancelText="Annuler"
                width={850}
            >
                <Form form={donationForm} layout="vertical" onFinish={(values) => registerDonationMutation.mutate(values)}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="donorName" label="Nom du donateur" rules={[{ required: true, message: 'Nom requis' }]}>
                                <Input placeholder="Nom complet" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="donorCin" label="CIN du donateur (Optionnel)">
                                <Input placeholder="Ex: 08877665" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="donorEmail" label="Adresse Email (Optionnel)" rules={[{ type: 'email', message: 'Email invalide' }]}>
                        <Input placeholder="Pour l'envoi du reçu fiscal" />
                    </Form.Item>

                    <Form.Item name="needId" label="Lier à un besoin de don du comité (Optionnel)">
                        <Select placeholder="Sélectionnez un besoin de don" allowClear>
                            {activeNeeds?.map((n) => (
                                <Select.Option key={n.id} value={n.id}>
                                    {n.title} ({n.committeeName})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Divider style={{ margin: '16px 0' }} />

                    <div>
                        <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 15 }}>Articles reçus :</Text>
                        <Form.List name="items" initialValue={[{ item: '', quantity: 1, unit: '' }]}>
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.length > 0 && (
                                        <Row gutter={6} style={{ marginBottom: 6, paddingLeft: 4 }}>
                                            <Col span={6}><Text type="secondary" strong style={{ fontSize: 12 }}>Article</Text></Col>
                                            <Col span={3}><Text type="secondary" strong style={{ fontSize: 12 }}>Qté</Text></Col>
                                            <Col span={3}><Text type="secondary" strong style={{ fontSize: 12 }}>Unité</Text></Col>
                                            <Col span={5}><Text type="secondary" strong style={{ fontSize: 12 }}>Photo / Image</Text></Col>
                                            <Col span={5}><Text type="secondary" strong style={{ fontSize: 12 }}>Remarques</Text></Col>
                                            <Col span={2}></Col>
                                        </Row>
                                    )}
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Row key={key} gutter={6} align="middle" style={{ marginBottom: 8 }}>
                                            <Col span={6}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'item']}
                                                    rules={[{ required: true, message: 'Nom article requis' }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Input placeholder="Couvertures, lait, riz..." />
                                                </Form.Item>
                                            </Col>
                                            <Col span={3}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'quantity']}
                                                    rules={[{ required: true, message: 'Requis' }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <InputNumber min={1} placeholder="Qté" style={{ width: '100%' }} />
                                                </Form.Item>
                                            </Col>
                                            <Col span={3}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'unit']}
                                                    rules={[{ required: true, message: 'Requis' }]}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Input placeholder="kg, boîtes..." />
                                                </Form.Item>
                                            </Col>
                                            <Col span={5}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'photoUrl']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <ItemPhotoUploader />
                                                </Form.Item>
                                            </Col>
                                            <Col span={5}>
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'note']}
                                                    style={{ marginBottom: 0 }}
                                                >
                                                    <Input placeholder="Ex: Neuf, date exp..." />
                                                </Form.Item>
                                            </Col>
                                            <Col span={2} style={{ textAlign: 'center' }}>
                                                <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} style={{ padding: 0 }} />
                                            </Col>
                                        </Row>
                                    ))}
                                    <Form.Item style={{ marginTop: 12 }}>
                                        <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                            Ajouter un article
                                        </Button>
                                    </Form.Item>
                                </>
                            )}
                        </Form.List>
                    </div>
                </Form>
            </Modal>

            {/* Modal: Success Receipt Confirmation */}
            <Modal
                title={
                    <Space style={{ color: '#10b981' }}>
                        <CheckCircleOutlined />
                        <span>Reçu fiscal généré !</span>
                    </Space>
                }
                open={successReceipt !== null}
                onCancel={() => setSuccessReceipt(null)}
                footer={[
                    <Button key="close" onClick={() => setSuccessReceipt(null)}>Fermer</Button>,
                    <Button 
                        key="download" 
                        type="primary" 
                        icon={<DownloadOutlined />}
                        style={{ background: '#10b981', borderColor: '#10b981' }}
                        onClick={() => {
                            if (successReceipt?.receiptNumber) {
                                adminDonationService.downloadReceiptPdf(successReceipt.receiptNumber)
                                    .catch(() => message.error('Erreur lors du téléchargement du PDF'));
                            }
                        }}
                    >
                        Télécharger le Reçu (PDF)
                    </Button>
                ]}
            >
                {successReceipt && (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                        <div style={{ marginBottom: 16 }}>
                            <ReconciliationOutlined style={{ fontSize: 48, color: '#10b981' }} />
                        </div>
                        <Title level={4}>{successReceipt.receiptNumber}</Title>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                            {successReceipt.message}
                        </Text>
                        
                        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px', margin: '12px 0', border: '1px dashed #d9d9d9', display: 'inline-block' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>
                                QR Data: {successReceipt.qrCodeData}
                            </div>
                        </div>
                        
                        <p style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
                            Le reçu a été archivé et envoyé par email au donateur si l'adresse a été spécifiée.
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DonationsPage;
