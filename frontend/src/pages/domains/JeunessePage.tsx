// ============================================================
// NEXUS-AID — Jeunesse Dashboard (RESP_JEUNESSE)
// Comprehensive management for youth integration & projects
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Tag, Typography, Space, Button,
    Spin, Tabs, Modal, Tooltip, Select, Drawer,
    Row, Col, Empty, Badge, Descriptions, App, Input, ColorPicker, List, Divider
} from 'antd';
import {
    PlusOutlined, StarOutlined, BarChartOutlined,
    QrcodeOutlined, GlobalOutlined, RobotOutlined,
    EyeOutlined, FileTextOutlined,
    CalendarOutlined, TeamOutlined, SettingOutlined,
    CheckCircleOutlined, ClockCircleOutlined, DeleteOutlined,
    SendOutlined, CopyOutlined, DownloadOutlined, SaveOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { QRCodeSVG } from 'qrcode.react';

import jeunesseService from '@/services/jeunesseService';
import type { YouthIntegrationFormDTO, YouthRecommendationDTO, YouthFormTemplateDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';
import { exportToPDF } from '@/utils/reportUtils';

// New Components
import YouthRecommendationView from './components/YouthRecommendationView';
import YouthFormBuilder from './components/YouthFormBuilder';
import YouthStatsDashboard from './components/YouthStatsDashboard';

const { Title, Text } = Typography;

// ============================================================
// Template Card Component — Premium Design
// ============================================================
interface TemplateCardProps {
    template: YouthFormTemplateDTO & { _responseCount?: number };
    onViewResponses: (t: any) => void;
    onViewQR: (t: any) => void;
    isDark: boolean;
    index: number;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onViewResponses, onViewQR, isDark, index }) => {
    const questions = (() => {
        try { return JSON.parse(template.questions || '[]'); } catch { return []; }
    })();

    const colors = [
        { bg: 'linear-gradient(135deg, #4F46E5, #6366F1)', shadow: 'rgba(79,70,229,0.25)', light: '#EEF2FF' },
        { bg: 'linear-gradient(135deg, #059669, #10B981)', shadow: 'rgba(5,150,105,0.25)', light: '#ECFDF5' },
        { bg: 'linear-gradient(135deg, #D97706, #F59E0B)', shadow: 'rgba(217,119,6,0.25)', light: '#FFFBEB' },
        { bg: 'linear-gradient(135deg, #DC2626, #EF4444)', shadow: 'rgba(220,38,38,0.25)', light: '#FEF2F2' },
        { bg: 'linear-gradient(135deg, #7C3AED, #8B5CF6)', shadow: 'rgba(124,58,237,0.25)', light: '#F5F3FF' },
    ];
    const color = colors[index % colors.length];

    return (
        <div
            className="template-card"
            style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                borderRadius: 24,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                overflow: 'hidden',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                animation: `slideUp 0.5s ease-out ${index * 0.1}s both`,
            }}
            onClick={() => onViewResponses(template)}
        >
            {/* Color Bar */}
            <div style={{ height: 6, background: color.bg }} />

            <div style={{ padding: '24px 28px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: color.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 6px 14px ${color.shadow}`
                            }}>
                                <FileTextOutlined style={{ fontSize: 18, color: '#fff' }} />
                            </div>
                            <div>
                                <Text strong style={{ fontSize: 16, display: 'block', lineHeight: 1.3, color: isDark ? '#f3f4f6' : '#111827' }}>
                                    {template.title}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    <CalendarOutlined style={{ marginRight: 4 }} />
                                    {template.createdAt ? new Date(template.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Récent'}
                                </Text>
                            </div>
                        </div>
                        {template.description && (
                            <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {template.description}
                            </Text>
                        )}
                    </div>
                </div>

                {/* Metrics Row */}
                <div style={{
                    display: 'flex', gap: 12, marginBottom: 20,
                    padding: '14px 16px', borderRadius: 16,
                    background: isDark ? 'rgba(255,255,255,0.04)' : color.light,
                }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f3f4f6' : '#111827' }}>{questions.length}</div>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Questions</Text>
                    </div>
                    <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f3f4f6' : '#111827' }}>{template._responseCount ?? 0}</div>
                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Réponses</Text>
                    </div>
                    <div style={{ width: 1, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <Tag color={template.targetLevel === 'GLOBAL' ? 'blue' : template.targetLevel === 'REGIONAL' ? 'purple' : 'green'}
                            style={{ margin: 0, borderRadius: 8, fontWeight: 700, fontSize: 11 }}>
                            {template.targetLevel || 'LOCAL'}
                        </Tag>
                        <div><Text type="secondary" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Portée</Text></div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        style={{
                            flex: 1, height: 42, borderRadius: 12, fontWeight: 600,
                            background: color.bg, border: 'none',
                            boxShadow: `0 6px 14px ${color.shadow}`
                        }}
                        onClick={(e) => { e.stopPropagation(); onViewResponses(template); }}
                    >
                        Voir Réponses
                    </Button>
                    <Tooltip title="QR Code">
                        <Button
                            icon={<QrcodeOutlined />}
                            style={{ height: 42, width: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => { e.stopPropagation(); onViewQR(template); }}
                        />
                    </Tooltip>
                    <Tooltip title="Copier le lien">
                        <Button
                            icon={<CopyOutlined />}
                            style={{ height: 42, width: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`https://nexus-aid.tn/forms/youth/${template.id}`);
                            }}
                        />
                    </Tooltip>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Main Page
// ============================================================
const JeunessePage: React.FC = () => {
    const { modal, message: messageApi, notification } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const isDark = themeMode === 'dark';
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [forms, setForms] = useState<YouthIntegrationFormDTO[]>([]);
    const [templates, setTemplates] = useState<(YouthFormTemplateDTO & { _responseCount?: number })[]>([]);
    const [recommendations, setRecommendations] = useState<YouthRecommendationDTO[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const user = useAuthStore((s) => s.user);
    const userRole = user?.roles?.[0] || 'RESP_JEUNESSE';
    const userLevel = userRole.includes('NATIONAL') ? 'NATIONAL' : userRole.includes('REGIONAL') ? 'REGIONAL' : 'LOCAL';
    const [selectedCommittee, setSelectedCommittee] = useState<string>(user?.committeeId || 'ALL');

    // UI State
    const [isRecModalOpen, setIsRecModalOpen] = useState(false);
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState<any>(null);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [templateResponses, setTemplateResponses] = useState<any[]>([]);
    const [responsesLoading, setResponsesLoading] = useState(false);
    const [autoRecLoading, setAutoRecLoading] = useState<Record<string, boolean>>({});
    const [domainOptions, setDomainOptions] = useState<any[]>([]);
    const [newOption, setNewOption] = useState({ type: 'CATEGORY', label: '', value: '', color: '#4F46E5' });

    const loadData = useCallback(async () => {
        setLoading(true);
        setStatsLoading(true);
        try {
            const [f, t, opts] = await Promise.all([
                jeunesseService.getForms().catch(() => []),
                jeunesseService.getTemplates().catch(() => []),
                jeunesseService.getOptions().catch(() => []),
            ]);
            const safeF = Array.isArray(f) ? f : [];
            const safeT = Array.isArray(t) ? t : [];
            const safeOpts = Array.isArray(opts) ? opts : [];
            setForms(safeF);
            setDomainOptions(safeOpts);

            // Enrich templates with response counts
            const enriched = await Promise.all(
                safeT.map(async (tmpl: any) => {
                    try {
                        const responses = await jeunesseService.getResponsesByTemplate(tmpl.id);
                        return { ...tmpl, _responseCount: responses.length };
                    } catch {
                        return { ...tmpl, _responseCount: 0 };
                    }
                })
            );
            setTemplates(enriched);

            // Fetch stats separately
            jeunesseService.getStats()
                .then(setStats)
                .catch((err) => console.error('Failed to load stats:', err))
                .finally(() => setStatsLoading(false));

            // Fetch recommendations
            const allRecs: YouthRecommendationDTO[] = [];
            for (const form of safeF) {
                if (form.id) {
                    try {
                        const rec = await jeunesseService.getRecommendation(form.id);
                        if (rec) allRecs.push(rec);
                    } catch { /* no rec */ }
                }
            }
            setRecommendations(allRecs);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleViewResponses = async (template: any) => {
        setSelectedTemplate(template);
        setDrawerVisible(true);
        setResponsesLoading(true);
        try {
            const responses = await jeunesseService.getResponsesByTemplate(template.id);
            setTemplateResponses(responses);
        } catch {
            setTemplateResponses([]);
        } finally {
            setResponsesLoading(false);
        }
    };

    const handleViewQR = (template: any) => {
        modal.info({
            title: null,
            icon: null,
            centered: true,
            width: 420,
            content: (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 20,
                        background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px', boxShadow: '0 8px 20px rgba(79,70,229,0.25)'
                    }}>
                        <QrcodeOutlined style={{ fontSize: 28, color: '#fff' }} />
                    </div>
                    <Title level={4} style={{ marginBottom: 4 }}>{template.title}</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>Scannez ce QR Code pour accéder au formulaire</Text>
                    <div style={{
                        display: 'inline-block', padding: 24, background: '#fff',
                        borderRadius: 20, border: '1px solid #f3f4f6',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
                    }}>
                        <QRCodeSVG value={`https://nexus-aid.tn/forms/youth/${template.id}`} size={200} />
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <Text copyable type="secondary" style={{ fontSize: 12 }}>
                            {`https://nexus-aid.tn/forms/youth/${template.id}`}
                        </Text>
                    </div>
                </div>
            ),
            okText: 'Fermer',
            okButtonProps: { style: { borderRadius: 10, fontWeight: 600 } }
        });
    };

    const handleAutoRecommend = async (formId: string) => {
        setAutoRecLoading(prev => ({ ...prev, [formId]: true }));
        try {
            await jeunesseService.autoGenerateRecommendation(formId);
            notification.success({ 
                message: 'Analyse IA Terminée', 
                description: 'La recommandation a été générée et enregistrée automatiquement.',
                icon: <RobotOutlined style={{ color: '#4F46E5' }} />
            });
            loadData();
            setSelectedForm(forms.find(f => f.id === formId));
            setIsRecModalOpen(true);
        } catch (error: any) {
            notification.error({
                message: 'Erreur d\'Analyse',
                description: error?.response?.status === 403 
                    ? 'Accès refusé : vérifiez vos permissions de responsable jeunesse.'
                    : 'Impossible de générer la recommandation IA pour le moment.'
            });
        } finally {
            setAutoRecLoading(prev => ({ ...prev, [formId]: false }));
        }
    };

    const handleSaveOption = async () => {
        if (!newOption.label || !newOption.value) return;
        try {
            await jeunesseService.saveOption(newOption);
            messageApi.success('Option configurée avec succès');
            setNewOption({ type: 'CATEGORY', label: '', value: '', color: '#4F46E5' });
            loadData();
        } catch (error) {
            messageApi.error('Erreur de configuration');
        }
    };

    const handleDeleteOption = async (id: string) => {
        try {
            await jeunesseService.deleteOption(id);
            messageApi.success('Option supprimée');
            loadData();
        } catch (error) {
            messageApi.error('Échec de la suppression');
        }
    };

    const handleExportPDF = () => {
        const metadata = {
            managerName: user?.fullName || 'Responsable Jeunesse',
            committee: user?.committeeName || 'Comité National',
            date: new Date().toLocaleDateString('fr-TN', { day: '2-digit', month: 'long', year: 'numeric' })
        };
        exportToPDF('stats-report-content', `Rapport_Jeunesse_${new Date().toISOString().split('T')[0]}`, metadata);
        messageApi.success('Rapport PDF généré avec succès');
    };

    const formColumns: ColumnsType<YouthIntegrationFormDTO> = [
        {
            title: 'Volontaire', dataIndex: 'volunteerName', key: 'volunteerName',
            render: (n: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, #4F46E5, #818cf8)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 14
                    }}>
                        {(n || '?')[0]?.toUpperCase()}
                    </div>
                    <Text strong>{n || '—'}</Text>
                </div>
            )
        },
        {
            title: 'Date', dataIndex: 'submittedAt', key: 'submittedAt',
            render: (d: string) => (
                <Space>
                    <CalendarOutlined style={{ color: '#9ca3af' }} />
                    <Text>{d ? new Date(d).toLocaleDateString('fr-FR') : '—'}</Text>
                </Space>
            )
        },
        {
            title: 'Statut', key: 'status',
            render: () => <Tag icon={<CheckCircleOutlined />} color="success" style={{ borderRadius: 10, fontWeight: 600 }}>Soumis</Tag>
        },
        {
            title: 'Actions', key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small" type="primary"
                        icon={<RobotOutlined />}
                        loading={autoRecLoading[record.id!]}
                        onClick={() => handleAutoRecommend(record.id!)}
                        style={{ borderRadius: 8, fontWeight: 600, background: 'linear-gradient(135deg, #4F46E5, #6366F1)', border: 'none' }}
                    >
                        Analyse IA
                    </Button>
                    <Tooltip title="QR Code">
                        <Button size="small" icon={<QrcodeOutlined />} style={{ borderRadius: 8 }}
                            onClick={() => {
                                modal.info({
                                    title: 'QR Code du Formulaire',
                                    centered: true,
                                    content: (
                                        <div style={{ textAlign: 'center', padding: 20 }}>
                                            <QRCodeSVG value={`https://nexus-aid.tn/forms/youth/${record.id}`} size={200} />
                                            <div style={{ marginTop: 12 }}><Text type="secondary" copyable>ID: {record.id}</Text></div>
                                        </div>
                                    ),
                                });
                            }} />
                    </Tooltip>
                </Space>
            )
        },
    ];

    const recColumns: ColumnsType<any> = [
        {
            title: 'Titre', dataIndex: 'title', key: 'title',
            render: (t: string) => <Text strong style={{ fontSize: 14 }}>{t}</Text>
        },
        {
            title: 'Catégorie', dataIndex: 'category', key: 'category',
            render: (c: string) => <Tag color="geekblue" style={{ borderRadius: 8, fontWeight: 600 }}>{c}</Tag>
        },
        {
            title: 'Priorité', dataIndex: 'priority', key: 'priority',
            render: (p: string) => <Tag color={p === 'HIGH' ? 'red' : p === 'MEDIUM' ? 'orange' : 'green'} style={{ borderRadius: 8, fontWeight: 600 }}>{p === 'HIGH' ? 'Haute' : p === 'MEDIUM' ? 'Moyenne' : 'Basse'}</Tag>
        },
        {
            title: 'Statut', dataIndex: 'status', key: 'status',
            render: (s: string) => <Tag icon={s === 'APPROVED' ? <CheckCircleOutlined /> : <ClockCircleOutlined />} color={s === 'APPROVED' ? 'green' : 'gold'} style={{ borderRadius: 8, fontWeight: 600 }}>{s === 'APPROVED' ? 'Approuvée' : s === 'REJECTED' ? 'Rejetée' : 'En attente'}</Tag>
        },
    ];

    // Response columns for the drawer
    const responseColumns: ColumnsType<any> = [
        {
            title: '#', key: 'index', width: 50,
            render: (_, __, idx) => <Badge count={idx + 1} style={{ backgroundColor: '#4F46E5' }} />
        },
        {
            title: 'Volontaire', dataIndex: 'volunteerId', key: 'volunteer',
            render: (id: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, #10B981, #34D399)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 12
                    }}>
                        <TeamOutlined />
                    </div>
                    <Text style={{ fontSize: 13 }}>{id?.substring(0, 8) || '—'}...</Text>
                </div>
            )
        },
        {
            title: 'Date', dataIndex: 'submittedAt', key: 'date',
            render: (d: string) => <Text type="secondary">{d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}</Text>
        },
        {
            title: 'Détails', key: 'details',
            render: (_, record) => {
                const answers = (() => { try { return JSON.parse(record.answers || '{}'); } catch { return {}; } })();
                const count = Object.keys(answers).length;
                return <Tag color="blue" style={{ borderRadius: 8 }}>{count} réponse(s)</Tag>;
            }
        },
    ];

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <Spin size="large" tip="Chargement du tableau de bord...">
                <div style={{ padding: '60px' }} />
            </Spin>
        </div>
    );

    const filteredForms = Array.isArray(forms)
        ? (selectedCommittee === 'ALL' ? forms : forms.filter(f => f.committeeId === selectedCommittee))
        : [];

    return (
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }} className="animate-fade-in">
            {/* ===== HEADER ===== */}
            <div style={{
                background: isDark
                    ? 'linear-gradient(135deg, rgba(79,70,229,0.12), rgba(99,102,241,0.06))'
                    : 'linear-gradient(135deg, rgba(79,70,229,0.06), rgba(99,102,241,0.02))',
                borderRadius: 24, padding: '32px 36px', marginBottom: 32,
                border: `1px solid ${isDark ? 'rgba(79,70,229,0.2)' : 'rgba(79,70,229,0.1)'}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                position: 'relative', overflow: 'hidden'
            }}>
                {/* Background decoration */}
                <div style={{
                    position: 'absolute', top: -40, right: -40, width: 200, height: 200,
                    background: 'radial-gradient(circle, rgba(79,70,229,0.08), transparent 70%)',
                    borderRadius: '50%'
                }} />

                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24, position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{
                            width: 64, height: 64, borderRadius: 20,
                            background: 'linear-gradient(135deg, #4F46E5, #818cf8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 30, color: '#fff',
                            boxShadow: '0 10px 24px rgba(79,70,229,0.3)'
                        }}>
                            🎓
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Jeunesse</Title>
                                <Tag color="blue" icon={<GlobalOutlined />} style={{ borderRadius: 12, padding: '2px 14px', fontWeight: 600, fontSize: 13 }}>{userLevel}</Tag>
                            </div>
                            <Text type="secondary" style={{ fontSize: 15, marginTop: 4, display: 'block' }}>Gestion des formulaires, recommandations et statistiques jeunesse</Text>
                        </div>
                    </div>

                    <Space wrap size="middle">
                        {userLevel !== 'LOCAL' && (
                            <div style={{
                                background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                                padding: '6px 16px', borderRadius: 14,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
                                display: 'flex', alignItems: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                            }}>
                                <Text style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginRight: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>🏛 Comité :</Text>
                                <Select
                                    defaultValue="ALL"
                                    style={{ width: 180 }}
                                    variant="borderless"
                                    onChange={setSelectedCommittee}
                                    options={[
                                        { label: 'Tous les comités', value: 'ALL' },
                                        { label: 'Ariana (Local)', value: 'LOC_ARI' },
                                        { label: 'Tunis (Régional)', value: 'REG_TUN' },
                                    ]}
                                />
                            </div>
                        )}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsBuilderOpen(true)}
                            style={{
                                height: 48, paddingLeft: 24, paddingRight: 24,
                                background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                                borderColor: '#4F46E5',
                                borderRadius: 14, fontWeight: 700,
                                boxShadow: '0 8px 20px rgba(79,70,229,0.25)'
                            }}
                        >
                            Nouveau Formulaire
                        </Button>
                    </Space>
                </div>
            </div>

            {/* ===== DASHBOARD TABS ===== */}
            <Card variant="borderless" style={{ borderRadius: 24, boxShadow: '0 10px 30px rgba(0,0,0,0.04)', overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    className="domain-tabs"
                    tabBarStyle={{ padding: '0 24px', background: isDark ? 'rgba(0,0,0,0.2)' : '#f9fafb', marginBottom: 0 }}
                    items={[
                        {
                            key: 'overview',
                            label: <><BarChartOutlined /> Aperçu Stats</>,
                            children: (
                                <div style={{ padding: 24 }}>
                                    <YouthStatsDashboard
                                        onExport={handleExportPDF}
                                        data={stats}
                                        loading={statsLoading}
                                    />
                                </div>
                            )
                        },
                        {
                            key: 'templates',
                            label: (
                                <Badge count={templates.length} size="small" offset={[12, 0]} color="#4F46E5">
                                    <span><FileTextOutlined /> Formulaires Publiés</span>
                                </Badge>
                            ),
                            children: (
                                <div style={{ padding: 24 }}>
                                    {templates.length === 0 ? (
                                        <div style={{
                                            textAlign: 'center', padding: '60px 20px',
                                            background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                                            borderRadius: 20, border: `2px dashed ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`
                                        }}>
                                            <div style={{
                                                width: 80, height: 80, borderRadius: 24,
                                                background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(99,102,241,0.05))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                margin: '0 auto 20px', fontSize: 36
                                            }}>
                                                📝
                                            </div>
                                            <Title level={4} style={{ marginBottom: 8, color: isDark ? '#d1d5db' : '#374151' }}>Aucun formulaire publié</Title>
                                            <Text type="secondary" style={{ fontSize: 15, display: 'block', marginBottom: 24 }}>
                                                Créez votre premier formulaire pour commencer à collecter des données jeunesse
                                            </Text>
                                            <Button
                                                type="primary"
                                                icon={<PlusOutlined />}
                                                size="large"
                                                onClick={() => setIsBuilderOpen(true)}
                                                style={{
                                                    height: 48, borderRadius: 14, fontWeight: 700,
                                                    background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                                                    boxShadow: '0 8px 20px rgba(79,70,229,0.25)'
                                                }}
                                            >
                                                Créer un Formulaire
                                            </Button>
                                        </div>
                                    ) : (
                                        <Row gutter={[20, 20]}>
                                            {templates.map((tmpl, idx) => (
                                                <Col key={tmpl.id || idx} xs={24} sm={12} lg={8}>
                                                    <TemplateCard
                                                        template={tmpl}
                                                        onViewResponses={handleViewResponses}
                                                        onViewQR={handleViewQR}
                                                        isDark={isDark}
                                                        index={idx}
                                                    />
                                                </Col>
                                            ))}
                                            {/* Add New Card */}
                                            <Col xs={24} sm={12} lg={8}>
                                                <div
                                                    className="template-card"
                                                    onClick={() => setIsBuilderOpen(true)}
                                                    style={{
                                                        borderRadius: 24, height: '100%', minHeight: 280,
                                                        border: `2px dashed ${isDark ? 'rgba(79,70,229,0.3)' : 'rgba(79,70,229,0.2)'}`,
                                                        display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', transition: 'all 0.3s ease',
                                                        background: isDark ? 'rgba(79,70,229,0.04)' : 'rgba(79,70,229,0.02)',
                                                        animation: `slideUp 0.5s ease-out ${templates.length * 0.1}s both`,
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 56, height: 56, borderRadius: 18,
                                                        background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(79,70,229,0.05))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16
                                                    }}>
                                                        <PlusOutlined style={{ fontSize: 24, color: '#4F46E5' }} />
                                                    </div>
                                                    <Text strong style={{ color: '#4F46E5', fontSize: 15 }}>Nouveau Formulaire</Text>
                                                    <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>Cliquez pour créer</Text>
                                                </div>
                                            </Col>
                                        </Row>
                                    )}
                                </div>
                            )
                        },
                        {
                            key: 'forms',
                            label: (
                                <Badge count={forms.length} size="small" offset={[12, 0]} color="#10B981">
                                    <span><SendOutlined /> Soumissions Reçues</span>
                                </Badge>
                            ),
                            children: (
                                <div style={{ padding: 24 }}>
                                    {forms.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    <div>
                                                        <Text type="secondary" style={{ fontSize: 15 }}>Aucune soumission de formulaire d'intégration</Text>
                                                        <br />
                                                        <Text type="secondary" style={{ fontSize: 13 }}>Les volontaires peuvent soumettre leur formulaire via l'espace volontaire</Text>
                                                    </div>
                                                }
                                            />
                                        </div>
                                    ) : (
                                        <Table
                                            columns={formColumns}
                                            dataSource={filteredForms}
                                            rowKey="id"
                                            pagination={{ pageSize: 8, showSizeChanger: false }}
                                            style={{ borderRadius: 16 }}
                                        />
                                    )}
                                </div>
                            )
                        },
                        {
                            key: 'recommendations',
                            label: (
                                <Badge count={recommendations.length} size="small" offset={[12, 0]} color="#F59E0B">
                                    <span><StarOutlined /> Recommandations</span>
                                </Badge>
                            ),
                            children: (
                                <div style={{ padding: 24 }}>
                                    {recommendations.length === 0 ? (
                                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Aucune recommandation enregistrée" />
                                    ) : (
                                        <Table
                                            columns={recColumns}
                                            dataSource={recommendations}
                                            rowKey="id"
                                            pagination={{ pageSize: 8 }}
                                        />
                                    )}
                                </div>
                            )
                        },
                        (user?.type === 'ADMIN' || user?.roles?.includes('PRESIDENT') || user?.roles?.includes('RESP_JEUNESSE')) ? {
                            key: 'config',
                            label: <span><SettingOutlined /> Configuration</span>,
                            children: (
                                <div style={{ padding: 24 }}>
                                    <Row gutter={24}>
                                        <Col xs={24} md={8}>
                                            <Card title="Ajouter une Option" size="small" style={{ borderRadius: 16 }}>
                                                <Space direction="vertical" style={{ width: '100%' }}>
                                                    <Text strong>Type d'option</Text>
                                                    <Select 
                                                        value={newOption.type} 
                                                        onChange={v => setNewOption({...newOption, type: v})}
                                                        style={{ width: '100%' }}
                                                        options={[
                                                            { label: 'Catégorie', value: 'CATEGORY' },
                                                            { label: 'Priorité', value: 'PRIORITY' },
                                                            { label: 'Public Cible', value: 'TARGET' },
                                                            { label: 'Statut', value: 'STATUS' },
                                                        ]}
                                                    />
                                                    <Text strong>Libellé (Label)</Text>
                                                    <Input 
                                                        placeholder="Ex: Secourisme" 
                                                        value={newOption.label} 
                                                        onChange={e => setNewOption({...newOption, label: e.target.value})}
                                                    />
                                                    <Text strong>Valeur (Code)</Text>
                                                    <Input 
                                                        placeholder="Ex: SECOURISME_ACTION" 
                                                        value={newOption.value} 
                                                        onChange={e => setNewOption({...newOption, value: e.target.value})}
                                                    />
                                                    <Text strong>Couleur</Text>
                                                    <ColorPicker 
                                                        value={newOption.color} 
                                                        onChange={v => setNewOption({...newOption, color: v.toHexString()})}
                                                        showText
                                                    />
                                                    <Divider style={{ margin: '12px 0' }} />
                                                    <Button 
                                                        type="primary" 
                                                        icon={<SaveOutlined />} 
                                                        block 
                                                        onClick={handleSaveOption}
                                                        style={{ borderRadius: 10 }}
                                                    >
                                                        Enregistrer l'option
                                                    </Button>
                                                </Space>
                                            </Card>
                                        </Col>
                                        <Col xs={24} md={16}>
                                            <Card title="Options existantes" size="small" style={{ borderRadius: 16 }}>
                                                <List
                                                    dataSource={domainOptions}
                                                    renderItem={item => (
                                                        <List.Item actions={[
                                                            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteOption(item.id)} />
                                                        ]}>
                                                            <List.Item.Meta
                                                                avatar={<Badge color={item.color} />}
                                                                title={<Text strong>{item.label}</Text>}
                                                                description={<Tag>{item.type} : {item.value}</Tag>}
                                                            />
                                                        </List.Item>
                                                    )}
                                                />
                                            </Card>
                                        </Col>
                                    </Row>
                                </div>
                            )
                        } : null
                    ].filter(Boolean) as any}
                />
            </Card>

            {/* ===== RESPONSE DETAIL DRAWER ===== */}
            <Drawer
                title={null}
                placement="right"
                width={720}
                open={drawerVisible}
                onClose={() => setDrawerVisible(false)}
                styles={{ body: { padding: 0 } }}
            >
                {selectedTemplate && (
                    <div>
                        {/* Drawer Header */}
                        <div style={{
                            padding: '28px 32px',
                            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                            color: '#fff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 16,
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <FileTextOutlined style={{ fontSize: 22, color: '#fff' }} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedTemplate.title}</div>
                                    <div style={{ opacity: 0.8, fontSize: 13 }}>{selectedTemplate.description || 'Formulaire jeunesse'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 16 }}>
                                <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.15)', borderRadius: 10 }}>
                                    <Text style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                                        <SendOutlined style={{ marginRight: 6 }} />
                                        {templateResponses.length} réponse(s)
                                    </Text>
                                </div>
                                <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.15)', borderRadius: 10 }}>
                                    <Text style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                                        <CalendarOutlined style={{ marginRight: 6 }} />
                                        {selectedTemplate.createdAt ? new Date(selectedTemplate.createdAt).toLocaleDateString('fr-FR') : '—'}
                                    </Text>
                                </div>
                            </div>
                        </div>

                        {/* Questions Summary */}
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f3f4f6' }}>
                            <Text strong style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6b7280', marginBottom: 12, display: 'block' }}>
                                Questions du formulaire
                            </Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {(() => {
                                    try {
                                        const qs = JSON.parse(selectedTemplate.questions || '[]');
                                        return qs.map((q: any, i: number) => (
                                            <Tag key={i} style={{ borderRadius: 8, padding: '4px 12px', fontSize: 12 }}>
                                                <span style={{ fontWeight: 700, color: '#4F46E5', marginRight: 4 }}>Q{i + 1}.</span>
                                                {q.label || 'Sans titre'}
                                            </Tag>
                                        ));
                                    } catch { return <Text type="secondary">Aucune question</Text>; }
                                })()}
                            </div>
                        </div>

                        {/* Responses Table */}
                        <div style={{ padding: '24px 32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <Text strong style={{ fontSize: 16 }}>
                                    <SendOutlined style={{ marginRight: 8, color: '#4F46E5' }} />
                                    Réponses Reçues
                                </Text>
                                <Button icon={<DownloadOutlined />} size="small" style={{ borderRadius: 8 }}>Exporter</Button>
                            </div>

                            {responsesLoading ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <Spin size="large" tip="Chargement des réponses...">
                                        <div style={{ padding: 40 }} />
                                    </Spin>
                                </div>
                            ) : templateResponses.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: '40px 20px',
                                    background: '#f9fafb', borderRadius: 16
                                }}>
                                    <ClockCircleOutlined style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }} />
                                    <div><Text type="secondary" style={{ fontSize: 14 }}>Aucune réponse reçue pour le moment</Text></div>
                                    <div><Text type="secondary" style={{ fontSize: 12 }}>Partagez le QR Code pour recevoir des réponses</Text></div>
                                </div>
                            ) : (
                                <Table
                                    columns={responseColumns}
                                    dataSource={templateResponses}
                                    rowKey="id"
                                    size="small"
                                    expandable={{
                                        expandedRowRender: (record) => {
                                            const answers = (() => { try { return JSON.parse(record.answers || '{}'); } catch { return {}; } })();
                                            return (
                                                <Descriptions column={1} size="small" bordered style={{ borderRadius: 12 }}>
                                                    {Object.entries(answers).map(([key, val]) => (
                                                        <Descriptions.Item key={key} label={<Text strong style={{ fontSize: 12 }}>{key}</Text>}>
                                                            <Text style={{ fontSize: 13 }}>{String(val)}</Text>
                                                        </Descriptions.Item>
                                                    ))}
                                                </Descriptions>
                                            );
                                        }
                                    }}
                                    pagination={{ pageSize: 5 }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </Drawer>

            {/* ===== MODALS ===== */}
            <Modal
                open={isBuilderOpen}
                onCancel={() => setIsBuilderOpen(false)}
                footer={null}
                width={1000}
                destroyOnHidden
                title={null}
                centered
                style={{ top: 20 }}
            >
                <div style={{ padding: '20px 0' }}>
                    <YouthFormBuilder
                        userLevel={userLevel}
                        userCommitteeId={selectedCommittee === 'ALL' ? 'NAT_COMMITTEE' : selectedCommittee}
                        onSave={async (data) => {
                                modal.confirm({
                                    title: 'Confirmer la publication',
                                    content: 'Voulez-vous vraiment publier ce nouveau formulaire ? Il sera visible par tous les comités ciblés.',
                                    onOk: async () => {
                                        try {
                                            await jeunesseService.createTemplate({
                                                title: data.title,
                                                description: data.description,
                                                questions: JSON.stringify(data.questions),
                                                targetLevel: data.targetLevel,
                                                committeeId: user?.committeeId
                                            });
                                            messageApi.success('Formulaire publié avec succès ! 🎉');
                                            setIsBuilderOpen(false);
                                            loadData();
                                        } catch (error: any) {
                                            notification.error({
                                                message: 'Erreur de publication',
                                                description: error?.response?.data?.message || 'Une erreur imprévue est survenue lors de la création du formulaire.'
                                            });
                                        }
                                    },
                                    okText: 'Confirmer',
                                    cancelText: 'Annuler',
                                });
                        }}
                        onCancel={() => setIsBuilderOpen(false)}
                    />
                </div>
            </Modal>

            <Modal
                open={isRecModalOpen}
                onCancel={() => setIsRecModalOpen(false)}
                footer={null}
                width={800}
                centered
                destroyOnHidden
            >
                {selectedForm && (
                    <YouthRecommendationView
                        volunteerName={selectedForm.volunteerName}
                        recommendation={recommendations.find(r => r.formId === selectedForm.id)}
                        onClose={() => setIsRecModalOpen(false)}
                    />
                )}
            </Modal>

            {/* ===== STYLES ===== */}
            <style dangerouslySetInnerHTML={{ __html: `
                .animate-fade-in { animation: fadeIn 0.8s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
                .template-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(0,0,0,0.08) !important; }
                .hover-lift:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06) !important; }
                .domain-tabs .ant-tabs-nav::before { border-bottom: 1px solid rgba(0,0,0,0.05); }
                .domain-tabs .ant-tabs-tab { padding: 16px 4px; font-weight: 600; font-size: 14px; }
                .domain-tabs .ant-tabs-tab-active .ant-tabs-tab-btn { color: #4F46E5 !important; }
                .domain-tabs .ant-tabs-ink-bar { background: #4F46E5 !important; height: 3px !important; border-radius: 3px 3px 0 0; }
                .ant-drawer-body { padding: 0 !important; }
            `}} />
        </div>
    );
};

export default JeunessePage;
