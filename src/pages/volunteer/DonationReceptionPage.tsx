// ============================================================
// NEXUS-AID — Validation & Réception des Dons — Espace Volontaire
// Interface de recherche de don, scan de QR Code, et validation
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
    Card, Typography, Input, Button, Space, Row, Col, Alert, Spin,
    Tag, List, Badge, Modal, Table, Form, Result, message
} from 'antd';
import {
    QrcodeOutlined, SearchOutlined, CheckCircleOutlined, GiftOutlined,
    ClockCircleOutlined, UserOutlined, FileTextOutlined,
    InfoCircleOutlined, DownloadOutlined, CloseOutlined,
    CameraOutlined, CheckOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import donationService, { type DonationReceipt } from '@/services/donationService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const DonationReceptionPage: React.FC = () => {
    const { user } = useAuthStore();
    const [searchCode, setSearchCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedDonation, setSelectedDonation] = useState<DonationReceipt | null>(null);
    const [validationNote, setValidationNote] = useState('');
    const [recentDonations, setRecentDonations] = useState<DonationReceipt[]>([]);
    
    // QR Scanner modal
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scanSimulatedList, setScanSimulatedList] = useState<DonationReceipt[]>([]);

    const committeeId = user?.committeeId || (user as any)?.rawRoles?.[0]?.committeeId;

    // Load recent donations of this committee
    const loadCommitteeDonations = async () => {
        if (!committeeId) return;
        try {
            const data = await donationService.getCommitteeDonations(committeeId);
            setRecentDonations(data || []);
        } catch (e) {
            console.error('Failed to load committee donations:', e);
        }
    };

    useEffect(() => {
        loadCommitteeDonations();
    }, [committeeId]);

    // Handle search by donation number
    const handleSearch = async (codeStr?: string) => {
        const query = (codeStr || searchCode).trim();
        if (!query) {
            message.warning('Veuillez saisir un numéro de don.');
            return;
        }

        setLoading(true);
        setSelectedDonation(null);
        try {
            // Check if it is a full QR string or just the number
            let donationNumber = query;
            if (query.startsWith('DON:')) {
                // Format: DON:donationId|CMT:committeeId|...
                // Extract UUID or donation number
                const parts = query.split('|');
                const donPart = parts[0].replace('DON:', '');
                // It could be a UUID, let's try fetching by ID first
                try {
                    const res = await donationService.getDonationById(donPart);
                    setSelectedDonation(res);
                    setSearchCode(res.donationNumber);
                    message.success('Don trouvé par code QR !');
                    setLoading(false);
                    return;
                } catch {
                    // fallback to donation number search if ID fetch fails
                    donationNumber = donPart;
                }
            }

            const res = await donationService.getDonationByNumber(donationNumber);
            setSelectedDonation(res);
            message.success('Don trouvé !');
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Aucun don trouvé avec ce numéro.');
        } finally {
            setLoading(false);
        }
    };

    // Handle validation submit
    const handleValidate = async () => {
        if (!selectedDonation) return;
        setActionLoading(true);
        try {
            const donationId = selectedDonation.donationId;
            const updated = await donationService.validateDonation(donationId, validationNote);
            setSelectedDonation(updated);
            message.success('Le reçu du don a été validé avec succès !');
            setValidationNote('');
            loadCommitteeDonations(); // refresh recent
        } catch (err: any) {
            message.error(err?.response?.data?.message || 'Erreur lors de la validation.');
        } finally {
            setActionLoading(false);
        }
    };

    // Open scanner simulation
    const handleOpenScanner = () => {
        // filter pending ones for the simulation select list
        const pending = recentDonations.filter(d => d.status === 'PENDING_RECEPTION');
        setScanSimulatedList(pending);
        setIsScannerOpen(true);
    };

    // Simulate Scanning QR code
    const handleSimulateScan = (donation: DonationReceipt) => {
        setIsScannerOpen(false);
        // Format: DON:donationId|CMT:committeeId|TYPE:donationType|QTY:quantity|TS:timestamp
        const qrString = `DON:${donation.donationId}|CMT:${committeeId}|TYPE:${donation.donationType}|QTY:${donation.quantity}|TS:${Date.now()}`;
        handleSearch(qrString);
    };

    // Helper color maps
    const statusColors: Record<string, string> = {
        PENDING_RECEPTION: 'orange',
        RECEIVED: 'blue',
        VALIDATED: 'green',
    };

    const statusLabels: Record<string, string> = {
        PENDING_RECEPTION: 'En attente de réception',
        RECEIVED: 'Reçu',
        VALIDATED: 'Validé',
    };

    // Table columns for recent donations
    const columns = [
        {
            title: 'N° Don',
            dataIndex: 'donationNumber',
            key: 'donationNumber',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Catégorie',
            dataIndex: 'donationType',
            key: 'donationType',
            render: (type: string) => <Tag color="blue">{type}</Tag>,
        },
        {
            title: 'Quantité',
            dataIndex: 'quantity',
            key: 'quantity',
        },
        {
            title: 'Statut',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={statusColors[status] || 'default'}>
                    {statusLabels[status] || status}
                </Tag>
            ),
        },
        {
            title: 'Reçu N°',
            dataIndex: 'receiptNumber',
            key: 'receiptNumber',
            render: (text: string) => text ? <Text type="secondary">{text}</Text> : <Text disabled>—</Text>,
        },
        {
            title: 'Date de dépôt',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => new Date(date).toLocaleDateString('fr-FR'),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: DonationReceipt) => (
                <Button 
                    type="link" 
                    icon={<SearchOutlined />} 
                    onClick={() => {
                        setSearchCode(record.donationNumber);
                        handleSearch(record.donationNumber);
                    }}
                >
                    Voir
                </Button>
            ),
        },
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 8px' }}>
            <Card style={{ borderRadius: 20, marginBottom: 24, background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: 'none' }}>
                <Row align="middle" gutter={24}>
                    <Col xs={24} md={18}>
                        <Title level={2} style={{ color: '#fff', margin: 0 }}>
                            Réception & Validation des Dons physiques
                        </Title>
                        <Paragraph style={{ color: 'rgba(255,255,255,0.7)', margin: '8px 0 0', fontSize: 15 }}>
                            Scannez le QR Code fourni par le donateur lors de son dépôt physique de fournitures, ou recherchez le don par son numéro unique pour en confirmer la réception et générer le reçu officiel.
                        </Paragraph>
                    </Col>
                    <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 48 }}>🎁</div>
                    </Col>
                </Row>
            </Card>

            <Row gutter={24}>
                {/* --- Left Column: Search & Details --- */}
                <Col xs={24} lg={15}>
                    {/* Search & Scan Box */}
                    <Card style={{ borderRadius: 16, marginBottom: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <Space direction="vertical" style={{ width: '100%' }} size={16}>
                            <Text strong style={{ fontSize: 16 }}>Recherche du don</Text>
                            <Row gutter={12}>
                                <Col xs={24} sm={14}>
                                    <Input
                                        placeholder="Ex: DON-2026-1025 ou scannez QR"
                                        prefix={<GiftOutlined style={{ color: '#C81E1E' }} />}
                                        value={searchCode}
                                        onChange={(e) => setSearchCode(e.target.value)}
                                        onPressEnter={() => handleSearch()}
                                        size="large"
                                        style={{ borderRadius: 10 }}
                                    />
                                </Col>
                                <Col xs={12} sm={5}>
                                    <Button
                                        type="primary"
                                        icon={<SearchOutlined />}
                                        onClick={() => handleSearch()}
                                        block
                                        size="large"
                                        style={{ borderRadius: 10, background: '#C81E1E', borderColor: '#C81E1E' }}
                                        loading={loading}
                                    >
                                        Rechercher
                                    </Button>
                                </Col>
                                <Col xs={12} sm={5}>
                                    <Button
                                        type="default"
                                        icon={<QrcodeOutlined />}
                                        onClick={handleOpenScanner}
                                        block
                                        size="large"
                                        style={{ borderRadius: 10 }}
                                    >
                                        Scanner QR
                                    </Button>
                                </Col>
                            </Row>
                        </Space>
                    </Card>

                    {/* Loading State */}
                    {loading && (
                        <Card style={{ borderRadius: 16, textAlign: 'center', padding: 40 }}>
                            <Spin size="large" tip="Chargement des informations du don..." />
                        </Card>
                    )}

                    {/* Donation Details View */}
                    {!loading && selectedDonation && (
                        <Card 
                            style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                            title={
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <Space>
                                        <FileTextOutlined style={{ color: '#C81E1E', fontSize: 18 }} />
                                        <Text strong style={{ fontSize: 16 }}>Détails du Don : {selectedDonation.donationNumber}</Text>
                                    </Space>
                                    <Tag color={statusColors[selectedDonation.status] || 'default'} style={{ margin: 0, padding: '2px 10px', borderRadius: 6, fontWeight: 600 }}>
                                        {statusLabels[selectedDonation.status] || selectedDonation.status}
                                    </Tag>
                                </div>
                            }
                        >
                            <Row gutter={[24, 24]}>
                                <Col xs={24} sm={12}>
                                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Type de don</Text>
                                            <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>{selectedDonation.donationType}</Tag>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Quantité déposée</Text>
                                            <Text strong style={{ fontSize: 15 }}>{selectedDonation.quantity}</Text>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Description / Spécifications</Text>
                                            <Text style={{ fontSize: 14 }}>{selectedDonation.description || 'Aucune description'}</Text>
                                        </div>
                                    </Space>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Space direction="vertical" size={12} style={{ width: '100%' }}>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Comité destinataire</Text>
                                            <Text strong style={{ fontSize: 14 }}>
                                                <EnvironmentOutlined style={{ marginRight: 6, color: '#C81E1E' }} />
                                                {selectedDonation.committeeName}
                                            </Text>
                                        </div>
                                        <div>
                                            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>Date de soumission</Text>
                                            <Text style={{ fontSize: 14 }}>{new Date(selectedDonation.createdAt).toLocaleString('fr-FR')}</Text>
                                        </div>
                                    </Space>
                                </Col>
                            </Row>

                            {/* Action Form if PENDING_RECEPTION */}
                            {selectedDonation.status === 'PENDING_RECEPTION' && (
                                <div style={{ marginTop: 24, padding: 20, background: 'rgba(200, 30, 30, 0.02)', border: '1px solid rgba(200, 30, 30, 0.1)', borderRadius: 12 }}>
                                    <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                        <Text strong style={{ color: '#C81E1E' }}>Formulaire de validation physique</Text>
                                        <div>
                                            <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                                                Note / Remarques (Optionnel) — ex. état des fournitures, date exacte de réception...
                                            </Text>
                                            <TextArea
                                                rows={3}
                                                placeholder="Saisissez des détails additionnels si nécessaire..."
                                                value={validationNote}
                                                onChange={(e) => setValidationNote(e.target.value)}
                                                style={{ borderRadius: 8 }}
                                            />
                                        </div>
                                        <Button
                                            type="primary"
                                            icon={<CheckCircleOutlined />}
                                            size="large"
                                            onClick={handleValidate}
                                            loading={actionLoading}
                                            style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 8 }}
                                            block
                                        >
                                            Confirmer la Réception physique et Valider le Don
                                        </Button>
                                    </Space>
                                </div>
                            )}

                            {/* Validation Result info if VALIDATED */}
                            {selectedDonation.status === 'VALIDATED' && (
                                <div style={{ marginTop: 24 }}>
                                    <Alert
                                        message={<Text strong style={{ color: '#14532d' }}>Don Validé & Enregistré</Text>}
                                        description={
                                            <div style={{ marginTop: 8 }}>
                                                <Paragraph style={{ margin: 0 }}>
                                                    Le reçu officiel de ce don a été généré sous le numéro : <strong>{selectedDonation.receiptNumber}</strong>.
                                                </Paragraph>
                                                {selectedDonation.validatedAt && (
                                                    <Paragraph style={{ margin: '4px 0 0' }}>
                                                        Validé le : {new Date(selectedDonation.validatedAt).toLocaleString('fr-FR')}
                                                    </Paragraph>
                                                )}
                                                {selectedDonation.validationNote && (
                                                    <Paragraph style={{ margin: '4px 0 0', fontStyle: 'italic' }}>
                                                        Note de validation : "{selectedDonation.validationNote}"
                                                    </Paragraph>
                                                )}
                                                <Button
                                                    type="primary"
                                                    icon={<DownloadOutlined />}
                                                    style={{ marginTop: 14, background: '#166534', borderColor: '#166534', borderRadius: 8 }}
                                                    href={`/api/v1/admin/donations/receipts/pdf/${selectedDonation.receiptNumber}`}
                                                    target="_blank"
                                                >
                                                    Télécharger le reçu officiel PDF
                                                </Button>
                                            </div>
                                        }
                                        type="success"
                                        showIcon
                                        style={{ borderRadius: 12, border: '1px solid rgba(22,163,74,0.2)' }}
                                    />
                                </div>
                            )}
                        </Card>
                    )}
                </Col>

                {/* --- Right Column: Recent Committee Activity --- */}
                <Col xs={24} lg={9}>
                    <Card 
                        style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: 400 }}
                        title={
                            <Space>
                                <ClockCircleOutlined style={{ color: '#C81E1E' }} />
                                <Text strong style={{ fontSize: 16 }}>Dons du Comité</Text>
                            </Space>
                        }
                    >
                        <List
                            dataSource={recentDonations.slice(0, 8)}
                            renderItem={(item) => (
                                <List.Item
                                    style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                                    onClick={() => {
                                        setSearchCode(item.donationNumber);
                                        handleSearch(item.donationNumber);
                                    }}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: item.status === 'VALIDATED' ? '#ecfdf5' : '#fffbe5',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: item.status === 'VALIDATED' ? '#10b981' : '#f59e0b'
                                            }}>
                                                <GiftOutlined />
                                            </div>
                                        }
                                        title={
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text strong style={{ fontSize: 13 }}>{item.donationNumber}</Text>
                                                <Tag color={statusColors[item.status] || 'default'} style={{ fontSize: 9, margin: 0, lineHeight: 1.5 }}>
                                                    {item.status === 'VALIDATED' ? 'Validé' : 'À valider'}
                                                </Tag>
                                            </div>
                                        }
                                        description={
                                            <div style={{ fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                                                <Text type="secondary">{item.donationType} ({item.quantity})</Text>
                                                <Text type="secondary">{new Date(item.createdAt).toLocaleDateString('fr-FR')}</Text>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: <Text type="secondary">Aucun dépôt récent dans ce comité.</Text> }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* --- QR Simulator Modal --- */}
            <Modal
                title={
                    <Space>
                        <QrcodeOutlined style={{ color: '#C81E1E' }} />
                        <span>Simulateur de Scan QR Code</span>
                    </Space>
                }
                open={isScannerOpen}
                onCancel={() => setIsScannerOpen(false)}
                footer={null}
                width={500}
                style={{ borderRadius: 16 }}
            >
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{
                        width: 200, height: 200, border: '4px solid #C81E1E', borderRadius: 16,
                        margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#f8fafc', position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ fontSize: 64 }}>📷</div>
                        {/* laser scan line */}
                        <div style={{
                            position: 'absolute', left: 0, right: 0, height: 4, background: '#C81E1E',
                            boxShadow: '0 0 10px #C81E1E', top: '50%', transform: 'translateY(-50%)',
                            animation: 'scan-laser 2s infinite ease-in-out'
                        }} />
                        <style>{`
                            @keyframes scan-laser {
                                0% { top: 10%; }
                                50% { top: 90%; }
                                100% { top: 10%; }
                            }
                        `}</style>
                    </div>

                    <Paragraph style={{ fontSize: 14 }}>
                        Pour simuler le scan du QR Code imprimé sur la fiche du donateur, sélectionnez l'un des dépôts <strong>en attente de réception</strong> dans votre comité ci-dessous :
                    </Paragraph>

                    <div style={{ maxHeight: 250, overflowY: 'auto', textAlign: 'left', border: '1px solid #e5e7eb', borderRadius: 10, padding: 8 }}>
                        <List
                            dataSource={scanSimulatedList}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        <Button type="primary" size="small" icon={<CameraOutlined />} onClick={() => handleSimulateScan(item)}>
                                            Scanner
                                        </Button>
                                    ]}
                                    style={{ padding: '8px 12px' }}
                                >
                                    <List.Item.Meta
                                        title={<Text strong style={{ fontSize: 13 }}>{item.donationNumber}</Text>}
                                        description={<Text type="secondary" style={{ fontSize: 11 }}>{item.donationType} ({item.quantity})</Text>}
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: <Text type="secondary" style={{ display: 'block', padding: 12 }}>Aucun don en attente de réception pour la simulation.</Text> }}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DonationReceptionPage;
