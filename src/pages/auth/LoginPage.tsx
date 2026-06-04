// ============================================================
// LoginPage — Split-panel login with AuthVisual v3.0
// ============================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthVisual from '@/components/auth/AuthVisual';
import { useAuthStore } from '@/stores';
import { useUIStore } from '@/stores/uiStore';
import { useTranslation } from 'react-i18next';
import AccountStatusModal from '@/components/auth/AccountStatusModal';
import { Dropdown } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const { t, i18n } = useTranslation();
    const { themeMode, toggleTheme } = useUIStore();
    const dark = themeMode === 'dark';

    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [captchaRequired, setCaptchaRequired] = useState(false);
    const [captchaChecked, setCaptchaChecked] = useState(false);
    const [remember, setRemember] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusModal, setStatusModal] = useState<{ visible: boolean; type: 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'NONE' }>({
        visible: false, type: 'NONE'
    });

    const languageMenuItems = [
        { key: 'fr', label: 'Français (FR)' },
        { key: 'ar', label: 'العربية (AR)' },
        { key: 'en', label: 'English (EN)' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login({
                email: formData.email,
                password: formData.password,
                captchaToken: captchaRequired && captchaChecked ? 'local-bypass' : undefined
            });
            // Wait for profile to load so user.type is available
            const store = useAuthStore.getState();
            await store.fetchProfile();
            // Route donors to dedicated donor space
            const updatedUser = useAuthStore.getState().user;
            if (updatedUser?.type === 'DONOR') {
                navigate('/donor/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err: unknown) {
            const typedErr = err as { accountStatus?: string; message?: string; captchaRequired?: boolean; response?: { data?: { error?: string, message?: string } } };

            const accountStatus = typedErr?.accountStatus;
            const errorMessage = typedErr?.message
                || typedErr?.response?.data?.message
                || t('auth_page.loginError', 'Email ou mot de passe incorrect');

            if (typedErr?.captchaRequired || errorMessage.includes('CAPTCHA')) {
                setCaptchaRequired(true);
            }

            if (accountStatus === 'PENDING') {
                setStatusModal({ visible: true, type: 'PENDING' });
            } else if (accountStatus === 'SUSPENDED') {
                setStatusModal({ visible: true, type: 'SUSPENDED' });
            } else {
                setError(errorMessage);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '13px 16px 13px 44px',
        background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)',
        border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        color: dark ? '#F4F4F5' : '#1A1A2E',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        outline: 'none',
        transition: 'all 0.3s',
        backdropFilter: 'blur(8px)',
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
                {/* Left Panel - Immersive Visual */}
                <AuthVisual
                    headline={t("auth_page.heroLoginTitle", "Bienvenue sur la plateforme humanitaire")}
                    description={t("auth_page.heroLoginDesc", "Accédez à votre espace de gestion, coordonnez vos équipes et intervenez rapidement grâce à l'IA.")}
                    stats={[
                        { value: '2,841', label: t('auth_page.statsVolunteers', 'Volontaires') },
                        { value: '89', label: t('auth_page.statsCommittees', 'Comités') },
                        { value: '24', label: t('auth_page.statsGov', 'Gouvernorats') },
                    ]}
                />

                {/* Right Panel - Glassmorphism Form */}
                <div
                    className="auth-form-panel"
                    style={{
                        padding: '60px 60px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                    }}
                >
                    <h3 className="font-display" style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: dark ? '#F4F4F5' : '#1A1A2E' }}>
                        {t('auth_page.loginTitle', 'Connexion')}
                    </h3>
                    <div style={{ fontSize: 14, color: dark ? '#A1A1AA' : '#6B7280', marginBottom: 40 }}>
                        {t('auth_page.loginSubtitle', 'Entrez vos identifiants pour accéder à votre tableau de bord')}
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Email */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>{t("auth_page.emailOrCin", "Email ou CIN")}</label>
                            <div style={{ position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                <input
                                    type="text"
                                    placeholder="nom@crt.tn ou 12345678"
                                    style={inputStyle}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#f10316';
                                        e.currentTarget.style.background = dark ? 'rgba(241,3,22,0.05)' : 'rgba(241,3,22,0.02)';
                                        e.currentTarget.style.boxShadow = dark ? '0 0 0 3px rgba(241,3,22,0.15)' : '0 0 0 3px rgba(241,3,22,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                                        e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>{t("auth_page.password", "Mot de passe")}</label>
                            <div style={{ position: 'relative' }}>
                                <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={dark ? '#A1A1AA' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    style={{ ...inputStyle, paddingRight: 44 }}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = '#f10316';
                                        e.currentTarget.style.background = dark ? 'rgba(241,3,22,0.05)' : 'rgba(241,3,22,0.02)';
                                        e.currentTarget.style.boxShadow = dark ? '0 0 0 3px rgba(241,3,22,0.15)' : '0 0 0 3px rgba(241,3,22,0.1)';
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
                                        e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.6)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
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
                        </div>

                        {/* CAPTCHA Bypass Checkbox */}
                        {captchaRequired && (
                            <div style={{
                                marginBottom: 20,
                                padding: '12px 16px',
                                background: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                <input
                                    type="checkbox"
                                    id="captcha-bypass"
                                    checked={captchaChecked}
                                    onChange={(e) => setCaptchaChecked(e.target.checked)}
                                    style={{ accentColor: '#f10316', width: 18, height: 18, cursor: 'pointer' }}
                                    required
                                />
                                <label htmlFor="captcha-bypass" style={{ fontSize: 13, color: dark ? '#F4F4F5' : '#1A1A2E', cursor: 'pointer', fontWeight: 500 }}>
                                    {t('auth_page.notARobot', 'Je ne suis pas un robot (Validation de sécurité)')}
                                </label>
                            </div>
                        )}

                        {/* Options */}
                        <div className="flex justify-between items-center" style={{ marginBottom: 28, marginTop: 4 }}>
                            <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 13, color: dark ? '#A1A1AA' : '#6B7280' }}>
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    style={{ accentColor: '#f10316' }}
                                />
                                {t('auth_page.rememberMe', 'Se souvenir de moi')}
                            </label>
                            <Link to="/forgot-password" style={{ fontSize: 13, color: '#f10316', textDecoration: 'none', transition: 'color 0.3s' }}>
                                {t('auth_page.forgotPassword', 'Mot de passe oublié ?')}
                            </Link>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{ color: '#f10316', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

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
                            {isLoading ? t('auth_page.loginConnecting', '⏳ Connexion en cours...') : t('auth_page.loginBtn', 'Se connecter')}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0 20px' }}>
                        <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                        <div style={{ padding: '0 12px', fontSize: 12, color: dark ? '#71717A' : '#9CA3AF' }}>{t('auth_page.orContinueWith', 'ou continuer avec')}</div>
                        <div style={{ flex: 1, height: 1, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />
                    </div>

                    {/* SSO Alternative Auth */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <button style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '12px', borderRadius: 10, border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
                            background: 'transparent', color: dark ? '#F4F4F5' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                            {t('auth_page.sso', 'SSO CRT National')}
                        </button>
                        <button style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            padding: '12px', borderRadius: 10, border: dark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)',
                            background: 'transparent', color: dark ? '#F4F4F5' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            {t('auth_page.volunteerCard', 'Carte Volontaire')}
                        </button>
                    </div>

                    <div style={{ marginTop: 30, textAlign: 'center', fontSize: 13, color: dark ? '#A1A1AA' : '#6B7280' }}>
                        {t('auth_page.noAccount', 'Pas encore de compte ?')} <Link to="/register" style={{ color: '#f10316', fontWeight: 600, textDecoration: 'none' }}>{t('auth_page.registerLink', "S'inscrire")}</Link> | <Link to="/" style={{ color: dark ? '#A1A1AA' : '#6B7280', textDecoration: 'none' }}>{t("auth_page.back", "← Retour")}</Link>
                    </div>
                </div>
            </motion.div>

            {statusModal.visible && <AccountStatusModal visible={statusModal.visible} status={statusModal.type as any} onClose={() => setStatusModal({ visible: false, type: 'NONE' })} />}
        </div>
    );
};

export default LoginPage;
