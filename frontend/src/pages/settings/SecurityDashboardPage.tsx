// ============================================================
// SecurityDashboardPage — Admin security monitoring interface
// Real-time threat monitoring, audit logs, blocked IPs
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '@/services/api';

interface DashboardStats {
    loginSuccessCount: number;
    loginFailureCount: number;
    blockedIpCount: number;
    captchaTriggeredCount: number;
    suspiciousActivityCount: number;
    failuresLastHour: number;
    suspiciousIps: string[];
    suspiciousIpCount: number;
    threatLevel: string;
    eventCounts24h: Record<string, number>;
}

interface AuditLog {
    id: string;
    eventType: string;
    email: string;
    ipAddress: string;
    details: string;
    success: boolean;
    timestamp: string;
    riskScore: number;
}

const threatColors: Record<string, { bg: string; text: string; glow: string }> = {
    NONE: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', glow: '0 0 20px rgba(34,197,94,0.3)' },
    LOW: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', glow: '0 0 20px rgba(59,130,246,0.3)' },
    MODERATE: { bg: 'rgba(251,191,36,0.1)', text: '#f59e0b', glow: '0 0 20px rgba(251,191,36,0.3)' },
    HIGH: { bg: 'rgba(249,115,22,0.1)', text: '#f97316', glow: '0 0 20px rgba(249,115,22,0.3)' },
    CRITICAL: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', glow: '0 0 20px rgba(239,68,68,0.5)' },
};

const eventTypeLabels: Record<string, { icon: string; label: string; color: string }> = {
    LOGIN_SUCCESS: { icon: '✅', label: 'Connexion réussie', color: '#22c55e' },
    LOGIN_FAILURE: { icon: '❌', label: 'Échec connexion', color: '#ef4444' },
    REGISTER: { icon: '📝', label: 'Inscription', color: '#3b82f6' },
    TOKEN_REFRESH: { icon: '🔄', label: 'Token rafraîchi', color: '#8b5cf6' },
    LOGOUT: { icon: '🚪', label: 'Déconnexion', color: '#6b7280' },
    BLOCKED_IP: { icon: '🚫', label: 'IP bloquée', color: '#ef4444' },
    CAPTCHA_TRIGGERED: { icon: '🤖', label: 'CAPTCHA activé', color: '#f59e0b' },
    CAPTCHA_FAILED: { icon: '⚠️', label: 'CAPTCHA échoué', color: '#f97316' },
    SUSPICIOUS_ACTIVITY: { icon: '🚨', label: 'Activité suspecte', color: '#dc2626' },
    BRUTE_FORCE_DETECTED: { icon: '💥', label: 'Brute-force détecté', color: '#dc2626' },
    ANOMALY_DETECTED: { icon: '🧠', label: 'Anomalie détectée', color: '#7c3aed' },
};

const SecurityDashboardPage: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'ips'>('overview');
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const [dashRes, logsRes] = await Promise.all([
                apiClient.get('/security/dashboard'),
                apiClient.get('/security/audit-logs?page=0&size=50'),
            ]);
            setStats(dashRes.data);
            setLogs(logsRes.data?.content || []);
        } catch (err) {
            console.error('Failed to fetch security data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleUnblockIp = async (ip: string) => {
        try {
            await apiClient.post('/security/unblock-ip', { ip });
            fetchData();
        } catch (err) {
            console.error('Failed to unblock IP:', err);
        }
    };

    const threat = stats?.threatLevel || 'NONE';
    const tc = threatColors[threat] || threatColors.NONE;

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    style={{ fontSize: 48 }}
                >
                    🛡️
                </motion.div>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 32 }}
            >
                <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: 8 }}>
                    🛡️ Centre de Sécurité
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                    Monitoring en temps réel • Dernière mise à jour il y a quelques secondes
                </p>
            </motion.div>

            {/* Threat Level Banner */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: tc.bg,
                    border: `1px solid ${tc.text}30`,
                    borderRadius: 20,
                    padding: '24px 32px',
                    marginBottom: 32,
                    boxShadow: tc.glow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: tc.text, marginBottom: 4 }}>
                        Niveau de menace
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: tc.text }}>
                        {threat === 'NONE' ? '✅ Aucune menace' : `⚠️ ${threat}`}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {['NONE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'].map((level) => (
                        <div key={level} style={{
                            width: 12, height: 40, borderRadius: 6,
                            background: level === threat ? tc.text : 'var(--input-border)',
                            opacity: level === threat ? 1 : 0.3,
                            transition: 'all 0.5s',
                        }} />
                    ))}
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
                {[
                    { label: 'Connexions réussies', value: stats?.loginSuccessCount || 0, icon: '✅', color: '#22c55e' },
                    { label: 'Échecs connexion', value: stats?.loginFailureCount || 0, icon: '❌', color: '#ef4444' },
                    { label: 'IPs bloquées', value: stats?.blockedIpCount || 0, icon: '🚫', color: '#f97316' },
                    { label: 'CAPTCHA activés', value: stats?.captchaTriggeredCount || 0, icon: '🤖', color: '#f59e0b' },
                    { label: 'Activités suspectes', value: stats?.suspiciousActivityCount || 0, icon: '🚨', color: '#dc2626' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 16,
                            padding: '20px 24px',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <span style={{ fontSize: 24 }}>{stat.icon}</span>
                            <span style={{
                                fontSize: 11, fontWeight: 600, color: stat.color,
                                background: `${stat.color}15`, padding: '2px 8px', borderRadius: 8,
                            }}>
                                24h
                            </span>
                        </div>
                        <div style={{ fontSize: 28, fontWeight: 800, color: stat.color, marginBottom: 4 }}>
                            {stat.value}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                {[
                    { key: 'overview', label: '📊 Vue d\'ensemble', },
                    { key: 'logs', label: '📋 Logs d\'audit' },
                    { key: 'ips', label: '🚫 IPs suspectes' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as typeof activeTab)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: 10,
                            border: '1px solid',
                            borderColor: activeTab === tab.key ? 'var(--red)' : 'var(--glass-border)',
                            background: activeTab === tab.key ? 'rgba(241,3,22,0.1)' : 'var(--card-bg)',
                            color: activeTab === tab.key ? 'var(--red)' : 'var(--text-secondary)',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
                    >
                        {/* Event breakdown */}
                        <div style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 16,
                            padding: 24,
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                                📊 Événements (dernières 24h)
                            </h3>
                            {stats?.eventCounts24h && Object.entries(stats.eventCounts24h).map(([type, count]) => {
                                const info = eventTypeLabels[type] || { icon: '📌', label: type, color: '#6b7280' };
                                const maxCount = Math.max(...Object.values(stats.eventCounts24h), 1);
                                return (
                                    <div key={type} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {info.icon} {info.label}
                                            </span>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: info.color }}>{count}</span>
                                        </div>
                                        <div style={{ height: 6, borderRadius: 4, background: 'var(--input-border)', overflow: 'hidden' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(count / maxCount) * 100}%` }}
                                                transition={{ duration: 1, delay: 0.2 }}
                                                style={{ height: '100%', background: info.color, borderRadius: 4 }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Suspicious IPs */}
                        <div style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 16,
                            padding: 24,
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                                🚨 IPs suspectes ({stats?.suspiciousIpCount || 0})
                            </h3>
                            {stats?.suspiciousIps?.length ? stats.suspiciousIps.map((ip) => (
                                <div key={ip} style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 14px', marginBottom: 8,
                                    background: 'rgba(239,68,68,0.05)',
                                    border: '1px solid rgba(239,68,68,0.1)',
                                    borderRadius: 10,
                                }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                            {ip}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnblockIp(ip)}
                                        style={{
                                            padding: '4px 12px', borderRadius: 8, fontSize: 11,
                                            border: '1px solid rgba(34,197,94,0.3)',
                                            background: 'rgba(34,197,94,0.1)',
                                            color: '#22c55e', cursor: 'pointer', fontWeight: 600,
                                        }}
                                    >
                                        Débloquer
                                    </button>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
                                    ✅ Aucune IP suspecte détectée
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'logs' && (
                    <motion.div
                        key="logs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 16,
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-tertiary, rgba(0,0,0,0.1))' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Type</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Email</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>IP</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Détails</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Risque</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log, i) => {
                                        const info = eventTypeLabels[log.eventType] || { icon: '📌', label: log.eventType, color: '#6b7280' };
                                        return (
                                            <motion.tr
                                                key={log.id || i}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.02 }}
                                                style={{ borderBottom: '1px solid var(--glass-border)' }}
                                            >
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{ color: info.color, fontWeight: 600 }}>
                                                        {info.icon} {info.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                                                    {log.email || '—'}
                                                </td>
                                                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 12 }}>
                                                    {log.ipAddress || '—'}
                                                </td>
                                                <td style={{ padding: '10px 16px', color: 'var(--text-muted)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {log.details || '—'}
                                                </td>
                                                <td style={{ padding: '10px 16px' }}>
                                                    <span style={{
                                                        display: 'inline-block', padding: '2px 8px', borderRadius: 8,
                                                        fontSize: 11, fontWeight: 700,
                                                        background: log.riskScore >= 50 ? 'rgba(239,68,68,0.15)' : log.riskScore >= 20 ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)',
                                                        color: log.riskScore >= 50 ? '#ef4444' : log.riskScore >= 20 ? '#f59e0b' : '#22c55e',
                                                    }}>
                                                        {log.riskScore}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 16px', color: 'var(--text-muted)', fontSize: 11 }}>
                                                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {logs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                                Aucun log de sécurité disponible
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'ips' && (
                    <motion.div
                        key="ips"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 16,
                            padding: 24,
                        }}
                    >
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
                            🚫 Gestion des IPs bloquées
                        </h3>
                        {stats?.suspiciousIps?.length ? stats.suspiciousIps.map((ip, i) => (
                            <motion.div
                                key={ip}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 20px', marginBottom: 12,
                                    background: 'rgba(239,68,68,0.04)',
                                    border: '1px solid rgba(239,68,68,0.15)',
                                    borderRadius: 14,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 12,
                                        background: 'rgba(239,68,68,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20,
                                    }}>
                                        🚫
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                            {ip}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            Détecté dans les dernières 24h
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnblockIp(ip)}
                                    style={{
                                        padding: '8px 20px', borderRadius: 10, fontSize: 13,
                                        border: '1px solid rgba(34,197,94,0.3)',
                                        background: 'rgba(34,197,94,0.1)',
                                        color: '#22c55e', cursor: 'pointer', fontWeight: 600,
                                        transition: 'all 0.3s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(34,197,94,0.2)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(34,197,94,0.1)';
                                    }}
                                >
                                    ✅ Débloquer
                                </button>
                            </motion.div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)', fontSize: 14 }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                                Aucune IP bloquée actuellement
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SecurityDashboardPage;
