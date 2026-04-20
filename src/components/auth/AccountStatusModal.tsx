import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ClockCircleOutlined, 
    CloseCircleOutlined, 
    MailOutlined,
    SafetyCertificateOutlined,
    RocketOutlined
} from '@ant-design/icons';

interface AccountStatusModalProps {
    visible: boolean;
    status: 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'NONE';
    onClose: () => void;
}

const AccountStatusModal: React.FC<AccountStatusModalProps> = ({ visible, status, onClose }) => {
    if (status === 'NONE') return null;

    const config = {
        PENDING: {
            title: "Compte en attente de validation",
            desc: "Votre demande d'inscription a été reçue. Nos administrateurs vérifient actuellement vos informations.",
            icon: <ClockCircleOutlined style={{ color: '#f59e0b' }} />,
            color: '#f59e0b',
            steps: [
                { label: 'Inscription', status: 'completed' },
                { label: 'Vérification CRT', status: 'current' },
                { label: 'Activation', status: 'pending' },
            ]
        },
        REJECTED: {
            title: "Accès refusé",
            desc: "Votre demande d'adhésion n'a pas été retenue pour le moment. Veuillez contacter votre comité local pour plus de détails.",
            icon: <CloseCircleOutlined style={{ color: '#ef4444' }} />,
            color: '#ef4444',
            steps: [
                { label: 'Inscription', status: 'completed' },
                { label: 'Vérification', status: 'error' },
                { label: 'Refusé', status: 'error' },
            ]
        },
        SUSPENDED: {
            title: "Compte suspendu",
            desc: "Votre compte a été temporairement suspendu pour des raisons administratives ou d'audit.",
            icon: <SafetyCertificateOutlined style={{ color: '#6366f1' }} />,
            color: '#6366f1',
            steps: [
                { label: 'Actif', status: 'completed' },
                { label: 'Audit', status: 'current' },
                { label: 'Réactivation', status: 'pending' },
            ]
        }
    };

    const current = config[status as keyof typeof config] || config.PENDING;

    return (
        <AnimatePresence>
            {visible && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20
                }}>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)'
                        }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        style={{
                            position: 'relative', width: '100%', maxWidth: 450,
                            background: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: 24, padding: '40px 32px',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                            textAlign: 'center', overflow: 'hidden'
                        }}
                    >
                        {/* Glow effect */}
                        <div style={{
                            position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
                            width: 200, height: 200, background: current.color,
                            opacity: 0.1, filter: 'blur(50px)', borderRadius: '50%'
                        }} />

                        {/* Animated Icon */}
                        <motion.div 
                            animate={status === 'PENDING' ? { 
                                scale: [1, 1.1, 1],
                                opacity: [0.8, 1, 0.8]
                            } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ 
                                fontSize: 64, marginBottom: 24, 
                                display: 'inline-flex', justifyContent: 'center' 
                            }}
                        >
                            {current.icon}
                        </motion.div>

                        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#1a1a1a' }}>
                            {current.title}
                        </h2>
                        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6, marginBottom: 32 }}>
                            {current.desc}
                        </p>

                        {/* Progress Tracker */}
                        <div style={{ 
                            display: 'flex', justifyContent: 'space-between', 
                            marginBottom: 40, position: 'relative' 
                        }}>
                            <div style={{
                                position: 'absolute', top: 12, left: '10%', right: '10%',
                                height: 2, background: '#eee', zIndex: 0
                            }} />
                            
                            {current.steps.map((step, i) => (
                                <div key={i} style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                                    <div style={{
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: step.status === 'completed' ? '#16a34a' : 
                                                   step.status === 'current' ? current.color : 
                                                   step.status === 'error' ? '#ef4444' : '#eee',
                                        margin: '0 auto 8px', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center',
                                        color: '#fff', fontSize: 10,
                                        boxShadow: step.status === 'current' ? `0 0 10px ${current.color}60` : 'none'
                                    }}>
                                        {step.status === 'completed' && '✓'}
                                        {step.status === 'error' && '✕'}
                                    </div>
                                    <span style={{ 
                                        fontSize: 11, fontWeight: 600, 
                                        color: step.status === 'pending' ? '#999' : '#333' 
                                    }}>
                                        {step.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <button 
                                onClick={onClose}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: 12,
                                    background: '#1a1a1a', color: '#fff', fontSize: 14,
                                    fontWeight: 600, border: 'none', cursor: 'pointer',
                                    transition: 'all 0.3s'
                                }}
                            >
                                J'ai compris
                            </button>
                            <button 
                                style={{
                                    width: '100%', padding: '12px', borderRadius: 12,
                                    background: 'transparent', color: '#666', fontSize: 13,
                                    fontWeight: 500, border: '1px solid #eee', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                                }}
                            >
                                <MailOutlined /> Contacter le Secrétariat
                            </button>
                        </div>

                        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <RocketOutlined style={{ fontSize: 14, color: '#999' }} />
                            <span style={{ fontSize: 12, color: '#999' }}>Nexus-AID Governance System</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AccountStatusModal;
