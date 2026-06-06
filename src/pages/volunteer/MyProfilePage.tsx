// ============================================================
// NEXUS-AID — MyProfilePage REDESIGNED
// Identité Croissant Rouge · Innovation · Responsive · Premium
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
    Card, Avatar, Typography, Tag, Space, Upload, Button, Spin,
    Row, Col, Divider, Statistic, Badge, Tooltip, Empty, Tabs,
    Input, Select, Switch, Alert, App, Modal, Progress,
} from 'antd';
import {
    UserOutlined, MailOutlined, IdcardOutlined, TeamOutlined,
    CameraOutlined, SafetyCertificateOutlined, CheckCircleOutlined,
    ClockCircleOutlined, StarOutlined, CalendarOutlined, EditOutlined,
    SaveOutlined, ReloadOutlined, LoadingOutlined, MoonOutlined,
    SunOutlined, GlobalOutlined, EnvironmentOutlined, LockOutlined,
    PhoneOutlined, DownloadOutlined, TrophyOutlined, HeartOutlined,
    ThunderboltOutlined, FireOutlined, RiseOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useUIStore } from '@/stores';
import { getUserPermissions } from '@/config/roleConfig';
import authService from '@/services/authService';
import volunteerProfileService from '@/services/volunteerProfileService';
import type { CertificationDTO } from '@/services/volunteerProfileService';
import VolunteerIDCard from './components/VolunteerIDCard';
import html2canvas from 'html2canvas';
import i18n from 'i18next';

const { Title, Text } = Typography;

// ── Cloudinary ────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = 'doxmfj1cw';
const CLOUDINARY_UPLOAD_PRESET = 'exus_aid_preset';

// ── Color maps ────────────────────────────────────────────────
const statusColors: Record<string, string> = {
    APPROVED: 'green', PENDING: 'orange', REJECTED: 'red', SUSPENDED: 'default',
};
const certStatusColors: Record<string, string> = {
    ACTIVE: 'green', EXPIRED: 'red', PENDING_RECYCLING: 'orange',
};

const fixEncoding = (str: string | undefined): string => {
    if (!str) return '—';
    try { return str.replace(/Ã©/g, 'é').replace(/Ã/g, 'à'); }
    catch { return str; }
};

// ── Animated Red Crescent SVG watermark ───────────────────────
const CrescentWatermark: React.FC<{ size?: number; opacity?: number }> = ({
    size = 220, opacity = 0.06,
}) => (
    <svg
        width={size} height={size} viewBox="0 0 200 200"
        style={{ opacity, pointerEvents: 'none', userSelect: 'none' }}
    >
        {/* Outer crescent */}
        <path
            d="M100 20 A80 80 0 1 1 100 180 A55 55 0 1 0 100 20"
            fill="currentColor"
        />
        {/* Red cross dots (classic symbol) */}
        <circle cx="148" cy="62" r="9" fill="currentColor" />
    </svg>
);

// ── Stat Card sub-component ───────────────────────────────────
const StatPill: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    color: string;
    suffix?: string;
}> = ({ icon, label, value, color, suffix }) => (
    <motion.div
        whileHover={{ y: -3, scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{
            background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
            border: `1.5px solid ${color}25`,
            borderRadius: 20,
            padding: '18px 16px',
            textAlign: 'center',
            flex: 1,
            minWidth: 0,
            cursor: 'default',
        }}
    >
        <div style={{
            width: 42, height: 42,
            borderRadius: 14,
            background: `${color}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
            color,
            fontSize: 20,
        }}>
            {icon}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: '#111827', letterSpacing: '-0.03em' }}>
            {value}<span style={{ fontSize: 14, fontWeight: 600, color: '#6B7280', marginLeft: 3 }}>{suffix}</span>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 5 }}>
            {label}
        </div>
    </motion.div>
);

// ── Cert Item sub-component ───────────────────────────────────
const CertItem: React.FC<{ cert: CertificationDTO }> = ({ cert }) => {
    const colorMap: Record<string, string> = {
        ACTIVE: '#10B981', EXPIRED: '#EF4444', PENDING_RECYCLING: '#F59E0B',
    };
    const accentColor = colorMap[cert.status] || '#6B7280';
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                background: '#FAFAFA',
                border: `1.5px solid #F0F0F0`,
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: 14,
                padding: '14px 18px',
            }}
        >
            <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#111827' }}>{cert.diploma}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CalendarOutlined /> Obtenu le {cert.dateObtained}
                    {cert.dateExpiry && <span style={{ marginLeft: 8, color: '#F59E0B' }}>· Expire: {cert.dateExpiry}</span>}
                </div>
            </div>
            <Tag
                style={{
                    borderRadius: 99, fontWeight: 800, fontSize: 11,
                    background: `${accentColor}18`, color: accentColor,
                    border: `1.5px solid ${accentColor}30`,
                    padding: '3px 12px', flexShrink: 0,
                }}
            >
                {cert.status}
            </Tag>
        </motion.div>
    );
};

// ─────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const MyProfilePage: React.FC = () => {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const { user, fetchProfile, setUser } = useAuthStore();
    const { themeMode, toggleTheme } = useUIStore();
    const permissions = getUserPermissions(user?.roles || [], user?.type);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [certifications, setCertifications] = useState<CertificationDTO[]>([]);
    const [isCardModalVisible, setIsCardModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [qrBadgeLoading, setQrBadgeLoading] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    // Editable fields
    const [editPhone, setEditPhone] = useState('');
    const [editFullName, setEditFullName] = useState('');
    const [editSkills, setEditSkills] = useState<string[]>([]);
    const [editAddress, setEditAddress] = useState('');
    const [editEducationLevel, setEditEducationLevel] = useState('');

    const isApproved = user?.status === 'APPROVED';
    const accountStatus = user?.status || 'PENDING';

    // ── Skills parser ─────────────────────────────────────────
    const skillsList: string[] = (() => {
        const s = user?.skills;
        if (Array.isArray(s)) return s;
        if (typeof s === 'string' && s) {
            try { return JSON.parse(s); } catch { return []; }
        }
        return [];
    })();

    // ── Load ──────────────────────────────────────────────────
    useEffect(() => { loadProfile(); }, []);
    useEffect(() => {
        if (user) {
            setEditPhone(user.phone || '');
            setEditFullName(user.fullName || '');
            setEditAddress(user.address || '');
            setEditEducationLevel(user.educationLevel || '');
            const s = user.skills;
            if (Array.isArray(s)) setEditSkills(s);
            else if (typeof s === 'string' && s) {
                try { setEditSkills(JSON.parse(s)); } catch { setEditSkills([]); }
            }
        }
    }, [user]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            await fetchProfile();
            if (user?.id) {
                const certs = await volunteerProfileService.getMyCertifications(user.id);
                setCertifications(certs);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleRefresh = async () => {
        setLoading(true);
        try { await fetchProfile(); message.success('Profil synchronisé'); }
        catch { message.error('Échec de la synchronisation'); }
        finally { setLoading(false); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates: Record<string, unknown> = {
                phone: editPhone,
                fullName: editFullName,
                address: editAddress,
                educationLevel: editEducationLevel,
            };
            if (isApproved) updates.skills = editSkills;
            await authService.updateProfile(updates);
            await fetchProfile();
            setEditing(false);
            message.success('Profil mis à jour !');
        } catch { message.error('Erreur lors de la mise à jour.'); }
        finally { setSaving(false); }
    };

    const handleAvatarUpload = async (info: any) => {
        const file = info.file;
        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            message.error('Seuls JPG/PNG acceptés.'); return false;
        }
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            await authService.updateAvatarUrl(data.secure_url, data.public_id);
            if (user) setUser({ ...user, avatar: data.secure_url });
            message.success('Photo mise à jour !');
        } catch (e: any) { message.error(`Erreur: ${e.message}`); }
        finally { setUploading(false); }
        return false;
    };

    const handleDownloadCard = async () => {
        if (!cardRef.current) return;
        try {
            const canvas = await html2canvas(cardRef.current, { scale: 2, useCORS: true, backgroundColor: null });
            const link = document.createElement('a');
            link.download = `NexusAID_Card_${user?.matricule || 'Volunteer'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            message.success('Carte téléchargée !');
        } catch { message.error('Erreur de génération'); }
    };

    const handleDownloadBadge = async () => {
        if (!user?.id) return;
        setQrBadgeLoading(true);
        try {
            const blobUrl = await authService.getMyBadgeQr(user.id);
            const link = document.createElement('a');
            link.download = `NexusAID_Badge_${user?.matricule || user.id}.png`;
            link.href = blobUrl;
            link.click();
            URL.revokeObjectURL(blobUrl);
            message.success('Badge QR téléchargé !');
        } catch { message.error('Erreur de génération du badge QR.'); }
        finally { setQrBadgeLoading(false); }
    };

    // ── Styles ────────────────────────────────────────────────
    const bg = isDark ? '#0F1117' : '#F5F5F7';
    const cardBg = isDark ? '#1A1D27' : '#FFFFFF';
    const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
    const textPrimary = isDark ? '#F3F4F6' : '#111827';
    const textSecondary = isDark ? '#6B7280' : '#6B7280';
    const inputBg = isDark ? 'rgba(255,255,255,0.04)' : '#FAFAFA';

    if (loading && !user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Chargement..."><div style={{ width: 1, height: 1 }} /></Spin>
            </div>
        );
    }

    // ── Crescent gradient banner config ───────────────────────
    const bannerGradient = `linear-gradient(135deg, #7F1D1D 0%, #B91C1C 45%, #DC2626 70%, #991B1B 100%)`;

    return (
        <div
            style={{
                maxWidth: 1300,
                margin: '0 auto',
                padding: '0 28px 64px',
                background: bg,
                minHeight: '100vh',
                fontFamily: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
            }}
        >
            {/* ── Page Header ───────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 16,
                    paddingTop: 40,
                    paddingBottom: 36,
                    flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {/* Animated crescent accent */}
                    <div style={{
                        width: 6, height: 52, borderRadius: 99,
                        background: 'linear-gradient(180deg, #EF4444 0%, #7F1D1D 100%)',
                        boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
                        flexShrink: 0,
                    }} />
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            {/* Crescent icon */}
                            <span style={{ color: '#DC2626', fontSize: 22, lineHeight: 1 }}>
                                <CrescentWatermark size={28} opacity={1} />
                            </span>
                            <Title level={2} style={{ margin: 0, fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', color: textPrimary }}>
                                Mon Profil
                            </Title>
                        </div>
                        <Text style={{ color: textSecondary, fontSize: 14, fontWeight: 500 }}>
                            Gérez votre identité et vos préférences Nexus-AID
                        </Text>
                    </div>
                </div>

                <Space wrap>
                    {/* QR Badge Download */}
                    {isApproved && (
                        <motion.button
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            onClick={handleDownloadBadge}
                            disabled={qrBadgeLoading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: `linear-gradient(135deg, #059669, #047857)`,
                                color: '#fff', border: 'none', borderRadius: 99,
                                padding: '10px 22px', fontWeight: 800, fontSize: 13.5,
                                cursor: qrBadgeLoading ? 'not-allowed' : 'pointer',
                                opacity: qrBadgeLoading ? 0.7 : 1,
                                boxShadow: '0 4px 16px rgba(5,150,105,0.35)',
                                fontFamily: 'inherit',
                            }}
                        >
                            {qrBadgeLoading ? <LoadingOutlined /> : <SafetyCertificateOutlined />} Badge QR
                        </motion.button>
                    )}
                    {/* Generate card */}
                    <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setIsCardModalVisible(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: `linear-gradient(135deg, #1E3A5F, #2563EB)`,
                            color: '#fff', border: 'none', borderRadius: 99,
                            padding: '10px 22px', fontWeight: 800, fontSize: 13.5,
                            cursor: 'pointer', letterSpacing: '-0.01em',
                            boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                            fontFamily: 'inherit',
                        }}
                    >
                        <IdcardOutlined /> Générer Carte
                    </motion.button>

                    {!editing ? (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setEditing(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                    color: textPrimary, border: `1.5px solid ${border}`,
                                    borderRadius: 99, padding: '10px 22px',
                                    fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                <EditOutlined /> Modifier
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={handleRefresh}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: `linear-gradient(135deg, #DC2626, #7F1D1D)`,
                                    color: '#fff', border: 'none', borderRadius: 99,
                                    padding: '10px 22px', fontWeight: 800, fontSize: 13.5,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    boxShadow: '0 4px 16px rgba(220,38,38,0.35)',
                                }}
                            >
                                <ReloadOutlined spin={loading} /> Rafraîchir
                            </motion.button>
                        </>
                    ) : (
                        <>
                            <motion.button
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={() => setEditing(false)}
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                    color: textPrimary, border: `1.5px solid ${border}`,
                                    borderRadius: 99, padding: '10px 22px',
                                    fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Annuler
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    background: `linear-gradient(135deg, #DC2626, #7F1D1D)`,
                                    color: '#fff', border: 'none', borderRadius: 99,
                                    padding: '10px 22px', fontWeight: 800, fontSize: 13.5,
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1, fontFamily: 'inherit',
                                    boxShadow: '0 4px 16px rgba(220,38,38,0.35)',
                                }}
                            >
                                <SaveOutlined /> Enregistrer
                            </motion.button>
                        </>
                    )}
                </Space>
            </motion.div>

            {/* ── Modal ID Card ──────────────────────────────────── */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, background: '#FEE2E2', borderRadius: 10,
                            color: '#DC2626', fontSize: 16,
                        }}>
                            <IdcardOutlined />
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>Carte d'Identité Volontaire Nexus-AID</span>
                    </div>
                }
                open={isCardModalVisible}
                onCancel={() => setIsCardModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsCardModalVisible(false)}>Fermer</Button>,
                    <Button
                        key="dl" type="primary" icon={<DownloadOutlined />}
                        onClick={handleDownloadCard}
                        style={{ background: '#DC2626', borderColor: '#DC2626' }}
                    >
                        Télécharger PNG
                    </Button>,
                ]}
                width={660}
                centered
            >
                <div style={{ padding: '24px 0', display: 'flex', justifyContent: 'center' }}>
                    <VolunteerIDCard ref={cardRef} user={user} />
                </div>
                <Text type="secondary" italic style={{ display: 'block', textAlign: 'center', fontSize: 12 }}>
                    Générée automatiquement à partir de vos informations de profil.
                </Text>
            </Modal>

            {/* ── Status Alert ───────────────────────────────────── */}
            {!isApproved && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
                    <Alert
                        message={accountStatus === 'PENDING' ? 'Compte en attente d\'approbation' : accountStatus === 'REJECTED' ? 'Compte rejeté' : 'Compte suspendu'}
                        description={
                            accountStatus === 'PENDING'
                                ? 'Votre compte est en attente de validation. Certaines fonctionnalités sont restreintes.'
                                : accountStatus === 'REJECTED'
                                    ? 'Votre demande a été rejetée. Contactez votre comité local.'
                                    : 'Votre compte a été suspendu. Contactez l\'administration.'
                        }
                        type={accountStatus === 'PENDING' ? 'warning' : 'error'}
                        showIcon style={{ borderRadius: 16 }}
                    />
                </motion.div>
            )}

            {/* ── Main Grid ──────────────────────────────────────── */}
            <Row gutter={[28, 28]} align="top">

                {/* ══ LEFT: Premium Identity Card ═══════════════════ */}
                <Col xs={24} lg={8}>
                    <motion.div
                        initial={{ opacity: 0, x: -24 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div style={{
                            borderRadius: 28,
                            overflow: 'hidden',
                            boxShadow: isDark
                                ? '0 24px 64px rgba(0,0,0,0.5)'
                                : '0 24px 64px rgba(0,0,0,0.1)',
                            background: cardBg,
                            position: 'relative',
                        }}>
                            {/* ── Banner with crescent pattern ─────────── */}
                            <div style={{
                                height: 140,
                                background: bannerGradient,
                                position: 'relative',
                                overflow: 'hidden',
                            }}>
                                {/* Decorative crescent pattern (background) */}
                                <div style={{
                                    position: 'absolute', bottom: -60, right: -40,
                                    color: 'rgba(255,255,255,0.08)',
                                    transform: 'rotate(15deg)',
                                }}>
                                    <CrescentWatermark size={240} opacity={1} />
                                </div>
                                <div style={{
                                    position: 'absolute', top: -30, left: -30,
                                    color: 'rgba(255,255,255,0.04)',
                                }}>
                                    <CrescentWatermark size={160} opacity={1} />
                                </div>

                                {/* Top bar: org label */}
                                <div style={{
                                    position: 'absolute', top: 16, left: 0, right: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}>
                                    <div style={{
                                        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                                        borderRadius: 99, padding: '4px 14px',
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        border: '1px solid rgba(255,255,255,0.2)',
                                    }}>
                                        <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                                            ☽ NEXUS-AID · Croissant Rouge Tunisien
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* ── Avatar zone ──────────────────────────── */}
                            <div style={{ textAlign: 'center', padding: '0 28px 28px', marginTop: -56 }}>
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <Badge
                                        count={
                                            isApproved
                                                ? <CheckCircleOutlined style={{ color: '#10B981', fontSize: 20, background: '#fff', borderRadius: '50%', padding: 2, border: '2.5px solid #10B981' }} />
                                                : <ClockCircleOutlined style={{ color: '#F59E0B', fontSize: 20, background: '#fff', borderRadius: '50%', padding: 2, border: '2.5px solid #F59E0B' }} />
                                        }
                                        offset={[-8, 92]}
                                    >
                                        <Upload
                                            accept="image/*"
                                            showUploadList={false}
                                            beforeUpload={(file) => { handleAvatarUpload({ file }); return false; }}
                                        >
                                            <div style={{ position: 'relative', cursor: 'pointer' }}>
                                                <Avatar
                                                    size={108}
                                                    icon={uploading ? <LoadingOutlined /> : <UserOutlined />}
                                                    src={user?.avatar}
                                                    style={{
                                                        border: `5px solid ${cardBg}`,
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                                                        background: isDark ? '#374151' : '#E5E7EB',
                                                    }}
                                                />
                                                <div style={{
                                                    position: 'absolute', inset: 0,
                                                    background: 'rgba(0,0,0,0.45)',
                                                    borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    opacity: 0, transition: 'opacity .2s',
                                                    fontSize: 22, color: '#fff',
                                                }}
                                                    className="avatar-overlay"
                                                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                                                >
                                                    <CameraOutlined />
                                                </div>
                                            </div>
                                        </Upload>
                                    </Badge>
                                </div>

                                {/* Name & Role */}
                                <div style={{ marginTop: 14 }}>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: textPrimary, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                                        {user?.fullName || 'Utilisateur'}
                                    </div>
                                    <div style={{ marginTop: 8 }}>
                                        <span style={{
                                            display: 'inline-block',
                                            background: 'linear-gradient(135deg, #DC2626, #B91C1C)',
                                            color: '#fff', fontSize: 11, fontWeight: 800,
                                            padding: '4px 14px', borderRadius: 99,
                                            letterSpacing: '0.06em', textTransform: 'uppercase',
                                            boxShadow: '0 4px 12px rgba(220,38,38,0.3)',
                                        }}>
                                            {permissions.label}
                                        </span>
                                    </div>
                                </div>

                                {/* Info rows */}
                                <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {[
                                        { icon: <EnvironmentOutlined />, label: 'Comité', value: fixEncoding(user?.committeeName), accent: false },
                                        { icon: <IdcardOutlined />, label: 'Matricule', value: user?.matricule || 'N/A', accent: true },
                                    ].map(({ icon, label, value, accent }) => (
                                        <div key={label} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            background: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                                            border: `1.5px solid ${border}`,
                                            borderRadius: 14,
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: textSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                <span style={{ color: '#DC2626' }}>{icon}</span>
                                                {label}
                                            </div>
                                            <span style={{
                                                fontSize: 13, fontWeight: 800,
                                                color: accent ? '#DC2626' : textPrimary,
                                                fontFamily: accent ? "'DM Mono', monospace" : 'inherit',
                                                letterSpacing: accent ? '0.04em' : 0,
                                            }}>
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Divider */}
                                <Divider style={{ borderColor: border, margin: '20px 0' }} />

                                {/* Account status */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: 10, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                                            Statut du compte
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                            <span style={{
                                                display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
                                                background: isApproved ? '#10B981' : accountStatus === 'PENDING' ? '#F59E0B' : '#EF4444',
                                                boxShadow: isApproved ? '0 0 0 4px rgba(16,185,129,0.18)' : 'none',
                                                animation: isApproved ? 'pulse 2s infinite' : 'none',
                                            }} />
                                            <span style={{ fontSize: 13, fontWeight: 800, color: isApproved ? '#10B981' : accountStatus === 'PENDING' ? '#F59E0B' : '#EF4444' }}>
                                                {isApproved ? 'Vérifié & Actif' : accountStatus === 'PENDING' ? 'En attente' : accountStatus}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{
                                        width: 42, height: 42, borderRadius: 12,
                                        background: isApproved ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, color: isApproved ? '#10B981' : '#9CA3AF',
                                    }}>
                                        <SafetyCertificateOutlined />
                                    </div>
                                </div>

                                {/* Generate Card CTA */}
                                <motion.div
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsCardModalVisible(true)}
                                    style={{
                                        marginTop: 20,
                                        background: bannerGradient,
                                        borderRadius: 16,
                                        padding: '16px 18px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        position: 'relative', overflow: 'hidden',
                                        boxShadow: '0 8px 24px rgba(220,38,38,0.28)',
                                    }}
                                >
                                    {/* Crescent decoration */}
                                    <div style={{ position: 'absolute', right: -20, top: -20, color: 'rgba(255,255,255,0.1)' }}>
                                        <CrescentWatermark size={90} opacity={1} />
                                    </div>
                                    <div style={{ textAlign: 'left', position: 'relative', zIndex: 1 }}>
                                        <div style={{ color: '#fff', fontWeight: 800, fontSize: 13 }}>Carte d'Identité Volontaire</div>
                                        <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11.5, marginTop: 2 }}>Générer & télécharger en PNG</div>
                                    </div>
                                    <div style={{
                                        width: 38, height: 38, background: 'rgba(255,255,255,0.15)',
                                        borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: 18, flexShrink: 0, position: 'relative', zIndex: 1,
                                    }}>
                                        <DownloadOutlined />
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </Col>

                {/* ══ RIGHT: Tabs ════════════════════════════════════ */}
                <Col xs={24} lg={16}>
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                    >
                        <Tabs
                            activeKey={activeTab}
                            onChange={setActiveTab}
                            style={{ fontFamily: 'inherit' }}
                            items={[
                                /* ─── TAB: Profil ─────────────────────────── */
                                {
                                    key: 'profile',
                                    label: (
                                        <span style={{ fontWeight: 800, fontSize: 14, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <UserOutlined /> Profil
                                        </span>
                                    ),
                                    children: (
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key="profile"
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div style={{
                                                    background: cardBg,
                                                    borderRadius: 24,
                                                    padding: 28,
                                                    boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.3)' : '0 8px 40px rgba(0,0,0,0.07)',
                                                    border: `1.5px solid ${border}`,
                                                }}>
                                                    {/* Section title */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                                                        <div style={{
                                                            width: 36, height: 36, borderRadius: 10,
                                                            background: '#FEE2E2', color: '#DC2626',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                                                        }}>
                                                            <UserOutlined />
                                                        </div>
                                                        <span style={{ fontSize: 16, fontWeight: 900, color: textPrimary, letterSpacing: '-0.02em' }}>
                                                            Informations de base
                                                        </span>
                                                    </div>

                                                    {/* Form grid */}
                                                    <Row gutter={[18, 18]}>
                                                        {[
                                                            {
                                                                label: 'Nom complet', icon: <UserOutlined />,
                                                                value: editing ? editFullName : user?.fullName,
                                                                onChange: (v: string) => setEditFullName(v),
                                                                editable: true,
                                                            },
                                                            {
                                                                label: 'Email', icon: <MailOutlined />,
                                                                value: user?.email, editable: false,
                                                            },
                                                            {
                                                                label: 'Téléphone', icon: <PhoneOutlined />,
                                                                value: editing ? editPhone : (user?.phone || ''),
                                                                onChange: (v: string) => setEditPhone(v),
                                                                editable: true,
                                                            },
                                                            {
                                                                label: 'CIN', icon: <IdcardOutlined />,
                                                                value: user?.cin, editable: false,
                                                            },
                                                            {
                                                                label: 'Adresse', icon: <EnvironmentOutlined />,
                                                                value: editing ? editAddress : (user?.address || ''),
                                                                onChange: (v: string) => setEditAddress(v),
                                                                editable: true,
                                                            },
                                                            {
                                                                label: 'Niveau', icon: <TrophyOutlined />,
                                                                value: editing ? editEducationLevel : (user?.educationLevel || ''),
                                                                onChange: (v: string) => setEditEducationLevel(v),
                                                                editable: true,
                                                                isSelect: true,
                                                                options: [
                                                                    { value: 'MOINS_BAC', label: 'Moins que BAC' },
                                                                    { value: 'BAC', label: 'BAC' },
                                                                    { value: 'BAC_PLUS_1_2', label: 'BAC +1/+2' },
                                                                    { value: 'LICENCE', label: 'Licence' },
                                                                    { value: 'MASTER', label: 'Master' },
                                                                    { value: 'DOCTORAT', label: 'Doctorat' },
                                                                ]
                                                            },
                                                        ].map(({ label, icon, value, onChange, editable, isSelect, options }) => (
                                                            <Col xs={24} md={12} key={label}>
                                                                <div style={{ marginBottom: 6, fontSize: 11, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                                                    {label}
                                                                </div>
                                                                <div style={{
                                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                                    background: (editing && editable) ? (isDark ? 'rgba(220,38,38,0.08)' : '#FFF5F5') : inputBg,
                                                                    border: `1.5px solid ${(editing && editable) ? '#FCA5A5' : border}`,
                                                                    borderRadius: 14, padding: '11px 16px',
                                                                    transition: 'all .2s',
                                                                    boxShadow: (editing && editable) ? '0 0 0 3px rgba(220,38,38,0.1)' : 'none',
                                                                }}>
                                                                    <span style={{ color: (editing && editable) ? '#DC2626' : textSecondary, fontSize: 16, flexShrink: 0 }}>
                                                                        {icon}
                                                                    </span>
                                                                    {editing && editable && onChange ? (
                                                                        isSelect && options ? (
                                                                            <select
                                                                                value={value as string}
                                                                                onChange={e => onChange(e.target.value)}
                                                                                style={{
                                                                                    flex: 1, border: 'none', outline: 'none',
                                                                                    background: 'transparent', fontSize: 14, fontWeight: 600,
                                                                                    color: textPrimary, fontFamily: 'inherit',
                                                                                }}
                                                                            >
                                                                                <option value="" disabled style={{ color: '#aaa' }}>Sélectionner...</option>
                                                                                {options.map(opt => (
                                                                                    <option key={opt.value} value={opt.value} style={{ background: cardBg, color: textPrimary }}>
                                                                                        {opt.label}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        ) : (
                                                                            <input
                                                                                value={value as string}
                                                                                onChange={e => onChange(e.target.value)}
                                                                                style={{
                                                                                    flex: 1, border: 'none', outline: 'none',
                                                                                    background: 'transparent', fontSize: 14, fontWeight: 600,
                                                                                    color: textPrimary, fontFamily: 'inherit',
                                                                                }}
                                                                            />
                                                                        )
                                                                    ) : (
                                                                        <span style={{
                                                                            flex: 1, fontSize: 14, fontWeight: 600,
                                                                            color: editable ? textPrimary : textSecondary,
                                                                            opacity: editable ? 1 : 0.7,
                                                                        }}>
                                                                            {isSelect && options ? (
                                                                                options.find(opt => opt.value === value)?.label || value || <span style={{ color: '#D1D5DB' }}>—</span>
                                                                            ) : (
                                                                                value || <span style={{ color: '#D1D5DB' }}>—</span>
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    {!editable && <LockOutlined style={{ color: '#D1D5DB', fontSize: 13 }} />}
                                                                </div>
                                                            </Col>
                                                        ))}
                                                    </Row>

                                                    {/* Roles */}
                                                    <Divider style={{ borderColor: border, margin: '24px 0 20px' }} />
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                                        <TeamOutlined style={{ color: '#DC2626' }} /> Rôles & Comité
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                        {user?.roles?.length ? (() => {
                                                            let displayRoles = [...user.roles];
                                                            if (displayRoles.includes('PRESIDENT_NATIONAL')) {
                                                                displayRoles = ['PRESIDENT_NATIONAL'];
                                                            } else if (displayRoles.includes('PRESIDENT')) {
                                                                displayRoles = ['PRESIDENT'];
                                                            }
                                                            return displayRoles.map(r => (
                                                                <span key={r} style={{
                                                                    background: '#FEF2F2', color: '#B91C1C',
                                                                    border: '1.5px solid #FCA5A5',
                                                                    borderRadius: 99, padding: '5px 14px',
                                                                    fontSize: 12.5, fontWeight: 800, letterSpacing: '0.02em',
                                                                }}>
                                                                    {r}
                                                                </span>
                                                            ));
                                                        })() : <Text type="secondary">Aucun rôle attribué</Text>}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    ),
                                },

                                /* ─── TAB: Avancé ─────────────────────────── */
                                {
                                    key: 'advanced',
                                    label: (
                                        <span style={{ fontWeight: 800, fontSize: 14, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {isApproved ? <StarOutlined /> : <LockOutlined />} Avancé
                                        </span>
                                    ),
                                    disabled: !isApproved,
                                    children: (
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key="advanced"
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <div style={{
                                                    background: cardBg,
                                                    borderRadius: 24,
                                                    padding: 28,
                                                    boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.3)' : '0 8px 40px rgba(0,0,0,0.07)',
                                                    border: `1.5px solid ${border}`,
                                                }}>
                                                    {!isApproved ? (
                                                        <Alert
                                                            message="Section verrouillée"
                                                            description="Accessible après approbation par le président du comité."
                                                            type="warning" showIcon style={{ borderRadius: 12 }}
                                                        />
                                                    ) : (
                                                        <>
                                                            {/* Stats */}
                                                            <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
                                                                <StatPill icon={<ClockCircleOutlined />} label="Heures" value={user?.hoursVolunteered || 0} suffix="h" color="#DC2626" />
                                                                <StatPill icon={<SafetyCertificateOutlined />} label="Certifications" value={certifications.length} color="#F59E0B" />
                                                                <StatPill icon={<CalendarOutlined />} label="Adhésion" value={user?.dateAdhesion ? String(user.dateAdhesion).slice(0, 7) : '—'} color="#2563EB" />
                                                            </div>

                                                            {/* Progress bar — engagement score */}
                                                            <div style={{
                                                                background: isDark ? 'rgba(220,38,38,0.08)' : '#FFF5F5',
                                                                border: `1.5px solid rgba(220,38,38,0.15)`,
                                                                borderRadius: 16, padding: '16px 20px', marginBottom: 24,
                                                                display: 'flex', alignItems: 'center', gap: 16,
                                                            }}>
                                                                <div style={{ color: '#DC2626', fontSize: 22 }}><FireOutlined /></div>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                                        <span style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>Score d'engagement</span>
                                                                        <span style={{ fontSize: 13, fontWeight: 900, color: '#DC2626' }}>78 / 100</span>
                                                                    </div>
                                                                    <Progress percent={78} showInfo={false} strokeColor={{ from: '#EF4444', to: '#7F1D1D' }} trailColor={isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'} strokeWidth={8} />
                                                                </div>
                                                            </div>

                                                            {/* Skills */}
                                                            <Divider style={{ borderColor: border, margin: '4px 0 20px' }} />
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                                                <StarOutlined style={{ color: '#2563EB' }} /> Compétences
                                                            </div>
                                                            {editing ? (
                                                                <Select
                                                                    mode="tags"
                                                                    style={{ width: '100%' }}
                                                                    value={editSkills}
                                                                    onChange={setEditSkills}
                                                                    placeholder="Ajoutez vos compétences..."
                                                                    tokenSeparators={[',']}
                                                                />
                                                            ) : (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                                    {skillsList.length > 0 ? skillsList.map((s, i) => (
                                                                        <span key={i} style={{
                                                                            background: '#EFF6FF', color: '#1D4ED8',
                                                                            border: '1.5px solid #BFDBFE',
                                                                            borderRadius: 99, padding: '5px 14px',
                                                                            fontSize: 12.5, fontWeight: 700,
                                                                        }}>{s}</span>
                                                                    )) : <Text type="secondary">Aucune compétence enregistrée</Text>}
                                                                </div>
                                                            )}

                                                            {/* Certifications */}
                                                            <Divider style={{ borderColor: border, margin: '24px 0 20px' }} />
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                                                <SafetyCertificateOutlined style={{ color: '#10B981' }} /> Certifications
                                                            </div>
                                                            {certifications.length > 0 ? (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                                    {certifications.map(cert => <CertItem key={cert.id} cert={cert} />)}
                                                                </div>
                                                            ) : (
                                                                <Empty description="Aucune certification enregistrée" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    ),
                                },

                                /* ─── TAB: Préférences ────────────────────── */
                                {
                                    key: 'preferences',
                                    label: (
                                        <span style={{ fontWeight: 800, fontSize: 14, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <GlobalOutlined /> Préférences
                                        </span>
                                    ),
                                    children: (
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key="preferences"
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                            >
                                                <div style={{
                                                    background: cardBg,
                                                    borderRadius: 24,
                                                    padding: 28,
                                                    boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.3)' : '0 8px 40px rgba(0,0,0,0.07)',
                                                    border: `1.5px solid ${border}`,
                                                }}>
                                                    {/* Apparence */}
                                                    <div style={{ marginBottom: 28 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
                                                            Apparence
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${border}` }}>
                                                            <div>
                                                                <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>Mode sombre</div>
                                                                <div style={{ fontSize: 12.5, color: textSecondary, marginTop: 2 }}>Interface en thème sombre</div>
                                                            </div>
                                                            <Switch
                                                                checked={themeMode === 'dark'}
                                                                onChange={toggleTheme}
                                                                checkedChildren={<MoonOutlined />}
                                                                unCheckedChildren={<SunOutlined />}
                                                                style={{ background: themeMode === 'dark' ? '#7F1D1D' : undefined }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Langue */}
                                                    <div style={{ marginBottom: 28 }}>
                                                        <div style={{ fontSize: 12, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
                                                            Langue
                                                        </div>
                                                        <Select
                                                            value={i18n.language}
                                                            style={{ width: '100%' }}
                                                            onChange={val => i18n.changeLanguage(val)}
                                                            size="large"
                                                            options={[
                                                                { value: 'fr', label: '🇫🇷 Français' },
                                                                { value: 'en', label: '🇬🇧 English' },
                                                                { value: 'ar', label: '🇹🇳 العربية' },
                                                            ]}
                                                        />
                                                    </div>

                                                    {/* Sécurité */}
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 800, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
                                                            Sécurité
                                                        </div>
                                                        {[
                                                            { label: 'Authentification 2 facteurs', desc: 'Protégez davantage votre compte', action: 'Configurer' },
                                                            { label: 'Changer le mot de passe', desc: 'Dernière modification: il y a 3 mois', action: 'Modifier' },
                                                        ].map(({ label, desc, action }) => (
                                                            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: `1px solid ${border}` }}>
                                                                <div>
                                                                    <div style={{ fontSize: 14, fontWeight: 700, color: textPrimary }}>{label}</div>
                                                                    <div style={{ fontSize: 12.5, color: textSecondary, marginTop: 2 }}>{desc}</div>
                                                                </div>
                                                                <button style={{
                                                                    background: 'transparent',
                                                                    color: '#DC2626',
                                                                    border: '2px solid #DC2626',
                                                                    borderRadius: 99, padding: '7px 16px',
                                                                    fontSize: 12.5, fontWeight: 800, cursor: 'pointer',
                                                                    fontFamily: 'inherit', transition: 'all .15s',
                                                                }}
                                                                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2'; }}
                                                                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                                                                >
                                                                    {action}
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </AnimatePresence>
                                    ),
                                },
                            ]}
                        />
                    </motion.div>
                </Col>
            </Row>

            {/* Global pulse animation */}
            <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(16,185,129,0.18); }
          50%       { box-shadow: 0 0 0 7px rgba(16,185,129,0.06); }
        }
        .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #DC2626 !important;
        }
        .ant-tabs-ink-bar {
          background: #DC2626 !important;
        }
        .ant-tabs-tab:hover .ant-tabs-tab-btn {
          color: #DC2626 !important;
        }
        .ant-progress-bg {
          background: linear-gradient(to right, #EF4444, #7F1D1D) !important;
        }
        .ant-switch-checked {
          background: #DC2626 !important;
        }
      `}</style>
        </div>
    );
};

export default MyProfilePage;