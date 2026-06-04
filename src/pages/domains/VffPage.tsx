// ============================================================
// NEXUS-AID — Module VFF Complet
// Responsable Violences Faites aux Femmes et Enfants
// 7 Interfaces: Tableau de bord · Signalement · Dossiers ·
//               Suivi · Hébergement · Coordination · Campagnes
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
    Col, Row, Table, Tag, Typography, Space, Button,
    Spin, Modal, Form, Input, Select, App, DatePicker,
    Avatar, Progress, Tooltip, InputNumber, Badge, Tabs,
    Upload, Divider, Timeline, Statistic, Alert
} from 'antd';
import {
    WomanOutlined, PlusOutlined, SafetyOutlined, NotificationOutlined,
    GlobalOutlined, CheckCircleOutlined, LockOutlined,
    SearchOutlined, FilterOutlined, SettingOutlined,
    InfoCircleOutlined, SafetyCertificateOutlined, BarChartOutlined,
    HeartOutlined, CalendarOutlined, HomeOutlined, PhoneOutlined,
    MailOutlined, EnvironmentOutlined, AlertOutlined,
    ClockCircleOutlined, TeamOutlined, AuditOutlined,
    FileDoneOutlined, PaperClipOutlined, EyeOutlined,
    UploadOutlined, BankOutlined, FileTextOutlined,
    MedicineBoxOutlined, UserOutlined, StarOutlined,
    TrophyOutlined, WarningOutlined, CheckOutlined,
    CloseOutlined, EditOutlined, DownloadOutlined,
    PushpinOutlined, CompassOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '@/stores';
import { vffService } from '@/services/domainServices';
import type { VictimCaseDTO, ProtectionCampaignDTO, ShelterDTO, PartnerDTO } from '@/types';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ─── Design Tokens ───────────────────────────────────────────
const RED = '#DC2626';
const RED_DARK = '#991B1B';
const PINK = '#EC4899';
const PURPLE = '#7C3AED';
const AMBER = '#D97706';
const GREEN = '#16A34A';
const BLUE = '#0284C7';

const fonts = {
    body: "'Nunito Sans', 'Segoe UI', sans-serif",
    heading: "'Sora', 'Trebuchet MS', sans-serif",
};

const makeT = (isDark: boolean) => ({
    bg: isDark ? '#0D1526' : '#F8FAFC',
    card: isDark ? '#111827' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    text: isDark ? '#F1F5F9' : '#0C1523',
    textSub: isDark ? '#94A3B8' : '#475569',
    textFaint: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
    divider: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    hover: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
});

// ─── Priority Badge ─────────────────────────────────────────
const PriorityBadge: React.FC<{ priority?: string }> = ({ priority }) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
        CRITICAL: { label: 'Critique', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
        HIGH: { label: 'Élevé', color: AMBER, bg: 'rgba(217,119,6,0.12)' },
        MEDIUM: { label: 'Moyen', color: BLUE, bg: 'rgba(2,132,199,0.12)' },
        LOW: { label: 'Faible', color: GREEN, bg: 'rgba(22,163,74,0.12)' },
    };
    const m = map[priority || 'MEDIUM'] || map.MEDIUM;
    return (
        <span style={{
            fontFamily: fonts.body, fontSize: 11, fontWeight: 700,
            color: m.color, background: m.bg,
            borderRadius: 999, padding: '3px 10px',
            border: `1px solid ${m.color}33`,
        }}>
            {m.label}
        </span>
    );
};

// ─── Status Badge ────────────────────────────────────────────
const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
    const map: Record<string, { label: string; color: string }> = {
        REPORTED: { label: 'Signalé', color: AMBER },
        IN_PROGRESS: { label: 'En cours', color: BLUE },
        CLOSED: { label: 'Clôturé', color: GREEN },
        RESOLVED: { label: 'Résolu', color: GREEN },
        DRAFT: { label: 'Brouillon', color: '#64748B' },
    };
    const m = map[status || 'REPORTED'] || { label: status || '—', color: '#64748B' };
    return <Tag color={m.color} style={{ borderRadius: 8, fontWeight: 700 }}>{m.label}</Tag>;
};

// ─── Stat Card ───────────────────────────────────────────────
const StatCard: React.FC<{
    icon: React.ReactNode; value: number | string;
    label: string; accent: string; isDark: boolean; sub?: string;
}> = ({ icon, value, label, accent, isDark, sub }) => {
    const t = makeT(isDark);
    return (
        <div style={{
            background: t.card, borderRadius: 16,
            border: `1px solid ${t.border}`,
            padding: '20px 22px',
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${accent}18`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, color: accent,
                }}>
                    {icon}
                </div>
            </div>
            <div style={{ fontFamily: fonts.heading, fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>
                {value}
            </div>
            <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, color: t.textSub, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>
                {label}
            </div>
            {sub && <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, marginTop: 4 }}>{sub}</div>}
        </div>
    );
};

// ─── Section Card ────────────────────────────────────────────
const SCard: React.FC<{
    isDark: boolean; title: React.ReactNode; extra?: React.ReactNode;
    children: React.ReactNode; accentLine?: string; style?: React.CSSProperties;
}> = ({ isDark, title, extra, children, accentLine, style }) => {
    const t = makeT(isDark);
    return (
        <div style={{
            background: t.card, borderRadius: 16,
            border: `1px solid ${t.border}`,
            boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
            overflow: 'hidden', ...style
        }}>
            {accentLine && <div style={{ height: 3, background: `linear-gradient(90deg, ${accentLine}, ${accentLine}88)` }} />}
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 14, color: t.text, display: 'flex', alignItems: 'center', gap: 8 }}>{title}</div>
                {extra && <div>{extra}</div>}
            </div>
            <div style={{ padding: '16px 20px' }}>{children}</div>
        </div>
    );
};

// ─── Violence Type Row ─────────────────────────────────────
const VTypeRow: React.FC<{ label: string; count: number; max: number; color: string; isDark: boolean }> = ({ label, count, max, color, isDark }) => {
    const t = makeT(isDark);
    const pct = max > 0 ? Math.round((count / max) * 100) : 0;
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text }}>{label}</span>
                <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color }}>{count}</span>
            </div>
            <div style={{ height: 6, background: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})`, borderRadius: 99, transition: 'width 0.6s ease' }} />
            </div>
        </div>
    );
};

// ─── Nav Tab ──────────────────────────────────────────────
const NavTab: React.FC<{
    active: boolean; icon: React.ReactNode; label: string; onClick: () => void; isDark: boolean; badge?: number;
}> = ({ active, icon, label, onClick, isDark, badge }) => (
    <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderRadius: 12,
        background: active ? (isDark ? 'rgba(220,38,38,0.18)' : '#FEF2F2') : 'transparent',
        color: active ? RED : (isDark ? '#94A3B8' : '#64748B'),
        border: active ? `1px solid ${RED}33` : '1px solid transparent',
        fontFamily: fonts.body, fontSize: 13, fontWeight: active ? 700 : 600,
        cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap',
        position: 'relative',
    }}>
        {icon} {label}
        {badge !== undefined && badge > 0 && (
            <span style={{
                position: 'absolute', top: 4, right: 4,
                background: RED, color: '#fff', fontSize: 10,
                fontWeight: 800, borderRadius: 99, padding: '0 5px', minWidth: 16,
                textAlign: 'center', lineHeight: '16px',
            }}>{badge}</span>
        )}
    </button>
);

// ─── Tunisia partner locations (static demo data removed, now stored in DB) ────
const PARTNER_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    police: { icon: <SafetyOutlined />, color: '#2563EB', label: 'Police' },
    hospital: { icon: <MedicineBoxOutlined />, color: '#16A34A', label: 'Hôpital' },
    center: { icon: <HomeOutlined />, color: PURPLE, label: 'Centre d\'hébergement' },
    protection: { icon: <SafetyCertificateOutlined />, color: AMBER, label: 'Protection Enfance' },
    association: { icon: <HeartOutlined />, color: PINK, label: 'Association' },
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const VffPage: React.FC = () => {
    const { message: messageApi } = App.useApp();
    const themeMode = useUIStore((s) => s.themeMode);
    const user = useAuthStore((s) => s.user);
    const isDark = themeMode === 'dark';
    const t = makeT(isDark);

    // Role detection
    const isNational = (user?.roles || []).some((r: any) => {
        const rs = (typeof r === 'string' ? r : r?.role || '').toUpperCase();
        return rs.includes('NATIONAL') && rs.includes('VFF');
    });
    const isPresident = (user?.roles || []).some((r: any) => {
        const rs = (typeof r === 'string' ? r : r?.role || '').toUpperCase();
        return rs.includes('PRESIDENT_NATIONAL') || rs === 'PRESIDENT';
    });
    const canSeeAll = isNational || isPresident;

    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [loading, setLoading] = useState(true);
    const [cases, setCases] = useState<VictimCaseDTO[]>([]);
    const [campaigns, setCampaigns] = useState<ProtectionCampaignDTO[]>([]);

    // Form states
    const [caseModalOpen, setCaseModalOpen] = useState(false);
    const [caseDetailOpen, setCaseDetailOpen] = useState(false);
    const [selectedCase, setSelectedCase] = useState<VictimCaseDTO | null>(null);
    const [trackingModalOpen, setTrackingModalOpen] = useState(false);
    const [activeTrackingSection, setActiveTrackingSection] = useState<'medical' | 'psychological' | 'legal' | 'social'>('medical');
    const [campaignModalOpen, setCampaignModalOpen] = useState(false);
    const [shelterModalOpen, setShelterModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [partnerFilter, setPartnerFilter] = useState<string>('all');

    const [shelters, setShelters] = useState<ShelterDTO[]>([]);
    const [partners, setPartners] = useState<PartnerDTO[]>([]);
    const [partnerModalOpen, setPartnerModalOpen] = useState(false);

    const [caseForm] = Form.useForm();
    const [campaignForm] = Form.useForm();
    const [trackingForm] = Form.useForm();
    const [shelterForm] = Form.useForm();
    const [partnerForm] = Form.useForm();

    const [supportPath, setSupportPath] = useState<any>(null);

    const fetchSupportPath = useCallback(async (caseId: string) => {
        try {
            const path = await vffService.getSupportPath(caseId);
            setSupportPath(path);
        } catch {
            try {
                const newPath = await vffService.createSupportPath(caseId, {
                    medicalFollowUp: { doctor: 'Non assigné', details: 'Aucun acte médical enregistré', status: 'NONE' },
                    psychologicalFollowUp: { therapist: 'Non assigné', sessionsCount: 0, notes: 'Aucun suivi psychologique enregistré' },
                    legalFollowUp: { lawyer: 'Non assigné', status: 'None', details: 'Aucune procédure juridique' },
                    shelterInfo: { center: 'Non hébergée', arrivalDate: '—', allocatedBeds: '—' },
                    currentStage: 'REPORTED',
                    policeReport: false,
                    courtCaseRef: '—'
                });
                setSupportPath(newPath);
            } catch {
                setSupportPath(null);
            }
        }
    }, []);

    useEffect(() => {
        if (selectedCase?.id) {
            fetchSupportPath(selectedCase.id);
        } else {
            setSupportPath(null);
        }
    }, [selectedCase, fetchSupportPath]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [c, cam, sh, pt] = await Promise.all([
                vffService.getCases().catch(() => []),
                vffService.getCampaigns().catch(() => []),
                vffService.getShelters().catch(() => []),
                vffService.getPartners().catch(() => []),
            ]);
            setCases(c || []);
            setCampaigns(cam || []);
            setShelters(sh || []);
            setPartners(pt || []);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // ─── KPIs ────────────────────────────────────────────────
    const totalCases = cases.length;
    const pendingCases = cases.filter(c => c.status === 'REPORTED').length;
    const urgentCases = cases.filter(c => c.priority === 'CRITICAL' || c.priority === 'HIGH').length;
    const hostedCases = cases.filter(c => (c.description || '').toLowerCase().includes('héberg')).length;
    const closedCases = cases.filter(c => c.status === 'CLOSED' || c.status === 'RESOLVED').length;
    const activeCamp = campaigns.filter(c => c.status === 'ACTIVE').length;

    // ─── Sparkline dynamic chart data ────────────────────────
    const getMonthlyChartData = () => {
        const monthsList = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const now = new Date();
        const counts = [0, 0, 0, 0, 0, 0];
        const labels = ['', '', '', '', '', ''];
        
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
            labels[i] = monthsList[d.getMonth()];
        }
        
        cases.forEach(c => {
            const date = c.incidentDate ? new Date(c.incidentDate) : (c.createdAt ? new Date(c.createdAt) : null);
            if (date) {
                const diff = (now.getFullYear() - date.getFullYear()) * 12 + now.getMonth() - date.getMonth();
                if (diff >= 0 && diff < 6) {
                    counts[5 - diff]++;
                }
            }
        });
        
        return { labels, counts };
    };

    const { labels: dynamicMonths, counts: monthlyData } = getMonthlyChartData();

    // ─── Violence breakdown ──────────────────────────────────
    const violenceTypes = [
        { key: 'PHYSIQUE', label: 'Violence physique', color: RED },
        { key: 'PSYCHOLOGIQUE', label: 'Violence psychologique', color: PINK },
        { key: 'ECONOMIQUE', label: 'Violence économique', color: AMBER },
        { key: 'SEXUELLE', label: 'Violence sexuelle', color: PURPLE },
        { key: 'NEGLIGENCE', label: 'Négligence', color: GREEN },
        { key: 'ENFANT', label: 'Maltraitance infantile', color: BLUE },
        { key: 'MARIAGE', label: 'Mariage forcé', color: '#DB2777' },
        { key: 'AUTRE', label: 'Autre', color: '#64748B' },
    ];
    const violenceBreakdown = violenceTypes.map(vt => ({
        ...vt,
        count: cases.filter(c => (c.typeOfViolence || c.incidentType || '').toUpperCase().includes(vt.key)).length,
    }));
    const maxViolence = Math.max(...violenceBreakdown.map(v => v.count), 1);

    // ─── Filtered cases ───────────────────────────────────────
    const filteredCases = cases.filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (c.victimName || '').toLowerCase().includes(q) ||
            (c.typeOfViolence || '').toLowerCase().includes(q);
    });

    // ─── Handlers ────────────────────────────────────────────
    const handleCreateCase = async (values: any) => {
        setSubmitLoading(true);
        try {
            await vffService.createCase({
                victimName: values.alias || 'Identité protégée',
                age: values.age,
                gender: values.gender,
                typeOfViolence: values.violenceType,
                priority: values.urgency,
                status: values.saveAs === 'draft' ? 'DRAFT' : 'REPORTED',
                description: `${values.description || ''}|NEEDS:${values.immediateNeeds || ''}|RISKS:${values.risks || ''}|FAM:${values.familySituation || ''}|PHONE:${values.phone || ''}|ADDR:${values.address || ''}`,
                isConfidential: true,
                accessRestricted: true,
            });
            messageApi.success('Signalement enregistré. Confidentialité garantie.');
            setCaseModalOpen(false);
            caseForm.resetFields();
            loadData();
        } catch {
            messageApi.error('Erreur lors de l\'enregistrement du signalement.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateCampaign = async (values: any) => {
        setSubmitLoading(true);
        try {
            await vffService.createCampaign({
                title: values.title,
                description: values.description,
                startDate: values.eventDate?.format('YYYY-MM-DD'),
                endDate: values.eventDate?.format('YYYY-MM-DD'),
                location: values.location,
                targetAudience: values.audience,
                status: 'PENDING_APPROVAL',
            });
            messageApi.success('Campagne créée. En attente d\'approbation du Président.');
            setCampaignModalOpen(false);
            campaignForm.resetFields();
            loadData();
        } catch {
            messageApi.error('Erreur lors de la création de la campagne.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleUpdateTracking = async (values: any) => {
        if (!selectedCase?.id || !supportPath) return;
        setSubmitLoading(true);
        try {
            let updates: any = {};
            if (activeTrackingSection === 'medical') {
                updates = {
                    medicalFollowUp: {
                        doctor: values.doctor,
                        details: values.details,
                        status: values.status
                    }
                };
            } else if (activeTrackingSection === 'psychological') {
                updates = {
                    psychologicalFollowUp: {
                        therapist: values.therapist,
                        sessionsCount: values.sessionsCount,
                        notes: values.notes
                    }
                };
            } else if (activeTrackingSection === 'legal') {
                updates = {
                    legalFollowUp: {
                        lawyer: values.lawyer,
                        status: values.status
                    },
                    courtCaseRef: values.courtCaseRef,
                    policeReport: values.policeReport
                };
            } else if (activeTrackingSection === 'social') {
                updates = {
                    shelterInfo: {
                        center: values.center,
                        arrivalDate: values.arrivalDate,
                        allocatedBeds: values.allocatedBeds
                    },
                    currentStage: values.currentStage
                };
            }

            const updatedPath = await vffService.updateSupportPath(selectedCase.id, updates);
            setSupportPath(updatedPath);
            messageApi.success('Suivi mis à jour dans la base de données.');
            setTrackingModalOpen(false);
            trackingForm.resetFields();
        } catch {
            messageApi.error('Erreur lors de la mise à jour du suivi.');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleAssignShelter = async (shelterName: string) => {
        if (!selectedCase?.id) {
            messageApi.warning("Veuillez d'abord sélectionner un dossier de victime (depuis l'onglet Signalements ou Suivi) pour l'affecter à ce centre.");
            return;
        }
        
        setSubmitLoading(true);
        try {
            const today = new Date().toLocaleDateString('fr-FR');
            const roomNum = `Chambre ${Math.floor(Math.random() * 8) + 1}`;
            
            const updates = {
                shelterInfo: {
                    center: shelterName,
                    arrivalDate: today,
                    allocatedBeds: roomNum
                },
                currentStage: 'ACCOMMODATED'
            };
            
            const updatedPath = await vffService.updateSupportPath(selectedCase.id, updates);
            setSupportPath(updatedPath);
            messageApi.success(`Victime affectée avec succès au ${shelterName} dans la base de données.`);
        } catch {
            messageApi.error("Erreur lors de l'affectation de la victime.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreateShelter = async (values: any) => {
        setSubmitLoading(true);
        try {
            await vffService.createShelter({
                name: values.name,
                address: values.address,
                manager: values.manager,
                phone: values.phone,
                capacity: values.capacity || 0,
                available: values.available || 0,
                region: values.region,
                services: values.services || [],
            });
            messageApi.success("Centre d'hébergement enregistré avec succès dans la base de données.");
            setShelterModalOpen(false);
            shelterForm.resetFields();
            const sh = await vffService.getShelters().catch(() => []);
            setShelters(sh || []);
        } catch {
            messageApi.error("Erreur lors de la création du centre d'hébergement.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleCreatePartner = async (values: any) => {
        setSubmitLoading(true);
        try {
            await vffService.createPartner({
                type: values.type,
                label: values.label,
                region: values.region,
                phone: values.phone,
                address: values.address,
                latitude: values.latitude || 0,
                longitude: values.longitude || 0,
            });
            messageApi.success("Partenaire enregistré avec succès dans la base de données.");
            setPartnerModalOpen(false);
            partnerForm.resetFields();
            const pt = await vffService.getPartners().catch(() => []);
            setPartners(pt || []);
        } catch {
            messageApi.error("Erreur lors de la création du partenaire.");
        } finally {
            setSubmitLoading(false);
        }
    };

    // ─── Case columns ────────────────────────────────────────
    const caseColumns: ColumnsType<VictimCaseDTO> = [
        {
            title: 'DOSSIER',
            key: 'id',
            render: (_, r) => (
                <Space>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: isDark ? 'rgba(220,38,38,0.15)' : '#FEF2F2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: RED, flexShrink: 0,
                    }}>
                        <LockOutlined />
                    </div>
                    <div>
                        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 13, color: t.text }}>
                            {r.victimName || 'Identité protégée'}
                        </div>
                        <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint }}>
                            #{r.id?.slice(-6) || '——'} · {r.typeOfViolence || r.incidentType || 'Type non précisé'}
                        </div>
                    </div>
                </Space>
            )
        },
        {
            title: 'ÂGE / SEXE',
            key: 'profile',
            render: (_, r) => (
                <div>
                    <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 13, color: t.text }}>{r.age || r.victimAge || '—'} ans</div>
                    <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint }}>{r.gender || r.victimGender || '—'}</div>
                </div>
            )
        },
        {
            title: 'URGENCE',
            key: 'priority',
            render: (_, r) => <PriorityBadge priority={r.priority || r.riskLevel} />
        },
        {
            title: 'STATUT',
            dataIndex: 'status',
            key: 'status',
            render: (s) => <StatusBadge status={s} />
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            render: (_, r) => (
                <Space>
                    <Tooltip title="Consulter le dossier">
                        <Button type="text" size="small" icon={<EyeOutlined />}
                            onClick={() => { setSelectedCase(r); setCaseDetailOpen(true); }}
                            style={{ color: BLUE }}
                        />
                    </Tooltip>
                    <Tooltip title="Suivi de prise en charge">
                        <Button type="text" size="small" icon={<HeartOutlined />}
                            onClick={() => { setSelectedCase(r); setTrackingModalOpen(true); }}
                            style={{ color: PINK }}
                        />
                    </Tooltip>
                    <Tooltip title="Modifier">
                        <Button type="text" size="small" icon={<EditOutlined />} style={{ color: t.textSub }} />
                    </Tooltip>
                </Space>
            )
        }
    ];

    // ─── Campaign columns ─────────────────────────────────────
    const campColumns: ColumnsType<ProtectionCampaignDTO> = [
        {
            title: 'CAMPAGNE',
            key: 'title',
            render: (_, r) => (
                <Space>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: isDark ? 'rgba(124,58,237,0.15)' : '#EDE9FE',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: PURPLE, flexShrink: 0,
                    }}>
                        <NotificationOutlined />
                    </div>
                    <div>
                        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 13, color: t.text }}>{r.title}</div>
                        <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint }}>{r.location} · {r.targetAudience}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'DATE',
            key: 'dates',
            render: (_, r) => (
                <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.text }}>
                    {r.startDate ? new Date(r.startDate).toLocaleDateString('fr-FR') : '—'}
                </div>
            )
        },
        {
            title: 'STATUT',
            key: 'status',
            render: (_, r) => {
                const statusMap: Record<string, { color: string; label: string }> = {
                    ACTIVE: { color: 'success', label: 'Active' },
                    PLANNED: { color: 'processing', label: 'Planifiée' },
                    PENDING_APPROVAL: { color: 'warning', label: 'En attente approbation' },
                    COMPLETED: { color: 'default', label: 'Terminée' },
                };
                const s = statusMap[r.status || 'PLANNED'] || statusMap.PLANNED;
                return <Tag color={s.color} style={{ borderRadius: 8, fontWeight: 700 }}>{s.label}</Tag>;
            }
        },
        {
            title: 'ACTIONS',
            key: 'actions',
            render: () => (
                <Space>
                    <Button size="small" type="text" icon={<UploadOutlined />} style={{ color: PURPLE }}>
                        Photos
                    </Button>
                    <Button size="small" type="text" icon={<EyeOutlined />} style={{ color: BLUE }} />
                </Space>
            )
        }
    ];

    if (loading) return (
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <Spin size="large" />
            <Text style={{ fontFamily: fonts.body, color: t.textSub }}>Chargement du module VFF…</Text>
        </div>
    );

    // ─── TABS ─────────────────────────────────────────────────
    const tabs = [
        { key: 'dashboard', icon: <BarChartOutlined />, label: 'Tableau de bord', badge: urgentCases > 0 ? urgentCases : undefined },
        { key: 'cases', icon: <WomanOutlined />, label: 'Signalements', badge: pendingCases > 0 ? pendingCases : undefined },
        { key: 'tracking', icon: <HeartOutlined />, label: 'Suivi Prise en charge' },
        { key: 'shelters', icon: <HomeOutlined />, label: 'Centres d\'hébergement' },
        { key: 'coordination', icon: <TeamOutlined />, label: 'Coordination' },
        { key: 'campaigns', icon: <NotificationOutlined />, label: 'Sensibilisation' },
        ...(canSeeAll ? [{ key: 'stats', icon: <AuditOutlined />, label: 'Statistiques' }] : []),
    ];

    return (
        <div style={{ padding: '0 24px 40px', maxWidth: 1600, margin: '0 auto' }}>
            {/* ─── HEADER ─────────────────────────────────────── */}
            <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                    <div style={{
                        width: 52, height: 52, borderRadius: 16,
                        background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, color: '#fff',
                        boxShadow: `0 8px 24px ${RED}44`,
                    }}>
                        <SafetyOutlined />
                    </div>
                    <div>
                        <h1 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 800, color: t.text, margin: 0 }}>
                            Module VFF — Violences Faites aux Femmes et Enfants
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <LockOutlined style={{ color: RED, fontSize: 12 }} />
                            <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub, fontWeight: 600 }}>
                                Données strictement confidentielles · Accès sécurisé
                            </span>
                            {canSeeAll && (
                                <Tag color="red" style={{ borderRadius: 6, fontWeight: 700, fontSize: 10 }}>
                                    {isPresident ? 'PRÉSIDENT NATIONAL' : 'NATIONAL'}
                                </Tag>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nav tabs */}
                <div style={{
                    display: 'flex', gap: 6, flexWrap: 'wrap',
                    background: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9',
                    padding: 6, borderRadius: 16, marginTop: 16,
                }}>
                    {tabs.map(tab => (
                        <NavTab key={tab.key} active={activeTab === tab.key}
                            icon={tab.icon} label={tab.label}
                            onClick={() => setActiveTab(tab.key)}
                            isDark={isDark} badge={tab.badge}
                        />
                    ))}
                </div>
            </div>

            {/* Confidentiality banner */}
            {(activeTab === 'cases' || activeTab === 'tracking') && (
                <Alert
                    type="warning" showIcon
                    icon={<LockOutlined />}
                    message="Données confidentielles"
                    description="Les informations de ce module sont protégées. Toute action est journalisée. Réservé aux Responsables VFF autorisés et au Président National."
                    style={{ borderRadius: 12, marginBottom: 20, fontFamily: fonts.body }}
                />
            )}

            {/* ═══════════════════════════════════════════════ */}
            {/* TAB: TABLEAU DE BORD                           */}
            {/* ═══════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                    <motion.div key="dashboard"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        {/* KPI Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 20 }}>
                            <StatCard icon={<WomanOutlined />} value={totalCases} label="Total Signalements" accent={RED} isDark={isDark} />
                            <StatCard icon={<ClockCircleOutlined />} value={pendingCases} label="En attente" accent={AMBER} isDark={isDark} />
                            <StatCard icon={<AlertOutlined />} value={urgentCases} label="Cas urgents" accent="#EF4444" isDark={isDark} />
                            <StatCard icon={<HomeOutlined />} value={hostedCases} label="Victimes hébergées" accent={BLUE} isDark={isDark} />
                            <StatCard icon={<CheckCircleOutlined />} value={closedCases} label="Dossiers clôturés" accent={GREEN} isDark={isDark} />
                            <StatCard icon={<NotificationOutlined />} value={activeCamp} label="Campagnes actives" accent={PURPLE} isDark={isDark} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 20 }}>
                            {/* Recent signalements */}
                            <SCard isDark={isDark} accentLine={RED}
                                title={<><WomanOutlined style={{ color: RED }} /> Derniers Signalements Confidentiels</>}
                                extra={
                                    <button onClick={() => setCaseModalOpen(true)} style={{
                                        background: `linear-gradient(135deg, ${RED}, ${RED_DARK})`,
                                        color: '#fff', border: 'none', borderRadius: 10,
                                        padding: '7px 14px', fontFamily: fonts.body, fontSize: 12,
                                        fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                    }}>
                                        <PlusOutlined /> Nouveau Signalement
                                    </button>
                                }
                            >
                                {cases.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '30px 0', color: t.textFaint, fontFamily: fonts.body }}>
                                        Aucun signalement enregistré
                                    </div>
                                ) : cases.slice(0, 6).map((c, i) => (
                                    <div key={c.id || i} style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 0', cursor: 'pointer',
                                        borderBottom: i < Math.min(cases.length - 1, 5) ? `1px solid ${t.divider}` : 'none',
                                        transition: 'background 0.15s',
                                    }}
                                        onClick={() => { setSelectedCase(c); setCaseDetailOpen(true); }}
                                    >
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 10,
                                            background: isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: RED, fontSize: 15, flexShrink: 0,
                                        }}>
                                            <LockOutlined />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontFamily: fonts.body, fontWeight: 600, fontSize: 13, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {c.victimName || 'Identité protégée'}
                                            </div>
                                            <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint }}>
                                                {c.typeOfViolence || c.incidentType || 'Type non précisé'} · {c.gender || '—'}
                                            </div>
                                        </div>
                                        <PriorityBadge priority={c.priority || c.riskLevel} />
                                    </div>
                                ))}
                            </SCard>

                            {/* Violence breakdown */}
                            <SCard isDark={isDark} accentLine={PINK}
                                title={<><BarChartOutlined style={{ color: PINK }} /> Répartition par type de violence</>}
                            >
                                {violenceBreakdown.filter(v => v.count > 0).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px 0', color: t.textFaint, fontFamily: fonts.body }}>Aucune donnée</div>
                                ) : violenceBreakdown.map(vt => (
                                    <VTypeRow key={vt.key} label={vt.label} count={vt.count} max={maxViolence} color={vt.color} isDark={isDark} />
                                ))}
                            </SCard>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Monthly evolution */}
                            <SCard isDark={isDark} accentLine={BLUE}
                                title={<><CalendarOutlined style={{ color: BLUE }} /> Évolution mensuelle des signalements</>}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80, padding: '0 4px' }}>
                                    {monthlyData.map((val, i) => {
                                        const maxVal = Math.max(...monthlyData);
                                        const h = maxVal > 0 ? (val / maxVal) * 70 : 4;
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                <span style={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 700, color: BLUE }}>{val}</span>
                                                <div style={{
                                                    width: '100%', height: h, minHeight: 4,
                                                    background: `linear-gradient(180deg, ${BLUE}, ${BLUE}88)`,
                                                    borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease',
                                                }} />
                                                <span style={{ fontFamily: fonts.body, fontSize: 9, color: t.textFaint }}>{dynamicMonths[i]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SCard>

                            {/* Quick actions */}
                            <SCard isDark={isDark} accentLine={RED}
                                title={<><ThunderboltOutlined style={{ color: RED }} /> Actions rapides</>}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    {[
                                        { icon: <PlusOutlined />, label: 'Nouveau signalement', color: RED, onClick: () => setCaseModalOpen(true) },
                                        { icon: <SearchOutlined />, label: 'Rechercher victime', color: BLUE, onClick: () => setActiveTab('cases') },
                                        { icon: <EyeOutlined />, label: 'Consulter dossier', color: PURPLE, onClick: () => setActiveTab('cases') },
                                        { icon: <FileDoneOutlined />, label: 'Générer rapport', color: GREEN, onClick: () => setActiveTab('stats') },
                                    ].map(a => (
                                        <button key={a.label} onClick={a.onClick} style={{
                                            background: `${a.color}12`, border: `1px solid ${a.color}33`,
                                            borderRadius: 12, padding: '12px 16px',
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            color: a.color, fontFamily: fonts.body, fontSize: 13, fontWeight: 700,
                                            cursor: 'pointer', transition: 'all 0.2s ease', width: '100%', textAlign: 'left',
                                        }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${a.color}22`; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${a.color}12`; }}
                                        >
                                            <span style={{ fontSize: 18 }}>{a.icon}</span> {a.label}
                                        </button>
                                    ))}
                                </div>
                            </SCard>
                        </div>
                    </motion.div>
                )}

                {/* ═════════════════════════════════════════════ */}
                {/* TAB: SIGNALEMENTS / DOSSIERS                 */}
                {/* ═════════════════════════════════════════════ */}
                {activeTab === 'cases' && (
                    <motion.div key="cases"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        <SCard isDark={isDark} accentLine={RED}
                            title={<><WomanOutlined style={{ color: RED }} /> Dossiers Victimes ({filteredCases.length})</>}
                            extra={
                                <Space>
                                    <Input
                                        prefix={<SearchOutlined style={{ color: t.textFaint }} />}
                                        placeholder="Rechercher..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ borderRadius: 10, width: 200, fontFamily: fonts.body }}
                                    />
                                    <Button type="primary" icon={<PlusOutlined />}
                                        onClick={() => setCaseModalOpen(true)}
                                        style={{ background: RED, border: 'none', borderRadius: 10, fontWeight: 700 }}
                                    >
                                        Nouveau signalement
                                    </Button>
                                </Space>
                            }
                        >
                            <Table
                                columns={caseColumns as any}
                                dataSource={filteredCases as any}
                                rowKey="id"
                                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                                locale={{
                                    emptyText: (
                                        <div style={{ padding: '50px 0', textAlign: 'center' }}>
                                            <WomanOutlined style={{ fontSize: 40, color: t.textFaint, marginBottom: 12 }} />
                                            <div style={{ fontFamily: fonts.body, color: t.textSub, fontWeight: 600 }}>Aucun signalement enregistré</div>
                                        </div>
                                    )
                                }}
                            />
                        </SCard>
                    </motion.div>
                )}

                {/* ═════════════════════════════════════════════ */}
                {/* TAB: SUIVI PRISE EN CHARGE                   */}
                {/* ═════════════════════════════════════════════ */}
                {/* ═════════════════════════════════════════════ */}
                {/* TAB: SUIVI PRISE EN CHARGE                   */}
                {/* ═════════════════════════════════════════════ */}
                {activeTab === 'tracking' && !selectedCase && (
                    <motion.div key="no-case-tracking"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        <SCard isDark={isDark} accentLine={PINK} title={<><HeartOutlined style={{ color: PINK }} /> Sélectionner un dossier de victime</>}>
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <WomanOutlined style={{ fontSize: 48, color: PINK, marginBottom: 16 }} />
                                <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, color: t.text, marginBottom: 8 }}>
                                    Aucun dossier sélectionné
                                </div>
                                <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.textSub, marginBottom: 20, maxWidth: 500, margin: '0 auto 20px' }}>
                                    Pour consulter et modifier le suivi de prise en charge (médical, psychologique, juridique et social), veuillez d'abord sélectionner un dossier de victime dans la liste ci-dessous.
                                </div>
                                <Select
                                    style={{ width: '100%', maxWidth: 400, borderRadius: 10 }}
                                    placeholder="Choisir une victime / alias..."
                                    size="large"
                                    onChange={(val) => {
                                        const c = cases.find(item => item.id === val);
                                        if (c) setSelectedCase(c);
                                    }}
                                >
                                    {cases.map(c => (
                                        <Option key={c.id} value={c.id}>
                                            {c.victimName || 'Identité protégée'} (#{c.id?.slice(-6)}) · {c.typeOfViolence || c.incidentType}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        </SCard>
                    </motion.div>
                )}

                {activeTab === 'tracking' && selectedCase && (
                    <motion.div key="active-tracking"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, background: isDark ? 'rgba(255,255,255,0.03)' : '#F1F5F9', padding: '12px 20px', borderRadius: 12 }}>
                            <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: t.text }}>
                                Suivi Actif : <strong style={{ color: RED }}>{selectedCase.victimName || 'Identité protégée'}</strong> (#{selectedCase.id?.slice(-6)})
                            </div>
                            <Space>
                                <Select
                                    style={{ width: 220 }}
                                    value={selectedCase.id}
                                    onChange={(val) => {
                                        const c = cases.find(item => item.id === val);
                                        if (c) setSelectedCase(c);
                                    }}
                                >
                                    {cases.map(c => (
                                        <Option key={c.id} value={c.id}>{c.victimName || 'Identité protégée'} (#{c.id?.slice(-6)})</Option>
                                    ))}
                                </Select>
                                <Button type="default" onClick={() => setSelectedCase(null)}>Changer de dossier</Button>
                            </Space>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Medical */}
                            <SCard isDark={isDark} accentLine={GREEN}
                                title={<><MedicineBoxOutlined style={{ color: GREEN }} /> Suivi Médical</>}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { label: 'Médecin référent / Hôpital', icon: <MedicineBoxOutlined />, value: supportPath?.medicalFollowUp?.doctor || 'Non assigné', color: GREEN },
                                        { label: 'Détails des soins / ITT', icon: <FileDoneOutlined />, value: supportPath?.medicalFollowUp?.details || 'Aucun acte médical enregistré', color: AMBER },
                                        { label: 'Statut médical', icon: <ClockCircleOutlined />, value: supportPath?.medicalFollowUp?.status === 'COMPLETED' ? 'Soins terminés' : (supportPath?.medicalFollowUp?.status === 'TREATMENT' ? 'Traitement en cours' : (supportPath?.medicalFollowUp?.status === 'PENDING' ? 'Consultation en attente' : 'Aucun requis')), color: BLUE },
                                    ].map(item => (
                                        <div key={item.label} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px',
                                            background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                                            borderRadius: 12, border: `1px solid ${t.border}`,
                                        }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                                                {item.icon}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text, wordBreak: 'break-word' }}>{item.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button icon={<EditOutlined />} onClick={() => {
                                        setActiveTrackingSection('medical');
                                        trackingForm.setFieldsValue({
                                            doctor: supportPath?.medicalFollowUp?.doctor || '',
                                            details: supportPath?.medicalFollowUp?.details || '',
                                            status: supportPath?.medicalFollowUp?.status || 'NONE'
                                        });
                                        setTrackingModalOpen(true);
                                    }} block style={{ borderRadius: 12, border: `1px dashed ${GREEN}`, color: GREEN, fontWeight: 700 }}>
                                        Modifier le suivi médical
                                    </Button>
                                </div>
                            </SCard>

                            {/* Psychological */}
                            <SCard isDark={isDark} accentLine={PINK}
                                title={<><HeartOutlined style={{ color: PINK }} /> Suivi Psychologique</>}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { label: 'Thérapeute référent', icon: <UserOutlined />, value: supportPath?.psychologicalFollowUp?.therapist || 'Non assigné', color: PURPLE },
                                        { label: 'Nombre de séances réalisées', icon: <CalendarOutlined />, value: `${supportPath?.psychologicalFollowUp?.sessionsCount || 0} séances`, color: PINK },
                                        { label: 'Observations cliniques', icon: <AuditOutlined />, value: supportPath?.psychologicalFollowUp?.notes || 'Aucun suivi enregistré', color: AMBER },
                                    ].map(item => (
                                        <div key={item.label} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px',
                                            background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                                            borderRadius: 12, border: `1px solid ${t.border}`,
                                        }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                                                {item.icon}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text, wordBreak: 'break-word' }}>{item.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button icon={<EditOutlined />} onClick={() => {
                                        setActiveTrackingSection('psychological');
                                        trackingForm.setFieldsValue({
                                            therapist: supportPath?.psychologicalFollowUp?.therapist || '',
                                            sessionsCount: supportPath?.psychologicalFollowUp?.sessionsCount || 0,
                                            notes: supportPath?.psychologicalFollowUp?.notes || ''
                                        });
                                        setTrackingModalOpen(true);
                                    }} block style={{ borderRadius: 12, border: `1px dashed ${PINK}`, color: PINK, fontWeight: 700 }}>
                                        Modifier le suivi psychologique
                                    </Button>
                                </div>
                            </SCard>

                            {/* Legal */}
                            <SCard isDark={isDark} accentLine={AMBER}
                                title={<><AuditOutlined style={{ color: AMBER }} /> Suivi Juridique</>}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { label: 'Avocat référent', icon: <UserOutlined />, value: supportPath?.legalFollowUp?.lawyer || 'Non assigné', color: PURPLE },
                                        { label: 'Dossier Tribunal', icon: <FileTextOutlined />, value: supportPath?.courtCaseRef || '—', color: RED },
                                        { label: 'Plainte à la police', icon: <FileDoneOutlined />, value: supportPath?.policeReport ? 'Plainte formellement déposée' : 'Aucune plainte déposée', color: AMBER },
                                        { label: 'État de la procédure', icon: <ClockCircleOutlined />, value: supportPath?.legalFollowUp?.status || 'Aucune procédure', color: BLUE },
                                    ].map(item => (
                                        <div key={item.label} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px',
                                            background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                                            borderRadius: 12, border: `1px solid ${t.border}`,
                                        }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                                                {item.icon}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text, wordBreak: 'break-word' }}>{item.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button icon={<EditOutlined />} onClick={() => {
                                        setActiveTrackingSection('legal');
                                        trackingForm.setFieldsValue({
                                            lawyer: supportPath?.legalFollowUp?.lawyer || '',
                                            courtCaseRef: supportPath?.courtCaseRef || '',
                                            policeReport: supportPath?.policeReport || false,
                                            status: supportPath?.legalFollowUp?.status || 'Preparing filing'
                                        });
                                        setTrackingModalOpen(true);
                                    }} block style={{ borderRadius: 12, border: `1px dashed ${AMBER}`, color: AMBER, fontWeight: 700 }}>
                                        Modifier le suivi juridique
                                    </Button>
                                </div>
                            </SCard>

                            {/* Social */}
                            <SCard isDark={isDark} accentLine={BLUE}
                                title={<><HomeOutlined style={{ color: BLUE }} /> Prise en charge Sociale & Hébergement</>}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {[
                                        { label: 'Hébergement d\'urgence', icon: <HomeOutlined />, value: supportPath?.shelterInfo?.center || 'Non hébergée', color: BLUE },
                                        { label: 'Date d\'admission / lit', icon: <CalendarOutlined />, value: supportPath?.shelterInfo?.arrivalDate ? `${supportPath?.shelterInfo?.arrivalDate} · Lit: ${supportPath?.shelterInfo?.allocatedBeds || '—'}` : '—', color: GREEN },
                                        { label: 'Étape de prise en charge globale', icon: <StarOutlined />, value: supportPath?.currentStage === 'ACCOMMODATED' ? 'Hébergée en sécurité' : (supportPath?.currentStage === 'LEGAL_ACTION' ? 'Action de justice' : (supportPath?.currentStage === 'RECOVERED' ? 'Rétablie / réinsérée' : 'Signalement reçu')), color: PURPLE },
                                    ].map(item => (
                                        <div key={item.label} style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px',
                                            background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                                            borderRadius: 12, border: `1px solid ${t.border}`,
                                        }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                                                {item.icon}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text, wordBreak: 'break-word' }}>{item.value}</div>
                                            </div>
                                        </div>
                                    ))}
                                    <Button icon={<EditOutlined />} onClick={() => {
                                        setActiveTrackingSection('social');
                                        trackingForm.setFieldsValue({
                                            center: supportPath?.shelterInfo?.center || 'Non hébergée',
                                            arrivalDate: supportPath?.shelterInfo?.arrivalDate || '',
                                            allocatedBeds: supportPath?.shelterInfo?.allocatedBeds || '',
                                            currentStage: supportPath?.currentStage || 'REPORTED'
                                        });
                                        setTrackingModalOpen(true);
                                    }} block style={{ borderRadius: 12, border: `1px dashed ${BLUE}`, color: BLUE, fontWeight: 700 }}>
                                        Modifier l'hébergement & statut
                                    </Button>
                                </div>
                            </SCard>
                        </div>
                    </motion.div>
                )}

                {/* ═════════════════════════════════════════════ */}
                {/* TAB: CENTRES D'HÉBERGEMENT                   */}
                {/* ═════════════════════════════════════════════ */}
                {activeTab === 'shelters' && (
                    <motion.div key="shelters"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 700, color: t.textSub }}>
                                {shelters.length} centres d'hébergement disponibles
                            </div>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => setShelterModalOpen(true)}
                                style={{ background: RED, border: 'none', borderRadius: 10, fontWeight: 700 }}
                            >
                                Ajouter un centre
                            </Button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
                            {shelters.map(shelter => {
                                const occupancyPct = Math.round(((shelter.capacity - shelter.available) / shelter.capacity) * 100);
                                const isFull = shelter.available === 0;
                                return (
                                    <div key={shelter.id} style={{
                                        background: t.card, borderRadius: 16,
                                        border: `1px solid ${isFull ? RED + '44' : t.border}`,
                                        overflow: 'hidden',
                                        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
                                    }}>
                                        <div style={{ height: 3, background: isFull ? `linear-gradient(90deg, ${RED}, ${RED_DARK})` : `linear-gradient(90deg, ${GREEN}, ${GREEN}88)` }} />
                                        <div style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                                <div>
                                                    <div style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, color: t.text }}>{shelter.name}</div>
                                                    <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub, marginTop: 2 }}>
                                                        <EnvironmentOutlined style={{ marginRight: 4 }} />{shelter.region}
                                                    </div>
                                                </div>
                                                <Tag color={isFull ? 'red' : 'green'} style={{ borderRadius: 8, fontWeight: 700 }}>
                                                    {isFull ? 'Complet' : `${shelter.available} places`}
                                                </Tag>
                                            </div>

                                            <div style={{ marginBottom: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub }}>Capacité</span>
                                                    <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color: t.text }}>{shelter.capacity - shelter.available}/{shelter.capacity}</span>
                                                </div>
                                                <Progress percent={occupancyPct} strokeColor={isFull ? RED : GREEN} size="small" showInfo={false} />
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                                                <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub }}>
                                                    <UserOutlined style={{ marginRight: 6 }} />{shelter.manager}
                                                </div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub }}>
                                                    <PhoneOutlined style={{ marginRight: 6 }} />{shelter.phone}
                                                </div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub }}>
                                                    <EnvironmentOutlined style={{ marginRight: 6 }} />{shelter.address}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                                                {(shelter.services || []).map(s => (
                                                    <Tag key={s} style={{ borderRadius: 6, fontSize: 10, background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', border: 'none' }}>{s}</Tag>
                                                ))}
                                            </div>

                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <Button size="small" type="primary" disabled={isFull}
                                                    onClick={() => handleAssignShelter(shelter.name)}
                                                    style={{ flex: 1, borderRadius: 8, background: isFull ? '#94A3B8' : RED, border: 'none', fontWeight: 700 }}>
                                                    Affecter victime
                                                </Button>
                                                <Button size="small" icon={<UploadOutlined />} style={{ borderRadius: 8 }}>Photos</Button>
                                                <Button size="small" icon={<CompassOutlined />} style={{ borderRadius: 8, color: BLUE }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Map placeholder */}
                        <SCard isDark={isDark} accentLine={BLUE}
                            title={<><CompassOutlined style={{ color: BLUE }} /> Carte des centres d'hébergement</>}
                        >
                            <div style={{ height: 350, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                                <MapContainer center={[36.8065, 10.1815]} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    />
                                    {shelters.map(shelter => {
                                        let position: [number, number] = [36.8065, 10.1815]; // default Tunis
                                        if (shelter.region?.toUpperCase() === 'SFAX') position = [34.7406, 10.7603];
                                        else if (shelter.region?.toUpperCase() === 'SOUSSE') position = [35.8256, 10.6369];
                                        else if (shelter.region?.toUpperCase() === 'KAIROUAN') position = [35.6781, 10.0963];
                                        else if (shelter.region?.toUpperCase() === 'BIZERTE') position = [37.2744, 9.8739];
                                        
                                        return (
                                            <Marker key={shelter.id} position={position}>
                                                <Popup>
                                                    <div style={{ fontFamily: fonts.body, fontSize: 12 }}>
                                                        <strong style={{ color: BLUE }}>{shelter.name}</strong><br/>
                                                        <span>{shelter.address}</span><br/>
                                                        <span><strong>Manager:</strong> {shelter.manager}</span><br/>
                                                        <span><strong>Tél:</strong> {shelter.phone}</span><br/>
                                                        <span><strong>Places dispos:</strong> {shelter.available} / {shelter.capacity}</span>
                                                    </div>
                                                </Popup>
                                            </Marker>
                                        );
                                    })}
                                </MapContainer>
                            </div>
                        </SCard>
                    </motion.div>
                )}

                {/* ═════════════════════════════════════════════ */}
                {/* TAB: COORDINATION INSTITUTIONNELLE           */}
                {/* ═════════════════════════════════════════════ */}
                {activeTab === 'coordination' && (
                    <motion.div key="coordination"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        {/* Filter bar and add button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {[
                                    { key: 'all', label: 'Tous', icon: <GlobalOutlined /> },
                                    { key: 'police', label: 'Police', icon: <SafetyOutlined /> },
                                    { key: 'hospital', label: 'Hôpitaux', icon: <MedicineBoxOutlined /> },
                                    { key: 'center', label: 'Centres', icon: <HomeOutlined /> },
                                    { key: 'protection', label: 'Protection Enfance', icon: <SafetyCertificateOutlined /> },
                                    { key: 'association', label: 'Associations', icon: <HeartOutlined /> },
                                ].map(f => (
                                    <button key={f.key} onClick={() => setPartnerFilter(f.key)} style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '8px 16px', borderRadius: 10,
                                        background: partnerFilter === f.key ? RED : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                                        color: partnerFilter === f.key ? '#fff' : t.textSub,
                                        border: 'none', fontFamily: fonts.body, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                    }}>
                                        {f.icon} {f.label}
                                    </button>
                                ))}
                            </div>
                            <Button type="primary" icon={<PlusOutlined />}
                                onClick={() => setPartnerModalOpen(true)}
                                style={{ background: RED, border: 'none', borderRadius: 10, fontWeight: 700 }}
                            >
                                Ajouter un partenaire
                            </Button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, marginBottom: 24 }}>
                            {partners
                                .filter(p => partnerFilter === 'all' || p.type === partnerFilter)
                                .map((partner, i) => {
                                    const meta = PARTNER_ICONS[partner.type] || PARTNER_ICONS.police;
                                    return (
                                        <div key={partner.id || i} style={{
                                            background: t.card, borderRadius: 14,
                                            border: `1px solid ${t.border}`, padding: '18px',
                                            boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.25)' : '0 2px 10px rgba(0,0,0,0.05)',
                                            transition: 'transform 0.2s',
                                        }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                                <div style={{
                                                    width: 42, height: 42, borderRadius: 12,
                                                    background: `${meta.color}18`, flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: meta.color, fontSize: 20,
                                                }}>
                                                    {meta.icon}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 13, color: t.text }}>{partner.label}</div>
                                                    <Tag style={{ marginTop: 4, borderRadius: 6, fontSize: 10, color: meta.color, background: `${meta.color}15`, border: 'none', fontWeight: 700 }}>
                                                        {meta.label}
                                                    </Tag>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                                                <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <EnvironmentOutlined style={{ color: meta.color }} /> {partner.address}
                                                </div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <PhoneOutlined style={{ color: meta.color }} />
                                                    <a href={`tel:${partner.phone}`} style={{ color: meta.color, fontWeight: 700 }}>{partner.phone}</a>
                                                </div>
                                                <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSub, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <EnvironmentOutlined style={{ color: t.textFaint }} /> {partner.region}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <Button size="small" type="primary"
                                                    style={{ flex: 1, borderRadius: 8, background: meta.color, border: 'none', fontWeight: 700, fontSize: 11 }}>
                                                    Envoyer dossier
                                                </Button>
                                                <Button size="small" style={{ borderRadius: 8, fontSize: 11 }}>Réunion</Button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        {/* Coordination map */}
                        <SCard isDark={isDark} accentLine={BLUE}
                            title={<><CompassOutlined style={{ color: BLUE }} /> Carte de coordination régionale — Partenaires & Ressources</>}
                        >
                            <div style={{ marginBottom: 12, fontFamily: fonts.body, fontSize: 13, color: t.textSub }}>
                                {canSeeAll ? 'Vue nationale — Tous les partenaires' : 'Vue régionale — Partenaires de votre région'}
                            </div>
                            <div style={{ height: 350, borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                                <MapContainer center={[36.8065, 10.1815]} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    />
                                    {partners
                                        .filter(p => partnerFilter === 'all' || p.type === partnerFilter)
                                        .map((partner, idx) => {
                                            const lat = partner.latitude || 36.8065;
                                            const lng = partner.longitude || 10.1815;
                                            return (
                                                <Marker key={partner.id || idx} position={[lat, lng]}>
                                                    <Popup>
                                                        <div style={{ fontFamily: fonts.body, fontSize: 12 }}>
                                                            <strong style={{ color: RED }}>{partner.label}</strong><br/>
                                                            <span><strong>Type:</strong> {partner.type}</span><br/>
                                                            <span><strong>Région:</strong> {partner.region}</span><br/>
                                                            <span><strong>Adresse:</strong> {partner.address}</span><br/>
                                                            <span><strong>Tél:</strong> {partner.phone}</span>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
                                </MapContainer>
                            </div>
                        </SCard>
                    </motion.div>
                )}

                {/* ═════════════════════════════════════════════ */}
                {/* TAB: CAMPAGNES DE SENSIBILISATION            */}
                {/* ═════════════════════════════════════════════ */}
                {activeTab === 'campaigns' && (
                    <motion.div key="campaigns"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        <Alert
                            type="info" showIcon icon={<InfoCircleOutlined />}
                            message="Workflow d'approbation"
                            description="Toute campagne nécessite l'approbation du Président du comité. Après l'événement, les photos et justificatifs doivent être déposés sous 24h. Des notifications sont envoyées automatiquement à J+1, J+2 et J+3."
                            style={{ borderRadius: 12, marginBottom: 20, fontFamily: fonts.body }}
                        />

                        <SCard isDark={isDark} accentLine={PURPLE}
                            title={<><NotificationOutlined style={{ color: PURPLE }} /> Campagnes de Sensibilisation ({campaigns.length})</>}
                            extra={
                                <Button type="primary" icon={<PlusOutlined />}
                                    onClick={() => setCampaignModalOpen(true)}
                                    style={{ background: PURPLE, border: 'none', borderRadius: 10, fontWeight: 700 }}
                                >
                                    Nouvelle Campagne
                                </Button>
                            }
                        >
                            <Table
                                columns={campColumns as any}
                                dataSource={campaigns as any}
                                rowKey="id"
                                pagination={{ pageSize: 8, hideOnSinglePage: true }}
                                locale={{
                                    emptyText: (
                                        <div style={{ padding: '50px 0', textAlign: 'center' }}>
                                            <NotificationOutlined style={{ fontSize: 40, color: t.textFaint, marginBottom: 12 }} />
                                            <div style={{ fontFamily: fonts.body, color: t.textSub }}>Aucune campagne planifiée</div>
                                        </div>
                                    )
                                }}
                            />
                        </SCard>
                    </motion.div>
                )}

                {/* ═════════════════════════════════════════════ */}
                {/* TAB: STATISTIQUES (national + president)     */}
                {/* ═════════════════════════════════════════════ */}
                {activeTab === 'stats' && canSeeAll && (
                    <motion.div key="stats"
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}
                    >
                        <Alert type="warning" showIcon icon={<LockOutlined />}
                            message="Statistiques confidentielles — Accès restreint"
                            description="Ces statistiques sont visibles uniquement par le Responsable VFF National et le Président National. Les données personnelles ne sont pas affichées."
                            style={{ borderRadius: 12, marginBottom: 20, fontFamily: fonts.body }}
                        />

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
                            <StatCard icon={<WomanOutlined />} value={totalCases} label="Total national" accent={RED} isDark={isDark} sub="Tous comités" />
                            <StatCard icon={<AlertOutlined />} value={urgentCases} label="Cas critiques" accent="#EF4444" isDark={isDark} sub="Action immédiate" />
                            <StatCard icon={<CheckCircleOutlined />} value={closedCases} label="Résolus" accent={GREEN} isDark={isDark} sub="Dossiers clôturés" />
                            <StatCard icon={<NotificationOutlined />} value={campaigns.length} label="Campagnes totales" accent={PURPLE} isDark={isDark} sub="Toutes régions" />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <SCard isDark={isDark} accentLine={RED}
                                title={<><BarChartOutlined style={{ color: RED }} /> Répartition nationale par type de violence</>}
                            >
                                {violenceBreakdown.map(vt => (
                                    <VTypeRow key={vt.key} label={vt.label} count={vt.count} max={maxViolence} color={vt.color} isDark={isDark} />
                                ))}
                            </SCard>

                            <SCard isDark={isDark} accentLine={BLUE}
                                title={<><CalendarOutlined style={{ color: BLUE }} /> Évolution mensuelle nationale</>}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '0 4px' }}>
                                    {monthlyData.map((val, i) => {
                                        const maxVal = Math.max(...monthlyData);
                                        const h = maxVal > 0 ? (val / maxVal) * 100 : 4;
                                        return (
                                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                                <span style={{ fontFamily: fonts.body, fontSize: 10, fontWeight: 700, color: RED }}>{val}</span>
                                                <div style={{ width: '100%', height: h, minHeight: 4, background: `linear-gradient(180deg, ${RED}, ${RED}88)`, borderRadius: '4px 4px 0 0' }} />
                                                <span style={{ fontFamily: fonts.body, fontSize: 9, color: t.textFaint }}>{dynamicMonths[i]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </SCard>
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <SCard isDark={isDark} accentLine={GREEN}
                                title={<><FileDoneOutlined style={{ color: GREEN }} /> Générer des rapports</>}
                            >
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {[
                                        { label: 'Rapport PDF', icon: <FileDoneOutlined />, color: RED },
                                        { label: 'Export Excel', icon: <FileTextOutlined />, color: GREEN },
                                        { label: 'Graphiques', icon: <BarChartOutlined />, color: BLUE },
                                        { label: 'Carte interactive', icon: <CompassOutlined />, color: PURPLE },
                                        { label: 'Historique interventions', icon: <ClockCircleOutlined />, color: AMBER },
                                    ].map(r => (
                                        <Button key={r.label} icon={r.icon}
                                            style={{ borderRadius: 10, border: `1px solid ${r.color}44`, color: r.color, fontWeight: 700, fontFamily: fonts.body }}>
                                            {r.label}
                                        </Button>
                                    ))}
                                </div>
                            </SCard>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL: MODIFIER LE SUIVI DE PRISE EN CHARGE          */}
            {/* ═══════════════════════════════════════════════════ */}
            <Modal
                title={
                    <Space>
                        <HeartOutlined style={{ color: PINK }} />
                        <Text strong style={{ fontFamily: fonts.heading, fontSize: 18 }}>
                            {activeTrackingSection === 'medical' && 'Modifier Suivi Médical'}
                            {activeTrackingSection === 'psychological' && 'Modifier Suivi Psychologique'}
                            {activeTrackingSection === 'legal' && 'Modifier Suivi Juridique'}
                            {activeTrackingSection === 'social' && 'Modifier Prise en charge Sociale & Hébergement'}
                        </Text>
                    </Space>
                }
                open={trackingModalOpen}
                onCancel={() => { setTrackingModalOpen(false); trackingForm.resetFields(); }}
                footer={null}
                width={600}
                centered
                styles={{ content: { borderRadius: 24, padding: 32 } }}
            >
                <Form form={trackingForm} layout="vertical" onFinish={handleUpdateTracking} requiredMark={false}>
                    {activeTrackingSection === 'medical' && (
                        <>
                            <Form.Item name="doctor" label="Médecin référent / Hôpital" rules={[{ required: true, message: 'Requis' }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Dr. Sonia Belhaj, Hôpital La Rabta" />
                            </Form.Item>
                            <Form.Item name="details" label="Détails des soins / ITT" rules={[{ required: true, message: 'Requis' }]}>
                                <TextArea rows={3} style={{ borderRadius: 10 }} placeholder="Ex: Rédigé certificat médical (15 jours d'ITT)..." />
                            </Form.Item>
                            <Form.Item name="status" label="Statut de la prise en charge">
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="PENDING">En attente de consultation</Option>
                                    <Option value="COMPLETED">Consultation effectuée</Option>
                                    <Option value="TREATMENT">Traitement en cours</Option>
                                    <Option value="NONE">Aucun soin requis</Option>
                                </Select>
                            </Form.Item>
                        </>
                    )}

                    {activeTrackingSection === 'psychological' && (
                        <>
                            <Form.Item name="therapist" label="Psychologue / Thérapeute référent" rules={[{ required: true, message: 'Requis' }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Mme. Ines Chaari" />
                            </Form.Item>
                            <Form.Item name="sessionsCount" label="Nombre de séances réalisées" rules={[{ required: true, message: 'Requis' }]}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={0} />
                            </Form.Item>
                            <Form.Item name="notes" label="Observations psychologiques">
                                <TextArea rows={3} style={{ borderRadius: 10 }} placeholder="Notes de suivi, état émotionnel..." />
                            </Form.Item>
                        </>
                    )}

                    {activeTrackingSection === 'legal' && (
                        <>
                            <Form.Item name="lawyer" label="Avocat référent" rules={[{ required: true, message: 'Requis' }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Me. Kamel Ben Amor" />
                            </Form.Item>
                            <Form.Item name="courtCaseRef" label="Référence dossier tribunal">
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: COURT-2026-098" />
                            </Form.Item>
                            <Form.Item name="policeReport" label="Plainte déposée à la police">
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value={true}>Oui, plainte déposée</Option>
                                    <Option value={false}>Non, pas de plainte</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="status" label="État de la procédure">
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="Preparing filing">En préparation</Option>
                                    <Option value="Complaint filed">Plainte déposée</Option>
                                    <Option value="Trial pending">Audience fixée</Option>
                                    <Option value="Closed">Procédure clôturée</Option>
                                </Select>
                            </Form.Item>
                        </>
                    )}

                    {activeTrackingSection === 'social' && (
                        <>
                            <Form.Item name="center" label="Centre d'hébergement affecté">
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="Non hébergée">Non hébergée</Option>
                                    <Option value="Centre Amel - Tunis">Centre Amel - Tunis</Option>
                                    <Option value="Centre Espoir - Sfax">Centre Espoir - Sfax</Option>
                                    <Option value="Centre de la Femme et de l'Enfant - Tunis">Centre de la Femme et de l'Enfant - Tunis</Option>
                                </Select>
                            </Form.Item>
                            <Form.Item name="arrivalDate" label="Date d'admission">
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: DD/MM/YYYY, ou —" />
                            </Form.Item>
                            <Form.Item name="allocatedBeds" label="Chambre / Lit alloué">
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Chambre 4, Lit A" />
                            </Form.Item>
                            <Form.Item name="currentStage" label="Étape globale de prise en charge">
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="REPORTED">Signalé</Option>
                                    <Option value="ACCOMMODATED">Hébergé</Option>
                                    <Option value="LEGAL_ACTION">Procédure judiciaire</Option>
                                    <Option value="RECOVERED">Réinséré / Rétabli</Option>
                                </Select>
                            </Form.Item>
                        </>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => { setTrackingModalOpen(false); trackingForm.resetFields(); }} style={{ height: 44, borderRadius: 10 }}>
                            Annuler
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading}
                            style={{ height: 44, borderRadius: 10, background: PINK, border: 'none', fontWeight: 700 }}>
                            Enregistrer modifications
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL: SIGNALEMENT CONFIDENTIEL (Formulaire complet) */}
            {/* ═══════════════════════════════════════════════════ */}
            <Modal
                title={
                    <Space>
                        <LockOutlined style={{ color: RED }} />
                        <Text strong style={{ fontFamily: fonts.heading, fontSize: 18 }}>Signalement Confidentiel</Text>
                    </Space>
                }
                open={caseModalOpen}
                onCancel={() => { setCaseModalOpen(false); caseForm.resetFields(); }}
                footer={null}
                width={780}
                centered
                styles={{ content: { borderRadius: 24, padding: 32 } }}
            >
                <Alert type="error" showIcon icon={<SafetyCertificateOutlined />}
                    message="Confidentialité absolue — Ce signalement est chiffré et journalisé."
                    style={{ borderRadius: 12, marginBottom: 24, fontFamily: fonts.body }}
                />

                <Form form={caseForm} layout="vertical" onFinish={handleCreateCase} requiredMark={false}>
                    <Divider orientation="left" style={{ fontFamily: fonts.body, fontWeight: 700, color: RED, fontSize: 13 }}>
                        Informations sur la victime
                    </Divider>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="alias" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Identité ou Alias</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Madame X, ou vrai nom" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="age" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Âge estimé</span>}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={0} max={100} placeholder="Ans" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="gender" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Sexe</span>}>
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="FEMME">Femme</Option>
                                    <Option value="HOMME">Homme</Option>
                                    <Option value="ENFANT_F">Enfant (F)</Option>
                                    <Option value="ENFANT_M">Enfant (M)</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="familySituation" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Situation familiale</span>}>
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="MARIEE">Mariée</Option>
                                    <Option value="CELIBATAIRE">Célibataire</Option>
                                    <Option value="DIVORCEE">Divorcée</Option>
                                    <Option value="VEUVE">Veuve</Option>
                                    <Option value="AVEC_ENFANTS">Avec enfants</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Téléphone (optionnel)</span>}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: +216 XX XXX XXX" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="address" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Adresse ou Région</span>}>
                        <Input size="large" style={{ borderRadius: 10 }} placeholder="Région / ville" />
                    </Form.Item>

                    <Divider orientation="left" style={{ fontFamily: fonts.body, fontWeight: 700, color: RED, fontSize: 13 }}>
                        Détails du signalement
                    </Divider>

                    <Form.Item name="violenceType" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Nature de la violence</span>} rules={[{ required: true, message: 'Requis' }]}>
                        <Select size="large" mode="multiple" style={{ borderRadius: 10 }} placeholder="Sélectionner le(s) type(s)">
                            <Option value="PHYSIQUE">🔴 Violence physique</Option>
                            <Option value="PSYCHOLOGIQUE">🟣 Violence psychologique</Option>
                            <Option value="SEXUELLE">🔵 Violence sexuelle</Option>
                            <Option value="ECONOMIQUE">🟡 Violence économique</Option>
                            <Option value="NEGLIGENCE">🟢 Négligence</Option>
                            <Option value="ENFANT">🟠 Maltraitance infantile</Option>
                            <Option value="MARIAGE">🩷 Mariage forcé</Option>
                            <Option value="EXPLOITATION">⚫ Exploitation</Option>
                            <Option value="HARCELEMENT">🔺 Harcèlement</Option>
                            <Option value="AUTRE">⬜ Autre</Option>
                        </Select>
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="urgency" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Niveau d'urgence</span>} rules={[{ required: true }]}>
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="LOW">🟢 Faible</Option>
                                    <Option value="MEDIUM">🔵 Moyen</Option>
                                    <Option value="HIGH">🟡 Élevé</Option>
                                    <Option value="CRITICAL">🔴 Critique / Immédiat</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Description des faits</span>}>
                        <TextArea rows={3} style={{ borderRadius: 10 }} placeholder="Description détaillée de la situation..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="immediateNeeds" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Besoins immédiats</span>}>
                                <TextArea rows={2} style={{ borderRadius: 10 }} placeholder="Ex: hébergement, soins médicaux..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="risks" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Risques identifiés</span>}>
                                <TextArea rows={2} style={{ borderRadius: 10 }} placeholder="Ex: risque de récidive, enfants en danger..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" style={{ fontFamily: fonts.body, fontWeight: 700, color: RED, fontSize: 13 }}>
                        Pièces jointes
                    </Divider>

                    <Row gutter={16}>
                        {[
                            { name: 'photos', label: '📷 Photos', accept: 'image/*' },
                            { name: 'medicalDocs', label: '🏥 Rapports médicaux', accept: '.pdf,.doc,.docx' },
                            { name: 'legalDocs', label: '⚖️ Documents juridiques', accept: '.pdf,.doc,.docx' },
                        ].map(f => (
                            <Col span={8} key={f.name}>
                                <Form.Item name={f.name} label={<span style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 12 }}>{f.label}</span>}>
                                    <Upload accept={f.accept} listType="text" maxCount={5} beforeUpload={() => false}>
                                        <Button icon={<UploadOutlined />} style={{ width: '100%', borderRadius: 10, fontFamily: fonts.body }}>
                                            Téléverser
                                        </Button>
                                    </Upload>
                                </Form.Item>
                            </Col>
                        ))}
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => { setCaseModalOpen(false); caseForm.resetFields(); }} style={{ height: 44, borderRadius: 10 }}>
                            Annuler
                        </Button>
                        <Button htmlType="submit" loading={submitLoading}
                            onClick={() => caseForm.setFieldValue('saveAs', 'draft')}
                            style={{ height: 44, borderRadius: 10, fontWeight: 700 }}>
                            Enregistrer brouillon
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading}
                            onClick={() => caseForm.setFieldValue('saveAs', 'submit')}
                            style={{ height: 44, borderRadius: 10, background: RED, border: 'none', fontWeight: 700 }}>
                            Soumettre signalement
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL: DÉTAIL / CONSULTATION DU DOSSIER             */}
            {/* ═══════════════════════════════════════════════════ */}
            <Modal
                title={
                    <Space>
                        <LockOutlined style={{ color: RED }} />
                        <Text strong style={{ fontFamily: fonts.heading, fontSize: 18 }}>Dossier Victime — Confidentiel</Text>
                    </Space>
                }
                open={caseDetailOpen}
                onCancel={() => setCaseDetailOpen(false)}
                footer={[
                    <Button key="edit" icon={<EditOutlined />} style={{ borderRadius: 10 }}>Modifier</Button>,
                    <Button key="note" icon={<PlusOutlined />} style={{ borderRadius: 10 }}>Ajouter note</Button>,
                    <Button key="download" icon={<DownloadOutlined />} style={{ borderRadius: 10 }}>Télécharger</Button>,
                    <Button key="close" danger icon={<CloseOutlined />} style={{ borderRadius: 10 }}>Clôturer dossier</Button>,
                ]}
                width={700}
                centered
                styles={{ content: { borderRadius: 24, padding: 32 } }}
            >
                {selectedCase && (
                    <div>
                        <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {[
                                        { label: 'Numéro du dossier', value: `#${selectedCase.id?.slice(-8) || '——'}` },
                                        { label: 'Statut', value: <StatusBadge status={selectedCase.status} /> },
                                        { label: 'Niveau d\'urgence', value: <PriorityBadge priority={selectedCase.priority || selectedCase.riskLevel} /> },
                                        { label: 'Date de création', value: selectedCase.incidentDate ? new Date(selectedCase.incidentDate).toLocaleDateString('fr-FR') : 'Non précisée' },
                                    ].map(field => (
                                        <div key={field.label} style={{
                                            padding: '12px 14px',
                                            background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                                            borderRadius: 10, border: `1px solid ${t.border}`,
                                        }}>
                                            <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                                                {field.label}
                                            </div>
                                            <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text }}>
                                                {field.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Divider style={{ margin: '16px 0' }} />
                        <div style={{ fontFamily: fonts.body, fontWeight: 700, fontSize: 13, color: RED, marginBottom: 12 }}>
                            Informations personnelles (chiffrées)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                            {[
                                { label: 'Identité', value: selectedCase.victimName || 'Protégée' },
                                { label: 'Âge', value: (selectedCase.age || selectedCase.victimAge || '—') + ' ans' },
                                { label: 'Sexe', value: selectedCase.gender || selectedCase.victimGender || '—' },
                                { label: 'Type de violence', value: selectedCase.typeOfViolence || selectedCase.incidentType || '—' },
                            ].map(f => (
                                <div key={f.label} style={{ padding: '10px 12px', background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', borderRadius: 10 }}>
                                    <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.textFaint, fontWeight: 700 }}>{f.label}</div>
                                    <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text, marginTop: 2 }}>{f.value}</div>
                                </div>
                            ))}
                        </div>

                        {selectedCase.description && (
                            <div style={{ padding: '12px 16px', background: isDark ? 'rgba(220,38,38,0.08)' : '#FEF2F2', borderRadius: 10, border: `1px solid ${RED}22` }}>
                                <div style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 700, color: RED, marginBottom: 6 }}>Observations</div>
                                <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.text }}>{selectedCase.description}</div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL: CAMPAGNE DE SENSIBILISATION                  */}
            {/* ═══════════════════════════════════════════════════ */}
            <Modal
                title={
                    <Space>
                        <NotificationOutlined style={{ color: PURPLE }} />
                        <Text strong style={{ fontFamily: fonts.heading, fontSize: 18 }}>Nouvelle Campagne de Sensibilisation</Text>
                    </Space>
                }
                open={campaignModalOpen}
                onCancel={() => { setCampaignModalOpen(false); campaignForm.resetFields(); }}
                footer={null}
                width={700}
                centered
                styles={{ content: { borderRadius: 24, padding: 32 } }}
            >
                <Alert type="info" showIcon
                    message="Cette campagne sera soumise à l'approbation du Président avant publication."
                    style={{ borderRadius: 12, marginBottom: 20, fontFamily: fonts.body }}
                />

                <Form form={campaignForm} layout="vertical" onFinish={handleCreateCampaign} requiredMark={false}>
                    <Form.Item name="title" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Titre de la campagne</span>} rules={[{ required: true }]}>
                        <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Journée contre les violences faites aux femmes" />
                    </Form.Item>

                    <Form.Item name="description" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Description</span>}>
                        <TextArea rows={3} style={{ borderRadius: 10 }} placeholder="Objectifs, programme, actions prévues..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="eventDate" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Date de l'événement</span>} rules={[{ required: true }]}>
                                <DatePicker size="large" style={{ width: '100%', borderRadius: 10 }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="location" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Lieu</span>} rules={[{ required: true }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Maison de la Culture, Tunis" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="audience" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Public cible</span>}>
                                <Select size="large" mode="multiple" style={{ borderRadius: 10 }}>
                                    <Option value="FEMMES">Femmes</Option>
                                    <Option value="JEUNES">Jeunes</Option>
                                    <Option value="FAMILLES">Familles</Option>
                                    <Option value="ENFANTS">Enfants</Option>
                                    <Option value="PROFESSIONNELS">Professionnels de santé</Option>
                                    <Option value="GENERAL">Grand public</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expectedParticipants" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Participants attendus</span>}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={1} placeholder="Nombre" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="campaignPhotos" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Photos de l'événement (après réalisation)</span>}>
                        <Upload accept="image/*" listType="picture" maxCount={10} beforeUpload={() => false}>
                            <Button icon={<UploadOutlined />} style={{ borderRadius: 10, fontFamily: fonts.body }}>
                                Téléverser des photos
                            </Button>
                        </Upload>
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => { setCampaignModalOpen(false); campaignForm.resetFields(); }} style={{ height: 44, borderRadius: 10 }}>
                            Annuler
                        </Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading}
                            style={{ height: 44, borderRadius: 10, background: PURPLE, border: 'none', fontWeight: 700 }}>
                            Soumettre pour approbation
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL: AJOUTER CENTRE D'HÉBERGEMENT                */}
            {/* ═══════════════════════════════════════════════════ */}
            <Modal
                title={
                    <Space>
                        <HomeOutlined style={{ color: BLUE }} />
                        <Text strong style={{ fontFamily: fonts.heading, fontSize: 18 }}>Ajouter un Centre d'Hébergement</Text>
                    </Space>
                }
                open={shelterModalOpen}
                onCancel={() => setShelterModalOpen(false)}
                footer={null}
                width={700}
                centered
                styles={{ content: { borderRadius: 24, padding: 32 } }}
            >
                <Form form={shelterForm} layout="vertical" onFinish={handleCreateShelter} requiredMark={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Nom du centre</span>} rules={[{ required: true, message: 'Veuillez saisir le nom' }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Centre Amel" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="region" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Région</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="Tunis">Tunis</Option>
                                    <Option value="Sfax">Sfax</Option>
                                    <Option value="Sousse">Sousse</Option>
                                    <Option value="Kairouan">Kairouan</Option>
                                    <Option value="Bizerte">Bizerte</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="address" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Adresse complète</span>}>
                        <Input size="large" style={{ borderRadius: 10 }} placeholder="Adresse et ville" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="manager" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Responsable</span>}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Nom du responsable" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Téléphone</span>}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Numéro de contact" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="capacity" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Capacité totale</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={1} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="available" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Places disponibles</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={0} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="services" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Services proposés</span>}>
                        <Select size="large" mode="multiple" style={{ borderRadius: 10 }}>
                            <Option value="Hébergement">Hébergement</Option>
                            <Option value="Soutien psychologique">Soutien psychologique</Option>
                            <Option value="Aide juridique">Aide juridique</Option>
                            <Option value="Suivi médical">Suivi médical</Option>
                            <Option value="Accompagnement social">Accompagnement social</Option>
                            <Option value="Réinsertion professionnelle">Réinsertion professionnelle</Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Photos du centre</span>}>
                        <Upload accept="image/*" listType="picture-card" maxCount={8} beforeUpload={() => false}>
                            <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8, fontFamily: fonts.body, fontSize: 12 }}>Ajouter photo</div>
                            </div>
                        </Upload>
                    </Form.Item>

                    <Form.Item label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Localisation sur carte</span>}>
                        <div style={{
                            height: 150, borderRadius: 10,
                            background: isDark ? 'rgba(255,255,255,0.04)' : '#EFF6FF',
                            border: `2px dashed ${BLUE}44`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}>
                            <PushpinOutlined style={{ color: BLUE, fontSize: 24 }} />
                            <span style={{ fontFamily: fonts.body, color: t.textSub }}>Cliquer pour sélectionner sur la carte</span>
                        </div>
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => setShelterModalOpen(false)} style={{ height: 44, borderRadius: 10 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading} style={{ height: 44, borderRadius: 10, background: BLUE, border: 'none', fontWeight: 700 }}>
                            Enregistrer le centre
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* ═══════════════════════════════════════════════════ */}
            {/* MODAL: AJOUTER PARTENAIRE                         */}
            {/* ═══════════════════════════════════════════════════ */}
            <Modal
                title={
                    <Space>
                        <GlobalOutlined style={{ color: RED }} />
                        <Text strong style={{ fontFamily: fonts.heading, fontSize: 18 }}>Ajouter un Partenaire de Coordination</Text>
                    </Space>
                }
                open={partnerModalOpen}
                onCancel={() => setPartnerModalOpen(false)}
                footer={null}
                width={700}
                centered
                styles={{ content: { borderRadius: 24, padding: 32 } }}
            >
                <Form form={partnerForm} layout="vertical" onFinish={handleCreatePartner} requiredMark={false}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Type de partenaire</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="police">Commissariat de police</Option>
                                    <Option value="hospital">Hôpital / Services de santé</Option>
                                    <Option value="center">Centre d'hébergement</Option>
                                    <Option value="protection">Délégation de protection de l'enfance</Option>
                                    <Option value="association">Association d'aide aux victimes</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="label" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Nom du partenaire</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Commissariat de Bab Bhar" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="region" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Région</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <Select size="large" style={{ borderRadius: 10 }}>
                                    <Option value="Tunis">Tunis</Option>
                                    <Option value="Sfax">Sfax</Option>
                                    <Option value="Sousse">Sousse</Option>
                                    <Option value="Kairouan">Kairouan</Option>
                                    <Option value="Bizerte">Bizerte</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Téléphone</span>} rules={[{ required: true, message: 'Requis' }]}>
                                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: 71 000 000" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="address" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Adresse complète</span>}>
                        <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Rue de Paris, Tunis" />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="latitude" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Latitude (optionnelle)</span>}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} placeholder="36.7992" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="longitude" label={<span style={{ fontFamily: fonts.body, fontWeight: 700 }}>Longitude (optionnelle)</span>}>
                                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} placeholder="10.1802" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => setPartnerModalOpen(false)} style={{ height: 44, borderRadius: 10 }}>Annuler</Button>
                        <Button type="primary" htmlType="submit" loading={submitLoading}
                            style={{ height: 44, borderRadius: 10, background: RED, border: 'none', fontWeight: 700 }}>
                            Enregistrer le partenaire
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default VffPage;
