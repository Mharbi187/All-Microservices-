// ============================================================
// NEXUS-AID — Social Map Component
// Geospatial visualization of families using Leaflet
// ============================================================

import { useMemo } from 'react';
import { Card, Tag, Typography, Button, Empty } from 'antd';
import {
    EnvironmentOutlined, MedicineBoxOutlined,
    HomeOutlined, ShoppingOutlined, EyeOutlined,
} from '@ant-design/icons';
import type { FamilyDTO, VulnerabilityScoreDTO } from '@/types';

const { Text } = Typography;

// ---- Needs → Icon mapping ----
const NEED_ICON: Record<string, React.ReactNode> = {
    MEDICAL: <MedicineBoxOutlined />,
    FOOD: <ShoppingOutlined />,
    SHELTER: <HomeOutlined />,
};

const NEED_COLOR: Record<string, string> = {
    MEDICAL: '#ef4444',
    FOOD: '#f59e0b',
    SHELTER: '#6366f1',
};

// ---- Score → marker color ----
const getMarkerColor = (score?: number): string => {
    if (!score || score < 26) return '#10b981';
    if (score < 51) return '#f59e0b';
    if (score < 76) return '#f97316';
    return '#ef4444';
};

const getScoreLabel = (score?: number): string => {
    if (!score || score < 26) return 'Faible';
    if (score < 51) return 'Modéré';
    if (score < 76) return 'Élevé';
    return 'Critique';
};

interface SocialMapProps {
    families: FamilyDTO[];
    scores: Record<string, VulnerabilityScoreDTO>;
    onViewFamily?: (family: FamilyDTO) => void;
}

const SocialMap: React.FC<SocialMapProps> = ({ families, scores, onViewFamily }) => {
    // Families with GPS coordinates
    const geoFamilies = useMemo(
        () => families.filter(f => f.gpsCoordinates?.lat && f.gpsCoordinates?.lng),
        [families]
    );

    if (geoFamilies.length === 0) {
        return (
            <Card styles={{ body: { padding: '40px 20px', textAlign: 'center' } }}>
                <Empty
                    image={<EnvironmentOutlined style={{ fontSize: 64, color: '#6366f1', opacity: 0.4 }} />}
                    description={
                        <div>
                            <Text strong style={{ fontSize: 15 }}>Aucune famille géolocalisée</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Ajoutez des coordonnées GPS aux familles pour activer la visualisation cartographique
                            </Text>
                        </div>
                    }
                />
            </Card>
        );
    }

    return (
        <Card
            styles={{ body: { padding: 0, overflow: 'hidden', borderRadius: 12 } }}
            style={{ borderRadius: 12 }}
        >
            {/* CSS-based map placeholder with family markers */}
            <div style={{
                position: 'relative',
                width: '100%',
                height: 500,
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                overflow: 'hidden',
            }}>
                {/* Grid overlay for map feel */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                }} />

                {/* Title bar */}
                <div style={{
                    position: 'absolute', top: 16, left: 16, right: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 10,
                }}>
                    <div style={{
                        background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
                        padding: '8px 16px', borderRadius: 10,
                        display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                        <EnvironmentOutlined style={{ color: '#6366f1' }} />
                        <Text style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>
                            Cartographie des Familles ({geoFamilies.length})
                        </Text>
                    </div>
                    {/* Legend */}
                    <div style={{
                        background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)',
                        padding: '8px 14px', borderRadius: 10,
                        display: 'flex', gap: 12, alignItems: 'center',
                    }}>
                        {[
                            { color: '#ef4444', label: 'Critique' },
                            { color: '#f97316', label: 'Élevé' },
                            { color: '#f59e0b', label: 'Modéré' },
                            { color: '#10b981', label: 'Faible' },
                        ].map(l => (
                            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color }} />
                                <Text style={{ color: '#94a3b8', fontSize: 11 }}>{l.label}</Text>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Family markers */}
                {geoFamilies.map((family, idx) => {
                    const score = family.id ? scores[family.id] : undefined;
                    const color = getMarkerColor(score?.score);
                    // Position markers in a scattered pattern within the map
                    const x = 10 + ((family.gpsCoordinates!.lng + 180) / 360) * 80;
                    const y = 10 + ((90 - family.gpsCoordinates!.lat) / 180) * 80;

                    return (
                        <div
                            key={family.id || idx}
                            style={{
                                position: 'absolute',
                                left: `${x}%`,
                                top: `${y}%`,
                                transform: 'translate(-50%, -50%)',
                                cursor: 'pointer',
                                zIndex: 5,
                            }}
                            onClick={() => onViewFamily?.(family)}
                        >
                            {/* Pulse ring */}
                            <div style={{
                                position: 'absolute', inset: -6,
                                borderRadius: '50%',
                                border: `2px solid ${color}`,
                                opacity: 0.3,
                                animation: 'pulse 2s ease-in-out infinite',
                            }} />
                            {/* Marker dot */}
                            <div style={{
                                width: 14, height: 14,
                                borderRadius: '50%',
                                background: color,
                                border: '2px solid rgba(255,255,255,0.9)',
                                boxShadow: `0 0 12px ${color}80`,
                            }} />
                            {/* Tooltip */}
                            <div style={{
                                position: 'absolute', bottom: 22, left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(8px)',
                                padding: '6px 10px', borderRadius: 8,
                                whiteSpace: 'nowrap', minWidth: 140,
                                border: '1px solid rgba(99,102,241,0.2)',
                                display: 'none',
                            }}
                                className="map-tooltip"
                            >
                                <Text style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>
                                    {family.familyName}
                                </Text>
                                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    {(family.needsType || []).map(need => (
                                        <Tag key={need} bordered={false} style={{
                                            fontSize: 10, padding: '0 6px',
                                            background: `${NEED_COLOR[need] || '#6366f1'}20`,
                                            color: NEED_COLOR[need] || '#6366f1',
                                        }}>
                                            {NEED_ICON[need]} {need}
                                        </Tag>
                                    ))}
                                </div>
                                {score && (
                                    <div style={{ marginTop: 4 }}>
                                        <Tag color={color} bordered={false} style={{ fontSize: 10 }}>
                                            Score: {score.score} — {getScoreLabel(score.score)}
                                        </Tag>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Inject animations */}
                <style>{`
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 0.3; }
                        50% { transform: scale(1.8); opacity: 0; }
                    }
                    div:hover > .map-tooltip { display: block !important; }
                `}</style>
            </div>
        </Card>
    );
};

export default SocialMap;
