// ============================================================
// NEXUS-AID — Global Notifications Page
// Centralized page for all users to view their notifications
// ============================================================

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Spin, Empty, Button, Space, Badge, List, Tag } from 'antd';
import {
    BellOutlined, CheckCircleOutlined, MessageOutlined,
    FileTextOutlined, CalendarOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { useReportingStore } from '@/stores/reportingStore';
import { notificationService } from '@/services/notificationService';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

export default function GlobalNotificationsPage() {
    const navigate = useNavigate();
    const { notifications: reportingNotifs, markRead: markReportingRead, markAllRead: markAllReportingRead } = useReportingStore();
    const [dbNotifications, setDbNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDbNotifications = async () => {
        try {
            const data = await notificationService.getMyNotifications();
            setDbNotifications(data || []);
        } catch (e) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDbNotifications();
    }, []);

    const handleMarkAllRead = async () => {
        markAllReportingRead();
        try {
            await notificationService.markAllAsRead();
            fetchDbNotifications();
        } catch { }
    };

    const getNotificationIcon = (iconType: string) => {
        const style = { fontSize: 18 };
        switch (iconType) {
            case 'chat':
            case 'REPORT_SUBMITTED':
                return <MessageOutlined style={{ ...style, color: '#4F46E5' }} />;
            case 'file':
            case 'REPORT_ASSIGNED':
                return <FileTextOutlined style={{ ...style, color: '#2563EB' }} />;
            case 'calendar':
            case 'REPORT_FINALIZED':
                return <CalendarOutlined style={{ ...style, color: '#10B981' }} />;
            case 'info':
            case 'REPORT_VALIDATED':
            default:
                return <InfoCircleOutlined style={{ ...style, color: '#F59E0B' }} />;
        }
    };

    const iconBgColor = (iconType: string) => {
        switch (iconType) {
            case 'chat': return '#EEF2FF';
            case 'file': return '#EFF6FF';
            case 'calendar': return '#ECFDF5';
            case 'info':
            default: return '#FFFBEB';
        }
    };

    const combinedNotifications = useMemo(() => {
        const list: any[] = [];

        reportingNotifs.forEach((n) => {
            list.push({
                id: n.id,
                title: n.reportTitle || "Alerte Rapport",
                message: n.message,
                time: new Date(n.timestamp),
                read: n.read,
                iconType: n.type || 'info',
                onClick: () => {
                    markReportingRead(n.id);
                    if (n.type === 'REPORT_ASSIGNED') {
                        navigate(`/reporting/reports/${n.reportId}/fill`);
                    } else {
                        navigate(`/reporting/reports/${n.reportId}`);
                    }
                }
            });
        });

        dbNotifications.forEach((n) => {
            list.push({
                id: n.id,
                title: n.title,
                message: n.message,
                time: new Date(n.createdAt),
                read: n.read,
                iconType: n.type,
                onClick: async () => {
                    try {
                        await notificationService.markAsRead(n.id);
                        fetchDbNotifications();
                    } catch { }
                    if (n.link) navigate(n.link);
                }
            });
        });

        list.sort((a, b) => b.time.getTime() - a.time.getTime());
        return list;
    }, [reportingNotifs, dbNotifications, navigate, markReportingRead]);

    const unreadCount = combinedNotifications.filter(n => !n.read).length;

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12, marginRight: 14,
                            background: 'rgba(224,28,46,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <BellOutlined style={{ color: 'var(--crt-red)', fontSize: 22 }} />
                        </div>
                        Mes Notifications
                        {unreadCount > 0 && <Badge count={unreadCount} style={{ marginLeft: 12, backgroundColor: '#DC2626' }} />}
                    </Title>
                    <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>Retrouvez toutes vos alertes, rapports, et mises à jour en un seul endroit.</Text>
                </div>
                {unreadCount > 0 && (
                    <Button type="primary" onClick={handleMarkAllRead} style={{ background: '#4b5563', borderColor: '#4b5563', borderRadius: 8 }}>
                        Tout marquer comme lu
                    </Button>
                )}
            </div>

            <Card className="glass-card" styles={{ body: { padding: 0 } }} style={{ borderRadius: 16, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
                ) : combinedNotifications.length === 0 ? (
                    <Empty description="Aucune notification pour le moment" style={{ padding: '60px 0' }} />
                ) : (
                    <List
                        dataSource={combinedNotifications}
                        renderItem={(item) => (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                                <div
                                    onClick={item.onClick}
                                    style={{
                                        display: 'flex',
                                        gap: 16,
                                        padding: '20px 24px',
                                        borderBottom: '1px solid var(--input-border)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        background: item.read ? 'transparent' : 'rgba(220, 38, 38, 0.03)',
                                        borderLeft: item.read ? '4px solid transparent' : '4px solid #DC2626'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = item.read ? 'transparent' : 'rgba(220, 38, 38, 0.03)'}
                                >
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '50%',
                                        background: iconBgColor(item.iconType),
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        {getNotificationIcon(item.iconType)}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                            <Text strong style={{ fontSize: 15, color: 'var(--text-primary)', display: 'block' }}>
                                                {item.title}
                                            </Text>
                                            <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                {item.time.toLocaleString('fr-FR', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 14, marginTop: 4, display: 'block' }}>
                                            {item.message}
                                        </Text>
                                    </div>
                                    {!item.read && (
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <Badge status="error" />
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    />
                )}
            </Card>
        </div>
    );
}
