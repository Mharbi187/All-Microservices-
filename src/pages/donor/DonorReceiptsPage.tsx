// ============================================================
// NEXUS-AID — Donor Receipts Page
// Lists all donation receipts with status, QR, photo, PDF download
// ============================================================

import { useState, useEffect } from 'react';
import { Typography, Space, Tag, Button, Input, Select, Modal, Divider, Badge } from 'antd';
import {
    FileProtectOutlined, SearchOutlined, DownloadOutlined,
    CheckCircleOutlined, ClockCircleOutlined, QrcodeOutlined,
    FilterOutlined, EyeOutlined, EnvironmentOutlined,
    HeartOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/stores';
import { donationService, DonationReceipt as ApiDonationReceipt } from '@/services/donationService';

const { Title, Text } = Typography;

// ============================================================
// Types & Mock Data
// ============================================================
export interface UIRecipt extends ApiDonationReceipt {}

const TYPE_COLORS: Record<string, string> = {
    'Alimentaire': '#16a34a', 'Médical': '#0ea5e9', 'Équipement': '#8b5cf6',
    'Vêtements': '#f59e0b', 'Urgence': '#ef4444',
};
const TYPE_EMOJI: Record<string, string> = {
    'Alimentaire': '🍞', 'Médical': '🏥', 'Équipement': '⚙️', 'Vêtements': '👕', 'Urgence': '🚨',
};
const STATUS_CONFIG: Record<string, any> = {
    'PENDING_RECEPTION': { label: 'En attente', color: '#f59e0b', icon: <ClockCircleOutlined />, bg: 'rgba(245,158,11,0.1)' },
    'RECEIVED': { label: 'Reçu par comité', color: '#0ea5e9', icon: <CheckCircleOutlined />, bg: 'rgba(14,165,233,0.1)' },
    'VALIDATED': { label: '✅ Validé & Certifié', color: '#16a34a', icon: <CheckCircleOutlined />, bg: 'rgba(22,163,74,0.1)' },
    'DEFAULT': { label: 'Inconnu', color: '#999', icon: <ClockCircleOutlined />, bg: 'rgba(153,153,153,0.1)' },
};

// ============================================================
// QR Code Visual (reusable)
// ============================================================
const QRVisual: React.FC<{ donationId: string; size?: number; isDark?: boolean }> = ({ donationId, size = 120, isDark = false }) => {
    let seed = donationId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const gridSize = 8;
    const cells: JSX.Element[] = [];
    const isFinderPattern = (r: number, c: number) =>
        (r < 2 && c < 2) || (r < 2 && c >= gridSize - 2) || (r >= gridSize - 2 && c < 2);

    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            const filled = isFinderPattern(r, c) ? true : rand() > 0.45;
            const cellSize = (size - 24) / gridSize;
            cells.push(
                <rect key={`${r}-${c}`}
                    x={c * cellSize + 12} y={r * cellSize + 12}
                    width={cellSize - 2} height={cellSize - 2} rx={1.5}
                    fill={filled ? (isDark ? '#fff' : '#1a1a1a') : 'transparent'} />
            );
        }
    }
    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            <rect x={0} y={0} width={size} height={size} rx={6} fill={isDark ? '#1f2937' : '#fff'} />
            {cells}
            <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={14}>💝</text>
        </svg>
    );
};

// ============================================================
// Receipt Card
// ============================================================
const ReceiptCard: React.FC<{
    receipt: UIRecipt;
    isDark: boolean;
    onView: () => void;
    onDownloadPDF: () => void;
}> = ({ receipt, isDark, onView, onDownloadPDF }) => {
    const status = STATUS_CONFIG[receipt.status] || STATUS_CONFIG['DEFAULT'];
    const typeColor = TYPE_COLORS[receipt.donationType] || '#ccc';

    return (
        <div style={{
            background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
            borderRadius: 20,
            padding: '20px 24px',
            border: `1px solid ${receipt.status === 'VALIDATED' ? 'rgba(22,163,74,0.2)' : isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
            boxShadow: receipt.status === 'VALIDATED' && !isDark ? '0 2px 16px rgba(22,163,74,0.08)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
        }}>
            {/* QR Code */}
            <div style={{
                flexShrink: 0,
                background: isDark ? '#1f2937' : '#f8fafc',
                borderRadius: 12,
                padding: 8,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}`,
            }}>
                <QRVisual donationId={receipt.donationId} size={90} isDark={isDark} />
                <Text style={{ display: 'block', textAlign: 'center', fontSize: 9, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>
                    {receipt.donationId}
                </Text>
            </div>

            {/* Main Info */}
            <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div>
                        <Space size={6}>
                            <span style={{ fontSize: 18 }}>{TYPE_EMOJI[receipt.donationType] || '📦'}</span>
                            <Text strong style={{ fontSize: 16 }}>{receipt.committeeName}</Text>
                        </Space>
                        <Space size={4} style={{ display: 'block', marginTop: 4 }}>
                            <EnvironmentOutlined style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }} />
                            <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>
                                {new Date(receipt.createdAt).toLocaleDateString('fr-FR')}
                            </Text>
                        </Space>
                    </div>
                    <Tag style={{
                        background: status.bg,
                        color: status.color,
                        border: `1px solid ${status.color}30`,
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 12px',
                    }}>
                        {status.icon} {status.label}
                    </Tag>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    <Tag style={{ background: `${typeColor}12`, color: typeColor, border: 'none', borderRadius: 6, fontSize: 12 }}>
                        {receipt.donationType}
                    </Tag>
                    <Tag style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#f8fafc', color: isDark ? 'rgba(255,255,255,0.6)' : '#555', border: 'none', borderRadius: 6, fontSize: 12 }}>
                        📦 {receipt.quantity}
                    </Tag>
                </div>

                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : '#555', lineHeight: 1.5, display: 'block', marginBottom: 10 }}>
                    {receipt.description}
                </Text>

                {receipt.status === 'VALIDATED' && receipt.validatedAt && (
                    <div style={{
                        background: 'rgba(22,163,74,0.08)',
                        borderRadius: 8,
                        padding: '8px 12px',
                        border: '1px solid rgba(22,163,74,0.15)',
                        marginBottom: 12,
                    }}>
                        <Space size={6}>
                            <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 13 }} />
                            <Text style={{ fontSize: 12, color: '#16a34a' }}>
                                Validé le {new Date(receipt.validatedAt).toLocaleDateString('fr-FR')}
                            </Text>
                        </Space>
                    </div>
                )}

                <Space>
                    <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={onView}
                        style={{ borderRadius: 8, fontSize: 12 }}
                    >
                        Voir détails
                    </Button>
                    {receipt.status === 'VALIDATED' && (
                        <Button
                            size="small"
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={onDownloadPDF}
                            style={{
                                background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                                border: 'none',
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                        >
                            Reçu PDF
                        </Button>
                    )}
                    <Button
                        size="small"
                        icon={<QrcodeOutlined />}
                        onClick={onView}
                        style={{ borderRadius: 8, fontSize: 12 }}
                    >
                        QR Code
                    </Button>
                </Space>
            </div>
        </div>
    );
};

// ============================================================
// Receipt Detail Modal
// ============================================================
const ReceiptDetailModal: React.FC<{
    receipt: UIRecipt | null;
    onClose: () => void;
    isDark: boolean;
}> = ({ receipt, onClose, isDark }) => {
    if (!receipt) return null;
    const status = STATUS_CONFIG[receipt.status] || STATUS_CONFIG['DEFAULT'];
    const typeColor = TYPE_COLORS[receipt.donationType] || '#ccc';

    const handleGeneratePDF = () => {
        // In a real implementation this would use jsPDF or a backend PDF endpoint
        const content = `
NEXUS-AID — REÇU DE DON OFFICIEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID Donation: ${receipt.donationId}
Reçu N°: ${receipt.receiptNumber || receipt.id}
Date: ${new Date(receipt.createdAt).toLocaleDateString('fr-FR')}

DONATEUR: Utilisateur Nexus-AID
COMITÉ BÉNÉFICIAIRE: ${receipt.committeeName}

TYPE DE DON: ${receipt.donationType}
QUANTITÉ: ${receipt.quantity}
DESCRIPTION: ${receipt.description}

STATUT: ${status.label}
${receipt.validatedAt ? `DATE VALIDATION: ${new Date(receipt.validatedAt).toLocaleDateString('fr-FR')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ce document certifie la réception et validation du don.
100% transparent — Nexus-AID
        `.trim();

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Recu-${receipt.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Modal
            open={!!receipt}
            onCancel={onClose}
            footer={null}
            width={600}
            title={
                <Space>
                    <FileProtectOutlined style={{ color: '#16a34a' }} />
                    Reçu de Don — {receipt.receiptNumber || 'En attente'}
                </Space>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
                {/* Status banner */}
                <div style={{
                    background: status.bg,
                    borderRadius: 12,
                    padding: '14px 18px',
                    border: `1px solid ${status.color}25`,
                    textAlign: 'center',
                }}>
                    <Text style={{ color: status.color, fontWeight: 700, fontSize: 15 }}>
                        {status.icon} {status.label}
                    </Text>
                </div>

                {/* QR Code centered */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-block',
                        background: '#fff',
                        borderRadius: 16,
                        padding: 20,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        border: '1px solid #f0f0f0',
                    }}>
                        <QRVisual donationId={receipt.donationId} size={160} isDark={false} />
                        <Text style={{ display: 'block', marginTop: 8, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#16a34a' }}>
                            {receipt.donationId}
                        </Text>
                    </div>
                </div>

                <Divider />

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                        { label: 'Comité bénéficiaire', value: receipt.committeeName },
                        { label: 'Type de don', value: receipt.donationType },
                        { label: 'Quantité', value: receipt.quantity },
                        { label: 'Date du don', value: new Date(receipt.createdAt).toLocaleDateString('fr-FR') },
                        ...(receipt.validatedAt ? [
                            { label: 'Date validation', value: new Date(receipt.validatedAt).toLocaleDateString('fr-FR') },
                        ] : []),
                    ].map((item) => (
                        <div key={item.label} style={{
                            background: '#f8fafc',
                            borderRadius: 10,
                            padding: '10px 14px',
                            border: '1px solid #f0f0f0',
                        }}>
                            <Text style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 3 }}>{item.label}</Text>
                            <Text strong style={{ fontSize: 13 }}>{item.value}</Text>
                        </div>
                    ))}
                </div>

                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Description</Text>
                    <Text style={{ color: '#555', lineHeight: 1.6 }}>{receipt.description}</Text>
                </div>

                {receipt.validationNote && (
                    <div style={{ background: '#fffbeb', borderRadius: 10, padding: '12px 16px', border: '1px solid #fcd34d' }}>
                        <Text style={{ color: '#92400e', fontSize: 13 }}>📝 {receipt.validationNote}</Text>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 12 }}>
                    <Button block icon={<QrcodeOutlined />} style={{ borderRadius: 10, height: 44 }} onClick={onClose}>
                        Fermer
                    </Button>
                    <Button
                        block type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleGeneratePDF}
                        style={{
                            background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                            border: 'none',
                            borderRadius: 10,
                            height: 44,
                            fontWeight: 700,
                        }}
                    >
                        📄 Télécharger Reçu
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

// ============================================================
// Main Receipts Page
// ============================================================
const DonorReceiptsPage: React.FC = () => {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');
    const [selectedReceipt, setSelectedReceipt] = useState<UIRecipt | null>(null);
    const [receipts, setReceipts] = useState<UIRecipt[]>([]);

    useEffect(() => {
        const fetchReceipts = async () => {
            try {
                const data = await donationService.getMyReceipts();
                setReceipts(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchReceipts();
    }, []);

    const filteredReceipts = receipts.filter((r) => {
        if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
        if (filterType !== 'ALL' && r.donationType !== filterType) return false;
        if (search && !r.committeeName.toLowerCase().includes(search.toLowerCase()) && !r.donationId.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const validatedCount = receipts.filter(r => r.status === 'VALIDATED').length;
    const pendingCount = receipts.filter(r => r.status === 'PENDING_RECEPTION').length;

    return (
        <div style={{ background: isDark ? '#0f172a' : '#f0fdf4', margin: -24, padding: 24, minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                background: isDark ? 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))' : 'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(255,255,255,0.9))',
                borderRadius: 20, padding: '24px 28px', marginBottom: 24,
                border: '1px solid rgba(22,163,74,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #16a34a, #4ade80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 0 20px rgba(22,163,74,0.4)' }}>
                        🧾
                    </div>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Mes Reçus de Dons</Title>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13 }}>
                            {receipts.length} donation(s) — 100% traçables et certifiées
                        </Text>
                    </div>
                </div>
                <Space wrap>
                    <Badge count={validatedCount} color="#16a34a">
                        <Tag style={{ background: 'rgba(22,163,74,0.12)', color: '#16a34a', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13 }}>
                            ✅ Validés
                        </Tag>
                    </Badge>
                    <Badge count={pendingCount} color="#f59e0b">
                        <Tag style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13 }}>
                            ⏳ En attente
                        </Tag>
                    </Badge>
                </Space>
            </div>

            {/* Filters */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                borderRadius: 16, padding: '16px 20px', marginBottom: 20,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
            }}>
                <FilterOutlined style={{ color: '#16a34a' }} />
                <Input
                    placeholder="Chercher par comité, ville, ID..."
                    prefix={<SearchOutlined />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: 240, borderRadius: 8 }}
                />
                <Select
                    value={filterStatus}
                    onChange={setFilterStatus}
                    style={{ width: 180 }}
                    options={[
                        { value: 'ALL', label: 'Tous les statuts' },
                        { value: 'PENDING_RECEPTION', label: '⏳ En attente' },
                        { value: 'RECEIVED', label: '📦 Reçu' },
                        { value: 'VALIDATED', label: '✅ Validé' },
                    ]}
                />
                <Select
                    value={filterType}
                    onChange={setFilterType}
                    style={{ width: 160 }}
                    options={[
                        { value: 'ALL', label: 'Tous les types' },
                        { value: 'Alimentaire', label: '🍞 Alimentaire' },
                        { value: 'Médical', label: '🏥 Médical' },
                        { value: 'Équipement', label: '⚙️ Équipement' },
                        { value: 'Vêtements', label: '👕 Vêtements' },
                        { value: 'Urgence', label: '🚨 Urgence' },
                    ]}
                />
            </div>

            {/* Receipts list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {filteredReceipts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, background: isDark ? 'rgba(255,255,255,0.02)' : '#fff', borderRadius: 20, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}` }}>
                        <FileProtectOutlined style={{ fontSize: 48, color: isDark ? 'rgba(255,255,255,0.2)' : '#ddd', display: 'block', marginBottom: 12 }} />
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>Aucun reçu trouvé</Text>
                    </div>
                ) : filteredReceipts.map((receipt) => (
                    <ReceiptCard
                        key={receipt.id}
                        receipt={receipt}
                        isDark={isDark}
                        onView={() => setSelectedReceipt(receipt)}
                        onDownloadPDF={() => setSelectedReceipt(receipt)}
                    />
                ))}
            </div>

            {/* Transparency footer */}
            <div style={{
                marginTop: 24, padding: '14px 24px', borderRadius: 16,
                background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }}>
                    <strong style={{ color: '#16a34a' }}>100% Transparent</strong> — Chaque don est tracé : Don → QR Scan → Validation → Reçu certifié PDF
                </Text>
            </div>

            {/* Detail Modal */}
            <ReceiptDetailModal
                receipt={selectedReceipt}
                onClose={() => setSelectedReceipt(null)}
                isDark={isDark}
            />
        </div>
    );
};

export default DonorReceiptsPage;
