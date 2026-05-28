// ============================================================
// NewsSection — Actualités & Publications du CRT
// Premium SaaS design: filter tabs, image cards, detail modal,
// admin create/validate workflow with role-based access
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores';
import newsService from '@/services/newsService';
import type { NewsItemDTO } from '@/services/newsService';

const Icon = ({ size = 20, children }: { size?: number; children: React.ReactNode }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {children}
    </svg>
);
const IconNews = ({ s = 14 }: { s?: number }) => <Icon size={s}><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="16" x2="12" y2="16"/></Icon>;
const IconScroll = ({ s = 14 }: { s?: number }) => <Icon size={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></Icon>;
const IconEdit = ({ s = 16 }: { s?: number }) => <Icon size={s}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>;
const IconInbox = ({ s = 40 }: { s?: number }) => <Icon size={s}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></Icon>;

/* ═══════════════════════════ TYPES ═══════════════════════════ */

type PubStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'published' | 'archived';
type PubType   = 'actualite' | 'publication';
type FilterKey = 'all' | PubType;

interface Tag { label: string; color: 'red' | 'gray' | 'blue' | 'orange' }

interface NewsItem {
    id: string;
    type: PubType;
    status: PubStatus;
    date: string;
    category: string;
    title: string;
    desc: string;
    fullText: string;
    images: string[];       // array of image URLs
    tags: Tag[];
    authorName: string;
    committeeId?: string;
    committeeType?: string;
}

/* ═════════════════════ DEFAULT DATA ═════════════════════════ */

const STORAGE_KEY = 'nexusaid_news_items';

const DEFAULT_ITEMS: NewsItem[] = [
    {
        id: 'caravane',
        type: 'publication',
        status: 'published',
        date: 'Mars 2024',
        category: 'Guide',
        title: 'Caravanes Médicales & Sanitaires',
        desc: 'Guide opérationnel des caravanes médicales mobiles du CRT offrant des consultations gratuites dans les zones rurales.',
        fullText: "Guide opérationnel des caravanes médicales mobiles du CRT offrant des consultations gratuites dans les zones rurales. Inclut les protocoles de déploiement d'urgence, la gestion du matériel médical certifié, et les rapports d'intervention terrain par des médecins généralistes et infirmiers. Ce document de 50 pages détaille également les stratégies de sensibilisation communautaire.",
        images: ['/images/news/caravane-medicale.png'],
        tags: [{ label: 'Santé', color: 'red' }, { label: 'Zones Rurales', color: 'gray' }, { label: 'Guide', color: 'blue' }],
        authorName: 'Direction Nationale CRT',
    },
    {
        id: 'jeunesse',
        type: 'publication',
        status: 'published',
        date: 'Janvier 2024',
        category: 'Rapport',
        title: 'Programme Jeunesse & Volontariat',
        desc: "Document détaillant les activités du programme jeunesse du CRT : camps de formation, actions de sensibilisation communautaire et engagement citoyen des jeunes volontaires à travers les 24 comités régionaux.",
        fullText: "Document complet détaillant les activités du programme jeunesse du CRT : camps de formation, actions de sensibilisation communautaire, campagnes de prévention et engagement citoyen des jeunes volontaires à travers les 24 comités régionaux. Inclut les résultats des évaluations et les perspectives 2025.",
        images: ['/images/news/jeunesse-volontariat.png'],
        tags: [{ label: 'Jeunesse', color: 'red' }, { label: 'Volontariat', color: 'gray' }, { label: 'Rapport 2024', color: 'blue' }],
        authorName: 'Secrétariat Général CRT',
    },
    {
        id: 'urgence-jendouba',
        type: 'actualite',
        status: 'published',
        date: '18 Fév 2026',
        category: 'Intervention',
        title: 'Opération Secours à Jendouba',
        desc: "Mobilisation réussie de 120 volontaires en moins de 2h grâce au système d'alerte précoce Nexus-AID lors des inondations.",
        fullText: "Suite aux fortes pluies qui ont touché la région de Jendouba, le CRT a mobilisé 120 volontaires en moins de 2 heures grâce au système d'alerte précoce Nexus-AID. Les équipes NDRT ont été déployées sur 8 zones sinistrées, assurant l'évacuation de 340 familles et la distribution de kits de première nécessité.",
        images: ['/images/news/intervention-urgence.png'],
        tags: [{ label: 'NDRT', color: 'red' }, { label: 'Urgence', color: 'orange' }, { label: 'Coordination', color: 'blue' }],
        authorName: 'Comité Régional Jendouba',
    },
    {
        id: 'don-sang-tunis',
        type: 'actualite',
        status: 'published',
        date: '22 Fév 2026',
        category: 'Campagne',
        title: 'Campagne Don de Sang — Tunis',
        desc: 'Grande campagne de collecte de sang organisée dans 12 points de la wilaya de Tunis. Objectif : 500 poches en 3 jours.',
        fullText: "Le CRT organise une grande campagne de collecte de sang dans 12 points de la wilaya de Tunis du 25 au 27 février 2026. Objectif : 500 poches en 3 jours. Des unités mobiles seront déployées dans les universités, centres commerciaux et places publiques. Chaque donneur reçoit un kit de sensibilisation et un certificat numérique via Nexus-AID.",
        images: ['/images/news/don-sang.png'],
        tags: [{ label: 'Don de Sang', color: 'red' }, { label: 'Santé Publique', color: 'gray' }, { label: 'National', color: 'blue' }],
        authorName: 'Comité de Tunis',
    },
];

function loadItems(): NewsItem[] {
    try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch { /**/ }
    return DEFAULT_ITEMS;
}
function saveItems(items: NewsItem[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /**/ }
}

/** Map API DTO → internal NewsItem */
function mapApiToItem(dto: NewsItemDTO): NewsItem {
    const statusMap: Record<string, PubStatus> = {
        PUBLIE: 'published', EN_ATTENTE: 'pending', REJETE: 'rejected',
    };
    return {
        id: dto.id,
        type: ['EVENT', 'URGENCE', 'COMMITTEE'].includes(dto.category ?? '') ? 'actualite' : 'publication',
        status: statusMap[dto.status] ?? 'pending',
        date: dto.publishedAt
            ? new Date(dto.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            : '',
        category: dto.category || 'Actualité',
        title: dto.title,
        desc: dto.summary || '',
        fullText: dto.content || '',
        images: dto.imageUrl ? [dto.imageUrl] : [],
        tags: (dto.tags ?? []).map(t => ({ label: t, color: 'gray' as const })),
        authorName: dto.authorName || 'CRT',
        committeeId: dto.committeeId,
        committeeType: dto.targetScope,
    };
}

/* ═════════════════════ ROLE HELPERS ════════════════════════ */

function useUserRoles() {
    const user = useAuthStore(s => s.user);
    if (!user) return { canCreate: false, canValidateNational: false, canValidateCommittee: false, canPublish: false, isAuth: false };

    const roles: string[] = (user.roles as string[]) ?? [];
    
    // Accès complet pour l'administrateur global
    if (user.type === 'ADMIN' || user.role === 'admin' || roles.includes('ADMIN' as any)) {
        return {
            isAuth: true,
            canCreate: true,
            canValidateNational: true,
            canValidateCommittee: true,
            canPublish: true,
            isPresidentNational: true,
            isVicePresidentNational: true,
            isSecretaireGeneral: true,
            isResponsableDiffusion: true,
            committeeId: (user as any).committeeId,
        };
    }

    const rawRoles: { committeeType?: string; role?: string; committeeId?: string }[] = (user as any).rawRoles ?? [];

    const isPresidentNational = roles.includes('PRESIDENT') &&
        rawRoles.some(r => ['NATIONAL', 'national'].includes(r.committeeType ?? ''));
    const isVicePresidentNational = roles.includes('VICE_PRESIDENT') &&
        rawRoles.some(r => ['NATIONAL', 'national'].includes(r.committeeType ?? ''));
    const isSecretaireGeneral = roles.includes('SECRETAIRE_GENERAL');
    const isResponsableDiffusion = rawRoles.some(r =>
        ['RESPONSABLE'].includes(r.role ?? '') &&
        ['NATIONAL', 'national', 'REGIONAL', 'regional'].includes(r.committeeType ?? '')
    );
    const isPresidentCommittee = roles.includes('PRESIDENT') && !isPresidentNational;
    const isAnyVolunteer = !!user;

    return {
        isAuth: true,
        canCreate: isAnyVolunteer,   // any authenticated user can create (draft)
        canValidateNational: isPresidentNational || isVicePresidentNational,
        canValidateCommittee: isPresidentCommittee || isPresidentNational || isVicePresidentNational,
        canPublish: isPresidentNational || isVicePresidentNational || isSecretaireGeneral || isResponsableDiffusion,
        isPresidentNational,
        isVicePresidentNational,
        isSecretaireGeneral,
        isResponsableDiffusion,
        committeeId: (user as any).committeeId,
    };
}

/* ═════════════════════ STATUS CONFIG ═══════════════════════ */

const STATUS_CFG: Record<PubStatus, { labelKey: string; color: string; bg: string; dot: string }> = {
    draft:     { labelKey: 'home.news.draft',          color: '#6B7280', bg: 'rgba(107,114,128,0.1)', dot: '#6B7280' },
    pending:   { labelKey: 'home.news.pendingStatus',   color: '#D97706', bg: 'rgba(217,119,6,0.12)',  dot: '#F59E0B' },
    approved:  { labelKey: 'home.news.approved',       color: '#059669', bg: 'rgba(5,150,105,0.1)',   dot: '#10B981' },
    rejected:  { labelKey: 'home.news.rejected',       color: '#DC2626', bg: 'rgba(220,38,38,0.1)',   dot: '#EF4444' },
    published: { labelKey: 'home.news.published',      color: '#2563EB', bg: 'rgba(37,99,235,0.1)',   dot: '#3B82F6' },
    archived:  { labelKey: 'home.news.archived',       color: '#374151', bg: 'rgba(55,65,81,0.1)',    dot: '#9CA3AF' },
};

/* ═════════════════════ TAG STYLE ════════════════════════════ */

function tagCss(color: Tag['color'], dark: boolean): React.CSSProperties {
    if (dark) return {
        red:    { background: 'rgba(239,68,68,0.15)',   color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.25)' },
        gray:   { background: 'rgba(255,255,255,0.07)', color: '#A1A1AA', border: '1px solid rgba(255,255,255,0.08)' },
        blue:   { background: 'rgba(99,179,237,0.12)',  color: '#93C5FD', border: '1px solid rgba(99,179,237,0.22)' },
        orange: { background: 'rgba(251,146,60,0.12)',  color: '#FDB76F', border: '1px solid rgba(251,146,60,0.22)' },
    }[color];
    return {
        red:    { background: 'rgba(220,38,38,0.08)',   color: '#B91C1C', border: 'none' },
        gray:   { background: 'rgba(107,114,128,0.08)', color: '#4B5563', border: 'none' },
        blue:   { background: 'rgba(37,99,235,0.08)',   color: '#1D4ED8', border: 'none' },
        orange: { background: 'rgba(234,88,12,0.08)',   color: '#C2410C', border: 'none' },
    }[color];
}

/* ═════════════════════ COMPONENTS ══════════════════════════ */

// Status pill
const StatusPill: React.FC<{ status: PubStatus }> = ({ status }) => {
    const { t } = useTranslation();
    const cfg = STATUS_CFG[status];
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', background: cfg.bg, color: cfg.color }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
            {t(cfg.labelKey)}
        </span>
    );
};

// Image carousel for modal
const ImageCarousel: React.FC<{ images: string[]; title: string }> = ({ images, title }) => {
    const [idx, setIdx] = useState(0);
    if (!images.length) return null;
    return (
        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            <AnimatePresence mode="wait">
                <motion.img
                    key={idx}
                    src={images[idx]}
                    alt={title}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                    style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/800x400/C8102E/fff?text=${encodeURIComponent(title)}`; }}
                />
            </AnimatePresence>
            {images.length > 1 && (
                <>
                    <button onClick={() => setIdx(i => (i - 1 + images.length) % images.length)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>‹</button>
                    <button onClick={() => setIdx(i => (i + 1) % images.length)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>›</button>
                    <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                        {images.map((_, i) => (
                            <button key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, background: i === idx ? '#fff' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

/* ═════════════════════ CREATE/EDIT FORM ════════════════════ */

const EMPTY_ITEM: Partial<NewsItem> = {
    type: 'actualite', status: 'draft', category: '', title: '', desc: '', fullText: '',
    images: [], tags: [], date: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
};

const CreateForm: React.FC<{
    dark: boolean;
    onClose: () => void;
    onSave: (item: NewsItem) => void;
    initial?: NewsItem;
    roles: ReturnType<typeof useUserRoles>;
}> = ({ dark, onClose, onSave, initial, roles }) => {
    const { t } = useTranslation();
    const [form, setForm] = useState<Partial<NewsItem>>(initial ?? { ...EMPTY_ITEM });
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const bg = dark ? '#1E1E22' : '#fff';
    const fg = dark ? '#F4F4F5' : '#1F2937';
    const sub = dark ? '#A1A1AA' : '#4B5563';
    const border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';
    const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 10, border: dark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(200,16,46,0.15)', background: dark ? 'rgba(255,255,255,0.04)' : '#FAFAFA', color: fg, fontSize: 13, fontFamily: 'inherit', outline: 'none' };

    const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setForm(f => ({ ...f, images: [...(f.images ?? []), url] }));
    };

    const addTag = () => {
        if (!tagInput.trim()) return;
        setForm(f => ({ ...f, tags: [...(f.tags ?? []), { label: tagInput.trim(), color: 'gray' as const }] }));
        setTagInput('');
    };

    const removeTag = (i: number) => setForm(f => ({ ...f, tags: (f.tags ?? []).filter((_, ti) => ti !== i) }));

    const submit = (status: PubStatus) => {
        if (!form.title?.trim() || !form.desc?.trim()) return;
        const item: NewsItem = {
            id: initial?.id ?? `item-${Date.now()}`,
            type: form.type ?? 'actualite',
            status,
            date: form.date ?? '',
            category: form.category ?? 'Actualité',
            title: form.title ?? '',
            desc: form.desc ?? '',
            fullText: form.fullText ?? form.desc ?? '',
            images: form.images ?? [],
            tags: form.tags ?? [],
            authorName: form.authorName ?? 'CRT',
        };
        onSave(item);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                style={{ position: 'relative', zIndex: 1, background: bg, borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,0.3)', border }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <IconEdit s={18} />
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: fg }}>
                                {initial ? t('home.news.editPublish', 'Modifier la publication') : t('home.news.newPublish', 'Nouvelle publication')}
                            </div>
                            <div style={{ fontSize: 11, color: sub, marginTop: 2 }}>Les publications nécessitent une validation avant publication.</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer', fontSize: 15, color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* Type */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    {(['actualite', 'publication'] as PubType[]).map(t => (
                        <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                            style={{ flex: 1, padding: '8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s', background: form.type === t ? '#C8102E' : (dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'), color: form.type === t ? '#fff' : sub, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            {t === 'actualite' ? <><IconNews s={14}/> Actualité</> : <><IconScroll s={14}/> Publication</>}
                        </button>
                    ))}
                </div>

                {/* Fields */}
                {[
                    { label: 'Titre *', key: 'title' as const },
                    { label: 'Catégorie', key: 'category' as const },
                    { label: 'Date', key: 'date' as const },
                    { label: 'Auteur / Comité', key: 'authorName' as const },
                ].map(({ label, key }) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                        <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: sub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</label>
                        <input value={(form as any)[key] ?? ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inputStyle} />
                    </div>
                ))}

                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: sub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Description courte *</label>
                    <textarea value={form.desc ?? ''} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
                <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: sub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Contenu complet</label>
                    <textarea value={form.fullText ?? ''} onChange={e => setForm(f => ({ ...f, fullText: e.target.value }))} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                {/* Tags */}
                <div style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: sub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Tags</label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                        {form.tags?.map((t, i) => (
                            <span key={i} style={{ padding: '3px 10px 3px 8px', borderRadius: 100, fontSize: 11, fontWeight: 600, background: 'rgba(200,16,46,0.1)', color: '#C8102E', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                {t.label}
                                <button onClick={() => removeTag(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C8102E', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                            </span>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Ajouter un tag..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={addTag} style={{ padding: '8px 14px', borderRadius: 10, background: '#C8102E', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+</button>
                    </div>
                </div>

                {/* Image upload */}
                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: sub, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Images</label>
                    {form.images?.length ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            {form.images.map((img, i) => (
                                <div key={i} style={{ position: 'relative' }}>
                                    <img src={img} alt="" style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                                    <button onClick={() => setForm(f => ({ ...f, images: f.images?.filter((_, ii) => ii !== i) }))} style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: '#C8102E', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                </div>
                            ))}
                        </div>
                    ) : null}
                    <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: '10px', borderRadius: 10, border: `2px dashed ${dark ? 'rgba(200,16,46,0.3)' : 'rgba(200,16,46,0.2)'}`, background: 'transparent', color: '#C8102E', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Ajouter une image
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImg} />
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => submit('draft')} style={{ flex: 1, padding: '10px', borderRadius: 12, border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 13, fontWeight: 500, color: sub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2v-5H4v5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                        {t('home.news.saveDraft', 'Enregistrer brouillon')}
                    </button>
                    <button onClick={() => submit('pending')} style={{ flex: 2, padding: '10px', borderRadius: 12, border: 'none', background: '#C8102E', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(200,16,46,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                        {t('home.news.submitValidation', 'Soumettre pour validation')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ═════════════════════ DETAIL MODAL ════════════════════════ */

const DetailModal: React.FC<{
    item: NewsItem;
    dark: boolean;
    onClose: () => void;
    onStatusChange: (id: string, status: PubStatus) => void;
    roles: ReturnType<typeof useUserRoles>;
}> = ({ item, dark, onClose, onStatusChange, roles }) => {
    const { t } = useTranslation();
    const bg = dark ? '#1E1E22' : '#FFFFFF';
    const fg = dark ? '#F4F4F5' : '#1F2937';
    const sub = dark ? '#A1A1AA' : '#4B5563';
    const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    const isDefault = ['caravane', 'jeunesse', 'urgence-jendouba', 'don-sang-tunis'].includes(item.id);
    const displayCategory = isDefault ? t(`home.news.${item.id}.category`, item.category) : item.category;
    const displayTitle = isDefault ? t(`home.news.${item.id}.title`, item.title) : item.title;
    const displayDesc = isDefault ? t(`home.news.${item.id}.desc`, item.desc) : item.desc;
    const displayFullText = isDefault ? t(`home.news.${item.id}.fullText`, item.fullText) : item.fullText;
    const displayTags = item.tags.map((tag, tagIdx) => ({
        ...tag,
        label: isDefault ? t(`home.news.${item.id}.tags.${tagIdx}`, tag.label) : tag.label
    }));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
            {/* Backdrop */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

            <motion.div
                initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 24 }}
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                style={{ position: 'relative', zIndex: 1, background: bg, borderRadius: 22, width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 40px 100px rgba(0,0,0,0.35)', border: `1px solid ${border}` }}
            >
                {/* Header */}
                <div style={{ padding: '22px 26px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
                            <StatusPill status={item.status} />
                            <span style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(200,16,46,0.1)', color: '#C8102E' }}>{displayCategory}</span>
                            <span style={{ fontSize: 11, color: sub }}>{item.date}</span>
                        </div>
                        <h2 className="font-display" style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1.2, color: fg, marginBottom: 10 }}>
                            {displayTitle}
                        </h2>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                            {displayTags.map(t => (
                                <span key={t.label} style={{ padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', ...tagCss(t.color, dark) }}>{t.label}</span>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', fontSize: 16, color: sub, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {/* Image carousel */}
                <div style={{ padding: '0 26px' }}>
                    <ImageCarousel images={item.images} title={displayTitle} />
                </div>

                {/* Full text */}
                <div style={{ padding: '0 26px 6px' }}>
                    <p style={{ fontSize: 14.5, lineHeight: 1.78, color: sub }}>{displayFullText || displayDesc}</p>
                    <div style={{ marginTop: 14, fontSize: 11, color: sub, fontStyle: 'italic' }}>
                        {t('home.news.publishedBy', 'Publié par :')} <strong style={{ color: fg }}>{item.authorName}</strong>
                    </div>
                </div>

                {/* Admin validation row */}
                {(roles.canValidateNational || roles.canValidateCommittee) && item.status === 'pending' && (
                    <div style={{ margin: '16px 26px', padding: '14px 16px', borderRadius: 14, background: dark ? 'rgba(255,255,255,0.04)' : '#FFF8F8', border: `1px solid ${border}` }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C8102E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            </svg>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#C8102E' }}>{t('home.news.validationAction', 'Action de validation')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => onStatusChange(item.id, 'rejected')}
                                style={{ flex: 1, padding: '9px', borderRadius: 10, border: '1.5px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                {t('home.news.reject', 'Refuser')}
                            </button>
                            <button onClick={() => onStatusChange(item.id, roles.canValidateNational ? 'published' : 'approved')}
                                style={{ flex: 2, padding: '9px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 12px rgba(5,150,105,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                {roles.canValidateNational ? t('home.news.approvePublish', 'Approuver & Publier') : t('home.news.approve', 'Approuver')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Archive option for president national */}
                {roles.canValidateNational && item.status === 'published' && (
                    <div style={{ margin: '0 26px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => onStatusChange(item.id, 'archived')}
                            style={{ padding: '6px 14px', borderRadius: 100, border: `1px solid ${border}`, background: 'transparent', fontSize: 11, color: sub, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                            {t('home.news.archive', 'Archiver')}
                        </button>
                    </div>
                )}

                {/* Footer actions */}
                <div style={{ padding: '14px 26px 22px', display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: `1px solid ${border}` }}>
                    <button onClick={onClose}
                        style={{ padding: '10px 22px', borderRadius: 100, border: `1.5px solid ${border}`, background: 'transparent', fontSize: 14, fontWeight: 500, color: sub, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#C8102E'; e.currentTarget.style.color = '#C8102E'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = sub; }}
                    >
                        {t('home.news.close', 'Fermer')}
                    </button>
                    <button
                        style={{ padding: '10px 28px', borderRadius: 100, border: 'none', background: '#C8102E', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 16px rgba(200,16,46,0.36)', transition: 'all 0.25s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#9B0B22'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.transform = 'none'; }}
                    >
                        {t('home.news.readFull', "Lire l'article complet")} →
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ═════════════════════ NEWS CARD ════════════════════════════ */

const NewsCard: React.FC<{
    item: NewsItem;
    dark: boolean;
    onClick: () => void;
    showStatus: boolean;
}> = ({ item, dark, onClick, showStatus }) => {
    const { t } = useTranslation();
    const [hovered, setHovered] = useState(false);
    const cardBg = dark ? '#1E1E22' : '#FFFFFF';
    const fg = dark ? '#F4F4F5' : '#1F2937';
    const sub = dark ? '#A1A1AA' : '#4B5563';

    const isDefault = ['caravane', 'jeunesse', 'urgence-jendouba', 'don-sang-tunis'].includes(item.id);
    const displayCategory = isDefault ? t(`home.news.${item.id}.category`, item.category) : item.category;
    const displayTitle = isDefault ? t(`home.news.${item.id}.title`, item.title) : item.title;
    const displayDesc = isDefault ? t(`home.news.${item.id}.desc`, item.desc) : item.desc;
    const displayTags = item.tags.map((tag, tagIdx) => ({
        ...tag,
        label: isDefault ? t(`home.news.${item.id}.tags.${tagIdx}`, tag.label) : tag.label
    }));

    return (
        <motion.article
            layout
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.42 }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            style={{
                borderRadius: 20,
                background: cardBg,
                border: dark ? '1px solid rgba(255,255,255,0.07)' : 'none',
                boxShadow: dark
                    ? hovered ? '0 20px 50px rgba(0,0,0,0.4)' : 'none'
                    : hovered ? '0 20px 50px rgba(0,0,0,0.1), 0 4px 12px rgba(200,16,46,0.07)' : '0 2px 16px rgba(0,0,0,0.05)',
                transform: hovered ? 'translateY(-5px)' : 'none',
                transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'pointer',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Image */}
            {item.images[0] && (
                <div style={{ position: 'relative', overflow: 'hidden', height: 200, flexShrink: 0 }}>
                    <img
                        src={item.images[0]}
                        alt={displayTitle}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hovered ? 'scale(1.06)' : 'scale(1)', transition: 'transform 0.55s ease' }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.5) 100%)' }} />
                    {/* Type badge */}
                    <div style={{ position: 'absolute', top: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 100, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: item.type === 'publication' ? 'rgba(37,99,235,0.85)' : 'rgba(200,16,46,0.85)', color: '#fff', backdropFilter: 'blur(8px)' }}>
                        {item.type === 'publication' ? <IconScroll s={10}/> : <IconNews s={10}/>} {item.type === 'publication' ? 'Publication' : 'Actualité'}
                    </div>
                    {showStatus && (
                        <div style={{ position: 'absolute', top: 12, left: 12 }}>
                            <StatusPill status={item.status} />
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, color: sub }}>{item.date}</span>
                    <span style={{ padding: '2px 9px', borderRadius: 100, fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>{displayCategory}</span>
                    {!item.images[0] && showStatus && <StatusPill status={item.status} />}
                </div>

                <h3 className="font-display" style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, color: fg, marginBottom: 8, letterSpacing: '-0.01em' }}>
                    {displayTitle}
                </h3>

                <p style={{ fontSize: 13, lineHeight: 1.65, color: sub, flex: 1, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {displayDesc}
                </p>

                {/* Tags */}
                <div style={{ marginTop: 'auto', display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
                    {displayTags.map(t => (
                        <span key={t.label} style={{ padding: '3px 9px', borderRadius: 100, fontSize: 9.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', ...tagCss(t.color, dark) }}>{t.label}</span>
                    ))}
                </div>

                {/* Read link */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: '#C8102E', transition: 'gap 0.25s' }}>
                    {item.type === 'publication' ? t('home.news.viewPub', 'Voir la publication') : t('home.news.readMore', 'Lire la suite')}
                    <span style={{ transform: hovered ? 'translateX(4px)' : 'none', transition: 'transform 0.25s', display: 'inline-block' }}>→</span>
                </div>
            </div>
        </motion.article>
    );
};

/* ═════════════════════ MAIN SECTION ════════════════════════ */

const NewsSection: React.FC = () => {
    const { t } = useTranslation();
    const roles = useUserRoles();
    const { themeMode } = useUIStore();
    const dark = themeMode === 'dark';
    const user = useAuthStore(s => s.user);

    const [items, setItems] = useState<NewsItem[]>([]);
    const [apiLoading, setApiLoading] = useState(true);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [selected, setSelected] = useState<NewsItem | null>(null);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<NewsItem | null>(null);

    // Load news from real API — public or authenticated
    const loadNews = async () => {
        setApiLoading(true);
        try {
            let data: NewsItemDTO[];
            if (roles.isAuth) {
                // Authenticated: see news filtered by scope
                data = await newsService.getAll({ committeeId: (user as any)?.committeeId });
            } else {
                // Public: only PUBLIE news
                data = await newsService.getPublicNews();
            }
            if (data.length > 0) {
                setItems(data.map(mapApiToItem));
            } else {
                // Fallback to static items if DB is empty
                setItems(loadItems());
            }
        } catch {
            // Network error — fallback to localStorage/static
            setItems(loadItems());
        } finally {
            setApiLoading(false);
        }
    };

    useEffect(() => { loadNews(); }, [roles.isAuth]);

    // Only show published items to public; show all to admins/officials
    const visibleItems = items.filter(it => {
        if (roles.canValidateNational || roles.canValidateCommittee || roles.canPublish) return true;
        return it.status === 'published';
    });
    const filtered = filter === 'all' ? visibleItems : visibleItems.filter(it => it.type === filter);
    const pendingCount = items.filter(it => it.status === 'pending').length;

    const handleSave = async (item: NewsItem) => {
        try {
            if (item.id.startsWith('item-')) {
                // New item — submit to backend API
                const created = await newsService.createNews({
                    title: item.title,
                    summary: item.desc,
                    content: item.fullText || item.desc,
                    category: item.category?.toUpperCase().replace(/ /g, '_') || 'COMMITTEE',
                    imageUrl: item.images?.[0],
                    committeeId: (user as any)?.committeeId,
                    targetScope: 'LOCAL',
                });
                setItems(prev => [mapApiToItem(created), ...prev]);
            }
        } catch {
            // Fallback to localStorage only
            setItems(prev => {
                const idx = prev.findIndex(i => i.id === item.id);
                const next = idx >= 0 ? prev.map((i, ii) => ii === idx ? item : i) : [item, ...prev];
                saveItems(next);
                return next;
            });
        }
        setCreating(false);
        setEditing(null);
    };

    const handleStatusChange = async (id: string, status: PubStatus) => {
        // Map internal status → API status
        const apiStatusMap: Record<PubStatus, string> = {
            published: 'PUBLIE', rejected: 'REJETE', pending: 'EN_ATTENTE',
            approved: 'PUBLIE', draft: 'EN_ATTENTE', archived: 'REJETE',
        };
        const apiStatus = apiStatusMap[status];
        try {
            await newsService.updateStatus(id, apiStatus as any);
            // Refresh list from server
            await loadNews();
        } catch {
            // Fallback local update
            setItems(prev => {
                const next = prev.map(it => it.id === id ? { ...it, status } : it);
                saveItems(next);
                return next;
            });
        }
        setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
    };

    const sectionBg = dark ? '#121214' : '#F9FAFB';
    const fg = dark ? '#F4F4F5' : '#1F2937';
    const sub = dark ? '#A1A1AA' : '#4B5563';
    const accentColor = dark ? '#EF4444' : '#D32F2F';

    return (
        <section
            id="news"
            className="news-section"
            style={{ padding: '96px 72px', position: 'relative', zIndex: 2, background: sectionBg, transition: 'background 0.4s ease' }}
        >
            {/* ── Section Header ── */}
            <div className="news-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 52 }}>
                <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14 }}>
                        {t('home.news.tag', 'Actualités & Publications')}
                    </div>
                    <h2 className="font-display" style={{ fontSize: 'clamp(30px, 4vw, 52px)', fontWeight: 800, lineHeight: 1.1, color: fg, letterSpacing: '-0.02em', marginBottom: 10 }}>
                        {t('home.news.title', 'Dernières Nouvelles')}
                    </h2>
                    <p style={{ fontSize: 15.5, color: sub, maxWidth: 440, lineHeight: 1.65 }}>
                        {t('home.news.subtitle', 'Suivez nos actualités, mises à jour et publications officielles.')}
                    </p>
                </motion.div>

                <div className="news-controls" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end' }}>
                    {/* Filter pills */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[
                            { key: 'all' as FilterKey, label: t('home.news.filterAll', 'Tous'), icon: null },
                            { key: 'actualite' as FilterKey, label: t('home.news.filterNews', 'Actualités'), icon: <IconNews s={14}/> },
                            { key: 'publication' as FilterKey, label: t('home.news.filterPubs', 'Publications'), icon: <IconScroll s={14}/> },
                        ].map(f => (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 100, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', border: filter === f.key ? '1.5px solid #C8102E' : `1.5px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, background: filter === f.key ? 'rgba(200,16,46,0.1)' : 'transparent', color: filter === f.key ? '#C8102E' : sub, transition: 'all 0.22s', fontFamily: 'inherit' }}>
                                {f.icon} {f.label}
                            </button>
                        ))}
                    </div>

                    {/* Admin buttons */}
                    {roles.canCreate && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {(roles.canValidateNational || roles.canValidateCommittee) && pendingCount > 0 && (
                                <span style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 700, background: 'rgba(217,119,6,0.15)', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
                                    {pendingCount} {t('home.news.pending', 'en attente')}
                                </span>
                            )}
                            <button onClick={() => setCreating(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 100, border: 'none', background: '#C8102E', color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 3px 12px rgba(200,16,46,0.35)', transition: 'all 0.22s', fontFamily: 'inherit' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#9B0B22'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.transform = 'none'; }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                {t('home.news.newPublish', 'Nouvelle publication')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Cards Grid ── */}
            <div className="news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22 }}>
                <AnimatePresence mode="popLayout">
                    {filtered.map(item => (
                        <NewsCard
                            key={item.id}
                            item={item}
                            dark={dark}
                            onClick={() => setSelected(item)}
                            showStatus={roles.canValidateNational || roles.canValidateCommittee || roles.canPublish}
                        />
                    ))}
                </AnimatePresence>

                {filtered.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 0', color: sub }}>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><IconInbox s={40} /></div>
                        <div style={{ fontSize: 15, fontWeight: 500 }}>{t('home.news.noData', 'Aucune publication pour ce filtre.')}</div>
                    </div>
                )}
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {selected && (
                    <DetailModal
                        key="detail"
                        item={selected}
                        dark={dark}
                        onClose={() => setSelected(null)}
                        onStatusChange={handleStatusChange}
                        roles={roles}
                    />
                )}
                {(creating || editing) && (
                    <CreateForm
                        key="create"
                        dark={dark}
                        onClose={() => { setCreating(false); setEditing(null); }}
                        onSave={handleSave}
                        initial={editing ?? undefined}
                        roles={roles}
                    />
                )}
            </AnimatePresence>

            {/* ── Responsive ── */}
            <style>{`
                @media (max-width: 1024px) {
                    .news-section { padding: 72px 40px !important; }
                    .news-header { flex-direction: column !important; align-items: flex-start !important; }
                    .news-controls { align-items: flex-start !important; }
                }
                @media (max-width: 768px) {
                    .news-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
                }
                @media (max-width: 640px) {
                    .news-section { padding: 56px 20px !important; }
                }
            `}</style>
        </section>
    );
};

export default NewsSection;
