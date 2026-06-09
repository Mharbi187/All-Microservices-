import { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { RadarResponse, RoleType, WilayaData } from '@/types';

interface RadarMapProps {
    data: RadarResponse | null;
    role: RoleType;
    selectedWilaya: string | null;
    onWilayaClick: (name: string) => void;
}

// Sub-component: Fly to a region when selected
function MapController({ data, selectedWilaya, role }: { data: RadarResponse | null; selectedWilaya: string | null; role: RoleType }) {
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

// Helper: get marker color based on risk
function getMarkerStyle(info: WilayaData) {
    if (info.is_high_risk) {
        if (info.risk_score > 0.85) {
            return { color: '#ef4444', fillColor: '#ef4444', radius: 20, fillOpacity: 0.7 };
        }
        return { color: '#f59e0b', fillColor: '#f59e0b', radius: 15, fillOpacity: 0.5 };
    }
    return { color: '#3b82f6', fillColor: '#3b82f6', radius: 10, fillOpacity: 0.4 };
}

export default function RadarMap({ data, role, selectedWilaya, onWilayaClick }: RadarMapProps) {
    const wilayatEntries = useMemo(() => {
        if (!data) return [];
        const entries = Object.entries(data.wilayats);

        // In regional mode, only show selected wilaya
        if (role === 'REGIONAL' && selectedWilaya) {
            return entries.filter(([name]) => name === selectedWilaya);
        }
        return entries;
    }, [data, role, selectedWilaya]);

    return (
        <MapContainer
            center={[33.8869, 9.5375]}
            zoom={6}
            zoomControl={false}
            className="w-full h-full z-10"
            style={{ background: '#0a0f1c' }}
        >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
            <MapController data={data} selectedWilaya={selectedWilaya} role={role} />

            {wilayatEntries.map(([name, info]) => {
                if (!info.coordinates || isNaN(info.coordinates.lat) || isNaN(info.coordinates.lon)) {
                    return null;
                }
                const style = getMarkerStyle(info);
                return (
                    <CircleMarker
                        key={name}
                        center={[info.coordinates.lat, info.coordinates.lon]}
                        pathOptions={style}
                        radius={style.radius}
                        eventHandlers={{
                            click: () => onWilayaClick(name),
                        }}
                    >
                        <Popup>
                            <div className="min-w-[160px]">
                                <h3 className="font-bold text-base mb-1">{name}</h3>
                                <div className="text-sm border-t border-gray-300 pt-1 mt-1">
                                    {info.is_high_risk ? (
                                        <span className="text-red-600 font-bold">{info.disaster_type} WARNING</span>
                                    ) : (
                                        <span className="text-green-600 font-semibold">CLEAR</span>
                                    )}
                                    <br />
                                    Model Score: <b>{info.risk_score.toFixed(3)}</b>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </MapContainer>
    );
}
