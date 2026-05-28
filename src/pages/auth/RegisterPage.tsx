// ============================================================
// RegisterPage — Full registration form with real API
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthVisual from '@/components/auth/AuthVisual';
import PasswordStrength from '@/components/auth/PasswordStrength';
import authService from '@/services/authService';
import apiClient from '@/services/api';
import type { UserType } from '@/types';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from 'react-i18next';
import { Dropdown } from 'antd';
import { GlobalOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const gouvernorats = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

const certifications = [
    { value: '', label: 'Aucune certification (débutant)' },
    { value: 'psc1', label: 'PSC1 — Premiers secours civiques niveau 1' },
    { value: 'pse1', label: 'PSE1 — Premiers secours en équipe niveau 1' },
    { value: 'pse2', label: 'PSE2 — Premiers secours en équipe niveau 2' },
    { value: 'formateur', label: 'Formateur secourisme certifié' },
];

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { themeMode, toggleTheme } = useUIStore();
    const { t, i18n } = useTranslation();
    const dark = themeMode === 'dark';

    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [committees, setCommittees] = useState<{ id: string; name: string; type: string }[]>([]);

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [cin, setCin] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [selectedCommittee, setSelectedCommittee] = useState('');

    const languageMenuItems = [
        { key: 'fr', label: 'Français (FR)' },
        { key: 'ar', label: 'العربية (AR)' },
        { key: 'en', label: 'English (EN)' },
    ];

    // Fetch real committees on mount
    useEffect(() => {
        apiClient.get<{ id: string; name: string; type: string; region: string }[]>(
            '/onboarding/public/committees/all'
        )
            .then(res => setCommittees(res.data))
            .catch(() => { /* committees will be empty, user can still type */ });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError(t('auth_page.passwordsNoMatch', 'Les mots de passe ne correspondent pas.'));
            return;
        }

        // Validate minimum age (16 years)
        if (birthDate) {
            const birth = new Date(birthDate);
            const today = new Date();
            const age = today.getFullYear() - birth.getFullYear() -
                (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
            if (age < 16) {
                setError(t('auth_page.ageError', 'Vous devez avoir au moins 16 ans pour vous inscrire.'));
                return;
            }
        }

        setIsLoading(true);

        try {
            const result = await authService.register({
                fullName: `${firstName} ${lastName}`,
                email,
                password,
                cin,
                phone,
                birthDate: birthDate || undefined,
                userType: 'VOLUNTEER' as UserType,
                committeeId: selectedCommittee || undefined,
                captchaToken: 'local-bypass',
            });
            setSuccess(result.message || 'Inscription réussie ! Votre compte est en attente de validation.');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr?.response?.data?.message || 'Erreur lors de l\'inscription. Veuillez réessayer.');
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '13px 16px',
        background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        color: dark ? '#F4F4F5' : '#1A1A2E',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        outline: 'none',
        transition: 'all 0.3s',
        backdropFilter: 'blur(8px)',
        colorScheme: dark ? 'dark' : 'light',
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        appearance: 'auto' as React.CSSProperties['appearance'],
    };

    const optionStyle: React.CSSProperties = {
        background: dark ? '#1A1A1E' : '#FFFFFF',
        color: dark ? '#F4F4F5' : '#1A1A2E',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: dark ? '#A1A1AA' : '#6B7280',
        marginBottom: 8,
    };

    const focusHandlers = {
        onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = '#f10316';
            e.currentTarget.style.background = dark ? 'rgba(241,3,22,0.05)' : 'rgba(241,3,22,0.02)';
            e.currentTarget.style.boxShadow = dark ? '0 0 0 3px rgba(241,3,22,0.15)' : '0 0 0 3px rgba(241,3,22,0.1)';
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
            e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)';
            e.currentTarget.style.boxShadow = 'none';
        },
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: dark ? '#111215' : '#F5F6F8',
            padding: 20,
            position: 'relative',
        }}>
            {/* Top Left Action: Home */}
            <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 10 }}>
                <Link
                    to="/"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        border: '1px solid ' + (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                        borderRadius: 20, padding: '6px 14px',
                        cursor: 'pointer', color: dark ? '#A1A1AA' : '#6B7280',
                        fontSize: 12, fontWeight: 600, textDecoration: 'none',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = dark ? '#F4F4F5' : '#1A1A2E'; e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = dark ? '#A1A1AA' : '#6B7280'; e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'; }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    {t('auth_page.backHome', 'RETOUR ACCUEIL')}
                </Link>
            </div>

            {/* Top Right Actions: Language + Theme Toggle */}
            <div style={{ position: 'absolute', top: 30, right: 30, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Dropdown
                    menu={{
                        items: languageMenuItems,
                        onClick: (e) => i18n.changeLanguage(e.key),
                        selectedKeys: [i18n.language],
                    }}
                    placement="bottomRight"
                    trigger={['click']}
                >
                    <button
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 36, height: 36, borderRadius: '50%',
                            background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                            border: 'none', cursor: 'pointer',
                            color: dark ? '#F4F4F5' : '#1A1A2E', fontSize: 16,
                        }}
                        aria-label="Changer la langue"
                    >
                        <GlobalOutlined />
                    </button>
                </Dropdown>
                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        border: 'none', borderRadius: 20, padding: '6px 12px',
                        cursor: 'pointer', color: dark ? '#F4F4F5' : '#1A1A2E',
                        fontSize: 12, fontWeight: 600,
                    }}
                >
                    {dark ? t('nav.theme.light', 'Mode Clair') : t('nav.theme.dark', 'Mode Sombre')}
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: dark ? '#4ade80' : '#C8102E', position: 'relative' }}>
                        <div style={{
                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 2, left: dark ? 18 : 2, transition: 'all 0.3s'
                        }} />
                    </div>
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="auth-container"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1.2fr',
                    width: '100%',
                    maxWidth: 1200,
                    borderRadius: 24,
                    overflow: 'hidden',
                    background: dark ? '#1A1A1E' : '#FFFFFF',
                    border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                    boxShadow: dark ? '0 20px 80px rgba(0,0,0,0.8)' : '0 20px 80px rgba(0,0,0,0.1)',
                }}
            >
                <AuthVisual
                    headline={t("auth_page.heroRegTitle", "Rejoignez le réseau humanitaire national")}
                    description={t("auth_page.heroRegDesc", "Créez votre profil volontaire et commencez à contribuer à travers les 24 gouvernorats tunisiens.")}
                    stats={[
                        { value: 'PSC1', label: t('auth_page.statsBase', 'Formation base') },
                        { value: '36M', label: t('auth_page.statsSupport', 'Support') },
                    ]}
                />

                <div
                    className="auth-form-panel"
                    style={{
                        padding: '50px 50px',
                        overflowY: 'auto',
                        maxHeight: '90vh',
                    }}
                >
                    <h3
                        className="font-display"
                        style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: dark ? '#F4F4F5' : '#1A1A2E' }}
                    >
                        {t('auth_page.registerTitle', 'Créer un compte')}
                    </h3>
                    <div style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280', marginBottom: 30 }}>
                        {t('auth_page.registerSubtitle', 'Profil volontaire — Croissant Rouge Tunisien')}
                    </div>

                    {/* Success message */}
                    {success && (
                        <div style={{ background: dark ? 'rgba(22,163,106,0.15)' : 'rgba(22,163,106,0.1)', border: dark ? '1px solid rgba(22,163,106,0.4)' : '1px solid rgba(22,163,106,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: dark ? '#4ade80' : '#16a34a', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircleOutlined /> {success}
                        </div>
                    )}

                    {/* Error message */}
                    {error && (
                        <div style={{ background: dark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)', border: dark ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: dark ? '#f87171' : '#ef4444', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CloseCircleOutlined /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Name Row */}
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            <div>
                                <label style={labelStyle}>{t("auth_page.firstName", "Prénom")}</label>
                                <input type="text" placeholder="Mohamed" style={inputStyle} required {...focusHandlers}
                                    value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t("auth_page.lastName", "Nom")}</label>
                                <input type="text" placeholder="Ben Ali" style={inputStyle} required {...focusHandlers}
                                    value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            </div>
                        </div>

                        {/* CIN + DOB */}
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            <div>
                                <label style={labelStyle}>{t("auth_page.cin", "CIN")}</label>
                                <input type="text" placeholder="12345678" maxLength={8} style={inputStyle} required {...focusHandlers}
                                    value={cin} onChange={(e) => setCin(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t("auth_page.dob", "Date de naissance")}</label>
                                <input
                                    type="date"
                                    style={inputStyle}
                                    required
                                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]}
                                    value={birthDate}
                                    onChange={(e) => setBirthDate(e.target.value)}
                                    {...focusHandlers}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>{t("auth_page.email", "Email")}</label>
                            <div style={{ position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                <input
                                    type="email"
                                    placeholder="email@exemple.tn"
                                    style={{ ...inputStyle, paddingLeft: 44 }}
                                    required
                                    {...focusHandlers}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Phone + Gouvernorat */}
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            <div>
                                <label style={labelStyle}>{t("auth_page.phone", "Téléphone")}</label>
                                <input type="tel" placeholder="+216 XX XXX XXX" style={inputStyle} {...focusHandlers}
                                    value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t("auth_page.governorate", "Gouvernorat")}</label>
                                <select style={selectStyle} required {...focusHandlers}>
                                    <option style={optionStyle} value="" disabled>{t("auth_page.selectGov", "Sélectionner...")}</option>
                                    {gouvernorats.map((g) => (
                                        <option style={optionStyle} key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Comité — dynamic from API */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>{t("auth_page.committee", "Comité d'affiliation")}</label>
                            <select style={selectStyle} required {...focusHandlers}
                                value={selectedCommittee} onChange={(e) => setSelectedCommittee(e.target.value)}>
                                <option style={optionStyle} value="" disabled>{t("auth_page.selectCommittee", "Sélectionner votre comité...")}</option>
                                {committees.map((c) => (
                                    <option style={optionStyle} key={c.id} value={c.id}>{c.name} ({c.type})</option>
                                ))}
                            </select>
                        </div>

                        {/* Certification */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>{t("auth_page.certification", "Certification secourisme")}</label>
                            <select style={selectStyle} {...focusHandlers}>
                                {certifications.map((c) => (
                                    <option style={optionStyle} key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Passwords */}
                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                            <div>
                                <label style={labelStyle}>{t("auth_page.password", "Mot de passe")}</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        style={{ ...inputStyle, paddingRight: 40 }}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        {...focusHandlers}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        {showPassword ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                                <line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <PasswordStrength password={password} />
                            </div>
                            <div>
                                <label style={labelStyle}>{t("auth_page.confirmPassword", "Confirmer le mot de passe")}</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        style={{ ...inputStyle, paddingRight: 40 }}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        {...focusHandlers}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        {showConfirmPassword ? (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                                <line x1="1" y1="1" x2="23" y2="23"/>
                                            </svg>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Terms */}
                        <div style={{ marginBottom: 24 }}>
                            <label
                                className="flex items-start gap-2 cursor-pointer"
                                style={{ fontSize: 13, color: dark ? '#A1A1AA' : '#6B7280', fontWeight: 400 }}
                            >
                                <input
                                    type="checkbox"
                                    checked={acceptTerms}
                                    onChange={(e) => setAcceptTerms(e.target.checked)}
                                    required
                                    style={{ accentColor: '#f10316', marginTop: 2 }}
                                />
                                <span>
                                    {t('auth_page.acceptTerms', "J'accepte les conditions d'utilisation et la politique de confidentialité du CRT")}
                                </span>
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: 15,
                                borderRadius: 12,
                                border: 'none',
                                background: '#f10316',
                                color: 'white',
                                fontFamily: 'var(--font-body)',
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: dark ? '0 4px 24px rgba(241,3,22,0.4)' : '0 8px 24px rgba(241,3,22,0.3)',
                                opacity: isLoading ? 0.7 : 1,
                            }}
                            onMouseEnter={(e) => {
                                if (!isLoading) {
                                    e.currentTarget.style.background = '#d90212';
                                    e.currentTarget.style.boxShadow = dark ? '0 8px 32px rgba(241,3,22,0.6)' : '0 12px 32px rgba(241,3,22,0.4)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isLoading) {
                                    e.currentTarget.style.background = '#f10316';
                                    e.currentTarget.style.boxShadow = dark ? '0 4px 24px rgba(241,3,22,0.4)' : '0 8px 24px rgba(241,3,22,0.3)';
                                    e.currentTarget.style.transform = 'none';
                                }
                            }}
                        >
                            {isLoading ? t('auth_page.registering', '⏳ Création en cours...') : t('auth_page.registerBtn', 'Créer mon profil volontaire')}
                        </button>
                    </form>

                    {/* Switch */}
                    <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280' }}>
                        {t('auth_page.alreadyAccount', 'Déjà un compte ?')}{' '}
                        <Link to="/login" style={{ color: '#f10316', fontWeight: 600, textDecoration: 'none' }}>
                            {t('auth.login', 'Se connecter')}
                        </Link>
                    </div>
                </div>

                <style>{`
                    @media (max-width: 1024px) {
                        .auth-container { grid-template-columns: 1fr !important; max-width: 600px !important; }
                        .auth-visual-panel { min-height: 300px !important; padding: 40px 36px !important; }
                        .auth-form-panel { padding: 40px 36px !important; max-height: none !important; }
                    }
                    @media (max-width: 640px) {
                        .auth-container { border-radius: 24px !important; }
                        .auth-visual-panel, .auth-form-panel { padding: 36px 28px !important; }
                        .form-row { grid-template-columns: 1fr !important; }
                    }
                `}</style>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
