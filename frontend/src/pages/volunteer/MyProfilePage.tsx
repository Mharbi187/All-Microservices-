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
} from '@ant-design/icons';
import { motion } from 'framer-motion';
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

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'doxmfj1cw';
const CLOUDINARY_UPLOAD_PRESET = 'exus_aid_preset';

const statusColors: Record<string, string> = {
    APPROVED: 'green',
    PENDING: 'orange',
    REJECTED: 'red',
    SUSPENDED: 'default',
};

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

    const accountStatus = user?.status || 'PENDING';

    const labelStyle: React.CSSProperties = {
        fontSize: 12,
        fontWeight: 700,
        color: isDark ? '#9ca3af' : '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 8,
        display: 'block',
    };

    // Parse skills for display
    const skillsList: string[] = (() => {
        const s = user?.skills;
        if (Array.isArray(s)) return s;
        if (typeof s === 'string' && s) {
            try { return JSON.parse(s); } catch { return []; }
        }
        return [];
    })();

    if (loading && !user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Chargement du profil...">
                    <div style={{ width: 1, height: 1 }} />
                </Spin>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }} className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-red-600 rounded-full" />
                        <Title level={2} className="!mb-0 !font-black tracking-tight">Profil</Title>
                    </div>
                    <Text type="secondary" className="text-lg">Gérez votre identité et vos préférences Nexus-AID</Text>
                </div>
                <Space>
                    <Button
                        icon={<IdcardOutlined />}
                        onClick={() => setIsCardModalVisible(true)}
                        className="h-10 px-6 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                    >
                        Générer Carte
                    </Button>
                    {!editing ? (
                        <>
                            <Button
                                icon={<EditOutlined />}
                                onClick={() => setEditing(true)}
                                className="h-10 px-6 rounded-xl font-bold"
                            >
                                Modifier
                            </Button>
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                onClick={handleRefresh}
                                loading={loading}
                                className="h-10 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-700"
                            >
                                Rafraîchir
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={() => setEditing(false)} className="h-10 px-6 rounded-xl">
                                Annuler
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSave}
                                loading={saving}
                                className="h-10 px-6 rounded-xl font-bold bg-red-600 hover:bg-red-700"
                            >
                                Enregistrer
                            </Button>
                        </>
                    )}
                </Space>
            </div>

            {/* Modal for ID Card Preview & Download */}
            <Modal
                title="Carte d'Identité Volontaire Nexus-AID"
                open={isCardModalVisible}
                onCancel={() => setIsCardModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsCardModalVisible(false)}>
                        Fermer
                    </Button>,
                    <Button 
                        key="download" 
                        type="primary" 
                        icon={<DownloadOutlined />} 
                        onClick={handleDownloadCard}
                        style={{ background: '#C81E1E' }}
                    >
                        Télécharger PNG
                    </Button>
                ]}
                width={650}
                centered
            >
                <div style={{ padding: '20px 0', border: 'none', background: 'transparent', display: 'flex', justifyContent: 'center' }}>
                    <VolunteerIDCard ref={cardRef} user={user} />
                </div>
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <Text type="secondary" italic fontSize={12}>
                        Cette carte est générée automatiquement à partir de vos informations de profil Nexus-AID.
                    </Text>
                </div>
            </Modal>

            {/* Status alert for non-approved */}
            {!isApproved && (
                <Alert
                    message={
                        accountStatus === 'PENDING'
                            ? 'Compte en attente d\'approbation'
                            : accountStatus === 'REJECTED'
                            ? 'Compte rejeté'
                            : 'Compte suspendu'
                    }
                    description={
                        accountStatus === 'PENDING'
                            ? 'Votre compte est en attente de validation par le président de votre comité. Certaines fonctionnalités sont restreintes.'
                            : accountStatus === 'REJECTED'
                            ? 'Votre demande d\'adhésion a été rejetée. Contactez votre comité local pour plus d\'informations.'
                            : 'Votre compte a été suspendu. Contactez l\'administration.'
                    }
                    type={accountStatus === 'PENDING' ? 'warning' : 'error'}
                    showIcon
                    style={{ borderRadius: 12, marginBottom: 24 }}
                />
            )}

            <Row gutter={[32, 32]}>
                {/* LEFT COLUMN: Identity Card */}
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <Card
                            variant="borderless"
                            className="overflow-hidden"
                            style={{
                                borderRadius: 32,
                                boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
                                background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                            }}
                            styles={{ body: { padding: 0 } }}
                        >
                            <div className="h-32 bg-gradient-to-br from-red-600 to-red-800" />

                            <div className="px-8 pb-10 -mt-16 text-center">
                                <div className="relative inline-block group">
                                    <Badge
                                        count={
                                            isApproved
                                                ? <SafetyCertificateOutlined className="text-xl text-green-500 bg-white rounded-full p-1 border-2 border-green-500 shadow-sm" />
                                                : <ClockCircleOutlined className="text-xl text-orange-500 bg-white rounded-full p-1 border-2 border-orange-500 shadow-sm" />
                                        }
                                        offset={[-10, 100]}
                                    >
                                        <div className="relative">
                                            <Avatar
                                                size={128}
                                                icon={uploading ? <LoadingOutlined /> : <UserOutlined />}
                                                src={user?.avatar || undefined}
                                                className="border-8 border-white shadow-2xl bg-white transition-opacity group-hover:opacity-80"
                                                style={{ border: isDark ? '8px solid #1f2937' : '8px solid #fff' }}
                                            />
                                            <Upload
                                                accept="image/*"
                                                showUploadList={false}
                                                beforeUpload={(file) => {
                                                    handleAvatarUpload({ file });
                                                    return false;
                                                }}
                                            >
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    <div className="bg-black/40 text-white p-3 rounded-full backdrop-blur-sm scale-75 group-hover:scale-100 transition-transform">
                                                        <CameraOutlined style={{ fontSize: 24 }} />
                                                    </div>
                                                </div>
                                            </Upload>
                                        </div>
                                    </Badge>
                                </div>

                                <div className="mt-6">
                                    <Title level={3} className="!mb-1 !font-black">{user?.fullName || 'Utilisateur'}</Title>
                                    <Tag color="error" className="rounded-full px-4 font-bold border-none py-0.5">
                                        {permissions.label}
                                    </Tag>
                                </div>

                                <div className="mt-8 space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <EnvironmentOutlined className="text-red-500" />
                                            <Text strong className="text-xs uppercase opacity-60">Comité</Text>
                                        </div>
                                        <Text className="font-bold">{fixEncoding(user?.committeeName)}</Text>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <IdcardOutlined className="text-red-500" />
                                            <Text strong className="text-xs uppercase opacity-60">Matricule</Text>
                                        </div>
                                        <Text className="font-mono font-bold text-red-600">{user?.matricule || 'N/A'}</Text>
                                    </div>
                                </div>

                                <Divider className="my-8 opacity-10" />

                                <div className="flex items-center justify-between">
                                    <div className="text-left">
                                        <Text className="text-[10px] uppercase font-black opacity-40 block">Statut du Compte</Text>
                                        <Space size="small">
                                            <div className={`w-2 h-2 rounded-full ${isApproved ? 'bg-green-500 animate-pulse' : accountStatus === 'PENDING' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                            <Text strong className={isApproved ? 'text-green-600' : accountStatus === 'PENDING' ? 'text-orange-600' : 'text-red-600'}>
                                                {isApproved ? 'Vérifié' : accountStatus === 'PENDING' ? 'En attente' : accountStatus}
                                            </Text>
                                        </Space>
                                    </div>
                                    <CheckCircleOutlined className={`text-3xl ${isApproved ? 'text-green-500/40' : 'text-gray-300/40'}`} />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                {/* RIGHT COLUMN: Tabbed Content */}
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Tabs
                            defaultActiveKey="profile"
                            className="premium-tabs"
                            items={[
                                {
                                    key: 'profile',
                                    label: <span className="px-4 font-bold text-base"><UserOutlined /> Profil</span>,
                                    children: (
                                        <Card variant="borderless" style={{ borderRadius: 24 }} className="p-4">
                                            <Title level={4} className="mb-8">Informations de base</Title>
                                            <Row gutter={[24, 24]}>
                                                <Col xs={24} md={12}>
                                                    <Text style={labelStyle}>Nom complet</Text>
                                                    <Input
                                                        size="large"
                                                        prefix={<UserOutlined className="text-red-500" />}
                                                        value={editing ? editFullName : user?.fullName}
                                                        onChange={(e) => setEditFullName(e.target.value)}
                                                        disabled={!editing}
                                                        className="h-12 rounded-xl"
                                                    />
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Text style={labelStyle}>Email</Text>
                                                    <Input
                                                        size="large"
                                                        prefix={<MailOutlined className="text-gray-400" />}
                                                        value={user?.email}
                                                        disabled
                                                        className="h-12 rounded-xl bg-gray-50"
                                                    />
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Text style={labelStyle}>Téléphone</Text>
                                                    <Input
                                                        size="large"
                                                        prefix={<PhoneOutlined className="text-red-500" />}
                                                        value={editing ? editPhone : user?.phone}
                                                        onChange={(e) => setEditPhone(e.target.value)}
                                                        disabled={!editing}
                                                        className="h-12 rounded-xl"
                                                    />
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Text style={labelStyle}>CIN</Text>
                                                    <Input
                                                        size="large"
                                                        prefix={<IdcardOutlined className="text-gray-400" />}
                                                        value={user?.cin}
                                                        disabled
                                                        className="h-12 rounded-xl bg-gray-50"
                                                    />
                                                </Col>
                                            </Row>

                                            {/* Committee Roles */}
                                            <Divider orientation="left" plain className="mt-8">
                                                <TeamOutlined className="text-red-500" /> Rôles & Comité
                                            </Divider>
                                            {user?.roles && user.roles.length > 0 ? (
                                                <Space wrap>
                                                    {user.roles.map((r) => (
                                                        <Tag key={r} color="volcano" style={{ fontWeight: 600, fontSize: 13 }}>{r}</Tag>
                                                    ))}
                                                </Space>
                                            ) : (
                                                <Text type="secondary">Aucun rôle de comité attribué</Text>
                                            )}
                                        </Card>
                                    ),
                                },
                                {
                                    key: 'advanced',
                                    label: (
                                        <span className="px-4 font-bold text-base">
                                            {isApproved ? <StarOutlined /> : <LockOutlined />} Avancé
                                        </span>
                                    ),
                                    disabled: !isApproved,
                                    children: (
                                        <Card variant="borderless" style={{ borderRadius: 24 }} className="p-4">
                                            {!isApproved ? (
                                                <Alert
                                                    message="Section verrouillée"
                                                    description="Cette section sera accessible après l'approbation de votre compte par le président du comité."
                                                    type="warning"
                                                    showIcon
                                                    style={{ borderRadius: 12 }}
                                                />
                                            ) : (
                                                <>
                                                    {/* Stats */}
                                                    <Row gutter={24} style={{ marginBottom: 24 }}>
                                                        <Col span={8}>
                                                            <Statistic
                                                                title="Heures"
                                                                value={user?.hoursVolunteered || 0}
                                                                suffix="h"
                                                                prefix={<ClockCircleOutlined style={{ color: '#C81E1E' }} />}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Statistic
                                                                title="Certifications"
                                                                value={certifications.length}
                                                                prefix={<SafetyCertificateOutlined style={{ color: '#f59e0b' }} />}
                                                            />
                                                        </Col>
                                                        <Col span={8}>
                                                            <Statistic
                                                                title="Adhésion"
                                                                value={user?.dateAdhesion || '—'}
                                                                prefix={<CalendarOutlined style={{ color: '#2563eb' }} />}
                                                                valueStyle={{ fontSize: 14 }}
                                                            />
                                                        </Col>
                                                    </Row>

                                                    {/* Skills */}
                                                    <Divider orientation="left" plain>
                                                        <StarOutlined className="text-blue-500" /> Compétences
                                                    </Divider>
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
                                                        <Space wrap>
                                                            {skillsList.length > 0 ? (
                                                                skillsList.map((s: string, i: number) => (
                                                                    <Tag key={i} color="geekblue">{s}</Tag>
                                                                ))
                                                            ) : (
                                                                <Text type="secondary">Aucune compétence enregistrée</Text>
                                                            )}
                                                        </Space>
                                                    )}

                                                    {/* Certifications */}
                                                    <Divider orientation="left" plain className="mt-6">
                                                        <SafetyCertificateOutlined className="text-green-500" /> Certifications
                                                    </Divider>
                                                    {certifications.length > 0 ? (
                                                        <Space direction="vertical" style={{ width: '100%' }}>
                                                            {certifications.map((cert) => (
                                                                <Card
                                                                    key={cert.id}
                                                                    size="small"
                                                                    style={{
                                                                        borderRadius: 8,
                                                                        borderLeft: `3px solid ${
                                                                            certStatusColors[cert.status] === 'green' ? '#16a34a'
                                                                            : certStatusColors[cert.status] === 'red' ? '#dc2626'
                                                                            : '#f59e0b'
                                                                        }`,
                                                                    }}
                                                                >
                                                                    <Row justify="space-between" align="middle">
                                                                        <Col>
                                                                            <Text strong>{cert.diploma}</Text>
                                                                            <br />
                                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                                <CalendarOutlined /> Obtenu le {cert.dateObtained}
                                                                            </Text>
                                                                        </Col>
                                                                        <Col>
                                                                            <Tag color={certStatusColors[cert.status] || 'default'}>
                                                                                {cert.status}
                                                                            </Tag>
                                                                        </Col>
                                                                    </Row>
                                                                    {cert.dateExpiry && (
                                                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                                                            Expire le : {cert.dateExpiry}
                                                                        </Text>
                                                                    )}
                                                                </Card>
                                                            ))}
                                                        </Space>
                                                    ) : (
                                                        <Empty
                                                            description="Aucune certification enregistrée"
                                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </Card>
                                    ),
                                },
                                {
                                    key: 'preferences',
                                    label: <span className="px-4 font-bold text-base"><GlobalOutlined /> Préférences</span>,
                                    children: (
                                        <Card variant="borderless" style={{ borderRadius: 24 }} className="p-4">
                                            <div className="space-y-8">
                                                <section>
                                                    <Title level={5} className="mb-4">Apparence</Title>
                                                    <div className="flex items-center justify-between">
                                                        <Text strong className="block">Mode sombre</Text>
                                                        <Switch
                                                            checked={themeMode === 'dark'}
                                                            onChange={toggleTheme}
                                                            checkedChildren={<MoonOutlined />}
                                                            unCheckedChildren={<SunOutlined />}
                                                            className={isDark ? 'bg-indigo-600' : 'bg-orange-400'}
                                                        />
                                                    </div>
                                                </section>
                                                <section>
                                                    <Title level={5} className="mb-4">Langue</Title>
                                                    <Select
                                                        value={i18n.language}
                                                        style={{ width: '100%' }}
                                                        className="h-12 !rounded-xl"
                                                        onChange={(val) => i18n.changeLanguage(val)}
                                                        options={[
                                                            { value: 'fr', label: '🇫🇷 Français' },
                                                            { value: 'en', label: '🇬🇧 English' },
                                                            { value: 'ar', label: '🇹🇳 العربية' },
                                                        ]}
                                                    />
                                                </section>
                                            </div>
                                        </Card>
                                    ),
                                },
                            ]}
                        />
                    </motion.div>
                </Col>
            </Row>
        </div>
    );
};

export default MyProfilePage;
