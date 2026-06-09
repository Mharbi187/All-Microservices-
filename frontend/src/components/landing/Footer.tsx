// ============================================================
// Footer — Landing page footer with links
// ============================================================

import Logo from '@/components/common/Logo';

const Footer: React.FC = () => {
    return (
        <>
            <footer
                style={{
                    padding: '60px 80px 40px',
                    position: 'relative',
                    zIndex: 2,
                    borderTop: '1px solid var(--footer-border)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 60,
                }}
                className="footer-grid"
            >
                {/* Brand */}
                <div>
                    <div style={{ marginBottom: 16 }}>
                        <Logo size="sm" linkTo="/" />
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        Système ERP humanitaire intégrant l'intelligence artificielle pour le Croissant Rouge Tunisien.
                    </p>
                    <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
                        Version 3.0 — Février 2026
                    </p>
                </div>

                {/* Modules */}
                <div>
                    <h4
                        style={{
                            fontSize: 13,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: 'var(--text-muted)',
                            marginBottom: 20,
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        Services
                    </h4>
                    {['Gestion Sociale', 'Secourisme IA', 'Reporting', 'Catastrophes'].map((item) => (
                        <a
                            key={item}
                            href="#"
                            style={{
                                fontSize: 14,
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                display: 'block',
                                marginBottom: 10,
                                lineHeight: 1.6,
                                transition: 'color 0.3s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--pink)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                            {item}
                        </a>
                    ))}
                </div>

                {/* Organization */}
                <div>
                    <h4
                        style={{
                            fontSize: 13,
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            color: 'var(--text-muted)',
                            marginBottom: 20,
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        Organisation
                    </h4>
                    {['Comité National', 'Comités Régionaux', 'Comités Locaux', 'Documentation'].map((item) => (
                        <a
                            key={item}
                            href="#"
                            style={{
                                fontSize: 14,
                                color: 'var(--text-secondary)',
                                textDecoration: 'none',
                                display: 'block',
                                marginBottom: 10,
                                lineHeight: 1.6,
                                transition: 'color 0.3s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--pink)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                            {item}
                        </a>
                    ))}
                </div>
            </footer>

            {/* Footer Bottom */}
            <div
                className="footer-bottom"
                style={{
                    padding: '24px 80px',
                    borderTop: '1px solid var(--card-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 2,
                }}
            >
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    © 2026 Croissant Rouge Tunisien — Nexus-AID. Tous droits réservés.
                </p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    Rédacteur: M. Harbi & A. Amara
                </p>
            </div>

            {/* Responsive overrides via inline style tag */}
            <style>{`
        @media (max-width: 1024px) {
          .footer-grid { grid-template-columns: 1fr !important; gap: 32px !important; padding: 48px !important; }
          .footer-bottom { padding: 24px 48px !important; flex-direction: column !important; gap: 12px !important; }
        }
        @media (max-width: 640px) {
          .footer-grid { padding: 36px 24px !important; }
          .footer-bottom { padding: 24px !important; }
        }
      `}</style>
        </>
    );
};

export default Footer;
