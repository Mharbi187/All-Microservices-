import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface VolunteerIDCardProps {
    user: any;
    isDark?: boolean;
}

/**
 * High-Security Volunteer Identity Card Component
 * Mimics a physical secure card with guilloche patterns, holograms, and micro-printing.
 */
const VolunteerIDCard = React.forwardRef<HTMLDivElement, VolunteerIDCardProps>(({ user }, ref) => {
    // Determine dynamic first and last names
    const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'Samir';
    const lastName = user?.lastName || user?.fullName?.split(' ').slice(1).join(' ') || 'Ben Salah';

    // Calculate age from birthDate
    const getAge = () => {
        const dobString = user?.birthDate || user?.dob || user?.dateOfBirth;
        if (dobString) {
            try {
                const birth = new Date(dobString);
                const now = new Date();
                let age = now.getFullYear() - birth.getFullYear();
                const m = now.getMonth() - birth.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                    age--;
                }
                if (!isNaN(age) && age > 0) return age;
            } catch {
                // Ignore error
            }
        }
        return 29;
    };

    const data = {
        firstName,
        lastName,
        age: getAge(),
        bloodType: user?.bloodType || user?.bloodGroup || 'O+',
        committee: user?.committeeName 
            ? `COMITÉ LOCAL DE ${user.committeeName.toUpperCase()}`
            : 'COMITÉ LOCAL DE RADES',
        serial: `87654-${user?.id?.substring(0, 6).toUpperCase() || '100000'}`
    };

    return (
        <div 
            ref={ref}
            id="nexus-id-card"
            style={{
                width: '600px',
                height: '380px',
                background: '#FCF6F6', // High-end pale pink / off-white base
                borderRadius: '20px',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Inter', sans-serif",
                color: '#333',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                border: '1px solid #e5e7eb',
                userSelect: 'none'
            }}
        >
            {/* 1. Guilloche Pattern Overlay (CSS approximation) */}
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.05,
                backgroundImage: 'radial-gradient(#C81E1E 0.5px, transparent 0.5px), radial-gradient(#C81E1E 0.5px, #FCF6F6 0.5px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0,10px 10px',
                pointerEvents: 'none'
            }} />

            {/* 2. Top Matte Brown Band */}
            <div style={{
                width: '100%',
                height: '56px',
                background: '#3D2B1F', // Matte brown / dark chocolate
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: '25px',
                boxSizing: 'border-box'
            }}>
                <img 
                    src="/logo.jpg" 
                    alt="Logo" 
                    style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '2px solid #fff'
                    }} 
                    onError={(e) => {
                        // Fallback SVG if /logo.jpg fails
                        e.currentTarget.style.display = 'none';
                        const fallbackSvg = e.currentTarget.nextSibling as HTMLElement;
                        if (fallbackSvg) fallbackSvg.style.display = 'block';
                    }}
                />
                <svg 
                    viewBox="0 0 100 100" 
                    width="42" 
                    height="42" 
                    style={{ display: 'none', border: '2px solid #fff', borderRadius: '50%' }}
                >
                    <circle cx="50" cy="50" r="48" fill="#fff" />
                    <path d="M50 20 A30 30 0 1 1 50 80 A20 20 0 1 0 50 20" fill="#C81E1E" />
                </svg>
            </div>

            {/* 3. Bright Red Security Strip directly underneath */}
            <div style={{
                width: '100%',
                height: '28px',
                background: '#C81E1E',
                position: 'absolute',
                top: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '1px',
            }}>
                CROISSANT ROUGE TUNISIEN • NEXUS-AID SÉCURISÉ
            </div>

            {/* 4. Central Watermark Logo (semi-transparent) */}
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '58%',
                transform: 'translate(-50%, -50%)',
                opacity: 0.06,
                pointerEvents: 'none',
                color: '#C81E1E',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 0
            }}>
                <svg width="220" height="220" viewBox="0 0 200 200">
                    <path
                        d="M100 20 A80 80 0 1 1 100 180 A55 55 0 1 0 100 20"
                        fill="currentColor"
                    />
                </svg>
            </div>

            {/* 5. Left Data Blocks */}
            <div style={{
                position: 'absolute',
                left: '25px',
                top: '95px',
                width: '310px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                zIndex: 1
            }}>
                <DataBlock label="NOM (LAST NAME)" value={data.lastName} />
                <DataBlock label="PRÉNOM (FIRST NAME)" value={data.firstName} />
                <DataBlock label="ÂGE (AGE)" value={String(data.age)} />
                <DataBlock label="TYPE DE SANG / BLOOD TYPE" value={data.bloodType} />
                <DataBlock 
                    label="AFFILIATION / COMMITTEE" 
                    value={data.committee} 
                    icon={
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ color: '#C81E1E' }}>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#fff" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 7 A5 5 0 1 1 12 17 A3 3 0 1 0 12 7" fill="currentColor" />
                        </svg>
                    }
                />
            </div>

            {/* 6. Right Elements */}
            <div style={{
                position: 'absolute',
                right: '25px',
                top: '95px',
                width: '225px',
                zIndex: 1
            }}>
                {/* Serial unique & NC Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    {/* NC Shield Badge */}
                    <div style={{
                        width: '68px',
                        height: '76px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '-5px'
                    }}>
                        <svg viewBox="0 0 100 110" width="68" height="76">
                            <path 
                                d="M50 5 L90 20 V65 C90 90 50 105 50 105 C50 105 10 90 10 65 V20 Z" 
                                fill="none" 
                                stroke="#3D2B1F" 
                                strokeWidth="7" 
                                strokeLinejoin="round"
                            />
                            <text 
                                x="50" 
                                y="68" 
                                textAnchor="middle" 
                                fill="#3D2B1F" 
                                fontSize="38" 
                                fontWeight="900" 
                                fontFamily="'Inter', sans-serif"
                            >
                                NC
                            </text>
                        </svg>
                    </div>

                    {/* Serial Number */}
                    <Text style={{ 
                        fontSize: '13px', 
                        fontWeight: 800, 
                        color: '#111827',
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: '0.05em'
                    }}>
                        {data.serial}
                    </Text>
                </div>

                {/* Return Consignes Box */}
                <div style={{ 
                    background: '#fff', 
                    padding: '8px 10px', 
                    borderRadius: '8px',
                    fontSize: '8.5px',
                    lineHeight: '1.25',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ fontWeight: 800, color: '#374151', textTransform: 'uppercase' }}>SI TROUVÉ, VEUILLEZ RETOURNER À</div>
                    <div style={{ color: '#6B7280', fontSize: '7.5px', marginBottom: '3px' }}>IF FOUND, PLEASE RETURN TO:</div>
                    <div style={{ fontWeight: 900, color: '#C81E1E' }}>CROISSANT ROUGE TUNISIEN -</div>
                    <div style={{ fontWeight: 900, color: '#111827' }}>SIÈGE CENTRAL / CENTRAL HQ</div>
                    <div style={{ color: '#374151', fontWeight: 500 }}>8 Rue de l'Aide, Tunis, Tunisie</div>
                    <div style={{ color: '#374151', fontWeight: 500 }}>Tel. (+216) 11 22 33 44</div>
                </div>
            </div>

            {/* 7. Footer / Pied de page */}
            {/* Sobres details and validation coche */}
            <div style={{
                position: 'absolute',
                left: '25px',
                bottom: '22px',
                fontSize: '13px',
                fontWeight: 700,
                color: '#374151',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '-0.01em',
                zIndex: 1
            }}>
                Autorité de Contrôle
            </div>

            {/* Validation Checkmark Badge */}
            <div style={{
                position: 'absolute',
                left: '350px',
                bottom: '15px',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid #9CA3AF',
                background: 'rgba(243,244,246,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4B5563',
                zIndex: 1
            }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>

            {/* User ID Photo */}
            <div style={{
                position: 'absolute',
                right: '25px',
                bottom: '15px',
                width: '94px',
                height: '104px',
                border: '2px solid #fff',
                borderRadius: '6px',
                background: '#f3f4f6',
                overflow: 'hidden',
                boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                zIndex: 1
            }}>
                <img 
                    src={user?.avatar || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYy0yLjc2IDAtNS0yLjI0LTUtNXMyLjI0LTUgNS01IDUgMi4yNCA1IDUtMi4yNCA1LTUgNXptMCAyYy0zLjMzIDAtMTAgMS42Ny0xMCA1djJoMjB2LTJjMC0zLjMzLTYuNjctNS0xMC01eiIvPjwvc3ZnPg=='} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    alt="ID"
                    crossOrigin="anonymous"
                />
            </div>
        </div>
    );
});

const DataBlock: React.FC<{ label: string; value: string; height?: number; icon?: React.ReactNode }> = ({ label, value, height = 42, icon }) => (
    <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '4px 10px',
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        boxSizing: 'border-box'
    }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '7.5px', fontWeight: 800, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1px' }}>{label}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {value}
            </div>
        </div>
        {icon && <div style={{ flexShrink: 0, marginLeft: 8, display: 'flex', alignItems: 'center' }}>{icon}</div>}
    </div>
);

export default VolunteerIDCard;
