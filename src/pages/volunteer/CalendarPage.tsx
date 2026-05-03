// ============================================================
// NEXUS-AID — Calendar Page
// Animated month/week calendar with event cards
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Tag, Space, Spin, Button, Empty, Badge, Divider, Drawer, Avatar, Alert } from 'antd';
import {
    LeftOutlined, RightOutlined, CalendarOutlined, ClockCircleOutlined,
    EnvironmentOutlined, TeamOutlined, PlusOutlined, CheckCircleOutlined,
    WifiOutlined, ReloadOutlined,
    ThunderboltOutlined, BookOutlined, RocketOutlined, ApartmentOutlined, HeartOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import calendarService from '@/services/calendarService';
import type { CalendarEventDTO } from '@/services/calendarService';
import { useAuthStore, useUIStore } from '@/stores';

const { Title, Text } = Typography;

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
    FORMATION: <BookOutlined />,
    EVENT: <RocketOutlined />,
    URGENCE: <ThunderboltOutlined />,
    REUNION: <ApartmentOutlined />,
    COLLECTE: <HeartOutlined />,
};

// ── Event Detail Drawer ───────────────────────────────────────
const EventDrawer: React.FC<{
    event: CalendarEventDTO | null;
    open: boolean;
    onClose: () => void;
    isDark: boolean;
}> = ({ event, open, onClose, isDark }) => {
    if (!event) return null;
    const color = calendarService.typeColor(event.type);
    const textPrimary = isDark ? '#F3F4F6' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const occupancy = event.maxParticipants && event.registeredCount !== undefined
        ? Math.round((event.registeredCount / event.maxParticipants) * 100)
        : null;

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={
                <Space>
                    <div style={{
                        width: 32, height: 32, borderRadius: 10,
                        background: `${color}20`, color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                    }}>
                        {TYPE_ICONS[event.type] || <CalendarOutlined />}
                    </div>
                    <span style={{ fontWeight: 800 }}>{calendarService.typeLabel(event.type)}</span>
                </Space>
            }
            width={400}
            styles={{ body: { padding: 24 } }}
        >
            <Title level={4} style={{ marginTop: 0, color: textPrimary }}>{event.title}</Title>

            {/* Date/Time */}
            <div style={{
                background: `${color}15`, borderRadius: 14, padding: '16px',
                marginBottom: 20, border: `1px solid ${color}30`,
            }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <CalendarOutlined style={{ color }} />
                        <Text style={{ fontWeight: 700, color: textPrimary }}>
                            {calendarService.formatDate(event.startDate)}
                        </Text>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <ClockCircleOutlined style={{ color }} />
                        <Text style={{ color: textSecondary }}>
                            {calendarService.formatTime(event.startDate)}
                            {event.endDate && ` → ${calendarService.formatTime(event.endDate)}`}
                        </Text>
                    </div>
                    {event.location && (
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <EnvironmentOutlined style={{ color, marginTop: 3 }} />
                            <Text style={{ color: textSecondary }}>{event.location}</Text>
                        </div>
                    )}
                </Space>
            </div>

            {/* Description */}
            {event.description && (
                <Text style={{ color: textSecondary, lineHeight: 1.7, display: 'block', marginBottom: 20 }}>
                    {event.description}
                </Text>
            )}

            {/* Organizer */}
            {event.organizerName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <Avatar size={36} style={{ background: `${color}20`, color, fontWeight: 800 }}>
                        {event.organizerName.charAt(0)}
                    </Avatar>
                    <div>
                        <Text style={{ fontWeight: 700, fontSize: 13, color: textPrimary }}>{event.organizerName}</Text>
                        {event.committeeName && (
                            <Text style={{ fontSize: 12, color: textSecondary, display: 'block' }}>{event.committeeName}</Text>
                        )}
                    </div>
                </div>
            )}

            {/* Participants */}
            {occupancy !== null && (
                <div style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB',
                    borderRadius: 12, padding: '14px 16px', marginBottom: 20,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: textSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Participants
                        </Text>
                        <Text style={{ fontWeight: 800, color: textPrimary }}>
                            {event.registeredCount}/{event.maxParticipants}
                        </Text>
                    </div>
                    <div style={{
                        height: 6, borderRadius: 99,
                        background: isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB',
                        overflow: 'hidden',
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${occupancy}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            style={{
                                height: '100%', borderRadius: 99,
                                background: occupancy >= 90
                                    ? 'linear-gradient(90deg, #EF4444, #DC2626)'
                                    : `linear-gradient(90deg, ${color}, ${color}99)`,
                            }}
                        />
                    </div>
                    {occupancy >= 90 && (
                        <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: 700, marginTop: 6, display: 'block' }}>
                            Presque complet !
                        </Text>
                    )}
                </div>
            )}

            {/* CTA */}
            <Button
                type="primary"
                block
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={() => calendarService.register(event.id).catch(() => {})}
                style={{
                    borderRadius: 14, fontWeight: 800, height: 48,
                    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                    border: 'none',
                }}
                disabled={occupancy !== null && occupancy >= 100}
            >
                {occupancy !== null && occupancy >= 100 ? 'Complet' : "S'inscrire"}
            </Button>
        </Drawer>
    );
};

// ── Main Calendar Component ───────────────────────────────────
const CalendarPage: React.FC = () => {
    const { user } = useAuthStore();
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';

    const [events, setEvents] = useState<CalendarEventDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<CalendarEventDTO | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

    const bg = isDark ? '#0F1117' : '#F5F5F7';
    const cardBg = isDark ? '#1A1D27' : '#FFFFFF';
    const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textPrimary = isDark ? '#F3F4F6' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    useEffect(() => {
        loadEvents();
    }, [currentDate.getMonth(), currentDate.getFullYear(), retryCount]);

    const loadEvents = async () => {
        setLoading(true);
        setBackendError(null);
        try {
            const data = await calendarService.getEvents(currentDate.getMonth(), currentDate.getFullYear());
            setEvents(data);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 503 || status === 502 || status === 504) {
                setBackendError('Le service calendrier est temporairement indisponible. Réessai automatique dans 15 s…');
            } else {
                setBackendError(`Impossible de charger les événements (${status || 'réseau'}).`);
            }
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    // Auto-retry every 15s when backend is down
    useEffect(() => {
        if (!backendError) return;
        const timer = setTimeout(() => setRetryCount(c => c + 1), 15_000);
        return () => clearTimeout(timer);
    }, [backendError, retryCount]);

    // Build calendar grid for the month
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const eventsByDay = calendarService.groupByDay(events);

        const days: Array<{ date: Date | null; events: CalendarEventDTO[] }> = [];

        // Empty cells before month start
        for (let i = 0; i < firstDay; i++) days.push({ date: null, events: [] });

        // Days of month
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const key = date.toISOString().slice(0, 10);
            days.push({ date, events: eventsByDay[key] || [] });
        }

        return days;
    }, [currentDate, events]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const goMonthPrev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    const goMonthNext = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

    const handleEventClick = (ev: CalendarEventDTO) => {
        setSelectedEvent(ev);
        setDrawerOpen(true);
    };

    // Upcoming events sorted by date
    const upcomingEvents = useMemo(() =>
        [...events]
            .filter(e => new Date(e.startDate) >= today)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .slice(0, 10),
        [events]
    );

    return (
        <div style={{
            maxWidth: 1300, margin: '0 auto',
            padding: '0 28px 64px',
            fontFamily: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
        }}>
            {/* ── Header ── */}
            <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    paddingTop: 40, paddingBottom: 36,
                    display: 'flex', alignItems: 'flex-start',
                    justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 6, height: 52, borderRadius: 99,
                        background: 'linear-gradient(180deg, #EF4444 0%, #7F1D1D 100%)',
                        boxShadow: '0 4px 16px rgba(220,38,38,0.4)', flexShrink: 0,
                    }} />
                    <div>
                        <Title level={2} style={{ margin: 0, fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', color: textPrimary }}>
                            Calendrier des Activités
                        </Title>
                        <Text style={{ color: textSecondary, fontSize: 14 }}>
                            Formations, événements et réunions de votre comité
                        </Text>
                    </div>
                </div>

                <Space>
                    {/* View toggle */}
                    <div style={{
                        display: 'inline-flex', borderRadius: 12, overflow: 'hidden',
                        border: `1.5px solid ${borderColor}`,
                    }}>
                        {(['month', 'list'] as const).map(mode => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                style={{
                                    border: 'none', cursor: 'pointer',
                                    padding: '8px 18px', fontSize: 13, fontWeight: 700,
                                    background: viewMode === mode
                                        ? 'linear-gradient(135deg, #DC2626, #991B1B)'
                                        : (isDark ? '#1A1D27' : '#FFFFFF'),
                                    color: viewMode === mode ? '#fff' : textSecondary,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {mode === 'month' ? '📅 Mois' : '📋 Liste'}
                            </button>
                        ))}
                    </div>
                </Space>
            </motion.div>

            {/* ── Backend error banner ── */}
            {backendError && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: 20 }}
                >
                    <Alert
                        type="warning"
                        showIcon
                        icon={<WifiOutlined />}
                        message="Service calendrier indisponible"
                        description={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <span>{backendError}</span>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={() => setRetryCount(c => c + 1)}
                                    style={{ borderRadius: 8, fontWeight: 700 }}
                                >
                                    Réessayer
                                </Button>
                            </div>
                        }
                        style={{ borderRadius: 16, border: '1.5px solid #FCD34D' }}
                    />
                </motion.div>
            )}

            {/* ── Month navigator ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: cardBg, borderRadius: 20, padding: '16px 24px',
                    marginBottom: 24,
                    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                    border: `1.5px solid ${borderColor}`,
                }}
            >
                <Button
                    icon={<LeftOutlined />}
                    onClick={goMonthPrev}
                    style={{ borderRadius: 10, fontWeight: 700 }}
                />
                <AnimatePresence mode="wait">
                    <motion.div
                        key={`${currentDate.getMonth()}-${currentDate.getFullYear()}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ textAlign: 'center' }}
                    >
                        <div style={{ fontSize: 22, fontWeight: 900, color: textPrimary, letterSpacing: '-0.02em' }}>
                            {MONTHS_FR[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </div>
                        <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
                            {events.length} événement{events.length !== 1 ? 's' : ''} ce mois
                        </div>
                    </motion.div>
                </AnimatePresence>
                <Button
                    icon={<RightOutlined />}
                    onClick={goMonthNext}
                    style={{ borderRadius: 10, fontWeight: 700 }}
                />
            </motion.div>

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                    <Spin size="large" />
                </div>
            ) : viewMode === 'month' ? (
                /* ── MONTH VIEW ── */
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        background: cardBg, borderRadius: 24,
                        overflow: 'hidden',
                        boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.3)' : '0 8px 40px rgba(0,0,0,0.08)',
                        border: `1.5px solid ${borderColor}`,
                    }}
                >
                    {/* Day headers */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                        background: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
                        borderBottom: `1px solid ${borderColor}`,
                    }}>
                        {DAYS_FR.map(day => (
                            <div key={day} style={{
                                padding: '12px 8px', textAlign: 'center',
                                fontSize: 11, fontWeight: 900,
                                color: day === 'Sam' || day === 'Dim' ? '#DC2626' : textSecondary,
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                        {calendarDays.map((cell, idx) => {
                            const isToday = cell.date && cell.date.toDateString() === today.toDateString();
                            const isPast = cell.date && cell.date < today;
                            const isWeekend = cell.date && (cell.date.getDay() === 0 || cell.date.getDay() === 6);

                            return (
                                <div
                                    key={idx}
                                    style={{
                                        minHeight: 100,
                                        padding: '8px',
                                        borderRight: `1px solid ${borderColor}`,
                                        borderBottom: `1px solid ${borderColor}`,
                                        background: isToday
                                            ? (isDark ? 'rgba(220,38,38,0.08)' : '#FFF5F5')
                                            : isPast
                                                ? (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)')
                                                : 'transparent',
                                        transition: 'background 0.2s',
                                    }}
                                >
                                    {cell.date && (
                                        <>
                                            {/* Day number */}
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: isToday ? '#DC2626' : 'transparent',
                                                color: isToday ? '#fff' : isWeekend ? '#DC2626' : isPast ? textSecondary : textPrimary,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 13, fontWeight: isToday ? 900 : 700,
                                                marginBottom: 4,
                                                opacity: isPast ? 0.5 : 1,
                                            }}>
                                                {cell.date.getDate()}
                                            </div>

                                            {/* Events on this day (max 2 visible) */}
                                            {cell.events.slice(0, 2).map(ev => (
                                                <motion.div
                                                    key={ev.id}
                                                    whileHover={{ scale: 1.02 }}
                                                    onClick={() => handleEventClick(ev)}
                                                    style={{
                                                        background: `${calendarService.typeColor(ev.type)}22`,
                                                        borderLeft: `3px solid ${calendarService.typeColor(ev.type)}`,
                                                        borderRadius: '0 6px 6px 0',
                                                        padding: '2px 6px',
                                                        marginBottom: 2,
                                                        cursor: 'pointer',
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <Text style={{
                                                        fontSize: 11, fontWeight: 700,
                                                        color: calendarService.typeColor(ev.type),
                                                        display: 'block',
                                                        overflow: 'hidden', textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {ev.title}
                                                    </Text>
                                                </motion.div>
                                            ))}
                                            {cell.events.length > 2 && (
                                                <Text style={{ fontSize: 10, color: textSecondary, fontWeight: 700 }}>
                                                    +{cell.events.length - 2} autres
                                                </Text>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            ) : (
                /* ── LIST VIEW ── */
                <div>
                    {upcomingEvents.length === 0 ? (
                        <Empty description="Aucun événement à venir" />
                    ) : (
                        upcomingEvents.map((ev, idx) => {
                            const color = calendarService.typeColor(ev.type);
                            return (
                                <motion.div
                                    key={ev.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.06 }}
                                    whileHover={{ x: 4 }}
                                    onClick={() => handleEventClick(ev)}
                                    style={{
                                        display: 'flex', gap: 20, alignItems: 'flex-start',
                                        background: cardBg, borderRadius: 20, padding: '20px 24px',
                                        marginBottom: 12, cursor: 'pointer',
                                        border: `1.5px solid ${borderColor}`,
                                        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.2)' : '0 4px 20px rgba(0,0,0,0.05)',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {/* Date block */}
                                    <div style={{
                                        minWidth: 60, textAlign: 'center',
                                        background: `${color}15`, borderRadius: 14,
                                        padding: '10px 8px', flexShrink: 0,
                                    }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
                                            {new Date(ev.startDate).getDate()}
                                        </div>
                                        <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase' }}>
                                            {MONTHS_FR[new Date(ev.startDate).getMonth()].substring(0, 3)}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Tag style={{
                                                background: `${color}20`, color,
                                                border: 'none', borderRadius: 6,
                                                fontSize: 11, fontWeight: 800, padding: '2px 8px',
                                            }}>
                                                {TYPE_ICONS[ev.type]} {calendarService.typeLabel(ev.type)}
                                            </Tag>
                                        </div>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: textPrimary, marginBottom: 4 }}>
                                            {ev.title}
                                        </div>
                                        <Space size={16} wrap>
                                            <Text style={{ fontSize: 12, color: textSecondary }}>
                                                <ClockCircleOutlined /> {calendarService.formatTime(ev.startDate)}
                                                {ev.endDate && ` – ${calendarService.formatTime(ev.endDate)}`}
                                            </Text>
                                            {ev.location && (
                                                <Text style={{ fontSize: 12, color: textSecondary }}>
                                                    <EnvironmentOutlined /> {ev.location}
                                                </Text>
                                            )}
                                        </Space>
                                    </div>

                                    {/* Participants badge */}
                                    {ev.maxParticipants && (
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: textPrimary }}>
                                                {ev.registeredCount}/{ev.maxParticipants}
                                            </div>
                                            <div style={{ fontSize: 11, color: textSecondary }}>
                                                <TeamOutlined /> places
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ── Event Drawer ── */}
            <EventDrawer
                event={selectedEvent}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isDark={isDark}
            />

            {/* Responsive style */}
            <style>{`
                @media (max-width: 640px) {
                    .calendar-grid { font-size: 10px !important; }
                    .calendar-cell { min-height: 60px !important; padding: 4px !important; }
                }
            `}</style>
        </div>
    );
};

export default CalendarPage;
