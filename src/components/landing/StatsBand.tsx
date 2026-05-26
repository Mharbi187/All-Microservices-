// ============================================================
// StatsBand — Horizontal statistics strip
// ============================================================

import { motion } from 'framer-motion';
import { useUIStore } from '@/stores/uiStore';

const stats = [
    { value: '24', label: 'Gouvernorats couverts' },
    { value: '4', label: 'Services actifs' },
    { value: '99.5%', label: 'Disponibilité plateforme' },
    { value: '<200ms', label: 'Temps de réponse API' },
];

const StatsBand: React.FC = () => {
    const { themeMode } = useUIStore();
    const dark = themeMode === 'dark';

    return (
        <div
            className="stats-band-grid"
            style={{
                padding: '60px 80px',
                background: dark ? '#12141C' : '#FFFFFF',
                borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 40,
                position: 'relative',
                zIndex: 2,
            }}
        >
            {stats.map((stat, i) => (
                <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    style={{ textAlign: 'center' }}
                >
                    <span
                        className="font-display"
                        style={{
                            fontSize: 48,
                            fontWeight: 900,
                        color: dark ? '#FC8181' : '#C8102E',
                        display: 'block',
                        lineHeight: 1,
                    }}
                >
                    {stat.value}
                </span>
                <div style={{ fontSize: 13, color: dark ? '#A0AEC0' : '#718096', marginTop: 8 }}>
                        {stat.label}
                    </div>
                </motion.div>
            ))}

            <style>{`
        @media (max-width: 1024px) {
          .stats-band-grid { grid-template-columns: repeat(2, 1fr) !important; padding: 60px 48px !important; }
        }
        @media (max-width: 640px) {
          .stats-band-grid { grid-template-columns: 1fr 1fr !important; padding: 48px 24px !important; }
          .stats-band-grid span { font-size: 36px !important; }
        }
      `}</style>
        </div>
    );
};

export default StatsBand;
