// ============================================================
// AuthVisual — Left panel branding for auth pages
// ============================================================

import Logo from '@/components/common/Logo';

interface AuthVisualProps {
    headline: string;
    description: string;
    stats?: { value: string; label: string }[];
    features?: string[];
}

const AuthVisual: React.FC<AuthVisualProps> = ({ headline, description, stats, features }) => {
    return (
        <div
            className="auth-visual-panel"
            style={{
                background: `
          radial-gradient(ellipse at 30% 30%, rgba(241,3,22,0.25) 0%, transparent 55%),
          radial-gradient(ellipse at 80% 80%, rgba(226,58,77,0.2) 0%, transparent 50%),
          rgba(48,45,40,0.95)
        `,
                padding: '60px 50px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 500,
            }}
        >
            {/* Decorative rings */}
            <div
                style={{
                    position: 'absolute',
                    width: 300,
                    height: 300,
                    border: '1px solid rgba(241,3,22,0.15)',
                    borderRadius: '50%',
                    top: -80,
                    left: -80,
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    width: 200,
                    height: 200,
                    border: '1px solid rgba(247,182,185,0.1)',
                    borderRadius: '50%',
                    bottom: -40,
                    right: -40,
                }}
            />

            {/* Logo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <Logo size="lg" linkTo="/" />
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <h2
                    className="font-display"
                    style={{
                        fontSize: 36,
                        fontWeight: 800,
                        lineHeight: 1.2,
                        marginBottom: 16,
                        color: '#f7f8f6',
                    }}
                >
                    {headline}
                </h2>
                <p style={{ fontSize: 15, color: '#bebdb9', lineHeight: 1.7 }}>
                    {description}
                </p>

                {/* Feature Checklist */}
                {features && features.length > 0 && (
                    <div style={{ marginTop: 24 }}>
                        {features.map((feat) => (
                            <div key={feat} className="flex items-center gap-3" style={{ marginBottom: 12 }}>
                                <div
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: '50%',
                                        background: 'rgba(241,3,22,0.2)',
                                        border: '1px solid rgba(241,3,22,0.4)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        flexShrink: 0,
                                        color: '#f7f8f6',
                                    }}
                                >
                                    ✓
                                </div>
                                <span style={{ fontSize: 14, color: '#bebdb9' }}>{feat}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            {stats && stats.length > 0 && (
                <div className="flex gap-8" style={{ position: 'relative', zIndex: 1 }}>
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: 11, color: '#7a7774', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuthVisual;
