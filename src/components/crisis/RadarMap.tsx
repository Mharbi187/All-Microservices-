import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Popup, useMap, ZoomControl, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useUIStore } from '@/stores';
import type { RadarResponse, RoleType, WilayaData } from '@/types';

interface RadarMapProps {
    data: RadarResponse | null;
    role: RoleType;
    selectedWilaya: string | null;
    onWilayaClick: (name: string) => void;
}

// ── Vue Satellite Hybride ─────────────────────────────────────────
// ESRI World Imagery (Satellite)
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
// ESRI World Boundaries and Places (Frontières & villes superposées)
const TILE_BOUNDARIES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

// ── Fly-to controller ─────────────────────────────────────────
function MapController({
    data, selectedWilaya, role,
}: {
    data: RadarResponse | null;
    selectedWilaya: string | null;
    role: RoleType;
}) {
    const map = useMap();
    const hasFlown = useRef(false);

    useEffect(() => {
        if (role === 'NATIONAL') {
            map.flyTo([33.8869, 9.5375], 6, { duration: 1.2 });
            hasFlown.current = false;
            return;
        }
        if (selectedWilaya && data?.wilayats[selectedWilaya]) {
            const coords = data.wilayats[selectedWilaya].coordinates;
            if (coords && typeof coords.lat === 'number' && typeof coords.lon === 'number') {
                map.flyTo([coords.lat, coords.lon], 9, { duration: 1.2 });
                hasFlown.current = true;
            }
        }
    }, [selectedWilaya, role, data, map]);

    return null;
}

// ── Injected Map CSS Styles ───────────────────────────────────
const injectMapStyles = () => {
    if (document.getElementById('nexus-radar-map-styles')) return;
    const el = document.createElement('style');
    el.id = 'nexus-radar-map-styles';
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
            background: radial-gradient(circle, rgba(220,38,38,0.85) 0%, rgba(245,158,11,0.55) 30%, rgba(34,197,94,0.18) 55%, rgba(59,130,246,0.06) 75%, rgba(59,130,246,0) 100%);
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

        .heatmap-glow-low {
            width: 60px;
            height: 60px;
            margin-left: -30px;
            margin-top: -30px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(6,182,212,0.2) 40%, rgba(59,130,246,0) 100%);
            animation: heatPulse 3.5s infinite ease-in-out;
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

        .safe-marker-icon {
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto;
        }
        .safe-marker-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #10B981;
            border: 2px solid #FFFFFF;
            box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
            transition: transform 0.2s ease-in-out;
        }
        .safe-marker-icon:hover .safe-marker-dot {
            transform: scale(1.3);
        }

        /* Leaflet resets */
        .custom-leaflet-marker {
            background: transparent !important;
            border: none !important;
        }
    `;
    document.head.appendChild(el);
};

// ── Mock Responders Generation ─────────────────────────────────
interface MockResponder {
    id: string;
    name: string;
    type: string;
    memberCount: number;
    lat: number;
    lon: number;
    status: string;
}

const getMockRespondersForWilaya = (name: string, lat: number, lon: number): MockResponder[] => {
    const seed = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
    return [
        {
            id: `team-${name}-1`,
            name: `Équipe NDRT ${name} A`,
            type: 'NDRT (Nationale)',
            memberCount: 8 + (seed % 5),
            lat: lat + 0.03 + (seed % 3) * 0.012,
            lon: lon - 0.04 - (seed % 2) * 0.012,
            status: 'Déployée (Opérationnel)'
        },
        {
            id: `team-${name}-2`,
            name: `Secouristes CRT ${name}`,
            type: 'Secouristes Locaux',
            memberCount: 12 + (seed % 8),
            lat: lat - 0.04 - (seed % 4) * 0.01,
            lon: lon + 0.05 + (seed % 3) * 0.01,
            status: 'Sur site (Actif)'
        }
    ];
};

// ── Wilaya Popup content ───────────────────────────────────────
function WilayaPopup({ name, info }: { name: string; info: WilayaData }) {
    const riskColor = info.risk_score > 0.85 ? '#ef4444' : info.risk_score > 0.7 ? '#f59e0b' : '#16a34a';
    return (
        <div style={{ minWidth: 180, fontFamily: "'Nunito Sans', sans-serif" }}>
            <div style={{
                fontWeight: 700, fontSize: 14,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 6, marginBottom: 6,
                color: '#0C1523',
            }}>
                📍 {name}
            </div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>
                    <span style={{ color: '#64748B' }}>Statut : </span>
                    {info.is_high_risk
                        ? <strong style={{ color: riskColor }}>{info.disaster_type} ⚠️</strong>
                        : <strong style={{ color: '#16a34a' }}>DÉGAGÉ ✅</strong>
                    }
                </div>
                <div>
                    <span style={{ color: '#64748B' }}>Score ML : </span>
                    <strong style={{ color: riskColor, fontFamily: 'monospace' }}>
                        {info.risk_score.toFixed(3)}
                    </strong>
                </div>
                {info.weather && (
                    <div style={{ color: '#64748B' }}>
                        🌡️ {info.weather.temperature}°C · 💨 {info.weather.wind_speed} km/h
                    </div>
                )}
                {(info.satellite?.fire_count ?? 0) > 0 && (
                    <div style={{ color: '#ef4444', fontWeight: 600 }}>
                        🔥 {info.satellite!.fire_count} foyer(s)
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Responder Popup content ────────────────────────────────────
function ResponderPopup({ team }: { team: MockResponder }) {
    return (
        <div style={{ minWidth: 180, fontFamily: "'Nunito Sans', sans-serif" }}>
            <div style={{
                fontWeight: 700, fontSize: 13,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 6, marginBottom: 6,
                color: '#0C1523',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
            }}>
                👥 {team.name}
            </div>
            <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div>
                    <span style={{ color: '#64748B' }}>Type : </span>
                    <strong>{team.type}</strong>
                </div>
                <div>
                    <span style={{ color: '#64748B' }}>Effectif : </span>
                    <strong>{team.memberCount} secouristes</strong>
                </div>
                <div>
                    <span style={{ color: '#64748B' }}>Statut : </span>
                    <strong style={{ color: '#0284C7' }}>{team.status}</strong>
                </div>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────
export default function RadarMap({ data, role, selectedWilaya, onWilayaClick }: RadarMapProps) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';

    // Inject custom CSS for custom divIcon markers
    useEffect(() => {
        injectMapStyles();
    }, []);

    const wilayatEntries = useMemo(() => {
        if (!data) return [];
        const entries = Object.entries(data.wilayats);
        if (role === 'REGIONAL' && selectedWilaya) {
            return entries.filter(([name]) => name === selectedWilaya);
        }
        return entries;
    }, [data, role, selectedWilaya]);

    // Construct Leaflet DivIcons using pure CSS classes
    const getHeatmapIcon = (score: number) => {
        const className = score > 0.85 ? 'heatmap-glow-high' : score > 0.7 ? 'heatmap-glow-med' : 'heatmap-glow-low';
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

    const getSafeIcon = () => {
        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div class="safe-marker-icon">
                    <div class="safe-marker-dot"></div>
                </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10],
        });
    };

    return (
        <MapContainer
            center={[33.8869, 9.5375]}
            zoom={6}
            zoomControl={false}
            style={{
                width: '100%',
                height: '100%',
                zIndex: 10,
                filter: isDark ? 'brightness(0.85) contrast(1.15) saturate(1.05)' : 'none',
            }}
        >
            {/* Vue Satellite Hybride */}
            <TileLayer
                url={TILE_SATELLITE}
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS'
                maxZoom={19}
            />
            {/* Superposition des frontières transparentes et étiquettes de villes */}
            <TileLayer
                url={TILE_BOUNDARIES}
                attribution='&copy; Esri'
                maxZoom={19}
            />

            {/* Zoom control — bottom right */}
            <ZoomControl position="bottomright" />

            {/* Fly-to controller */}
            <MapController data={data} selectedWilaya={selectedWilaya} role={role} />

            {/* Dynamic Map Layers */}
            {wilayatEntries.map(([name, info]) => {
                if (
                    !info.coordinates ||
                    isNaN(info.coordinates.lat) ||
                    isNaN(info.coordinates.lon)
                ) return null;

                const { lat, lon } = info.coordinates;

                if (info.is_high_risk) {
                    // Generate deterministic responder placements near high risk area
                    const responders = getMockRespondersForWilaya(name, lat, lon);

                    return (
                        <div key={name}>
                            {/* 1. Couche Thermique (Heatmap radial-gradient animée) */}
                            <Marker
                                position={[lat, lon]}
                                icon={getHeatmapIcon(info.risk_score)}
                                interactive={false}
                            />

                            {/* 2. Couche d'Icône de Sinistre / Feu (Rouge/Blanc) */}
                            <Marker
                                position={[lat, lon]}
                                icon={getFireIcon()}
                                eventHandlers={{ click: () => onWilayaClick(name) }}
                            >
                                <Popup>
                                    <WilayaPopup name={name} info={info} />
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
                                        <ResponderPopup team={team} />
                                    </Popup>
                                </Marker>
                            ))}
                        </div>
                    );
                } else {
                    // Safe wilaya: Standard subtle location green beacon
                    return (
                        <Marker
                            key={name}
                            position={[lat, lon]}
                            icon={getSafeIcon()}
                            eventHandlers={{ click: () => onWilayaClick(name) }}
                        >
                            <Popup>
                                <WilayaPopup name={name} info={info} />
                            </Popup>
                        </Marker>
                    );
                }
            })}
        </MapContainer>
    );
}
