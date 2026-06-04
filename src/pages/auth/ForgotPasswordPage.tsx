// ============================================================
// ForgotPasswordPage — Matches LoginPage design system exactly
// Split-panel · AuthVisual left · Email form right
// ============================================================

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthVisual from '@/components/auth/AuthVisual';
import { useUIStore } from '@/stores/uiStore';
import { forgotPassword } from '@/services/authService';
import { Dropdown } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

type Step = 'form' | 'loading' | 'success';

const ForgotPasswordPage: React.FC = () => {
    const { themeMode, toggleTheme } = useUIStore();
    const { t, i18n } = useTranslation();
    const dark = themeMode === 'dark';

    const [email, setEmail] = useState('');
    const [step, setStep] = useState<Step>('form');
    const [emailError, setEmailError] = useState('');

    const languageMenuItems = [
        { key: 'fr', label: 'Français (FR)' },
        { key: 'ar', label: 'العربية (AR)' },
        { key: 'en', label: 'English (EN)' },
    ];

    const validateEmail = (value: string) => {
        if (!value) return 'L\'adresse e-mail est requise.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Format d\'e-mail invalide.';
        return '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validateEmail(email);
        if (err) { setEmailError(err); return; }
        setEmailError('');
        setStep('loading');
        try {
            await forgotPassword(email.trim().toLowerCase());
        } catch {
            // Always show success — anti-enumeration
        }
        setStep('success');
    };

    /* ── Shared styles ── */
    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '13px 16px 13px 44px',
        background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
        border: emailError
            ? '1px solid #f10316'
            : dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        color: dark ? '#F4F4F5' : '#1A1A2E',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        outline: 'none',
        transition: 'all 0.3s',
        backdropFilter: 'blur(8px)',
        boxSizing: 'border-box',
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
            {/* Top Left: Back to Login */}
            <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 10 }}>
                <Link
                    to="/login"
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
                    {t('auth_page.backToLogin', 'RETOUR CONNEXION')}
                </Link>
            </div>

            {/* Top Right: Language + Theme */}
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

            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="auth-container"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    width: '100%',
                    maxWidth: 1100,
                    borderRadius: 24,
                    overflow: 'hidden',
                    background: dark ? '#1A1A1E' : '#FFFFFF',
                    border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                    boxShadow: dark ? '0 20px 80px rgba(0,0,0,0.8)' : '0 20px 80px rgba(0,0,0,0.1)',
                }}
            >
                {/* Left Panel */}
                <AuthVisual
                    headline={t('auth_page.heroForgotTitle', 'Récupérez votre accès en quelques secondes')}
                    description={t('auth_page.heroForgotDesc', 'Saisissez votre e-mail et nous vous enverrons un lien sécurisé pour réinitialiser votre mot de passe.')}
                    stats={[
                        { value: '🔒', label: t('auth_page.statsSecure', 'Lien sécurisé') },
                        { value: '60', label: t('auth_page.statsMinutes', 'Minutes de validité') },
                        { value: '1', label: t('auth_page.statsClick', 'Clic pour réinitialiser') },
                    ]}
                />

                {/* Right Panel */}
                <div
                    className="auth-form-panel"
                    style={{
                        padding: '60px 60px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    <AnimatePresence mode="wait">

                        {/* ── FORM STEP ── */}
                        {step === 'form' && (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: 56, height: 56, borderRadius: 16,
                                    background: dark ? 'rgba(241,3,22,0.12)' : 'rgba(241,3,22,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 24,
                                    border: '1px solid rgba(241,3,22,0.2)',
                                }}>
                                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f10316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                        <circle cx="12" cy="16" r="1" fill="#f10316"/>
                                    </svg>
                                </div>

                                <h3 className="font-display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: dark ? '#F4F4F5' : '#1A1A2E' }}>
                                    {t('auth_page.forgotTitle', 'Mot de passe oublié ?')}
                                </h3>
                                <p style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280', marginBottom: 36, lineHeight: 1.6 }}>
                                    {t('auth_page.forgotSubtitle', 'Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.')}
                                </p>

                                <form onSubmit={handleSubmit} id="forgot-password-form">
                                    <div style={{ marginBottom: 24 }}>
                                        <label htmlFor="forgot-email-input" style={labelStyle}>
                                            {t('auth_page.emailAddress', 'Adresse e-mail')}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
                                                width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                stroke={emailError ? '#f10316' : dark ? '#A1A1AA' : '#6B7280'}
                                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                                <polyline points="22,6 12,13 2,6"/>
                                            </svg>
                                            <input
                                                id="forgot-email-input"
                                                type="email"
                                                placeholder="nom@crt.tn"
                                                style={inputStyle}
                                                value={email}
                                                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                                                required
                                                autoComplete="email"
                                                autoFocus
                                                onFocus={(e) => {
                                                    if (!emailError) {
                                                        e.currentTarget.style.borderColor = '#f10316';
                                                        e.currentTarget.style.background = dark ? 'rgba(241,3,22,0.05)' : 'rgba(241,3,22,0.02)';
                                                        e.currentTarget.style.boxShadow = dark ? '0 0 0 3px rgba(241,3,22,0.15)' : '0 0 0 3px rgba(241,3,22,0.1)';
                                                    }
                                                }}
                                                onBlur={(e) => {
                                                    if (!emailError) {
                                                        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                                                        e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)';
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }
                                                    const err = validateEmail(e.currentTarget.value);
                                                    if (err && e.currentTarget.value) setEmailError(err);
                                                }}
                                            />
                                        </div>
                                        {emailError && (
                                            <motion.p
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                style={{ color: '#f10316', fontSize: 12, marginTop: 6, marginBottom: 0 }}
                                            >
                                                {emailError}
                                            </motion.p>
                                        )}
                                    </div>

                                    <button
                                        id="forgot-password-submit-btn"
                                        type="submit"
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
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            boxShadow: dark ? '0 4px 24px rgba(241,3,22,0.4)' : '0 8px 24px rgba(241,3,22,0.3)',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#d90212';
                                            e.currentTarget.style.boxShadow = dark ? '0 8px 32px rgba(241,3,22,0.6)' : '0 12px 32px rgba(241,3,22,0.4)';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#f10316';
                                            e.currentTarget.style.boxShadow = dark ? '0 4px 24px rgba(241,3,22,0.4)' : '0 8px 24px rgba(241,3,22,0.3)';
                                            e.currentTarget.style.transform = 'none';
                                        }}
                                    >
                                        {t('auth_page.sendResetLink', 'Envoyer le lien de réinitialisation')}
                                    </button>
                                </form>

                                <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, color: dark ? '#A1A1AA' : '#6B7280' }}>
                                    {t('auth_page.rememberedPassword', 'Vous vous en souvenez ?')}{' '}
                                    <Link to="/login" style={{ color: '#f10316', fontWeight: 600, textDecoration: 'none' }}>
                                        {t('auth_page.backToLoginLink', 'Se connecter')}
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                        {/* ── LOADING STEP ── */}
                        {step === 'loading' && (
                            <motion.div
                                key="loading"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.3 }}
                                style={{ textAlign: 'center', padding: '40px 0' }}
                            >
                                <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto 28px' }}>
                                    <div style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        border: '3px solid rgba(241,3,22,0.2)',
                                        borderTopColor: '#f10316',
                                        animation: 'nexus-spin 0.8s linear infinite',
                                    }} />
                                    <svg style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                                        width="28" height="28" viewBox="0 0 24 24" fill="none"
                                        stroke="#f10316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                </div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, color: dark ? '#F4F4F5' : '#1A1A2E', marginBottom: 8 }}>
                                    Envoi en cours…
                                </h3>
                                <p style={{ color: dark ? '#A1A1AA' : '#6B7280', fontSize: 14 }}>
                                    Vérification et envoi de votre lien sécurisé.
                                </p>
                            </motion.div>
                        )}

                        {/* ── SUCCESS STEP ── */}
                        {step === 'success' && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                {/* Success icon */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                                    style={{
                                        width: 72, height: 72, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        margin: '0 0 28px',
                                        boxShadow: '0 8px 24px rgba(34,197,94,0.35)',
                                    }}
                                >
                                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </motion.div>

                                <h3 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 12, color: dark ? '#F4F4F5' : '#1A1A2E' }}>
                                    {t('auth_page.emailSentTitle', 'Vérifiez votre e-mail !')}
                                </h3>
                                <p style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280', marginBottom: 28, lineHeight: 1.7 }}>
                                    {t('auth_page.emailSentDesc',
                                        'Si cette adresse est associée à un compte, vous recevrez un lien de réinitialisation sous quelques minutes. Pensez à vérifier vos spams.'
                                    )}
                                </p>

                                {/* Email display card */}
                                <div style={{
                                    padding: '14px 18px',
                                    borderRadius: 12,
                                    background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    border: dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    marginBottom: 32,
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                        stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </svg>
                                    <span style={{ fontSize: 14, color: dark ? '#F4F4F5' : '#1A1A2E', fontWeight: 500 }}>
                                        {email || '…'}
                                    </span>
                                </div>

                                {/* Security info */}
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    background: dark ? 'rgba(241,3,22,0.05)' : 'rgba(241,3,22,0.04)',
                                    border: '1px solid rgba(241,3,22,0.15)',
                                    marginBottom: 32,
                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                }}>
                                    <span style={{ fontSize: 16 }}>⏰</span>
                                    <span style={{ fontSize: 13, color: dark ? '#A1A1AA' : '#6B7280', lineHeight: 1.6 }}>
                                        Le lien est <strong style={{ color: dark ? '#F4F4F5' : '#1A1A2E' }}>valable 60 minutes</strong> et ne peut être utilisé qu'une seule fois.
                                    </span>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <button
                                        id="resend-email-btn"
                                        onClick={() => setStep('form')}
                                        style={{
                                            padding: '13px 0',
                                            borderRadius: 12,
                                            border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
                                            background: 'transparent',
                                            color: dark ? '#F4F4F5' : '#1A1A2E',
                                            fontSize: 14, fontWeight: 600, cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        ↺ {t('auth_page.resendEmail', 'Renvoyer un e-mail')}
                                    </button>
                                    <Link
                                        to="/login"
                                        style={{
                                            display: 'block', textAlign: 'center',
                                            padding: '13px 0', borderRadius: 12,
                                            background: '#f10316', color: 'white',
                                            fontSize: 14, fontWeight: 600, textDecoration: 'none',
                                            boxShadow: dark ? '0 4px 20px rgba(241,3,22,0.35)' : '0 4px 16px rgba(241,3,22,0.25)',
                                            transition: 'all 0.3s',
                                        }}
                                    >
                                        {t('auth_page.backToLoginLink', 'Se connecter')}
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>

                    {/* Keyframes */}
                    <style>{`
                        @keyframes nexus-spin { to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPasswordPage;
