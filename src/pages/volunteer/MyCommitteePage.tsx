// ============================================================
// NEXUS-AID — Mon Comité (My Committee Page) — Vue Volontaire
// Affiche : infos comité, période de volontariat, activités
// inscrites, bureau du comité — tout dynamique depuis l'API
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Card, Typography, Tag, Space, Spin, Row, Col, Alert, Empty,
    Statistic, Progress, List, Avatar, Divider, Badge, Tooltip,
    Timeline, Button,
} from 'antd';
import {
    ApartmentOutlined, TeamOutlined, UserOutlined, CalendarOutlined,
    CheckCircleOutlined, CrownOutlined, SafetyOutlined,
    EnvironmentOutlined, ClockCircleOutlined, FireOutlined,
    HeartOutlined, StarOutlined, TrophyOutlined, GlobalOutlined,
    PhoneOutlined, MailOutlined, BankOutlined, PictureOutlined,
    RightOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import committeeService from '@/services/committeeService';
import calendarService, { type CalendarEventDTO } from '@/services/calendarService';
import type { Committee, CommitteeGovernance, CommitteeOverview } from '@/types';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

// ─── Helpers ────────────────────────────────────────────────
const typeLabel: Record<string, string> = {
    NATIONAL: 'National', REGIONAL: 'Régional', LOCAL: 'Local',
};
const typeGradient: Record<string, string> = {
    NATIONAL: 'linear-gradient(135deg, #92400e 0%, #78350f 100%)',
    REGIONAL: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
    LOCAL:    'linear-gradient(135deg, #14532d 0%, #166534 100%)',
};
const typeAccent: Record<string, string> = {
    NATIONAL: '#f59e0b', REGIONAL: '#3b82f6', LOCAL: '#22c55e',
};
const typeIcon: Record<string, React.ReactNode> = {
    NATIONAL: <GlobalOutlined />,
    REGIONAL: <ApartmentOutlined />,
    LOCAL:    <EnvironmentOutlined />,
};

const statusColors: Record<string, string> = {
    ACTIVE: 'green', PENDING_CONSTITUTION: 'orange',
    SUSPENDED: 'red', DISSOLVED: 'default',
};
const statusLabels: Record<string, string> = {
    ACTIVE: 'Actif', PENDING_CONSTITUTION: 'En constitution',
    SUSPENDED: 'Suspendu', DISSOLVED: 'Dissous',
};

/** Duration in human French format */
function durationFrom(isoDate?: string | null): string {
    if (!isoDate) return '—';
    const ms = Date.now() - new Date(isoDate).getTime();
    const days = Math.floor(ms / 86_400_000);
    if (days < 1) return "Aujourd'hui";
    if (days < 30) return `${days} jour${days > 1 ? 's' : ''}`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} an${years > 1 ? 's' : ''} et ${rem} mois` : `${years} an${years > 1 ? 's' : ''}`;
}

function formatDate(iso?: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
}

const EventTypeBadge: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    EVENT:     { label: 'Événement',  color: '#10b981', icon: <StarOutlined /> },
    FORMATION: { label: 'Formation',  color: '#3b82f6', icon: <TrophyOutlined /> },
    REUNION:   { label: 'Réunion',    color: '#8b5cf6', icon: <TeamOutlined /> },
    URGENCE:   { label: 'Urgence',    color: '#ef4444', icon: <ThunderboltOutlined /> },
    COLLECTE:  { label: 'Collecte',   color: '#f97316', icon: <HeartOutlined /> },
    DIFFUSION: { label: 'Diffusion',  color: '#f59e0b', icon: <GlobalOutlined /> },
};

// ─── Component ──────────────────────────────────────────────
const MyCommitteePage: React.FC = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [committee, setCommittee] = useState<Committee | null>(null);
    const [governance, setGovernance] = useState<CommitteeGovernance | null>(null);
    const [overview, setOverview] = useState<CommitteeOverview | null>(null);
    const [myEvents, setMyEvents] = useState<CalendarEventDTO[]>([]);
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEventDTO[]>([]);
    const [loading, setLoading] = useState(true);

    const isApproved = user?.status === 'APPROVED';

    useEffect(() => {
        if (isApproved) loadAll();
        else setLoading(false);
    }, [isApproved]);

    const loadAll = async () => {
        setLoading(true);
        try {
            // 1. Find my committee
            const [committees, hier, events] = await Promise.allSettled([
                committeeService.getAll(),
                committeeService.getHierarchy(),
                calendarService.getUpcomingEvents(),
            ]);

            const committeeId = user?.committeeId ||
                (user?.rawRoles as any)?.[0]?.committeeId;

            if (committeeId) {
                const allCommittees = committees.status === 'fulfilled' ? committees.value : [];
                const found = allCommittees.find((c) => String(c.id) === String(committeeId));
                if (found) setCommittee(found);

                // Governance
                try {
                    const gov = await committeeService.getGovernance(committeeId);
                    setGovernance(gov);
                } catch { /* optional */ }

                // Overview (member count, roles)
                if (hier.status === 'fulfilled') {
                    const ov = hier.value.find((h) => String(h.id) === String(committeeId));
                    if (ov) setOverview(ov);
                }
            }

            // 2. My registered events vs upcoming
            if (events.status === 'fulfilled') {
                const all = events.value;
                const registered = all.filter((e) => e.isRegistered);
                const upcoming = all
                    .filter((e) => e.status === 'VALIDE' && new Date(e.startDate) > new Date())
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .slice(0, 5);
                setMyEvents(registered);
                setUpcomingEvents(upcoming);
            }
        } catch (err) {
            console.error('MyCommitteePage load failed:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Guards ────────────────────────────────────────────────
    if (!isApproved) {
        return (
            <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 24px' }}>
                <Alert
                    message="Accès restreint"
                    description="Votre compte est en attente d'approbation par le président de votre comité."
                    type="warning"
                    showIcon
                    style={{ borderRadius: 12 }}
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Chargement de votre comité...">
                    <div style={{ width: 1, height: 1 }} />
                </Spin>
            </div>
        );
    }

    if (!committee) {
        return (
            <Card style={{ borderRadius: 12, textAlign: 'center', padding: 40 }}>
                <Empty
                    description="Vous n'êtes pas encore affilié à un comité."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
            </Card>
        );
    }

    const type = committee.type || 'LOCAL';
    const accent = typeAccent[type] || '#C81E1E';

    // Volunteer period
    const approvalDate = (user as any)?.approvalDate || (user as any)?.dateAdhesion || null;
    const firstLoginDate = (user as any)?.firstLoginDate || null;
    const volunteerSince = approvalDate || firstLoginDate;

    // Mandate progress
    const mandateProgress = governance?.mandateEndDate
        ? (() => {
            const start = new Date(governance.mandateStartDate || Date.now());
            const end   = new Date(governance.mandateEndDate);
            const now   = new Date();
            const total = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
        })()
        : 0;

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* ══ HEADER BANNER ═══════════════════════════════════════════ */}
            <Card
                style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}
                styles={{ body: { padding: 0 } }}
            >
                <div style={{
                    background: typeGradient[type],
                    padding: '36px 40px',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* Decorative circles */}
                    <div style={{
                        position: 'absolute', right: -60, top: -60,
                        width: 240, height: 240, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
                    }} />
                    <div style={{
                        position: 'absolute', right: 60, top: 30,
                        width: 120, height: 120, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.04)',
                    }} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
                        {/* Committee icon */}
                        <div style={{
                            width: 72, height: 72, borderRadius: 16,
                            background: 'rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 32, color: '#fff',
                            border: '1px solid rgba(255,255,255,0.25)',
                            flexShrink: 0,
                        }}>
                            {typeIcon[type]}
                        </div>

                        <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: 8 }}>
                                <Tag
                                    style={{
                                        background: accent,
                                        border: 'none',
                                        color: '#fff',
                                        fontWeight: 700,
                                        fontSize: 11,
                                        letterSpacing: '0.08em',
                                        padding: '2px 10px',
                                    }}
                                >
                                    {typeLabel[type] || type}
                                </Tag>
                                <Tag
                                    style={{
                                        background: 'rgba(255,255,255,0.15)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        color: '#fff',
                                        marginLeft: 8,
                                    }}
                                >
                                    {statusLabels[committee.status || ''] || committee.status}
                                </Tag>
                            </div>

                            <Title level={2} style={{ color: '#fff', margin: 0, lineHeight: 1.2 }}>
                                {committee.name}
                            </Title>

                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                                {committee.region && (
                                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                                        <EnvironmentOutlined style={{ marginRight: 6 }} />
                                        {committee.region}
                                    </Text>
                                )}
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                                    <TeamOutlined style={{ marginRight: 6 }} />
                                    {overview?.totalVolunteers ?? '—'} volontaires
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                                    <SafetyOutlined style={{ marginRight: 6 }} />
                                    Bureau {governance?.hasMandatoryBureau ? 'constitué' : 'en cours'}
                                </Text>
                            </div>
                        </div>

                        {/* My membership badge */}
                        <div style={{
                            background: 'rgba(255,255,255,0.12)',
                            borderRadius: 16,
                            padding: '16px 20px',
                            textAlign: 'center',
                            border: '1px solid rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            flexShrink: 0,
                        }}>
                            <div style={{ fontSize: 28 }}>🏅</div>
                            <Text style={{ color: '#fff', fontSize: 12, display: 'block', fontWeight: 600 }}>
                                MON COMITÉ
                            </Text>
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                                Membre actif
                            </Text>
                        </div>
                    </div>
                </div>

                {/* Stats bar */}
                <div style={{ padding: '20px 40px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <Row gutter={32}>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="Volontaires"
                                value={overview?.totalVolunteers ?? '—'}
                                prefix={<TeamOutlined style={{ color: '#C81E1E' }} />}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="Rôles assignés"
                                value={overview?.roles?.length ?? 0}
                                prefix={<CrownOutlined style={{ color: '#f59e0b' }} />}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="Activités inscrites"
                                value={myEvents.length}
                                prefix={<CalendarOutlined style={{ color: '#3b82f6' }} />}
                            />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic
                                title="Durée bénévolat"
                                value={durationFrom(volunteerSince)}
                                prefix={<ClockCircleOutlined style={{ color: '#10b981' }} />}
                            />
                        </Col>
                    </Row>
                </div>
            </Card>

            <Row gutter={24}>
                {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
                <Col xs={24} lg={14}>

                    {/* ── VOLUNTEER PERIOD CARD ─── */}
                    <Card
                        title={
                            <Space>
                                <ClockCircleOutlined style={{ color: '#10b981' }} />
                                <span>Ma Période de Volontariat</span>
                            </Space>
                        }
                        style={{ borderRadius: 16, marginBottom: 24 }}
                    >
                        <Row gutter={[16, 16]}>
                            <Col xs={24} sm={12}>
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)',
                                    border: '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 12, padding: '16px 20px',
                                }}>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                        📅 Membre depuis
                                    </Text>
                                    <Text strong style={{ fontSize: 16 }}>
                                        {formatDate(volunteerSince)}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                        {durationFrom(volunteerSince)} de bénévolat
                                    </Text>
                                </div>
                            </Col>
                            <Col xs={24} sm={12}>
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)',
                                    border: '1px solid rgba(59,130,246,0.2)',
                                    borderRadius: 12, padding: '16px 20px',
                                }}>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                                        🔑 Première connexion
                                    </Text>
                                    <Text strong style={{ fontSize: 16 }}>
                                        {formatDate(firstLoginDate || volunteerSince)}
                                    </Text>
                                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                                        Compte activé
                                    </Text>
                                </div>
                            </Col>
                        </Row>

                        {/* Volunteer status timeline */}
                        <Divider style={{ margin: '16px 0' }} />
                        <Timeline
                            items={[
                                {
                                    color: 'green',
                                    dot: <CheckCircleOutlined style={{ color: '#10b981' }} />,
                                    children: (
                                        <div>
                                            <Text strong>Compte approuvé</Text>
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                {formatDate(approvalDate || volunteerSince)}
                                            </Text>
                                        </div>
                                    ),
                                },
                                {
                                    color: 'blue',
                                    dot: <CheckCircleOutlined style={{ color: '#3b82f6' }} />,
                                    children: (
                                        <div>
                                            <Text strong>Profil complété</Text>
                                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                Formulaire complémentaire rempli
                                            </Text>
                                        </div>
                                    ),
                                },
                                {
                                    color: user?.skills ? 'green' : 'gray',
                                    children: (
                                        <div>
                                            <Text strong style={{ color: user?.skills ? undefined : '#9ca3af' }}>
                                                Compétences enregistrées
                                            </Text>
                                            {user?.skills && (
                                                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                                    {user.skills}
                                                </Text>
                                            )}
                                        </div>
                                    ),
                                },
                                {
                                    color: myEvents.length > 0 ? 'red' : 'gray',
                                    children: (
                                        <Text strong style={{ color: myEvents.length > 0 ? '#C81E1E' : '#9ca3af' }}>
                                            {myEvents.length} activité{myEvents.length > 1 ? 's' : ''} effectuée{myEvents.length > 1 ? 's' : ''}
                                        </Text>
                                    ),
                                },
                            ]}
                        />

                        {/* User info summary */}
                        <Divider style={{ margin: '8px 0 16px' }} />
                        <Row gutter={[12, 8]}>
                            {user?.phone && (
                                <Col xs={24} sm={12}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <PhoneOutlined style={{ marginRight: 6 }} />
                                        {user.phone}
                                    </Text>
                                </Col>
                            )}
                            {user?.email && (
                                <Col xs={24} sm={12}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <MailOutlined style={{ marginRight: 6 }} />
                                        {user.email}
                                    </Text>
                                </Col>
                            )}
                            {user?.matricule && (
                                <Col xs={24} sm={12}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <BankOutlined style={{ marginRight: 6 }} />
                                        Matricule : {user.matricule}
                                    </Text>
                                </Col>
                            )}
                            {user?.hoursVolunteered !== undefined && user.hoursVolunteered > 0 && (
                                <Col xs={24} sm={12}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <FireOutlined style={{ marginRight: 6 }} />
                                        {user.hoursVolunteered} heures bénévoles
                                    </Text>
                                </Col>
                            )}
                        </Row>
                    </Card>

                    {/* ── MY REGISTERED ACTIVITIES ─── */}
                    <Card
                        title={
                            <Space>
                                <CalendarOutlined style={{ color: '#3b82f6' }} />
                                <span>Mes Activités Inscrites</span>
                                <Badge count={myEvents.length} style={{ backgroundColor: '#3b82f6' }} />
                            </Space>
                        }
                        extra={
                            <Button
                                type="link"
                                icon={<RightOutlined />}
                                onClick={() => navigate('/volunteer/calendar')}
                                size="small"
                            >
                                Voir calendrier
                            </Button>
                        }
                        style={{ borderRadius: 16, marginBottom: 24 }}
                    >
                        {myEvents.length > 0 ? (
                            <List
                                dataSource={myEvents}
                                renderItem={(event) => {
                                    const meta = EventTypeBadge[event.type] || {
                                        label: event.type, color: '#6b7280', icon: <CalendarOutlined />,
                                    };
                                    const isPast = new Date(event.endDate) < new Date();
                                    return (
                                        <List.Item style={{ padding: '12px 0' }}>
                                            <List.Item.Meta
                                                avatar={
                                                    <div style={{
                                                        width: 44, height: 44, borderRadius: 10,
                                                        background: `${meta.color}20`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: meta.color, fontSize: 18,
                                                        flexShrink: 0,
                                                    }}>
                                                        {meta.icon}
                                                    </div>
                                                }
                                                title={
                                                    <Space>
                                                        <Text strong>{event.title}</Text>
                                                        <Tag
                                                            style={{
                                                                background: `${meta.color}20`,
                                                                color: meta.color,
                                                                border: `1px solid ${meta.color}40`,
                                                                fontSize: 10,
                                                            }}
                                                        >
                                                            {meta.label}
                                                        </Tag>
                                                        {isPast && <Tag color="default" style={{ fontSize: 10 }}>Terminé</Tag>}
                                                    </Space>
                                                }
                                                description={
                                                    <Space size={12} wrap>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            <CalendarOutlined style={{ marginRight: 4 }} />
                                                            {formatDate(event.startDate)}
                                                        </Text>
                                                        {event.location && (
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                <EnvironmentOutlined style={{ marginRight: 4 }} />
                                                                {event.location}
                                                            </Text>
                                                        )}
                                                        {event.organizerName && (
                                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                                <UserOutlined style={{ marginRight: 4 }} />
                                                                {event.organizerName}
                                                            </Text>
                                                        )}
                                                    </Space>
                                                }
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        ) : (
                            <Empty
                                description={
                                    <span>
                                        Aucune activité inscrite.{' '}
                                        <a onClick={() => navigate('/volunteer/calendar')} style={{ color: '#3b82f6' }}>
                                            Voir le calendrier →
                                        </a>
                                    </span>
                                }
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Card>

                    {/* ── UPCOMING ACTIVITIES (not yet registered) ─── */}
                    {upcomingEvents.filter(e => !e.isRegistered).length > 0 && (
                        <Card
                            title={
                                <Space>
                                    <FireOutlined style={{ color: '#f97316' }} />
                                    <span>Prochaines Activités</span>
                                </Space>
                            }
                            style={{ borderRadius: 16, marginBottom: 24 }}
                        >
                            <List
                                dataSource={upcomingEvents.filter(e => !e.isRegistered).slice(0, 4)}
                                renderItem={(event) => {
                                    const meta = EventTypeBadge[event.type] || {
                                        label: event.type, color: '#6b7280', icon: <CalendarOutlined />,
                                    };
                                    return (
                                        <List.Item
                                            extra={
                                                event.maxParticipants && (
                                                    <Tooltip title="Places disponibles">
                                                        <Tag color={
                                                            event.registeredCount >= event.maxParticipants ? 'red' :
                                                            event.registeredCount >= event.maxParticipants * 0.8 ? 'orange' : 'green'
                                                        }>
                                                            {event.maxParticipants - event.registeredCount} places
                                                        </Tag>
                                                    </Tooltip>
                                                )
                                            }
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    <div style={{
                                                        width: 40, height: 40, borderRadius: 8,
                                                        background: `${meta.color}15`,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: meta.color, fontSize: 16,
                                                    }}>
                                                        {meta.icon}
                                                    </div>
                                                }
                                                title={<Text strong style={{ fontSize: 14 }}>{event.title}</Text>}
                                                description={
                                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                                        {formatDate(event.startDate)}
                                                        {event.location ? ` · ${event.location}` : ''}
                                                    </Text>
                                                }
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        </Card>
                    )}
                </Col>

                {/* ── RIGHT COLUMN ─────────────────────────────────────────── */}
                <Col xs={24} lg={10}>

                    {/* ── COMMITTEE DETAILS ─── */}
                    <Card
                        title={
                            <Space>
                                <BankOutlined style={{ color: '#C81E1E' }} />
                                <span>Détails du Comité</span>
                            </Space>
                        }
                        style={{ borderRadius: 16, marginBottom: 24 }}
                    >
                        {/* Type visual badge */}
                        <div style={{
                            background: `${accent}12`,
                            border: `1px solid ${accent}30`,
                            borderRadius: 12,
                            padding: '14px 18px',
                            marginBottom: 16,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <span style={{ fontSize: 24, color: accent }}>{typeIcon[type]}</span>
                            <div>
                                <Text strong style={{ display: 'block', color: accent }}>
                                    Comité {typeLabel[type] || type}
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    {type === 'NATIONAL' ? 'Couverture nationale — Croissant-Rouge Tunisien' :
                                     type === 'REGIONAL' ? 'Couverture régionale — Gouvernorat' :
                                     'Couverture locale — Délégation / Commune'}
                                </Text>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {committee.region && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text type="secondary" style={{ fontSize: 13 }}>
                                        <EnvironmentOutlined style={{ marginRight: 6 }} />Région
                                    </Text>
                                    <Text strong>{committee.region}</Text>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    <SafetyOutlined style={{ marginRight: 6 }} />Statut
                                </Text>
                                <Tag color={statusColors[committee.status || '']}>
                                    {statusLabels[committee.status || ''] || committee.status}
                                </Tag>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    <TeamOutlined style={{ marginRight: 6 }} />Volontaires
                                </Text>
                                <Text strong>{overview?.totalVolunteers ?? '—'}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    <CheckCircleOutlined style={{ marginRight: 6 }} />Bureau
                                </Text>
                                <Tag color={governance?.hasMandatoryBureau ? 'green' : 'orange'}>
                                    {governance?.hasMandatoryBureau ? 'Constitué' : 'En cours'}
                                </Tag>
                            </div>
                        </div>

                        {/* Mandate progress */}
                        {governance?.mandateEndDate && (
                            <>
                                <Divider style={{ margin: '16px 0' }} />
                                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                    Progression du mandat
                                </Text>
                                <Progress
                                    percent={mandateProgress}
                                    size="small"
                                    status={governance.mandateExpired ? 'exception' : 'active'}
                                    strokeColor={governance.mandateExpired ? '#dc2626' : accent}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        Début : {formatDate(governance.mandateStartDate)}
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                        Fin : {formatDate(governance.mandateEndDate)}
                                    </Text>
                                </div>
                                {governance.mandateDurationYears && (
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                                        Durée : {governance.mandateDurationYears} an{governance.mandateDurationYears > 1 ? 's' : ''}
                                    </Text>
                                )}
                            </>
                        )}
                    </Card>

                    {/* ── BUREAU DU COMITÉ ─── */}
                    <Card
                        title={
                            <Space>
                                <CrownOutlined style={{ color: '#f59e0b' }} />
                                <span>Bureau du Comité</span>
                            </Space>
                        }
                        style={{ borderRadius: 16, marginBottom: 24 }}
                    >
                        {overview?.roles && overview.roles.length > 0 ? (
                            <List
                                dataSource={overview.roles}
                                renderItem={(role: any) => {
                                    const isMe = role.volunteerId === user?.id;
                                    return (
                                        <List.Item style={{ padding: '10px 0' }}>
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar
                                                        size={38}
                                                        icon={<UserOutlined />}
                                                        style={{
                                                            backgroundColor: isMe ? '#C81E1E' : '#8b5cf6',
                                                            border: isMe ? '2px solid #C81E1E' : 'none',
                                                        }}
                                                    />
                                                }
                                                title={
                                                    <Space size={4} wrap>
                                                        <Text strong style={{ fontSize: 13 }}>{role.title}</Text>
                                                        {isMe && <Tag color="red" style={{ fontSize: 10 }}>Moi</Tag>}
                                                        {role.mandateExpired && <Tag color="default" style={{ fontSize: 10 }}>Expiré</Tag>}
                                                    </Space>
                                                }
                                                description={
                                                    <span>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                                            {role.volunteerName || '—'}
                                                        </Text>
                                                        {role.volunteerEmail && (
                                                            <Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
                                                                {role.volunteerEmail}
                                                            </Text>
                                                        )}
                                                    </span>
                                                }
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        ) : (
                            <Empty
                                description="Aucun rôle attribué"
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        )}
                    </Card>

                    {/* ── AFFICHE / POSTER PLACEHOLDER ─── */}
                    <Card
                        title={
                            <Space>
                                <PictureOutlined style={{ color: '#8b5cf6' }} />
                                <span>Affiche du Comité</span>
                            </Space>
                        }
                        style={{ borderRadius: 16, marginBottom: 24 }}
                    >
                        {(committee as any).posterUrl ? (
                            <img
                                src={(committee as any).posterUrl}
                                alt="Affiche du comité"
                                style={{
                                    width: '100%',
                                    borderRadius: 10,
                                    objectFit: 'cover',
                                    maxHeight: 220,
                                }}
                            />
                        ) : (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(139,92,246,0.02) 100%)',
                                border: '2px dashed rgba(139,92,246,0.2)',
                                borderRadius: 12,
                                padding: '32px 20px',
                                textAlign: 'center',
                            }}>
                                <PictureOutlined style={{ fontSize: 36, color: '#c4b5fd', marginBottom: 8, display: 'block' }} />
                                <Text type="secondary" style={{ fontSize: 13 }}>
                                    Aucune affiche définie pour ce comité
                                </Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Le président peut en ajouter une depuis les paramètres
                                </Text>
                            </div>
                        )}
                    </Card>

                    {/* ── MY PROFILE QUICK INFO ─── */}
                    <Card
                        title={
                            <Space>
                                <UserOutlined style={{ color: '#C81E1E' }} />
                                <span>Mon Profil Volontaire</span>
                            </Space>
                        }
                        style={{ borderRadius: 16 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                            <Avatar
                                size={52}
                                src={user?.avatar}
                                icon={<UserOutlined />}
                                style={{ backgroundColor: '#C81E1E' }}
                            />
                            <div>
                                <Text strong style={{ display: 'block', fontSize: 15 }}>{user?.fullName}</Text>
                                <Text type="secondary" style={{ fontSize: 12 }}>{user?.email}</Text>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {user?.cin && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>CIN</Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{user.cin}</Text>
                                </div>
                            )}
                            {user?.matricule && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Matricule</Text>
                                    <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{user.matricule}</Text>
                                </div>
                            )}
                            {user?.skills && (
                                <div>
                                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                                        Compétences
                                    </Text>
                                    <Space size={4} wrap>
                                        {user.skills.split(',').map((s, i) => (
                                            <Tag key={i} style={{ fontSize: 11 }}>{s.trim()}</Tag>
                                        ))}
                                    </Space>
                                </div>
                            )}
                        </div>
                        <Button
                            type="default"
                            block
                            style={{ marginTop: 16, borderRadius: 8 }}
                            onClick={() => navigate('/volunteer/profile')}
                        >
                            Voir mon profil complet →
                        </Button>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default MyCommitteePage;
