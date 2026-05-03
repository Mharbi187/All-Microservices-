// ============================================================
// NEXUS-AID — News Page
// Modern news feed with filtering, likes, and infinite scroll
// ============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Typography, Tag, Space, Spin, Row, Col, Input, Select, Card, Empty,
    Button, Divider, Avatar, Badge, Tooltip, Alert,
} from 'antd';
import {
    HeartOutlined, HeartFilled, ShareAltOutlined, FilterOutlined,
    GlobalOutlined, ApartmentOutlined, CalendarOutlined,
    ThunderboltOutlined, BookOutlined, RocketOutlined, TeamOutlined,
    SearchOutlined, ClockCircleOutlined, ReloadOutlined, WifiOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import newsService from '@/services/newsService';
import type { NewsItemDTO } from '@/services/newsService';
import { useAuthStore, useUIStore } from '@/stores';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;

// ── Category config ───────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    NATIONAL: { label: 'National', color: '#DC2626', bg: '#FEF2F2', icon: <GlobalOutlined /> },
    COMMITTEE: { label: 'Comité', color: '#2563EB', bg: '#EFF6FF', icon: <ApartmentOutlined /> },
    FORMATION: { label: 'Formation', color: '#7C3AED', bg: '#F5F3FF', icon: <BookOutlined /> },
    EVENT: { label: 'Événement', color: '#059669', bg: '#ECFDF5', icon: <RocketOutlined /> },
    URGENCE: { label: 'Urgence', color: '#EA580C', bg: '#FFF7ED', icon: <ThunderboltOutlined /> },
};

// ── Single news card ─────────────────────────────────────────
const NewsCard: React.FC<{
    item: NewsItemDTO;
    onLike: (id: string) => void;
    isDark: boolean;
}> = ({ item, onLike, isDark }) => {
    const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.NATIONAL;
    const cardBg = isDark ? '#1A1D27' : '#FFFFFF';
    const textPrimary = isDark ? '#F3F4F6' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({ title: item.title, text: item.summary || item.content });
        } else {
            navigator.clipboard.writeText(window.location.href);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ y: -4, boxShadow: `0 20px 60px ${cfg.color}20` }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 350 }}
            style={{
                background: cardBg,
                borderRadius: 24,
                overflow: 'hidden',
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
            }}
        >
            {/* Category color strip */}
            <div style={{
                height: 5,
                background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}80)`,
            }} />

            <div style={{ padding: '24px 24px 16px', flex: 1 }}>
                {/* Category + Time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: isDark ? `${cfg.color}20` : cfg.bg,
                        color: cfg.color,
                        borderRadius: 99, padding: '4px 12px',
                        fontSize: 12, fontWeight: 800,
                    }}>
                        {cfg.icon} {cfg.label}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: textSecondary }}>
                        <ClockCircleOutlined />
                        {newsService.timeAgo(item.publishedAt)}
                    </div>
                </div>

                {/* Title */}
                <div style={{
                    fontSize: 16, fontWeight: 900, color: textPrimary,
                    lineHeight: 1.4, marginBottom: 10,
                    letterSpacing: '-0.02em',
                }}>
                    {item.title}
                </div>

                {/* Summary */}
                <div style={{
                    fontSize: 14, color: textSecondary,
                    lineHeight: 1.6, marginBottom: 16,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                }}>
                    {item.summary || item.content}
                </div>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                        {item.tags.slice(0, 3).map(tag => (
                            <span key={tag} style={{
                                fontSize: 11, fontWeight: 700,
                                background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
                                color: textSecondary,
                                borderRadius: 6, padding: '2px 8px',
                            }}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <Divider style={{ margin: 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
            <div style={{
                padding: '14px 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar
                        size={28}
                        style={{ background: `${cfg.color}20`, color: cfg.color, fontSize: 11, fontWeight: 800 }}
                    >
                        {(item.authorName || 'A').charAt(0)}
                    </Avatar>
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: textPrimary, lineHeight: 1.2 }}>
                            {item.authorName || 'Équipe CRT'}
                        </div>
                        {item.committeeName && (
                            <div style={{ fontSize: 11, color: textSecondary }}>{item.committeeName}</div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <Space size={8}>
                    <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); onLike(item.id); }}
                        style={{
                            border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 13, fontWeight: 700,
                            color: item.isLiked ? '#EF4444' : textSecondary,
                            padding: '4px 10px', borderRadius: 99,
                            background: item.isLiked
                                ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
                                : (isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB'),
                        }}
                    >
                        {item.isLiked ? <HeartFilled /> : <HeartOutlined />}
                        {item.likesCount + (item.isLiked ? 0 : 0)}
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleShare(); }}
                        style={{
                            border: 'none', background: isDark ? 'rgba(255,255,255,0.06)' : '#F9FAFB',
                            cursor: 'pointer', borderRadius: 99, padding: '4px 10px',
                            color: textSecondary, fontSize: 13,
                        }}
                    >
                        <ShareAltOutlined />
                    </motion.button>
                </Space>
            </div>
        </motion.div>
    );
};

// ── Main Page ─────────────────────────────────────────────────
const NewsPage: React.FC = () => {
    const { user } = useAuthStore();
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';

    const [news, setNews] = useState<NewsItemDTO[]>([]);
    const [loading, setLoading] = useState(true);
    const [backendError, setBackendError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState<string>('ALL');

    const bg = isDark ? '#0F1117' : '#F5F5F7';
    const cardBg = isDark ? '#1A1D27' : '#FFFFFF';
    const textPrimary = isDark ? '#F3F4F6' : '#111827';
    const textSecondary = isDark ? '#9CA3AF' : '#6B7280';

    useEffect(() => {
        loadNews();
    }, [activeFilter, retryCount]);

    const loadNews = useCallback(async () => {
        setLoading(true);
        setBackendError(null);
        try {
            const data = await newsService.getAll({
                category: activeFilter !== 'ALL' ? activeFilter : undefined,
                committeeId: user?.committeeId,
            });
            setNews(data);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 503 || status === 502 || status === 504) {
                setBackendError('Le service est temporairement indisponible (backend en cours de démarrage). Les données seront chargées automatiquement.');
            } else if (!navigator.onLine) {
                setBackendError('Pas de connexion internet. Vérifiez votre réseau.');
            } else {
                setBackendError(`Erreur de chargement (${status || 'réseau'}). Réessayez dans quelques instants.`);
            }
            setNews([]);
        } finally {
            setLoading(false);
        }
    }, [activeFilter, user?.committeeId]);

    // Auto-retry every 15s when backend is down
    useEffect(() => {
        if (!backendError) return;
        const timer = setTimeout(() => setRetryCount(c => c + 1), 15_000);
        return () => clearTimeout(timer);
    }, [backendError, retryCount]);

    const handleLike = (newsId: string) => {
        // Optimistic update
        setNews(prev => prev.map(n => n.id === newsId
            ? { ...n, isLiked: !n.isLiked, likesCount: n.likesCount + (n.isLiked ? -1 : 1) }
            : n
        ));
        newsService.like(newsId);
    };

    // Client-side search filter
    const filtered = useMemo(() => {
        if (!search) return news;
        const q = search.toLowerCase();
        return news.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q) ||
            n.authorName?.toLowerCase().includes(q) ||
            n.tags?.some(t => t.toLowerCase().includes(q))
        );
    }, [news, search]);

    const filters = ['ALL', 'NATIONAL', 'COMMITTEE', 'FORMATION', 'EVENT', 'URGENCE'];

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
                        boxShadow: '0 4px 16px rgba(220,38,38,0.4)',
                        flexShrink: 0,
                    }} />
                    <div>
                        <Title level={2} style={{ margin: 0, fontWeight: 900, fontSize: 28, letterSpacing: '-0.03em', color: textPrimary }}>
                            Actualités
                        </Title>
                        <Text style={{ color: textSecondary, fontSize: 14, fontWeight: 500 }}>
                            Restez informé des activités du Croissant Rouge Tunisien
                        </Text>
                    </div>
                </div>

                <Badge count={filtered.length} style={{ backgroundColor: '#DC2626' }}>
                    <Tag style={{
                        fontSize: 13, padding: '6px 16px', borderRadius: 99,
                        background: isDark ? 'rgba(220,38,38,0.15)' : '#FEF2F2',
                        color: '#DC2626', border: 'none', fontWeight: 800,
                    }}>
                        <GlobalOutlined /> Publications
                    </Tag>
                </Badge>
            </motion.div>

            {/* ── Filters bar ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    display: 'flex', gap: 12, flexWrap: 'wrap',
                    alignItems: 'center',
                    background: cardBg,
                    borderRadius: 20,
                    padding: '16px 20px',
                    marginBottom: 28,
                    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
                    border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                }}
            >
                {/* Category filter pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                    {filters.map(f => {
                        const cfg = f !== 'ALL' ? CATEGORY_CONFIG[f] : null;
                        const isActive = activeFilter === f;
                        return (
                            <motion.button
                                key={f}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setActiveFilter(f)}
                                style={{
                                    border: 'none',
                                    background: isActive
                                        ? (cfg ? `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` : 'linear-gradient(135deg, #DC2626, #991B1B)')
                                        : (isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6'),
                                    color: isActive ? '#fff' : textSecondary,
                                    borderRadius: 99,
                                    padding: '7px 16px',
                                    fontSize: 13, fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'all 0.2s',
                                }}
                            >
                                {cfg && cfg.icon}
                                {f === 'ALL' ? 'Toutes' : cfg?.label || f}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Search */}
                <div style={{ minWidth: 220 }}>
                    <Input
                        placeholder="Rechercher..."
                        prefix={<SearchOutlined style={{ color: textSecondary }} />}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        allowClear
                        style={{ borderRadius: 12, border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}` }}
                    />
                </div>
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
                        message="Service temporairement indisponible"
                        description={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                                <span>{backendError}</span>
                                <Button
                                    size="small"
                                    icon={<ReloadOutlined />}
                                    onClick={() => setRetryCount(c => c + 1)}
                                    style={{ borderRadius: 8, fontWeight: 700 }}
                                >
                                    Réessayer maintenant
                                </Button>
                            </div>
                        }
                        style={{ borderRadius: 16, border: '1.5px solid #FCD34D' }}
                    />
                </motion.div>
            )}

            {/* ── News grid ── */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                    <Spin size="large" />
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 80 }}>
                    <Empty
                        description={<Text style={{ color: textSecondary }}>{backendError ? 'Service indisponible — réessai automatique dans 15 s…' : 'Aucune actualité pour le moment'}</Text>}
                    />
                </div>
            ) : (
                <AnimatePresence>
                    <Row gutter={[24, 24]}>
                        {filtered.map((item, idx) => (
                            <Col xs={24} sm={12} lg={8} key={item.id}>
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    style={{ height: '100%' }}
                                >
                                    <NewsCard item={item} onLike={handleLike} isDark={isDark} />
                                </motion.div>
                            </Col>
                        ))}
                    </Row>
                </AnimatePresence>
            )}

            {/* ── Load more / Refresh ── */}
            {!loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    style={{ textAlign: 'center', marginTop: 40 }}
                >
                    <Button
                        size="large"
                        icon={<ReloadOutlined />}
                        onClick={() => setRetryCount(c => c + 1)}
                        style={{
                            borderRadius: 99, fontWeight: 700,
                            padding: '0 32px', height: 44,
                        }}
                    >
                        Actualiser
                    </Button>
                </motion.div>
            )}
        </div>
    );
};

export default NewsPage;
