// ============================================================
// NEXUS-AID — Formulaire d'Évaluation IA-RCP
// Accessible uniquement aux formateurs RCP / RESP_SECOURISME
// Design moderne, responsive, interactif avec export PDF
// ============================================================

import React, { useState, useRef } from 'react';
import {
    Row, Col, Form, Input, Select, DatePicker, InputNumber, Radio,
    Slider, Checkbox, Button, Typography, Tag, Space, Divider,
    App, Spin, Tooltip, Progress, Steps
} from 'antd';
import {
    HeartOutlined, SaveOutlined, FilePdfOutlined, UploadOutlined,
    CheckCircleOutlined, WarningOutlined, CloseCircleOutlined,
    UserOutlined, CameraOutlined, StarOutlined, ExclamationCircleOutlined,
    ArrowLeftOutlined, ArrowRightOutlined, SendOutlined,
    RobotOutlined, LinkOutlined, VideoCameraOutlined, FileTextOutlined,
    InfoCircleOutlined, EditOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useUIStore } from '@/stores';
import { rcpService } from '@/services/domainServices';
import type { RcpEvaluationDTO } from '@/types';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { exportRcpToPdf } from '@/utils/rcpPdfExporter';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ---- Evaluation criteria definition ----
const CRITERIA = [
    { key: 'handPosition',   label: 'Position des mains',            desc: 'Vérification de la position correcte des mains sur le sternum' },
    { key: 'compressionDepth', label: 'Profondeur des compressions',  desc: 'Profondeur entre 5 et 6 cm selon les recommandations ERC 2021' },
    { key: 'frequency',      label: 'Fréquence des compressions',     desc: '100-120 compressions/min. Régularité et rythme' },
    { key: 'chestRelease',   label: 'Décompression thoracique',       desc: 'Relâchement complet du thorax entre chaque compression' },
    { key: 'ventilation',    label: 'Insufflations',                  desc: 'Volume, durée et qualité des insufflations' },
    { key: 'ratio',          label: 'Ratio compression/ventilation',  desc: 'Respect du ratio 30:2 selon protocole standard' },
    { key: 'interruptions',  label: 'Gestion des interruptions',      desc: 'Minimisation des pauses. Score inversé (5 = aucune interruption)' },
    { key: 'fatigue',        label: 'Résistance à la fatigue',        desc: 'Maintien de la qualité sur la durée de la RCP' },
    { key: 'reactivity',     label: 'Réactivité aux alertes IA',      desc: 'Correction immédiate suite aux alertes de l\'assistant IA' },
    { key: 'globalQuality',  label: 'Qualité globale',                desc: 'Évaluation globale de la performance de réanimation' },
];

const PROBLEMS_LIST = [
    { value: 'fausses_alertes',      label: 'Fausses alertes de l\'IA' },
    { value: 'detection_retard',     label: 'Détection avec retard' },
    { value: 'calibrage',            label: 'Problème de calibrage' },
    { value: 'interface_lente',      label: 'Interface lente / lag' },
    { value: 'feedback_confus',      label: 'Feedback visuel confus' },
    { value: 'positionnement',       label: 'Difficulté de positionnement capteur' },
    { value: 'bruit_fond',           label: 'Bruit de fond perturbateur' },
    { value: 'connectivite',         label: 'Problème de connectivité' },
];

const SCORE_COLORS: Record<number, string> = {
    1: '#ef4444', 2: '#f87171', 3: '#f97316', 4: '#fb923c', 5: '#eab308',
    6: '#fde047', 7: '#a3e635', 8: '#84cc16', 9: '#22c55e', 10: '#10b981'
};
const CONCORDANCE_COLORS: Record<string, string> = { EXCELLENT: '#10b981', BON: '#22c55e', MOYEN: '#f59e0b', FAIBLE: '#ef4444' };
const DECISION_CONFIGS: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    PRET:                    { color: '#10b981', icon: <CheckCircleOutlined />,  label: 'Prêt pour la certification' },
    AMELIORATIONS_MINEURES:  { color: '#f59e0b', icon: <WarningOutlined />,     label: 'Améliorations mineures requises' },
    AMELIORATIONS_MAJEURES:  { color: '#f97316', icon: <ExclamationCircleOutlined />, label: 'Améliorations majeures requises' },
    NON_RECOMMANDE:          { color: '#ef4444', icon: <CloseCircleOutlined />,  label: 'Non recommandé actuellement' },
};

const STEPS = [
    { title: 'Informations', icon: <UserOutlined /> },
    { title: 'Photos',       icon: <CameraOutlined /> },
    { title: 'Évaluation',   icon: <StarOutlined /> },
    { title: 'Problèmes',    icon: <ExclamationCircleOutlined /> },
    { title: 'Résultats',    icon: <HeartOutlined /> },
    { title: 'Décision',     icon: <CheckCircleOutlined /> },
];

// ---- Helper: read file as base64 ----
const fileToBase64 = (file: File): Promise<string> =>
    new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.onerror = rej;
        reader.readAsDataURL(file);
    });

// ---- Photo Upload Component ----
const PhotoUpload: React.FC<{
    label: string;
    value?: string;
    onChange: (b64: string | undefined) => void;
    isDark: boolean;
    optional?: boolean;
}> = ({ label, value, onChange, isDark, optional }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Fichier trop grand (max 5MB)'); return; }
        onChange(await fileToBase64(file));
    };

    return (
        <div
            onClick={() => inputRef.current?.click()}
            style={{
                border: `2px dashed ${value ? '#10b981' : (isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db')}`,
                borderRadius: 16,
                padding: 20,
                textAlign: 'center',
                cursor: 'pointer',
                background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
                transition: 'all 0.3s ease',
                position: 'relative',
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = isDark ? 'rgba(239,68,68,0.05)' : '#fef2f2'; }}
            onMouseLeave={e => {
                e.currentTarget.style.borderColor = value ? '#10b981' : (isDark ? 'rgba(255,255,255,0.12)' : '#d1d5db');
                e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb';
            }}
        >
            <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            {value ? (
                <>
                    <img src={value} alt={label} style={{ maxHeight: 100, maxWidth: '100%', borderRadius: 12, objectFit: 'cover' }} />
                    <Button
                        type="primary" danger size="small"
                        onClick={e => { e.stopPropagation(); onChange(undefined); }}
                        style={{ position: 'absolute', top: 8, right: 8, borderRadius: 8 }}
                    >✕</Button>
                </>
            ) : (
                <>
                    <CameraOutlined style={{ fontSize: 28, color: isDark ? 'rgba(255,255,255,0.45)' : '#9ca3af' }} />
                    <Text strong style={{ fontSize: 13 }}>{label}</Text>
                    {optional && <Text type="secondary" style={{ fontSize: 11 }}>Optionnel</Text>}
                    <Text type="secondary" style={{ fontSize: 11 }}>JPG/PNG · Max 5MB · Cliquer pour sélectionner</Text>
                </>
            )}
        </div>
    );
};

// ---- Score Selector ----
const ScoreSelector: React.FC<{ value?: number; onChange?: (v: number) => void }> = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <div
                key={n}
                onClick={() => onChange?.(n)}
                style={{
                    width: 36, height: 36, borderRadius: 10,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    background: value === n ? SCORE_COLORS[n] : 'rgba(0,0,0,0.05)',
                    color: value === n ? '#fff' : '#6b7280',
                    border: `2px solid ${value === n ? SCORE_COLORS[n] : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    transform: value === n ? 'scale(1.1)' : 'scale(1)',
                    boxShadow: value === n ? `0 4px 12px ${SCORE_COLORS[n]}40` : 'none',
                }}
            >{n}</div>
        ))}
    </div>
);

// ---- Main Page ----
const RcpEvaluationFormPage: React.FC = () => {
    const { message: msg } = App.useApp();
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const themeMode = useUIStore(s => s.themeMode);
    const isDark = themeMode === 'dark';

    const [step, setStep]           = useState(0);
    const [loading, setLoading]     = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Form state
    const [form, setForm] = useState<Partial<RcpEvaluationDTO>>({
        trainerName: user?.fullName || '',
        evaluationDate: new Date().toISOString().slice(0, 10),
        totalAttempts: 1,
        participantEmail: '',
        scores: {},
        comments: {},
        problemsEncountered: [],
        recommendations: { high: [], medium: [], low: [] },
    });

    // Photos
    const [photos, setPhotos] = useState<{ participant?: string; cardiac?: string; ai?: string }>({});

    const glassCard = {
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.4)' : '0 20px 60px rgba(0,0,0,0.06)',
        padding: 32,
        marginBottom: 24,
    };

    const inputStyle = { borderRadius: 12 };

    // Compute auto scoreTrainer based on average of scores
    const computedScoreTrainer = () => {
        const vals = Object.values(form.scores || {}).filter(v => v > 0);
        if (!vals.length) return 0;
        return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    };

    const computedConcordanceGap = () => {
        const si = form.scoreIa || 0;
        const st = computedScoreTrainer();
        return Math.abs(si - st);
    };

    const getConcordanceLevel = (gap: number): RcpEvaluationDTO['concordanceLevel'] => {
        if (gap <= 1.0) return 'EXCELLENT';
        if (gap <= 2.0) return 'BON';
        if (gap <= 4.0) return 'MOYEN';
        return 'FAIBLE';
    };

    // ---- Export PDF ----
    const handleExportPdf = () => {
        const scoreTrainer = computedScoreTrainer();
        const gap = computedConcordanceGap();
        const concordance = getConcordanceLevel(gap);

        const payload: Partial<RcpEvaluationDTO> = {
            ...form,
            photoParticipant: photos.participant,
            photoCardiacPosition: photos.cardiac,
            photoAiScreenshot: photos.ai,
            scoreTrainer,
            concordanceGap: gap,
            concordanceLevel: concordance,
        };
        exportRcpToPdf(payload);
    };

    // ---- Submit ----
    const handleSubmit = async () => {
        if (!user?.committeeId) { msg.error('Comité introuvable.'); return; }
        if (!form.trainerName) { msg.error('Nom du formateur requis.'); return; }

        setLoading(true);
        const scoreTrainer = computedScoreTrainer();
        const gap = computedConcordanceGap();
        const concordance = getConcordanceLevel(gap);

        const payload: RcpEvaluationDTO = {
            ...form,
            committeeId: user.committeeId,
            trainerName: form.trainerName!,
            photoParticipant: photos.participant,
            photoCardiacPosition: photos.cardiac,
            photoAiScreenshot: photos.ai,
            scoreTrainer,
            concordanceGap: gap,
            concordanceLevel: concordance,
        };

        try {
            await rcpService.create(payload);
            msg.success('Évaluation soumise avec succès !');
            setSubmitted(true);
        } catch (e) {
            msg.error('Erreur lors de la soumission.');
        } finally {
            setLoading(false);
        }
    };

    const updateForm = (field: keyof RcpEvaluationDTO, value: any) =>
        setForm(prev => ({ ...prev, [field]: value }));

    const updateScore = (key: string, value: number) =>
        setForm(prev => ({ ...prev, scores: { ...(prev.scores || {}), [key]: value } }));

    const updateComment = (key: string, value: string) =>
        setForm(prev => ({ ...prev, comments: { ...(prev.comments || {}), [key]: value } }));

    const currentScore = computedScoreTrainer();
    const gap = computedConcordanceGap();
    const concordanceLevel = (getConcordanceLevel(gap) || 'EXCELLENT') as 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE';

    // Check access: only TRAINER type, RESP_SECOURISME role, or President/VP roles can fill this form.
    const roles = user?.roles || [];
    const isTrainer = user?.type === 'TRAINER';
    const isRespSecourisme = roles.some(r => r === 'RESP_SECOURISME');
    const isPresidentOrVP = roles.some(r => [
        'PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL',
        'VICE_PRESIDENT', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL',
        'ADMIN'
    ].includes(r));

    const canFillForm = isTrainer || isRespSecourisme || isPresidentOrVP;

    if (!canFillForm) {
        return (
            <div style={{ padding: '80px 24px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={glassCard}>
                    <div style={{ fontSize: 60, marginBottom: 20 }}>🚫</div>
                    <Title level={3} style={{ marginBottom: 12 }}>Accès Restreint</Title>
                    <Paragraph type="secondary" style={{ fontSize: 15, marginBottom: 28 }}>
                        Désolé, seuls les formateurs (Secourisme / RCP) et les responsables de comité habilités sont autorisés à remplir et soumettre les formulaires d'évaluation RCP.
                    </Paragraph>
                    <Button 
                        type="primary" 
                        size="large" 
                        icon={<ArrowLeftOutlined />} 
                        onClick={() => navigate('/secourisme')}
                        style={{ borderRadius: 12, background: '#ef4444', borderColor: '#ef4444' }}
                    >
                        Retour au Secourisme
                    </Button>
                </motion.div>
            </div>
        );
    }

    // ---- Submitted screen ----
    if (submitted) {
        return (
            <div style={{ padding: '40px 40px', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
                    <CheckCircleOutlined style={{ fontSize: 80, color: '#10b981', marginBottom: 24 }} />
                    <Title level={2} style={{ marginBottom: 12 }}>Évaluation soumise !</Title>
                    <Paragraph type="secondary" style={{ fontSize: 16, marginBottom: 32 }}>
                        L'évaluation RCP a été enregistrée et est maintenant visible par les responsables du comité.
                    </Paragraph>
                    <Space size={16} wrap style={{ justifyContent: 'center' }}>
                        <Button icon={<FilePdfOutlined />} size="large" onClick={handleExportPdf} style={{ borderRadius: 12 }}>
                            Télécharger PDF
                        </Button>
                        <Button type="primary" size="large" icon={<HeartOutlined />} onClick={() => { setSubmitted(false); setStep(0); setForm({ trainerName: user?.fullName || '', evaluationDate: new Date().toISOString().slice(0, 10), totalAttempts: 1, participantEmail: '', scores: {}, comments: {}, problemsEncountered: [], recommendations: { high: [], medium: [], low: [] } }); setPhotos({}); }} style={{ borderRadius: 12, background: '#ef4444', borderColor: '#ef4444' }}>
                            Nouvelle évaluation
                        </Button>
                    </Space>
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 24px 60px', maxWidth: 1000, margin: '0 auto' }} id="rcp-form-print">

            {/* ---- HEADER ---- */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                    <div style={{
                        width: 56, height: 56, borderRadius: 18,
                        background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 26, boxShadow: '0 12px 24px rgba(239,68,68,0.3)',
                    }}>
                        <HeartOutlined style={{ color: '#fff', fontSize: 26 }} />
                    </div>
                    <div>
                        <Title level={2} style={{ margin: 0, fontWeight: 800 }}>Évaluation IA-RCP</Title>
                        <Text type="secondary">Assistant Intelligent de Correction RCP en Temps Réel</Text>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                        <Button icon={<FilePdfOutlined />} onClick={handleExportPdf} style={{ borderRadius: 12, borderColor: '#ef4444', color: '#ef4444' }}>
                            Aperçu PDF
                        </Button>
                    </div>
                </div>

                {/* Steps */}
                <div style={{ ...glassCard, padding: 20, marginBottom: 0 }}>
                    <Steps
                        current={step}
                        size="small"
                        items={STEPS.map((s, i) => ({
                            title: s.title,
                            icon: <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: i <= step ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9'),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: i <= step ? '#fff' : '#9ca3af', fontSize: 14,
                            }}>{s.icon}</div>,
                        }))}
                        style={{ cursor: 'pointer' }}
                        onChange={setStep}
                    />
                </div>
            </motion.div>

            <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>

                    {/* ============================================================ */}
                    {/* STEP 0 — Informations du test                               */}
                    {/* ============================================================ */}
                    {step === 0 && (
                        <div style={glassCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                                </div>
                                <Title level={4} style={{ margin: 0 }}>Informations du test</Title>
                            </div>

                            <Row gutter={[20, 0]}>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Nom du formateur *</Text>
                                        <Input
                                            size="large" style={inputStyle}
                                            prefix={<UserOutlined style={{ color: '#ef4444' }} />}
                                            value={form.trainerName}
                                            onChange={e => updateForm('trainerName', e.target.value)}
                                            placeholder="Nom complet du formateur"
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Centre de formation</Text>
                                        <Input
                                            size="large" style={inputStyle}
                                            value={form.trainerCenter}
                                            onChange={e => updateForm('trainerCenter', e.target.value)}
                                            placeholder="Nom du centre"
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Date du test *</Text>
                                        <DatePicker
                                            size="large" style={{ width: '100%', borderRadius: 12 }}
                                            format="DD/MM/YYYY"
                                            defaultValue={dayjs()}
                                            onChange={d => updateForm('evaluationDate', d?.format('YYYY-MM-DD'))}
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Heure</Text>
                                        <DatePicker
                                            picker="time" format="HH:mm" size="large" style={{ width: '100%', borderRadius: 12 }}
                                            onChange={t => updateForm('evaluationTime', t?.format('HH:mm'))}
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Version de l'assistant IA</Text>
                                        <Input
                                            size="large" style={inputStyle}
                                            value={form.aiVersion}
                                            onChange={e => updateForm('aiVersion', e.target.value)}
                                            placeholder="Ex: v2.4.1"
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Nombre total d'essais</Text>
                                        <InputNumber
                                            size="large" min={1} max={20} style={{ width: '100%', borderRadius: 12 }}
                                            value={form.totalAttempts}
                                            onChange={v => updateForm('totalAttempts', v)}
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Nom du participant *</Text>
                                        <Input
                                            size="large" style={inputStyle}
                                            value={form.participantName}
                                            onChange={e => updateForm('participantName', e.target.value)}
                                            placeholder="Nom complet du participant"
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Email du participant</Text>
                                        <Input
                                            size="large" style={inputStyle}
                                            type="email"
                                            value={form.participantEmail}
                                            onChange={e => updateForm('participantEmail', e.target.value)}
                                            placeholder="Email du participant pour confirmation et remerciement"
                                        />
                                    </div>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={{ marginBottom: 20 }}>
                                        <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Niveau du participant</Text>
                                        <Select size="large" style={{ width: '100%' }} value={form.participantLevel} onChange={v => updateForm('participantLevel', v)} placeholder="Sélectionner le niveau">
                                            <Option value="DEBUTANT">Débutant</Option>
                                            <Option value="INTERMEDIAIRE">Intermédiaire</Option>
                                            <Option value="AVANCE">Avancé</Option>
                                            <Option value="PROFESSIONNEL">Professionnel de santé</Option>
                                        </Select>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* STEP 1 — Photos et preuves                                  */}
                    {/* ============================================================ */}
                    {step === 1 && (
                        <div style={glassCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CameraOutlined style={{ color: '#8b5cf6', fontSize: 18 }} />
                                </div>
                                <Title level={4} style={{ margin: 0 }}>Photos et preuves du test</Title>
                            </div>

                            <Row gutter={[20, 20]}>
                                <Col xs={24} sm={12}>
                                    <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                                        <CameraOutlined style={{ marginRight: 8 }} /> Photo du participant
                                    </Text>
                                    <PhotoUpload label="Photo du participant" value={photos.participant} onChange={v => setPhotos(p => ({ ...p, participant: v }))} isDark={isDark} />
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                                        <HeartOutlined style={{ marginRight: 8 }} /> Position de massage cardiaque
                                    </Text>
                                    <PhotoUpload label="Position des mains" value={photos.cardiac} onChange={v => setPhotos(p => ({ ...p, cardiac: v }))} isDark={isDark} />
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                                        <StarOutlined style={{ marginRight: 8 }} /> Capture d'écran des résultats IA
                                    </Text>
                                    <PhotoUpload label="Screenshot IA" value={photos.ai} onChange={v => setPhotos(p => ({ ...p, ai: v }))} isDark={isDark} />
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                                        <VideoCameraOutlined style={{ marginRight: 8 }} /> Lien vidéo du test (optionnel)
                                    </Text>
                                    <div style={{ ...glassCard, padding: 20, minHeight: 120, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                                        <Input
                                            size="large" style={inputStyle}
                                            prefix={<LinkOutlined />}
                                            placeholder="URL de la vidéo (YouTube, Drive...)"
                                            value={form.videoTestUrl}
                                            onChange={e => updateForm('videoTestUrl', e.target.value)}
                                        />
                                        <Text type="secondary" style={{ fontSize: 11 }}>Optionnel — Lien vers la vidéo d'enregistrement du test</Text>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* STEP 2 — Évaluation des performances par critère            */}
                    {/* ============================================================ */}
                    {step === 2 && (
                        <div>
                            {/* Progress overview */}
                            <div style={{ ...glassCard, padding: 20, marginBottom: 20 }}>
                                <Row gutter={[16, 8]} align="middle">
                                    <Col xs={24} md={12}>
                                        <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score moyen formateur</Text>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                            <Title level={2} style={{ margin: 0, color: SCORE_COLORS[Math.round(currentScore)] || '#ef4444' }}>{currentScore}/10</Title>
                                            <Text type="secondary">({Object.values(form.scores || {}).filter(v => v > 0).length}/{CRITERIA.length} critères évalués)</Text>
                                        </div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <Progress
                                            percent={Math.round((currentScore / 10) * 100)}
                                            strokeColor={{ '0%': '#ef4444', '50%': '#f59e0b', '100%': '#10b981' }}
                                            strokeWidth={10} style={{ borderRadius: 8 }}
                                            format={p => <Text strong>{p}%</Text>}
                                        />
                                    </Col>
                                </Row>
                            </div>

                            {/* Criteria cards */}
                            {CRITERIA.map((criterion, idx) => {
                                const score = form.scores?.[criterion.key];
                                return (
                                    <motion.div
                                        key={criterion.key}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        style={{ ...glassCard, marginBottom: 16, padding: 24,
                                            borderLeft: `4px solid ${score ? SCORE_COLORS[score] : (isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0')}`,
                                        }}
                                    >
                                        <Row gutter={[24, 16]} align="top">
                                            <Col xs={24} md={12}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                                    <div style={{
                                                        width: 32, height: 32, borderRadius: 10, background: score ? `${SCORE_COLORS[score]}20` : 'rgba(0,0,0,0.05)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13,
                                                        color: score ? SCORE_COLORS[score] : '#9ca3af',
                                                    }}>{idx + 1}</div>
                                                    <div>
                                                        <Text strong style={{ fontSize: 15 }}>{criterion.label}</Text>
                                                        {score && <Tag color={score >= 7 ? 'success' : score >= 5 ? 'warning' : 'error'} style={{ marginLeft: 8, borderRadius: 6 }}>{score}/10</Tag>}
                                                    </div>
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.6 }}>{criterion.desc}</Text>
                                            </Col>
                                            <Col xs={24} md={12}>
                                                <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>Score *</Text>
                                                <ScoreSelector value={score} onChange={v => updateScore(criterion.key, v)} />
                                                <TextArea
                                                    placeholder="Commentaire (optionnel)..."
                                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                                    style={{ borderRadius: 10, marginTop: 12, fontSize: 13 }}
                                                    value={form.comments?.[criterion.key]}
                                                    onChange={e => updateComment(criterion.key, e.target.value)}
                                                />
                                            </Col>
                                        </Row>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* STEP 3 — Problèmes rencontrés                              */}
                    {/* ============================================================ */}
                    {step === 3 && (
                        <div style={glassCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ExclamationCircleOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
                                </div>
                                <Title level={4} style={{ margin: 0 }}>Problèmes rencontrés</Title>
                            </div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                                Sélectionnez tous les problèmes observés lors de l'utilisation de l'assistant IA.
                            </Text>

                            <Row gutter={[16, 16]}>
                                {PROBLEMS_LIST.map(prob => {
                                    const isChecked = (form.problemsEncountered || []).includes(prob.value);
                                    return (
                                        <Col xs={24} sm={12} key={prob.value}>
                                            <div
                                                onClick={() => {
                                                    const current = form.problemsEncountered || [];
                                                    updateForm('problemsEncountered', isChecked
                                                        ? current.filter(v => v !== prob.value)
                                                        : [...current, prob.value]
                                                    );
                                                }}
                                                style={{
                                                    padding: '14px 18px',
                                                    borderRadius: 14,
                                                    border: `2px solid ${isChecked ? '#f59e0b' : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0')}`,
                                                    background: isChecked ? 'rgba(245,158,11,0.08)' : (isDark ? 'rgba(255,255,255,0.02)' : '#fff'),
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                }}
                                            >
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: 6,
                                                    border: `2px solid ${isChecked ? '#f59e0b' : '#d1d5db'}`,
                                                    background: isChecked ? '#f59e0b' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    {isChecked && <CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />}
                                                </div>
                                                <Text style={{ fontSize: 13 }}>{prob.label}</Text>
                                            </div>
                                        </Col>
                                    );
                                })}
                            </Row>

                            <div style={{ marginTop: 28 }}>
                                <Text strong style={{ display: 'block', marginBottom: 10 }}>Description détaillée des problèmes (optionnel)</Text>
                                <TextArea
                                    rows={4}
                                    style={{ borderRadius: 14 }}
                                    placeholder="Décrivez en détail les problèmes observés, les conditions du test, les améliorations suggérées..."
                                    value={form.problemDescription}
                                    onChange={e => updateForm('problemDescription', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* STEP 4 — Résultats et concordance                          */}
                    {/* ============================================================ */}
                    {step === 4 && (
                        <div>
                            {/* Scores comparison */}
                            <div style={glassCard}>
                                <Title level={4} style={{ marginBottom: 24 }}>Résultats de l'évaluation</Title>
                                <Row gutter={[24, 24]}>
                                    <Col xs={24} md={12}>
                                        <div style={{ padding: 20, borderRadius: 16, background: isDark ? 'rgba(59,130,246,0.05)' : '#eff6ff', border: '1px solid rgba(59,130,246,0.2)' }}>
                                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Score de l'IA</Text>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                                                <RobotOutlined style={{ fontSize: 32, color: '#3b82f6' }} />
                                                <div>
                                                    <InputNumber
                                                        min={0} max={10} step={0.1} size="large"
                                                        style={{ width: 100, borderRadius: 12, fontWeight: 800 }}
                                                        value={form.scoreIa}
                                                        onChange={v => updateForm('scoreIa', v)}
                                                        placeholder="0.0"
                                                    />
                                                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>Score donné par l'assistant IA (sur 10)</Text>
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col xs={24} md={12}>
                                        <div style={{ padding: 20, borderRadius: 16, background: isDark ? 'rgba(239,68,68,0.05)' : '#fef2f2', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Score Formateur (calculé)</Text>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                                                <UserOutlined style={{ fontSize: 32, color: '#ef4444' }} />
                                                <div>
                                                    <Title level={2} style={{ margin: 0, color: '#ef4444' }}>{currentScore}/10</Title>
                                                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>Moyenne des critères d'évaluation</Text>
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Concordance */}
                                {form.scoreIa !== undefined && currentScore > 0 && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 24, padding: 20, borderRadius: 16, background: `${CONCORDANCE_COLORS[concordanceLevel]}15`, border: `2px solid ${CONCORDANCE_COLORS[concordanceLevel]}40` }}>
                                        <Row gutter={16} align="middle">
                                            <Col xs={24} md={8}>
                                                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Écart IA / Formateur</Text>
                                                <Title level={3} style={{ margin: '4px 0 0', color: CONCORDANCE_COLORS[concordanceLevel] }}>{gap.toFixed(1)} pts</Title>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Text type="secondary" style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Niveau de concordance</Text>
                                                <div style={{ marginTop: 4 }}>
                                                    <Tag style={{ borderRadius: 10, padding: '4px 14px', fontWeight: 700, fontSize: 14, background: CONCORDANCE_COLORS[concordanceLevel], color: '#fff', border: 'none' }}>
                                                        {concordanceLevel}
                                                    </Tag>
                                                </div>
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Progress
                                                    type="circle" size={80}
                                                    percent={Math.round((1 - gap / 10) * 100)}
                                                    strokeColor={CONCORDANCE_COLORS[concordanceLevel]}
                                                    format={p => <Text strong style={{ fontSize: 13 }}>{p}%</Text>}
                                                />
                                            </Col>
                                        </Row>
                                    </motion.div>
                                )}
                            </div>

                            {/* Recommendations */}
                            <div style={glassCard}>
                                <Title level={4} style={{ marginBottom: 20 }}>Recommandations</Title>
                                {(['high', 'medium', 'low'] as const).map((level, idx) => {
                                    const labels = {
                                        high: { label: 'Priorité haute', color: '#ef4444', icon: <WarningOutlined style={{ color: '#ef4444' }} /> },
                                        medium: { label: 'Priorité moyenne', color: '#f59e0b', icon: <InfoCircleOutlined style={{ color: '#f59e0b' }} /> },
                                        low: { label: 'Priorité basse', color: '#10b981', icon: <CheckCircleOutlined style={{ color: '#10b981' }} /> }
                                    };
                                    const cfg = labels[level];
                                    return (
                                        <div key={level} style={{ marginBottom: 20 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                {cfg.icon}
                                                <Text strong style={{ color: cfg.color }}>{cfg.label}</Text>
                                            </div>
                                            <TextArea
                                                rows={2}
                                                style={{ borderRadius: 12 }}
                                                placeholder={`Recommandations de ${cfg.label.toLowerCase()} (une par ligne)`}
                                                value={((form.recommendations?.[level] as string[]) || []).join('\n')}
                                                onChange={e => updateForm('recommendations', {
                                                    ...form.recommendations,
                                                    [level]: e.target.value.split('\n').filter(Boolean)
                                                })}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ============================================================ */}
                    {/* STEP 5 — Décision du formateur + Signature                 */}
                    {/* ============================================================ */}
                    {step === 5 && (
                        <div>
                            <div style={glassCard}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
                                    </div>
                                    <Title level={4} style={{ margin: 0 }}>Décision finale du formateur</Title>
                                </div>

                                <Row gutter={[16, 16]}>
                                    {Object.entries(DECISION_CONFIGS).map(([key, cfg]) => {
                                        const isSelected = form.trainerDecision === key;
                                        return (
                                            <Col xs={24} sm={12} key={key}>
                                                <div
                                                    onClick={() => updateForm('trainerDecision', key)}
                                                    style={{
                                                        padding: '18px 20px',
                                                        borderRadius: 16,
                                                        border: `2px solid ${isSelected ? cfg.color : (isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0')}`,
                                                        background: isSelected ? `${cfg.color}10` : 'transparent',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.25s ease',
                                                        display: 'flex', alignItems: 'center', gap: 14,
                                                    }}
                                                >
                                                    <div style={{ fontSize: 22, color: cfg.color }}>{cfg.icon}</div>
                                                    <div>
                                                        <Text strong style={{ color: isSelected ? cfg.color : undefined, fontSize: 13 }}>{cfg.label}</Text>
                                                    </div>
                                                    {isSelected && <CheckCircleOutlined style={{ color: cfg.color, marginLeft: 'auto' }} />}
                                                </div>
                                            </Col>
                                        );
                                    })}
                                </Row>

                                <div style={{ marginTop: 28 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 10 }}>Commentaires finaux du formateur</Text>
                                    <TextArea
                                        rows={4}
                                        style={{ borderRadius: 14 }}
                                        placeholder="Observations finales, contexte, recommandations spécifiques..."
                                        value={form.trainerFinalComments}
                                        onChange={e => updateForm('trainerFinalComments', e.target.value)}
                                    />
                                </div>

                                <div style={{ marginTop: 20 }}>
                                    <Text strong style={{ display: 'block', marginBottom: 10 }}>Signature du formateur</Text>
                                    <Input
                                        size="large" style={inputStyle}
                                        prefix={<EditOutlined />}
                                        placeholder="Signature (nom + date)"
                                        value={form.trainerSignature}
                                        onChange={e => updateForm('trainerSignature', e.target.value)}
                                    />
                                    <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                                        Ex: Jean Dupont — 06/06/2026
                                    </Text>
                                </div>
                            </div>

                            {/* Summary card */}
                            <div style={{ ...glassCard, border: '2px solid rgba(239,68,68,0.2)', background: isDark ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.02)' }}>
                                <Title level={4} style={{ marginBottom: 20, color: '#ef4444' }}>
                                    <FileTextOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Récapitulatif
                                </Title>
                                <Row gutter={[16, 12]}>
                                    {[
                                        { label: 'Formateur', value: form.trainerName },
                                        { label: 'Participant', value: form.participantName || '—' },
                                        { label: 'Date', value: form.evaluationDate || '—' },
                                        { label: 'Niveau', value: form.participantLevel || '—' },
                                        { label: 'Score IA', value: form.scoreIa ? `${form.scoreIa}/10` : '—' },
                                        { label: 'Score Formateur', value: currentScore > 0 ? `${currentScore}/10` : '—' },
                                        { label: 'Concordance', value: concordanceLevel },
                                        { label: 'Problèmes', value: `${(form.problemsEncountered || []).length} signalés` },
                                    ].map(item => (
                                        <Col xs={12} md={6} key={item.label}>
                                            <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', display: 'block' }}>{item.label}</Text>
                                            <Text strong style={{ fontSize: 14 }}>{item.value}</Text>
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        </div>
                    )}

                </motion.div>
            </AnimatePresence>

            {/* ---- Navigation Footer ---- */}
            <div style={{ ...glassCard, marginTop: 8, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    disabled={step === 0}
                    onClick={() => setStep(s => s - 1)}
                    size="large"
                    style={{ borderRadius: 14, height: 48, padding: '0 28px' }}
                >
                    Précédent
                </Button>

                <div style={{ display: 'flex', gap: 8 }}>
                    {STEPS.map((_, i) => (
                        <div
                            key={i}
                            onClick={() => setStep(i)}
                            style={{
                                width: i === step ? 24 : 8,
                                height: 8,
                                borderRadius: 4,
                                background: i <= step ? '#ef4444' : (isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'),
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                        />
                    ))}
                </div>

                {step < STEPS.length - 1 ? (
                    <Button
                        type="primary"
                        icon={<ArrowRightOutlined />}
                        iconPosition="end"
                        onClick={() => setStep(s => s + 1)}
                        size="large"
                        style={{ borderRadius: 14, height: 48, padding: '0 28px', background: '#ef4444', borderColor: '#ef4444' }}
                    >
                        Suivant
                    </Button>
                ) : (
                    <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={loading}
                        onClick={handleSubmit}
                        size="large"
                        style={{ borderRadius: 14, height: 48, padding: '0 32px', background: '#10b981', borderColor: '#10b981', fontWeight: 700 }}
                    >
                        Soumettre l'évaluation
                    </Button>
                )}
            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    body { background: white !important; }
                    #rcp-form-print { padding: 20px !important; }
                    button, .ant-btn { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default RcpEvaluationFormPage;
