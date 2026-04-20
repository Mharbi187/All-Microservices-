// ============================================================
// HomePage — Landing page composing all sections
// ============================================================

import BackgroundMesh from '@/components/common/BackgroundMesh';
import HeroSection from '@/components/landing/HeroSection';
import StatsBand from '@/components/landing/StatsBand';
import ServicesSection from '@/components/landing/ModulesSection';
import NewsSection from '@/components/landing/NewsSection';
import ContactSection from '@/components/landing/ContactSection';

const Divider: React.FC = () => (
    <div
        style={{
            height: 1,
            background: 'linear-gradient(to right, transparent, var(--divider), transparent)',
            margin: '0 80px',
            position: 'relative',
            zIndex: 2,
        }}
    />
);

const HomePage: React.FC = () => {
    return (
        <>
            <BackgroundMesh />
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
