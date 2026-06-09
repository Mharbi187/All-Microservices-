// ============================================================
// AboutPage — Dedicated À Propos page with Navbar + Footer
// ============================================================

import BackgroundMesh from '@/components/common/BackgroundMesh';
import AboutSection from '@/components/landing/AboutSection';

const AboutPage: React.FC = () => {
    return (
        <>
            <BackgroundMesh />
            {/* Spacer for fixed navbar */}
            <div style={{ height: 80 }} />
            <AboutSection />
        </>
    );
};

export default AboutPage;
