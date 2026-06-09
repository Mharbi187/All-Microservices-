// ============================================================
// NEXUS-AID — Centre National des Catastrophes
// Onglet 1 : Vue principale — Carte + Alertes + Compteurs
// Remplace "Moniteur Satellite" — données 100% dynamiques
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Badge, Button, Col, Row, Space, Spin, Tag, Typography } from 'antd';
import {
    AlertOutlined, ClockCircleOutlined, EnvironmentOutlined,
    ExclamationCircleOutlined, ReloadOutlined, TeamOutlined,
    GlobalOutlined, CheckCircleOutlined, FireOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { catastropheService } from '@/services/catastropheService';
import { crisisApi } from '@/services/crisisApi';
import { useAuthStore } from '@/stores';
import type { DisasterMissionDTO } from '@/types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const { Text, Title } = Typography;

const MISSION_TYPE_COLORS: Record<string, string> = {
    SECOURS: '#e01c2e',
    EVACUATION: '#fa8c16',
    MEDICAL: '#52c41a',
    LOGISTIQUE: '#1890ff',
    SURVEILLANCE: '#722ed1',
};

const MISSION_TYPE_LABELS: Record<string, string> = {
    SECOURS: 'Secours',
    EVACUATION: 'Évacuation',
    MEDICAL: 'Médical',
    LOGISTIQUE: 'Logistique',
    SURVEILLANCE: 'Surveillance',
};

function createMissionIcon(type: string, status: string) {
    const color = status === 'IN_PROGRESS' ? (MISSION_TYPE_COLORS[type] ?? '#e01c2e') : '#64748b';
    const pulse = status === 'IN_PROGRESS';
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">
            ${pulse ? `<circle cx="15" cy="12" r="12" fill="${color}" opacity="0.25"><animate attributeName="r" values="10;14;10" dur="1.5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite"/></circle>` : ''}
            <circle cx="15" cy="12" r="9" fill="${color}" stroke="white" stroke-width="2"/>
            <text x="15" y="17" text-anchor="middle" font-size="10" fill="white">●</text>
            <path d="M15 24 L10 32 L15 30 L20 32 Z" fill="${color}"/>
        </svg>`;
    return L.divIcon({
        className: '',
        html: svg,
        iconSize: [30, 38],
        iconAnchor: [15, 38],
        popupAnchor: [0, -38],
    });
}

// Helper component to recenter map
function MapRecenterer({ center }: { center: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 10, { duration: 1.2 });
    }, [center, map]);
    return null;
}

interface CentreNationalTabProps {
    isDark: boolean;
}

const ALERT_LEVELS = [
    { min: 0, label: 'AUCUNE ALERTE', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)' },
    { min: 1, label: 'ALERTE VERTE', color: '#84cc16', bg: 'rgba(132,204,22,0.1)', border: 'rgba(132,204,22,0.3)' },
    { min: 3, label: 'ALERTE JAUNE', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.3)' },
    { min: 6, label: 'ALERTE ORANGE', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)' },
    { min: 10, label: 'ALERTE ROUGE', color: '#e01c2e', bg: 'rgba(224,28,46,0.1)', border: 'rgba(224,28,46,0.3)' },
];

function getAlertLevel(activeMissions: number) {
    return [...ALERT_LEVELS].reverse().find(l => activeMissions >= l.min) ?? ALERT_LEVELS[0];
}

const CentreNationalTab: React.FC<CentreNationalTabProps> = ({ isDark }) => {
    const user = useAuthStore(s => s.user);
    const isNational = user?.rawRoles?.some(r => r.committeeType === 'NATIONAL') ?? false;
    const committeeId = user?.committeeId ?? '';

    const [missions, setMissions] = useState<DisasterMissionDTO[]>([]);
    const [activeRooms, setActiveRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMission, setSelectedMission] = useState<DisasterMissionDTO | null>(null);
    const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const navigate = useNavigate();

    const load = async () => {
        setLoading(true);
        try {
            const data = isNational
                ? await catastropheService.getAllMissions()
                : await catastropheService.getMissionsByCommittee(committeeId);
            setMissions(data);
            
            // Fetch active crisis rooms
            const roomsData = await crisisApi.getActiveRooms();
            setActiveRooms(roomsData);
        } catch { /* ignore */ } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, [isNational, committeeId]);

    const activeMissions = missions.filter(m => m.status === 'IN_PROGRESS');
    const plannedMissions = missions.filter(m => m.status === 'PLANNED');
    const completedMissions = missions.filter(m => m.status === 'COMPLETED');
    const totalVolunteers = missions.reduce((acc, m) => acc + (m.assignedVolunteers?.length ?? 0), 0);
    const regionsSet = new Set(missions.map(m => m.committeeId).filter(Boolean));
    const alertLevel = getAlertLevel(activeMissions.length);

    const mappableMissions = missions.filter(m => m.locationGps?.lat && m.locationGps?.lng);

    const cardStyle = (highlight = false): React.CSSProperties => ({
        background: highlight
            ? (isDark ? 'rgba(224,28,46,0.06)' : 'rgba(224,28,46,0.03)')
            : (isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'),
        border: `1px solid ${highlight
            ? (isDark ? 'rgba(224,28,46,0.2)' : 'rgba(224,28,46,0.12)')
            : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
        borderRadius: 16,
        padding: 20,
        height: '100%',
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
                <Spin size="large" />
                <Text type="secondary" style={{ fontWeight: 600 }}>Chargement du Centre National...</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px 0' }}>
            {/* Header Alerte Nationale */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div style={{
                    background: alertLevel.bg,
                    border: `1px solid ${alertLevel.border}`,
                    borderRadius: 16,
                    padding: '16px 24px',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 12, height: 12, borderRadius: '50%',
                            background: alertLevel.color,
                            boxShadow: `0 0 0 4px ${alertLevel.color}40`,
                            animation: activeMissions.length > 0 ? 'pulse 2s infinite' : 'none',
                        }} />
                        <div>
                            <Text style={{ color: alertLevel.color, fontWeight: 900, fontSize: 16, letterSpacing: 1 }}>
                                {alertLevel.label}
                            </Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {isNational ? 'Niveau National' : 'Niveau Régional'} — Mis à jour {dayjs().format('HH:mm')}
                            </Text>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {activeRooms.map(room => (
                            <Button
                                key={room.id}
                                type="primary"
                                danger
                                icon={<FireOutlined />}
                                onClick={() => navigate(`/crisis-room/${room.id}`)}
                                style={{ borderRadius: 10, fontWeight: 600 }}
                            >
                                Accéder à la Salle de Crise
                            </Button>
                        ))}
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => void load()}
                            loading={loading}
                            style={{ borderRadius: 10, fontWeight: 600 }}
                        >
                            Actualiser
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* KPI Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Missions Actives', value: activeMissions.length, color: '#e01c2e', icon: <AlertOutlined />, sub: 'En cours d\'intervention' },
                    { label: 'Missions Planifiées', value: plannedMissions.length, color: '#1890ff', icon: <ClockCircleOutlined />, sub: 'En attente de démarrage' },
                    { label: 'Régions Concernées', value: regionsSet.size, color: '#f97316', icon: <EnvironmentOutlined />, sub: 'Zones mobilisées' },
                    { label: 'Volontaires Mobilisés', value: totalVolunteers, color: '#7c3aed', icon: <TeamOutlined />, sub: 'NDRT + RDRT assignés' },
                ].map((stat, i) => (
                    <Col xs={12} lg={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                            <div style={{
                                ...cardStyle(),
                                borderTop: `3px solid ${stat.color}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <span style={{ color: stat.color, fontSize: 18 }}>{stat.icon}</span>
                                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>{stat.label}</Text>
                                </div>
                                <div style={{ fontSize: 36, fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                                    {stat.value}
                                </div>
                                <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>{stat.sub}</Text>
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]}>
                {/* Carte OpenStreetMap */}
                <Col xs={24} lg={16}>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <div style={{ ...cardStyle(), padding: 0, overflow: 'hidden', minHeight: 420 }}>
                            <div style={{
                                padding: '14px 20px',
                                borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <GlobalOutlined style={{ color: '#e01c2e' }} />
                                <Text strong>Carte Opérationnelle</Text>
                                <Tag color="processing" style={{ borderRadius: 6, marginLeft: 'auto', fontSize: 10 }}>
                                    {mappableMissions.length} point(s) géolocalisé(s)
                                </Tag>
                            </div>
                            <div style={{ height: 380 }}>
                                <MapContainer
                                    center={[33.8869, 9.5375]}
                                    zoom={6}
                                    style={{ height: '100%', width: '100%' }}
                                    ref={mapRef}
                                >
                                    <TileLayer
                                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {mapCenter && <MapRecenterer center={mapCenter} />}
                                    {mappableMissions.map(m => (
                                        <Marker
                                            key={m.id}
                                            position={[m.locationGps!.lat, m.locationGps!.lng]}
                                            icon={createMissionIcon(m.missionType, m.status ?? 'PLANNED')}
                                            eventHandlers={{
                                                click: () => {
                                                    setSelectedMission(m);
                                                    setMapCenter([m.locationGps!.lat, m.locationGps!.lng]);
                                                }
                                            }}
                                        >
                                            <Popup>
                                                <div style={{ minWidth: 180 }}>
                                                    <strong style={{ color: MISSION_TYPE_COLORS[m.missionType] }}>
                                                        {MISSION_TYPE_LABELS[m.missionType] ?? m.missionType}
                                                    </strong>
                                                    <br />
                                                    <span style={{ fontWeight: 700 }}>{m.title}</span>
                                                    <br />
                                                    <small>{m.locationGps?.address ?? `${m.locationGps?.lat}, ${m.locationGps?.lng}`}</small>
                                                    <br />
                                                    <small>Chef: {m.teamChiefName ?? '—'}</small>
                                                    <br />
                                                    <small>Début: {m.startDatetime ? dayjs(m.startDatetime).format('DD/MM/YYYY HH:mm') : '—'}</small>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            </div>
                        </div>
                    </motion.div>
                </Col>

                {/* Liste des alertes actives */}
                <Col xs={24} lg={8}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                        <div style={{ ...cardStyle(true), padding: 0, overflow: 'hidden', minHeight: 420 }}>
                            <div style={{
                                padding: '14px 20px',
                                borderBottom: `1px solid ${isDark ? 'rgba(224,28,46,0.1)' : 'rgba(224,28,46,0.08)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <FireOutlined style={{ color: '#e01c2e' }} />
                                <Text strong>Missions Actives</Text>
                                {activeMissions.length > 0 && (
                                    <Badge count={activeMissions.length} style={{ marginLeft: 'auto' }} />
                                )}
                            </div>
                            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 0' }}>
                                <AnimatePresence>
                                    {activeMissions.length === 0 ? (
                                        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                            <CheckCircleOutlined style={{ fontSize: 32, color: '#22c55e', marginBottom: 12 }} />
                                            <br />
                                            <Text type="secondary">Aucune mission active</Text>
                                        </div>
                                    ) : (
                                        activeMissions.map((m, i) => (
                                            <motion.div
                                                key={m.id}
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ delay: i * 0.05 }}
                                            >
                                                <div
                                                    onClick={() => {
                                                        setSelectedMission(m);
                                                        if (m.locationGps?.lat && m.locationGps?.lng) {
                                                            setMapCenter([m.locationGps.lat, m.locationGps.lng]);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '12px 20px',
                                                        cursor: 'pointer',
                                                        borderLeft: `3px solid ${MISSION_TYPE_COLORS[m.missionType] ?? '#e01c2e'}`,
                                                        marginBottom: 2,
                                                        background: selectedMission?.id === m.id
                                                            ? (isDark ? 'rgba(224,28,46,0.08)' : 'rgba(224,28,46,0.04)')
                                                            : 'transparent',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                                        <Tag
                                                            color={MISSION_TYPE_COLORS[m.missionType]}
                                                            style={{ borderRadius: 4, fontSize: 10, padding: '0 6px', margin: 0, fontWeight: 700 }}
                                                        >
                                                            {MISSION_TYPE_LABELS[m.missionType] ?? m.missionType}
                                                        </Tag>
                                                    </div>
                                                    <Text strong style={{ fontSize: 13, display: 'block' }}>{m.title}</Text>
                                                    {m.locationGps && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                                            <EnvironmentOutlined style={{ fontSize: 11, color: '#64748b' }} />
                                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                                {m.locationGps.address ?? `${m.locationGps.lat?.toFixed(3)}, ${m.locationGps.lng?.toFixed(3)}`}
                                                            </Text>
                                                        </div>
                                                    )}
                                                    {m.teamChiefName && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                            <TeamOutlined style={{ fontSize: 11, color: '#64748b' }} />
                                                            <Text type="secondary" style={{ fontSize: 11 }}>Chef: {m.teamChiefName}</Text>
                                                        </div>
                                                    )}
                                                    <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 3 }}>
                                                        Démarré {dayjs(m.startDatetime).fromNow()}
                                                    </Text>
                                                </div>
                                            </motion.div>
                                        ))
                                    )}
                                </AnimatePresence>

                                {/* Planned missions summary */}
                                {plannedMissions.length > 0 && (
                                    <div style={{
                                        padding: '12px 20px',
                                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                                        marginTop: 8,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                            <ClockCircleOutlined style={{ color: '#1890ff', fontSize: 12 }} />
                                            <Text type="secondary" style={{ fontSize: 11, fontWeight: 700 }}>
                                                {plannedMissions.length} mission(s) planifiée(s)
                                            </Text>
                                        </div>
                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                            {plannedMissions.slice(0, 3).map(m => (
                                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1890ff' }} />
                                                    <Text style={{ fontSize: 11 }} ellipsis={{ tooltip: m.title }}>
                                                        {m.title}
                                                    </Text>
                                                </div>
                                            ))}
                                            {plannedMissions.length > 3 && (
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                    +{plannedMissions.length - 3} autres...
                                                </Text>
                                            )}
                                        </Space>
                                    </div>
                                )}

                                {/* Completed missions summary */}
                                {completedMissions.length > 0 && (
                                    <div style={{
                                        padding: '10px 20px',
                                        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 12 }} />
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {completedMissions.length} mission(s) clôturée(s)
                                            </Text>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </Col>
            </Row>

            {/* Detail panel for selected mission */}
            <AnimatePresence>
                {selectedMission && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ duration: 0.2 }}
                        style={{ marginTop: 16 }}
                    >
                        <div style={{
                            ...cardStyle(),
                            borderLeft: `4px solid ${MISSION_TYPE_COLORS[selectedMission.missionType] ?? '#e01c2e'}`,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                <div>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                                        <Tag color={MISSION_TYPE_COLORS[selectedMission.missionType]} style={{ borderRadius: 6, fontWeight: 700 }}>
                                            {MISSION_TYPE_LABELS[selectedMission.missionType] ?? selectedMission.missionType}
                                        </Tag>
                                        {selectedMission.missionNumber && (
                                            <Tag style={{ borderRadius: 6, fontFamily: 'monospace' }}>
                                                N° {selectedMission.missionNumber}
                                            </Tag>
                                        )}
                                    </div>
                                    <Title level={5} style={{ margin: '0 0 4px 0' }}>{selectedMission.title}</Title>
                                    {selectedMission.description && (
                                        <Text type="secondary" style={{ fontSize: 13 }}>{selectedMission.description}</Text>
                                    )}
                                </div>
                                <Button size="small" onClick={() => setSelectedMission(null)} style={{ borderRadius: 8 }}>
                                    Fermer
                                </Button>
                            </div>
                            <Row gutter={[16, 8]} style={{ marginTop: 12 }}>
                                <Col xs={24} sm={8}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <ClockCircleOutlined style={{ color: '#e01c2e' }} />
                                        <Text style={{ fontSize: 12 }}>
                                            <strong>Début:</strong> {dayjs(selectedMission.startDatetime).format('DD/MM/YYYY HH:mm')}
                                        </Text>
                                    </div>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <TeamOutlined style={{ color: '#e01c2e' }} />
                                        <Text style={{ fontSize: 12 }}>
                                            <strong>Chef:</strong> {selectedMission.teamChiefName ?? '—'}
                                        </Text>
                                    </div>
                                </Col>
                                <Col xs={24} sm={8}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <ExclamationCircleOutlined style={{ color: '#e01c2e' }} />
                                        <Text style={{ fontSize: 12 }}>
                                            <strong>Volontaires:</strong> {selectedMission.assignedVolunteers?.length ?? 0}
                                        </Text>
                                    </div>
                                </Col>
                                {selectedMission.locationGps && (
                                    <Col xs={24}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <EnvironmentOutlined style={{ color: '#e01c2e' }} />
                                            <Text style={{ fontSize: 12 }}>
                                                <strong>Localisation:</strong>{' '}
                                                {selectedMission.locationGps.address
                                                    ?? `${selectedMission.locationGps.lat?.toFixed(5)}, ${selectedMission.locationGps.lng?.toFixed(5)}`}
                                            </Text>
                                        </div>
                                    </Col>
                                )}
                            </Row>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 4px rgba(224,28,46,0.2); }
                    50% { box-shadow: 0 0 0 8px rgba(224,28,46,0.05); }
                }
                .leaflet-container { font-family: inherit; }
            `}</style>
        </div>
    );
};

export default CentreNationalTab;
