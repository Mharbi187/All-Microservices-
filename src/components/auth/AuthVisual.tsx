// ============================================================
// AuthVisual — Left panel branding for auth pages
// V3.0 Split-Screen Network Mesh Design
// ============================================================

import { motion } from 'framer-motion';
import Logo from '@/components/common/Logo';
import { useUIStore } from '@/stores/uiStore';

interface AuthVisualProps {
    headline: string;
    description: string;
    stats?: { value: string; label: string }[];
}

const NetworkMeshBg: React.FC<{ dark: boolean }> = ({ dark }) => (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <svg
            style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
            viewBox="0 0 800 1000" fill="none" preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Dark Mode Gradient */}
                <radialGradient id="mesh_dark" cx="40%" cy="40%" r="75%">
                    <stop offset="0%" stopColor="#1C1315" />
                    <stop offset="100%" stopColor="#111215" />
                </radialGradient>
                {/* Light Mode Gradient */}
                <radialGradient id="mesh_light" cx="50%" cy="50%" r="80%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#F5F6F8" />
                </radialGradient>
                
                <radialGradient id="pulse_glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#C8102E" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#C8102E" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#C8102E" stopOpacity="0" />
                </radialGradient>

                <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>

            <rect width="800" height="1000" fill={dark ? 'url(#mesh_dark)' : 'url(#mesh_light)'} />

            <g opacity={dark ? "0.2" : "0.15"} stroke={dark ? "#FFFFFF" : "#000000"} strokeWidth="1">
                {/* Web lines */}
                <path d="M-50,150 L200,300 L450,150 L650,350 L850,200" />
                <path d="M100,-50 L200,300 L150,600 L400,800 L350,1050" />
                <path d="M450,150 L600,600 L400,800 L850,900" />
                <path d="M650,350 L600,600 L150,600 L-50,850" />
                <path d="M200,300 L600,600" />
                <path d="M450,150 L150,600" />
            </g>

            {/* Pulsating nodes */}
            <g>
                <circle cx="200" cy="300" r="40" fill="url(#pulse_glow)" />
                <motion.circle cx="200" cy="300" r="6" fill="#C8102E" filter="url(#glow)" animate={{ scale: [1, 1.4, 1], opacity: [0.8, 1, 0.8] }} transition={{ repeat: Infinity, duration: 3 }} />
                
                <circle cx="600" cy="600" r="50" fill="url(#pulse_glow)" />
                <motion.circle cx="600" cy="600" r="8" fill="#C8102E" filter="url(#glow)" animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }} />
                
                <circle cx="450" cy="150" r="30" fill="url(#pulse_glow)" />
                <circle cx="450" cy="150" r="4" fill="#C8102E" opacity="0.8" />
                
                <circle cx="400" cy="800" r="35" fill="url(#pulse_glow)" />
                <circle cx="400" cy="800" r="5" fill="#C8102E" opacity="0.9" />
            </g>

            {/* Floating Elements (Crescents & Arabic Letters) */}
            <g fill="#C8102E" opacity={dark ? "0.8" : "0.9"}>
                {/* Crescent 1 */}
                <path d="M115,160 A12,12 0 1,0 120,136 A15,15 0 1,1 115,160 Z" />
                
                {/* Crescent 2 */}
                <path d="M720,800 A15,15 0 1,0 728,770 A18,18 0 1,1 720,800 Z" transform="rotate(20 720 800)" />
                
                {/* Arabic Letter ن (Noon) */}
                <text x="80" y="280" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" textAnchor="middle">ن</text>
                
                {/* Arabic Letter ت (Ta) */}
                <text x="120" y="680" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" textAnchor="middle">ت</text>
                
                {/* Arabic Letter م (Meem) */}
                <text x="250" y="850" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" textAnchor="middle">م</text>

                {/* Additional scattered small letters */}
                <text x="750" y="250" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" opacity="0.4">ن</text>
                <text x="680" y="100" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="bold" opacity="0.5">ت</text>
            </g>
        </svg>
    </div>
);

const AuthVisual: React.FC<AuthVisualProps> = ({ headline, description, stats }) => {
    const themeMode = useUIStore(s => s.themeMode);
    const dark = themeMode === 'dark';

    return (
        <div
            className="auth-visual-panel"
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '60px 50px',
                minHeight: '100%',
                overflow: 'hidden',
                background: dark ? '#111215' : '#fff',
            }}
        >
            <NetworkMeshBg dark={dark} />

            {/* Logo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <Logo size="lg" linkTo="/" />
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', marginBottom: 40 }}>
                <h2
                    className="font-display"
                    style={{
                        fontSize: 38,
                        fontWeight: 800,
                        lineHeight: 1.15,
                        marginBottom: 16,
                        color: dark ? '#F4F4F5' : '#1A1A2E',
                    }}
                >
                    {headline}
                </h2>
                <p style={{ fontSize: 15, color: dark ? '#A1A1AA' : '#4B5563', lineHeight: 1.7, maxWidth: 380 }}>
                    {description}
                </p>
            </div>

            {/* Stats */}
            {stats && stats.length > 0 && (
                <div className="flex gap-8" style={{ position: 'relative', zIndex: 1 }}>
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <div className="font-mono flex items-center gap-2" style={{ fontSize: 24, fontWeight: 700, color: dark ? '#F4F4F5' : '#1A1A2E' }}>
                                {/* Small inline icons for stats could be added here if desired */}
                                {stat.value}
                            </div>
                            <div style={{ fontSize: 11, color: dark ? '#9CA3AF' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
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
