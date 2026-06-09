// ============================================================
// Logo — Animated emblem + "Nexus-AID" brand text
// ============================================================

import { Link } from 'react-router-dom';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    linkTo?: string;
}

const sizes = {
    sm: { emblem: 32, font: 18, icon: 16 },
    md: { emblem: 36, font: 20, icon: 18 },
    lg: { emblem: 44, font: 22, icon: 22 },
};

const Logo: React.FC<LogoProps> = ({ size = 'md', linkTo = '/' }) => {
    const s = sizes[size];

    const content = (
        <div className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
            <img
                src="/logo.jpg"
                alt="Croissant Rouge Tunisien"
                className="rounded-full"
                style={{
                    width: s.emblem,
                    height: s.emblem,
                    objectFit: 'cover',
                    boxShadow: '0 0 20px rgba(241,3,22,0.45)',
                    animation: 'pulse 3s ease-in-out infinite',
                }}
            />
            <span
                className="font-display font-bold"
                style={{ fontSize: s.font, color: 'var(--text-primary)' }}
            >
                Nexus<em style={{ color: 'var(--red)', fontStyle: 'normal' }}>-AID</em>
            </span>
        </div>
    );

    if (linkTo) {
        return (
            <Link to={linkTo} style={{ textDecoration: 'none' }}>
                {content}
            </Link>
        );
    }

    return content;
};

export default Logo;
