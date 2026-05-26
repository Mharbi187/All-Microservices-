// ============================================================
// LoginPage — Split-panel login with AuthVisual
// ============================================================

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AuthVisual from '@/components/auth/AuthVisual';
import { useAuthStore } from '@/stores';
import AccountStatusModal from '@/components/auth/AccountStatusModal';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const login = useAuthStore((s) => s.login);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [remember, setRemember] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusModal, setStatusModal] = useState<{ visible: boolean; type: 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'NONE' }>({
        visible: false, type: 'NONE'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login({ email: formData.email, password: formData.password });
            // Wait for profile to load so user.type is available
            const store = useAuthStore.getState();
            await store.fetchProfile();
            navigate('/dashboard');
        } catch (err: unknown) {
            // authStore throws a typed object { accountStatus?, message } for non-token responses
            const typedErr = err as { accountStatus?: string; message?: string; response?: { data?: { error?: string, message?: string } } };

            const accountStatus = typedErr?.accountStatus;
            const errorMessage = typedErr?.message
                || typedErr?.response?.data?.message
                || 'Email ou mot de passe incorrect';

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

                <form onSubmit={handleSubmit}>
                    {/* Email */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Email ou CIN</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>
                                ✉️
                            </span>
                            <input
                                type="text"
                                placeholder="nom@crt.tn ou 12345678"
                                style={inputStyle}
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
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
                                type="password"
                                placeholder="••••••••"
                                style={inputStyle}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
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

                    {/* Error */}
                    {error && (
                        <div style={{ color: 'var(--red)', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
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
                            background: isLoading ? 'var(--crimson)' : 'var(--red)',
                            color: 'white',
                            fontFamily: 'var(--font-body)',
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s',
                            boxShadow: '0 8px 24px rgba(241,3,22,0.35)',
                            opacity: isLoading ? 0.7 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.background = 'var(--crimson)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.background = 'var(--red)';
                                e.currentTarget.style.transform = 'none';
                            }
                        }}
                    >
                        {isLoading ? '⏳ Connexion en cours...' : 'Se connecter'}
                    </button>
                </form>

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
