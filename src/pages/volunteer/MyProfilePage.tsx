// ============================================================
// NEXUS-AID — Profil Unifié (Unified Profile Page)
// Identity Card + Tabs (Profil, Avancé, Préférences)
// Replaces both MyProfilePage and SettingsPage
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card, Avatar, Typography, Tag, Descriptions, Space, Upload, Button, Spin,
    Row, Col, Divider, Statistic, Badge, Tooltip, Empty, Tabs, Input, Select,
    Switch, Alert, App, Modal,
} from 'antd';
import {
    UserOutlined, MailOutlined, IdcardOutlined, TeamOutlined, CameraOutlined,
    SafetyCertificateOutlined, CheckCircleOutlined, ClockCircleOutlined, StarOutlined,
    TrophyOutlined, CalendarOutlined, EditOutlined, SaveOutlined, ReloadOutlined,
    LoadingOutlined, MoonOutlined, SunOutlined, GlobalOutlined,
    EnvironmentOutlined, LockOutlined, PhoneOutlined, DownloadOutlined,
    IdcardTwoTone, SafetyCertificateTwoTone, ControlOutlined, SettingOutlined,
    InfoCircleOutlined, TrophyFilled, StarFilled, ThunderboltFilled, PlusOutlined
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

const { Title, Text, Paragraph } = Typography;

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'doxmfj1cw';
const CLOUDINARY_UPLOAD_PRESET = 'exus_aid_preset';

const certStatusColors: Record<string, string> = {
    ACTIVE: 'green',
    EXPIRED: 'red',
    PENDING_RECYCLING: 'orange',
};

const fixEncoding = (str: string | undefined): string => {
    if (!str) return '—';
    try {
        return str.replace(/Ã©/g, 'é').replace(/Ã/g, 'à');
    } catch {
        return str;
    }
};

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
    const cardRef = React.useRef<HTMLDivElement>(null);

    // Editable form state
    const [editPhone, setEditPhone] = useState('');
    const [editFullName, setEditFullName] = useState('');
    const [editSkills, setEditSkills] = useState<string[]>([]);

    const isApproved = user?.status === 'APPROVED';
    const accountStatus = user?.status || 'PENDING';

    const handleDownloadCard = async () => {
        if (!cardRef.current) return;
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2, // Higher quality
                useCORS: true,
                backgroundColor: null,
            });
            const link = document.createElement('a');
            link.download = `NexusAID_Card_${user?.matricule || 'Volunteer'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            message.success('Carte d\'identité téléchargée !');
        } catch (err) {
            console.error(err);
            message.error('Erreur lors de la génération de la carte');
        }
    };

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        if (user) {
            setEditPhone(user.phone || '');
            setEditFullName(user.fullName || '');
            const skills = user.skills;
            if (Array.isArray(skills)) {
                setEditSkills(skills);
            } else if (typeof skills === 'string' && skills) {
                try { setEditSkills(JSON.parse(skills)); } catch { setEditSkills([]); }
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
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await fetchProfile();
            message.success('Profil synchronisé');
        } catch {
            message.error('Échec de la synchronisation');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const updates: Record<string, unknown> = {
                phone: editPhone,
                fullName: editFullName,
            };
            if (isApproved) {
                updates.skills = editSkills;
            }
            await authService.updateProfile(updates);
            await fetchProfile();
            setEditing(false);
            message.success('Profil mis à jour avec succès !');
        } catch {
            message.error('Erreur lors de la mise à jour.');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (info: any) => {
        const file = info.file;
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('Seuls les fichiers JPG/PNG sont acceptés.');
            return false;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: 'POST', body: formData }
            );

            if (!response.ok) throw new Error('Upload failed');
            const data = await response.json();
            await authService.updateAvatarUrl(data.secure_url, data.public_id);
            if (user) setUser({ ...user, avatar: data.secure_url });
            message.success('Photo de profil mise à jour !');
        } catch (error: any) {
            message.error(`Erreur d'upload : ${error.message || 'Problème de connexion'}`);
        } finally {
            setUploading(false);
        }
        return false;
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 12,
        fontWeight: 600,
        color: isDark ? '#9ca3af' : '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 8,
        display: 'block',
    };

    if (loading && !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Spin size="large" />
                <Text type="secondary" className="animate-pulse">Chargement de votre profil sécurisé...</Text>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-6 lg:px-12 relative animate-fade-in overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

            <div style={{ maxWidth: 1400, margin: '0 auto' }} className="relative z-10">
                {/* Unified Premium Container */}
                <div className="bg-white/70 dark:bg-gray-950/80 backdrop-blur-3xl border border-white/40 dark:border-gray-800/50 rounded-[48px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] dark:shadow-none overflow-hidden">
                    <Row gutter={0} className="min-h-[800px]">
                        {/* LEFT: Identity Sidebar (30%) */}
                        <Col xs={24} lg={8} className="border-r border-gray-100 dark:border-gray-800/50 bg-gray-50/30 dark:bg-black/20 p-8 lg:p-12">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="h-full flex flex-col items-center"
                            >
                                <div className="relative group mb-10">
                                    <div className="absolute inset-0 bg-red-600 blur-[40px] opacity-10 group-hover:opacity-20 transition-opacity rounded-full" />
                                    <Avatar
                                        size={200}
                                        src={user?.avatar}
                                        icon={<UserOutlined />}
                                        className="relative z-10 border-[8px] border-white dark:border-gray-900 shadow-2xl bg-white dark:bg-gray-800 grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                                    />
                                    <Upload
                                        accept="image/*"
                                        showUploadList={false}
                                        beforeUpload={(file) => { handleAvatarUpload({ file }); return false; }}
                                        className="absolute bottom-4 right-4 z-20"
                                    >
                                        <Button
                                            shape="circle"
                                            icon={<CameraOutlined className="text-xl" />}
                                            className="w-14 h-14 flex items-center justify-center bg-gray-900 border-none text-white hover:bg-red-600 hover:scale-110 active:scale-95 transition-all shadow-2xl"
                                        />
                                    </Upload>
                                </div>

                                <div className="text-center w-full mb-12">
                                    <Title level={2} className="!mb-1 !font-black !text-4xl tracking-tight !text-gray-950 dark:!text-white">
                                        {user?.fullName || 'Volunteer'}
                                    </Title>
                                    <div className="flex justify-center gap-2 mb-6">
                                        <Tag className="bg-red-600 text-white border-none font-black rounded-full px-5 py-1 text-[11px] uppercase tracking-widest shadow-lg shadow-red-600/20">
                                            {permissions.label}
                                        </Tag>
                                        <Tag className="bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-none font-bold rounded-full px-5 py-1 text-[11px] uppercase tracking-widest">
                                            BRONZE
                                        </Tag>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 text-left w-full mt-10">
                                        <div className="p-5 bg-white/50 dark:bg-white/5 rounded-3xl border border-white dark:border-white/5 shadow-sm space-y-1">
                                            <div className="flex items-center gap-3 text-gray-400 mb-1">
                                                <EnvironmentOutlined className="text-sm" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
                                            </div>
                                            <div className="text-base font-bold text-gray-950 dark:text-gray-100">{fixEncoding(user?.committeeName)}</div>
                                        </div>

                                        <div className="p-5 bg-white/50 dark:bg-white/5 rounded-3xl border border-white dark:border-white/5 shadow-sm space-y-1">
                                            <div className="flex items-center gap-3 text-gray-400 mb-1">
                                                <IdcardOutlined className="text-sm" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Matricule Officiel</span>
                                            </div>
                                            <div className="text-base font-black font-mono text-red-600 dark:text-red-500">{user?.matricule || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto w-full pt-10 border-t border-gray-100 dark:border-gray-800">
                                    <Button
                                        block
                                        size="large"
                                        icon={<ReloadOutlined className={loading ? 'animate-spin' : ''} />}
                                        onClick={handleRefresh}
                                        loading={loading}
                                        className="h-14 rounded-2xl border-2 border-gray-200 dark:border-gray-800 font-black text-[12px] uppercase tracking-widest hover:border-red-600 hover:text-red-600 dark:text-gray-400 transition-all"
                                    >
                                        Synchroniser les données
                                    </Button>
                                </div>
                            </motion.div>
                        </Col>

                        {/* RIGHT: Content Tabs (70%) */}
                        <Col xs={24} lg={16} className="bg-white/40 dark:bg-transparent p-8 lg:p-14">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                                <div>
                                    <Title level={3} className="!mb-1 !font-black !text-gray-950 dark:!text-white uppercase tracking-tight">Configuration</Title>
                                    <Text className="text-gray-500 dark:text-gray-400 font-medium">Gérez vos paramètres et préférences globales</Text>
                                </div>
                                <div className="flex gap-4">
                                    <Button
                                        icon={<DownloadOutlined className="text-red-600" />}
                                        onClick={() => setIsCardModalVisible(true)}
                                        className="h-12 px-6 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm"
                                    >
                                        Carte Pro
                                    </Button>
                                    {!editing ? (
                                        <Button
                                            type="primary"
                                            icon={<EditOutlined />}
                                            onClick={() => setEditing(true)}
                                            className="h-12 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-red-600 border-none shadow-xl shadow-red-600/20"
                                        >
                                            Éditer
                                        </Button>
                                    ) : (
                                        <Space>
                                            <Button onClick={() => setEditing(false)} className="h-12 px-6 rounded-2xl font-bold bg-gray-100 dark:bg-gray-800 border-none">Annuler</Button>
                                            <Button
                                                type="primary"
                                                icon={<SaveOutlined />}
                                                onClick={handleSave}
                                                loading={saving}
                                                className="h-12 px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest bg-emerald-600 border-none shadow-xl shadow-emerald-600/20"
                                            >
                                                Sauver
                                            </Button>
                                        </Space>
                                    )}
                                </div>
                            </div>

                            <Tabs
                                className="premium-compact-tabs"
                                defaultActiveKey="1"
                                items={[
                                    {
                                        key: '1',
                                        label: 'Profile',
                                        children: (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-6 space-y-10">
                                                <Row gutter={[32, 40]}>
                                                    {[
                                                        { label: 'Nom Complet', value: editing ? editFullName : user?.fullName, icon: <UserOutlined />, setter: setEditFullName, disabled: false },
                                                        { label: 'Email Institutionnel', value: user?.email, icon: <MailOutlined />, disabled: true },
                                                        { label: 'Contact Téléphonique', value: editing ? editPhone : user?.phone, icon: <PhoneOutlined />, setter: setEditPhone, disabled: false },
                                                        { label: 'Numéro CIN', value: user?.cin || 'Non renseigné', icon: <IdcardOutlined />, disabled: true },
                                                    ].map((field, i) => (
                                                        <Col xs={24} md={12} key={i}>
                                                            <div className="space-y-3">
                                                                <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{field.label}</Text>
                                                                <Input
                                                                    size="large"
                                                                    value={field.value}
                                                                    onChange={field.setter ? (e) => field.setter(e.target.value) : undefined}
                                                                    disabled={field.disabled || !editing}
                                                                    prefix={<div className="mr-3 text-red-600">{field.icon}</div>}
                                                                    className={`h-16 rounded-3xl font-bold transition-all border-none ${editing && !field.disabled ? 'bg-white dark:bg-gray-800 shadow-xl ring-2 ring-red-600/20' : 'bg-gray-50/50 dark:bg-gray-900/40 opacity-80'}`}
                                                                />
                                                            </div>
                                                        </Col>
                                                    ))}
                                                </Row>

                                                <div className="p-8 bg-gradient-to-br from-red-600 to-rose-700 rounded-[40px] shadow-2xl shadow-red-600/30 overflow-hidden relative">
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
                                                    <div className="flex items-center gap-6 mb-8 relative z-10">
                                                        <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg border border-white/20">
                                                            <SafetyCertificateOutlined className="text-white text-3xl" />
                                                        </div>
                                                        <div>
                                                            <Title level={4} className="!m-0 !font-black !text-white !text-2xl uppercase tracking-tight">Statut Officiel</Title>
                                                            <Text className="text-white/70 font-bold text-sm tracking-wide">Validation des compétences par CRT Core</Text>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                                                        {[
                                                            { label: 'Niveau', value: 'Vétéran', icon: <TrophyFilled /> },
                                                            { label: 'Validation', value: 'Verify', icon: <SafetyCertificateOutlined /> },
                                                            { label: 'Heures', value: `${user?.hoursVolunteered || 0}h`, icon: <ClockCircleOutlined /> },
                                                            { label: 'Adhésion', value: user?.dateAdhesion ? new Date(user.dateAdhesion).getFullYear() : '2024', icon: <CalendarOutlined /> }
                                                        ].map((s, idx) => (
                                                            <div key={idx} className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/10 flex flex-col items-center text-center">
                                                                <div className="text-white/60 mb-2 text-xl">{s.icon}</div>
                                                                <Text className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">{s.label}</Text>
                                                                <Text className="font-black text-white text-base">{s.value}</Text>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    },
                                    {
                                        key: '2',
                                        label: 'Skills',
                                        children: (
                                            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="pt-6">
                                                <Row gutter={[24, 24]}>
                                                    <Col span={24}>
                                                        <Card className="bg-gray-50/50 dark:bg-gray-900/30 rounded-[32px] border-none">
                                                            <div className="flex items-center gap-4 mb-8">
                                                                <div className="p-3 bg-red-600 rounded-xl shadow-lg shadow-red-600/20 text-white"><ThunderboltFilled /></div>
                                                                <Title level={4} className="!m-0 !font-black uppercase tracking-tight">Expertise & Domaines</Title>
                                                            </div>
                                                            <div className="flex flex-wrap gap-4">
                                                                {editSkills.length > 0 ? (
                                                                    editSkills.map(skill => (
                                                                        <Tag key={skill} className="rounded-2xl px-6 py-3 font-black uppercase text-[10px] tracking-widest border-none bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm">
                                                                            {skill}
                                                                        </Tag>
                                                                    ))
                                                                ) : (
                                                                    <Empty description="Aucune compétence répertoriée." />
                                                                )}
                                                            </div>
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            </motion.div>
                                        )
                                    },
                                    {
                                        key: '3',
                                        label: 'Settings',
                                        children: (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pt-6 space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="p-8 bg-gray-50/50 dark:bg-gray-900/30 rounded-[40px] flex items-center justify-between border-2 border-transparent hover:border-red-600/10 transition-all">
                                                        <div className="space-y-1">
                                                            <Title level={5} className="!m-0 !font-black uppercase tracking-tight">Theme Visuel</Title>
                                                            <Text className="text-gray-400 font-medium">Toggle dark/light mode</Text>
                                                        </div>
                                                        <Switch
                                                            checked={themeMode === 'dark'}
                                                            onChange={toggleTheme}
                                                            checkedChildren={<MoonOutlined />}
                                                            unCheckedChildren={<SunOutlined />}
                                                            className={themeMode === 'dark' ? 'bg-red-600' : 'bg-gray-300'}
                                                        />
                                                    </div>
                                                    <div className="p-8 bg-gray-50/50 dark:bg-gray-900/30 rounded-[40px] space-y-4">
                                                        <div className="space-y-1 mb-4">
                                                            <Title level={5} className="!m-0 !font-black uppercase tracking-tight">Localisation</Title>
                                                            <Text className="text-gray-400 font-medium">Langue du système de gestion</Text>
                                                        </div>
                                                        <Select
                                                            value={i18n.language}
                                                            size="large"
                                                            style={{ width: '100%' }}
                                                            className="premium-red-select"
                                                            onChange={(val) => i18n.changeLanguage(val)}
                                                            options={[
                                                                { value: 'fr', label: 'Français (CRT Official)' },
                                                                { value: 'en', label: 'English (US)' },
                                                                { value: 'ar', label: 'العربية (Tunisie)' },
                                                            ]}
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )
                                    }
                                ]}
                            />
                        </Col>
                    </Row>
                </div>
            </div>

            {/* Modal for ID Card */}
            <Modal
                title={<div className="font-black uppercase tracking-widest text-[12px]"><IdcardOutlined className="text-red-600 mr-2" /> Identification Officielle</div>}
                open={isCardModalVisible}
                onCancel={() => setIsCardModalVisible(false)}
                footer={null}
                width={700}
                centered
                className="nexus-v3-modal"
            >
                <div className="py-12 flex flex-col items-center bg-gray-50 dark:bg-gray-950/50 rounded-[48px] border border-gray-100 dark:border-gray-800 shadow-inner overflow-hidden">
                    <VolunteerIDCard ref={cardRef} user={user} />
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadCard}
                        className="mt-12 h-14 px-12 rounded-2xl bg-red-600 border-none font-black uppercase tracking-widest text-[12px] shadow-2xl shadow-red-600/30"
                    >
                        Exporter en Haute Définition
                    </Button>
                </div>
            </Modal>

            <style>{`
                .premium-compact-tabs .ant-tabs-nav::before { border: none !important; }
                .premium-compact-tabs .ant-tabs-tab { padding: 0; margin-right: 48px !important; transition: all 0.4s ease; }
                .premium-compact-tabs .ant-tabs-tab-btn { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: #9ca3af; }
                .premium-compact-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #dc2626 !important; }
                .premium-compact-tabs .ant-tabs-ink-bar { background: #dc2626; height: 4px; border-radius: 4px; bottom: -8px; }
                
                .premium-red-select .ant-select-selector { border-radius: 16px !important; border: 2px solid transparent !important; background: white !important; height: 50px !important; display: flex; align-items: center; font-weight: 700; }
                .dark .premium-red-select .ant-select-selector { background: #111827 !important; color: white !important; border-color: #1f2937 !important; }
                
                .nexus-v3-modal .ant-modal-content { border-radius: 56px; padding: 40px; background: rgba(255,255,255,0.9); backdrop-blur: 20px; border: 1px solid white; box-shadow: 0 40px 100px rgba(0,0,0,0.2); }
                .dark .nexus-v3-modal .ant-modal-content { background: rgba(10,10,12,0.9); border-color: rgba(255,255,255,0.05); }
                .nexus-v3-modal .ant-modal-header { background: transparent; border-bottom: none; }
                
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 1s cubic-bezier(0.2, 0.8, 0.2, 1); }
            `}</style>
        </div>
    );

};

export default MyProfilePage;
