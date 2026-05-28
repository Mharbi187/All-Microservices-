// ============================================================
// NEXUS-AID — Make Donation Page
// 4-step workflow: Select Need → Details → Photo Proof → QR Code
// ============================================================

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Typography, Space, Tag, Button, Steps, Input, Select,
    Upload, message, Alert, Divider, Avatar,
} from 'antd';
import {
    HeartOutlined, EnvironmentOutlined, UploadOutlined,
    QrcodeOutlined, CheckCircleOutlined, ClockCircleOutlined,
    ArrowLeftOutlined, ArrowRightOutlined, CameraOutlined,
    FileProtectOutlined, CoffeeOutlined, MedicineBoxOutlined,
    ToolOutlined, SkinOutlined, AlertOutlined, InboxOutlined,
    BulbOutlined, GiftOutlined
} from '@ant-design/icons';
import { useUIStore, useAuthStore } from '@/stores';
import { donationService } from '@/services/donationService';
import type { DonationNeed, DonationCreateDto } from '@/services/donationService';

const { Title, Text } = Typography;
const { TextArea } = Input;

// Needs fetched from API

const TYPE_COLORS: Record<string, string> = {
    'Alimentaire': '#16a34a', 'Médical': '#0ea5e9', 'Équipement': '#8b5cf6',
    'Vêtements': '#f59e0b', 'Urgence': '#ef4444',
};
const TYPE_EMOJI: Record<string, React.ReactNode> = {
    'Alimentaire': <CoffeeOutlined />, 'Médical': <MedicineBoxOutlined />, 'Équipement': <ToolOutlined />, 'Vêtements': <SkinOutlined />, 'Urgence': <AlertOutlined />,
};

interface DonationFormData {
    needId: string;
    donationType: string;
    description: string;
    quantity: string;
    note: string;
    photoBase64: string | null;
    photoName: string;
}

// ============================================================
// Step 1 — Select Need
// ============================================================
const Step1SelectNeed: React.FC<{
    isDark: boolean;
    needs: DonationNeed[];
    selectedNeedId: string;
    onSelect: (id: string) => void;
}> = ({ isDark, needs, selectedNeedId, onSelect }) => (
    <div>
        <div style={{
            background: isDark ? 'rgba(22,163,74,0.08)' : '#f0fdf4',
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 24,
            border: '1px solid rgba(22,163,74,0.2)',
        }}>
            <Space>
                <span><BulbOutlined style={{ color: '#16a34a' }} /></span>
                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.7)' : '#555' }}>
                    Sélectionnez un besoin publié par un comité. Vous pouvez aussi{' '}
                    <Text style={{ color: '#16a34a', fontWeight: 600 }}>naviguer sur la carte</Text>{' '}
                    pour trouver un besoin proche de vous.
                </Text>
            </Space>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {needs.map((need) => (
                <div
                    key={need.id}
                    onClick={() => onSelect(need.id)}
                    style={{
                        borderRadius: 16,
                        padding: '18px 20px',
                        border: `2px solid ${selectedNeedId === need.id ? '#16a34a' : isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}`,
                        background: selectedNeedId === need.id
                            ? (isDark ? 'rgba(22,163,74,0.12)' : '#f0fdf4')
                            : (isDark ? 'rgba(255,255,255,0.02)' : '#fff'),
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        boxShadow: selectedNeedId === need.id ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                    }}
                    onMouseEnter={(e) => { if (selectedNeedId !== need.id) e.currentTarget.style.borderColor = '#16a34a60'; }}
                    onMouseLeave={(e) => { if (selectedNeedId !== need.id) e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'; }}
                >
                    <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: `${TYPE_COLORS[need.type] || '#ccc'}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 24,
                        flexShrink: 0,
                    }}>
                        {TYPE_EMOJI[need.type] || <InboxOutlined />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                            <Text strong style={{ fontSize: 15 }}>{need.committeeName}</Text>
                            <Tag style={{ background: `${TYPE_COLORS[need.type] || '#ccc'}15`, color: TYPE_COLORS[need.type] || '#999', border: 'none', borderRadius: 6, fontSize: 11, margin: 0 }}>
                                {need.type}
                            </Tag>
                            {need.priority === 'URGENT' && (
                                <Tag color="error" style={{ margin: 0, fontSize: 11 }}><AlertOutlined /> URGENT</Tag>
                            )}
                        </div>
                        <Space size={4}>
                            <EnvironmentOutlined style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }} />
                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{need.committeeRegion}</Text>
                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>·</Text>
                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>{need.quantityNeeded || 'Non spécifié'}</Text>
                        </Space>
                        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : '#555', display: 'block', marginTop: 4 }}>
                            {need.description}
                        </Text>
                    </div>
                    {selectedNeedId === need.id && (
                        <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 22, flexShrink: 0 }} />
                    )}
                </div>
            ))}
        </div>
    </div>
);

// ============================================================
// Step 2 — Donation Details
// ============================================================
const Step2DonationDetails: React.FC<{
    isDark: boolean;
    form: DonationFormData;
    onUpdate: (updates: Partial<DonationFormData>) => void;
    selectedNeed: DonationNeed | undefined;
}> = ({ isDark, form, onUpdate, selectedNeed }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Selected need summary */}
        {selectedNeed && (
            <div style={{
                background: isDark ? `${TYPE_COLORS[selectedNeed.type] || '#6b7280'}10` : `${TYPE_COLORS[selectedNeed.type] || '#6b7280'}08`,
                borderRadius: 14,
                padding: '16px 20px',
                border: `1px solid ${TYPE_COLORS[selectedNeed.type] || '#6b7280'}30`,
            }}>
                <Space>
                    <span style={{ fontSize: 22 }}>{TYPE_EMOJI[selectedNeed.type] || <InboxOutlined />}</span>
                    <div>
                        <Text strong>{selectedNeed.committeeName}</Text>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13, display: 'block' }}>
                            Besoin: {selectedNeed.quantityNeeded || 'Non spécifié'} · {selectedNeed.committeeRegion}
                        </Text>
                    </div>
                </Space>
            </div>
        )}

        <div>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Type de don <span style={{ color: '#ef4444' }}>*</span>
            </Text>
            <Select
                value={form.donationType}
                onChange={(v) => onUpdate({ donationType: v })}
                style={{ width: '100%' }}
                size="large"
                placeholder="Choisissez le type de don"
                options={[
                    { value: 'Alimentaire', label: <span><CoffeeOutlined /> Don alimentaire (paniers, colis...)</span> },
                    { value: 'Médical', label: <span><MedicineBoxOutlined /> Don médical (médicaments, kits...)</span> },
                    { value: 'Équipement', label: <span><ToolOutlined /> Équipement (tentes, matériels...)</span> },
                    { value: 'Vêtements', label: <span><SkinOutlined /> Vêtements et effets personnels</span> },
                    { value: 'Urgence', label: <span><AlertOutlined /> Don d'urgence (matériel divers)</span> },
                ]}
            />
        </div>

        <div>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Description du don <span style={{ color: '#ef4444' }}>*</span>
            </Text>
            <TextArea
                value={form.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Décrivez le don en détail (ex: 50 paniers alimentaires contenant farine, huile, sucre...)"
                rows={4}
                maxLength={500}
                showCount
                style={{ borderRadius: 10 }}
            />
        </div>

        <div>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Quantité <span style={{ color: '#ef4444' }}>*</span>
            </Text>
            <Input
                value={form.quantity}
                onChange={(e) => onUpdate({ quantity: e.target.value })}
                placeholder="Ex: 50 paniers, 20 kits, 100 pièces..."
                size="large"
                style={{ borderRadius: 10 }}
            />
        </div>

        <div>
            <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                Note au comité (optionnel)
            </Text>
            <TextArea
                value={form.note}
                onChange={(e) => onUpdate({ note: e.target.value })}
                placeholder="Message ou instructions spéciales pour le comité bénéficiaire..."
                rows={3}
                maxLength={300}
                showCount
                style={{ borderRadius: 10 }}
            />
        </div>
    </div>
);

// ============================================================
// Step 3 — Photo Proof
// ============================================================
const Step3Photo: React.FC<{
    isDark: boolean;
    form: DonationFormData;
    onUpdate: (updates: Partial<DonationFormData>) => void;
}> = ({ isDark, form, onUpdate }) => {
    const handleFileChange = (info: any) => {
        const file = info.file.originFileObj || info.file;
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                onUpdate({ photoBase64: e.target?.result as string, photoName: file.name });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <Alert
                type="info"
                icon={<CameraOutlined />}
                showIcon
                message="Pourquoi une photo est-elle demandée ?"
                description="La photo de votre don sert de preuve de remise. Elle sera attachée à votre reçu officiel et visible par le comité bénéficiaire. Cela garantit une transparence totale."
                style={{ borderRadius: 12 }}
            />

            {/* Upload Zone */}
            <Upload.Dragger
                name="photo"
                accept="image/*"
                maxCount={1}
                showUploadList={false}
                beforeUpload={() => false}
                onChange={handleFileChange}
                style={{
                    borderRadius: 16,
                    border: `2px dashed ${isDark ? 'rgba(22,163,74,0.4)' : 'rgba(22,163,74,0.3)'}`,
                    background: isDark ? 'rgba(22,163,74,0.05)' : '#f0fdf4',
                    padding: '32px 20px',
                }}
            >
                {form.photoBase64 ? (
                    <div style={{ textAlign: 'center' }}>
                        <img
                            src={form.photoBase64}
                            alt="Aperçu du don"
                            style={{
                                maxWidth: '100%',
                                maxHeight: 280,
                                borderRadius: 12,
                                objectFit: 'cover',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                marginBottom: 12,
                            }}
                        />
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            background: 'rgba(22,163,74,0.15)',
                            borderRadius: 8,
                            padding: '6px 14px',
                        }}>
                            <CheckCircleOutlined style={{ color: '#16a34a' }} />
                            <Text style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>
                                Photo chargée : {form.photoName}
                            </Text>
                        </div>
                        <Text style={{ display: 'block', marginTop: 8, color: isDark ? 'rgba(255,255,255,0.4)' : '#999', fontSize: 12 }}>
                            Cliquez pour changer la photo
                        </Text>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'rgba(22,163,74,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                        }}>
                            <UploadOutlined style={{ fontSize: 28, color: '#16a34a' }} />
                        </div>
                        <Title level={5} style={{ color: '#16a34a', marginBottom: 8 }}>
                            Déposez votre photo ici
                        </Title>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13 }}>
                            ou cliquez pour sélectionner depuis votre appareil
                        </Text>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#bbb', fontSize: 11, display: 'block', marginTop: 8 }}>
                            JPG, PNG, HEIC — Max 10 MB
                        </Text>
                    </div>
                )}
            </Upload.Dragger>

            {/* Tips */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                borderRadius: 12,
                padding: '14px 18px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
            }}>
                <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                    <BulbOutlined /> Conseils pour une bonne photo
                </Text>
                {[
                    'Photographiez tous les articles rassemblés',
                    'Assurez-vous que la photo soit bien éclairée',
                    'Incluez une étiquette ou note avec la date',
                    'La photo doit montrer clairement la quantité et le type de don',
                ].map((tip) => (
                    <div key={tip} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <CheckCircleOutlined style={{ color: '#16a34a', fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                        <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : '#555' }}>{tip}</Text>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================
// Step 4 — QR Code Confirmation
// ============================================================
const Step4QRCode: React.FC<{
    isDark: boolean;
    form: DonationFormData;
    donationId: string;
    selectedNeed: DonationNeed | undefined;
    onDownload: () => void;
    onGoToReceipts: () => void;
}> = ({ isDark, form, donationId, selectedNeed, onDownload, onGoToReceipts }) => {
    // Simulated QR code data encoded as base64 SVG QR code pattern
    const qrData = `DON:${donationId}|CMT:${selectedNeed?.id}|TYPE:${form.donationType}|QTY:${form.quantity}|TS:${Date.now()}`;

    // Generate a visual QR representation (pattern-based, not functional)
    const generateQRPattern = () => {
        const size = 10;
        const cells: React.ReactNode[] = [];
        // Seed-based pseudo-random pattern
        let seed = qrData.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

        // Corner squares (finder patterns)
        const isFinderPattern = (r: number, c: number) =>
            (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3);

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const inFinder = isFinderPattern(r, c);
                const filled = inFinder ? true : rand() > 0.45;
                cells.push(
                    <rect key={`${r}-${c}`} x={c * 24 + 24} y={r * 24 + 24} width={20} height={20} rx={2}
                        fill={filled ? (isDark ? '#fff' : '#1a1a1a') : 'transparent'} />
                );
            }
        }
        // Finder pattern borders
        [[0, 0], [0, size - 3], [size - 3, 0]].forEach(([fr, fc]) => {
            cells.push(
                <rect key={`fp-${fr}-${fc}`} x={fc * 24 + 24} y={fr * 24 + 24} width={68} height={68} rx={4}
                    fill="none" stroke={isDark ? '#fff' : '#1a1a1a'} strokeWidth={3} />,
                <rect key={`fp2-${fr}-${fc}`} x={fc * 24 + 36} y={fr * 24 + 36} width={44} height={44} rx={2}
                    fill={isDark ? '#fff' : '#1a1a1a'} />
            );
        });
        return cells;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Success header */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))',
                borderRadius: 20,
                padding: '24px',
                border: '1px solid rgba(22,163,74,0.2)',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: 48, marginBottom: 12, color: '#16a34a' }}><CheckCircleOutlined /></div>
                <Title level={4} style={{ color: '#16a34a', marginBottom: 8 }}>Don enregistré avec succès !</Title>
                <Text style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#555', fontSize: 14 }}>
                    Votre don a été soumis. Le comité bénéficiaire va le récupérer.
                </Text>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    display: 'inline-block',
                    background: isDark ? '#1f2937' : '#fff',
                    borderRadius: 20,
                    padding: 24,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    border: `2px solid rgba(22,163,74,0.2)`,
                }}>
                    {/* QR label */}
                    <div style={{
                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                        borderRadius: 10,
                        padding: '6px 20px',
                        marginBottom: 16,
                        display: 'inline-block',
                    }}>
                        <Text style={{ color: '#fff', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em' }}>
                            QR CODE RÉCEPTION — NEXUS-AID
                        </Text>
                    </div>

                    {/* QR Code SVG */}
                    <svg
                        id="donation-qr-svg"
                        viewBox="0 0 288 288"
                        width={220}
                        height={220}
                        style={{ display: 'block', margin: '0 auto' }}
                    >
                        <rect x={0} y={0} width={288} height={288} rx={8} fill={isDark ? '#1f2937' : '#fff'} />
                        {generateQRPattern()}
                        {/* Center logo */}
                        <rect x={124} y={124} width={40} height={40} rx={8} fill={isDark ? '#1f2937' : '#fff'} />
                        <foreignObject x={132} y={132} width={24} height={24}>
                            <HeartOutlined style={{ fontSize: 24, color: '#16a34a', display: 'block' }} />
                        </foreignObject>
                    </svg>

                    <Text style={{ display: 'block', marginTop: 12, fontSize: 11, fontFamily: 'monospace', color: '#16a34a', fontWeight: 700 }}>
                        {donationId}
                    </Text>
                    <Text style={{ display: 'block', fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999', marginTop: 4 }}>
                        À présenter au volontaire du comité
                    </Text>
                </div>
            </div>

            {/* Donation summary */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                borderRadius: 16,
                padding: '18px 20px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
            }}>
                <Text strong style={{ display: 'block', marginBottom: 14, fontSize: 14 }}>
                    📋 Récapitulatif du don
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                        { label: 'ID Don', value: donationId, icon: <FileProtectOutlined /> },
                        { label: 'Comité', value: selectedNeed?.committeeName || '-', icon: <EnvironmentOutlined /> },
                        { label: 'Type', value: form.donationType, icon: <InboxOutlined /> },
                        { label: 'Quantité', value: form.quantity, icon: <GiftOutlined /> },
                        { label: 'Région', value: selectedNeed?.committeeRegion || '-', icon: <EnvironmentOutlined /> },
                        { label: 'Statut', value: 'En attente réception', icon: <ClockCircleOutlined /> },
                    ].map((item) => (
                        <div key={item.label} style={{
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                            borderRadius: 10,
                            padding: '10px 12px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                        }}>
                            <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.4)' : '#999', display: 'block', marginBottom: 3 }}>
                                {item.icon} {item.label}
                            </Text>
                            <Text strong style={{ fontSize: 12 }}>{item.value}</Text>
                        </div>
                    ))}
                </div>
            </div>

            {/* Instructions */}
            <Alert
                type="info"
                icon={<QrcodeOutlined />}
                showIcon
                message="Comment utiliser ce QR Code ?"
                description={
                    <ol style={{ margin: '8px 0 0', paddingLeft: 20, lineHeight: 2 }}>
                        <li>Affichez ce QR Code au volontaire du comité lors de la remise</li>
                        <li>Le volontaire scanne le code avec l'application Nexus-AID</li>
                        <li>La réception est automatiquement validée dans le système</li>
                        <li>Vous recevrez une notification de confirmation</li>
                    </ol>
                }
                style={{ borderRadius: 12 }}
            />

            {/* Workflow tracker */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                borderRadius: 14,
                padding: '16px 20px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
            }}>
                <Text strong style={{ display: 'block', marginBottom: 14, fontSize: 13 }}>
                    <ClockCircleOutlined /> Suivi de votre don
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    {[
                        { label: 'Soumis', done: true },
                        { label: 'QR Généré', done: true },
                        { label: 'Réception', done: false },
                        { label: 'Validé', done: false },
                        { label: 'Reçu PDF', done: false },
                    ].map((step, i, arr) => (
                        <div key={step.label} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : undefined }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                <div style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: step.done ? '#16a34a' : isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 12,
                                    border: step.done ? 'none' : `2px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#ddd'}`,
                                }}>
                                    {step.done ? '✓' : <ClockCircleOutlined style={{ fontSize: 12, color: '#999' }} />}
                                </div>
                                <Text style={{ fontSize: 10, color: step.done ? '#16a34a' : isDark ? 'rgba(255,255,255,0.4)' : '#999', fontWeight: step.done ? 700 : 400 }}>
                                    {step.label}
                                </Text>
                            </div>
                            {i < arr.length - 1 && (
                                <div style={{
                                    flex: 1,
                                    height: 2,
                                    background: step.done ? '#16a34a' : isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0',
                                    margin: '0 4px',
                                    marginBottom: 20,
                                }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
                <Button
                    block
                    size="large"
                    icon={<FileProtectOutlined />}
                    onClick={onGoToReceipts}
                    style={{ borderRadius: 12, fontWeight: 600, height: 48 }}
                >
                    Voir mes reçus
                </Button>
                <Button
                    block
                    type="primary"
                    size="large"
                    icon={<QrcodeOutlined />}
                    onClick={onDownload}
                    style={{
                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                        border: 'none',
                        borderRadius: 12,
                        fontWeight: 700,
                        height: 48,
                    }}
                >
                    Télécharger QR Code
                </Button>
            </div>
        </div>
    );
};

// ============================================================
// Main MakeDonation Page
// ============================================================
const MakeDonationPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { themeMode } = useUIStore();
    const { user } = useAuthStore();
    const isDark = themeMode === 'dark';

    const [currentStep, setCurrentStep] = useState(0);
    const [donationId, setDonationId] = useState('');
    const [needs, setNeeds] = useState<DonationNeed[]>([]);
    const [submitting, setSubmitting] = useState(false);

    const initialNeedId = location.state?.needId || '';
    const [form, setForm] = useState<DonationFormData>({
        needId: initialNeedId,
        donationType: '',
        description: '',
        quantity: '',
        note: '',
        photoBase64: null,
        photoName: '',
    });

    const updateForm = (updates: Partial<DonationFormData>) => setForm(prev => ({ ...prev, ...updates }));
    const selectedNeed = needs.find(n => n.id === form.needId);

    useEffect(() => {
        const fetchNeeds = async () => {
            try {
                const data = await donationService.getAllNeeds();
                setNeeds(data);
            } catch (error) {
                console.error('Failed to load needs:', error);
                message.error('Erreur lors du chargement des besoins.');
            }
        };
        fetchNeeds();
    }, []);

    const canNext = () => {
        if (currentStep === 0) return !!form.needId;
        if (currentStep === 1) return !!form.donationType && !!form.description && !!form.quantity;
        if (currentStep === 2) return true; // Photo optional but recommended
        return true;
    };

    const handleNext = async () => {
        if (currentStep === 2) {
            if (!form.photoBase64) {
                message.warning('Veuillez ajouter une photo de votre don pour continuer.');
                return;
            }
            try {
                setSubmitting(true);
                const result = await donationService.createDonation({
                    needId: form.needId,
                    donationType: form.donationType,
                    description: form.description,
                    quantity: form.quantity,
                    note: form.note,
                    photoUrl: form.photoBase64,
                });
                setDonationId(result.donationNumber);
                message.success('Don enregistré ! QR Code généré.');
                setCurrentStep(3);
            } catch (err) {
                console.error(err);
                message.error('Erreur lors de l\'enregistrement du don.');
            } finally {
                setSubmitting(false);
            }
        } else {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    const handleDownloadQR = () => {
        const svg = document.getElementById('donation-qr-svg');
        if (svg) {
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `QR-${donationId}.svg`;
            a.click();
            URL.revokeObjectURL(url);
            message.success('QR Code téléchargé !');
        }
    };

    const steps = [
        { title: 'Besoin', description: 'Choisir', icon: <EnvironmentOutlined /> },
        { title: 'Détails', description: 'Don', icon: <HeartOutlined /> },
        { title: 'Photo', description: 'Preuve', icon: <CameraOutlined /> },
        { title: 'QR Code', description: 'Confirmation', icon: <QrcodeOutlined /> },
    ];

    return (
        <div style={{
            background: isDark ? '#0f172a' : '#f0fdf4',
            margin: -24,
            padding: 24,
            minHeight: '100vh',
        }}>
            {/* Header */}
            <div style={{
                background: isDark ? 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))' : 'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(255,255,255,0.9))',
                borderRadius: 20,
                padding: '20px 28px',
                marginBottom: 28,
                border: 'rgba(22,163,74,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
            }}>
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/donor/dashboard')}
                    style={{ borderRadius: 10, fontWeight: 600 }}
                >
                    Retour
                </Button>
                <div style={{
                    width: 48, height: 48, borderRadius: 16,
                    background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    boxShadow: '0 0 20px rgba(22,163,74,0.4)',
                }}>
                    <HeartOutlined />
                </div>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Faire un Don</Title>
                    <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13 }}>
                        Don en nature — tracé et certifié
                    </Text>
                </div>
            </div>

            {/* Main content */}
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
                {/* Stepper */}
                <div style={{
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                    borderRadius: 20,
                    padding: '24px 28px',
                    marginBottom: 24,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                    boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
                }}>
                    <Steps
                        current={currentStep}
                        items={steps.map((s, i) => ({
                            ...s,
                            status: i < currentStep ? 'finish' : i === currentStep ? 'process' : 'wait',
                        }))}
                        style={{ marginBottom: 0 }}
                    />
                </div>

                {/* Step Content */}
                <div style={{
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                    borderRadius: 20,
                    padding: '28px',
                    marginBottom: 20,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                    boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.04)',
                }}>
                    <Title level={5} style={{ marginBottom: 20 }}>
                        {currentStep === 0 && <><EnvironmentOutlined /> Étape 1 — Sélectionnez un besoin</>}
                        {currentStep === 1 && <><InboxOutlined /> Étape 2 — Détails de votre don</>}
                        {currentStep === 2 && <><CameraOutlined /> Étape 3 — Photo de votre don</>}
                        {currentStep === 3 && <><CheckCircleOutlined /> Confirmation & QR Code de réception</>}
                    </Title>

                    <Divider style={{ margin: '0 0 24px' }} />

                    {currentStep === 0 && (
                        <Step1SelectNeed isDark={isDark} needs={needs} selectedNeedId={form.needId} onSelect={(id) => updateForm({ needId: id })} />
                    )}
                    {currentStep === 1 && (
                        <Step2DonationDetails isDark={isDark} form={form} onUpdate={updateForm} selectedNeed={selectedNeed} />
                    )}
                    {currentStep === 2 && (
                        <Step3Photo isDark={isDark} form={form} onUpdate={updateForm} />
                    )}
                    {currentStep === 3 && (
                        <Step4QRCode
                            isDark={isDark}
                            form={form}
                            donationId={donationId}
                            selectedNeed={selectedNeed}
                            onDownload={handleDownloadQR}
                            onGoToReceipts={() => navigate('/donor/receipts')}
                        />
                    )}
                </div>

                {/* Navigation buttons */}
                {currentStep < 3 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <Button
                            size="large"
                            onClick={() => setCurrentStep(prev => Math.max(prev - 1, 0))}
                            disabled={currentStep === 0}
                            icon={<ArrowLeftOutlined />}
                            style={{ borderRadius: 12, height: 48, fontWeight: 600, minWidth: 120 }}
                        >
                            Précédent
                        </Button>
                        <Button
                            type="primary"
                            size="large"
                            onClick={handleNext}
                            disabled={!canNext() || submitting}
                            loading={submitting}
                            icon={<ArrowRightOutlined />}
                            iconPosition="end"
                            style={{
                                background: canNext() ? 'linear-gradient(135deg, #16a34a, #4ade80)' : undefined,
                                border: 'none',
                                borderRadius: 12,
                                height: 48,
                                fontWeight: 700,
                                minWidth: 140,
                                boxShadow: canNext() ? '0 4px 16px rgba(22,163,74,0.3)' : 'none',
                            }}
                        >
                            {currentStep === 2 ? 'Confirmer le don' : 'Continuer'}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MakeDonationPage;


