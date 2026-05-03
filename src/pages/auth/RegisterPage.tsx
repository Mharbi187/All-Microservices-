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
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [committees, setCommittees] = useState<{id: string; name: string; type: string}[]>([]);

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [cin, setCin] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedCommittee, setSelectedCommittee] = useState('');

    // Fetch real committees on mount — utilise l'endpoint public /onboarding/public/committees/all
    useEffect(() => {
        apiClient.get<{id: string; name: string; type: string; region: string}[]>(
            '/onboarding/public/committees/all'
        )
            .then(res => setCommittees(res.data))
            .catch(() => { /* committees will be empty, user can still type */ });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            const result = await authService.register({
                fullName: `${firstName} ${lastName}`,
                email,
                password,
                cin,
                phone,
                userType: 'VOLUNTEER' as UserType,
                committeeId: selectedCommittee || undefined,
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
        background: 'var(--input-bg)',
        border: '1px solid var(--input-border)',
        borderRadius: 12,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        outline: 'none',
        transition: 'all 0.3s',
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        appearance: 'auto' as React.CSSProperties['appearance'],
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

    const focusHandlers = {
        onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = 'var(--input-focus-border)';
            e.currentTarget.style.background = 'var(--input-focus-bg)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(241,3,22,0.1)';
        },
        onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
            e.currentTarget.style.borderColor = 'var(--input-border)';
            e.currentTarget.style.background = 'var(--input-bg)';
            e.currentTarget.style.boxShadow = 'none';
        },
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
                maxWidth: 1200,
                borderRadius: 32,
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            }}
        >
            <AuthVisual
                headline="Rejoignez le réseau humanitaire national"
                description="Créez votre profil volontaire et commencez à contribuer à travers les 24 gouvernorats tunisiens."
                features={[
                    'Certifications secourisme reconnues',
                    "Accès à l'assistant IA de secours",
                    'Suivi des heures de bénévolat',
                ]}
                stats={[
                    { value: 'PSC1', label: 'Formation base' },
                    { value: '36M', label: 'Support' },
                ]}
            />

            <div
                className="auth-form-panel"
                style={{
                    background: 'var(--bg-secondary)',
                    backdropFilter: 'var(--glass-blur)',
                    padding: '56px 50px',
                    overflowY: 'auto',
                    maxHeight: '90vh',
                }}
            >
                <h3
                    className="font-display"
                    style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}
                >
                    Créer un compte
                </h3>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 40 }}>
                    Profil volontaire — Croissant Rouge Tunisien
                </div>

                {/* Success message */}
                {success && (
                    <div style={{ background: 'rgba(22,163,106,0.1)', border: '1px solid rgba(22,163,106,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#16a34a', fontSize: 14 }}>
                        ✅ {success}
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 14 }}>
                        ❌ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Name Row */}
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Prénom</label>
                            <input type="text" placeholder="Mohamed" style={inputStyle} required {...focusHandlers}
                                value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Nom</label>
                            <input type="text" placeholder="Ben Ali" style={inputStyle} required {...focusHandlers}
                                value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                    </div>

                    {/* CIN + DOB */}
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>CIN</label>
                            <input type="text" placeholder="12345678" maxLength={8} style={inputStyle} required {...focusHandlers}
                                value={cin} onChange={(e) => setCin(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Date de naissance</label>
                            <input type="date" style={inputStyle} required {...focusHandlers} />
                        </div>
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>
                                ✉️
                            </span>
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
                            <label style={labelStyle}>Téléphone</label>
                            <input type="tel" placeholder="+216 XX XXX XXX" style={inputStyle} {...focusHandlers}
                                value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Gouvernorat</label>
                            <select style={selectStyle} required {...focusHandlers}>
                                <option value="" disabled>Sélectionner...</option>
                                {gouvernorats.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Comité — dynamic from API */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Comité d'affiliation</label>
                        <select style={selectStyle} required {...focusHandlers}
                            value={selectedCommittee} onChange={(e) => setSelectedCommittee(e.target.value)}>
                            <option value="" disabled>Sélectionner votre comité...</option>
                            {committees.map((c) => (
                                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                            ))}
                        </select>
                    </div>

                    {/* Certification */}
                    <div style={{ marginBottom: 20 }}>
                        <label style={labelStyle}>Certification secourisme</label>
                        <select style={selectStyle} {...focusHandlers}>
                            {certifications.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Passwords */}
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Mot de passe</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                style={inputStyle}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                {...focusHandlers}
                            />
                            <PasswordStrength password={password} />
                        </div>
                        <div>
                            <label style={labelStyle}>Confirmer le mot de passe</label>
                            <input type="password" placeholder="••••••••" style={inputStyle} required {...focusHandlers} />
                        </div>
                    </div>

                    {/* Terms */}
                    <div style={{ marginBottom: 24 }}>
                        <label
                            className="flex items-start gap-2 cursor-pointer"
                            style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}
                        >
                            <input
                                type="checkbox"
                                checked={acceptTerms}
                                onChange={(e) => setAcceptTerms(e.target.checked)}
                                required
                                style={{ accentColor: 'var(--red)', marginTop: 2 }}
                            />
                            <span>
                                J'accepte les{' '}
                                <a href="#" style={{ color: 'var(--pink)', textDecoration: 'none' }}>conditions d'utilisation</a>
                                {' '}et la{' '}
                                <a href="#" style={{ color: 'var(--pink)', textDecoration: 'none' }}>politique de confidentialité</a>
                                {' '}du CRT
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
                        {isLoading ? '⏳ Création en cours...' : 'Créer mon profil volontaire'}
                    </button>
                </form>

                {/* Switch */}
                <div style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: 'var(--text-muted)' }}>
                    Déjà un compte ?{' '}
                    <Link to="/login" style={{ color: 'var(--pink)', textDecoration: 'none', fontWeight: 600 }}>
                        Se connecter
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
          .auth-form-panel { padding: 40px 36px !important; max-height: none !important; }
        }
        @media (max-width: 640px) {
          .auth-container { border-radius: 24px !important; }
          .auth-visual-panel, .auth-form-panel { padding: 36px 28px !important; }
          .form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </motion.div>
    );
};

export default RegisterPage;
