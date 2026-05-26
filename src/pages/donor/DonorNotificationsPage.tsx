// ============================================================
// NEXUS-AID — Donor Notifications Page
// Real-time notification center for donors
// ============================================================

import { useState, useEffect } from 'react';
import { Typography, Space, Tag, Button, Badge, Empty } from 'antd';
import {
    BellOutlined, CheckCircleOutlined, EnvironmentOutlined,
    GiftOutlined, HeartOutlined, InfoCircleOutlined,
    DeleteOutlined, CheckOutlined,
} from '@ant-design/icons';
import { useUIStore } from '@/stores';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '@/services/notificationService';
import type { DonorNotification as ApiNotification } from '@/services/notificationService';

const { Title, Text } = Typography;

// ============================================================
// Types & Mock Data
// ============================================================
export interface UINotification extends ApiNotification {}

const NOTIF_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
    'DON_VALIDE': { icon: <CheckCircleOutlined />, color: '#16a34a', bg: 'rgba(22,163,74,0.1)', label: 'Don validé' },
    'NOUVEAU_BESOIN': { icon: <EnvironmentOutlined />, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Nouveau besoin' },
    'MISE_A_JOUR': { icon: <InfoCircleOutlined />, color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)', label: 'Mise à jour' },
    'IMPACT': { icon: <HeartOutlined />, color: '#ec4899', bg: 'rgba(236,72,153,0.1)', label: 'Impact' },
    'INFO': { icon: <GiftOutlined />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Information' },
    'DEFAULT': { icon: <BellOutlined />, color: '#999', bg: 'rgba(153,153,153,0.1)', label: 'Notification' },
};

// ============================================================
// Notification Item
// ============================================================
const NotificationItem: React.FC<{
    notif: UINotification;
    isDark: boolean;
    onRead: (id: string) => void;
    onDelete: (id: string) => void;
    onClick: () => void;
}> = ({ notif, isDark, onRead, onDelete, onClick }) => {
    const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG['DEFAULT'];

    return (
        <div
            onClick={onClick}
            style={{
                background: notif.read
                    ? (isDark ? 'rgba(255,255,255,0.01)' : '#fafafa')
                    : (isDark ? `${cfg.color}10` : `${cfg.color}06`),
                borderRadius: 16,
                padding: '18px 20px',
                border: `1px solid ${notif.read
                    ? (isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0')
                    : `${cfg.color}25`}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                position: 'relative',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.borderColor = `${cfg.color}40`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = notif.read ? (isDark ? 'rgba(255,255,255,0.05)' : '#f0f0f0') : `${cfg.color}25`; }}
        >
            {/* Unread indicator */}
            {!notif.read && (
                <div style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: cfg.color,
                    boxShadow: `0 0 8px ${cfg.color}80`,
                }} />
            )}

            {/* Icon */}
            <div style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: cfg.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: cfg.color,
                flexShrink: 0,
                border: `1px solid ${cfg.color}20`,
            }}>
                {cfg.icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <Text strong style={{ fontSize: 14, fontWeight: notif.read ? 600 : 700 }}>
                        {notif.title}
                    </Text>
                    <Space size={4} style={{ flexShrink: 0, marginLeft: 12 }}>
                        <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : '#bbb', whiteSpace: 'nowrap' }}>
                            {new Date(notif.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </Space>
                </div>
                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.6)' : '#555', lineHeight: 1.5, display: 'block', marginBottom: 10 }}>
                    {notif.message}
                </Text>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Space size={6}>
                        <Tag style={{ background: cfg.bg, color: cfg.color, border: 'none', borderRadius: 6, fontSize: 11, margin: 0 }}>
                            {cfg.label}
                        </Tag>
                        <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : '#bbb' }}>{new Date(notif.createdAt).toLocaleDateString('fr-FR')}</Text>
                        {notif.metadata?.committee && (
                            <Text style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.3)' : '#bbb' }}>
                                · {notif.metadata.committee}
                            </Text>
                        )}
                    </Space>
                    <Space size={4}>
                        {!notif.read && (
                            <Button
                                type="text"
                                size="small"
                                icon={<CheckOutlined />}
                                onClick={(e) => { e.stopPropagation(); onRead(notif.id); }}
                                style={{ color: '#16a34a', fontSize: 11, padding: '0 6px' }}
                            >
                                Lu
                            </Button>
                        )}
                        <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                            danger
                            style={{ fontSize: 11, padding: '0 6px' }}
                        />
                    </Space>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// Main Notifications Page
// ============================================================
const DonorNotificationsPage: React.FC = () => {
    const navigate = useNavigate();
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';

    const [notifications, setNotifications] = useState<UINotification[]>([]);
    const [filter, setFilter] = useState<'ALL' | 'UNREAD' | string>('ALL');

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await notificationService.getMyNotifications();
                setNotifications(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchNotifications();
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await notificationService.markAsRead(id);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            // Revert state if failed
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
        }
    };

    const markAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await notificationService.markAllAsRead();
        } catch (error) {
            console.error('Failed to mark all as read:', error);
            setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: false } : n));
        }
    };

    const deleteNotif = (id: string) => {
        // Implement delete if available in API, for now just remove from UI
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNotifClick = (notif: UINotification) => {
        if (!notif.read) markAsRead(notif.id);
        if (notif.link) navigate(notif.link);
    };

    const filteredNotifs = notifications.filter((n) => {
        if (filter === 'UNREAD') return !n.read;
        if (filter !== 'ALL') return n.type === filter;
        return true;
    });

    return (
        <div style={{ background: isDark ? '#0f172a' : '#f0fdf4', margin: -24, padding: 24, minHeight: '100vh' }}>
            {/* Header */}
            <div style={{
                background: isDark ? 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))' : 'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(255,255,255,0.9))',
                borderRadius: 20, padding: '24px 28px', marginBottom: 24,
                border: '1px solid rgba(22,163,74,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #16a34a, #4ade80)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, boxShadow: '0 0 20px rgba(22,163,74,0.4)' }}>
                        <BellOutlined style={{ color: '#fff' }} />
                    </div>
                    <div>
                        <Space size={10}>
                            <Title level={4} style={{ margin: 0 }}>Centre de Notifications</Title>
                            {unreadCount > 0 && <Badge count={unreadCount} />}
                        </Space>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13 }}>
                            {notifications.length} notification(s) · {unreadCount} non lue(s)
                        </Text>
                    </div>
                </div>
                {unreadCount > 0 && (
                    <Button
                        icon={<CheckOutlined />}
                        onClick={markAllRead}
                        style={{ borderRadius: 10, fontWeight: 600, borderColor: '#16a34a', color: '#16a34a' }}
                    >
                        Tout marquer comme lu
                    </Button>
                )}
            </div>

            {/* Filters */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                borderRadius: 16, padding: '12px 20px', marginBottom: 20,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                display: 'flex', gap: 8, flexWrap: 'wrap',
            }}>
                {([
                    { value: 'ALL', label: 'Toutes' },
                    { value: 'UNREAD', label: `Non lues (${unreadCount})` },
                    { value: 'DON_VALIDE', label: '✅ Dons validés' },
                    { value: 'NOUVEAU_BESOIN', label: '🚨 Nouveaux besoins' },
                    { value: 'IMPACT', label: '💗 Impact' },
                    { value: 'MISE_A_JOUR', label: '📢 Mises à jour' },
                ] as const).map((f) => (
                    <Button
                        key={f.value}
                        type={filter === f.value ? 'primary' : 'default'}
                        size="small"
                        onClick={() => setFilter(f.value as any)}
                        style={{
                            borderRadius: 8,
                            fontWeight: 600,
                            background: filter === f.value ? '#16a34a' : undefined,
                            borderColor: filter === f.value ? '#16a34a' : undefined,
                        }}
                    >
                        {f.label}
                    </Button>
                ))}
            </div>

            {/* Notifications list */}
            {filteredNotifs.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: 80,
                    background: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
                    borderRadius: 20, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                }}>
                    <BellOutlined style={{ fontSize: 56, color: isDark ? 'rgba(255,255,255,0.15)' : '#ddd', display: 'block', marginBottom: 16 }} />
                    <Title level={5} style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#ccc', marginBottom: 8 }}>
                        Aucune notification
                    </Title>
                    <Text style={{ color: isDark ? 'rgba(255,255,255,0.2)' : '#bbb' }}>
                        Vos notifications apparaîtront ici
                    </Text>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Unread section */}
                    {filteredNotifs.some(n => !n.read) && (
                        <>
                            <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>
                                Non lues
                            </Text>
                            {filteredNotifs.filter(n => !n.read).map(notif => (
                                <NotificationItem
                                    key={notif.id}
                                    notif={notif}
                                    isDark={isDark}
                                    onRead={markAsRead}
                                    onDelete={deleteNotif}
                                    onClick={() => handleNotifClick(notif)}
                                />
                            ))}
                        </>
                    )}

                    {/* Read section */}
                    {filteredNotifs.some(n => n.read) && (
                        <>
                            <Text strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em', color: isDark ? 'rgba(255,255,255,0.4)' : '#999', marginTop: 8 }}>
                                Lues
                            </Text>
                            {filteredNotifs.filter(n => n.read).map(notif => (
                                <NotificationItem
                                    key={notif.id}
                                    notif={notif}
                                    isDark={isDark}
                                    onRead={markAsRead}
                                    onDelete={deleteNotif}
                                    onClick={() => handleNotifClick(notif)}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Info footer */}
            <div style={{
                marginTop: 24, padding: '14px 24px', borderRadius: 16,
                background: 'rgba(22,163,74,0.04)', border: '1px solid rgba(22,163,74,0.12)',
                display: 'flex', alignItems: 'center', gap: 10,
            }}>
                <InfoCircleOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                <Text style={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.5)' : '#888' }}>
                    Les notifications sont envoyées automatiquement lors de la validation de vos dons et lors de la publication de nouveaux besoins.
                </Text>
            </div>
        </div>
    );
};

export default DonorNotificationsPage;


