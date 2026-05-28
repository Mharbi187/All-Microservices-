// ============================================================
// HeroSection — Light CRT editorial hero with admin edit panel
// Roles: PRESIDENT / VICE_PRESIDENT / committee_type NATIONAL
// ============================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useState, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';

const Icon = ({ size = 20, children }: { size?: number; children: React.ReactNode }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {children}
    </svg>
);
const IconHeartbeat = () => <Icon size={22}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Icon>;
const IconAlertTriangle = () => <Icon size={22}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>;

/* ── Editable content state type ── */
interface HeroContent {
    headline1: string;
    headline2: string;
    headlineAccent: string;
    subtitle: string;
    ctaLabel: string;
    badge1Icon: string;
    badge1Title: string;
    badge1Sub: string;
    badge2Icon: string;
    badge2Title: string;
    badge2Sub: string;
    stat1n: string;
    stat1label: string;
    stat2n: string;
    stat2label: string;
    stat3n: string;
    stat3label: string;
    heroImage: string;
}

const DEFAULT_CONTENT: HeroContent = {
    headline1: 'Gérez Vos',
    headline2: 'Opérations',
    headlineAccent: 'Humanitaires',
    subtitle: 'Découvrez la plateforme intégrée Nexus-AID pour la gestion des dons, volontaires et interventions du Croissant-Rouge Tunisien.',
    ctaLabel: 'Voir nos modules',
    badge1Icon: 'heartbeat',
    badge1Title: 'Formation PSE1',
    badge1Sub: 'En cours • 3 équipes',
    badge2Icon: 'alert',
    badge2Title: '12 alertes actives',
    badge2Sub: 'Mise à jour en direct',
    stat1n: '2 841',
    stat1label: 'Volontaires actifs',
    stat2n: '24/7',
    stat2label: 'Disponibilité',
    stat3n: '89',
    stat3label: 'Comités actifs',
    heroImage: '/hero-volunteers.png',
};

/* ── Storage helpers (localStorage for persistence) ── */
const STORAGE_KEY = 'nexusaid_hero_content';
function loadContent(): HeroContent {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return { ...DEFAULT_CONTENT, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_CONTENT;
}
function saveContent(c: HeroContent) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

/* ── Check if user can edit hero ── */
function useCanEditHero() {
    const user = useAuthStore((s: any) => s.user);
    if (!user) return false;

    // Accès complet pour l'administrateur global
    if (user.type === 'ADMIN' || user.role === 'admin' || (user.roles as string[])?.includes('ADMIN')) {
        return true;
    }

    const roles: string[] = (user.roles as string[]) ?? [];
    const rawRoles: { committeeType?: string; role?: string }[] = (user as any).rawRoles ?? [];
    const isNationalRole = roles.some(r =>
        ['PRESIDENT', 'VICE_PRESIDENT'].includes(r)
    );
    const isNationalCommittee = rawRoles.some(r =>
        r.committeeType === 'NATIONAL' || r.committeeType === 'national'
    );
    const isDiffusionNational = rawRoles.some(r =>
        r.role === 'RESPONSABLE' && (r.committeeType === 'NATIONAL' || r.committeeType === 'national')
    );
    return isNationalRole || isNationalCommittee || isDiffusionNational;
}

/* ── Small labeled input ── */
const EditField: React.FC<{ label: string; value: string; onChange: (v: string) => void; multiline?: boolean }> = ({ label, value, onChange, multiline }) => (
    <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            {label}
        </label>
        {multiline ? (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid rgba(200,16,46,0.2)', fontSize: 12, color: '#1A1A2E', resize: 'vertical', fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }}
            />
        ) : (
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid rgba(200,16,46,0.2)', fontSize: 12, color: '#1A1A2E', fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }}
            />
        )}
    </div>
);

/* ═══════════════════════════════════════════════════════════ */

const HeroSection: React.FC = () => {
    const { t } = useTranslation();
    const canEdit = useCanEditHero();
    const { themeMode } = useUIStore();
    const dark = themeMode === 'dark';

    const [editOpen, setEditOpen] = useState(false);
    const [content, setContent] = useState<HeroContent>(loadContent);
    const [draft, setDraft] = useState<HeroContent>(loadContent);
    const fileRef = useRef<HTMLInputElement>(null);

    // Resolve translated labels if content matches the default French values
    const displayHeadline1 = content.headline1 === DEFAULT_CONTENT.headline1 ? t('home.hero.headline1', DEFAULT_CONTENT.headline1) : content.headline1;
    const displayHeadline2 = content.headline2 === DEFAULT_CONTENT.headline2 ? t('home.hero.headline2', DEFAULT_CONTENT.headline2) : content.headline2;
    const displayHeadlineAccent = content.headlineAccent === DEFAULT_CONTENT.headlineAccent ? t('home.hero.headlineAccent', DEFAULT_CONTENT.headlineAccent) : content.headlineAccent;
    const displaySubtitle = content.subtitle === DEFAULT_CONTENT.subtitle ? t('home.hero.subtitle', DEFAULT_CONTENT.subtitle) : content.subtitle;
    const displayCtaLabel = content.ctaLabel === DEFAULT_CONTENT.ctaLabel ? t('home.hero.ctaLabel', DEFAULT_CONTENT.ctaLabel) : content.ctaLabel;
    const displayBadge1Title = content.badge1Title === DEFAULT_CONTENT.badge1Title ? t('home.hero.badge1Title', DEFAULT_CONTENT.badge1Title) : content.badge1Title;
    const displayBadge1Sub = content.badge1Sub === DEFAULT_CONTENT.badge1Sub ? t('home.hero.badge1Sub', DEFAULT_CONTENT.badge1Sub) : content.badge1Sub;
    const displayBadge2Title = content.badge2Title === DEFAULT_CONTENT.badge2Title ? t('home.hero.badge2Title', DEFAULT_CONTENT.badge2Title) : content.badge2Title;
    const displayBadge2Sub = content.badge2Sub === DEFAULT_CONTENT.badge2Sub ? t('home.hero.badge2Sub', DEFAULT_CONTENT.badge2Sub) : content.badge2Sub;
    const displayStat1label = content.stat1label === DEFAULT_CONTENT.stat1label ? t('home.hero.stat1label', DEFAULT_CONTENT.stat1label) : content.stat1label;
    const displayStat2label = content.stat2label === DEFAULT_CONTENT.stat2label ? t('home.hero.stat2label', DEFAULT_CONTENT.stat2label) : content.stat2label;
    const displayStat3label = content.stat3label === DEFAULT_CONTENT.stat3label ? t('home.hero.stat3label', DEFAULT_CONTENT.stat3label) : content.stat3label;

    const setDraftField = (key: keyof HeroContent) => (val: string) =>
        setDraft((prev) => ({ ...prev, [key]: val }));

    const handleSave = () => {
        setContent(draft);
        saveContent(draft);
        setEditOpen(false);
    };

    const handleCancel = () => {
        setDraft(content);
        setEditOpen(false);
    };

    const handleReset = () => {
        setDraft(DEFAULT_CONTENT);
        setContent(DEFAULT_CONTENT);
        saveContent(DEFAULT_CONTENT);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setDraft((prev) => ({ ...prev, heroImage: url }));
    };

    return (
        <section
            style={{
                minHeight: '100vh',
                background: dark ? '#0F172A' : 'linear-gradient(135deg, #FDFAF7 0%, #FFF5F5 55%, #FDF0EC 100%)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                paddingTop: 80,
            }}
        >
            {/* ── TOP-LEFT: Hexagon + Crescent SVG decoration ── */}
            <div
                style={{
                    position: 'absolute',
                    top: 60,
                    left: 0,
                    width: 200,
                    height: 200,
                    pointerEvents: 'none',
                    zIndex: 1,
                    opacity: 0.9,
                }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" fill="none" width="100%">
                    <polygon points="20,75 45,30 95,30 120,75 95,120 45,120" stroke="#C8102E" strokeWidth="1" opacity="0.15" />
                    <line x1="20" y1="75" x2="0" y2="75" stroke="#C8102E" strokeWidth="1" opacity="0.2" />
                    <line x1="45" y1="30" x2="30" y2="5" stroke="#C8102E" strokeWidth="1" opacity="0.2" />
                    <circle cx="30" cy="5" r="3" fill="#C8102E" opacity="0.3" />
                    <path d="M65,55 C78,55 85,63 85,75 C85,87 75,95 65,95 C73,95 80,87 80,75 C80,63 73,55 65,55 Z" fill="#C8102E" opacity="0.2" />
                </svg>
            </div>

            {/* ── BOTTOM-RIGHT: Hexagons + medical crosses ── */}
            <svg
                aria-hidden
                style={{ position: 'absolute', bottom: 0, right: 0, width: 300, height: 300, opacity: 0.18, pointerEvents: 'none', zIndex: 1 }}
                viewBox="0 0 320 320" fill="none"
            >
                {[0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((col) => {
                    const x = col * 70 + (row % 2) * 35 + 20;
                    const y = row * 60 + 20;
                    return <polygon key={`${row}-${col}`} points={`${x},${y - 28} ${x + 24},${y - 14} ${x + 24},${y + 14} ${x},${y + 28} ${x - 24},${y + 14} ${x - 24},${y - 14}`} stroke="#C8102E" strokeWidth="1.2" fill="none" />;
                }))}
                <g fill="#C8102E" opacity="0.6">
                    <rect x="230" y="220" width="8" height="28" rx="2" /><rect x="220" y="230" width="28" height="8" rx="2" />
                    <rect x="270" y="245" width="6" height="22" rx="2" /><rect x="262" y="253" width="22" height="6" rx="2" />
                </g>
            </svg>

            {/* ── Wave decorations bottom ── */}
            <svg
                aria-hidden
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, width: '100%', pointerEvents: 'none', zIndex: 1 }}
                viewBox="0 0 1440 160" preserveAspectRatio="none"
            >
                <path d="M0,90 C200,25 400,145 600,80 C800,15 1000,130 1200,70 C1350,30 1440,80 1440,80 L1440,160 L0,160 Z" fill="rgba(200,16,46,0.05)" />
                <path d="M0,120 C150,55 350,165 550,100 C750,35 950,150 1150,90 C1320,50 1440,100 1440,100 L1440,160 L0,160 Z" fill="rgba(200,16,46,0.04)" />
            </svg>

            {/* ── Admin Edit button (only for authorised roles) ── */}
            {canEdit && (
                <button
                    onClick={() => { setDraft(content); setEditOpen(true); }}
                    title={t('home.hero.editButton', 'Modifier la page')}
                    style={{
                        position: 'absolute',
                        top: 96,
                        right: 24,
                        zIndex: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 100,
                        border: '1.5px solid rgba(200,16,46,0.3)',
                        background: 'rgba(255,255,255,0.92)',
                        color: '#C8102E',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 2px 12px rgba(200,16,46,0.15)',
                        letterSpacing: '0.04em',
                        transition: 'all 0.25s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.92)'; e.currentTarget.style.color = '#C8102E'; }}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {t('home.hero.editButton', 'Modifier la page')}
                </button>
            )}

            {/* ── Edit Panel (slide-in drawer) ── */}
            <AnimatePresence>
                {editOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, backdropFilter: 'blur(4px)' }}
                            onClick={handleCancel}
                        />
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            style={{
                                position: 'fixed',
                                top: 0, right: 0, bottom: 0,
                                width: 360,
                                background: '#fff',
                                zIndex: 201,
                                boxShadow: '-8px 0 40px rgba(0,0,0,0.14)',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                            }}
                        >
                            {/* Drawer header */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Modifier la page d'accueil</div>
                                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Président National / Vice-Président / Diffusion</div>
                                    </div>
                                </div>
                                <button onClick={handleCancel} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>✕</button>
                            </div>

                            {/* Drawer body — scrollable */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                                {/* Image upload */}
                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                                        Image hero
                                    </label>
                                    <div
                                        style={{
                                            width: '100%', height: 120, borderRadius: 12,
                                            border: '2px dashed rgba(200,16,46,0.25)',
                                            background: '#FAFAFA',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', overflow: 'hidden', position: 'relative',
                                        }}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        <img src={draft.heroImage} alt="hero preview" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)' }}>
                                            <svg width="24" height="24" fill="none" stroke="#C8102E" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            <span style={{ fontSize: 11, color: '#C8102E', fontWeight: 600, marginTop: 4 }}>Changer l'image</span>
                                        </div>
                                        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                                    </div>
                                </div>

                                {/* Section: Titre */}
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#C8102E', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, paddingTop: 4 }}>
                                    Titre principal
                                </div>
                                <EditField label="Ligne 1" value={draft.headline1} onChange={setDraftField('headline1')} />
                                <EditField label="Ligne 2" value={draft.headline2} onChange={setDraftField('headline2')} />
                                <EditField label="Ligne accent (rouge)" value={draft.headlineAccent} onChange={setDraftField('headlineAccent')} />
                                <EditField label="Sous-titre" value={draft.subtitle} onChange={setDraftField('subtitle')} multiline />
                                <EditField label="Texte bouton CTA" value={draft.ctaLabel} onChange={setDraftField('ctaLabel')} />

                                {/* Section: Badge 1 */}
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#C8102E', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '14px 0 10px' }}>
                                    Badge flottant 1
                                </div>
                                <EditField label="Icône (emoji)" value={draft.badge1Icon} onChange={setDraftField('badge1Icon')} />
                                <EditField label="Titre" value={draft.badge1Title} onChange={setDraftField('badge1Title')} />
                                <EditField label="Sous-titre" value={draft.badge1Sub} onChange={setDraftField('badge1Sub')} />

                                {/* Section: Badge 2 */}
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#C8102E', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '14px 0 10px' }}>
                                    Badge flottant 2
                                </div>
                                <EditField label="Icône (emoji)" value={draft.badge2Icon} onChange={setDraftField('badge2Icon')} />
                                <EditField label="Titre" value={draft.badge2Title} onChange={setDraftField('badge2Title')} />
                                <EditField label="Sous-titre" value={draft.badge2Sub} onChange={setDraftField('badge2Sub')} />

                                {/* Section: Stats */}
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#C8102E', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '14px 0 10px' }}>
                                    Statistiques
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <EditField label="Stat 1 — Valeur" value={draft.stat1n} onChange={setDraftField('stat1n')} />
                                    <EditField label="Stat 1 — Label" value={draft.stat1label} onChange={setDraftField('stat1label')} />
                                    <EditField label="Stat 2 — Valeur" value={draft.stat2n} onChange={setDraftField('stat2n')} />
                                    <EditField label="Stat 2 — Label" value={draft.stat2label} onChange={setDraftField('stat2label')} />
                                    <EditField label="Stat 3 — Valeur" value={draft.stat3n} onChange={setDraftField('stat3n')} />
                                    <EditField label="Stat 3 — Label" value={draft.stat3label} onChange={setDraftField('stat3label')} />
                                </div>
                            </div>

                            {/* Drawer footer */}
                            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 8 }}>
                                <button onClick={handleReset}
                                    style={{ padding: '9px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 12, fontWeight: 500, color: '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C8102E'; e.currentTarget.style.color = '#C8102E'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = '#9CA3AF'; }}
                                >
                                    Réinitialiser
                                </button>
                                <button onClick={handleCancel}
                                    style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
                                >
                                    Annuler
                                </button>
                                <button onClick={handleSave}
                                    style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: '#C8102E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 12px rgba(200,16,46,0.35)', transition: 'all 0.22s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#9B0B22'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#C8102E'; }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    {t('common.save', 'Enregistrer')}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ════════ MAIN CONTENT ════════ */}
            <div
                className="hero-content-grid"
                style={{
                    position: 'relative', zIndex: 2,
                    width: '100%', maxWidth: 1280,
                    margin: '0 auto',
                    padding: '40px 60px 100px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    alignItems: 'center',
                    gap: 64,
                }}
            >
                {/* ── LEFT: Text ── */}
                <div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.1 }}
                        className="font-display"
                        style={{ fontSize: 'clamp(34px, 4.2vw, 62px)', fontWeight: 900, lineHeight: 1.1, color: dark ? '#F8FAFC' : '#1A1A2E', marginBottom: 22, letterSpacing: '-0.02em' }}
                    >
                        {displayHeadline1}<br />
                        {displayHeadline2}<br />
                        <span style={{ color: '#C8102E' }}>{displayHeadlineAccent}</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.2 }}
                        style={{ fontSize: 15.5, lineHeight: 1.72, color: dark ? '#CBD5E1' : '#6B7280', maxWidth: 430, marginBottom: 36 }}
                    >
                        {displaySubtitle}
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.3 }}
                        style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}
                    >
                        <Link to="/register"
                            style={{ padding: '13px 30px', borderRadius: 100, background: '#C8102E', color: '#fff', fontSize: 14.5, fontWeight: 600, textDecoration: 'none', boxShadow: '0 5px 20px rgba(200,16,46,0.36)', transition: 'all 0.28s ease', display: 'inline-flex', alignItems: 'center', gap: 7 }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#9B0B22'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(200,16,46,0.48)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 5px 20px rgba(200,16,46,0.36)'; }}
                        >
                            {displayCtaLabel}
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                        </Link>
                        <a href="#modules"
                            onClick={(e) => { e.preventDefault(); document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' }); }}
                            style={{ padding: '12px 26px', borderRadius: 100, border: dark ? '1.5px solid rgba(255,255,255,0.18)' : '1.5px solid rgba(26,26,46,0.18)', background: 'transparent', color: dark ? '#F8FAFC' : '#374151', fontSize: 14.5, fontWeight: 500, textDecoration: 'none', transition: 'all 0.22s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C8102E'; e.currentTarget.style.color = '#C8102E'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.18)' : 'rgba(26,26,46,0.18)'; e.currentTarget.style.color = dark ? '#F8FAFC' : '#374151'; }}
                        >
                            {t('home.hero.secondaryCta', 'En savoir plus')}
                        </a>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.55 }}
                        style={{ marginTop: 40, display: 'flex', gap: 28, flexWrap: 'wrap' }}
                    >
                        {[
                            { n: content.stat1n, label: displayStat1label },
                            { n: content.stat2n, label: displayStat2label },
                            { n: content.stat3n, label: displayStat3label },
                        ].map((s, i) => (
                            <div key={i} style={{ textAlign: 'left' }}>
                                <div className="font-display" style={{ fontSize: 22, fontWeight: 700, color: '#C8102E', lineHeight: 1 }}>{s.n}</div>
                                <div style={{ fontSize: 11, color: dark ? '#94A3B8' : '#9CA3AF', marginTop: 4, letterSpacing: '0.04em' }}>{s.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* ── RIGHT: Photo + badges ── */}
                <motion.div
                    initial={{ opacity: 0, x: 36 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    style={{ position: 'relative' }}
                >
                    {/* Background blob */}
                    <div style={{ position: 'absolute', top: -20, right: -20, width: '92%', height: '92%', borderRadius: '50% 40% 58% 40% / 40% 50% 40% 58%', background: 'linear-gradient(135deg, rgba(200,16,46,0.09) 0%, rgba(200,16,46,0.03) 100%)', zIndex: 0 }} />

                    {/* Photo */}
                    <div style={{ position: 'relative', zIndex: 1, borderRadius: 26, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.13), 0 6px 18px rgba(200,16,46,0.1)' }}>
                        <img
                            src={content.heroImage}
                            alt={t('home.hero.heroImageAlt', 'Volontaires en formation PSE')}
                            style={{ width: '100%', height: 400, objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: 'linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 100%)' }} />
                    </div>

                    {/* Badge 1 — top left */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ position: 'absolute', top: 20, left: -26, zIndex: 4, background: dark ? '#1E293B' : '#fff', borderRadius: 16, padding: '12px 16px', boxShadow: dark ? '0 8px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.12)', border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(200,16,46,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(200,16,46,0.09)', color: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {content.badge1Icon === 'heartbeat' ? <IconHeartbeat /> : <IconAlertTriangle />}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#F8FAFC' : '#1A1A2E', whiteSpace: 'nowrap' }}>{displayBadge1Title}</div>
                            <div style={{ fontSize: 10, color: dark ? '#94A3B8' : '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap' }}>{displayBadge1Sub}</div>
                        </div>
                    </motion.div>

                    {/* Badge 2 — bottom right */}
                    <motion.div
                        animate={{ y: [0, -8, 0] }} transition={{ duration: 5, delay: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ position: 'absolute', bottom: 30, right: -22, zIndex: 4, background: dark ? '#1E293B' : '#fff', borderRadius: 16, padding: '12px 16px', boxShadow: dark ? '0 8px 30px rgba(0,0,0,0.4)' : '0 8px 30px rgba(0,0,0,0.12)', border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(200,16,46,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(200,16,46,0.09)', color: '#C8102E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {content.badge2Icon === 'alert' ? <IconAlertTriangle /> : <IconHeartbeat />}
                        </div>
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: dark ? '#F8FAFC' : '#1A1A2E', whiteSpace: 'nowrap' }}>{displayBadge2Title}</div>
                            <div style={{ fontSize: 10, color: dark ? '#94A3B8' : '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap' }}>{displayBadge2Sub}</div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* ── Responsive ── */}
            <style>{`
                @media (max-width: 1024px) {
                    .hero-content-grid { grid-template-columns: 1fr !important; padding: 40px 40px 120px !important; gap: 48px !important; }
                }
                @media (max-width: 640px) {
                    .hero-content-grid { padding: 28px 22px 120px !important; gap: 36px !important; }
                }
            `}</style>
        </section>
    );
};

export default HeroSection;
