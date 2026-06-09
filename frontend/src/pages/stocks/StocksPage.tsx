// ============================================================
// NEXUS-AID — Stocks Page (Inventory Management)
// Full CRUD, stock movements, alerts, export
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Card, Col, Row, Table, Tag, Input, Select, Typography, Space,
    Statistic, Button, message, Spin, Empty, Modal, InputNumber, Tabs,
    Drawer, Popconfirm, Form, Badge, Tooltip, Divider,
} from 'antd';
import {
    InboxOutlined, SearchOutlined, FilterOutlined, PlusOutlined,
    DownloadOutlined, ExclamationCircleOutlined,
    ArrowUpOutlined, ArrowDownOutlined, AlertOutlined,
    EditOutlined, DeleteOutlined, HistoryOutlined, CheckCircleOutlined,
    ClockCircleOutlined, WarningOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { ColumnsType } from 'antd/es/table';
import { useAuthStore } from '@/stores';
import inventoryService from '@/services/inventoryService';
import type { InventoryItemDTO, StockMovementResponse, StockAlertDTO } from '@/types';

const { Title, Text } = Typography;

const categoryCfg: Record<string, { color: string; label: string }> = {
    MEDICAL:     { color: 'red',    label: '🏥 Médical' },
    CLOTHING:    { color: 'blue',   label: '👕 Vêtements' },
    FOOD:        { color: 'green',  label: '🍛 Alimentaire' },
    EQUIPMENT:   { color: 'purple', label: '🔧 Équipement' },
    RESCUE_GEAR: { color: 'orange', label: '🚑 Secours' },
};

const severityCfg: Record<string, { color: string }> = {
    LOW:      { color: 'blue' },
    MEDIUM:   { color: 'gold' },
    HIGH:     { color: 'orange' },
    CRITICAL: { color: 'red' },
};

const alertTypeCfg: Record<string, { label: string; icon: React.ReactNode }> = {
    EXPIRY:      { label: 'Expiration',  icon: <ClockCircleOutlined /> },
    MIN_STOCK:   { label: 'Stock Min',   icon: <WarningOutlined /> },
    TEMPERATURE: { label: 'Température', icon: <AlertOutlined /> },
};

const StocksPage: React.FC = () => {
    const { t } = useTranslation();
    const user = useAuthStore((s) => s.user);

    // --- Data State ---
    const [items, setItems] = useState<InventoryItemDTO[]>([]);
    const [alerts, setAlerts] = useState<StockAlertDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [alertsLoading, setAlertsLoading] = useState(false);

    // --- Filters ---
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState<string | null>(null);

    // --- Create / Edit Modal ---
    const [itemModal, setItemModal] = useState<{ open: boolean; editing: InventoryItemDTO | null }>({ open: false, editing: null });
    const [itemForm] = Form.useForm();
    const [itemSaving, setItemSaving] = useState(false);

    // --- Movement Modal ---
    const [movementModal, setMovementModal] = useState<{ visible: boolean; type: 'in' | 'out'; item: InventoryItemDTO | null }>({ visible: false, type: 'in', item: null });
    const [movementQty, setMovementQty] = useState(1);
    const [movementReason, setMovementReason] = useState('');
    const [movementLoading, setMovementLoading] = useState(false);

    // --- History Drawer ---
    const [historyDrawer, setHistoryDrawer] = useState<{ open: boolean; item: InventoryItemDTO | null }>({ open: false, item: null });
    const [movements, setMovements] = useState<StockMovementResponse[]>([]);
    const [movementsLoading, setMovementsLoading] = useState(false);

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

    useEffect(() => {
        fetchItems();
        fetchAlerts();
    }, [fetchItems, fetchAlerts]);

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
                });
                message.success('Article mis à jour');
            } else {
                await inventoryService.create({
                    name: values.name,
                    category: values.category,
                    initialQuantity: values.initialQuantity || 0,
                    minThreshold: values.minThreshold,
                    committeeId: user!.committeeId!,
                });
                message.success('Article créé avec succès');
            }
            setItemModal({ open: false, editing: null });
            fetchItems();
        } catch {
            message.error('Erreur lors de la sauvegarde');
        } finally {
            setItemSaving(false);
        }
    };

    const handleDelete = async (item: InventoryItemDTO) => {
        try {
            await inventoryService.delete(item.id);
            message.success(`"${item.name}" supprimé`);
            fetchItems();
        } catch {
            message.error('Erreur lors de la suppression');
        }
    };

    const handleMovement = async () => {
        if (!movementModal.item) return;
        setMovementLoading(true);
        try {
            const payload = { quantity: movementQty, reason: movementReason || 'Mouvement de stock' };
            if (movementModal.type === 'in') {
                await inventoryService.stockIn(movementModal.item.id, payload);
                message.success(`+${movementQty} ${movementModal.item.name}`);
            } else {
                await inventoryService.stockOut(movementModal.item.id, payload);
                message.success(`-${movementQty} ${movementModal.item.name}`);
            }
            setMovementModal({ visible: false, type: 'in', item: null });
            fetchItems();
        } catch {
            message.error('Erreur lors du mouvement');
        } finally {
            setMovementLoading(false);
        }
    };

    const openHistory = async (item: InventoryItemDTO) => {
        setHistoryDrawer({ open: true, item });
        setMovementsLoading(true);
        try {
            const data = await inventoryService.getMovements(item.id);
            setMovements(data);
        } catch {
            setMovements([]);
        } finally {
            setMovementsLoading(false);
        }
    };

    const handleResolveAlert = async (alertId: string) => {
        try {
            await inventoryService.resolveAlert(alertId);
            message.success('Alerte résolue');
            fetchAlerts();
        } catch {
            message.error('Erreur lors de la résolution');
        }
    };

    const handleExport = () => {
        if (items.length === 0) { message.info('Aucun article à exporter'); return; }
        const headers = ['Nom', 'Catégorie', 'Quantité', 'Seuil Min'];
        const rows = items.map(i => [i.name, i.category, i.currentQuantity, i.minThreshold].join(';'));
        const csv = [headers.join(';'), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventaire_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Export CSV téléchargé');
    };

    // ======================== DERIVED ========================

    const filtered = items.filter(item => {
        const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = !catFilter || item.category === catFilter;
        return matchSearch && matchCat;
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
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: isLow ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isLow ? <ExclamationCircleOutlined style={{ color: '#ef4444' }} /> : <InboxOutlined style={{ color: '#6366f1' }} />}
                        </div>
                        <div>
                            <Text strong style={{ fontSize: 13 }}>{name}</Text>
                            {isLow && <div><Tag color="red" bordered={false} style={{ fontSize: 10 }}>Stock bas!</Tag></div>}
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
                const cfg = categoryCfg[cat] || { color: 'default', label: cat };
                return <Tag color={cfg.color} bordered={false}>{cfg.label}</Tag>;
            },
            responsive: ['md'],
        },
        {
            title: 'Quantité',
            dataIndex: 'currentQuantity',
            key: 'currentQuantity',
            sorter: (a, b) => a.currentQuantity - b.currentQuantity,
            render: (q: number, r) => (
                <Text strong style={{ fontSize: 14, color: q <= r.minThreshold ? '#ef4444' : undefined }}>
                    {q}
                </Text>
            ),
        },
        {
            title: 'Seuil min',
            dataIndex: 'minThreshold',
            key: 'minThreshold',
            render: (t: number) => <Text style={{ fontSize: 12, color: '#999' }}>{t}</Text>,
            responsive: ['lg'],
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 280,
            render: (_, r) => (
                <Space size="small" wrap>
                    <Tooltip title="Entrée">
                        <Button size="small" icon={<ArrowUpOutlined />} onClick={() => {
                            setMovementModal({ visible: true, type: 'in', item: r });
                            setMovementQty(1); setMovementReason('');
                        }}>Entrée</Button>
                    </Tooltip>
                    <Tooltip title="Sortie">
                        <Button size="small" danger icon={<ArrowDownOutlined />} onClick={() => {
                            setMovementModal({ visible: true, type: 'out', item: r });
                            setMovementQty(1); setMovementReason('');
                        }}>Sortie</Button>
                    </Tooltip>
                    <Tooltip title="Historique">
                        <Button size="small" icon={<HistoryOutlined />} onClick={() => openHistory(r)} />
                    </Tooltip>
                    <Tooltip title="Modifier">
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} />
                    </Tooltip>
                    <Popconfirm title={`Supprimer "${r.name}" ?`} description="Cette action est irréversible." onConfirm={() => handleDelete(r)} okText="Supprimer" cancelText="Annuler" okButtonProps={{ danger: true }}>
                        <Tooltip title="Supprimer">
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const movementColumns: ColumnsType<StockMovementResponse> = [
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
                <Text strong style={{ color: r.type === 'IN' ? '#16a34a' : '#ef4444' }}>
                    {r.type === 'IN' ? '+' : '-'}{q}
                </Text>
            ),
        },
        { title: 'Motif', dataIndex: 'reason', key: 'reason' },
        {
            title: 'Date',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 160,
            render: (ts: string) => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        },
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
            title: '',
            key: 'action',
            width: 120,
            render: (_, r) => !r.resolvedAt ? (
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleResolveAlert(r.id)} style={{ background: '#16a34a' }}>
                    Résoudre
                </Button>
            ) : null,
        },
    ];

    // ======================== RENDER ========================

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <Title level={3} className="!mb-1">{t('nav.stocks')}</Title>
                    <Text type="secondary">Gestion de l'inventaire — {user?.committeeName || 'Comité'}</Text>
                </div>
                <Space>
                    <Button icon={<DownloadOutlined />} onClick={handleExport}>Exporter</Button>
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} style={{ background: '#C81E1E' }}>
                        Ajouter
                    </Button>
                </Space>
            </div>

            {/* Stats */}
            <Row gutter={[12, 12]} className="mb-5">
                {[
                    { title: 'Articles',     value: items.length, icon: <InboxOutlined />, color: '#6366f1' },
                    { title: 'Stock bas',    value: lowStock.length, icon: <AlertOutlined />, color: '#ef4444' },
                    { title: 'Catégories',   value: new Set(items.map(i => i.category)).size, icon: <FilterOutlined />, color: '#f59e0b' },
                    { title: 'Total unités', value: items.reduce((s, i) => s + i.currentQuantity, 0), icon: <InboxOutlined />, color: '#16a34a' },
                ].map((s) => (
                    <Col xs={12} md={6} key={s.title}>
                        <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, fontSize: 16 }}>
                                    {s.icon}
                                </div>
                                <Statistic title={s.title} value={s.value} valueStyle={{ fontSize: 20, fontWeight: 700 }} />
                            </div>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Tabs: Inventory + Alerts */}
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
                {
                    key: 'inventory',
                    label: <Space><InboxOutlined />Inventaire</Space>,
                    children: (
                        <Card styles={{ body: { padding: '16px 20px' } }}>
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                <Input
                                    prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                                    placeholder="Rechercher un article..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ width: 260 }}
                                    allowClear
                                />
                                <Select
                                    placeholder="Catégorie"
                                    allowClear
                                    style={{ width: 180 }}
                                    value={catFilter}
                                    onChange={setCatFilter}
                                    suffixIcon={<FilterOutlined />}
                                    options={Object.entries(categoryCfg).map(([k, v]) => ({ value: k, label: v.label }))}
                                />
                                <Text style={{ fontSize: 12, color: '#999', marginLeft: 'auto' }}>
                                    {filtered.length} article{filtered.length > 1 ? 's' : ''}
                                </Text>
                            </div>
                            {loading ? (
                                <div className="flex justify-center py-12"><Spin size="large" /></div>
                            ) : filtered.length > 0 ? (
                                <Table
                                    columns={columns}
                                    dataSource={filtered}
                                    rowKey="id"
                                    pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `${total} articles` }}
                                    size="middle"
                                    scroll={{ x: 800 }}
                                />
                            ) : (
                                <Empty description="Aucun article en stock" />
                            )}
                        </Card>
                    ),
                },
                {
                    key: 'alerts',
                    label: (
                        <Badge count={activeAlerts.length} offset={[10, 0]} size="small">
                            <Space><AlertOutlined />Alertes</Space>
                        </Badge>
                    ),
                    children: (
                        <Card styles={{ body: { padding: '16px 20px' } }}>
                            <div className="flex items-center justify-between mb-4">
                                <Text strong style={{ fontSize: 15 }}>
                                    Alertes de stock ({activeAlerts.length} active{activeAlerts.length > 1 ? 's' : ''})
                                </Text>
                                <Button size="small" onClick={fetchAlerts} loading={alertsLoading}>
                                    Rafraîchir
                                </Button>
                            </div>
                            {alertsLoading ? (
                                <div className="flex justify-center py-12"><Spin size="large" /></div>
                            ) : alerts.length > 0 ? (
                                <Table
                                    columns={alertColumns}
                                    dataSource={alerts}
                                    rowKey="id"
                                    pagination={{ pageSize: 10 }}
                                    size="middle"
                                />
                            ) : (
                                <Empty description="Aucune alerte" />
                            )}
                        </Card>
                    ),
                },
            ]} />

            {/* ============ CREATE / EDIT MODAL ============ */}
            <Modal
                title={itemModal.editing ? '✏️ Modifier l\'article' : '➕ Nouvel article'}
                open={itemModal.open}
                onOk={handleItemSave}
                onCancel={() => setItemModal({ open: false, editing: null })}
                confirmLoading={itemSaving}
                okText={itemModal.editing ? 'Mettre à jour' : 'Créer'}
                okButtonProps={{ style: { background: '#C81E1E' } }}
                destroyOnHidden
            >
                <Form form={itemForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item name="name" label="Nom de l'article" rules={[{ required: true, message: 'Nom requis' }]}>
                        <Input placeholder="Ex: Bandages stériles, Couvertures..." />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="category" label="Catégorie" rules={[{ required: true, message: 'Catégorie requise' }]}>
                                <Select placeholder="Sélectionner">
                                    {Object.entries(categoryCfg).map(([k, v]) => (
                                        <Select.Option key={k} value={k}>{v.label}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="minThreshold" label="Seuil minimum" rules={[{ required: true, message: 'Seuil requis' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="Ex: 10" />
                            </Form.Item>
                        </Col>
                    </Row>
                    {!itemModal.editing && (
                        <Form.Item name="initialQuantity" label="Quantité initiale">
                            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* ============ MOVEMENT MODAL ============ */}
            <Modal
                title={movementModal.type === 'in' ? '📥 Entrée de stock' : '📤 Sortie de stock'}
                open={movementModal.visible}
                onOk={handleMovement}
                onCancel={() => setMovementModal({ visible: false, type: 'in', item: null })}
                confirmLoading={movementLoading}
                okText={movementModal.type === 'in' ? 'Confirmer entrée' : 'Confirmer sortie'}
                okButtonProps={{ style: { background: movementModal.type === 'in' ? '#16a34a' : '#ef4444' } }}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text strong>{movementModal.item?.name}</Text>
                    <Text style={{ color: '#999', marginLeft: 8 }}>(Stock actuel: {movementModal.item?.currentQuantity})</Text>
                </div>
                <div style={{ marginBottom: 16 }}>
                    <Text style={{ display: 'block', marginBottom: 8 }}>Quantité</Text>
                    <InputNumber
                        min={1}
                        max={movementModal.type === 'out' ? movementModal.item?.currentQuantity : 9999}
                        value={movementQty}
                        onChange={(v) => setMovementQty(v || 1)}
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <Text style={{ display: 'block', marginBottom: 8 }}>Motif</Text>
                    <Input.TextArea
                        value={movementReason}
                        onChange={(e) => setMovementReason(e.target.value)}
                        rows={2}
                        placeholder="Ex: Nouveau lot, utilisation terrain..."
                    />
                </div>
            </Modal>

            {/* ============ HISTORY DRAWER ============ */}
            <Drawer
                title={
                    <Space>
                        <HistoryOutlined />
                        <span>Historique — {historyDrawer.item?.name}</span>
                    </Space>
                }
                open={historyDrawer.open}
                onClose={() => setHistoryDrawer({ open: false, item: null })}
                width={560}
                extra={
                    historyDrawer.item && (
                        <Tag color={categoryCfg[historyDrawer.item.category]?.color}>
                            {categoryCfg[historyDrawer.item.category]?.label}
                        </Tag>
                    )
                }
            >
                {historyDrawer.item && (
                    <>
                        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f9fafb', borderRadius: 8 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Statistic title="Stock actuel" value={historyDrawer.item.currentQuantity} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                                </Col>
                                <Col span={12}>
                                    <Statistic title="Seuil minimum" value={historyDrawer.item.minThreshold} valueStyle={{ fontSize: 24, color: '#999' }} />
                                </Col>
                            </Row>
                        </div>
                        <Divider style={{ margin: '12px 0' }} />
                        {movementsLoading ? (
                            <div className="flex justify-center py-8"><Spin /></div>
                        ) : movements.length > 0 ? (
                            <Table
                                columns={movementColumns}
                                dataSource={movements}
                                rowKey="id"
                                pagination={{ pageSize: 8 }}
                                size="small"
                            />
                        ) : (
                            <Empty description="Aucun mouvement enregistré" />
                        )}
                    </>
                )}
            </Drawer>
        </div>
    );
};

export default StocksPage;
