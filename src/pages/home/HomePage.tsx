// ============================================================
// HomePage — Landing page composing all sections
// ============================================================

import HeroSection from '@/components/landing/HeroSection';
import StatsBand from '@/components/landing/StatsBand';
import ServicesSection from '@/components/landing/ModulesSection';
import NewsSection from '@/components/landing/NewsSection';
import ContactSection from '@/components/landing/ContactSection';

const Divider: React.FC = () => (
    <div
        style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, rgba(200,16,46,0.15), transparent)',
            margin: '0 80px',
            position: 'relative',
            zIndex: 2,
        }}
    />
);

const HomePage: React.FC = () => {
    return (
        <>
            <HeroSection />
            <StatsBand />
            <ServicesSection />
            <Divider />
            <NewsSection />
            <Divider />
            <ContactSection />
        </>
    );
};

export default HomePage;
