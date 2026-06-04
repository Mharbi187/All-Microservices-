// ============================================================
// ResetPasswordPage — Token-based password reset
// Matches LoginPage / ForgotPasswordPage design system exactly
// ============================================================

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthVisual from '@/components/auth/AuthVisual';
import { useUIStore } from '@/stores/uiStore';
import { resetPassword } from '@/services/authService';
import { useTranslation } from 'react-i18next';

type Step = 'form' | 'loading' | 'success' | 'error';

/* Password strength helpers */
const strengthChecks = [
    { label: '8+ caractères',         test: (p: string) => p.length >= 8 },
    { label: '1 majuscule',           test: (p: string) => /[A-Z]/.test(p) },
    { label: '1 minuscule',           test: (p: string) => /[a-z]/.test(p) },
    { label: '1 chiffre',             test: (p: string) => /\d/.test(p) },
    { label: '1 caractère spécial',   test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(p) },
];

const getStrengthLevel = (password: string): { score: number; label: string; color: string } => {
    const passed = strengthChecks.filter(c => c.test(password)).length;
    if (passed <= 1) return { score: passed, label: 'Très faible', color: '#ef4444' };
    if (passed === 2) return { score: passed, label: 'Faible',     color: '#f97316' };
    if (passed === 3) return { score: passed, label: 'Moyen',      color: '#eab308' };
    if (passed === 4) return { score: passed, label: 'Fort',       color: '#22c55e' };
    return                { score: passed, label: 'Très fort',    color: '#16a34a' };
};

const ResetPasswordPage: React.FC = () => {
    const { themeMode } = useUIStore();
    const { t } = useTranslation();
    const dark = themeMode === 'dark';
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [step, setStep] = useState<Step>('form');
    const [errorMsg, setErrorMsg] = useState('');
    const [redirectSecs, setRedirectSecs] = useState(5);

    // If no token in URL, immediately show error
    useEffect(() => {
        if (!token) setStep('error');
    }, [token]);

    // Auto-redirect countdown after success
    useEffect(() => {
        if (step !== 'success') return;
        const interval = setInterval(() => {
            setRedirectSecs(s => {
                if (s <= 1) { clearInterval(interval); navigate('/login'); return 0; }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [step, navigate]);

    const strength = getStrengthLevel(password);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) { setErrorMsg('Les mots de passe ne correspondent pas.'); return; }
        if (strength.score < 5) { setErrorMsg('Le mot de passe ne respecte pas tous les critères de sécurité.'); return; }
        setErrorMsg('');
        setStep('loading');
        try {
            await resetPassword(token, password);
            setStep('success');
        } catch (err: unknown) {
            const msg = (err as Error)?.message || 'Une erreur est survenue. Veuillez réessayer.';
            setErrorMsg(msg);
            setStep('error');
        }
    };

    /* ── Shared styles ── */
    const baseInput: React.CSSProperties = {
        width: '100%',
        padding: '13px 44px 13px 44px',
        background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
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

    const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = '#f10316';
        e.currentTarget.style.background = dark ? 'rgba(241,3,22,0.05)' : 'rgba(241,3,22,0.02)';
        e.currentTarget.style.boxShadow = dark ? '0 0 0 3px rgba(241,3,22,0.15)' : '0 0 0 3px rgba(241,3,22,0.1)';
    };

    const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)';
        e.currentTarget.style.boxShadow = 'none';
    };

    const LockIcon = ({ color }: { color?: string }) => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={color ?? (dark ? '#A1A1AA' : '#6B7280')}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
    );

    const EyeIcon = ({ open }: { open: boolean }) => open ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    );

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
            {/* Top Left: Back to login */}
            <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 10 }}>
                <Link to="/login" style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    border: '1px solid ' + (dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                    borderRadius: 20, padding: '6px 14px',
                    color: dark ? '#A1A1AA' : '#6B7280',
                    fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'all 0.2s'
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    {t('auth_page.backToLoginLink', 'Se connecter')}
                </Link>
            </div>

            {/* Main card */}
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
                    headline={t('auth_page.heroResetTitle', 'Choisissez un nouveau mot de passe sécurisé')}
                    description={t('auth_page.heroResetDesc', 'Votre nouveau mot de passe doit être fort et unique pour protéger votre compte Nexus-AID.')}
                    stats={[
                        { value: '🔐', label: t('auth_page.statsEncrypted', 'Chiffré bcrypt') },
                        { value: '5',  label: t('auth_page.statsCriteria', 'Critères de sécurité') },
                        { value: '1×', label: t('auth_page.statsOneUse', 'Lien unique') },
                    ]}
                />

                {/* Right Panel */}
                <div className="auth-form-panel" style={{ padding: '60px 60px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">

                        {/* ── FORM ── */}
                        {(step === 'form' || step === 'loading') && (
                            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                                {/* Icon */}
                                <div style={{
                                    width: 56, height: 56, borderRadius: 16,
                                    background: dark ? 'rgba(241,3,22,0.12)' : 'rgba(241,3,22,0.08)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 24, border: '1px solid rgba(241,3,22,0.2)',
                                }}>
                                    <LockIcon color="#f10316" />
                                </div>

                                <h3 className="font-display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: dark ? '#F4F4F5' : '#1A1A2E' }}>
                                    {t('auth_page.resetTitle', 'Nouveau mot de passe')}
                                </h3>
                                <p style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280', marginBottom: 32, lineHeight: 1.6 }}>
                                    {t('auth_page.resetSubtitle', 'Choisissez un mot de passe fort pour sécuriser votre compte.')}
                                </p>

                                <form onSubmit={handleSubmit} id="reset-password-form">
                                    {/* New Password */}
                                    <div style={{ marginBottom: 20 }}>
                                        <label htmlFor="new-password-input" style={labelStyle}>
                                            {t('auth_page.newPassword', 'Nouveau mot de passe')}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                <LockIcon />
                                            </span>
                                            <input
                                                id="new-password-input"
                                                type={showPwd ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                style={baseInput}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                autoFocus
                                                onFocus={onFocus}
                                                onBlur={onBlur}
                                            />
                                            <button type="button" onClick={() => setShowPwd(!showPwd)}
                                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                <EyeIcon open={showPwd} />
                                            </button>
                                        </div>

                                        {/* Strength bar */}
                                        {password.length > 0 && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginTop: 10 }}>
                                                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                                                    {[1,2,3,4,5].map(i => (
                                                        <div key={i} style={{
                                                            flex: 1, height: 4, borderRadius: 2,
                                                            background: i <= strength.score ? strength.color : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                                                            transition: 'background 0.3s',
                                                        }} />
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 8px', justifyContent: 'flex-end' }}>
                                                        {strengthChecks.map((c) => (
                                                            <span key={c.label} style={{
                                                                fontSize: 10, fontWeight: 500,
                                                                color: c.test(password) ? '#22c55e' : (dark ? '#71717A' : '#9CA3AF'),
                                                                transition: 'color 0.2s',
                                                            }}>
                                                                {c.test(password) ? '✓' : '○'} {c.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Confirm Password */}
                                    <div style={{ marginBottom: 28 }}>
                                        <label htmlFor="confirm-password-input" style={labelStyle}>
                                            {t('auth_page.confirmPassword', 'Confirmer le mot de passe')}
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                                                <LockIcon color={confirm && confirm !== password ? '#f10316' : undefined} />
                                            </span>
                                            <input
                                                id="confirm-password-input"
                                                type={showConfirm ? 'text' : 'password'}
                                                placeholder="••••••••"
                                                style={{
                                                    ...baseInput,
                                                    borderColor: confirm && confirm !== password ? '#f10316' : undefined,
                                                }}
                                                value={confirm}
                                                onChange={(e) => setConfirm(e.target.value)}
                                                required
                                                onFocus={onFocus}
                                                onBlur={onBlur}
                                            />
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                                <EyeIcon open={showConfirm} />
                                            </button>
                                        </div>
                                        {confirm && confirm !== password && (
                                            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                                style={{ color: '#f10316', fontSize: 12, marginTop: 6 }}>
                                                Les mots de passe ne correspondent pas.
                                            </motion.p>
                                        )}
                                        {confirm && confirm === password && (
                                            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                                style={{ color: '#22c55e', fontSize: 12, marginTop: 6 }}>
                                                ✓ Les mots de passe correspondent.
                                            </motion.p>
                                        )}
                                    </div>

                                    {/* Global error */}
                                    {errorMsg && step === 'form' && (
                                        <div style={{
                                            padding: '12px 16px', borderRadius: 10, marginBottom: 20,
                                            background: dark ? 'rgba(241,3,22,0.08)' : 'rgba(241,3,22,0.05)',
                                            border: '1px solid rgba(241,3,22,0.2)',
                                            color: '#f10316', fontSize: 13,
                                        }}>
                                            {errorMsg}
                                        </div>
                                    )}

                                    <button
                                        id="reset-password-submit-btn"
                                        type="submit"
                                        disabled={step === 'loading'}
                                        style={{
                                            width: '100%', padding: 15, borderRadius: 12, border: 'none',
                                            background: '#f10316', color: 'white',
                                            fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
                                            cursor: step === 'loading' ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s',
                                            boxShadow: dark ? '0 4px 24px rgba(241,3,22,0.4)' : '0 8px 24px rgba(241,3,22,0.3)',
                                            opacity: step === 'loading' ? 0.7 : 1,
                                        }}
                                        onMouseEnter={(e) => { if (step !== 'loading') { e.currentTarget.style.background = '#d90212'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f10316'; e.currentTarget.style.transform = 'none'; }}
                                    >
                                        {step === 'loading' ? '⏳ Réinitialisation en cours…' : t('auth_page.resetBtn', 'Réinitialiser le mot de passe')}
                                    </button>
                                </form>
                            </motion.div>
                        )}

                        {/* ── SUCCESS ── */}
                        {step === 'success' && (
                            <motion.div key="success" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
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
                                    {t('auth_page.resetSuccessTitle', 'Mot de passe réinitialisé !')}
                                </h3>
                                <p style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280', marginBottom: 32, lineHeight: 1.7 }}>
                                    Votre mot de passe a été mis à jour avec succès. Vous allez être redirigé vers la page de connexion dans{' '}
                                    <strong style={{ color: '#f10316' }}>{redirectSecs}s</strong>.
                                </p>

                                <Link to="/login" style={{
                                    display: 'block', textAlign: 'center',
                                    padding: '15px 0', borderRadius: 12,
                                    background: '#f10316', color: 'white',
                                    fontSize: 16, fontWeight: 600, textDecoration: 'none',
                                    boxShadow: dark ? '0 4px 24px rgba(241,3,22,0.4)' : '0 8px 24px rgba(241,3,22,0.3)',
                                }}>
                                    {t('auth_page.goToLogin', 'Aller à la connexion')}
                                </Link>
                            </motion.div>
                        )}

                        {/* ── ERROR (invalid / expired token) ── */}
                        {step === 'error' && (
                            <motion.div key="error" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                                <div style={{
                                    width: 72, height: 72, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 0 28px',
                                    boxShadow: '0 8px 24px rgba(239,68,68,0.35)',
                                }}>
                                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </div>

                                <h3 className="font-display" style={{ fontSize: 26, fontWeight: 700, marginBottom: 12, color: dark ? '#F4F4F5' : '#1A1A2E' }}>
                                    {t('auth_page.resetErrorTitle', 'Lien invalide ou expiré')}
                                </h3>
                                <p style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280', marginBottom: 12, lineHeight: 1.7 }}>
                                    {errorMsg || 'Ce lien de réinitialisation est invalide ou a expiré. Les liens sont valables 60 minutes et ne peuvent être utilisés qu\'une seule fois.'}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 32 }}>
                                    <Link to="/forgot-password" style={{
                                        display: 'block', textAlign: 'center',
                                        padding: '15px 0', borderRadius: 12,
                                        background: '#f10316', color: 'white',
                                        fontSize: 15, fontWeight: 600, textDecoration: 'none',
                                        boxShadow: dark ? '0 4px 24px rgba(241,3,22,0.4)' : '0 8px 24px rgba(241,3,22,0.3)',
                                    }}>
                                        {t('auth_page.requestNewLink', 'Faire une nouvelle demande')}
                                    </Link>
                                    <Link to="/login" style={{
                                        display: 'block', textAlign: 'center',
                                        padding: '13px 0', borderRadius: 12, fontSize: 14,
                                        fontWeight: 600, textDecoration: 'none',
                                        border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
                                        color: dark ? '#F4F4F5' : '#1A1A2E',
                                    }}>
                                        {t('auth_page.backToLoginLink', 'Se connecter')}
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPasswordPage;
