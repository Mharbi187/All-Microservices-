// ============================================================
// NewsSection — Actualités & Publications du CRT
// Combines news articles with official publications
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconGraduationCap, IconCpu, IconAlertTriangle, IconHandshake, IconClipboard, IconHospital, IconGrid, IconNewspaper, IconFileText } from '@/components/common/SvgIcons';

// ---- Types ----

type ContentType = 'actualite' | 'publication';

interface ContentItem {
    type: ContentType;
    date: string;
    category: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    accent: string;
    tags?: { label: string; type: 'red' | 'gray' | 'pink' }[];
}

// ---- Data ----

const contentItems: ContentItem[] = [
    // Actualités
    {
        type: 'actualite',
        date: '22 Fév 2026',
        category: 'Formation',
        title: 'Nouvelle session PSE2 à Sfax',
        desc: 'Le comité régional de Sfax organise une formation avancée en premiers secours niveau 2 pour 45 volontaires.',
        icon: <IconGraduationCap size={24} />,
        accent: 'var(--red)',
    },
    {
        type: 'actualite',
        date: '20 Fév 2026',
        category: 'Technologie',
        title: "Mise à jour de l'assistant IA",
        desc: "L'assistant de secourisme intègre désormais le modèle YOLOv8 amélioré pour une détection plus précise des gestes RCP.",
        icon: <IconCpu size={24} />,
        accent: 'var(--pink)',
    },
    {
        type: 'actualite',
        date: '18 Fév 2026',
        category: 'Intervention',
        title: 'Opération secours à Jendouba',
        desc: "Mobilisation réussie de 120 volontaires en moins de 2h grâce au système d'alerte précoce Nexus-AID.",
        icon: <IconAlertTriangle size={24} />,
        accent: 'var(--crimson)',
    },
    {
        type: 'actualite',
        date: '15 Fév 2026',
        category: 'Partenariat',
        title: 'Convention CICR-CRT signée',
        desc: 'Nouveau partenariat de coopération technique avec le Comité International de la Croix-Rouge pour le déploiement de Nexus-AID.',
        icon: <IconHandshake size={24} />,
        accent: 'var(--blush)',
    },
    // Publications
    {
        type: 'publication',
        date: 'Janvier 2024',
        category: 'Rapport',
        title: 'Programme Jeunesse & Volontariat',
        desc: "Document détaillant les activités du programme jeunesse du CRT : camps de formation, actions de sensibilisation communautaire, campagnes de prévention et engagement citoyen des jeunes volontaires à travers les 24 comités régionaux.",
        icon: <IconClipboard size={24} />,
        accent: 'var(--red)',
        tags: [
            { label: 'Jeunesse', type: 'red' },
            { label: 'Volontariat', type: 'gray' },
            { label: 'Rapport 2024', type: 'pink' },
        ],
    },
    {
        type: 'publication',
        date: 'Mars 2024',
        category: 'Guide',
        title: 'Caravanes Médicales & Sanitaires',
        desc: "Guide opérationnel des caravanes médicales mobiles du CRT offrant des consultations gratuites dans les zones rurales. Inclut les protocoles de déploiement, la gestion du matériel médical et les rapports d'intervention terrain.",
        icon: <IconHospital size={24} />,
        accent: 'var(--pink)',
        tags: [
            { label: 'Santé', type: 'red' },
            { label: 'Zones Rurales', type: 'gray' },
            { label: 'Guide', type: 'pink' },
        ],
    },
];

type FilterKey = 'all' | 'actualite' | 'publication';

const filters: { key: FilterKey; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'Tous', icon: <IconGrid size={14} /> },
    { key: 'actualite', label: 'Actualités', icon: <IconNewspaper size={14} /> },
    { key: 'publication', label: 'Publications', icon: <IconFileText size={14} /> },
];

const tagStyles: Record<string, React.CSSProperties> = {
    red: {
        background: 'rgba(241,3,22,0.15)',
        color: 'var(--pink)',
        border: '1px solid rgba(241,3,22,0.2)',
    },
    gray: {
        background: 'rgba(190,189,185,0.1)',
        color: 'var(--gray)',
        border: '1px solid rgba(190,189,185,0.15)',
    },
    pink: {
        background: 'rgba(239,121,132,0.12)',
        color: 'var(--pink)',
        border: '1px solid rgba(239,121,132,0.18)',
    },
};

// ---- Component ----

const NewsSection: React.FC = () => {
    const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

    const filtered =
        activeFilter === 'all' ? contentItems : contentItems.filter((it) => it.type === activeFilter);

    return (
        <section id="news" className="news-section" style={{ padding: '100px 80px', position: 'relative', zIndex: 2 }}>
            {/* Section Header */}
            <div className="flex flex-wrap items-end justify-between gap-6" style={{ marginBottom: 48 }}>
                <div>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'var(--red)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            marginBottom: 16,
                        }}
                    >
                        Actualités & Publications
                    </div>
                    <div
                        className="font-display"
                        style={{
                            fontSize: 'clamp(32px, 4vw, 52px)',
                            fontWeight: 800,
                            lineHeight: 1.1,
                            color: 'var(--text-primary)',
                        }}
                    >
                        Dernières Nouvelles
                        <span
                            style={{
                                display: 'block',
                                color: 'var(--text-secondary)',
                                fontWeight: 400,
                                fontSize: '0.55em',
                                marginTop: 10,
                                fontFamily: 'var(--font-body)',
                            }}
                        >
                            Suivez nos actualités, mises à jour et publications officielles
                        </span>
                    </div>
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            style={{
                                padding: '8px 20px',
                                borderRadius: 100,
                                fontSize: 13,
                                fontWeight: 600,
                                fontFamily: 'var(--font-body)',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                border:
                                    activeFilter === f.key
                                        ? '1px solid var(--red)'
                                        : '1px solid var(--glass-border)',
                                background:
                                    activeFilter === f.key ? 'rgba(241,3,22,0.12)' : 'transparent',
                                color:
                                    activeFilter === f.key ? 'var(--red)' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <span style={{ fontSize: 14, display: 'flex', alignItems: 'center' }}>{f.icon}</span>
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards Grid */}
            <div className="news-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                <AnimatePresence mode="popLayout">
                    {filtered.map((item, i) => (
                        <motion.article
                            key={item.title}
                            layout
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ duration: 0.45, delay: i * 0.06 }}
                            className="glass"
                            style={{
                                borderRadius: 24,
                                padding: 32,
                                cursor: 'pointer',
                                transition: 'border-color 0.4s, transform 0.4s, box-shadow 0.4s',
                                position: 'relative',
                                overflow: 'hidden',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(241,3,22,0.4)';
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 20px 60px rgba(241,3,22,0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Top: Date + Category + Type Badge */}
                            <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
                                <span
                                    className="font-mono"
                                    style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em' }}
                                >
                                    {item.date}
                                </span>
                                <span
                                    style={{
                                        padding: '3px 10px',
                                        borderRadius: 100,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                        background:
                                            item.type === 'publication'
                                                ? 'rgba(239,121,132,0.12)'
                                                : 'rgba(241,3,22,0.12)',
                                        color: item.accent,
                                        border:
                                            item.type === 'publication'
                                                ? '1px solid rgba(239,121,132,0.25)'
                                                : '1px solid rgba(241,3,22,0.2)',
                                    }}
                                >
                                    {item.category}
                                </span>
                                {/* Type indicator */}
                                <span
                                    style={{
                                        marginLeft: 'auto',
                                        padding: '3px 10px',
                                        borderRadius: 100,
                                        fontSize: 9,
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        background:
                                            item.type === 'publication'
                                                ? 'rgba(239,121,132,0.08)'
                                                : 'rgba(241,3,22,0.06)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--glass-border)',
                                    }}
                                >
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                        {item.type === 'publication' ? <><IconFileText size={10} /> Publication</> : <><IconNewspaper size={10} /> Actualité</>}
                                    </span>
                                </span>
                            </div>

                            {/* Icon */}
                            <div
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 14,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: item.accent,
                                    marginBottom: 16,
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                }}
                            >
                                {item.icon}
                            </div>

                            {/* Text */}
                            <h3
                                className="font-display"
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    marginBottom: 10,
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.3,
                                }}
                            >
                                {item.title}
                            </h3>
                            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: item.tags ? 16 : 0 }}>
                                {item.desc}
                            </p>

                            {/* Tags (for publications) */}
                            {item.tags && (
                                <div className="flex flex-wrap gap-2" style={{ marginTop: 4 }}>
                                    {item.tags.map((tag) => (
                                        <span
                                            key={tag.label}
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: 100,
                                                fontSize: 10,
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                                ...tagStyles[tag.type],
                                            }}
                                        >
                                            {tag.label}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Read more */}
                            <div
                                className="flex items-center gap-2 mt-5"
                                style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', transition: 'gap 0.3s' }}
                            >
                                {item.type === 'publication' ? 'Télécharger' : 'Lire la suite'}
                                <span style={{ transition: 'transform 0.3s' }}>→</span>
                            </div>
                        </motion.article>
                    ))}
                </AnimatePresence>
            </div>

            <style>{`
                @media (max-width: 1024px) {
                    .news-section { padding: 80px 48px !important; }
                    .news-grid { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 640px) {
                    .news-section { padding: 64px 24px !important; }
                    .news-grid { gap: 16px !important; }
                }
            `}</style>
        </section>
    );
};

export default NewsSection;
