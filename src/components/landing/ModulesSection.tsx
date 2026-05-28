// ============================================================
// ServicesSection — Premium 2x2 grid, light+dark adaptive,
//                  with admin edit drawer (PRESIDENT / VP / NATIONAL)
// ============================================================

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores';

/* ═══════════════════ DATA TYPES ═══════════════════ */

interface Tag { label: string; color: 'red' | 'gray' | 'blue' }

interface ServiceCard {
    id: string;
    image: string;
    subtitle: string;
    title: string;
    desc: string;
    tags: Tag[];
}

/* ═══════════════════ DEFAULT CARDS ═══════════════════ */

const DEFAULT_CARDS: ServiceCard[] = [
    {
        id: 'secourisme',
        image: '/images/services/first-aid-training.png',
        subtitle: 'Programme de formation certifié',
        title: 'Formation Secourisme & RCP',
        desc: "Sessions de formation PSE1/PSE2 en premiers secours et réanimation cardio-pulmonaire, encadrées par des formateurs agréés. Certification reconnue avec suivi des compétences par notre système IA intégré Nexus-AID.",
        tags: [{ label: 'PSE1 / PSE2', color: 'red' }, { label: 'Certification', color: 'gray' }, { label: 'IA Assistée', color: 'blue' }],
    },
    {
        id: 'catastrophes',
        image: '/images/services/disaster-response.png',
        subtitle: 'Équipes NDRT/RDRT déployées',
        title: 'Intervention Catastrophes Naturelles',
        desc: "Coordination des opérations d'urgence lors de catastrophes naturelles — inondations, séismes, incendies. Déploiement rapide des équipes NDRT avec gestion centralisée via la salle de crise virtuelle Nexus-AID.",
        tags: [{ label: 'NDRT', color: 'red' }, { label: 'Urgence', color: 'gray' }, { label: 'Coordination', color: 'blue' }],
    },
    {
        id: 'sang',
        image: '/images/services/blood-donation.png',
        subtitle: 'Collectes régulières dans toute la Tunisie',
        title: 'Campagnes de Don de Sang',
        desc: "Organisation de campagnes de don de sang en partenariat avec les centres de transfusion sanguine. Suivi des stocks sanguins, planification des collectes et sensibilisation du public à l'importance du don de sang.",
        tags: [{ label: 'Don de Sang', color: 'red' }, { label: 'Santé Publique', color: 'gray' }, { label: 'National', color: 'gray' }],
    },
    {
        id: 'aide',
        image: '/images/services/community-support.png',
        subtitle: 'Soutien aux populations vulnérables',
        title: 'Aide Humanitaire & Sociale',
        desc: "Distribution de colis alimentaires, couvertures et produits de première nécessité aux familles en situation de précarité. Accompagnement social personnalisé et suivi des bénéficiaires via le système de gestion Nexus-AID.",
        tags: [{ label: 'Aide Sociale', color: 'red' }, { label: 'Distribution', color: 'gray' }, { label: 'Suivi', color: 'blue' }],
    },
];

const STORAGE_KEY = 'nexusaid_services_cards';
function loadCards(): ServiceCard[] {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch { /**/ }
    return DEFAULT_CARDS;
}
function saveCards(c: ServiceCard[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /**/ }
}

/* ── Check if user can edit ── */
function useCanEdit() {
    const user = useAuthStore((s) => s.user);
    if (!user) return false;
    
    // Accès complet pour l'administrateur global
    if (user.type === 'ADMIN' || user.role === 'admin' || (user.roles as string[])?.includes('ADMIN')) {
        return true;
    }
    
    const roles: string[] = (user.roles as string[]) ?? [];
    const rawRoles: { committeeType?: string; role?: string }[] = (user as any).rawRoles ?? [];
    return (
        roles.some(r => ['PRESIDENT', 'VICE_PRESIDENT'].includes(r)) ||
        rawRoles.some(r => ['NATIONAL', 'national'].includes(r.committeeType ?? ''))
    );
}

/* ── Tag Styles ── */
function tagStyle(color: Tag['color'], dark: boolean): React.CSSProperties {
    if (dark) {
        const map = {
            red:  { background: 'rgba(252,129,129,0.12)', color: '#FC8181', border: '1px solid rgba(252,129,129,0.22)' },
            gray: { background: 'rgba(255,255,255,0.06)',  color: '#A0AEC0', border: '1px solid #2D3142' },
            blue: { background: 'rgba(99,179,237,0.1)',    color: '#90CDF4', border: '1px solid rgba(99,179,237,0.2)' },
        };
        return map[color];
    }
    const map = {
        red:  { background: 'rgba(229,62,62,0.08)',   color: '#C53030', border: 'none' },
        gray: { background: 'rgba(113,128,150,0.08)', color: '#4A5568', border: 'none' },
        blue: { background: 'rgba(66,153,225,0.08)',  color: '#2B6CB0', border: 'none' },
    };
    return map[color];
}

/* ── Small Edit Field ── */
const EF: React.FC<{ label: string; value: string; onChange: (v: string) => void; multi?: boolean }> = ({ label, value, onChange, multi }) => (
    <div style={{ marginBottom: 9 }}>
        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</label>
        {multi
            ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid rgba(200,16,46,0.18)', fontSize: 12, color: '#1A1A2E', resize: 'vertical', fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }} />
            : <input value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid rgba(200,16,46,0.18)', fontSize: 12, color: '#1A1A2E', fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }} />
        }
    </div>
);

/* ═══════════════════ SINGLE CARD ═══════════════════ */

const Card: React.FC<{ card: ServiceCard; dark: boolean; index: number }> = ({ card, dark, index }) => {
    const { t } = useTranslation();
    const [hovered, setHovered] = useState(false);

    const cardBg = dark ? '#1E222F' : '#FFFFFF';
    const cardBorder = dark ? '1px solid #2D3142' : 'none';
    const cardShadow = dark
        ? (hovered ? '0 24px 56px rgba(0,0,0,0.4)' : 'none')
        : (hovered ? '0 20px 52px rgba(0,0,0,0.12), 0 4px 14px rgba(229,62,62,0.08)' : '0 4px 20px rgba(0,0,0,0.05)');
    const subtitleColor = dark ? '#FC8181' : '#E53E3E';
    const titleColor = dark ? '#FFFFFF' : '#1A202C';
    const descColor = dark ? '#A0AEC0' : '#718096';

    const isDefault = ['secourisme', 'catastrophes', 'sang', 'aide'].includes(card.id);
    const displaySubtitle = isDefault ? t(`home.services.${card.id}.subtitle`, card.subtitle) : card.subtitle;
    const displayTitle = isDefault ? t(`home.services.${card.id}.title`, card.title) : card.title;
    const displayDesc = isDefault ? t(`home.services.${card.id}.desc`, card.desc) : card.desc;
    const displayTags = card.tags.map((tag, tagIdx) => ({
        ...tag,
        label: isDefault ? t(`home.services.${card.id}.tags.${tagIdx}`, tag.label) : tag.label
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: cardBg,
                border: cardBorder,
                boxShadow: cardShadow,
                transform: hovered ? 'translateY(-6px)' : 'none',
                transition: 'all 0.38s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'pointer',
            }}
        >
            {/* ── Image ── */}
            <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/9', flexShrink: 0 }}>
                <img
                    src={card.image}
                    alt={displayTitle}
                    style={{
                        width: '100%', height: '100%',
                        objectFit: 'cover', display: 'block',
                        transform: hovered ? 'scale(1.07)' : 'scale(1)',
                        transition: 'transform 0.55s ease',
                    }}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/600x340/C8102E/fff?text=${encodeURIComponent(card.title)}`;
                    }}
                />
                {/* Dark gradient overlay */}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.45) 100%)', pointerEvents: 'none' }} />

                {/* SERVICE badge top-left */}
                <div
                    style={{
                        position: 'absolute', top: 12, left: 12,
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: '#E53E3E',
                        color: '#fff',
                        fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        padding: '4px 10px', borderRadius: 100,
                        boxShadow: '0 2px 10px rgba(229,62,62,0.5)',
                    }}
                >
                    {/* Shield icon */}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    SERVICE
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '20px 22px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Subtitle */}
                <div style={{ fontSize: 10.5, fontWeight: 700, color: subtitleColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>
                    {displaySubtitle}
                </div>

                {/* Title */}
                <h3 className="font-display" style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.28, color: titleColor, marginBottom: 10, letterSpacing: '-0.01em' }}>
                    {displayTitle}
                </h3>

                {/* Desc */}
                <p style={{ fontSize: 13, lineHeight: 1.68, color: descColor, flex: 1, marginBottom: 18, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {displayDesc}
                </p>

                {/* Tags — pushed to bottom */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {displayTags.map((t) => (
                        <span key={t.label} style={{ padding: '4px 11px', borderRadius: 100, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', ...tagStyle(t.color, dark) }}>
                            {t.label}
                        </span>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

/* ═══════════════════ MAIN SECTION ═══════════════════ */

const ServicesSection: React.FC = () => {
    const { t } = useTranslation();
    const canEdit = useCanEdit();
    const { themeMode } = useUIStore();
    const dark = themeMode === 'dark';

    const [cards, setCards] = useState<ServiceCard[]>(loadCards);
    const [editOpen, setEditOpen] = useState(false);
    const [editIdx, setEditIdx] = useState(0);
    const [draft, setDraft] = useState<ServiceCard[]>(loadCards);
    const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

    const setField = (idx: number, key: keyof ServiceCard) => (val: string) =>
        setDraft(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c));

    const setTagLabel = (cardIdx: number, tagIdx: number) => (val: string) =>
        setDraft(prev => prev.map((c, i) => {
            if (i !== cardIdx) return c;
            const tags = c.tags.map((t, ti) => ti === tagIdx ? { ...t, label: val } : t);
            return { ...c, tags };
        }));

    const handleSave = () => { setCards(draft); saveCards(draft); setEditOpen(false); };
    const handleCancel = () => { setDraft(cards); setEditOpen(false); };
    const handleReset = () => { setDraft(DEFAULT_CARDS); setCards(DEFAULT_CARDS); saveCards(DEFAULT_CARDS); };

    const handleImageUpload = (cardIdx: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setDraft(prev => prev.map((c, i) => i === cardIdx ? { ...c, image: url } : c));
    };

    const sectionBg = dark ? '#12141C' : '#F8F9FA';
    const headingColor = dark ? '#FFFFFF' : '#1A202C';
    const subheadingColor = dark ? '#A0AEC0' : '#718096';
    const accentColor = dark ? '#FC8181' : '#E53E3E';

    return (
        <section
            id="modules"
            className="services-section"
            style={{ padding: '96px 72px', position: 'relative', zIndex: 2, background: sectionBg, transition: 'background 0.4s ease' }}
        >
            {/* ── Admin Edit button ── */}
            {canEdit && (
                <button
                    onClick={() => { setDraft(cards); setEditOpen(true); }}
                    title={t('home.services.editButton', 'Modifier les services')}
                    style={{
                        position: 'absolute', top: 28, right: 28, zIndex: 10,
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 100,
                        border: '1.5px solid rgba(200,16,46,0.3)',
                        background: dark ? 'rgba(30,34,47,0.9)' : 'rgba(255,255,255,0.92)',
                        color: '#C8102E', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', backdropFilter: 'blur(10px)',
                        boxShadow: '0 2px 12px rgba(200,16,46,0.15)',
                        transition: 'all 0.25s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = dark ? 'rgba(30,34,47,0.9)' : 'rgba(255,255,255,0.92)'; e.currentTarget.style.color = '#C8102E'; }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    {t('home.services.editButton', 'Modifier les services')}
                </button>
            )}

            {/* ── Section Header ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6 }}
                style={{ marginBottom: 52 }}
            >
                <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14 }}>
                    {t('home.services.tag', 'Croissant-Rouge Tunisien')}
                </div>
                <h2 className="font-display" style={{ fontSize: 'clamp(30px, 3.8vw, 50px)', fontWeight: 800, lineHeight: 1.1, color: headingColor, marginBottom: 12, letterSpacing: '-0.02em' }}>
                    {t('home.services.title', 'Nos Services')}
                </h2>
                <p style={{ fontSize: 15.5, color: subheadingColor, maxWidth: 480, lineHeight: 1.65 }}>
                    {t('home.services.subtitle', 'Découvrez nos actions humanitaires et nos programmes de formation certifiés.')}
                </p>
            </motion.div>

            {/* ── 2×2 Cards Grid ── */}
            <div
                className="services-grid"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}
            >
                {cards.map((card, i) => (
                    <Card key={card.id} card={card} dark={dark} index={i} />
                ))}
            </div>

            {/* ══════ EDIT DRAWER ══════ */}
            <AnimatePresence>
                {editOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, backdropFilter: 'blur(4px)' }}
                            onClick={handleCancel}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 380, background: '#fff', zIndex: 301, boxShadow: '-8px 0 40px rgba(0,0,0,0.14)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            {/* Header */}
                            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>Modifier les Services</div>
                                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>Président / Vice-Président / Diffusion Nationale</div>
                                    </div>
                                </div>
                                <button onClick={handleCancel} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>✕</button>
                            </div>

                            {/* Card selector tabs */}
                            <div style={{ display: 'flex', gap: 4, padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)', overflowX: 'auto' }}>
                                {draft.map((c, i) => (
                                    <button key={c.id} onClick={() => setEditIdx(i)}
                                        style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.2s', background: editIdx === i ? '#C8102E' : 'rgba(0,0,0,0.06)', color: editIdx === i ? '#fff' : '#6B7280' }}>
                                        Service {i + 1}
                                    </button>
                                ))}
                            </div>

                            {/* Body — scrollable */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                                {/* Image upload */}
                                <div style={{ marginBottom: 14 }}>
                                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Image du service</label>
                                    <div
                                        style={{ width: '100%', height: 110, borderRadius: 10, border: '2px dashed rgba(200,16,46,0.25)', background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}
                                        onClick={() => fileRefs.current[editIdx]?.click()}
                                    >
                                        <img src={draft[editIdx].image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.55)' }}>
                                            <svg width="22" height="22" fill="none" stroke="#C8102E" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                            <span style={{ fontSize: 10, color: '#C8102E', fontWeight: 700, marginTop: 4 }}>Changer l'image</span>
                                        </div>
                                        <input ref={el => { fileRefs.current[editIdx] = el; }} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload(editIdx)} />
                                    </div>
                                </div>

                                <EF label="Sous-titre (catégorie)" value={draft[editIdx].subtitle} onChange={setField(editIdx, 'subtitle')} />
                                <EF label="Titre principal" value={draft[editIdx].title} onChange={setField(editIdx, 'title')} />
                                <EF label="Description" value={draft[editIdx].desc} onChange={setField(editIdx, 'desc')} multi />

                                <div style={{ fontSize: 10, fontWeight: 700, color: '#C8102E', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '12px 0 8px' }}>Tags (3 max)</div>
                                {draft[editIdx].tags.map((t, ti) => (
                                    <div key={ti} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                                        <input value={t.label} onChange={e => setTagLabel(editIdx, ti)(e.target.value)} style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid rgba(200,16,46,0.18)', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', color: '#1A1A2E' }} />
                                        <select
                                            value={t.color}
                                            onChange={e => setDraft(prev => prev.map((c, i) => {
                                                if (i !== editIdx) return c;
                                                const tags = c.tags.map((tg, tgi) => tgi === ti ? { ...tg, color: e.target.value as Tag['color'] } : tg);
                                                return { ...c, tags };
                                            }))}
                                            style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid rgba(200,16,46,0.18)', fontSize: 11, background: '#FAFAFA', color: '#1A1A2E', outline: 'none' }}
                                        >
                                            <option value="red">Rouge</option>
                                            <option value="gray">Gris</option>
                                            <option value="blue">Bleu</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', gap: 7 }}>
                                <button onClick={handleReset}
                                    style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 11, fontWeight: 500, color: '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C8102E'; e.currentTarget.style.color = '#C8102E'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = '#9CA3AF'; }}
                                >Réinit.</button>
                                <button onClick={handleCancel} style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>Annuler</button>
                                <button onClick={handleSave}
                                    style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: '#C8102E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 12px rgba(200,16,46,0.35)', transition: 'all 0.22s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#9B0B22'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#C8102E'; }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    {t('common.save', 'Enregistrer tout')}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Responsive ── */}
            <style>{`
                @media (max-width: 1024px) { .services-section { padding: 72px 40px !important; } }
                @media (max-width: 768px)  { .services-grid { grid-template-columns: 1fr !important; gap: 18px !important; } }
                @media (max-width: 640px)  { .services-section { padding: 56px 20px !important; } }
            `}</style>
        </section>
    );
};

export default ServicesSection;
