// ============================================================
// AboutSection — À Propos du CRT — Premium glassmorphic design
// Timeline arrows, org tree, SVG icons
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---- SVG Icon Components (glassmorphic style) ----
const Icon = ({ children, size = 20 }: { children: React.ReactNode; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IconHistory = ({ s = 20 }: { s?: number }) => <Icon size={s}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>;
const IconBuilding = ({ s = 20 }: { s?: number }) => <Icon size={s}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="9" y1="18" x2="15" y2="18"/></Icon>;
const IconScale = ({ s = 20 }: { s?: number }) => <Icon size={s}><path d="M12 3v18"/><path d="M3 7l9-4 9 4"/><path d="M3 7v4a3 3 0 006 0V7"/><path d="M15 7v4a3 3 0 006 0V7"/></Icon>;
const IconScroll = ({ s = 20 }: { s?: number }) => <Icon size={s}><path d="M8 21h12a2 2 0 002-2v-2H10v2a2 2 0 11-4 0V5a2 2 0 10-4 0v14a2 2 0 002 2z"/><path d="M6 3h12a2 2 0 012 2v12"/></Icon>;
const IconHeart = ({ s = 20 }: { s?: number }) => <Icon size={s}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></Icon>;
const IconUser = ({ s = 20 }: { s?: number }) => <Icon size={s}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>;
const IconShield = ({ s = 20 }: { s?: number }) => <Icon size={s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></Icon>;
const IconGlobe = ({ s = 20 }: { s?: number }) => <Icon size={s}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></Icon>;
const IconMapPin = ({ s = 20 }: { s?: number }) => <Icon size={s}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></Icon>;

// ---- Types ----
type TabKey = 'histoire' | 'organisation' | 'principes' | 'reglements' | 'volontariat';

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'histoire', label: 'Histoire', icon: <IconHistory /> },
    { key: 'organisation', label: 'Organisation', icon: <IconBuilding /> },
    { key: 'principes', label: 'Principes', icon: <IconScale /> },
    { key: 'reglements', label: 'Règlements', icon: <IconScroll /> },
    { key: 'volontariat', label: 'Volontariat', icon: <IconHeart /> },
];

// ---- Reusable glass card style ----
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
    borderRadius: 20, transition: 'all 0.4s', ...extra,
});

const hoverCard = (e: React.MouseEvent, on: boolean) => {
    const t = e.currentTarget as HTMLElement;
    t.style.borderColor = on ? 'rgba(241,3,22,0.35)' : 'var(--glass-border)';
    t.style.transform = on ? 'translateY(-4px)' : 'none';
    t.style.boxShadow = on ? '0 16px 48px rgba(241,3,22,0.08)' : 'none';
};

// ---- Data ----
const timeline = [
    { year: '1956', month: 'Oct', event: 'Création formelle du CRT', detail: 'Fondé le 7 octobre 1956 au lendemain de l\'indépendance' },
    { year: '1957', month: 'Mai', event: 'Reconnu d\'utilité publique', detail: 'Décret gouvernemental du 6 mai 1957' },
    { year: '1957', month: 'Sep', event: 'Adhésion internationale', detail: 'Intégration au Mouvement international le 13 septembre' },
    { year: '1965', month: '', event: '7 Principes fondamentaux', detail: 'Proclamés lors de la Conférence de Vienne' },
    { year: '2011', month: 'Sep', event: 'Décret-loi n° 88-2011', detail: 'Adaptation au cadre juridique des associations' },
    { year: '2018', month: '', event: 'Normes IFRC', detail: 'Publication des standards pour les Sociétés nationales' },
];

const leadership = [
    { name: 'M. Abdelatif Chabbou', role: 'Président', ar: 'رئيس', desc: 'Premier responsable moral et légal. Représente le CRT devant l\'État et le Mouvement international.', color: '#e11d48' },
    { name: 'Secrétaire Général', role: 'Secrétaire Général', ar: 'كاتب عام', desc: 'Gère les registres, coordonne les RH, prépare les PV et assure la tenue des archives.', color: '#f43f5e' },
    { name: 'Trésorier National', role: 'Trésorier', ar: 'أمين مال', desc: 'Budgétisation, cotisations, dons et suivi des dépenses. Trésorerie centralisée.', color: '#fb7185' },
    { name: 'Coordinateur Programmes', role: 'Coordinateur', ar: 'منسق البرامج', desc: 'Portefeuilles spécifiques : santé, secourisme, jeunesse, migration, catastrophes.', color: '#e11d48' },
];

const principles = [
    { name: 'Humanité', desc: 'Prévenir et alléger les souffrances humaines, protéger la vie et la santé.' },
    { name: 'Impartialité', desc: 'Aucune discrimination. L\'intervention est dictée par l\'urgence uniquement.' },
    { name: 'Neutralité', desc: 'Devoir de réserve absolu face aux hostilités et controverses.' },
    { name: 'Indépendance', desc: 'Autonomie décisionnelle tout en étant auxiliaire des pouvoirs publics.' },
    { name: 'Volontariat', desc: 'Mouvement bénévole sans recherche de gain financier.' },
    { name: 'Unité', desc: 'Une seule Société nationale, ouverte à tous, couvrant tout le territoire.' },
    { name: 'Universalité', desc: 'Droits égaux et devoir d\'entraide entre toutes les Sociétés nationales.' },
];

const programs = [
    { name: 'Secours & Catastrophes', desc: 'Prévention et réponse rapide' },
    { name: 'Santé Publique', desc: 'Vaccination, hygiène, collecte de sang' },
    { name: 'Premier Secours', desc: 'Formations PSE1/PSE2 certifiantes' },
    { name: 'Action Sociale', desc: 'Aides matérielles, soutien psychologique' },
    { name: 'Diffusion du DIH', desc: 'Droit International Humanitaire' },
    { name: 'Migration & Réfugiés', desc: 'Protection et secours matériel' },
    { name: 'Jeunesse', desc: 'Encadrement et éducation' },
    { name: 'Culture de la Paix', desc: 'Non-violence intercommunautaire' },
];

// ---- Component ----
const AboutSection: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>('histoire');

    return (
        <section id="about" className="about-section" style={{ padding: '100px 80px', position: 'relative', zIndex: 2 }}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: 48 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>À Propos</div>
                <h1 className="font-display" style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 800, lineHeight: 1.1, color: 'var(--text-primary)', margin: 0 }}>
                    Croissant-Rouge Tunisien
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 14, maxWidth: 640, margin: '14px auto 0', lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                    Fondé le 7 octobre 1956 — Auxiliaire des pouvoirs publics et membre du Mouvement international de la Croix-Rouge et du Croissant-Rouge
                </p>
            </motion.div>

            {/* Stats */}
            <div className="about-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 48 }}>
                {[
                    { value: '1956', label: 'Fondation' },
                    { value: '24', label: 'Comités régionaux' },
                    { value: '240+', label: 'Comités locaux' },
                    { value: '~10 000', label: 'Volontaires' },
                ].map(s => (
                    <div key={s.label} className="glass" style={{ textAlign: 'center', padding: '24px 16px', borderRadius: 20, transition: 'all 0.3s' }}
                        onMouseEnter={e => hoverCard(e, true)} onMouseLeave={e => hoverCard(e, false)}>
                        <div className="font-display" style={{ fontSize: 30, fontWeight: 800, color: 'var(--red)' }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="about-tabs" style={{ display: 'flex', gap: 6, marginBottom: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '10px 22px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                            fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.3s',
                            display: 'flex', alignItems: 'center', gap: 8,
                            border: activeTab === t.key ? '1px solid var(--red)' : '1px solid var(--glass-border)',
                            background: activeTab === t.key ? 'rgba(241,3,22,0.1)' : 'var(--glass-bg)',
                            color: activeTab === t.key ? 'var(--red)' : 'var(--text-secondary)',
                            backdropFilter: 'blur(8px)',
                        }}>
                        {t.icon}<span>{t.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>

                    {/* ========== HISTOIRE ========== */}
                    {activeTab === 'histoire' && (
                        <div>
                            <div className="glass" style={{ ...glass({ padding: 36, marginBottom: 40 }) }}>
                                <h2 className="font-display" style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: 'var(--red)' }}><IconHistory s={28} /></span> Ancrage Historique
                                </h2>
                                <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text-secondary)', marginBottom: 14 }}>
                                    La naissance du mouvement caritatif en Tunisie est liée à la lutte pour l'indépendance. <strong style={{ color: 'var(--text-primary)' }}>Mustapha El Ahmar</strong> (Secrétaire Général), <strong style={{ color: 'var(--text-primary)' }}>Mohamed El Akrebi</strong> (Trésorier), <strong style={{ color: 'var(--text-primary)' }}>Hassouna Zaouali, Taher Boudaya, Ahmed Ben Ghabrane</strong> et <strong style={{ color: 'var(--text-primary)' }}>Ahmed Hannachi</strong> formèrent les premières instances dirigeantes.
                                </p>
                                <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text-secondary)' }}>
                                    Le CRT fonde son action sur les <strong style={{ color: 'var(--red)' }}>Conventions de Genève de 1949</strong>, et s'inscrit dans le cadre du <strong style={{ color: 'var(--text-primary)' }}>décret-loi n° 88-2011</strong>.
                                </p>
                            </div>

                            {/* TIMELINE — Arrow / Vertical line design */}
                            <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: 'var(--red)' }}><IconHistory s={22} /></span> Dates Clés
                            </h3>
                            <div className="timeline-container" style={{ position: 'relative', paddingLeft: 48 }}>
                                {/* Vertical line */}
                                <div style={{ position: 'absolute', left: 18, top: 8, bottom: 8, width: 2, background: 'linear-gradient(to bottom, var(--red), rgba(241,3,22,0.1))', borderRadius: 2 }} />
                                {timeline.map((t, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.1 }}
                                        style={{ position: 'relative', marginBottom: i < timeline.length - 1 ? 28 : 0 }}>
                                        {/* Dot on line */}
                                        <div style={{
                                            position: 'absolute', left: -38, top: 14, width: 16, height: 16, borderRadius: '50%',
                                            background: 'var(--bg-primary)', border: '3px solid var(--red)',
                                            boxShadow: '0 0 0 4px rgba(241,3,22,0.15), 0 0 12px rgba(241,3,22,0.2)',
                                            zIndex: 2,
                                        }} />
                                        {/* Arrow connector */}
                                        <div style={{
                                            position: 'absolute', left: -18, top: 19, width: 18, height: 2,
                                            background: 'rgba(241,3,22,0.3)',
                                        }} />
                                        {/* Card */}
                                        <div className="glass" style={{ ...glass({ padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 20 }) }}
                                            onMouseEnter={e => hoverCard(e, true)} onMouseLeave={e => hoverCard(e, false)}>
                                            <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 60 }}>
                                                <div className="font-display" style={{ fontSize: 28, fontWeight: 800, color: 'var(--red)', lineHeight: 1 }}>{t.year}</div>
                                                {t.month && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase' }}>{t.month}</div>}
                                            </div>
                                            <div style={{ width: 1, height: 36, background: 'var(--glass-border)', flexShrink: 0 }} />
                                            <div>
                                                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t.event}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.detail}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ========== ORGANISATION ========== */}
                    {activeTab === 'organisation' && (
                        <div>
                            {/* Direction — Tree layout */}
                            <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: 'var(--red)' }}><IconUser s={22} /></span> Direction Actuelle
                            </h3>
                            {/* Tree: President at top, then 3 branches */}
                            <div className="org-tree" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 48 }}>
                                {/* Root: President */}
                                <motion.div initial={{ opacity: 0, y: -20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                    className="glass" style={{ ...glass({ padding: '24px 36px', textAlign: 'center', borderTop: '3px solid #e11d48', maxWidth: 400, width: '100%' }) }}
                                    onMouseEnter={e => hoverCard(e, true)} onMouseLeave={e => hoverCard(e, false)}>
                                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(241,3,22,0.1)', border: '1px solid rgba(241,3,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', color: 'var(--red)' }}><IconShield s={26} /></div>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Président • رئيس</div>
                                    <div className="font-display" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>M. Abdelatif Chabbou</div>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{leadership[0].desc}</p>
                                </motion.div>
                                {/* Vertical connector */}
                                <div style={{ width: 2, height: 32, background: 'linear-gradient(to bottom, var(--red), rgba(241,3,22,0.2))' }} />
                                {/* Horizontal bar */}
                                <div className="org-hbar" style={{ width: '75%', maxWidth: 700, height: 2, background: 'rgba(241,3,22,0.2)', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: 0, top: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
                                    <div style={{ position: 'absolute', left: '50%', top: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', transform: 'translateX(-50%)' }} />
                                    <div style={{ position: 'absolute', right: 0, top: -3, width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }} />
                                </div>
                                {/* 3 Branches */}
                                <div className="org-branches" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, width: '100%', maxWidth: 900, marginTop: 0 }}>
                                    {leadership.slice(1).map((l, i) => (
                                        <motion.div key={l.role} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            {/* Vertical connector from bar */}
                                            <div style={{ width: 2, height: 24, background: `linear-gradient(to bottom, ${l.color}, ${l.color}33)` }} />
                                            <div className="glass" style={{ ...glass({ padding: '20px 24px', textAlign: 'center', borderTop: `3px solid ${l.color}`, width: '100%' }) }}
                                                onMouseEnter={e => hoverCard(e, true)} onMouseLeave={e => hoverCard(e, false)}>
                                                <div style={{ width: 44, height: 44, borderRadius: 14, background: `${l.color}15`, border: `1px solid ${l.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: l.color }}>
                                                    {i === 0 ? <IconScroll s={22} /> : i === 1 ? <IconScale s={22} /> : <IconGlobe s={22} />}
                                                </div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: l.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l.role} • {l.ar}</div>
                                                <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>{l.name}</div>
                                                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{l.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            {/* Architecture — Pyramid */}
                            <h3 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: 'var(--red)' }}><IconBuilding s={22} /></span> Architecture Organisationnelle
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                                {[
                                    { level: 'Comité National', loc: 'Tunis', count: '1 siège', desc: 'Vision stratégique, diplomatie humanitaire, conformité IFRC.', w: '50%', icon: <IconBuilding s={24} /> },
                                    { level: 'Comités Régionaux', loc: '24 Gouvernorats', count: '24 branches', desc: 'Supervision territoriale, coordination provinciale.', w: '72%', icon: <IconMapPin s={24} /> },
                                    { level: 'Comités Locaux', loc: 'Délégations', count: '240+ filiales', desc: 'Exécution opérationnelle, recrutement, distribution.', w: '94%', icon: <IconGlobe s={24} /> },
                                ].map((o, i) => (
                                    <motion.div key={o.level} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                                        className="glass about-pyramid-card" style={{ ...glass({ padding: '20px 32px', display: 'flex', alignItems: 'center', gap: 20, width: o.w, borderLeft: '4px solid var(--red)' }) }}
                                        onMouseEnter={e => hoverCard(e, true)} onMouseLeave={e => hoverCard(e, false)}>
                                        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(241,3,22,0.08)', border: '1px solid rgba(241,3,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', flexShrink: 0 }}>{o.icon}</div>
                                        <div style={{ flex: 1 }}>
                                            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{o.level}</div>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>{o.desc}</p>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div className="font-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>{o.count}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{o.loc}</div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            {/* HQ */}
                            <div className="glass" style={{ ...glass({ padding: '20px 28px', marginTop: 24, display: 'flex', alignItems: 'center', gap: 16 }) }}>
                                <div style={{ color: 'var(--red)' }}><IconMapPin s={24} /></div>
                                <div>
                                    <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Siège — 19, Rue d'Angleterre, Tunis</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>N° Visa : 2581 • MF : 33049Y/P/N/000 • Reconnu d'utilité publique depuis 1957</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== PRINCIPES ========== */}
                    {activeTab === 'principes' && (
                        <div>
                            <div className="glass" style={{ ...glass({ padding: 32, marginBottom: 28, textAlign: 'center' }) }}>
                                <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ color: 'var(--red)' }}><IconScale s={24} /></span> Les 7 Principes Fondamentaux
                                </h2>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 550, margin: '0 auto' }}>Proclamés à Vienne en 1965 — norme juridique contraignante</p>
                            </div>
                            <div className="about-principles" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                                {principles.map((p, i) => {
                                    const colors = ['#e11d48', '#f43f5e', '#fb7185', '#e11d48', '#f43f5e', '#fb7185', '#e11d48'];
                                    return (
                                        <motion.div key={p.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                                            className="glass" style={{ ...glass({ padding: '22px 26px', borderTop: `3px solid ${colors[i]}` }) }}
                                            onMouseEnter={e => { hoverCard(e, true); (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 40px ${colors[i]}18`; }}
                                            onMouseLeave={e => hoverCard(e, false)}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${colors[i]}12`, border: `1px solid ${colors[i]}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors[i], fontSize: 14, fontWeight: 700 }}>{i + 1}</div>
                                                <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: colors[i] }}>{p.name}</div>
                                            </div>
                                            <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-muted)' }}>{p.desc}</p>
                                        </motion.div>
                                    );
                                })}
                            </div>
                            {/* Movement */}
                            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginTop: 36, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: 'var(--red)' }}><IconGlobe s={20} /></span> Composantes du Mouvement
                            </h3>
                            <div className="about-movement" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                {[
                                    { name: 'CICR', base: 'Art. 5', desc: 'Gardien du DIH, zones de conflit armé.', icon: <IconShield s={22} /> },
                                    { name: 'IFRC', base: 'Art. 6', desc: 'Coordination mondiale, 191 Sociétés.', icon: <IconGlobe s={22} /> },
                                    { name: 'Sociétés Nationales', base: 'Art. 3-4', desc: 'Organes exécutifs souverains.', icon: <IconMapPin s={22} /> },
                                ].map(c => (
                                    <div key={c.name} className="glass" style={{ ...glass({ padding: 24, textAlign: 'center' }) }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(241,3,22,0.08)', border: '1px solid rgba(241,3,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: 'var(--red)' }}>{c.icon}</div>
                                        <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{c.name}</div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2, marginBottom: 6 }}>{c.base}</div>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ========== REGLEMENTS ========== */}
                    {activeTab === 'reglements' && (
                        <div>
                            <div className="glass" style={{ ...glass({ padding: 36, marginBottom: 28 }) }}>
                                <h2 className="font-display" style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ color: 'var(--red)' }}><IconScroll s={24} /></span> Ouverture d'un Comité
                                </h2>
                                <div style={{ display: 'grid', gap: 14 }}>
                                    {[
                                        { n: '01', title: 'Correspondance Territoriale', desc: 'Inscription dans une circonscription valide. Aucune zone en doublon (principe d\'Unité).' },
                                        { n: '02', title: 'Mobilisation Citoyenne', desc: 'Rassemblement de citoyens souscrivant aux 7 Principes fondamentaux.' },
                                        { n: '03', title: 'Processus Électif', desc: 'Assemblée constitutive locale avec élection démocratique des responsables.' },
                                        { n: '04', title: 'Agrément & Raccordement', desc: 'Validation régionale puis approbation finale du Comité Central à Tunis.' },
                                    ].map((s, i) => (
                                        <motion.div key={s.n} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                            style={{ display: 'flex', gap: 18, alignItems: 'flex-start', padding: '16px 20px', borderRadius: 16, background: 'var(--card-bg)', border: '1px solid var(--card-border)', transition: 'all 0.3s' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(241,3,22,0.25)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--card-border)'; }}>
                                            <div className="font-mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--red)', flexShrink: 0, width: 36, textAlign: 'center' }}>{s.n}</div>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{s.title}</div>
                                                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{s.desc}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 18, padding: '12px 18px', borderRadius: 12, background: 'rgba(241,3,22,0.05)', border: '1px solid rgba(241,3,22,0.12)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    <strong style={{ color: 'var(--red)' }}>Mandat :</strong> 4 ans, synchronisé avec les cycles de la Conférence internationale.
                                </div>
                            </div>
                            <div className="about-reg-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div className="glass" style={{ ...glass({ padding: 28 }) }}>
                                    <h4 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: 'var(--red)' }}><IconShield s={18} /></span> Discipline & Conformité
                                    </h4>
                                    <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-muted)' }}>
                                        Mesures : <strong style={{ color: 'var(--text-primary)' }}>blâme</strong>, <strong style={{ color: 'var(--text-primary)' }}>suspension</strong>, <strong style={{ color: 'var(--text-primary)' }}>exclusion</strong>, ou <strong style={{ color: 'var(--red)' }}>dissolution</strong>. Principe du procès équitable et protection des lanceurs d'alerte.
                                    </p>
                                </div>
                                <div className="glass" style={{ ...glass({ padding: 28 }) }}>
                                    <h4 className="font-display" style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ color: 'var(--red)' }}><IconScroll s={18} /></span> Protection de l'Emblème
                                    </h4>
                                    <p style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-muted)' }}>
                                        Criminalisé par l'<strong style={{ color: 'var(--text-primary)' }}>art. 127 du Code de Justice Militaire</strong>. Usage non autorisé = radiation interne + poursuites pénales.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== VOLONTARIAT ========== */}
                    {activeTab === 'volontariat' && (
                        <div>
                            <div className="about-vol-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                                <div className="glass" style={{ ...glass({ padding: 32 }) }}>
                                    <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ color: 'var(--red)' }}><IconHeart s={22} /></span> Force Motrice
                                    </h3>
                                    <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                        Les volontaires sont la <strong style={{ color: 'var(--red)' }}>«colonne vertébrale»</strong>. Près de <strong style={{ color: 'var(--text-primary)' }}>10 000 bénévoles</strong> dont <strong style={{ color: 'var(--text-primary)' }}>~2 500 actifs</strong> mobilisables. Recrutement inclusif, sans discrimination.
                                    </p>
                                </div>
                                <div className="glass" style={{ ...glass({ padding: 32 }) }}>
                                    <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ color: 'var(--red)' }}><IconScroll s={22} /></span> Cadre Juridique
                                    </h3>
                                    <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>Politique IFRC 2012</strong>. Remboursement des frais de mission. Accords de bénévolat clairs. Protocoles <strong style={{ color: 'var(--text-primary)' }}>«Stay Safe»</strong>. Certificat officiel délivré.
                                    </p>
                                </div>
                            </div>
                            <h3 className="font-display" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: 'var(--red)' }}><IconGlobe s={20} /></span> 8 Programmes Directeurs
                            </h3>
                            <div className="about-programs" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                                {programs.map((p, i) => (
                                    <motion.div key={p.name} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                                        className="glass" style={{ ...glass({ padding: '18px 14px', textAlign: 'center' }) }}
                                        onMouseEnter={e => hoverCard(e, true)} onMouseLeave={e => hoverCard(e, false)}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(241,3,22,0.08)', border: '1px solid rgba(241,3,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', color: 'var(--red)', fontSize: 12, fontWeight: 700 }}>{i + 1}</div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.3 }}>{p.name}</div>
                                        <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.45 }}>{p.desc}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {/* Responsive */}
            <style>{`
                @media (max-width: 1200px) {
                    .about-programs { grid-template-columns: repeat(2, 1fr) !important; }
                    .org-branches { grid-template-columns: 1fr !important; max-width: 400px !important; margin: 0 auto !important; }
                    .org-hbar { display: none !important; }
                    .about-pyramid-card { width: 100% !important; }
                }
                @media (max-width: 1024px) {
                    .about-section { padding: 80px 48px !important; }
                    .about-stats { grid-template-columns: repeat(2, 1fr) !important; }
                    .about-reg-grid, .about-vol-grid, .about-movement { grid-template-columns: 1fr !important; }
                }
                @media (max-width: 640px) {
                    .about-section { padding: 64px 20px !important; }
                    .about-stats { grid-template-columns: 1fr 1fr !important; }
                    .about-programs { grid-template-columns: 1fr 1fr !important; }
                    .about-tabs { justify-content: flex-start !important; overflow-x: auto; flex-wrap: nowrap !important; padding-bottom: 8px; -webkit-overflow-scrolling: touch; }
                    .about-tabs button { flex-shrink: 0; }
                    .timeline-container { padding-left: 40px !important; }
                }
            `}</style>
        </section>
    );
};

export default AboutSection;
