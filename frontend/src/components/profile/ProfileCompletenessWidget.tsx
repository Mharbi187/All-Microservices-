import React, { useEffect, useState } from 'react';
import { Card, Progress, Statistic, Row, Col, Typography, Space, Spin, Button } from 'antd';
import {
    CheckCircleFilled, ClockCircleOutlined, UserOutlined,
    RiseOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import onboardingService, {
    ExtendedProfile, CompletenessStats,
    EDUCATION_LEVEL_LABELS
} from '@/services/onboardingService';
import { useAuthStore } from '@/stores';

const { Title, Text, Paragraph } = Typography;

interface MissingField {
    key: string;
    label: string;
}

const FIELD_LABELS: Record<string, string> = {
    phone: 'Numéro de téléphone',
    emergencyContactName: 'Contact d\'urgence — Nom',
    emergencyContactPhone: 'Contact d\'urgence — Téléphone',
    emergencyContactRelation: 'Contact d\'urgence — Relation',
    photoUrl: 'Photo de profil',
    educationLevel: 'Niveau d\'étude',
    specializationDomain: 'Domaine de spécialisation',
    trainingCoursesAttended: 'Formations suivies',
    realIntegrationDate: 'Date d\'intégration réelle',
    otherSkills: 'Autres compétences',
};

const ProfileCompletenessWidget: React.FC<{ adminView?: boolean }> = ({ adminView = false }) => {
    const [profile, setProfile] = useState<ExtendedProfile | null>(null);
    const [stats, setStats] = useState<CompletenessStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [prof, st] = await Promise.all([
                    onboardingService.getMyExtendedProfile(),
                    adminView ? onboardingService.getCompletenessStats() : Promise.resolve(null),
                ]);
                setProfile(prof);
                setStats(st);
            } catch {
                // silently fail
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [adminView]);

    const getMissingFields = (p: ExtendedProfile): MissingField[] => {
        const missing: MissingField[] = [];
        const checks: Record<string, () => boolean> = {
            phone: () => !p.phone,
            emergencyContactName: () => !p.emergencyContactName,
            emergencyContactPhone: () => !p.emergencyContactPhone,
            emergencyContactRelation: () => !p.emergencyContactRelation,
            photoUrl: () => !p.photoUrl,
            educationLevel: () => !p.educationLevel,
            specializationDomain: () => !p.specializationDomain,
            trainingCoursesAttended: () => !p.trainingCoursesAttended,
            realIntegrationDate: () => !p.realIntegrationDate,
            otherSkills: () => !p.otherSkills,
        };
        for (const [key, check] of Object.entries(checks)) {
            if (check()) missing.push({ key, label: FIELD_LABELS[key] });
        }
        return missing;
    };

    if (loading) return (
        <Card className="rounded-2xl shadow-sm" style={{ minHeight: 200 }}>
            <div className="flex items-center justify-center h-40">
                <Spin size="large" />
            </div>
        </Card>
    );

    const score = profile?.profileCompletionScore ?? 0;
    const completed = profile?.profileCompleted ?? false;
    const missing = profile ? getMissingFields(profile) : [];

    const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626';

    return (
        <div className="space-y-4">
            {/* Personal Score Card */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-2xl shadow-lg border-0"
                    style={{ background: completed ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)' }}
                    styles={{ body: { padding: '24px' } }}>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <Title level={4} className="!mb-1">
                                {completed ? '✅ Profil Complet' : '⚠️ Profil Incomplet'}
                            </Title>
                            <Text type="secondary">
                                {completed
                                    ? 'Votre profil est validé. Toutes vos informations sont à jour.'
                                    : 'Complétez votre profil pour accéder à toutes les fonctionnalités.'}
                            </Text>
                        </div>
                        <div className="text-right">
                            <div style={{ fontSize: 36, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                                {score}%
                            </div>
                            <Text type="secondary" style={{ fontSize: 12 }}>de complétude</Text>
                        </div>
                    </div>

                    <Progress
                        percent={score}
                        strokeColor={scoreColor}
                        trailColor={score >= 80 ? '#bbf7d0' : '#fecaca'}
                        strokeWidth={12}
                        format={() => ''}
                    />

                    {!completed && (
                        <div className="mt-4">
                            <Link to="/onboarding">
                                <Button type="primary" size="large" block
                                    className="rounded-xl font-bold"
                                    style={{ background: '#dc2626', borderColor: '#dc2626', height: 44 }}>
                                    Compléter mon profil →
                                </Button>
                            </Link>
                        </div>
                    )}
                </Card>
            </motion.div>

            {/* Missing Fields */}
            {!completed && missing.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="rounded-2xl shadow-sm" title={
                        <Space>
                            <ClockCircleOutlined className="text-orange-500" />
                            <span>Champs manquants ({missing.length})</span>
                        </Space>
                    } styles={{ body: { padding: '16px 24px' } }}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {missing.map(f => (
                                <div key={f.key}
                                    className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 text-orange-700 text-sm">
                                    <span className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
                                    {f.label}
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Admin Stats */}
            {adminView && stats && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="rounded-2xl shadow-sm" title={
                        <Space>
                            <RiseOutlined className="text-blue-500" />
                            <span>Statistiques globales — Complétude</span>
                        </Space>
                    }>
                        <Row gutter={[24, 16]}>
                            <Col xs={24} md={8}>
                                <Statistic
                                    title="Profils complétés"
                                    value={stats.totalCompleted}
                                    prefix={<CheckCircleFilled className="text-green-500" />}
                                    valueStyle={{ color: '#16a34a', fontWeight: 700 }}
                                />
                            </Col>
                            <Col xs={24} md={8}>
                                <Statistic
                                    title="Profils incomplets"
                                    value={stats.totalIncomplete}
                                    prefix={<ClockCircleOutlined className="text-orange-500" />}
                                    valueStyle={{ color: '#f59e0b', fontWeight: 700 }}
                                />
                            </Col>
                            <Col xs={24} md={8}>
                                <Statistic
                                    title="Score moyen"
                                    value={stats.averageScore ? Math.round(stats.averageScore) : 0}
                                    suffix="%"
                                    prefix={<TrophyOutlined className="text-purple-500" />}
                                    valueStyle={{ color: '#7c3aed', fontWeight: 700 }}
                                />
                            </Col>
                        </Row>
                        <div className="mt-4">
                            <Progress
                                percent={stats.totalCompleted + stats.totalIncomplete > 0
                                    ? Math.round((stats.totalCompleted / (stats.totalCompleted + stats.totalIncomplete)) * 100)
                                    : 0}
                                strokeColor={{ '0%': '#dc2626', '100%': '#16a34a' }}
                                format={(p) => `${p}% des profils complétés`}
                            />
                        </div>
                    </Card>
                </motion.div>
            )}
        </div>
    );
};

export default ProfileCompletenessWidget;
