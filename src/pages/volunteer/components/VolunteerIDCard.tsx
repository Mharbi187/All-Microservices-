import React from 'react';
import { Typography } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';

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
    // Fallback data for fields not yet in the user schema
    const data = {
        address: user?.address || '—',
        dob: user?.dob || '[Sample Date/Month/Year]',
        pob: user?.pob || '[Sample City/Country]',
        bloodGroup: user?.bloodGroup || '[Sample Group]',
        passportNo: user?.passportNo || '[Sample Passport No.]',
        remarks: user?.remarks || '—',
        serial: `87654-${user?.id?.substring(0, 6).toUpperCase() || '321098'}`
    };

    return (
        <div 
            ref={ref}
            id="nexus-id-card"
            style={{
                width: '600px',
                height: '380px',
                background: '#fff5f5', // Pale pink base
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
                opacity: 0.1,
                backgroundImage: 'radial-gradient(#C81E1E 0.5px, transparent 0.5px), radial-gradient(#C81E1E 0.5px, #fff5f5 0.5px)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0,10px 10px',
                pointerEvents: 'none'
            }} />

            {/* 2. Top Magnetic Strip */}
            <div style={{
                width: '100%',
                height: '50px',
                background: '#3d2b1f', // Matte brown
                position: 'absolute',
                top: '20px'
            }} />

            {/* 3. Micro-printed Border Text */}
            <div style={{
                position: 'absolute',
                top: '72px',
                width: '100%',
                fontSize: '6px',
                fontWeight: 800,
                color: '#C81E1E',
                letterSpacing: '1px',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textTransform: 'uppercase'
            }}>
                {"NEXUS-AID SÉCURISÉ • ".repeat(20)}
            </div>

            {/* 4. Left Data Blocks */}
            <div style={{
                position: 'absolute',
                left: '25px',
                top: '90px',
                width: '310px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <DataBlock label="ADDRESSE D'ORIGINE / HOME ADDRESS" value={data.address} height={45} />
                <DataBlock label="DATE DE NAISSANCE / DATE OF BIRTH" value={data.dob} />
                <DataBlock label="LIEU DE NAISSANCE / PLACE OF BIRTH" value={data.pob} />
                <DataBlock label="GROUPEMENT SANGUIN / BLOOD GROUP" value={data.bloodGroup} />
                <DataBlock label="NUMÉRO DE PASSPORT / PASSPORT NUMBER" value={data.passportNo} />
                <DataBlock label="REMARQUES SPÉCIALES / SPECIAL REMARKS" value={data.remarks} height={45} />
            </div>

            {/* 5. Right Elements */}
            <div style={{
                position: 'absolute',
                right: '25px',
                top: '90px',
                width: '220px'
            }}>
                {/* Hologram & Serial */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div style={{
                        width: '70px',
                        height: '70px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0, rgba(255,255,255,0.1) 2px, transparent 2px, transparent 4px)',
                            opacity: 0.5
                        }} />
                        <span style={{ 
                            fontSize: '32px', 
                            fontWeight: 900, 
                            color: '#fff', 
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                            background: 'linear-gradient(to bottom, #fff, #818cf8)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                        }}>NC</span>
                    </div>
                    <Text style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8 }}>{data.serial}</Text>
                </div>

                {/* Return Address */}
                <div style={{ 
                    background: 'rgba(255,255,255,0.5)', 
                    padding: '10px', 
                    borderRadius: '10px',
                    fontSize: '9px',
                    lineHeight: '1.2',
                    marginBottom: '15px',
                    border: '1px solid rgba(0,0,0,0.05)'
                }}>
                    <div style={{ fontWeight: 800, marginBottom: '2px' }}>SI TROUVÉ, VEUILLEZ RETOURNER À</div>
                    <div style={{ marginBottom: '4px' }}>IF FOUND, PLEASE RETURN TO:</div>
                    <div style={{ fontWeight: 900, color: '#C81E1E' }}>CROISSANT ROUGE TUNISIEN -</div>
                    <div style={{ fontWeight: 900 }}>SIÈGE CENTRAL / CENTRAL HQ</div>
                    <div>8 Rue de l'Aide, Tunis, Tunisie</div>
                    <div>Tel. (+216) 11 22 33 44</div>
                </div>

                {/* Photo Zone */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ width: '80px' }}>
                        <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '50%', 
                            border: '2px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: 0.4,
                            marginBottom: '4px'
                        }}>
                            <SafetyCertificateOutlined style={{ fontSize: '20px' }} />
                        </div>
                        <div style={{ fontSize: '6px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1 }}>
                            Autorité de Contrôle<br/>Controlling Authority
                        </div>
                    </div>

                    {/* User Photo */}
                    <div style={{
                        width: '100px',
                        height: '110px',
                        border: '2px solid #fff',
                        borderRadius: '8px',
                        background: '#eee',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}>
                        <img 
                            src={user?.avatar || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjYyI+PHBhdGggZD0iTTEyIDEyYy0yLjc2IDAtNS0yLjI0LTUtNXMyLjI0LTUgNS01IDUgMi4yNCA1IDUtMi4yNCA1LTUgNXptMCAyYy0zLjMzIDAtMTAgMS42Ny0xMCA1djJoMjB2LTJjMC0zLjMzLTYuNjctNS0xMC01eiIvPjwvc3ZnPg=='} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            alt="ID"
                            crossOrigin="anonymous"
                        />
                        {/* Overlay Hologram on photo */}
                        <div style={{
                            position: 'absolute',
                            bottom: 0,
                            right: 0,
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
                            transform: 'rotate(45deg)',
                            pointerEvents: 'none'
                        }} />
                    </div>
                </div>
            </div>

            {/* Bottom micro-engraving */}
            <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '25px',
                fontSize: '6px',
                fontWeight: 700,
                opacity: 0.5
            }}>
                VALIDITÉ CERTIFIÉE PAR NEXUS-AID 2024
            </div>
        </div>
    );
});

const DataBlock: React.FC<{ label: string; value: string; height?: number }> = ({ label, value, height = 35 }) => (
    <div style={{
        background: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '4px 10px',
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
    }}>
        <div style={{ fontSize: '8px', fontWeight: 800, color: '#666', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#000', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {value}
        </div>
    </div>
);

export default VolunteerIDCard;
