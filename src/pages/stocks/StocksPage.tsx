// ============================================================
// NEXUS-AID — Stocks Page (Inventory Management)
// Full CRUD, storage locations, bulk reception, advanced validations
// CRC Croissant Rouge Style (#e01c2e)
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Select, Typography, Space,
    Statistic, Button, message, Spin, Empty, Modal, InputNumber, Tabs,
    Drawer, Popconfirm, Form, Badge, Tooltip, Divider, App
} from 'antd';
import {
    InboxOutlined, SearchOutlined, FilterOutlined, PlusOutlined,
    DownloadOutlined, ExclamationCircleOutlined,
    ArrowUpOutlined, ArrowDownOutlined, AlertOutlined,
    EditOutlined, DeleteOutlined, HistoryOutlined, CheckCircleOutlined,
    ClockCircleOutlined, WarningOutlined, CameraOutlined, CloseOutlined,
    CheckOutlined, StopOutlined, AuditOutlined, InfoCircleOutlined,
    HomeOutlined, EnvironmentOutlined, PlusCircleOutlined, DeleteFilled,
    TagOutlined, SolutionOutlined, IdcardOutlined, SendOutlined,
    MedicineBoxOutlined, SkinOutlined, CoffeeOutlined, ToolOutlined,
    BankOutlined, KeyOutlined, DollarOutlined, HeartOutlined, StarOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore, useUIStore } from '@/stores';
import inventoryService from '@/services/inventoryService';
import type { InventoryItemDTO, StockMovementResponse, StockAlertDTO, StorageLocationDTO } from '@/types';
import LocationMapPicker, { type GpsLocation } from '../domains/catastrophes/LocationMapPicker';

const { Title, Text } = Typography;

// ============================================================
// CRC Color Palette (Croissant Rouge)
// ============================================================
const CRC = {
    red: '#e01c2e',
    redDark: '#c0152a',
    redLight: '#ff6b6b',
    redBg: '#fff5f5',
    redBgDark: 'rgba(224,28,46,0.08)',
    redBorder: 'rgba(224,28,46,0.2)',
    gradient: 'linear-gradient(135deg, #e01c2e, #c0152a)',
    gradientSoft: 'linear-gradient(135deg, rgba(224,28,46,0.1), rgba(192,21,42,0.05))',
    green: '#16a34a',
    orange: '#ea580c',
};

const categoryCfg: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    MEDICAL:     { color: 'red',    label: 'Médical', icon: <MedicineBoxOutlined /> },
    CLOTHING:    { color: 'blue',   label: 'Vêtements', icon: <SkinOutlined /> },
    FOOD:        { color: 'green',  label: 'Alimentaire', icon: <CoffeeOutlined /> },
    EQUIPMENT:   { color: 'purple', label: 'Équipement', icon: <ToolOutlined /> },
    RESCUE_GEAR: { color: 'error',  label: 'Secours', icon: <AlertOutlined /> },
};

const severityCfg: Record<string, { color: string }> = {
    LOW:      { color: 'default' },
    MEDIUM:   { color: 'warning' },
    HIGH:     { color: 'error' },
    CRITICAL: { color: 'error' },
};

const alertTypeCfg: Record<string, { label: string; icon: React.ReactNode }> = {
    EXPIRY:      { label: 'Expiration',  icon: <ClockCircleOutlined /> },
    MIN_STOCK:   { label: 'Stock Min',   icon: <WarningOutlined /> },
    TEMPERATURE: { label: 'Température', icon: <AlertOutlined /> },
};

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    PENDING: { color: 'warning', label: 'En attente', icon: <ClockCircleOutlined /> },
    APPROVED: { color: 'success', label: 'Approuvé', icon: <CheckCircleOutlined /> },
    REJECTED: { color: 'error', label: 'Rejeté', icon: <CloseOutlined /> },
};

const LOCATION_TYPES = [
    { value: 'ENTREPOT', label: 'Hangar / Entrepôt', color: 'blue', icon: <HomeOutlined /> },
    { value: 'PHARMACIE', label: 'Pharmacie / Médical', color: 'red', icon: <MedicineBoxOutlined /> },
    { value: 'BUREAU', label: 'Bureau / Local administratif', color: 'purple', icon: <BankOutlined /> },
    { value: 'AUTRE', label: 'Autre espace de stockage', color: 'default', icon: <InboxOutlined /> },
];

const ACQUISITION_TYPES = [
    { value: 'LOUE', label: 'Loué (Contrat)', color: 'default', icon: <KeyOutlined /> },
    { value: 'ACHETE', label: 'Acheté (Propriété)', color: 'success', icon: <DollarOutlined /> },
    { value: 'DON', label: 'Don d\'un bienfaiteur', color: 'error', icon: <HeartOutlined /> },
    { value: 'AUTRE', label: 'Autre mode', color: 'default', icon: <InboxOutlined /> },
];

const ITEM_CONDITIONS = [
    { value: 'NEUF', label: 'Neuf', color: 'success', icon: <CheckCircleOutlined /> },
    { value: 'BON_ETAT', label: 'Bon état', color: 'processing', icon: <CheckCircleOutlined /> },
    { value: 'USE', label: 'Usé', color: 'warning', icon: <WarningOutlined /> },
    { value: 'ENDOMMAGE', label: 'Endommagé', color: 'error', icon: <CloseCircleOutlined /> },
];

const StocksPage: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);
    const themeMode = useUIStore((s) => s.themeMode);
    const isDark = themeMode === 'dark';
    const { message: messageApi } = App.useApp();

    // --- Role Verification ---
    const roles = user?.roles || [];
    const isPresident = roles.some((r: string) => ['PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL', 'ADMIN'].includes(r));

    // --- Data State ---
    const [items, setItems] = useState<InventoryItemDTO[]>([]);
    const [locations, setLocations] = useState<StorageLocationDTO[]>([]);
    const [alerts, setAlerts] = useState<StockAlertDTO[]>([]);
    const [pendingMovements, setPendingMovements] = useState<StockMovementResponse[]>([]);
    const [allMovements, setAllMovements] = useState<StockMovementResponse[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [allMovementsLoading, setAllMovementsLoading] = useState(false);

    // --- Filters ---
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState<string | null>(null);
    const [locFilter, setLocFilter] = useState<string | null>(null);

    // --- Create / Edit Modal (Inventory Item) ---
    const [itemModal, setItemModal] = useState<{ open: boolean; editing: InventoryItemDTO | null }>({ open: false, editing: null });
    const [itemForm] = Form.useForm();
    const [itemSaving, setItemSaving] = useState(false);

    // --- Create / Edit Modal (Storage Location) ---
    const [locModal, setLocModal] = useState<{ open: boolean; editing: StorageLocationDTO | null }>({ open: false, editing: null });
    const [locForm] = Form.useForm();
    const [locSaving, setLocSaving] = useState(false);
    const [locPhoto, setLocPhoto] = useState<string>('');
    const locFileRef = useRef<HTMLInputElement>(null);

    // --- Movement Modal ---
    const [movementModal, setMovementModal] = useState<{ visible: boolean; type: 'in' | 'out'; item: InventoryItemDTO | null }>({ visible: false, type: 'in', item: null });
    const [movementQty, setMovementQty] = useState(1);
    const [movementReason, setMovementReason] = useState('');
    const [proofPhoto, setProofPhoto] = useState<string>('');
    const [itemCondition, setItemCondition] = useState<string>('BON_ETAT');
    const [supplier, setSupplier] = useState<string>('');
    const [receivedBy, setReceivedBy] = useState<string>(user?.fullName || '');
    const [recordedByName, setRecordedByName] = useState<string>(user?.fullName || '');
    const [movementLoading, setMovementLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Bulk Entry Modal ---
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkEntries, setBulkEntries] = useState<Array<{ itemId: string; quantity: number; reason: string }>>([{ itemId: '', quantity: 1, reason: '' }]);
    const [bulkProofPhoto, setBulkProofPhoto] = useState<string>('');
    const [bulkRecordedBy, setBulkRecordedBy] = useState<string>(user?.fullName || '');
    const [bulkReceivedBy, setBulkReceivedBy] = useState<string>(user?.fullName || '');
    const [bulkSupplier, setBulkSupplier] = useState<string>('');
    const [bulkSubmitLoading, setBulkSubmitLoading] = useState(false);
    const bulkFileRef = useRef<HTMLInputElement>(null);

    // --- History Drawer ---
    const [historyDrawer, setHistoryDrawer] = useState<{ open: boolean; item: InventoryItemDTO | null }>({ open: false, item: null });
    const [itemMovements, setItemMovements] = useState<StockMovementResponse[]>([]);
    const [itemMovementsLoading, setItemMovementsLoading] = useState(false);

    // --- Rejection Modal ---
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectSubmitLoading, setRejectSubmitLoading] = useState(false);

    // --- Photo Preview Modal ---
    const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

    // --- Active Tab ---
    const [activeTab, setActiveTab] = useState('inventory');

    // ======================== DATA FETCH ========================

    const fetchItems = useCallback(async () => {
        if (!user?.committeeId) { setLoading(false); return; }
        setLoading(true);
        try {
            const data = await inventoryService.getByCommittee(user.committeeId);
            setItems(data);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [user?.committeeId]);

    const fetchLocations = useCallback(async () => {
        if (!user?.committeeId) return;
        setLocationsLoading(true);
        try {
            const data = await inventoryService.getLocationsByCommittee(user.committeeId);
            setLocations(data);
        } catch {
            setLocations([]);
        } finally {
            setLocationsLoading(false);
        }
    }, [user?.committeeId]);

    const fetchAlerts = useCallback(async () => {
        setAlertsLoading(true);
        try {
            const data = await inventoryService.getAlerts();
            setAlerts(data);
        } catch {
            setAlerts([]);
        } finally {
            setAlertsLoading(false);
        }
    }, []);

    const fetchPendingMovements = useCallback(async () => {
        if (!user?.committeeId || !isPresident) return;
        setPendingLoading(true);
        try {
            const data = await inventoryService.getPendingMovements(user.committeeId);
            setPendingMovements(data);
        } catch {
            setPendingMovements([]);
        } finally {
            setPendingLoading(false);
        }
    }, [user?.committeeId, isPresident]);

    const fetchAllMovements = useCallback(async () => {
        if (!user?.committeeId) return;
        setAllMovementsLoading(true);
        try {
            const data = await inventoryService.getAllMovementsForCommittee(user.committeeId);
            setAllMovements(data);
        } catch {
            setAllMovements([]);
        } finally {
            setAllMovementsLoading(false);
        }
    }, [user?.committeeId]);

    useEffect(() => {
        fetchItems();
        fetchLocations();
        fetchAlerts();
        if (isPresident) {
            fetchPendingMovements();
        }
        fetchAllMovements();
    }, [fetchItems, fetchLocations, fetchAlerts, fetchPendingMovements, fetchAllMovements, isPresident]);

    // ======================== HANDLERS ========================

    const openCreateModal = () => {
        itemForm.resetFields();
        setItemModal({ open: true, editing: null });
    };

    const openEditModal = (item: InventoryItemDTO) => {
        itemForm.setFieldsValue({
            name: item.name,
            category: item.category,
            minThreshold: item.minThreshold,
            storageLocationId: item.storageLocationId,
            initialQuantity: 0,
        });
        setItemModal({ open: true, editing: item });
    };

    const handleItemSave = async () => {
        try {
            const values = await itemForm.validateFields();
            setItemSaving(true);
            if (itemModal.editing) {
                await inventoryService.update(itemModal.editing.id, {
                    name: values.name,
                    category: values.category,
                    minThreshold: values.minThreshold,
                    storageLocationId: values.storageLocationId || undefined,
                } as any);
                messageApi.success('Article mis à jour avec succès.');
            } else {
                await inventoryService.create({
                    name: values.name,
                    category: values.category,
                    initialQuantity: values.initialQuantity || 0,
                    minThreshold: values.minThreshold,
                    committeeId: user!.committeeId!,
                    storageLocationId: values.storageLocationId || undefined,
                } as any);
                messageApi.success('Article créé avec succès.');
            }
            setItemModal({ open: false, editing: null });
            fetchItems();
            fetchAllMovements();
        } catch {
            messageApi.error('Erreur lors de la sauvegarde.');
        } finally {
            setItemSaving(false);
        }
    };

    const handleDelete = async (item: InventoryItemDTO) => {
        try {
            await inventoryService.delete(item.id);
            messageApi.success(`"${item.name}" supprimé.`);
            fetchItems();
            fetchAllMovements();
        } catch {
            messageApi.error('Erreur lors de la suppression.');
        }
    };

    // --- Storage Location Handlers ---
    const openCreateLocModal = () => {
        locForm.resetFields();
        setLocPhoto('');
        setLocModal({ open: true, editing: null });
    };

    const openEditLocModal = (loc: StorageLocationDTO) => {
        locForm.setFieldsValue({
            name: loc.name,
            type: loc.type,
            acquisitionType: loc.acquisitionType,
            capacity: loc.capacity,
            status: loc.status || 'ACTIVE',
            locationPicker: {
                lat: loc.gpsLatitude ? String(loc.gpsLatitude) : '',
                lng: loc.gpsLongitude ? String(loc.gpsLongitude) : '',
                address: loc.address || ''
            }
        });
        setLocPhoto(loc.photo || '');
        setLocModal({ open: true, editing: loc });
    };

    const handleLocSave = async () => {
        try {
            const values = await locForm.validateFields();
            setLocSaving(true);
            const payload: StorageLocationDTO = {
                name: values.name,
                type: values.type,
                acquisitionType: values.acquisitionType,
                address: values.locationPicker?.address || undefined,
                gpsLatitude: values.locationPicker?.lat ? parseFloat(values.locationPicker.lat) : undefined,
                gpsLongitude: values.locationPicker?.lng ? parseFloat(values.locationPicker.lng) : undefined,
                capacity: values.capacity || undefined,
                photo: locPhoto || undefined,
                committeeId: user!.committeeId!,
                status: values.status || 'ACTIVE',
            };

            if (locModal.editing) {
                await inventoryService.updateLocation(locModal.editing.id!, payload);
                messageApi.success('Local de stockage mis à jour !');
            } else {
                await inventoryService.createLocation(payload);
                messageApi.success('Local de stockage enregistré avec succès !');
            }
            setLocModal({ open: false, editing: null });
            setLocPhoto('');
            fetchLocations();
        } catch {
            messageApi.error('Erreur lors de la sauvegarde du local.');
        } finally {
            setLocSaving(false);
        }
    };

    const handleDeleteLoc = async (id: string) => {
        try {
            await inventoryService.deleteLocation(id);
            messageApi.success('Local supprimé.');
            fetchLocations();
            fetchItems();
        } catch {
            messageApi.error('Impossible de supprimer ce local.');
        }
    };

    // --- Bulk Entries Handlers ---
    const handleAddBulkRow = () => {
        setBulkEntries([...bulkEntries, { itemId: '', quantity: 1, reason: '' }]);
    };

    const handleRemoveBulkRow = (index: number) => {
        if (bulkEntries.length === 1) return;
        setBulkEntries(bulkEntries.filter((_, idx) => idx !== index));
    };

    const handleBulkEntryFieldChange = (index: number, field: string, val: any) => {
        const updated = [...bulkEntries];
        updated[index] = { ...updated[index], [field]: val };
        setBulkEntries(updated);
    };

    const handleBulkSubmit = async () => {
        const validEntries = bulkEntries.filter(e => e.itemId && e.quantity > 0);
        if (validEntries.length === 0) {
            messageApi.error('Veuillez ajouter au moins un article avec sa quantité.');
            return;
        }
        setBulkSubmitLoading(true);
        try {
            const payload = {
                recordedByName: bulkRecordedBy,
                receivedBy: bulkReceivedBy,
                supplier: bulkSupplier,
                proofPhoto: bulkProofPhoto || undefined,
                entries: validEntries
            };
            await inventoryService.recordBulkEntry(payload);
            messageApi.success(`Réception en lot enregistrée (${validEntries.length} articles ajoutés) !`);
            setBulkModalOpen(false);
            setBulkEntries([{ itemId: '', quantity: 1, reason: '' }]);
            setBulkProofPhoto('');
            fetchItems();
            fetchAllMovements();
        } catch {
            messageApi.error('Erreur lors de la réception en lot.');
        } finally {
            setBulkSubmitLoading(false);
        }
    };

    const handleMovementSubmit = async () => {
        if (!movementModal.item) return;
        setMovementLoading(true);
        try {
            const payload = {
                quantity: movementQty,
                reason: movementReason || (movementModal.type === 'in' ? 'Entrée de stock' : 'Sortie de stock'),
                proofPhoto: proofPhoto || undefined,
                recordedByName: recordedByName || undefined,
                itemCondition: movementModal.type === 'out' ? itemCondition : undefined,
                supplier: movementModal.type === 'in' ? supplier : undefined,
                receivedBy: movementModal.type === 'in' ? receivedBy : undefined,
            };

            if (movementModal.type === 'in') {
                await inventoryService.stockIn(movementModal.item.id, payload);
                messageApi.success(`Entrée de +${movementQty} ${movementModal.item.name} enregistrée !`);
            } else {
                await inventoryService.stockOut(movementModal.item.id, payload);
                if (isPresident) {
                    messageApi.success(`Sortie de -${movementQty} ${movementModal.item.name} effectuée !`);
                } else {
                    messageApi.success(`Demande de sortie de -${movementQty} ${movementModal.item.name} soumise pour validation.`);
                }
            }
            
            setMovementModal({ visible: false, type: 'in', item: null });
            setProofPhoto('');
            fetchItems();
            fetchAllMovements();
            if (isPresident) {
                fetchPendingMovements();
            }
        } catch (err: any) {
            messageApi.error(err.response?.data?.message || 'Erreur lors du mouvement de stock.');
        } finally {
            setMovementLoading(false);
        }
    };

    const openHistory = async (item: InventoryItemDTO) => {
        setHistoryDrawer({ open: true, item });
        setItemMovementsLoading(true);
        try {
            const data = await inventoryService.getMovements(item.id);
            setItemMovements(data);
        } catch {
            setItemMovements([]);
        } finally {
            setItemMovementsLoading(false);
        }
    };

    const handleResolveAlert = async (alertId: string) => {
        try {
            await inventoryService.resolveAlert(alertId);
            messageApi.success('Alerte résolue avec succès.');
            fetchAlerts();
        } catch {
            messageApi.error('Erreur lors de la résolution.');
        }
    };

    const handleApproveMovement = async (id: string) => {
        try {
            await inventoryService.approveMovement(id);
            messageApi.success('Mouvement approuvé avec succès !');
            fetchItems();
            fetchPendingMovements();
            fetchAllMovements();
        } catch (err: any) {
            messageApi.error(err.response?.data?.message || 'Erreur lors de l\'approbation.');
        }
    };

    const handleRejectMovement = async () => {
        if (!rejectingId || !rejectionReason.trim()) return;
        setRejectSubmitLoading(true);
        try {
            await inventoryService.rejectMovement(rejectingId, rejectionReason);
            messageApi.success('Mouvement rejeté.');
            setRejectModalOpen(false);
            setRejectingId(null);
            setRejectionReason('');
            fetchPendingMovements();
            fetchAllMovements();
        } catch {
            messageApi.error('Erreur lors du rejet.');
        } finally {
            setRejectSubmitLoading(false);
        }
    };

    const handleExport = () => {
        if (items.length === 0) { messageApi.info('Aucun article à exporter'); return; }
        const headers = ['Nom', 'Catégorie', 'Quantité Actuelle', 'Seuil Minimum', 'Local de Stockage'];
        const rows = items.map(i => {
            const localName = locations.find(l => l.id === i.storageLocationId)?.name || 'Non assigné';
            return [i.name, i.category, i.currentQuantity, i.minThreshold, localName].join(';');
        });
        const csv = [headers.join(';'), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventaire_${user?.committeeName || 'comite'}_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        messageApi.success('Export CSV téléchargé avec succès.');
    };

    // ======================== DERIVED ========================

    const filtered = items.filter(item => {
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = !catFilter || item.category === catFilter;
        const matchLoc = !locFilter || item.storageLocationId === locFilter;
        return matchSearch && matchCat && matchLoc;
    });

    const lowStock = items.filter(i => i.currentQuantity <= i.minThreshold);
    const activeAlerts = alerts.filter(a => !a.resolvedAt);

    // ======================== TABLE COLUMNS ========================

    const columns: ColumnsType<InventoryItemDTO> = [
        {
            title: 'Article',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, r) => {
                const isLow = r.currentQuantity <= r.minThreshold;
                return (
                    <Space>
                        <div style={{ 
                            width: 36, height: 36, borderRadius: 10, 
                            background: isLow ? 'rgba(224,28,46,0.1)' : 'rgba(22,163,74,0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                            {isLow ? <ExclamationCircleOutlined style={{ color: CRC.red }} /> : <InboxOutlined style={{ color: CRC.green }} />}
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 13 }}>{name}</Text>
                            {isLow && <div><Tag color="red" bordered={false} style={{ fontSize: 10, margin: 0 }}>Stock bas!</Tag></div>}
                        </div>
                    </Space>
                );
            },
        },
        {
            title: 'Catégorie',
            dataIndex: 'category',
            key: 'category',
            render: (cat: string) => {
                const cfg = categoryCfg[cat] || { color: 'default', label: cat, icon: null };
                return (
                    <Tag color={cfg.color} bordered={false} style={{ borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {cfg.icon}
                        {cfg.label}
                    </Tag>
                );
            },
            responsive: ['md'],
        },
        {
            title: 'Local',
            dataIndex: 'storageLocationId',
            key: 'storageLocationId',
            render: (locId?: string) => {
                const loc = locations.find(l => l.id === locId);
                return loc ? (
                    <Space size={6}>
                        <HomeOutlined style={{ color: CRC.red, fontSize: 12 }} />
                        <Text style={{ fontSize: 12 }}>{loc.name}</Text>
                    </Space>
                ) : (
                    <Text type="secondary" style={{ fontSize: 11 }}>Non assigné</Text>
                );
            }
        },
        {
            title: 'Quantité',
            dataIndex: 'currentQuantity',
            key: 'currentQuantity',
            sorter: (a, b) => a.currentQuantity - b.currentQuantity,
            render: (q: number, r) => (
                <Text strong style={{ fontSize: 15, color: q <= r.minThreshold ? CRC.red : undefined }}>
                    {q}
                </Text>
            ),
        },
        {
            title: 'Seuil min',
            dataIndex: 'minThreshold',
            key: 'minThreshold',
            render: (t: number) => <Text style={{ fontSize: 12, color: '#888' }}>{t}</Text>,
            responsive: ['lg'],
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 280,
            render: (_, r) => (
                <Space size="small" wrap>
                    <Tooltip title="Entrée de stock">
                        <Button size="small" icon={<ArrowUpOutlined style={{ color: CRC.green }} />} onClick={() => {
                            setMovementModal({ visible: true, type: 'in', item: r });
                            setMovementQty(1); setMovementReason(''); setProofPhoto(''); setSupplier(''); setReceivedBy(user?.fullName || ''); setRecordedByName(user?.fullName || '');
                        }}>Entrée</Button>
                    </Tooltip>
                    <Tooltip title="Sortie de stock">
                        <Button size="small" danger icon={<ArrowDownOutlined style={{ color: CRC.red }} />} onClick={() => {
                            setMovementModal({ visible: true, type: 'out', item: r });
                            setMovementQty(1); setMovementReason(''); setProofPhoto(''); setItemCondition('BON_ETAT'); setRecordedByName(user?.fullName || '');
                        }}>Sortie</Button>
                    </Tooltip>
                    <Tooltip title="Historique de l'article">
                        <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r)} />
                    </Tooltip>
                    <Tooltip title="Modifier">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} />
                    </Tooltip>
                    <Popconfirm 
                        title={`Supprimer "${r.name}" ?`} 
                        description="Cette action est irréversible et supprimera tout l'historique." 
                        onConfirm={() => handleDelete(r)} 
                        okText="Supprimer" cancelText="Annuler" 
                        okButtonProps={{ danger: true, style: { background: CRC.red } }}
                    >
                        <Tooltip title="Supprimer">
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const itemMovementColumns: ColumnsType<StockMovementResponse> = [
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 100,
            render: (type: string) => (
                <Tag color={type === 'IN' ? 'green' : 'red'} icon={type === 'IN' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
                    {type === 'IN' ? 'Entrée' : 'Sortie'}
                </Tag>
            ),
        },
        {
            title: 'Quantité',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 90,
            render: (q: number, r) => (
                <Text strong style={{ color: r.type === 'IN' ? CRC.green : CRC.red }}>
                    {r.type === 'IN' ? '+' : '-'}{q}
                </Text>
            ),
        },
        { title: 'Motif', dataIndex: 'reason', key: 'reason' },
        {
            title: 'Date',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 150,
            render: (ts: string) => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        },
    ];

    const validationColumns: ColumnsType<StockMovementResponse> = [
        {
            title: 'Article',
            key: 'item',
            render: (_, r) => (
                <Space>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: CRC.redBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CRC.red }}>
                        <InboxOutlined />
                    </div>
                    <div>
                        <Text strong style={{ fontSize: 13 }}>{r.inventoryItem?.name || 'Article inconnu'}</Text>
                        <div><Tag color="orange" bordered={false} style={{ fontSize: 10 }}>{r.inventoryItem?.category || 'STOCK'}</Tag></div>
                    </div>
                </Space>
            )
        },
        {
            title: 'Quantité',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (q: number) => (
                <Text strong style={{ color: CRC.red, fontSize: 15 }}>
                    -{q} <span style={{ fontSize: 11, fontWeight: 400, color: '#999' }}>u.</span>
                </Text>
            )
        },
        {
            title: 'Demandeur / Date',
            key: 'requestedBy',
            render: (_, r) => (
                <div>
                    <Text strong style={{ fontSize: 12, display: 'block' }}>{r.recordedByName || 'Inconnu'}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(r.timestamp).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </div>
            )
        },
        {
            title: 'État matériel',
            dataIndex: 'itemCondition',
            key: 'itemCondition',
            render: (cond?: string) => {
                const found = ITEM_CONDITIONS.find(c => c.value === cond);
                if (!found) return <Text type="secondary">—</Text>;
                return (
                    <Tag color={found.color} style={{ borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {found.icon}
                        {found.label}
                    </Tag>
                );
            }
        },
        {
            title: 'Motif',
            dataIndex: 'reason',
            key: 'reason',
            render: (reason: string) => <Text style={{ fontSize: 12 }} italic>"{reason}"</Text>
        },
        {
            title: 'Preuve',
            dataIndex: 'proofPhoto',
            key: 'proofPhoto',
            width: 90,
            render: (photo?: string) => photo ? (
                <div 
                    onClick={() => setPreviewPhoto(photo)}
                    style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', border: `2px solid ${CRC.redBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            ) : (
                <Tag color="default" style={{ fontSize: 10 }}>Aucune</Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 220,
            render: (_, r) => (
                <Space>
                    <Button 
                        size="small" type="primary" icon={<CheckOutlined />}
                        onClick={() => handleApproveMovement(r.id)}
                        style={{ background: CRC.green, borderColor: CRC.green, borderRadius: 8 }}
                    >
                        Approuver
                    </Button>
                    <Button 
                        size="small" danger icon={<StopOutlined />}
                        onClick={() => { setRejectingId(r.id); setRejectionReason(''); setRejectModalOpen(true); }}
                        style={{ borderRadius: 8 }}
                    >
                        Rejeter
                    </Button>
                </Space>
            )
        }
    ];

    const globalMovementsColumns: ColumnsType<StockMovementResponse> = [
        {
            title: 'MOUVEMENT',
            key: 'type',
            width: 120,
            render: (_, r) => (
                <Tag 
                    color={r.type === 'IN' ? 'green' : 'red'} 
                    icon={r.type === 'IN' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                    style={{ fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}
                >
                    {r.type === 'IN' ? 'Entrée' : 'Sortie'}
                </Tag>
            )
        },
        {
            title: 'ARTICLE',
            key: 'item',
            render: (_, r) => (
                <div>
                    <Text strong style={{ fontSize: 13, display: 'block' }}>{r.inventoryItem?.name || '—'}</Text>
                    {r.inventoryItem?.category && <Tag style={{ fontSize: 9, borderRadius: 4 }}>{r.inventoryItem.category}</Tag>}
                </div>
            )
        },
        {
            title: 'QTE',
            key: 'qty',
            width: 80,
            render: (_, r) => (
                <Text strong style={{ color: r.type === 'IN' ? CRC.green : CRC.red, fontSize: 14 }}>
                    {r.type === 'IN' ? '+' : '-'}{r.quantity}
                </Text>
            )
        },
        {
            title: 'TRAÇABILITÉ / ACTEURS',
            key: 'traceability',
            render: (_, r) => (
                <div>
                    <div>
                        <Text strong style={{ fontSize: 12 }}>Responsable : </Text>
                        <Text style={{ fontSize: 12 }}>{r.recordedByName || 'Inconnu'}</Text>
                    </div>
                    {r.type === 'IN' && (
                        <>
                            {r.receivedBy && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11 }}><b>Récep. par :</b> {r.receivedBy}</Text>
                                </div>
                            )}
                            {r.supplier && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 11 }}><b>Source :</b> {r.supplier}</Text>
                                </div>
                            )}
                        </>
                    )}
                    {r.type === 'OUT' && r.itemCondition && (
                        <div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                                <b>État :</b> {(() => {
                                    const condCfg = ITEM_CONDITIONS.find(c => c.value === r.itemCondition);
                                    return condCfg ? (
                                        <Tag color={condCfg.color} style={{ fontSize: 9, borderRadius: 4, height: 18, lineHeight: '16px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                            {condCfg.icon}
                                            {condCfg.label}
                                        </Tag>
                                    ) : (
                                        <Tag style={{ fontSize: 9, borderRadius: 4, height: 18, lineHeight: '16px' }}>{r.itemCondition}</Tag>
                                    );
                                })()}
                            </Text>
                        </div>
                    )}
                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 2 }}>
                        Date : {new Date(r.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </div>
            )
        },
        {
            title: 'MOTIF',
            dataIndex: 'reason',
            key: 'reason',
            render: (reason: string) => <Text style={{ fontSize: 12 }} italic>"{reason || '—'}"</Text>
        },
        {
            title: 'PREUVE',
            dataIndex: 'proofPhoto',
            key: 'proofPhoto',
            width: 80,
            render: (photo?: string) => photo ? (
                <div 
                    onClick={() => setPreviewPhoto(photo)}
                    style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', border: `1px solid ${CRC.redBorder}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
        },
        {
            title: 'STATUT & APPROBATION',
            key: 'status',
            width: 180,
            render: (_, r) => {
                const cfg = STATUS_CONFIG[r.status || 'APPROVED'] || STATUS_CONFIG.APPROVED;
                return (
                    <div>
                        <Tag icon={cfg.icon} color={cfg.color} style={{ borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                            {cfg.label}
                        </Tag>
                        {r.status === 'APPROVED' && r.approvedByName && (
                            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Validé: {r.approvedByName}</div>
                        )}
                        {r.status === 'REJECTED' && r.rejectionReason && (
                            <div style={{ fontSize: 10, color: CRC.red, marginTop: 2, fontStyle: 'italic' }}>"{r.rejectionReason}"</div>
                        )}
                    </div>
                );
            }
        }
    ];

    const alertColumns: ColumnsType<StockAlertDTO> = [
        {
            title: 'Type',
            dataIndex: 'alertType',
            key: 'alertType',
            render: (type: string) => {
                const cfg = alertTypeCfg[type] || { label: type, icon: <AlertOutlined /> };
                return <Space>{cfg.icon}<Text>{cfg.label}</Text></Space>;
            },
        },
        {
            title: 'Sévérité',
            dataIndex: 'severity',
            key: 'severity',
            render: (sev: string) => {
                const cfg = severityCfg[sev] || { color: 'default' };
                return <Tag color={cfg.color}>{sev}</Tag>;
            },
        },
        {
            title: 'Date',
            dataIndex: 'triggeredAt',
            key: 'triggeredAt',
            render: (ts: string) => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        },
        {
            title: 'Statut',
            key: 'status',
            render: (_, r) => r.resolvedAt
                ? <Tag color="green" icon={<CheckCircleOutlined />}>Résolue</Tag>
                : <Tag color="red" icon={<ExclamationCircleOutlined />}>Active</Tag>,
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_, r) => !r.resolvedAt ? (
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleResolveAlert(r.id)} style={{ background: CRC.green, borderColor: CRC.green }}>
                    Résoudre
                </Button>
            ) : null,
        },
    ];

    // ======================== GLASS DESIGN STYLES ========================
    const glassStyle = {
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.08)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(224,28,46,0.06)',
        overflow: 'hidden'
    };

    return (
        <div style={{ padding: '0 24px 40px 24px', maxWidth: 1400, margin: '0 auto' }}>
            {/* Header section with Glassmorphism and official branding */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'between', gap: 16, marginBottom: 28 }}>
                <div>
                    <Title level={3} className="!mb-1" style={{ color: CRC.red, fontWeight: 800 }}>
                        🏥 {t('nav.stocks')}
                    </Title>
                    <Text type="secondary">Gestion d'inventaire multi-locaux & Traçabilité complète — {user?.committeeName || 'Comité Nexus Aid'}</Text>
                </div>
                <Space style={{ marginLeft: 'auto' }}>
                    <Button icon={<DownloadOutlined />} onClick={handleExport} style={{ borderColor: CRC.redBorder, borderRadius: 10 }}>
                        Exporter CSV
                    </Button>
                    <Button icon={<PlusCircleOutlined style={{ color: CRC.red }} />} onClick={() => setBulkModalOpen(true)} style={{ borderColor: CRC.redBorder, borderRadius: 10, color: CRC.red, fontWeight: 700 }}>
                        Réception en Lot (Bulk)
                    </Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} style={{ background: CRC.gradient, border: 'none', fontWeight: 700, borderRadius: 10, boxShadow: '0 4px 12px rgba(224,28,46,0.2)' }}>
                        Ajouter un Article
                    </Button>
                </Space>
            </div>

            {/* Stats Overview */}
            <Row gutter={[16, 16]} className="mb-6">
                {[
                    { title: 'Total Articles', value: items.length, icon: <InboxOutlined />, color: '#6366f1' },
                    { title: 'Locaux Enregistrés', value: locations.length, icon: <HomeOutlined />, color: CRC.green },
                    { title: 'Alertes Actives', value: activeAlerts.length, icon: <AlertOutlined />, color: CRC.orange },
                    { title: 'Sorties en attente', value: isPresident ? pendingMovements.length : 0, icon: <AuditOutlined />, color: '#ca8a04', show: isPresident },
                ].map((s, idx) => (s.show !== false ? (
                    <Col xs={24} sm={12} md={6} key={idx}>
                        <Card size="small" styles={{ body: { padding: '16px 20px' } }} style={{ borderRadius: 16, border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.06)'}` }}>
                            <div className="flex items-center gap-4">
                                <div style={{ 
                                    width: 44, height: 44, borderRadius: 12, 
                                    background: `${s.color}15`, 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                    color: s.color, fontSize: 20 
                                }}>
                                    {s.icon}
                                </div>
                                <Statistic 
                                    title={<Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{s.title}</Text>} 
                                    value={s.value} 
                                    valueStyle={{ fontSize: 22, fontWeight: 800, color: s.color }} 
                                />
                            </div>
                        </Card>
                    </Col>
                ) : null))}
            </Row>

            {/* Main Tabs Container inside Glass Body */}
            <div style={glassStyle}>
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab}
                    tabBarStyle={{ padding: '0 24px', background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,250,250,0.6)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.08)'}` }}
                    items={[
                        {
                            key: 'inventory',
                            label: <Space><InboxOutlined />Inventaire Actif</Space>,
                            children: (
                                <div style={{ padding: '24px 32px' }}>
                                    {/* Table Filters */}
                                    <div className="flex flex-wrap items-center gap-3 mb-5">
                                        <Input
                                            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                                            placeholder="Rechercher un article par son nom..."
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            style={{ width: 280, borderRadius: 10 }}
                                            allowClear
                                        />
                                        <Select
                                            placeholder="Filtrer par catégorie"
                                            allowClear
                                            style={{ width: 180 }}
                                            value={catFilter}
                                            onChange={setCatFilter}
                                            suffixIcon={<FilterOutlined />}
                                            dropdownStyle={{ borderRadius: 10 }}
                                        >
                                            {Object.entries(categoryCfg).map(([k, v]) => (
                                                <Select.Option key={k} value={k}>
                                                    <Space size={6}>
                                                        {v.icon}
                                                        {v.label}
                                                    </Space>
                                                </Select.Option>
                                            ))}
                                        </Select>
                                        <Select
                                            placeholder="Filtrer par Local"
                                            allowClear
                                            style={{ width: 220 }}
                                            value={locFilter}
                                            onChange={setLocFilter}
                                            suffixIcon={<HomeOutlined />}
                                            options={locations.map(l => ({ value: l.id!, label: l.name }))}
                                            dropdownStyle={{ borderRadius: 10 }}
                                        />
                                        <Text style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }} italic>
                                            {filtered.length} article{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
                                        </Text>
                                    </div>

                                    {loading ? (
                                        <div className="flex justify-center py-16"><Spin size="large" /></div>
                                    ) : filtered.length > 0 ? (
                                        <Table
                                            columns={columns}
                                            dataSource={filtered}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total) => `${total} articles` }}
                                            size="middle"
                                            scroll={{ x: 900 }}
                                            className="premium-table"
                                        />
                                    ) : (
                                        <Empty description="Aucun article en stock correspondant à vos filtres." style={{ padding: '40px 0' }} />
                                    )}
                                </div>
                            ),
                        },
                        {
                            key: 'locations',
                            label: <Space><HomeOutlined />Locaux de Stockage</Space>,
                            children: (
                                <div style={{ padding: '24px 32px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <div>
                                            <Title level={4} style={{ margin: 0, fontWeight: 800 }}><HomeOutlined style={{ marginRight: 8, color: CRC.red }} />Gestion des Locaux de Stockage</Title>
                                            <Text type="secondary">Enregistrez les hangars, pharmacies et bureaux avec leur type d'acquisition (location, achat, don).</Text>
                                        </div>
                                        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateLocModal} style={{ background: CRC.gradient, border: 'none', borderRadius: 8 }}>
                                            Enregistrer un Local
                                        </Button>
                                    </div>

                                    {locationsLoading ? (
                                        <div className="flex justify-center py-16"><Spin size="large" /></div>
                                    ) : locations.length > 0 ? (
                                        <Row gutter={[20, 20]}>
                                            {locations.map(loc => {
                                                const storedCount = items.filter(i => i.storageLocationId === loc.id).length;
                                                const typeCfg = LOCATION_TYPES.find(t => t.value === loc.type) || { color: 'default', label: loc.type, icon: null };
                                                const acqCfg = ACQUISITION_TYPES.find(a => a.value === loc.acquisitionType) || { color: 'default', label: loc.acquisitionType, icon: null };

                                                return (
                                                    <Col xs={24} sm={12} lg={8} key={loc.id}>
                                                        <Card 
                                                            hoverable
                                                            styles={{ body: { padding: '16px 20px' } }}
                                                            style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.06)'}`, position: 'relative' }}
                                                            cover={loc.photo ? (
                                                                <img src={loc.photo} alt={loc.name} style={{ height: 140, objectFit: 'cover', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.06)'}` }} />
                                                            ) : (
                                                                <div style={{ height: 140, background: CRC.gradientSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', color: CRC.red }}>
                                                                    <HomeOutlined style={{ fontSize: 44 }} />
                                                                </div>
                                                            )}
                                                        >
                                                            <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                                                <Tag color={loc.status === 'ACTIVE' ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 700 }}>
                                                                    {loc.status === 'ACTIVE' ? 'ACTIF' : 'INACTIF'}
                                                                </Tag>
                                                            </div>
                                                            <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                                                <Title level={5} style={{ margin: 0, fontWeight: 800 }}>{loc.name}</Title>
                                                                
                                                                <Space wrap size={6}>
                                                                    <Tag color={typeCfg.color} style={{ borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                        {typeCfg.icon}
                                                                        {typeCfg.label}
                                                                    </Tag>
                                                                    <Tag color={acqCfg.color} style={{ borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                        {acqCfg.icon}
                                                                        {acqCfg.label}
                                                                    </Tag>
                                                                </Space>

                                                                {loc.address && (
                                                                    <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                                                                        <EnvironmentOutlined style={{ color: CRC.red, marginRight: 4 }} /> {loc.address}
                                                                    </Text>
                                                                )}

                                                                <Divider style={{ margin: '8px 0' }} />

                                                                <Row gutter={8}>
                                                                    <Col span={12}>
                                                                        <Statistic title={<span style={{ fontSize: 10, textTransform: 'uppercase' }}>Capacité</span>} value={loc.capacity || 0} suffix=" m³" valueStyle={{ fontSize: 15, fontWeight: 800 }} />
                                                                    </Col>
                                                                    <Col span={12}>
                                                                        <Statistic title={<span style={{ fontSize: 10, textTransform: 'uppercase' }}>Matériels</span>} value={storedCount} valueStyle={{ fontSize: 15, fontWeight: 800, color: CRC.red }} />
                                                                    </Col>
                                                                </Row>

                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                                                                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditLocModal(loc)}>Modifier</Button>
                                                                    <Popconfirm 
                                                                        title="Supprimer ce local ?" 
                                                                        description="Les articles qui y sont stockés seront dissociés." 
                                                                        onConfirm={() => handleDeleteLoc(loc.id!)}
                                                                        okText="Supprimer" cancelText="Annuler"
                                                                        okButtonProps={{ danger: true, style: { background: CRC.red } }}
                                                                    >
                                                                        <Button size="small" danger icon={<DeleteOutlined />} />
                                                                    </Popconfirm>
                                                                </div>
                                                            </Space>
                                                        </Card>
                                                    </Col>
                                                );
                                            })}
                                        </Row>
                                    ) : (
                                        <Empty description="Aucun local de stockage enregistré." />
                                    )}
                                </div>
                            )
                        },
                        ...(isPresident ? [{
                            key: 'validation',
                            label: (
                                <Badge count={pendingMovements.length} offset={[10, -2]} size="small" color={CRC.red}>
                                    <Space><AuditOutlined />Validations requises</Space>
                                </Badge>
                            ),
                            children: (
                                <div style={{ padding: '24px 32px' }}>
                                    <div style={{ marginBottom: 16 }}>
                                        <Title level={4} style={{ margin: 0, fontWeight: 800 }}><AuditOutlined style={{ marginRight: 8, color: CRC.red }} />Demandes de Sortie en Attente</Title>
                                        <Text type="secondary">En tant que Président, validez ou rejetez les demandes de sortie de stock de vos responsables opérationnels.</Text>
                                    </div>

                                    {pendingLoading ? (
                                        <div className="flex justify-center py-16"><Spin size="large" /></div>
                                    ) : pendingMovements.length > 0 ? (
                                        <Table
                                            columns={validationColumns}
                                            dataSource={pendingMovements}
                                            rowKey="id"
                                            pagination={{ pageSize: 5 }}
                                            size="middle"
                                            scroll={{ x: 900 }}
                                            className="premium-table"
                                            rowClassName={() => 'row-urgent'}
                                        />
                                    ) : (
                                        <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                            <CheckCircleOutlined style={{ fontSize: 56, color: CRC.green, marginBottom: 12 }} />
                                            <Title level={5} style={{ color: CRC.green }}>Parfait ! Aucune validation en attente</Title>
                                            <Text type="secondary">Toutes les demandes de mouvements de stock ont été traitées.</Text>
                                        </div>
                                    )}
                                </div>
                            ),
                        }] : []),
                        {
                            key: 'movements_history',
                            label: <Space><HistoryOutlined />Historique Global</Space>,
                            children: (
                                <div style={{ padding: '24px 32px' }}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <Title level={4} style={{ margin: 0, fontWeight: 800 }}><HistoryOutlined style={{ marginRight: 8, color: CRC.red }} />Journal Complet des Mouvements</Title>
                                            <Text type="secondary">Suivi et audit de toutes les entrées, sorties et demandes de stock.</Text>
                                        </div>
                                        <Button size="small" onClick={fetchAllMovements} loading={allMovementsLoading}>
                                            Rafraîchir
                                        </Button>
                                    </div>

                                    {allMovementsLoading ? (
                                        <div className="flex justify-center py-16"><Spin size="large" /></div>
                                    ) : allMovements.length > 0 ? (
                                        <Table
                                            columns={globalMovementsColumns}
                                            dataSource={allMovements}
                                            rowKey="id"
                                            pagination={{ pageSize: 10 }}
                                            size="middle"
                                            scroll={{ x: 1000 }}
                                            className="premium-table"
                                        />
                                    ) : (
                                        <Empty description="Aucun mouvement de stock enregistré." style={{ padding: '40px 0' }} />
                                    )}
                                </div>
                            )
                        },
                        {
                            key: 'alerts',
                            label: (
                                <Badge count={activeAlerts.length} offset={[10, -2]} size="small" color={CRC.orange}>
                                    <Space><AlertOutlined />Alertes de stock</Space>
                                </Badge>
                            ),
                            children: (
                                <div style={{ padding: '24px 32px' }}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <Title level={4} style={{ margin: 0, fontWeight: 800 }}><AlertOutlined style={{ marginRight: 8, color: CRC.orange }} />Alertes de Stock actives</Title>
                                            <Text type="secondary">Suivi des ruptures de stock critiques et des produits sous le seuil minimum.</Text>
                                        </div>
                                        <Button size="small" onClick={fetchAlerts} loading={alertsLoading}>
                                            Rafraîchir
                                        </Button>
                                    </div>

                                    {alertsLoading ? (
                                        <div className="flex justify-center py-16"><Spin size="large" /></div>
                                    ) : alerts.length > 0 ? (
                                        <Table
                                            columns={alertColumns}
                                            dataSource={alerts}
                                            rowKey="id"
                                            pagination={{ pageSize: 10 }}
                                            size="middle"
                                            className="premium-table"
                                        />
                                    ) : (
                                        <div style={{ padding: '60px 0', textAlign: 'center' }}>
                                            <CheckCircleOutlined style={{ fontSize: 56, color: CRC.green, marginBottom: 12 }} />
                                            <Title level={5} style={{ color: CRC.green }}>Aucune alerte de stock active</Title>
                                            <Text type="secondary">L'état de votre stock est optimal.</Text>
                                        </div>
                                    )}
                                </div>
                            ),
                        },
                    ]} 
                />
            </div>

            {/* ============ CREATE / EDIT ITEM MODAL ============ */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: CRC.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
                            {itemModal.editing ? <EditOutlined /> : <PlusOutlined />}
                        </div>
                        <Text strong style={{ fontSize: 16 }}>{itemModal.editing ? 'Modifier l\'article' : 'Ajouter un nouvel article en stock'}</Text>
                    </div>
                }
                open={itemModal.open}
                onOk={handleItemSave}
                onCancel={() => setItemModal({ open: false, editing: null })}
                confirmLoading={itemSaving}
                okText={itemModal.editing ? 'Mettre à jour' : 'Créer l\'article'}
                okButtonProps={{ style: { background: CRC.gradient, border: 'none', height: 40, borderRadius: 8 } }}
                cancelButtonProps={{ style: { height: 40, borderRadius: 8 } }}
                destroyOnClose
                centered
                styles={{ content: { borderRadius: 20 } }}
            >
                <Form form={itemForm} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
                    <Form.Item name="name" label="Nom de l'article" rules={[{ required: true, message: 'Le nom est obligatoire' }]}>
                        <Input placeholder="Ex: Bandages stériles, Couvertures thermiques..." size="large" style={{ borderRadius: 10 }} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="category" label="Catégorie" rules={[{ required: true, message: 'Choisir une catégorie' }]}>
                                <Select placeholder="Sélectionner" size="large" dropdownStyle={{ borderRadius: 10 }}>
                                    {Object.entries(categoryCfg).map(([k, v]) => (
                                        <Select.Option key={k} value={k}>
                                            <Space size={6}>
                                                {v.icon}
                                                {v.label}
                                            </Space>
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="storageLocationId" label="Assigner à un Local">
                                <Select placeholder="Aucun local assigné" size="large" allowClear dropdownStyle={{ borderRadius: 10 }}>
                                    {locations.map(l => (
                                        <Select.Option key={l.id} value={l.id}>{l.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="minThreshold" label="Seuil d'alerte minimum" rules={[{ required: true, message: 'Le seuil est requis' }]}>
                                <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="Ex: 10" size="large" />
                            </Form.Item>
                        </Col>
                        {!itemModal.editing && (
                            <Col span={12}>
                                <Form.Item name="initialQuantity" label="Quantité initiale">
                                    <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="0" size="large" />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>
                </Form>
            </Modal>

            {/* ============ CREATE / EDIT STORAGE LOCATION MODAL ============ */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: CRC.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
                            <HomeOutlined />
                        </div>
                        <Text strong style={{ fontSize: 16 }}>{locModal.editing ? 'Modifier le local de stockage' : 'Enregistrer un nouveau local de stockage'}</Text>
                    </div>
                }
                open={locModal.open}
                onOk={handleLocSave}
                onCancel={() => { setLocModal({ open: false, editing: null }); setLocPhoto(''); }}
                confirmLoading={locSaving}
                okText={locModal.editing ? 'Mettre à jour' : 'Enregistrer le local'}
                okButtonProps={{ style: { background: CRC.gradient, border: 'none', height: 40, borderRadius: 8 } }}
                cancelButtonProps={{ style: { height: 40, borderRadius: 8 } }}
                destroyOnClose
                centered
                styles={{ content: { borderRadius: 20 } }}
            >
                <Form form={locForm} layout="vertical" style={{ marginTop: 16 }} requiredMark={false}>
                    <Form.Item name="name" label="Nom du local (ex: Hangar A, Cabinet médical, Pharmacie Sfax)" rules={[{ required: true, message: 'Nom obligatoire' }]}>
                        <Input placeholder="Ex: Pharmacie centrale du Comité" size="large" style={{ borderRadius: 10 }} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="Type de local" rules={[{ required: true, message: 'Type requis' }]}>
                                <Select placeholder="Sélectionner" size="large" dropdownStyle={{ borderRadius: 10 }}>
                                    {LOCATION_TYPES.map(t => (
                                        <Select.Option key={t.value} value={t.value}>
                                            <Space size={6}>
                                                {t.icon}
                                                {t.label}
                                            </Space>
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="acquisitionType" label="Mode d'acquisition" rules={[{ required: true, message: 'Acquisition requise' }]}>
                                <Select placeholder="Sélectionner" size="large" dropdownStyle={{ borderRadius: 10 }}>
                                    {ACQUISITION_TYPES.map(t => (
                                        <Select.Option key={t.value} value={t.value}>
                                            <Space size={6}>
                                                {t.icon}
                                                {t.label}
                                            </Space>
                                        </Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="locationPicker" label="Adresse physique / Localisation" initialValue={{ lat: '', lng: '', address: '' }}>
                        <LocationMapPicker isDark={isDark} value={locForm.getFieldValue('locationPicker')} onChange={(val) => locForm.setFieldsValue({ locationPicker: val })} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="capacity" label="Capacité de stockage (m³)">
                                <InputNumber min={1} style={{ width: '100%', borderRadius: 10 }} placeholder="Ex: 50" size="large" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="status" label="Statut opérationnel" initialValue="ACTIVE">
                                <Select size="large" dropdownStyle={{ borderRadius: 10 }}>
                                    <Select.Option value="ACTIVE">Actif (Ouvert)</Select.Option>
                                    <Select.Option value="INACTIVE">Inactif (Fermé)</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Drag & Drop Local Photo */}
                    <div style={{ marginBottom: 8 }}>
                        <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Photo du Local / Bâtiment (optionnelle)</Text>
                        {locPhoto ? (
                            <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', border: `2px solid ${CRC.redBorder}` }}>
                                <img src={locPhoto} alt="Bâtiment" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block' }} />
                                <Button 
                                    size="small" type="primary" danger shape="circle" icon={<CloseOutlined />} 
                                    onClick={() => setLocPhoto('')}
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                />
                            </div>
                        ) : (
                            <div
                                onClick={() => locFileRef.current?.click()}
                                style={{ border: `2px dashed ${CRC.redBorder}`, borderRadius: 12, padding: '16px', textAlign: 'center', cursor: 'pointer', background: CRC.redBg }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = CRC.red)}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = CRC.redBorder)}
                            >
                                <CameraOutlined style={{ color: CRC.red, fontSize: 22, marginBottom: 4 }} />
                                <div><Text strong style={{ color: CRC.red, fontSize: 12 }}>Ajouter une photo du local</Text></div>
                                <Text type="secondary" style={{ fontSize: 10 }}>Cliquez pour sélectionner une photo</Text>
                                <input ref={locFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const r = new FileReader();
                                        r.onloadend = () => setLocPhoto(r.result as string);
                                        r.readAsDataURL(file);
                                    }
                                }} />
                            </div>
                        )}
                    </div>
                </Form>
            </Modal>

            {/* ============ MOVEMENT RECORD MODAL ============ */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                            width: 40, height: 40, borderRadius: 12, 
                            background: movementModal.type === 'in' ? 'rgba(22,163,74,0.1)' : 'rgba(224,28,46,0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            color: movementModal.type === 'in' ? CRC.green : CRC.red, 
                            fontSize: 18 
                        }}>
                            {movementModal.type === 'in' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        </div>
                        <Text strong style={{ fontSize: 16 }}>
                            {movementModal.type === 'in' ? 'Enregistrer une entrée de stock' : 'Enregistrer une sortie / retrait de stock'}
                        </Text>
                    </div>
                }
                open={movementModal.visible}
                onOk={handleMovementSubmit}
                onCancel={() => { setMovementModal({ visible: false, type: 'in', item: null }); setProofPhoto(''); }}
                confirmLoading={movementLoading}
                okText={movementModal.type === 'in' ? 'Confirmer l\'entrée' : (isPresident ? 'Confirmer la sortie' : 'Soumettre la demande')}
                okButtonProps={{ 
                    style: { 
                        background: movementModal.type === 'in' ? CRC.green : CRC.red, 
                        borderColor: movementModal.type === 'in' ? CRC.green : CRC.red,
                        height: 40, borderRadius: 8 
                    } 
                }}
                cancelButtonProps={{ style: { height: 40, borderRadius: 8 } }}
                destroyOnClose
                centered
                styles={{ content: { borderRadius: 20 } }}
            >
                <div style={{ padding: '8px 0' }}>
                    <div style={{ marginBottom: 16, padding: '12px 16px', background: isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb', borderRadius: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Article sélectionné :</Text>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text strong style={{ fontSize: 15 }}>{movementModal.item?.name}</Text>
                            <Tag 
                                color={movementModal.item ? categoryCfg[movementModal.item.category]?.color : 'default'} 
                                style={{ borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                                {movementModal.item ? (
                                    <>
                                        {categoryCfg[movementModal.item.category]?.icon}
                                        {categoryCfg[movementModal.item.category]?.label}
                                    </>
                                ) : ''}
                            </Tag>
                        </div>
                        <Divider style={{ margin: '8px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 12 }}>Stock actuel : <Text strong>{movementModal.item?.currentQuantity}</Text></Text>
                            <Text style={{ fontSize: 12 }}>Seuil d'alerte : <Text type="secondary">{movementModal.item?.minThreshold}</Text></Text>
                        </div>
                    </div>

                    {!isPresident && movementModal.type === 'out' && (
                        <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: 10 }}>
                            <Text style={{ color: '#ca8a04', fontSize: 11 }}>
                                <InfoCircleOutlined style={{ marginRight: 6 }} />
                                En tant que Responsable, cette sortie de stock nécessite la <b>validation préalable du Président</b> de votre comité avant d'être déduite.
                            </Text>
                        </div>
                    )}

                    <Row gutter={16} style={{ marginBottom: 12 }}>
                        <Col span={12}>
                            <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Quantité</Text>
                            <InputNumber
                                min={1}
                                max={movementModal.type === 'out' ? movementModal.item?.currentQuantity : 99999}
                                value={movementQty}
                                onChange={(v) => setMovementQty(v || 1)}
                                style={{ width: '100%', borderRadius: 10 }}
                                size="large"
                            />
                        </Col>
                        <Col span={12}>
                            <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Responsable (Par qui)</Text>
                            <Input
                                value={recordedByName}
                                onChange={(e) => setRecordedByName(e.target.value)}
                                style={{ borderRadius: 10 }}
                                size="large"
                            />
                        </Col>
                    </Row>

                    {movementModal.type === 'in' && (
                        <Row gutter={16} style={{ marginBottom: 12 }}>
                            <Col span={12}>
                                <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Source / Donneur / Fournisseur</Text>
                                <Input
                                    placeholder="Ex: Pharmacie Centrale, Unicef..."
                                    value={supplier}
                                    onChange={(e) => setSupplier(e.target.value)}
                                    style={{ borderRadius: 10 }}
                                    size="large"
                                />
                            </Col>
                            <Col span={12}>
                                <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Récepteur (Reçu par)</Text>
                                <Input
                                    value={receivedBy}
                                    onChange={(e) => setReceivedBy(e.target.value)}
                                    style={{ borderRadius: 10 }}
                                    size="large"
                                />
                            </Col>
                        </Row>
                    )}

                    {movementModal.type === 'out' && (
                        <div style={{ marginBottom: 12 }}>
                            <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>État de l'équipement / matériel</Text>
                            <Select
                                value={itemCondition}
                                onChange={setItemCondition}
                                style={{ width: '100%' }}
                                size="large"
                                dropdownStyle={{ borderRadius: 10 }}
                            >
                                {ITEM_CONDITIONS.map(c => (
                                    <Select.Option key={c.value} value={c.value}>
                                        <Space size={6}>
                                            {c.icon}
                                            {c.label}
                                        </Space>
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div style={{ marginBottom: 12 }}>
                        <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Motif / Justification</Text>
                        <Input.TextArea
                            value={movementReason}
                            onChange={(e) => setMovementReason(e.target.value)}
                            rows={2}
                            placeholder={movementModal.type === 'in' ? 'Ex: Réception lot donateur, réapprovisionnement...' : 'Ex: Dotation équipe secourisme, mission catastrophe Sfax...'}
                            style={{ borderRadius: 10 }}
                        />
                    </div>

                    {/* Drag & Drop Proof Photo Upload */}
                    <div style={{ marginBottom: 8 }}>
                        <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Photo de preuve / Justificatif (optionnelle)</Text>
                        {proofPhoto ? (
                            <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', border: `2px solid ${CRC.redBorder}` }}>
                                <img src={proofPhoto} alt="Preuve" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', display: 'block' }} />
                                <Button 
                                    size="small" type="primary" danger shape="circle" icon={<CloseOutlined />} 
                                    onClick={() => setProofPhoto('')}
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                />
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                style={{ border: `2px dashed ${CRC.redBorder}`, borderRadius: 12, padding: '16px', textAlign: 'center', cursor: 'pointer', background: CRC.redBg }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = CRC.red)}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = CRC.redBorder)}
                            >
                                <CameraOutlined style={{ color: CRC.red, fontSize: 22, marginBottom: 4 }} />
                                <div><Text strong style={{ color: CRC.red, fontSize: 12 }}>Ajouter une photo de preuve</Text></div>
                                <Text type="secondary" style={{ fontSize: 10 }}>Cliquez pour uploader (bon de commande, carton, etc.)</Text>
                                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const r = new FileReader();
                                        r.onloadend = () => setProofPhoto(r.result as string);
                                        r.readAsDataURL(file);
                                    }
                                }} />
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* ============ BULK ENTRY MODAL ============ */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: CRC.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>
                            <PlusCircleOutlined />
                        </div>
                        <Text strong style={{ fontSize: 16 }}>Réception & Entrée de Stock en Lot (Bulk Entry)</Text>
                    </div>
                }
                open={bulkModalOpen}
                onOk={handleBulkSubmit}
                onCancel={() => { setBulkModalOpen(false); setBulkEntries([{ itemId: '', quantity: 1, reason: '' }]); setBulkProofPhoto(''); }}
                confirmLoading={bulkSubmitLoading}
                okText="Confirmer la réception en lot"
                okButtonProps={{ style: { background: CRC.gradient, border: 'none', height: 40, borderRadius: 8 } }}
                cancelButtonProps={{ style: { height: 40, borderRadius: 8 } }}
                width={780}
                centered
                destroyOnClose
                styles={{ content: { borderRadius: 24, padding: 24 } }}
            >
                <div style={{ padding: '8px 0' }}>
                    <div style={{ marginBottom: 16, padding: '12px 16px', background: isDark ? CRC.redBgDark : CRC.redBg, border: `1px solid ${CRC.redBorder}`, borderRadius: 12 }}>
                        <Text style={{ fontSize: 12, color: CRC.red, fontWeight: 500 }}>
                            <InfoCircleOutlined style={{ marginRight: 6 }} /> Utilisez ce formulaire pour ajouter **plusieurs matériels / matières d'une seule fois** (réception de commande globale, dons massifs, etc.).
                        </Text>
                    </div>

                    <Divider orientation="left" style={{ margin: '12px 0' }}>
                        <Space size={6}>
                            <InboxOutlined style={{ color: CRC.red }} />
                            <Text strong style={{ fontSize: 13, color: CRC.red }}>Éléments reçus</Text>
                        </Space>
                    </Divider>
                    
                    {bulkEntries.map((entry, index) => (
                        <Row gutter={8} key={index} style={{ marginBottom: 8, alignItems: 'center' }}>
                            <Col span={10}>
                                <Select
                                    placeholder="Choisir l'article"
                                    value={entry.itemId || undefined}
                                    onChange={(val) => handleBulkEntryFieldChange(index, 'itemId', val)}
                                    style={{ width: '100%' }}
                                    dropdownStyle={{ borderRadius: 10 }}
                                >
                                    {items.map(i => (
                                        <Select.Option key={i.id} value={i.id}>{i.name} (Stock: {i.currentQuantity})</Select.Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col span={4}>
                                <InputNumber
                                    min={1}
                                    placeholder="Qte"
                                    value={entry.quantity}
                                    onChange={(val) => handleBulkEntryFieldChange(index, 'quantity', val || 1)}
                                    style={{ width: '100%', borderRadius: 8 }}
                                />
                            </Col>
                            <Col span={8}>
                                <Input
                                    placeholder="Motif (optionnel)"
                                    value={entry.reason}
                                    onChange={(e) => handleBulkEntryFieldChange(index, 'reason', e.target.value)}
                                    style={{ borderRadius: 8 }}
                                />
                            </Col>
                            <Col span={2}>
                                <Button 
                                    danger type="text" icon={<DeleteFilled />} 
                                    onClick={() => handleRemoveBulkRow(index)} 
                                    disabled={bulkEntries.length === 1}
                                />
                            </Col>
                        </Row>
                    ))}

                    <Button type="dashed" block icon={<PlusOutlined />} onClick={handleAddBulkRow} style={{ marginTop: 8, borderRadius: 10 }}>
                        Ajouter un élément à la liste
                    </Button>

                    <Divider orientation="left" style={{ margin: '20px 0 12px 0' }}>
                        <Space size={6}>
                            <SolutionOutlined style={{ color: CRC.red }} />
                            <Text strong style={{ fontSize: 13, color: CRC.red }}>Traçabilité globale</Text>
                        </Space>
                    </Divider>

                    <Row gutter={16} style={{ marginBottom: 12 }}>
                        <Col span={8}>
                            <Form.Item label="Responsable (Par qui)" required style={{ marginBottom: 0 }}>
                                <Input value={bulkRecordedBy} onChange={(e) => setBulkRecordedBy(e.target.value)} style={{ borderRadius: 10 }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Récepteur (Reçu par)" required style={{ marginBottom: 0 }}>
                                <Input value={bulkReceivedBy} onChange={(e) => setBulkReceivedBy(e.target.value)} style={{ borderRadius: 10 }} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="Source / Fournisseur" required style={{ marginBottom: 0 }}>
                                <Input placeholder="Ex: Hôpital central, Pharmacie" value={bulkSupplier} onChange={(e) => setBulkSupplier(e.target.value)} style={{ borderRadius: 10 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Bulk Proof Photo */}
                    <div style={{ marginTop: 16 }}>
                        <Text style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Bon de livraison / Facture de preuve</Text>
                        {bulkProofPhoto ? (
                            <div style={{ position: 'relative', width: '100%', borderRadius: 12, overflow: 'hidden', border: `2px solid ${CRC.redBorder}` }}>
                                <img src={bulkProofPhoto} alt="Preuve lot" style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }} />
                                <Button 
                                    size="small" type="primary" danger shape="circle" icon={<CloseOutlined />} 
                                    onClick={() => setBulkProofPhoto('')}
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                />
                            </div>
                        ) : (
                            <div
                                onClick={() => bulkFileRef.current?.click()}
                                style={{ border: `2px dashed ${CRC.redBorder}`, borderRadius: 12, padding: '16px', textAlign: 'center', cursor: 'pointer', background: CRC.redBg }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = CRC.red)}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = CRC.redBorder)}
                            >
                                <CameraOutlined style={{ color: CRC.red, fontSize: 22, marginBottom: 4 }} />
                                <div><Text strong style={{ color: CRC.red, fontSize: 12 }}>Uploader le Bon de Livraison / Facture global</Text></div>
                                <input ref={bulkFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const r = new FileReader();
                                        r.onloadend = () => setBulkProofPhoto(r.result as string);
                                        r.readAsDataURL(file);
                                    }
                                }} />
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* ============ ITEM HISTORY DRAWER ============ */}
            <Drawer
                title={
                    <Space>
                        <HistoryOutlined style={{ color: CRC.red }} />
                        <span>Historique de l'article — {historyDrawer.item?.name}</span>
                    </Space>
                }
                open={historyDrawer.open}
                onClose={() => setHistoryDrawer({ open: false, item: null })}
                width={560}
                styles={{ header: { borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(224,28,46,0.08)'}` } }}
                extra={
                    historyDrawer.item && (
                        <Tag 
                            color={categoryCfg[historyDrawer.item.category]?.color}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                            {categoryCfg[historyDrawer.item.category]?.icon}
                            {categoryCfg[historyDrawer.item.category]?.label}
                        </Tag>
                    )
                }
            >
                {historyDrawer.item && (
                    <>
                        <div style={{ marginBottom: 16, padding: '14px 18px', background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb', borderRadius: 12, border: `1px solid ${CRC.redBorder}` }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Statistic title="Stock actuel" value={historyDrawer.item.currentQuantity} valueStyle={{ fontSize: 24, fontWeight: 800, color: CRC.red }} />
                                </Col>
                                <Col span={12}>
                                    <Statistic title="Seuil minimum" value={historyDrawer.item.minThreshold} valueStyle={{ fontSize: 24, color: '#888' }} />
                                </Col>
                            </Row>
                        </div>
                        <Divider style={{ margin: '12px 0' }} />
                        {itemMovementsLoading ? (
                            <div className="flex justify-center py-8"><Spin /></div>
                        ) : itemMovements.length > 0 ? (
                            <Table
                                columns={itemMovementColumns}
                                dataSource={itemMovements}
                                rowKey="id"
                                pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                size="small"
                                className="premium-table"
                            />
                        ) : (
                            <Empty description="Aucun mouvement enregistré pour cet article." />
                        )}
                    </>
                )}
            </Drawer>

            {/* ============ REJECTION REASON MODAL ============ */}
            <Modal
                title={
                    <Space style={{ color: CRC.red }}>
                        <StopOutlined />
                        <Text strong style={{ fontSize: 16 }}>Rejeter la demande de sortie</Text>
                    </Space>
                }
                open={rejectModalOpen}
                onOk={handleRejectMovement}
                onCancel={() => { setRejectModalOpen(false); setRejectingId(null); setRejectionReason(''); }}
                confirmLoading={rejectSubmitLoading}
                okText="Confirmer le rejet"
                okButtonProps={{ danger: true, style: { background: CRC.red, height: 40, borderRadius: 8 } }}
                cancelButtonProps={{ style: { height: 40, borderRadius: 8 } }}
                centered
                styles={{ content: { borderRadius: 20 } }}
            >
                <div style={{ padding: '8px 0' }}>
                    <Text style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Veuillez spécifier le motif du rejet :</Text>
                    <Input.TextArea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        placeholder="Ex: Justification insuffisante, stock nécessaire pour une autre priorité immédiate..."
                        style={{ borderRadius: 10 }}
                    />
                </div>
            </Modal>

            {/* ============ PHOTO PREVIEW MODAL ============ */}
            <Modal
                open={!!previewPhoto}
                footer={null}
                onCancel={() => setPreviewPhoto(null)}
                destroyOnClose
                centered
                styles={{ content: { borderRadius: 24, padding: 12, overflow: 'hidden' } }}
                width={680}
            >
                {previewPhoto && (
                    <div style={{ position: 'relative', width: '100%', maxHeight: '80vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={previewPhoto} alt="Preuve de mouvement" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 12 }} />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StocksPage;
