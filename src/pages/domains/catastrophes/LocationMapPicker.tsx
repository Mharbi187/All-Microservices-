// ============================================================
// NEXUS-AID — Interactive Map Location Picker
// Click-to-pick + address search with Nominatim (OpenStreetMap)
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input, List, Spin, Typography, message } from 'antd';
import {
    EnvironmentOutlined, SearchOutlined, AimOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const { Text } = Typography;

// Fix Leaflet default marker icon issue in bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface GpsLocation {
    lat: string;
    lng: string;
    address: string;
}

interface LocationMapPickerProps {
    value: GpsLocation;
    onChange: (value: GpsLocation) => void;
    isDark?: boolean;
}

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
}

const DEFAULT_CENTER: [number, number] = [34.0, 9.0]; // Tunisia center
const DEFAULT_ZOOM = 7;

const LocationMapPicker: React.FC<LocationMapPickerProps> = ({ value, onChange, isDark = false }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [searching, setSearching] = useState(false);
    const searchTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [, setMapReady] = useState(false);

    // Initialize map
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            zoomControl: false,
        });

        // Add zoom control to bottom-right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Use a modern tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            maxZoom: 19,
        }).addTo(map);

        // Custom red marker icon
        const redIcon = L.divIcon({
            className: 'location-picker-marker',
            html: `<div style="
                width:32px;height:32px;
                background:linear-gradient(135deg,#e01c2e,#c0152a);
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                border:3px solid #fff;
                box-shadow:0 4px 12px rgba(224,28,46,0.4);
                display:flex;align-items:center;justify-content:center;
            "><div style="
                width:10px;height:10px;background:#fff;border-radius:50%;
                transform:rotate(45deg);
            "></div></div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
        });

        // Click to place marker
        map.on('click', (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng], { icon: redIcon }).addTo(map);
            }

            // Reverse geocode
            reverseGeocode(lat, lng);
        });

        mapRef.current = map;
        setMapReady(true);

        // If value already has coordinates, place marker
        if (value.lat && value.lng) {
            const lat = parseFloat(value.lat);
            const lng = parseFloat(value.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                markerRef.current = L.marker([lat, lng], { icon: redIcon }).addTo(map);
                map.setView([lat, lng], 13);
            }
        }

        return () => {
            map.remove();
            mapRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reverse geocode a lat/lng to get address
    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        try {
            const resp = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'fr' } }
            );
            const data = await resp.json();
            const address = data.display_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            onChange({ lat: lat.toFixed(6), lng: lng.toFixed(6), address });
        } catch {
            onChange({ lat: lat.toFixed(6), lng: lng.toFixed(6), address: '' });
        }
    }, [onChange]);

    // Search addresses via Nominatim
    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        if (!query.trim() || query.length < 3) {
            setSearchResults([]);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setSearching(true);
            try {
                const resp = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=tn&addressdetails=1`,
                    { headers: { 'Accept-Language': 'fr' } }
                );
                const data: NominatimResult[] = await resp.json();
                setSearchResults(data);
            } catch {
                message.error('Erreur de recherche');
            } finally {
                setSearching(false);
            }
        }, 400);
    }, []);

    // Select a search result
    const selectResult = useCallback((result: NominatimResult) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (mapRef.current) {
            mapRef.current.setView([lat, lng], 15, { animate: true });

            const redIcon = L.divIcon({
                className: 'location-picker-marker',
                html: `<div style="
                    width:32px;height:32px;
                    background:linear-gradient(135deg,#e01c2e,#c0152a);
                    border-radius:50% 50% 50% 0;
                    transform:rotate(-45deg);
                    border:3px solid #fff;
                    box-shadow:0 4px 12px rgba(224,28,46,0.4);
                    display:flex;align-items:center;justify-content:center;
                "><div style="
                    width:10px;height:10px;background:#fff;border-radius:50%;
                    transform:rotate(45deg);
                "></div></div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 32],
            });

            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng], { icon: redIcon }).addTo(mapRef.current);
            }
        }

        onChange({
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
            address: result.display_name,
        });
        setSearchResults([]);
        setSearchQuery(result.display_name.split(',')[0]);
    }, [onChange]);

    // Locate me button
    const locateMe = useCallback(() => {
        if (!navigator.geolocation) {
            message.warning('Géolocalisation non disponible');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                if (mapRef.current) {
                    mapRef.current.setView([latitude, longitude], 15, { animate: true });
                    const redIcon = L.divIcon({
                        className: 'location-picker-marker',
                        html: `<div style="
                            width:32px;height:32px;
                            background:linear-gradient(135deg,#e01c2e,#c0152a);
                            border-radius:50% 50% 50% 0;
                            transform:rotate(-45deg);
                            border:3px solid #fff;
                            box-shadow:0 4px 12px rgba(224,28,46,0.4);
                            display:flex;align-items:center;justify-content:center;
                        "><div style="
                            width:10px;height:10px;background:#fff;border-radius:50%;
                            transform:rotate(45deg);
                        "></div></div>`,
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                    });
                    if (markerRef.current) {
                        markerRef.current.setLatLng([latitude, longitude]);
                    } else {
                        markerRef.current = L.marker([latitude, longitude], { icon: redIcon }).addTo(mapRef.current);
                    }
                }
                reverseGeocode(latitude, longitude);
            },
            () => message.error('Impossible d\'obtenir votre position'),
            { enableHighAccuracy: true }
        );
    }, [reverseGeocode]);

    const clearLocation = useCallback(() => {
        if (markerRef.current && mapRef.current) {
            mapRef.current.removeLayer(markerRef.current);
            markerRef.current = null;
        }
        onChange({ lat: '', lng: '', address: '' });
        setSearchQuery('');
        mapRef.current?.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
    }, [onChange]);

    const bg = isDark ? 'rgba(255,255,255,0.04)' : '#fafafa';
    const border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

    return (
        <div style={{
            borderRadius: 14,
            overflow: 'hidden',
            border: `1px solid ${border}`,
            background: bg,
        }}>
            {/* Search bar overlay */}
            <div style={{
                padding: '12px 16px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                borderBottom: `1px solid ${border}`,
                background: isDark ? 'rgba(0,0,0,0.2)' : '#fff',
            }}>
                <Input
                    placeholder="Rechercher un lieu en Tunisie..."
                    prefix={<SearchOutlined style={{ color: '#e01c2e' }} />}
                    suffix={searching ? <Spin size="small" /> : undefined}
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    style={{
                        borderRadius: 10,
                        flex: 1,
                        border: `1px solid ${border}`,
                    }}
                    allowClear
                />
                <button
                    onClick={locateMe}
                    title="Ma position"
                    style={{
                        width: 36, height: 36, borderRadius: 10,
                        border: `1px solid ${border}`,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#e01c2e', fontSize: 16,
                        transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                        (e.target as HTMLElement).style.background = '#e01c2e';
                        (e.target as HTMLElement).style.color = '#fff';
                    }}
                    onMouseLeave={e => {
                        (e.target as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.06)' : '#fff';
                        (e.target as HTMLElement).style.color = '#e01c2e';
                    }}
                >
                    <AimOutlined />
                </button>
                {value.lat && (
                    <button
                        onClick={clearLocation}
                        title="Effacer la position"
                        style={{
                            width: 36, height: 36, borderRadius: 10,
                            border: `1px solid ${border}`,
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#999', fontSize: 16,
                            transition: 'all 0.2s',
                        }}
                    >
                        <CloseCircleOutlined />
                    </button>
                )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
                <div style={{
                    position: 'relative',
                    zIndex: 1000,
                    background: isDark ? '#1f1f1f' : '#fff',
                    borderBottom: `1px solid ${border}`,
                    maxHeight: 200,
                    overflowY: 'auto',
                }}>
                    <List
                        size="small"
                        dataSource={searchResults}
                        renderItem={(item) => (
                            <List.Item
                                onClick={() => selectResult(item)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '8px 16px',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background =
                                        isDark ? 'rgba(224,28,46,0.1)' : 'rgba(224,28,46,0.04)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%' }}>
                                    <EnvironmentOutlined style={{ color: '#e01c2e', marginTop: 3, flexShrink: 0 }} />
                                    <Text style={{ fontSize: 13, lineHeight: 1.4 }} ellipsis={{ tooltip: item.display_name }}>
                                        {item.display_name}
                                    </Text>
                                </div>
                            </List.Item>
                        )}
                    />
                </div>
            )}

            {/* Map container */}
            <div
                ref={mapContainerRef}
                style={{
                    height: 300,
                    width: '100%',
                    cursor: 'crosshair',
                }}
            />

            {/* Selected location info bar */}
            {value.lat && value.lng && (
                <div style={{
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderTop: `1px solid ${border}`,
                    background: isDark ? 'rgba(224,28,46,0.08)' : 'rgba(224,28,46,0.03)',
                    animation: 'fadeIn 0.3s ease',
                }}>
                    <EnvironmentOutlined style={{
                        color: '#e01c2e', fontSize: 18, flexShrink: 0,
                        animation: 'bounce 0.5s ease',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>
                            {value.address || 'Position sélectionnée'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {value.lat}, {value.lng}
                        </Text>
                    </div>
                </div>
            )}

            <style>{`
                .location-picker-marker {
                    background: none !important;
                    border: none !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
            `}</style>
        </div>
    );
};

export default LocationMapPicker;
