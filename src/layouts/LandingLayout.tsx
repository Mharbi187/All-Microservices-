// ============================================================
// LandingLayout — Public pages with Navbar + Footer
// ============================================================

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

const LandingLayout: React.FC = () => {
    return (
        <div style={{ minHeight: '100vh', position: 'relative' }}>
            <Navbar />
            <Suspense
                fallback={
                    <div className="flex items-center justify-center" style={{ height: '100vh' }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                border: '3px solid var(--glass-border)',
                                borderTopColor: 'var(--red)',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }}
                        />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                }
            >
                <Outlet />
            </Suspense>
            <Footer />
        </div>
    );
};

export default LandingLayout;
