// ============================================================
// HeroSection — Hero with stats cards, activity feed, floating cards
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Animated counter hook
function useAnimatedCounter(target: number, duration = 2000, delay = 800) {
    const [value, setValue] = useState(0);
    const started = useRef(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (started.current) return;
            started.current = true;
            const start = performance.now();
            const animate = (now: number) => {
                const progress = Math.min((now - start) / duration, 1);
                const ease = 1 - Math.pow(1 - progress, 3);
                setValue(Math.floor(target * ease));
                if (progress < 1) requestAnimationFrame(animate);
                else setValue(target);
            };
            requestAnimationFrame(animate);
        }, delay);
        return () => clearTimeout(timeout);
    }, [target, duration, delay]);

    return value;
}

const activities = [
    { dot: 'var(--red)', shadow: '0 0 8px rgba(241,3,22,0.6)', text: '<strong>Sfax-Centre</strong> — Intervention secours lancée', time: '02:14' },
    { dot: 'var(--pink)', shadow: 'none', text: '<strong>Tunis-Bardo</strong> — Rapport mensuel validé', time: '01:47' },
    { dot: 'var(--gray)', shadow: 'none', text: '<strong>Sousse</strong> — Stock médicaments mis à jour', time: '00:33' },
];

const liveActivities = [
    { dot: 'var(--red)', text: '<strong>Tunis-Bardo</strong> — Alerte stock critique', time: 'En direct' },
    { dot: 'var(--pink)', text: '<strong>Nabeul</strong> — Nouveau volontaire inscrit', time: '01:23' },
    { dot: 'var(--gray)', text: '<strong>Bizerte</strong> — Rapport intervention soumis', time: '00:58' },
    { dot: 'var(--red)', text: '<strong>Sfax</strong> — Déploiement équipe NDRT', time: '00:12' },
    { dot: 'var(--pink)', text: '<strong>Monastir</strong> — Formation PSE1 démarrée', time: '03:05' },
];

const HeroSection: React.FC = () => {
    const volCount = useAnimatedCounter(2841, 2500, 800);
    const intCount = useAnimatedCounter(147, 1800, 800);
    const comCount = useAnimatedCounter(89, 1600, 800);
    const [alertNum, setAlertNum] = useState(12);
    const [currentActivities, setCurrentActivities] = useState(activities);

    // Live alert count
    useEffect(() => {
        const i = setInterval(() => {
            setAlertNum((prev) => Math.max(8, Math.min(20, prev + Math.floor(Math.random() * 3) - 1)));
        }, 4000);
        return () => clearInterval(i);
    }, []);

    // Live activity feed
    const actIdxRef = useRef(0);
    const updateActivity = useCallback(() => {
        const a = liveActivities[actIdxRef.current % liveActivities.length];
        setCurrentActivities((prev) => [
            { ...a, shadow: a.dot === 'var(--red)' ? '0 0 8px rgba(241,3,22,0.6)' : 'none' },
            prev[0],
            prev[1],
        ]);
        actIdxRef.current++;
    }, []);

    useEffect(() => {
        const i = setInterval(updateActivity, 5000);
        return () => clearInterval(i);
    }, [updateActivity]);

    return (
        <section
            className="hero-section"
            style={{
                minHeight: '100vh',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                alignItems: 'center',
                padding: '120px 80px 80px',
                gap: 80,
                position: 'relative',
                zIndex: 2,
            }}
        >
            {/* Left: Text Content */}
            <div>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(241,3,22,0.12)',
                        border: '1px solid rgba(241,3,22,0.3)',
                        borderRadius: 100,
                        padding: '6px 16px',
                        marginBottom: 28,
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--pink)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase' as const,
                    }}
                >
                    <span
                        style={{
                            width: 6,
                            height: 6,
                            background: 'var(--red)',
                            borderRadius: '50%',
                            animation: 'blink 1.5s infinite',
                        }}
                    />
                    Croissant Rouge Tunisien • Système Intégré
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="font-display"
                    style={{
                        fontSize: 'clamp(40px, 5vw, 72px)',
                        fontWeight: 900,
                        lineHeight: 1.08,
                        marginBottom: 24,
                        color: 'var(--text-primary)',
                    }}
                >
                    <span
                        style={{
                            WebkitTextStroke: '1.5px var(--gray)',
                            color: 'transparent',
                            display: 'block',
                        }}
                    >
                        Plateforme
                    </span>
                    Humanitaire{' '}
                    <span style={{ color: 'var(--red)', display: 'block' }}>Nexus-AID</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    style={{
                        fontSize: 17,
                        lineHeight: 1.7,
                        color: 'var(--text-secondary)',
                        maxWidth: 480,
                        marginBottom: 40,
                    }}
                >
                    Système intégré de gestion, secourisme et coordination assisté par intelligence
                    artificielle — conçu pour sauver des vies et optimiser chaque intervention terrain en
                    Tunisie.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-wrap gap-4 items-center"
                >
                    <Link
                        to="/register"
                        style={{
                            padding: '14px 32px',
                            borderRadius: 100,
                            border: 'none',
                            background: 'var(--red)',
                            color: 'white',
                            fontFamily: 'var(--font-body)',
                            fontSize: 16,
                            fontWeight: 600,
                            textDecoration: 'none',
                            boxShadow: '0 8px 30px rgba(241,3,22,0.4)',
                            transition: 'all 0.3s',
                            display: 'inline-block',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 12px 40px rgba(241,3,22,0.55)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 8px 30px rgba(241,3,22,0.4)';
                        }}
                    >
                        Commencer maintenant
                    </Link>
                    <a
                        href="#modules"
                        onClick={(e) => {
                            e.preventDefault();
                            document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        style={{
                            padding: '14px 32px',
                            borderRadius: 100,
                            border: '1px solid var(--glass-border)',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-body)',
                            fontSize: 16,
                            fontWeight: 500,
                            textDecoration: 'none',
                            backdropFilter: 'blur(8px)',
                            transition: 'all 0.3s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--pink)';
                            e.currentTarget.style.color = 'var(--pink)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--glass-border)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                    >
                        Découvrir les modules
                    </a>
                </motion.div>
            </div>

            {/* Right: Visual Card */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                style={{ position: 'relative' }}
            >
                {/* Float Card: Alerts */}
                <div
                    className="glass"
                    style={{
                        position: 'absolute',
                        top: -30,
                        right: -20,
                        borderRadius: 16,
                        padding: '14px 18px',
                        animation: 'floatY 5s ease-in-out infinite',
                        zIndex: 3,
                    }}
                >
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Alertes actives
                    </div>
                    <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>
                        {alertNum}
                    </div>
                </div>

                {/* Main Card */}
                <div
                    className="glass"
                    style={{
                        borderRadius: 24,
                        padding: 32,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Glow */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -60,
                            right: -60,
                            width: 200,
                            height: 200,
                            background: 'radial-gradient(circle, rgba(241,3,22,0.2) 0%, transparent 70%)',
                            borderRadius: '50%',
                        }}
                    />

                    {/* Stat Grid */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 16,
                            marginBottom: 24,
                        }}
                    >
                        {[
                            { value: volCount.toLocaleString('fr-FR'), label: 'Volontaires actifs' },
                            { value: intCount.toString(), label: 'Interventions ce mois' },
                            { value: '98%', label: 'Stock disponible' },
                            { value: comCount.toString(), label: 'Comités actifs' },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    borderRadius: 16,
                                    padding: 20,
                                    transition: 'all 0.3s',
                                    cursor: 'default',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'rgba(241,3,22,0.3)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--card-border)';
                                    e.currentTarget.style.transform = 'none';
                                }}
                            >
                                <span className="font-mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {stat.value}
                                </span>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>
                                    {stat.label}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Activity Feed */}
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                            Activité récente
                        </div>
                        {currentActivities.map((act, i) => (
                            <div
                                key={i}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    padding: '10px 14px',
                                    borderRadius: 12,
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--card-border)',
                                    marginBottom: 8,
                                    animation: `slideIn 0.6s ${i * 0.1}s ease both`,
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        flexShrink: 0,
                                        background: act.dot,
                                        boxShadow: act.shadow,
                                    }}
                                />
                                <div
                                    style={{ fontSize: 13, color: 'var(--text-secondary)', flex: 1 }}
                                    dangerouslySetInnerHTML={{ __html: act.text }}
                                />
                                <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                                    {act.time}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Float Card: Score IA */}
                <div
                    className="glass"
                    style={{
                        position: 'absolute',
                        bottom: -20,
                        left: -30,
                        borderRadius: 16,
                        padding: '14px 18px',
                        animation: 'floatY 6s 1s ease-in-out infinite',
                        zIndex: 3,
                    }}
                >
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Score IA
                    </div>
                    <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--pink)' }}>
                        97<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>%</span>
                    </div>
                </div>
            </motion.div>



            {/* Responsive */}
            <style>{`
        @media (max-width: 1024px) {
          .hero-section { grid-template-columns: 1fr !important; padding: 120px 48px 60px !important; gap: 50px !important; }
        }
        @media (max-width: 640px) {
          .hero-section { padding: 100px 24px 60px !important; }
        }
      `}</style>
        </section>
    );
};

export default HeroSection;
