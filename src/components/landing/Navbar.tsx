// ============================================================
// Navbar — Light responsive CRT nav
// White bg, logo left, links center (desktop), hamburger right
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from 'antd';
import { GlobalOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

const Navbar: React.FC = () => {
    const { t, i18n } = useTranslation();
    const isAuthenticated = useAuthStore(s => s.isAuthenticated);

    const navLinks = [
        { label: t('nav.home', 'Accueil'), href: '/' },
        { label: t('nav.about', 'À Propos'), href: '/about' },
        { label: t('nav.modules', 'Modules'), href: '/#modules' },
        { label: t('nav.news', 'Actualités'), href: '/#news' },
        { label: t('nav.contact', 'Contact'), href: '/#contact' },
    ];

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
    };

    const languageMenuItems = [
        { key: 'fr', label: 'Français (FR)' },
        { key: 'ar', label: 'العربية (AR)' },
        { key: 'en', label: 'English (EN)' },
    ];
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const themeMode = useUIStore(s => s.themeMode);
    const dark = themeMode === 'dark';
    const toggleTheme = useUIStore(s => s.toggleTheme);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => { setMobileOpen(false); }, [location]);

    const handleAnchorClick = (e: React.MouseEvent, href: string) => {
        if (href.startsWith('/#')) {
            const id = href.replace('/#', '');
            const el = document.getElementById(id);
            if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth' }); }
        }
    };

    return (
        <nav
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: scrolled ? '10px 32px' : '14px 32px',
                background: scrolled ? (dark ? 'rgba(18,18,20,0.95)' : 'rgba(255,255,255,0.98)') : (dark ? 'rgba(18,18,20,0.85)' : 'rgba(255,255,255,0.93)'),
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderBottom: scrolled ? (dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(200,16,46,0.12)') : (dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid rgba(0,0,0,0.05)'),
                boxShadow: scrolled ? '0 2px 24px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.03)',
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}
        >
            {/* ── Logo ── */}
            <Link
                to="/"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, zIndex: 2 }}
            >
                <img
                    src="/logo.jpg"
                    alt="CRT"
                    style={{
                        width: 38, height: 38,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid rgba(200,16,46,0.18)',
                        flexShrink: 0,
                    }}
                />
                <div style={{ lineHeight: 1.25 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: dark ? '#F4F4F5' : '#1A1A2E', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>
                        Nexus<span style={{ color: dark ? '#FC8181' : '#C8102E' }}>-AID</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: dark ? '#A1A1AA' : '#9CA3AF', fontWeight: 400, letterSpacing: '0.03em' }}>
                        Croissant-Rouge Tunisien
                    </div>
                </div>
            </Link>

            {/* ── Desktop Links (absolutely centred) ── */}
            <ul
                style={{
                    listStyle: 'none',
                    display: 'flex',
                    gap: 30,
                    position: 'absolute',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    margin: 0, padding: 0,
                }}
                className="nav-desktop-links"
            >
                {navLinks.map((link) => {
                    const isAnchor = link.href.startsWith('/#');
                    const isActive = !isAnchor && location.pathname === link.href;
                    const base: React.CSSProperties = {
                        textDecoration: 'none',
                        fontSize: 13.5,
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#C8102E' : (dark ? '#A1A1AA' : '#374151'),
                        letterSpacing: '0.02em',
                        transition: 'color 0.22s ease',
                        whiteSpace: 'nowrap',
                        position: 'relative',
                        paddingBottom: 3,
                    };
                    const inner = (
                        <>
                            {link.label}
                            {isActive && (
                                <span style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    height: 2, borderRadius: 1,
                                    background: '#C8102E',
                                }} />
                            )}
                        </>
                    );
                    return (
                        <li key={link.label}>
                            {isAnchor ? (
                                <a href={link.href} style={base}
                                    onClick={(e) => handleAnchorClick(e, link.href)}
                                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#C8102E')}
                                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = isActive ? '#C8102E' : (dark ? '#A1A1AA' : '#374151'))}
                                >{inner}</a>
                            ) : (
                                <Link to={link.href} style={base}
                                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#C8102E')}
                                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = isActive ? '#C8102E' : (dark ? '#A1A1AA' : '#374151'))}
                                >{inner}</Link>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* ── Desktop CTAs ── */}
            <div
                className="nav-desktop-cta"
                style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, zIndex: 2 }}
            >
                <button
                    onClick={toggleTheme}
                    style={{
                        width: 36, height: 36,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: dark ? 'rgba(255,255,255,0.05)' : 'transparent',
                        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(200,16,46,0.15)',
                        color: dark ? '#F4F4F5' : '#C8102E',
                        cursor: 'pointer',
                        transition: 'all 0.22s ease',
                        marginRight: 4,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,16,46,0.06)'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.2)' : '#C8102E'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'transparent'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,16,46,0.15)'; e.currentTarget.style.transform = 'none'; }}
                    aria-label="Changer le thème"
                >
                    {themeMode === 'light' ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                    )}
                </button>

                <Dropdown
                    menu={{
                        items: languageMenuItems,
                        onClick: (e) => changeLanguage(e.key),
                        selectedKeys: [i18n.language]
                    }}
                    placement="bottomRight"
                    trigger={['click']}
                >
                    <button
                        style={{
                            width: 36, height: 36,
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: dark ? 'rgba(255,255,255,0.05)' : 'transparent',
                            border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(200,16,46,0.15)',
                            color: dark ? '#F4F4F5' : '#C8102E',
                            cursor: 'pointer',
                            transition: 'all 0.22s ease',
                            marginRight: 8,
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,16,46,0.06)'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.2)' : '#C8102E'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'transparent'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,16,46,0.15)'; e.currentTarget.style.transform = 'none'; }}
                        aria-label="Changer la langue"
                    >
                        <GlobalOutlined style={{ fontSize: 16 }} />
                    </button>
                </Dropdown>
                {isAuthenticated ? (
                    <Link to="/dashboard"
                        title="Retour au Tableau de bord"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(200,16,46,0.08)',
                            color: dark ? '#F4F4F5' : '#C8102E',
                            border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(200,16,46,0.2)',
                            transition: 'all 0.22s ease',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(200,16,46,0.08)'; e.currentTarget.style.color = dark ? '#F4F4F5' : '#C8102E'; e.currentTarget.style.transform = 'none'; }}
                    >
                        <UserOutlined style={{ fontSize: 18 }} />
                    </Link>
                ) : (
                    <>
                        <Link to="/login"
                            style={{
                                padding: '7px 16px',
                                borderRadius: 100,
                                border: dark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(200,16,46,0.28)',
                                background: 'transparent',
                                color: dark ? '#F4F4F5' : '#C8102E',
                                fontSize: 13,
                                fontWeight: 500,
                                textDecoration: 'none',
                                transition: 'all 0.22s ease',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,16,46,0.06)'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.3)' : '#C8102E'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.15)' : 'rgba(200,16,46,0.28)'; }}
                        >
                            {t('nav.login', 'Connexion')}
                        </Link>
                        <Link to="/register"
                            style={{
                                padding: '8px 20px',
                                borderRadius: 100,
                                background: '#C8102E',
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 600,
                                textDecoration: 'none',
                                boxShadow: '0 3px 12px rgba(200,16,46,0.36)',
                                transition: 'all 0.22s ease',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#9B0B22'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(200,16,46,0.48)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#C8102E'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(200,16,46,0.36)'; e.currentTarget.style.transform = 'none'; }}
                        >
                            {t('nav.register', "S'inscrire")}
                        </Link>
                    </>
                )}
            </div>

            {/* ── Mobile hamburger ── */}
            <button
                className="nav-mobile-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                style={{
                    flexShrink: 0,
                    zIndex: 2,
                    width: 40, height: 40,
                    borderRadius: 12,
                    border: dark ? '1.5px solid rgba(255,255,255,0.1)' : '1.5px solid rgba(200,16,46,0.2)',
                    background: mobileOpen ? (dark ? 'rgba(255,255,255,0.1)' : 'rgba(200,16,46,0.06)') : 'transparent',
                    cursor: 'pointer',
                    display: 'none',       /* hidden on desktop via CSS */
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 4,
                    transition: 'all 0.25s ease',
                    padding: 0,
                }}
            >
                {/* Animated burger lines */}
                <span style={{
                    display: 'block', width: 18, height: 1.8, borderRadius: 2,
                    background: dark ? '#F4F4F5' : '#374151',
                    transform: mobileOpen ? 'rotate(45deg) translate(4px,4px)' : 'none',
                    transition: 'transform 0.3s ease',
                }} />
                <span style={{
                    display: 'block', width: 18, height: 1.8, borderRadius: 2,
                    background: dark ? '#F4F4F5' : '#374151',
                    opacity: mobileOpen ? 0 : 1,
                    transition: 'opacity 0.2s ease',
                }} />
                <span style={{
                    display: 'block', width: 18, height: 1.8, borderRadius: 2,
                    background: dark ? '#F4F4F5' : '#374151',
                    transform: mobileOpen ? 'rotate(-45deg) translate(4px,-4px)' : 'none',
                    transition: 'transform 0.3s ease',
                }} />
            </button>

            {/* ── Mobile Drawer ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.97 }}
                        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 12, right: 12,
                            background: dark ? '#1E1E22' : '#fff',
                            border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(200,16,46,0.1)',
                            borderRadius: 18,
                            padding: '16px 12px',
                            boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                        }}
                    >
                        {navLinks.map((link, i) => {
                            const isAnchor = link.href.startsWith('/#');
                            const ms: React.CSSProperties = {
                                textDecoration: 'none', color: dark ? '#E4E4E7' : '#374151',
                                fontSize: 15, fontWeight: 500,
                                padding: '11px 14px', borderRadius: 11,
                                display: 'block', transition: 'all 0.18s',
                            };
                            return (
                                <motion.div
                                    key={link.label}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    {isAnchor ? (
                                        <a href={link.href} style={ms}
                                            onClick={(e) => { handleAnchorClick(e, link.href); setMobileOpen(false); }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,16,46,0.06)'; e.currentTarget.style.color = '#C8102E'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                                        >{link.label}</a>
                                    ) : (
                                        <Link to={link.href} style={ms}
                                            onClick={() => setMobileOpen(false)}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,16,46,0.06)'; e.currentTarget.style.color = '#C8102E'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151'; }}
                                        >{link.label}</Link>
                                    )}
                                </motion.div>
                            );
                        })}
                        <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', margin: '6px 2px' }} />
                        
                        <div style={{ display: 'flex', gap: 8, padding: '0 4px', marginBottom: '8px' }}>
                            {languageMenuItems.map((item) => (
                                <button
                                    key={item.key}
                                    onClick={() => changeLanguage(item.key)}
                                    style={{
                                        flex: 1,
                                        padding: '8px', borderRadius: 8,
                                        background: i18n.language === item.key ? '#C8102E' : (dark ? 'rgba(255,255,255,0.05)' : 'rgba(200,16,46,0.04)'),
                                        color: i18n.language === item.key ? '#fff' : (dark ? '#F4F4F5' : '#C8102E'),
                                        border: 'none',
                                        fontSize: 13, fontWeight: i18n.language === item.key ? 600 : 500,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {item.key.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: '0 4px', marginBottom: '8px' }}>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    width: '100%',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '11px 14px', borderRadius: 11,
                                    background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(200,16,46,0.04)',
                                    border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(200,16,46,0.1)',
                                    color: dark ? '#F4F4F5' : '#C8102E',
                                    fontSize: 15, fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.18s'
                                }}
                            >
                                {themeMode === 'light' ? (
                                    <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> {t('nav.theme.dark', 'Mode Sombre')}</>
                                ) : (
                                    <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg> {t('nav.theme.light', 'Mode Clair')}</>
                                )}
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, padding: '2px' }}>
                            {isAuthenticated ? (
                                <Link to="/dashboard" onClick={() => setMobileOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '11px', borderRadius: 10, background: '#C8102E', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                                    Tableau de bord
                                </Link>
                            ) : (
                                <>
                                    <Link to="/login" onClick={() => setMobileOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '11px', borderRadius: 10, border: dark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(200,16,46,0.25)', color: dark ? '#F4F4F5' : '#C8102E', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
                                        {t('nav.login', 'Connexion')}
                                    </Link>
                                    <Link to="/register" onClick={() => setMobileOpen(false)} style={{ flex: 1, textAlign: 'center', padding: '11px', borderRadius: 10, background: '#C8102E', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                                        {t('nav.register', "S'inscrire")}
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Responsive CSS ── */}
            <style>{`
                .nav-desktop-links { display: flex; }
                .nav-desktop-cta   { display: flex; }
                .nav-mobile-btn    { display: none !important; }

                @media (max-width: 900px) {
                    .nav-desktop-links { display: none !important; }
                    .nav-desktop-cta   { display: none !important; }
                    .nav-mobile-btn    { display: flex !important; }
                }
            `}</style>
        </nav>
    );
};

export default Navbar;
