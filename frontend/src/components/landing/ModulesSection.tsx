// ============================================================
// ServicesSection — Services du Croissant Rouge Tunisien
// Only services are displayed here; publications are in NewsSection
// ============================================================

import { motion } from 'framer-motion';
import { IconShield } from '@/components/common/SvgIcons';

// ---- Data ----

interface ServiceItem {
    id: string;
    image: string;
    title: string;
    subtitle: string;
    desc: string;
    tags: { label: string; type: 'red' | 'gray' | 'pink' }[];
}

const services: ServiceItem[] = [
    {
        id: 'secourisme',
        image: '/images/services/first-aid-training.png',
        title: 'Formation Secourisme & RCP',
        subtitle: 'Programme de formation certifié',
        desc: 'Sessions de formation PSE1/PSE2 en premiers secours et réanimation cardio-pulmonaire, encadrées par des formateurs agréés. Certification reconnue avec suivi des compétences par notre système IA intégré Nexus-AID.',
        tags: [
            { label: 'PSE1 / PSE2', type: 'red' },
            { label: 'Certification', type: 'gray' },
            { label: 'IA Assistée', type: 'pink' },
        ],
    },
    {
        id: 'catastrophes',
        image: '/images/services/disaster-response.png',
        title: 'Intervention Catastrophes Naturelles',
        subtitle: 'Équipes NDRT/RDRT déployées',
        desc: "Coordination des opérations d'urgence lors de catastrophes naturelles — inondations, séismes, incendies. Déploiement rapide des équipes NDRT avec gestion centralisée via la salle de crise virtuelle Nexus-AID.",
        tags: [
            { label: 'NDRT', type: 'red' },
            { label: 'Urgence', type: 'gray' },
            { label: 'Coordination', type: 'pink' },
        ],
    },
    {
        id: 'sang',
        image: '/images/services/blood-donation.png',
        title: 'Campagnes de Don de Sang',
        subtitle: 'Collectes régulières dans toute la Tunisie',
        desc: "Organisation de campagnes de don de sang en partenariat avec les centres de transfusion sanguine. Suivi des stocks sanguins, planification des collectes et sensibilisation du public à l'importance du don de sang.",
        tags: [
            { label: 'Don de Sang', type: 'red' },
            { label: 'Santé Publique', type: 'gray' },
            { label: 'National', type: 'gray' },
        ],
    },
    {
        id: 'aide',
        image: '/images/services/community-support.png',
        title: 'Aide Humanitaire & Sociale',
        subtitle: 'Soutien aux populations vulnérables',
        desc: "Distribution de colis alimentaires, couvertures et produits de première nécessité aux familles en situation de précarité. Accompagnement social personnalisé et suivi des bénéficiaires via le système de gestion Nexus-AID.",
        tags: [
            { label: 'Aide Sociale', type: 'red' },
            { label: 'Distribution', type: 'gray' },
            { label: 'Suivi', type: 'pink' },
        ],
    },
];

const tagStyles = {
    red: {
        background: 'rgba(241,3,22,0.15)',
        color: 'var(--pink)',
        border: '1px solid rgba(241,3,22,0.2)',
    },
    gray: {
        background: 'rgba(190,189,185,0.1)',
        color: 'var(--gray)',
        border: '1px solid rgba(190,189,185,0.15)',
    },
    pink: {
        background: 'rgba(239,121,132,0.12)',
        color: 'var(--pink)',
        border: '1px solid rgba(239,121,132,0.18)',
    },
};

// ---- Component ----

const ServicesSection: React.FC = () => {
    return (
        <section id="modules" style={{ padding: '100px 80px', position: 'relative', zIndex: 2 }} className="services-section">
            {/* Section Header */}
            <div style={{ marginBottom: 48 }}>
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
                    Croissant Rouge Tunisien
                </div>
                <div
                    className="font-display"
                    style={{
                        fontSize: 'clamp(32px, 4vw, 52px)',
                        fontWeight: 800,
                        lineHeight: 1.1,
                        color: 'var(--text-primary)',
                    }}
                >
                    Nos Services
                    <span
                        style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontWeight: 400,
                            fontSize: '0.55em',
                            marginTop: 10,
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        Découvrez nos actions humanitaires et nos programmes de formation
                    </span>
                </div>
            </div>

            {/* Cards Grid — 2x2 for better harmony */}
            <div
                className="services-grid"
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 28,
                }}
            >
                {services.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.08 }}
                        className="glass"
                        style={{
                            borderRadius: 20,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.4s',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(241,3,22,0.4)';
                            e.currentTarget.style.transform = 'translateY(-6px)';
                            e.currentTarget.style.boxShadow = '0 20px 60px rgba(241,3,22,0.12)';
                            const img = e.currentTarget.querySelector('.service-img') as HTMLImageElement;
                            if (img) img.style.transform = 'scale(1.08)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--glass-border)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = 'none';
                            const img = e.currentTarget.querySelector('.service-img') as HTMLImageElement;
                            if (img) img.style.transform = 'scale(1)';
                        }}
                    >
                        {/* Image */}
                        <div style={{ position: 'relative', overflow: 'hidden', height: 220 }}>
                            <img
                                className="service-img"
                                src={item.image}
                                alt={item.title}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    transition: 'transform 0.6s ease',
                                }}
                            />
                            {/* Gradient overlay */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    height: 60,
                                    background: 'linear-gradient(to top, var(--bg-primary), transparent)',
                                    opacity: 0.7,
                                }}
                            />
                            {/* Category badge */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    left: 12,
                                    padding: '4px 12px',
                                    borderRadius: 100,
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    background: 'rgba(241,3,22,0.85)',
                                    color: 'white',
                                    backdropFilter: 'blur(8px)',
                                }}
                            >
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><IconShield size={12} color="white" /> Service</span>
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '20px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: 'var(--red)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    marginBottom: 6,
                                }}
                            >
                                {item.subtitle}
                            </div>
                            <h3
                                className="font-display"
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    marginBottom: 10,
                                    color: 'var(--text-primary)',
                                    lineHeight: 1.3,
                                }}
                            >
                                {item.title}
                            </h3>
                            <p
                                style={{
                                    fontSize: 13,
                                    lineHeight: 1.7,
                                    color: 'var(--text-muted)',
                                    flex: 1,
                                    marginBottom: 16,
                                }}
                            >
                                {item.desc}
                            </p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-2">
                                {item.tags.map((tag) => (
                                    <span
                                        key={tag.label}
                                        style={{
                                            padding: '3px 10px',
                                            borderRadius: 100,
                                            fontSize: 10,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.06em',
                                            ...tagStyles[tag.type],
                                        }}
                                    >
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Responsive Styles */}
            <style>{`
                @media (max-width: 1024px) {
                    .services-section { padding: 80px 48px !important; }
                }
                @media (max-width: 768px) {
                    .services-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
                }
                @media (max-width: 640px) {
                    .services-section { padding: 64px 24px !important; }
                }
            `}</style>
        </section>
    );
};

export default ServicesSection;
