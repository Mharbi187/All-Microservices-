// ============================================================
// CRTHeader — Sticky dark header with CRT branding
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';

const navLinks = [
    { label: 'Martaires', href: '#martyrs' },
    { label: 'El services', href: '#services' },
    { label: 'Publications', href: '#publications' },
    { label: 'Contection', href: '#contact' },
];

const CRTHeader: React.FC = () => {
    const [active, setActive] = useState('El services');

    return (
        <header className="crt-header">
            {/* Logo */}
            <Link to="/" className="crt-header__logo">
                <img
                    src="/logo.jpg"
                    alt="Croissant Rouge Tunisien"
                    className="crt-header__logo-icon"
                    style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                />
                <span className="crt-header__logo-text">CRT</span>
            </Link>

            {/* Navigation */}
            <ul className="crt-header__nav">
                {navLinks.map((link) => (
                    <li key={link.label}>
                        <a
                            href={link.href}
                            className={active === link.label ? 'active' : ''}
                            onClick={(e) => {
                                e.preventDefault();
                                setActive(link.label);
                                const el = document.getElementById(link.href.replace('#', ''));
                                el?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            {link.label}
                        </a>
                    </li>
                ))}
            </ul>

            {/* Connexion Button */}
            <Link to="/login" className="crt-header__btn">
                Connexion
            </Link>
        </header>
    );
};

export default CRTHeader;
