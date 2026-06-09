// ============================================================
// BackgroundMesh — Animated gradient mesh + noise overlay
// ============================================================

const BackgroundMesh: React.FC = () => {
    return (
        <>
            {/* Gradient Mesh */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 0,
                    background: `
            radial-gradient(ellipse 80% 60% at 10% 20%, rgba(241,3,22,0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 80% at 90% 80%, rgba(226,58,77,0.14) 0%, transparent 55%),
            radial-gradient(ellipse 40% 40% at 50% 50%, rgba(239,121,132,0.07) 0%, transparent 70%),
            var(--bg-primary)
          `,
                    animation: 'meshShift 12s ease-in-out infinite alternate',
                    transition: 'background 0.4s ease',
                }}
            />
            {/* Noise Texture */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1,
                    pointerEvents: 'none',
                    opacity: 0.035,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
        </>
    );
};

export default BackgroundMesh;
