// ============================================================
// Navbar — Glass-morphism fixed navigation with mobile menu
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/common/Logo';
import ThemeToggle from '@/components/common/ThemeToggle';
import { IconMenu, IconX } from '@/components/common/SvgIcons';

const navLinks = [
    { label: 'Services', href: '/#modules' },
    { label: 'Actualités & Publications', href: '/#news' },
    { label: 'Contact', href: '/#contact' },
    { label: 'À Propos', href: '/about' },
];


const Navbar: React.FC = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location]);

    const handleAnchorClick = (e: React.MouseEvent, href: string) => {
        if (href.startsWith('/#')) {
            const id = href.replace('/#', '');
            const el = document.getElementById(id);
            if (el) {
                e.preventDefault();
                el.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <nav
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 100,
                padding: scrolled ? '12px 48px' : '16px 48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: scrolled ? 'var(--nav-bg-scrolled)' : 'var(--nav-bg)',
                backdropFilter: 'var(--glass-blur)',
                WebkitBackdropFilter: 'var(--glass-blur)',
                borderBottom: '1px solid var(--glass-border)',
                transition: 'all 0.4s ease',
            }}
        >
            <Logo size="md" linkTo="/" />

            {/* Desktop Links */}
            <ul
                className="hidden lg:flex items-center gap-9"
                style={{ listStyle: 'none' }}
            >
                {navLinks.map((link) => {
                    const isPage = !link.href.startsWith('/#');
                    const linkStyle: React.CSSProperties = {
                        textDecoration: 'none',
                        color: 'var(--text-secondary)',
                        fontSize: 14,
                        fontWeight: 500,
                        letterSpacing: '0.04em',
                        transition: 'color 0.3s',
                        position: 'relative',
                    };
                    const hoverIn = (e: React.MouseEvent) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-primary)');
                    const hoverOut = (e: React.MouseEvent) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)');
                    const underline = (
                        <span
                            style={{
                                position: 'absolute',
                                bottom: -4,
                                left: 0,
                                right: 0,
                                height: 1,
                                background: 'var(--red)',
                                transform: 'scaleX(0)',
                                transition: 'transform 0.3s',
                            }}
                            className="group-hover:scale-x-100"
                        />
                    );
                    return (
                        <li key={link.label}>
                            {isPage ? (
                                <Link to={link.href} className="relative group" style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                                    {link.label}{underline}
                                </Link>
                            ) : (
                                <a href={link.href} onClick={(e) => handleAnchorClick(e, link.href)} className="relative group" style={linkStyle} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                                    {link.label}{underline}
                                </a>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
                <ThemeToggle />
                <Link
                    to="/login"
                    style={{
                        padding: '9px 22px',
                        borderRadius: 100,
                        border: '1px solid var(--glass-border)',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        fontSize: 14,
                        fontWeight: 500,
                        textDecoration: 'none',
                        backdropFilter: 'blur(6px)',
                        transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--pink)';
                        e.currentTarget.style.color = 'var(--pink)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                >
                    Connexion
                </Link>
                <Link
                    to="/register"
                    style={{
                        padding: '9px 24px',
                        borderRadius: 100,
                        border: 'none',
                        background: 'var(--red)',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 600,
                        textDecoration: 'none',
                        boxShadow: '0 4px 20px rgba(241,3,22,0.35)',
                        transition: 'all 0.3s',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--crimson)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 28px rgba(241,3,22,0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--red)';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(241,3,22,0.35)';
                    }}
                >
                    S'inscrire
                </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex lg:hidden items-center gap-3">
                <ThemeToggle />
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        border: '1px solid var(--glass-border)',
                        background: 'var(--glass-bg)',
                        backdropFilter: 'blur(8px)',
                        color: 'var(--text-primary)',
                        fontSize: 20,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    aria-label="Toggle mobile menu"
                >
                    {mobileOpen ? <IconX size={18} /> : <IconMenu size={18} />}
                </button>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'var(--nav-bg-scrolled)',
                            backdropFilter: 'var(--glass-blur)',
                            WebkitBackdropFilter: 'var(--glass-blur)',
                            borderBottom: '1px solid var(--glass-border)',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                    >
                        {navLinks.map((link) => {
                            const isPage = !link.href.startsWith('/#');
                            const mobileStyle: React.CSSProperties = {
                                textDecoration: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: 16,
                                fontWeight: 500,
                                padding: '8px 0',
                                borderBottom: '1px solid var(--card-border)',
                                display: 'block',
                            };
                            return isPage ? (
                                <Link key={link.label} to={link.href} onClick={() => setMobileOpen(false)} style={mobileStyle}>
                                    {link.label}
                                </Link>
                            ) : (
                                <a key={link.label} href={link.href} onClick={(e) => { handleAnchorClick(e, link.href); setMobileOpen(false); }} style={mobileStyle}>
                                    {link.label}
                                </a>
                            );
                        })}
                        <div className="flex gap-3 pt-2">
                            <Link
                                to="/login"
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '12px',
                                    borderRadius: 12,
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-primary)',
                                    textDecoration: 'none',
                                    fontSize: 14,
                                    fontWeight: 500,
                                }}
                            >
                                Connexion
                            </Link>
                            <Link
                                to="/register"
                                onClick={() => setMobileOpen(false)}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    padding: '12px',
                                    borderRadius: 12,
                                    background: 'var(--red)',
                                    color: 'white',
                                    textDecoration: 'none',
                                    fontSize: 14,
                                    fontWeight: 600,
                                }}
                            >
                                S'inscrire
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
