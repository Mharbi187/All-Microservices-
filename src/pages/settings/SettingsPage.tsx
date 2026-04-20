// ============================================================
// NEXUS-AID — Settings Page (Final Revamp)
// Profile Management with Identity Card, Cloudinary Upload & Premium UI
// ============================================================

import { useState, useEffect } from 'react';
import { 
    Card, Col, Row, Typography, Space, Tag, Input, 
    Button, Divider, Switch, Select, Spin, 
    Avatar, Badge, Tabs, Upload, App
} from 'antd';
import {
    UserOutlined, SettingOutlined, BellOutlined, GlobalOutlined,
    MoonOutlined, SunOutlined, LockOutlined, SaveOutlined,
    MailOutlined, PhoneOutlined, IdcardOutlined,
    SafetyCertificateOutlined, EnvironmentOutlined,
    CheckCircleOutlined, CameraOutlined, LoadingOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores';
import { useUIStore } from '@/stores';
import { getUserPermissions } from '@/config/roleConfig';
import authService from '@/services/authService';
import i18n from 'i18next';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

// Configuration Cloudinary
const CLOUDINARY_CLOUD_NAME = 'doxmfj1cw'; 
const CLOUDINARY_UPLOAD_PRESET = 'exus_aid_preset';

/**
 * Utility to fix common encoding issues where UTF-8 characters are misinterpreted.
 */
const fixEncoding = (str: string | undefined): string => {
    if (!str) return '—';
    try {
        return str.replace(/\?\?/g, (match, offset) => {
            if (str.substring(offset - 5, offset) === 'Comit') return 'é';
            if (str.substring(offset - 2, offset) === 'R') return 'é';
            return 'é';
        }).replace(/Ã©/g, 'é').replace(/Ã/g, 'à');
    } catch {
        return str;
    }
};

const SettingsPage: React.FC = () => {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const { user, fetchProfile, setUser } = useAuthStore();
    const { themeMode, toggleTheme } = useUIStore();
    const permissions = getUserPermissions(user?.roles || []);
    const isDark = themeMode === 'dark';

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        phone: '',
        matricule: '',
        skills: '',
    });

    useEffect(() => {
        if (user) {
            setProfileData({
                fullName: user.fullName || '',
                email: user.email || '',
                phone: user.phone || '',
                matricule: user.matricule || '',
                skills: user.skills || '',
            });
        }
    }, [user]);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await fetchProfile();
            message.success('Profil mis à jour');
        } catch {
            message.error('Échec de la synchronisation');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handles the direct upload to Cloudinary and synchronization with the backend.
     */
    const handleAvatarUpload = async (info: any) => {
        const file = info.file;
        
        // Basic validation
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('Seuls les fichiers JPG/PNG sont acceptés.');
            return false;
        }

        setUploading(true);
        try {
            // 1. Upload to Cloudinary via FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const cloudinaryResponse = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            if (!cloudinaryResponse.ok) {
                const errorData = await cloudinaryResponse.json();
                throw new Error(errorData?.error?.message || 'Cloudinary upload failed');
            }

            const data = await cloudinaryResponse.json();

            // 2. Synchronize with the backend by sending BOTH the URL and the public_id
            await authService.updateAvatarUrl(data.secure_url, data.public_id);
            
            // 3. Update the local user state to reflect the new avatar
            if (user) {
                setUser({ ...user, avatar: data.secure_url });
            }
            message.success('Photo de profil mise à jour avec succès !');
        } catch (error: any) {
            console.error('Avatar upload error:', error);
            message.error(`Erreur d'upload : ${error.message || 'Problème de connexion'}`);
            
            // Helpful hint if it looks like a Cloud Name issue
            if (error.message?.includes('not found') || error.message?.includes('cloud_name')) {
                message.warning('Vérifiez que votre Cloud Name est correct dans la configuration.');
            }
        } finally {
            setUploading(false);
        }
        return false;
    };

    const labelStyle: React.CSSProperties = { 
        fontSize: 12, 
        fontWeight: 700, 
        color: isDark ? '#9ca3af' : '#6b7280', 
        textTransform: 'uppercase', 
        letterSpacing: '0.05em', 
        marginBottom: 8, 
        display: 'block' 
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }} className="animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-8 bg-red-600 rounded-full" />
                        <Title level={2} className="!mb-0 !font-black tracking-tight">{t('nav.settings')}</Title>
                    </div>
                    <Text type="secondary" className="text-lg">Gérez votre identité et vos préférences Nexus-AID</Text>
                </div>
                <Button 
                    type="primary"
                    icon={<SaveOutlined />} 
                    onClick={handleRefresh} 
                    loading={loading}
                    className="h-12 px-8 rounded-xl font-bold bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
                >
                    Rafraîchir les données
                </Button>
            </div>

            <Row gutter={[32, 32]}>
                {/* LEFT COLUMN: Identity Card */}
                <Col xs={24} lg={8}>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Card 
                            variant="borderless"
                            className="overflow-hidden"
                            style={{ 
                                borderRadius: 32, 
                                boxShadow: '0 20px 50px rgba(0,0,0,0.06)',
                                background: isDark ? 'rgba(255,255,255,0.02)' : '#fff'
                            }}
                            styles={{ body: { padding: 0 } }}
                        >
                            <div className="h-32 bg-gradient-to-br from-red-600 to-red-800" />
                            
                            <div className="px-8 pb-10 -mt-16 text-center">
                                <div className="relative inline-block group">
                                    <Badge count={<SafetyCertificateOutlined className="text-xl text-green-500 bg-white rounded-full p-1 border-2 border-green-500 shadow-sm" />} offset={[-10, 100]}>
                                        <div className="relative">
                                            <Avatar 
                                                size={128} 
                                                icon={uploading ? <LoadingOutlined /> : <UserOutlined />} 
                                                src={user?.avatar}
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
                                            <div className={`w-2 h-2 rounded-full ${user?.status === 'APPROVED' ? 'bg-green-500 animate-pulse' : 'bg-orange-500'}`} />
                                            <Text strong className={user?.status === 'APPROVED' ? 'text-green-600' : 'text-orange-600'}>
                                                {user?.status === 'APPROVED' ? 'Vérifié' : 'En attente'}
                                            </Text>
                                        </Space>
                                    </div>
                                    <CheckCircleOutlined className="text-3xl text-green-500/20" />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </Col>

                {/* RIGHT COLUMN: Settings Form */}
                <Col xs={24} lg={16}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Tabs 
                            defaultActiveKey="general"
                            className="premium-tabs"
                            items={[
                                {
                                    key: 'general',
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
                                                        value={profileData.fullName} 
                                                        disabled
                                                        className="h-12 rounded-xl"
                                                    />
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Text style={labelStyle}>Email</Text>
                                                    <Input 
                                                        size="large" 
                                                        prefix={<MailOutlined className="text-gray-400" />} 
                                                        value={profileData.email} 
                                                        disabled 
                                                        className="h-12 rounded-xl bg-gray-50"
                                                    />
                                                </Col>
                                                <Col xs={24} md={12}>
                                                    <Text style={labelStyle}>Téléphone</Text>
                                                    <Input 
                                                        size="large" 
                                                        prefix={<PhoneOutlined className="text-red-500" />} 
                                                        value={profileData.phone} 
                                                        disabled
                                                        className="h-12 rounded-xl"
                                                    />
                                                </Col>
                                            </Row>
                                        </Card>
                                    )
                                },
                                {
                                    key: 'preferences',
                                    label: <span className="px-4 font-bold text-base"><SettingOutlined /> Préférences</span>,
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
                                    )
                                }
                            ]}
                        />
                    </motion.div>
                </Col>
            </Row>
        </div>
    );
};

export default SettingsPage;
