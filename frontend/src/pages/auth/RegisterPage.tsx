// ============================================================
// RegisterPage — Secure registration with CAPTCHA & validation
// Features: password strength enforcement, email regex, XSS sanitization
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthVisual from '@/components/auth/AuthVisual';
import PasswordStrength from '@/components/auth/PasswordStrength';
import authService from '@/services/authService';
import onboardingService, { CommitteeOption } from '@/services/onboardingService';
import type { UserType } from '@/types';
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

// ─── Security Utilities ─────────────────────────────────────

/** Sanitize input to prevent XSS attacks */
const sanitizeInput = (input: string): string => {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/** Validate email with RFC-compliant regex */
const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email);
};

/** Validate password strength */
const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('Au moins 8 caractères');
    if (!/[A-Z]/.test(password)) errors.push('Au moins une majuscule');
    if (!/[a-z]/.test(password)) errors.push('Au moins une minuscule');
    if (!/\d/.test(password)) errors.push('Au moins un chiffre');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) errors.push('Au moins un symbole');
    return { valid: errors.length === 0, errors };
};

/** Validate CIN (8 digits) */
const isValidCIN = (cin: string): boolean => /^\d{8}$/.test(cin);

// Tunisian gouvernorats fallback (in case backend is unavailable)
const TUNISIAN_GOUVERNORATS = [
    'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan',
    'Bizerte', 'Béja', 'Jendouba', 'Kef', 'Siliana', 'Sousse',
    'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid',
    'Gabès', 'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Form fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [cin, setCin] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // ─── Cascade committee state ────────────────────────────────────────────
    const [gouvernorats, setGouvernorats] = useState<string[]>(TUNISIAN_GOUVERNORATS);
    const [selectedGouvernorat, setSelectedGouvernorat] = useState('');
    const [regionalCommittees, setRegionalCommittees] = useState<CommitteeOption[]>([]);
    const [selectedRegional, setSelectedRegional] = useState('');
    const [localCommittees, setLocalCommittees] = useState<CommitteeOption[]>([]);
    const [selectedCommittee, setSelectedCommittee] = useState('');
    const [loadingRegional, setLoadingRegional] = useState(false);
    const [loadingLocal, setLoadingLocal] = useState(false);

    // Load gouvernorats from DB on mount
    useEffect(() => {
        onboardingService.getGouvernorats()
            .then(g => { if (g.length > 0) setGouvernorats(g); })
            .catch(() => { /* use fallback */ });
    }, []);

    // When gouvernorat changes → load regional committees
    const handleGouvernoratChange = async (gov: string) => {
        setSelectedGouvernorat(gov);
        setSelectedRegional('');
        setSelectedCommittee('');
        setLocalCommittees([]);
        if (!gov) { setRegionalCommittees([]); return; }
        setLoadingRegional(true);
        try {
            const regs = await onboardingService.getRegionalCommittees(gov);
            setRegionalCommittees(regs);
            // If only one regional committee, auto-select it
            if (regs.length === 1) {
                setSelectedRegional(regs[0].id);
                handleRegionalChange(regs[0].id);
            }
        } catch { setRegionalCommittees([]); }
        finally { setLoadingRegional(false); }
    };

    // When regional changes → load local committees
    const handleRegionalChange = async (regionalId: string) => {
        setSelectedRegional(regionalId);
        setSelectedCommittee('');
        if (!regionalId) { setLocalCommittees([]); return; }
        setLoadingLocal(true);
        try {
            const locals = await onboardingService.getLocalCommittees(regionalId);
            setLocalCommittees(locals);
            // If no local committees, use the regional as affiliation
            if (locals.length === 0) setSelectedCommittee(regionalId);
        } catch { setLocalCommittees([]); }
        finally { setLoadingLocal(false); }
    };

    // Execute reCAPTCHA
    const getCaptchaToken = useCallback(async (): Promise<string | null> => {
        try {
            if (!window.grecaptcha?.enterprise) return null;
            return new Promise((resolve) => {
                window.grecaptcha.enterprise.ready(async () => {
                    try {
                        const token = await window.grecaptcha.enterprise.execute(
                            config.recaptchaSiteKey,
                            { action: 'REGISTER' }
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

    // Real-time validation
    const validateField = (field: string, value: string) => {
        const errors = { ...validationErrors };

        switch (field) {
            case 'email':
                if (value && !isValidEmail(value)) errors.email = 'Email invalide';
                else delete errors.email;
                break;
            case 'cin':
                if (value && !isValidCIN(value)) errors.cin = 'CIN: 8 chiffres requis';
                else delete errors.cin;
                break;
            case 'password': {
                const pwResult = validatePassword(value);
                if (value && !pwResult.valid) errors.password = pwResult.errors[0];
                else delete errors.password;
                if (confirmPassword && value !== confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
                else delete errors.confirmPassword;
                break;
            }
            case 'confirmPassword':
                if (value && value !== password) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
                else delete errors.confirmPassword;
                break;
        }

        setValidationErrors(errors);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Client-side validation
        if (!isValidEmail(email)) {
            setError('Veuillez entrer un email valide.');
            return;
        }
        if (!isValidCIN(cin)) {
            setError('Le CIN doit contenir exactement 8 chiffres.');
            return;
        }
        const pwValidation = validatePassword(password);
        if (!pwValidation.valid) {
            setError('Mot de passe faible : ' + pwValidation.errors.join(', '));
            return;
        }
        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        setIsLoading(true);

        try {
            // Get CAPTCHA token (always required for registration)
            const captchaToken = await getCaptchaToken();

            const result = await authService.register({
                fullName: `${sanitizeInput(firstName)} ${sanitizeInput(lastName)}`,
                email: sanitizeInput(email),
                password,
                cin: sanitizeInput(cin),
                phone: sanitizeInput(phone),
                userType: 'VOLUNTEER' as UserType,
                committeeId: selectedCommittee || undefined,
                captchaToken: captchaToken || undefined,
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

    const errorFieldStyle = (field: string): React.CSSProperties =>
        validationErrors[field]
            ? { borderColor: '#ef4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' }
            : {};

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
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
                    Profil volontaire — Croissant Rouge Tunisien
                </div>

                {/* Security badge */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 24, fontSize: 11, color: 'var(--text-muted)',
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.15)',
                    borderRadius: 10, padding: '8px 14px',
                }}>
                    <span style={{ fontSize: 14 }}>🛡️</span>
                    Inscription sécurisée avec vérification CAPTCHA • Données chiffrées
                </div>

                {/* Success message */}
                <AnimatePresence>
                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ background: 'rgba(22,163,106,0.1)', border: '1px solid rgba(22,163,106,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#16a34a', fontSize: 14 }}
                        >
                            ✅ {success}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#ef4444', fontSize: 14 }}
                        >
                            ❌ {error}
                        </motion.div>
                    )}
                </AnimatePresence>

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
                            <input
                                type="text" placeholder="12345678" maxLength={8}
                                style={{ ...inputStyle, ...errorFieldStyle('cin') }}
                                required {...focusHandlers}
                                value={cin}
                                onChange={(e) => { setCin(e.target.value); validateField('cin', e.target.value); }}
                            />
                            {validationErrors.cin && (
                                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{validationErrors.cin}</div>
                            )}
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
                                style={{ ...inputStyle, paddingLeft: 44, ...errorFieldStyle('email') }}
                                required
                                {...focusHandlers}
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); validateField('email', e.target.value); }}
                            />
                        </div>
                        {validationErrors.email && (
                            <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{validationErrors.email}</div>
                        )}
                    </div>

                    </div>

                    {/* Phone + Gouvernorat (Step 1 of cascade) */}
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Téléphone</label>
                            <input type="tel" placeholder="+216 XX XXX XXX" style={inputStyle} {...focusHandlers}
                                value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Gouvernorat <span style={{ color: '#ef4444' }}>*</span></label>
                            <select style={selectStyle} required {...focusHandlers}
                                value={selectedGouvernorat}
                                onChange={(e) => handleGouvernoratChange(e.target.value)}>
                                <option value="" disabled>Sélectionner votre gouvernorat...</option>
                                {gouvernorats.map((g) => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Comité Régional (Step 2 of cascade) */}
                    {selectedGouvernorat && (
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>
                                Comité Régional <span style={{ color: '#ef4444' }}>*</span>
                                {loadingRegional && <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280' }}>⏳ Chargement...</span>}
                            </label>
                            <select style={selectStyle} required {...focusHandlers}
                                value={selectedRegional}
                                onChange={(e) => handleRegionalChange(e.target.value)}
                                disabled={loadingRegional}>
                                <option value="" disabled>Sélectionner le comité régional...</option>
                                {regionalCommittees.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                                {regionalCommittees.length === 0 && !loadingRegional && (
                                    <option disabled>Aucun comité actif dans ce gouvernorat</option>
                                )}
                            </select>
                        </div>
                    )}

                    {/* Comité Local (Step 3 of cascade) */}
                    {selectedRegional && localCommittees.length > 0 && (
                        <div style={{ marginBottom: 20 }}>
                            <label style={labelStyle}>
                                Comité Local d'affiliation <span style={{ color: '#ef4444' }}>*</span>
                                {loadingLocal && <span style={{ marginLeft: 8, fontSize: 11, color: '#6b7280' }}>⏳ Chargement...</span>}
                            </label>
                            <select style={selectStyle} required {...focusHandlers}
                                value={selectedCommittee}
                                onChange={(e) => setSelectedCommittee(e.target.value)}
                                disabled={loadingLocal}>
                                <option value="" disabled>Sélectionner votre comité local...</option>
                                {localCommittees.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name} — {c.region}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Affiliation summary */}
                    {selectedCommittee && (
                        <div style={{ marginBottom: 20, padding: '10px 14px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #86efac' }}>
                            <span style={{ fontSize: 13, color: '#166534', fontWeight: 600 }}>
                                ✅ Comité d'affiliation sélectionné
                            </span>
                        </div>
                    )}


                    {/* Passwords */}
                    <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                        <div>
                            <label style={labelStyle}>Mot de passe</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                style={{ ...inputStyle, ...errorFieldStyle('password') }}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); validateField('password', e.target.value); }}
                                required
                                autoComplete="new-password"
                                {...focusHandlers}
                            />
                            <PasswordStrength password={password} />
                            {validationErrors.password && (
                                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{validationErrors.password}</div>
                            )}
                        </div>
                        <div>
                            <label style={labelStyle}>Confirmer le mot de passe</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                style={{ ...inputStyle, ...errorFieldStyle('confirmPassword') }}
                                required
                                autoComplete="new-password"
                                {...focusHandlers}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); validateField('confirmPassword', e.target.value); }}
                            />
                            {validationErrors.confirmPassword && (
                                <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{validationErrors.confirmPassword}</div>
                            )}
                        </div>
                    </div>

                    {/* Password requirements */}
                    <div style={{
                        marginBottom: 20, padding: '10px 14px',
                        background: 'rgba(99,102,241,0.05)',
                        border: '1px solid rgba(99,102,241,0.1)',
                        borderRadius: 10, fontSize: 11, color: 'var(--text-muted)',
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>
                            🔐 Exigences de sécurité du mot de passe :
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                            {[
                                { test: password.length >= 8, label: '≥ 8 caractères' },
                                { test: /[A-Z]/.test(password), label: 'Majuscule (A-Z)' },
                                { test: /[a-z]/.test(password), label: 'Minuscule (a-z)' },
                                { test: /\d/.test(password), label: 'Chiffre (0-9)' },
                                { test: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password), label: 'Symbole (!@#$)' },
                            ].map((req) => (
                                <span key={req.label} style={{ color: req.test ? '#22c55e' : 'var(--text-muted)' }}>
                                    {req.test ? '✓' : '○'} {req.label}
                                </span>
                            ))}
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

                    {/* reCAPTCHA notice */}
                    <div style={{
                        fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
                        marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}>
                        <span style={{ fontSize: 12 }}>🛡️</span>
                        Protected by reCAPTCHA Enterprise — Google Privacy Policy
                    </div>

                    {/* Submit */}
                    <button
                        id="register-submit"
                        type="submit"
                        disabled={isLoading || Object.keys(validationErrors).length > 0}
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
                        {isLoading ? '⏳ Création en cours...' : '🛡️ Créer mon profil volontaire'}
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
