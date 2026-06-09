// ============================================================
// ThemeToggle — Light / Dark mode toggle with modern glassmorphic SVG icons
// ============================================================

import { useUIStore } from '@/stores';
import { useEffect, useState } from 'react';

const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { themeMode, toggleTheme } = useUIStore();
    const [isHovered, setIsHovered] = useState(false);

    // Sync data-theme attribute on <html>
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', themeMode);
    }, [themeMode]);

    const isDark = themeMode === 'dark';

    return (
        <button
            onClick={toggleTheme}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`flex items-center justify-center cursor-pointer ${className}`}
            style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: `1px solid ${isHovered ? 'rgba(241,3,22,0.35)' : 'var(--glass-border)'}`,
                background: isHovered
                    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)')
                    : 'var(--glass-bg)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                color: 'var(--text-primary)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isHovered
                    ? '0 4px 20px rgba(241,3,22,0.12), inset 0 1px 0 rgba(255,255,255,0.06)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                position: 'relative',
                overflow: 'hidden',
            }}
            aria-label={isDark ? 'Basculer en mode clair' : 'Basculer en mode sombre'}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
            {/* Subtle glow behind icon */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 12,
                    background: isDark
                        ? 'radial-gradient(circle at center, rgba(255,200,50,0.08) 0%, transparent 70%)'
                        : 'radial-gradient(circle at center, rgba(100,100,200,0.06) 0%, transparent 70%)',
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                }}
            />

            {/* Sun icon (shown in dark mode → click to go light) */}
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    position: 'absolute',
                    opacity: isDark ? 1 : 0,
                    transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {/* Sun circle */}
                <circle
                    cx="12"
                    cy="12"
                    r="4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    fill="none"
                    style={{ filter: 'drop-shadow(0 0 3px rgba(255,200,50,0.3))' }}
                />
                {/* Sun rays */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    const x1 = 12 + 6.5 * Math.cos(rad);
                    const y1 = 12 + 6.5 * Math.sin(rad);
                    const x2 = 12 + 8.5 * Math.cos(rad);
                    const y2 = 12 + 8.5 * Math.sin(rad);
                    return (
                        <line
                            key={angle}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        />
                    );
                })}
            </svg>

            {/* Moon icon (shown in light mode → click to go dark) */}
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                    position: 'absolute',
                    opacity: isDark ? 0 : 1,
                    transform: isDark ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)',
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                <path
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    style={{ filter: 'drop-shadow(0 0 3px rgba(100,100,200,0.2))' }}
                />
                {/* Stars near moon */}
                <circle cx="18" cy="6" r="0.8" fill="currentColor" opacity="0.5" />
                <circle cx="20.5" cy="9" r="0.5" fill="currentColor" opacity="0.35" />
            </svg>
        </button>
    );
};

export default ThemeToggle;
