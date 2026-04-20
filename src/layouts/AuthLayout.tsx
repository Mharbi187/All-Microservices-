// ============================================================
// NEXUS-AID — Auth Layout
// Dark-themed layout for login / register pages
// ============================================================

import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import BackgroundMesh from '@/components/common/BackgroundMesh';

const AuthLayout: React.FC = () => {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '120px 48px 80px',
                position: 'relative',
            }}
        >
            <BackgroundMesh />
            <Suspense
                fallback={
                    <div className="flex items-center justify-center" style={{ height: 400 }}>
                        <div
                            style={{
                                width: 40,
                                height: 40,
                                border: '3px solid var(--glass-border)',
                                borderTopColor: 'var(--red)',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                zIndex: 10,
                            }}
                        />
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                }
            >
                <Outlet />
            </Suspense>
        </div>
    );
};

export default AuthLayout;
