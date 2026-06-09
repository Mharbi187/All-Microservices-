import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layout, Typography, Row, Col, Button, Spin, Result, Card, Tag, notification, Modal, Input } from 'antd';
import {
    ArrowLeftOutlined, VideoCameraOutlined, FullscreenExitOutlined,
    FullscreenOutlined, TeamOutlined, HeartOutlined, AlertOutlined,
    CompassOutlined, EnvironmentOutlined
} from '@ant-design/icons';
import { MapContainer, TileLayer, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { crisisApi } from '@/services/crisisApi';
import SituationBoard from '@/components/crisis/SituationBoard';
import TeamDispatcher from '@/components/crisis/TeamDispatcher';
import LogisticsProcurement from '@/components/crisis/LogisticsProcurement';
import CrisisMessagingPanel from '@/components/crisis/CrisisMessagingPanel';
import ParticipantInviteModal from '@/components/crisis/ParticipantInviteModal';
import { useRadar } from '@/hooks/useRadar';
import { useAuthStore, useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

interface RoomSummary {
    room: {
        id: string;
        disaster_id: string;
        disaster_name: string;
        video_call_url: string;
        status: string;
    };
    participants?: any[];
    recent_messages: any[];
    situation_board: any;
}

interface CrisisTarget {
    lat: number;
    lon: number;
    label: string;
    risk?: number;
}

const DEFAULT_COORDS = { lat: 36.8065, lon: 10.1815, label: 'Tunis' };

// ── Vue Satellite Hybride ─────────────────────────────────────────
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const TILE_BOUNDARIES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// ── Fly-to controller for Crisis Room ───────────────────────────
function MapController({ target }: { target: CrisisTarget }) {
    const map = useMap();
    useEffect(() => {
        if (target && typeof target.lat === 'number' && typeof target.lon === 'number') {
            map.flyTo([target.lat, target.lon], 9, { duration: 1.2 });
        }
    }, [target, map]);
    return null;
}

// ── Injected Map CSS Styles ───────────────────────────────────
const injectCrisisMapStyles = () => {
    if (document.getElementById('nexus-crisis-map-styles')) return;
    const el = document.createElement('style');
    el.id = 'nexus-crisis-map-styles';
    el.textContent = `
        @keyframes heatPulse {
            0% { transform: scale(0.92); opacity: 0.75; }
            50% { transform: scale(1.08); opacity: 0.95; }
            100% { transform: scale(0.92); opacity: 0.75; }
        }

        .heatmap-glow-high {
            width: 140px;
            height: 140px;
            margin-left: -70px;
            margin-top: -70px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(220,38,38,0.85) 0%, rgba(245,158,11,0.55) 30%, rgba(34,197,94,0.18) 55%, rgba(59,130,246,0) 100%);
            animation: heatPulse 2.5s infinite ease-in-out;
            pointer-events: none;
        }

        .heatmap-glow-med {
            width: 100px;
            height: 100px;
            margin-left: -50px;
            margin-top: -50px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(245,158,11,0.8) 0%, rgba(251,191,36,0.45) 30%, rgba(34,197,94,0.18) 55%, rgba(59,130,246,0) 100%);
            animation: heatPulse 3s infinite ease-in-out;
            pointer-events: none;
        }

        .fire-marker-icon {
            width: 32px;
            height: 32px;
            margin-left: -16px;
            margin-top: -16px;
            border-radius: 50%;
            background: linear-gradient(135deg, #EF4444 0%, #991B1B 100%);
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 14px rgba(239, 68, 68, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease-in-out;
        }
        .fire-marker-icon:hover {
            transform: scale(1.18);
        }

        .responder-marker-icon {
            width: 30px;
            height: 30px;
            margin-left: -15px;
            margin-top: -15px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1F2937 0%, #111827 100%);
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s ease-in-out;
        }
        .responder-marker-icon:hover {
            transform: scale(1.18);
        }

        .custom-leaflet-marker {
            background: transparent !important;
            border: none !important;
        }
    `;
    document.head.appendChild(el);
};

// ── Mock Responders deployed near the active crisis target ──────
interface DeployedResponder {
    id: string;
    name: string;
    type: string;
    memberCount: number;
    lat: number;
    lon: number;
    status: string;
}

const getMockRespondersForWilaya = (name: string, lat: number, lon: number): DeployedResponder[] => {
    const seed = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
    return [
        {
            id: `team-${name}-c2-1`,
            name: `NDRT Sector ${name} Alpha`,
            type: 'Nationale (NDRT)',
            memberCount: 9,
            lat: lat + 0.025 + (seed % 2) * 0.008,
            lon: lon - 0.03 - (seed % 3) * 0.008,
            status: 'Déploiement C2'
        },
        {
            id: `team-${name}-c2-2`,
            name: `Secouristes ${name} Delta`,
            type: 'Secourisme Local',
            memberCount: 14,
            lat: lat - 0.035 - (seed % 3) * 0.006,
            lon: lon + 0.04 + (seed % 2) * 0.006,
            status: 'Reconnaissance active'
        }
    ];
};

export default function CrisisRoomPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { data: radarData } = useRadar();
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const [summary, setSummary] = useState<RoomSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [inviteModalVisible, setInviteModalVisible] = useState(false);
    const [closeModalVisible, setCloseModalVisible] = useState(false);
    const [finalReport, setFinalReport] = useState('');
    const [userLoc, setUserLoc] = useState<{lat: number, lon: number} | null>(null);
    const { user } = useAuthStore();

    const isFullscreen = location.pathname.endsWith('/fullscreen');
    const radarPath = isFullscreen ? '/radar/fullscreen' : '/radar';

    // Inject custom tactical C2 styles
    useEffect(() => {
        injectCrisisMapStyles();
    }, []);

    const loadSummary = () => {
        if (!id) return;
        setLoading(true);
        crisisApi.getRoomSummary(id)
            .then((res) => {
                setSummary(res);
                setError('');
            })
            .catch(() => {
                setError('Failed to load Crisis Room. Verify backend and gateway health.');
            })
            .finally(() => {
                setLoading(false);
            });
    };

    const currentUserRole = useMemo(() => {
        if (!summary?.participants || !user?.id) return null;
        const participant = (summary.participants as any[]).find((p) => p.user_id === user.id);
        return participant?.role;
    }, [summary, user?.id]);

    const isFullAccess = useMemo(() => {
        if (user?.type === 'ADMIN') return true;
        if (!currentUserRole) return false;
        const fullAccessRoles = ['president', 'vice_president', 'catastrophe_manager', 'commander', 'coordinator', 'team_leader'];
        return fullAccessRoles.includes(currentUserRole.toLowerCase());
    }, [currentUserRole, user?.type]);

    const isClosed = summary?.room?.status === 'closed';
    const canManage = isFullAccess && !isClosed;
    const canWrite = !isClosed;

    useEffect(() => {
        loadSummary();
    }, [id]);

    const handleCloseRoom = async () => {
        if (!id || !user) return;
        try {
            await crisisApi.closeCrisisRoom(id, {
                closed_by: user.id,
                final_report: finalReport
            });
            notification.success({ message: 'Intervention clôturée avec succès' });
            setCloseModalVisible(false);
            loadSummary(); // Re-fetch to show read-only status
        } catch (e: any) {
            notification.error({ message: 'Erreur lors de la clôture', description: String(e) });
        }
    };

    const target = useMemo<CrisisTarget>(() => {
        if (!radarData?.wilayats) return DEFAULT_COORDS;
        const disasterName = String(summary?.room?.disaster_name ?? '').toLowerCase();
        const entries = Object.entries(radarData.wilayats);

        const matched = entries.find(([wilaya]) => disasterName.includes(wilaya.toLowerCase()));
        if (matched?.[1]?.coordinates) {
            return {
                lat: matched[1].coordinates.lat,
                lon: matched[1].coordinates.lon,
                label: matched[0],
                risk: matched[1].risk_score,
            };
        }

        const highest = entries.sort(([, a], [, b]) => b.risk_score - a.risk_score)[0];
        if (highest?.[1]?.coordinates) {
            return {
                lat: highest[1].coordinates.lat,
                lon: highest[1].coordinates.lon,
                label: `${highest[0]} (highest risk)`,
                risk: highest[1].risk_score,
            };
        }

        return DEFAULT_COORDS;
    }, [radarData, summary?.room?.disaster_name]);

    // Request GPS location when room is active
    useEffect(() => {
        if (summary && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                    notification.info({
                        message: 'Localisation Active',
                        description: 'Votre position GPS a été synchronisée avec le centre de commandement.'
                    });
                },
                (err) => {
                    console.log('User denied or failed GPS:', err);
                }
            );
        }
    }, [summary]);

    // Use user location if available, else disaster target
    const displayTarget = userLoc ? { ...target, lat: userLoc.lat, lon: userLoc.lon, label: 'Ma Position (GPS)' } : target;

    // Deployed responders list based on target location
    const responders = useMemo(() => {
        return getMockRespondersForWilaya(target.label, target.lat, target.lon);
    }, [target]);

    // Leaflet marker generators
    const getHeatmapIcon = (score: number) => {
        const className = score > 0.85 ? 'heatmap-glow-high' : 'heatmap-glow-med';
        return L.divIcon({
            className: `custom-leaflet-marker ${className}`,
            html: '',
            iconSize: [0, 0],
            iconAnchor: [0, 0],
        });
    };

    const getFireIcon = () => {
        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div class="fire-marker-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                        <path d="M12 2C11.5 2 10 4 10 6C10 8.5 12 10.5 12 12C12 13 11 13.5 10 13.5C8 13.5 6.5 12 6.5 10C6.5 9 7 8 7.5 7.5C5 9.5 4 13 5.5 16.5C7 19.5 10 21 12 21C15 21 18 19 18.5 15C19 11 16 8.5 16 6C16 4 14.5 2 12 2Z" />
                    </svg>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
        });
    };

    const getResponderIcon = () => {
        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div class="responder-marker-icon">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                </div>
            `,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            popupAnchor: [0, -15],
        });
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: t.pageBg }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: t.pageBg }}>
                <Result
                    status="error"
                    title={<Text style={{ color: t.text }}>Connexion échouée</Text>}
                    subTitle={<Text style={{ color: t.textSub }}>{error || 'Erreur inconnue'}</Text>}
                    extra={[
                        <Button key="return-btn" type="primary" onClick={() => navigate(radarPath)}>
                            Retour au Radar
                        </Button>,
                    ]}
                />
            </div>
        );
    }

    return (
        <Layout style={{ height: '100vh', background: t.pageBg, overflow: 'hidden', transition: 'background 0.3s ease' }}>
            <Header
                style={{
                    background: t.topbarBg,
                    borderBottom: `1px solid ${t.topbarBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    height: '64px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate(radarPath)}
                        style={{ color: t.textSub, transition: 'color 0.2s' }}
                    />
                    <Title level={4} style={{ color: t.text, margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontFamily: rfont.display, fontWeight: 700 }}>
                        <span
                            style={{
                                height: 12,
                                width: 12,
                                borderRadius: '50%',
                                background: summary.room.status === 'closed' ? '#52c41a' : rp.red500,
                                border: `2px solid ${isDark ? (summary.room.status === 'closed' ? '#389e0d' : rp.red600) : '#FFFFFF'}`,
                                animation: summary.room.status === 'closed' ? 'none' : 'pulse 2s infinite',
                                boxShadow: `0 0 10px ${summary.room.status === 'closed' ? '#52c41a' : rp.red500}`,
                            }}
                        />
                        SALLE DE CRISE VIRTUELLLE : {summary.room.disaster_name.toUpperCase()}
                        {summary.room.status === 'closed' && (
                            <Tag color="green" style={{ marginLeft: 8 }}>CLÔTURÉE</Tag>
                        )}
                    </Title>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button
                        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        onClick={() => navigate(`/crisis-room/${id}${isFullscreen ? '' : '/fullscreen'}`)}
                        style={{ fontFamily: rfont.body, borderRadius: rr.sm, fontWeight: 600, borderColor: t.cardBorder, background: t.cardBg, color: t.text }}
                    >
                        {isFullscreen ? 'Quitter Plein Écran' : 'Plein Écran'}
                    </Button>
                    {canManage && (
                        <>
                            <Button
                                type="primary"
                                onClick={() => setInviteModalVisible(true)}
                                style={{
                                    background: `linear-gradient(135deg, ${rp.amb600}, ${rp.amb500})`,
                                    color: '#fff',
                                    border: 'none',
                                    fontFamily: rfont.body,
                                    borderRadius: rr.sm,
                                    fontWeight: 700,
                                    boxShadow: '0 2px 8px rgba(245,158,11,0.25)',
                                }}
                            >
                                + Ajouter un Membre
                            </Button>
                            <Button
                                type="primary"
                                icon={<VideoCameraOutlined />}
                                href={summary.room.video_call_url}
                                target="_blank"
                                style={{
                                    background: `linear-gradient(135deg, ${rp.blu600}, ${rp.blu500})`,
                                    border: 'none',
                                    fontFamily: rfont.body,
                                    borderRadius: rr.sm,
                                    fontWeight: 700,
                                    boxShadow: '0 2px 8px rgba(59,130,246,0.25)',
                                }}
                            >
                                Rejoindre Conférence Vidéo
                            </Button>
                        </>
                    )}
                    {canManage && (user?.rawRoles?.some((r: any) => ['NATIONAL', 'REGIONAL'].includes(r.committeeType)) || user?.type === 'ADMIN') && (
                        <Button
                            type="primary"
                            danger
                            onClick={() => setCloseModalVisible(true)}
                            style={{
                                fontFamily: rfont.body,
                                borderRadius: rr.sm,
                                fontWeight: 700,
                                boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
                            }}
                        >
                            Clôturer l'Intervention
                        </Button>
                    )}
                </div>
            </Header>

            <Content style={{ padding: '16px', overflowY: 'auto' }} className="rd-scroll">
                <Row gutter={[16, 16]} style={{ minHeight: 'calc(100vh - 96px)' }}>
                    <Col xs={24} xl={6} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <SituationBoard data={summary.situation_board} />
                        <Card
                            title={<Text style={{ color: t.text, fontFamily: rfont.display, fontWeight: 700, fontSize: 14 }}><CompassOutlined style={{ marginRight: 8 }} />Ancre Cartographique C2</Text>}
                            style={{
                                flex: 1,
                                background: t.cardBg,
                                borderColor: t.cardBorder,
                                borderRadius: rr.lg,
                                boxShadow: t.cardShadow,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                transition: 'all 0.3s ease',
                            }}
                            bodyStyle={{ flex: 1, minHeight: 280, padding: 8, display: 'flex', flexDirection: 'column' }}
                            extra={
                                <Tag
                                    style={{
                                        fontFamily: rfont.data,
                                        fontWeight: 700,
                                        borderRadius: rr.pill,
                                        padding: '2px 10px',
                                        fontSize: 11,
                                        border: `1px solid ${target.risk != null && target.risk >= 0.7 ? rp.red500 : rp.blu500}30`,
                                        background: `${target.risk != null && target.risk >= 0.7 ? rp.red500 : rp.blu500}12`,
                                        color: target.risk != null && target.risk >= 0.7 ? rp.red500 : rp.blu500
                                    }}
                                >
                                    <EnvironmentOutlined style={{ marginRight: 4 }} />{target.label}
                                </Tag>
                            }
                        >
                            <div style={{ flex: 1, borderRadius: rr.md, overflow: 'hidden', border: `1px solid ${t.divider}`, position: 'relative', height: '100%', minHeight: '260px' }}>
                                <MapContainer
                                    center={[target.lat, target.lon]}
                                    zoom={9}
                                    zoomControl={false}
                                    style={{
                                        height: '100%',
                                        width: '100%',
                                        zIndex: 10,
                                        filter: isDark ? 'brightness(0.85) contrast(1.15) saturate(1.05)' : 'none',
                                    }}
                                >
                                    {/* Vue Satellite Hybride C2 */}
                                    <TileLayer
                                        url={TILE_SATELLITE}
                                        attribution='Tiles &copy; Esri &mdash; Source: Esri'
                                        maxZoom={19}
                                    />
                                    <TileLayer
                                        url={TILE_BOUNDARIES}
                                        attribution='&copy; Esri'
                                        maxZoom={19}
                                    />

                                    {/* Fly-to controller for centering */}
                                    <MapController target={displayTarget} />

                                    {/* 1. Couche Thermique (Heatmap radial-gradient animée) */}
                                    <Marker
                                        position={[target.lat, target.lon]}
                                        icon={getHeatmapIcon(target.risk ?? 0.85)}
                                        interactive={false}
                                    />

                                    {/* 2. Couche d'Icône de Sinistre / Feu (Rouge/Blanc) */}
                                    <Marker
                                        position={[target.lat, target.lon]}
                                        icon={getFireIcon()}
                                    >
                                        <Popup>
                                            <div style={{ fontFamily: rfont.body, minWidth: 160 }}>
                                                <strong style={{ display: 'block', borderBottom: '1px solid #eee', paddingBottom: 4, marginBottom: 4 }}>🚨 Zone de Crise Active</strong>
                                                <span>Secteur d'intervention : <strong>{target.label}</strong></span>
                                                {target.risk && <span style={{ display: 'block', marginTop: 3 }}>Score de Risque ML : <strong style={{ color: rp.red500 }}>{target.risk.toFixed(3)}</strong></span>}
                                            </div>
                                        </Popup>
                                    </Marker>

                                    {/* 3. Couche d'Icônes de Personnel / Secours (Noir/Blanc) */}
                                    {responders.map(team => (
                                        <Marker
                                            key={team.id}
                                            position={[team.lat, team.lon]}
                                            icon={getResponderIcon()}
                                        >
                                            <Popup>
                                                <div style={{ fontFamily: rfont.body, minWidth: 160 }}>
                                                    <strong style={{ display: 'block', color: rp.blu500, borderBottom: '1px solid #eee', paddingBottom: 4, marginBottom: 4 }}>👥 {team.name}</strong>
                                                    <span>Type : <strong>{team.type}</strong></span><br/>
                                                    <span>Effectif : <strong>{team.memberCount} secouristes</strong></span><br/>
                                                    <span>Statut : <strong style={{ color: rp.cyan600 }}>{team.status}</strong></span>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    {/* Couche Position de l'utilisateur si disponible */}
                                    {userLoc && (
                                        <Marker
                                            position={[userLoc.lat, userLoc.lon]}
                                            icon={L.divIcon({
                                                className: 'custom-leaflet-marker',
                                                html: `<div style="width: 16px; height: 16px; background-color: #3B82F6; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(59,130,246,0.8);"></div>`,
                                                iconSize: [16, 16]
                                            })}
                                        >
                                            <Popup>
                                                <div style={{ fontFamily: rfont.body, minWidth: 100 }}>
                                                    <strong style={{ color: rp.blu500 }}>📍 Ma Position</strong>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    )}
                                </MapContainer>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} xl={10} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {isFullAccess && (
                            <div style={{ flex: 1, minHeight: 280 }}>
                                <TeamDispatcher roomId={summary.room.id} disasterLat={target.lat} disasterLon={target.lon} isClosed={isClosed} />
                            </div>
                        )}
                        <div style={{ flex: 1, minHeight: 280 }}>
                            <LogisticsProcurement disasterId={summary.room.disaster_id} isClosed={isClosed} isFullAccess={isFullAccess} />
                        </div>
                    </Col>

                    <Col xs={24} xl={8} style={{ display: 'flex', flexDirection: 'column' }}>
                        <CrisisMessagingPanel roomId={summary.room.id} initialMessages={summary.recent_messages} initialParticipants={summary.participants} isClosed={isClosed} canWrite={canWrite} isStrategicAllowed={canManage} />
                    </Col>
                </Row>
            </Content>

            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
            `}</style>

            <ParticipantInviteModal
                visible={inviteModalVisible}
                roomId={id}
                onCancel={() => setInviteModalVisible(false)}
                onSuccess={() => setInviteModalVisible(false)}
            />

            <Modal
                title="Clôturer l'intervention de crise"
                open={closeModalVisible}
                onOk={handleCloseRoom}
                onCancel={() => setCloseModalVisible(false)}
                okText="Clôturer définitivement"
                cancelText="Annuler"
                okButtonProps={{ danger: true }}
            >
                <div style={{ marginBottom: 16 }}>
                    <AlertOutlined style={{ color: rp.red500, marginRight: 8 }} />
                    <Text strong>Attention :</Text> Cette action libérera toutes les équipes déployées et passera la salle en lecture seule.
                </div>
                <Text>Veuillez fournir un bref rapport final de l'intervention :</Text>
                <Input.TextArea
                    rows={4}
                    value={finalReport}
                    onChange={(e) => setFinalReport(e.target.value)}
                    placeholder="Bilan de l'intervention, victimes, ressources consommées..."
                    style={{ marginTop: 8 }}
                />
            </Modal>
        </Layout>
    );
}
