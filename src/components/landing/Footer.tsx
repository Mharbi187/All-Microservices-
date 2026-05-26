// ============================================================
// Footer — Landing page footer with premium dark mode design
// ============================================================

import React, { useState } from 'react';
import Logo from '@/components/common/Logo';
import { useUIStore } from '@/stores/uiStore';

const Icon = ({ size = 16, children }: { size?: number; children: React.ReactNode }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        {children}
    </svg>
);

const IconFacebook = () => <Icon><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></Icon>;
const IconTwitter = () => <Icon><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></Icon>;
const IconLinkedin = () => <Icon><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></Icon>;
const IconInstagram = () => <Icon><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></Icon>;

const Footer: React.FC = () => {
    const { themeMode } = useUIStore();
    const dark = themeMode === 'dark';

    // Définition de styles réutilisables (haute qualité)
    const headingStyle: React.CSSProperties = {
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        color: dark ? '#a1a09e' : '#7a7774',
        fontWeight: 700,
        marginBottom: 20,
        fontFamily: 'var(--font-body, inherit)',
    };

    const linkStyle: React.CSSProperties = {
        fontSize: 14,
        color: dark ? '#a1a09e' : '#4B5563',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        lineHeight: 1.6,
        transition: 'all 0.3s ease', // Micro-interaction fluide
    };

    const bg = dark ? '#111215' : '#F9FAFB';
    const border = dark ? 'rgba(241,3,22,0.15)' : 'rgba(200,16,46,0.1)';

    return (
        <footer style={{ background: bg, position: 'relative', zIndex: 10, borderTop: `1px solid ${border}`, transition: 'background 0.4s' }}>
            
            {/* Blurs de fond décoratifs style UI Moderne */}
            <div style={{ position: 'absolute', bottom: 0, left: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(241,3,22,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="footer-grid" style={{ padding: '80px 80px 40px', display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1.5fr', gap: 48, maxWidth: 1440, margin: '0 auto' }}>
                
                {/* Colonne 1: Branding & Version */}
                <div>
                    <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Logo size="sm" linkTo="/" />
                        <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(241,3,22,0.15)', color: dark ? '#ef7984' : '#C8102E', padding: '2px 8px', borderRadius: 100, letterSpacing: '0.05em' }}>NEXUS-AID</span>
                    </div>
                    <p style={{ fontSize: 14, color: dark ? '#a1a09e' : '#4B5563', lineHeight: 1.7, maxWidth: 280 }}>
                        Système ERP humanitaire de nouvelle génération intégrant l'IA pour le Croissant-Rouge Tunisien.
                    </p>
                    <p style={{ marginTop: 24, fontSize: 12, color: dark ? '#7a7774' : '#9CA3AF', fontFamily: 'var(--font-mono, monospace)' }}>
                        v3.0 — Février 2026
                    </p>
                </div>

                {/* Colonne 2: Réseaux Sociaux */}
                <div>
                    <h4 style={headingStyle}>Réseaux Sociaux</h4>
                    {[
                        { name: 'Facebook', href: '#', icon: <IconFacebook /> },
                        { name: 'Twitter / X', href: '#', icon: <IconTwitter /> },
                        { name: 'LinkedIn', href: '#', icon: <IconLinkedin /> },
                        { name: 'Instagram', href: '#', icon: <IconInstagram /> }
                    ].map((item) => (
                        <a key={item.name} href={item.href} style={linkStyle}
                           onMouseEnter={(e) => { e.currentTarget.style.color = '#ef7984'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.color = dark ? '#a1a09e' : '#4B5563'; e.currentTarget.style.transform = 'none'; }}>
                            {item.icon} {item.name}
                        </a>
                    ))}
                </div>

                {/* Colonne 3: Organisation / Liens Institutionnels */}
                <div>
                    <h4 style={headingStyle}>Organisation</h4>
                    {[
                        { name: 'Comité National', href: '#' },
                        { name: 'Comités Régionaux', href: '#' },
                        { name: 'Comités Locaux', href: '#' },
                        { name: 'Documentation', href: '#' }
                    ].map((item) => (
                        <a key={item.name} href={item.href} style={linkStyle}
                           onMouseEnter={(e) => { e.currentTarget.style.color = '#f10316'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                           onMouseLeave={(e) => { e.currentTarget.style.color = dark ? '#a1a09e' : '#4B5563'; e.currentTarget.style.transform = 'none'; }}>
                            • {item.name}
                        </a>
                    ))}
                </div>

                {/* Colonne 4: Newsletter Premium & Live Status (IA) */}
                <div>
                    <h4 style={headingStyle}>Alertes & News</h4>
                    <p style={{ fontSize: 13, color: dark ? '#a1a09e' : '#4B5563', marginBottom: 16, lineHeight: 1.5 }}>
                        Notifications des urgences et mises à jour du système IA.
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        <input 
                            type="email" 
                            placeholder="Votre email..." 
                            style={{ flex: 1, padding: '12px 16px', background: dark ? 'rgba(255,255,255,0.03)' : '#fff', border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)', borderRadius: 12, color: dark ? '#fff' : '#111', fontSize: 13, outline: 'none', transition: '0.3s' }}
                            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(241,3,22,0.5)'}
                            onBlur={(e) => e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}
                        />
                        <button style={{ padding: '0 20px', background: '#f10316', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: '0.3s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#d90213'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#f10316'}>
                            S'abonner
                        </button>
                    </div>
                    
                    {/* Status live badge (Haute Qualité) */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 8 }}>
                        <span style={{ width: 6, height: 6, background: '#16a34a', borderRadius: '50%', animation: 'blink 2s infinite' }} />
                        <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)' }}>Serveur Principal En Ligne</span>
                    </div>
                </div>
            </div>

            {/* Barre de Copyright inférieure ( Footer Bottom) */}
            <div className="footer-bottom" style={{ padding: '24px 80px', borderTop: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1440, margin: '0 auto' }}>
                <p style={{ fontSize: 13, color: dark ? '#7a7774' : '#6B7280', margin: 0 }}>
                    © 2026 <strong style={{ color: dark ? '#bebdb9' : '#111' }}>Croissant Rouge Tunisien</strong> — Nexus-AID ERP.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 12, color: dark ? '#7a7774' : '#6B7280', fontFamily: 'var(--font-mono, monospace)' }}>
                    <p style={{ margin: 0 }}>Rédacteur: <span style={{ color: dark ? '#a1a09e' : '#111' }}>M. Harbi & A. Amara</span></p>
                    <p style={{ margin: 0, paddingLeft: 12, borderLeft: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)' }}>Tunis 🇹🇳</p>
                </div>
            </div>

            {/* Style CSS Responsive (Haute Qualité) */}
            <style>{`
                @keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
                @media (max-width: 1200px) {
                    .footer-grid { grid-template-columns: 1.5fr 1fr 1fr !important; gap: 40px !important; }
                }
                @media (max-width: 1024px) {
                    .footer-grid { grid-template-columns: 1fr !important; gap: 40px !important; padding: 60px 40px !important; }
                    .footer-bottom { padding: 24px 40px !important; flex-direction: column !important; gap: 12px !important; text-align: center; }
                    .footer-bottom div { flex-direction: column !important; gap: 12px !important; }
                    .footer-bottom div p { border: none !important; padding: 0 !important; }
                }
                @media (max-width: 640px) {
                    .footer-grid { padding: 48px 24px !important; }
                    .footer-bottom { padding: 24px !important; }
                }
            `}</style>
        </footer>
    );
};

export default Footer;
