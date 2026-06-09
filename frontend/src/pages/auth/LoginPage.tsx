// ============================================================
// LoginPage — Secure split-panel login with adaptive CAPTCHA
// Features: brute-force protection, CAPTCHA after 2 failures,
// animated error feedback, block countdown timer
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthVisual from '@/components/auth/AuthVisual';
import { useAuthStore } from '@/stores';
import AccountStatusModal from '@/components/auth/AccountStatusModal';
import { config } from '@/config/env';

// Declare grecaptcha global
declare global {
    interface Window {
        grecaptcha: {
            enterprise: {
                ready: (cb: () => void) => void;
                execute: (siteKey: string, options: { action: string }) => Promise<string>;
            };
        };
    }
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const captchaRequired = useAuthStore((s) => s.captchaRequired);
    const failedAttempts = useAuthStore((s) => s.failedAttempts);
    const blockRemainingSeconds = useAuthStore((s) => s.blockRemainingSeconds);
    const resetSecurityState = useAuthStore((s) => s.resetSecurityState);

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [remember, setRemember] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [shakeError, setShakeError] = useState(false);
    const [blockTimer, setBlockTimer] = useState(0);
    const [statusModal, setStatusModal] = useState<{ visible: boolean; type: 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'NONE' }>({
        visible: false, type: 'NONE'
    });
    const formRef = useRef<HTMLFormElement>(null);

    // Block countdown timer
    useEffect(() => {
        if (blockRemainingSeconds > 0) {
            setBlockTimer(blockRemainingSeconds);
        }
    }, [blockRemainingSeconds]);

    useEffect(() => {
        if (blockTimer <= 0) return;
        const interval = setInterval(() => {
            setBlockTimer((prev) => {
                if (prev <= 1) {
                    resetSecurityState();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [blockTimer, resetSecurityState]);

    // Execute reCAPTCHA and get token
    const getCaptchaToken = useCallback(async (): Promise<string | null> => {
        try {
            if (!window.grecaptcha?.enterprise) return null;
            return new Promise((resolve) => {
                window.grecaptcha.enterprise.ready(async () => {
                    try {
                        const token = await window.grecaptcha.enterprise.execute(
                            config.recaptchaSiteKey,
                            { action: 'LOGIN' }
                        );
                        resolve(token);
                    } catch {
                        resolve(null);
                    }
                });
            });
        } catch {
            return null;
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Get CAPTCHA token if required
            let captchaToken: string | undefined;
            if (captchaRequired) {
                const token = await getCaptchaToken();
                if (!token) {
                    setError('Vérification CAPTCHA échouée. Veuillez réessayer.');
                    setIsLoading(false);
                    return;
                }
                captchaToken = token;
            }

            await login({
                email: formData.email,
                password: formData.password,
                captchaToken,
            });

            // Wait for profile to load so user.type is available
            const store = useAuthStore.getState();
            await store.fetchProfile();
            navigate('/dashboard');
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { error?: string, message?: string, captchaRequired?: boolean, failedAttempts?: number, blockRemainingSeconds?: number } } };
            const errorData = axiosErr?.response?.data;
            const errorType = errorData?.error || '';
            const errorMessage = (err as Error)?.message || errorData?.message || 'Email ou mot de passe incorrect';

            if (errorType === 'Account Pending Approval') {
                setStatusModal({ visible: true, type: 'PENDING' });
            } else if (errorType === 'Account Suspended') {
                setStatusModal({ visible: true, type: 'SUSPENDED' });
            } else {
                setError(errorMessage);
                triggerShake();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const triggerShake = () => {
        setShakeError(true);
        setTimeout(() => setShakeError(false), 600);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isBlocked = blockTimer > 0;

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '13px 16px 13px 44px',
        background: 'var(--input-bg)',
        border: '1px solid var(--input-border)',
        borderRadius: 12,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        outline: 'none',
        transition: 'all 0.3s',
    };

    const labelStyle: React.CSSProperties = {
        display: 'block',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--text-secondary)',
        marginBottom: 8,
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="auth-container"
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                width: '100%',
                maxWidth: 1100,
                borderRadius: 32,
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            }}
        >
            <AuthVisual
                headline="Bienvenue sur la plateforme humanitaire"
                description="Accédez à votre espace de gestion, coordinatez vos équipes et intervenez rapidement grâce à l'IA."
                stats={[
                    { value: '2,841', label: 'Volontaires' },
                    { value: '89', label: 'Comités' },
                    { value: '24', label: 'Gouvernorats' },
                ]}
            />

            <div
                className="auth-form-panel"
                style={{
                    background: 'var(--bg-secondary)',
                    backdropFilter: 'var(--glass-blur)',
                    padding: '56px 50px',
                }}
            >
                <h3
                    className="font-display"
                    style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}
                >
                    Connexion
                </h3>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 40 }}>
                    Entrez vos identifiants pour accéder à votre tableau de bord
                </div>

                {/* Security Status Banner */}
                <AnimatePresence>
                    {isBlocked && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -10, height: 0 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))',
                                border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 16,
                                padding: '16px 20px',
                                marginBottom: 24,
                                backdropFilter: 'blur(10px)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: 'rgba(239,68,68,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20,
                                }}>
                                    🔒
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 2 }}>
                                        Compte temporairement verrouillé
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        Trop de tentatives échouées. Réessayez dans{' '}
                                        <span style={{ fontWeight: 700, color: '#ef4444', fontFamily: 'var(--font-mono, monospace)' }}>
                                            {formatTime(blockTimer)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div style={{
                                marginTop: 12, height: 4, borderRadius: 4,
                                background: 'rgba(239,68,68,0.1)', overflow: 'hidden',
                            }}>
                                <motion.div
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: blockTimer, ease: 'linear' }}
                                    style={{ height: '100%', background: 'linear-gradient(90deg, #ef4444, #f97316)', borderRadius: 4 }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {captchaRequired && !isBlocked && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.08))',
                                border: '1px solid rgba(251,191,36,0.3)',
                                borderRadius: 16,
                                padding: '14px 18px',
                                marginBottom: 24,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                            }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'rgba(251,191,36,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 18,
                            }}>
                                🤖
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>
                                    Vérification de sécurité activée
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Après {failedAttempts} tentative{failedAttempts > 1 ? 's' : ''} échouée{failedAttempts > 1 ? 's' : ''}, le CAPTCHA est requis
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.form
                    ref={formRef}
                    onSubmit={handleSubmit}
                    animate={shakeError ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.4 }}
                >
                    {/* Email */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Email ou CIN</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>
                                ✉️
                            </span>
                            <input
                                id="login-email"
                                type="text"
                                placeholder="nom@crt.tn ou 12345678"
                                style={inputStyle}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                disabled={isBlocked}
                                autoComplete="email"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--input-focus-border)';
                                    e.currentTarget.style.background = 'var(--input-focus-bg)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(241,3,22,0.1)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--input-border)';
                                    e.currentTarget.style.background = 'var(--input-bg)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Mot de passe</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>
                                🔒
                            </span>
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                style={inputStyle}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                disabled={isBlocked}
                                autoComplete="current-password"
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--input-focus-border)';
                                    e.currentTarget.style.background = 'var(--input-focus-bg)';
                                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(241,3,22,0.1)';
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--input-border)';
                                    e.currentTarget.style.background = 'var(--input-bg)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 14, color: 'var(--text-muted)', padding: 4,
                                }}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="flex justify-between items-center" style={{ marginBottom: 28, marginTop: 4 }}>
                        <label
                            className="flex items-center gap-2 cursor-pointer"
                            style={{ fontSize: 13, color: 'var(--text-secondary)' }}
                        >
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                style={{ accentColor: 'var(--red)' }}
                            />
                            Se souvenir de moi
                        </label>
                        <a
                            href="#"
                            style={{
                                fontSize: 13,
                                color: 'var(--pink)',
                                textDecoration: 'none',
                                transition: 'color 0.3s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--pink)')}
                        >
                            Mot de passe oublié ?
                        </a>
                    </div>

                    {/* Error with animation */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                style={{
                                    background: 'rgba(239,68,68,0.08)',
                                    border: '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: 12,
                                    padding: '10px 14px',
                                    marginBottom: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <span style={{ fontSize: 16 }}>⚠️</span>
                                <span style={{ color: '#ef4444', fontSize: 13, fontWeight: 500 }}>{error}</span>
                                {failedAttempts > 0 && (
                                    <span style={{
                                        marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                                        color: failedAttempts >= 4 ? '#ef4444' : '#f59e0b',
                                        background: failedAttempts >= 4 ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                                        padding: '2px 8px', borderRadius: 8,
                                    }}>
                                        {failedAttempts}/5
                                    </span>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* CAPTCHA indicator */}
                    {captchaRequired && !isBlocked && (
                        <div style={{
                            fontSize: 11, color: 'var(--text-muted)', textAlign: 'center',
                            marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            <span style={{ fontSize: 14 }}>🛡️</span>
                            Protected by reCAPTCHA Enterprise
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        id="login-submit"
                        type="submit"
                        disabled={isLoading || isBlocked}
                        style={{
                            width: '100%',
                            padding: 15,
                            borderRadius: 12,
                            border: 'none',
                            background: isBlocked
                                ? 'var(--text-muted)'
                                : isLoading ? 'var(--crimson)' : 'var(--red)',
                            color: 'white',
                            fontFamily: 'var(--font-body)',
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: (isLoading || isBlocked) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: isBlocked ? 'none' : '0 8px 24px rgba(241,3,22,0.35)',
                            opacity: (isLoading || isBlocked) ? 0.7 : 1,
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading && !isBlocked) {
                                e.currentTarget.style.background = 'var(--crimson)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading && !isBlocked) {
                                e.currentTarget.style.background = 'var(--red)';
                                e.currentTarget.style.transform = 'none';
                            }
                        }}
                    >
                        {isBlocked
                            ? `🔒 Verrouillé (${formatTime(blockTimer)})`
                            : isLoading
                                ? '⏳ Connexion en cours...'
                                : captchaRequired
                                    ? '🛡️ Se connecter (avec vérification)'
                                    : 'Se connecter'}
                    </button>
                </motion.form>

                {/* Divider */}
                <div className="flex items-center gap-4" style={{ margin: '28px 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--input-border)' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>ou continuer avec</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--input-border)' }} />
                </div>

                {/* Social */}
                <div className="flex gap-3">
                    {[
                        { icon: '🏛️', label: 'SSO CRT National' },
                        { icon: '🆔', label: 'Carte Volontaire' },
                    ].map((btn) => (
                        <button
                            key={btn.label}
                            style={{
                                flex: 1,
                                padding: 12,
                                border: '1px solid var(--input-border)',
                                borderRadius: 10,
                                background: 'var(--card-bg)',
                                color: 'var(--text-secondary)',
                                fontFamily: 'var(--font-body)',
                                fontSize: 13,
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--glass-border)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--input-border)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                        >
                            {btn.icon} {btn.label}
                        </button>
                    ))}
                </div>

                {/* Switch */}
                <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-muted)' }}>
                    Pas encore de compte ?{' '}
                    <Link to="/register" style={{ color: 'var(--pink)', textDecoration: 'none', fontWeight: 600 }}>
                        S'inscrire
                    </Link>
                    &nbsp;|&nbsp;
                    <Link to="/landing" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                        ← Retour
                    </Link>
                </div>
            </div>

            <style>{`
        @media (max-width: 1024px) {
          .auth-container { grid-template-columns: 1fr !important; max-width: 600px !important; }
          .auth-visual-panel { min-height: 300px !important; padding: 40px 36px !important; }
          .auth-form-panel { padding: 40px 36px !important; }
        }
        @media (max-width: 640px) {
          .auth-container { border-radius: 24px !important; }
          .auth-visual-panel, .auth-form-panel { padding: 36px 28px !important; }
        }
      `}</style>

            <AccountStatusModal
                visible={statusModal.visible}
                status={statusModal.type}
                onClose={() => setStatusModal({ ...statusModal, visible: false })}
            />
        </motion.div>
    );
};

export default LoginPage;
