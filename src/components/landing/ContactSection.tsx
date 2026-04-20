// ============================================================
// ContactSection — Contact form & info
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { IconMapPin, IconPhone, IconMail, IconClock, IconMap } from '@/components/common/SvgIcons';

const contactInfo = [
    { icon: <IconMapPin size={20} />, label: 'Adresse', value: 'Boulevard 9 Avril 1938, Tunis 1001, Tunisie' },
    { icon: <IconPhone size={20} />, label: 'Téléphone', value: '+216 71 320 630' },
    { icon: <IconMail size={20} />, label: 'Email', value: 'contact@croissantrouge.tn' },
    { icon: <IconClock size={20} />, label: 'Horaires', value: 'Lun — Ven : 08:00 — 17:00' },
];

const ContactSection: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', email: '', committee: '', subject: '', message: '' });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
        setFormData({ name: '', email: '', committee: '', subject: '', message: '' });
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
        <section id="contact" className="contact-section" style={{ padding: '100px 80px', position: 'relative', zIndex: 2 }}>
            <div
                style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--red)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    marginBottom: 16,
                }}
            >
                Nous contacter
            </div>
            <div
                className="font-display"
                style={{
                    fontSize: 'clamp(36px, 4vw, 56px)',
                    fontWeight: 800,
                    lineHeight: 1.1,
                    marginBottom: 56,
                    color: 'var(--text-primary)',
                }}
            >
                Restons en Contact
                <span
                    style={{
                        display: 'block',
                        color: 'var(--text-secondary)',
                        fontWeight: 400,
                        fontSize: '0.7em',
                        marginTop: 8,
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    Une question ? Un partenariat ? Contactez-nous !
                </span>
            </div>

            <div
                className="contact-grid"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}
            >
                {/* Left: Contact Info */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex flex-col gap-5">
                        {contactInfo.map((info) => (
                            <div
                                key={info.label}
                                className="glass"
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 16,
                                    padding: '20px 24px',
                                    borderRadius: 16,
                                    transition: 'all 0.3s',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(241,3,22,0.3)';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--glass-border)';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'rgba(241,3,22,0.1)',
                                        flexShrink: 0,
                                        color: 'var(--red)',
                                    }}
                                >
                                    {info.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                                        {info.label}
                                    </div>
                                    <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                                        {info.value}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Map placeholder */}
                    <div
                        className="glass"
                        style={{
                            marginTop: 24,
                            borderRadius: 16,
                            padding: 4,
                            overflow: 'hidden',
                            height: 180,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 48,
                            background: 'var(--card-bg)',
                        }}
                    >
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ color: 'var(--text-muted)' }}><IconMap size={48} strokeWidth={1.2} /></div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                Tunis, Tunisie
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Right: Contact Form */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                >
                    <form
                        onSubmit={handleSubmit}
                        className="glass"
                        style={{
                            borderRadius: 24,
                            padding: 36,
                        }}
                    >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div>
                                <label style={labelStyle}>Nom complet</label>
                                <input
                                    type="text"
                                    placeholder="Votre nom"
                                    style={inputStyle}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                            <div>
                                <label style={labelStyle}>Email</label>
                                <input
                                    type="email"
                                    placeholder="email@exemple.tn"
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

                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Comité à contacter</label>
                            <select
                                style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%237a7774%27 stroke-width=%272%27%3e%3cpath d=%27M6 9l6 6 6-6%27/%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '18px', paddingRight: 36 }}
                                value={formData.committee}
                                onChange={(e) => setFormData({ ...formData, committee: e.target.value })}
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
                            >
                                <option value="" disabled>Sélectionnez un comité</option>
                                <optgroup label="Siège National">
                                    <option value="siege">Siège National — Tunis</option>
                                    <option value="direction">Direction Générale</option>
                                    <option value="secourisme">Direction du Secourisme</option>
                                    <option value="jeunesse">Direction de la Jeunesse</option>
                                </optgroup>
                                <optgroup label="Comités Régionaux">
                                    <option value="tunis">Comité Régional — Tunis</option>
                                    <option value="ariana">Comité Régional — Ariana</option>
                                    <option value="ben-arous">Comité Régional — Ben Arous</option>
                                    <option value="manouba">Comité Régional — Manouba</option>
                                    <option value="nabeul">Comité Régional — Nabeul</option>
                                    <option value="zaghouan">Comité Régional — Zaghouan</option>
                                    <option value="bizerte">Comité Régional — Bizerte</option>
                                    <option value="beja">Comité Régional — Béja</option>
                                    <option value="jendouba">Comité Régional — Jendouba</option>
                                    <option value="kef">Comité Régional — Le Kef</option>
                                    <option value="siliana">Comité Régional — Siliana</option>
                                    <option value="sousse">Comité Régional — Sousse</option>
                                    <option value="monastir">Comité Régional — Monastir</option>
                                    <option value="mahdia">Comité Régional — Mahdia</option>
                                    <option value="sfax">Comité Régional — Sfax</option>
                                    <option value="kairouan">Comité Régional — Kairouan</option>
                                    <option value="kasserine">Comité Régional — Kasserine</option>
                                    <option value="sidi-bouzid">Comité Régional — Sidi Bouzid</option>
                                    <option value="gabes">Comité Régional — Gabès</option>
                                    <option value="medenine">Comité Régional — Médenine</option>
                                    <option value="tataouine">Comité Régional — Tataouine</option>
                                    <option value="gafsa">Comité Régional — Gafsa</option>
                                    <option value="tozeur">Comité Régional — Tozeur</option>
                                    <option value="kebili">Comité Régional — Kébili</option>
                                </optgroup>
                            </select>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={labelStyle}>Sujet</label>
                            <input
                                type="text"
                                placeholder="Objet de votre message"
                                style={inputStyle}
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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

                        <div style={{ marginBottom: 24 }}>
                            <label style={labelStyle}>Message</label>
                            <textarea
                                placeholder="Décrivez votre demande..."
                                rows={5}
                                style={{
                                    ...inputStyle,
                                    resize: 'vertical',
                                    minHeight: 120,
                                }}
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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

                        <button
                            type="submit"
                            style={{
                                width: '100%',
                                padding: 15,
                                borderRadius: 12,
                                border: 'none',
                                background: 'var(--red)',
                                color: 'white',
                                fontFamily: 'var(--font-body)',
                                fontSize: 16,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                boxShadow: '0 8px 24px rgba(241,3,22,0.35)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--crimson)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 12px 32px rgba(241,3,22,0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'var(--red)';
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(241,3,22,0.35)';
                            }}
                        >
                            {submitted ? '✅ Message envoyé !' : 'Envoyer le message'}
                        </button>

                        {submitted && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    textAlign: 'center',
                                    marginTop: 16,
                                    fontSize: 14,
                                    color: '#16a34a',
                                    fontWeight: 500,
                                }}
                            >
                                Votre message a été envoyé avec succès. Nous vous répondrons sous 48h.
                            </motion.p>
                        )}
                    </form>
                </motion.div>
            </div>

            <style>{`
        @media (max-width: 1024px) {
          .contact-section { padding: 80px 48px !important; }
          .contact-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .contact-section { padding: 64px 24px !important; }
        }
      `}</style>
        </section>
    );
};

export default ContactSection;
