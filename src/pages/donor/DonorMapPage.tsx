// ============================================================
// NEXUS-AID — Donor Map Page
// Interactive map showing donation needs by committee + location
// Uses Leaflet.js with OpenStreetMap tiles
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Space, Tag, Button, Select, Input, Badge, Drawer, Spin, message } from 'antd';
import {
    EnvironmentOutlined, HeartOutlined, SearchOutlined,
    FilterOutlined, ReloadOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useUIStore } from '@/stores';
import type { DonationNeed } from '@/services/donationService';
import { donationService } from '@/services/donationService';

const { Title, Text } = Typography;

// ============================================================
// Types & Mock Data
// ============================================================
export interface UINeed extends DonationNeed {
    city: string;
    lat: number;
    lng: number;
}

// Map regions to coordinates for visual display
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
    'Tunis': { lat: 36.8065, lng: 10.1815 },
    'Sfax': { lat: 34.7406, lng: 10.7603 },
    'Sousse': { lat: 35.8288, lng: 10.6400 },
    'Bizerte': { lat: 37.2744, lng: 9.8739 },
    'Nabeul': { lat: 36.4561, lng: 10.7376 },
    'Kairouan': { lat: 35.6781, lng: 10.0963 },
    'Monastir': { lat: 35.7773, lng: 10.8262 },
    'DEFAULT': { lat: 33.8869, lng: 9.5375 } // Center Tunisia
};

const TYPE_EMOJI: Record<string, string> = {
    'Alimentaire': '🍞',
    'Médical': '🏥',
    'Équipement': '⚙️',
    'Vêtements': '👕',
    'Urgence': '🚨',
};

const TYPE_COLORS: Record<string, string> = {
    'Alimentaire': '#16a34a',
    'Médical': '#0ea5e9',
    'Équipement': '#8b5cf6',
    'Vêtements': '#f59e0b',
    'Urgence': '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
    'URGENT': '#ef4444',
    'NORMAL': '#f59e0b',
    'LOW': '#16a34a',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    'OPEN': { label: '🟢 Ouvert', color: '#16a34a' },
    'IN_PROGRESS': { label: '🟡 En cours', color: '#f59e0b' },
    'COMPLETED': { label: '⚪ Complété', color: '#9ca3af' },
};

// ============================================================
// Custom Leaflet Marker Generator using L.divIcon
// Avoids 404 image asset issues and allows rich premium designs
// ============================================================
const createCustomIcon = (priority: string, type: string, isSelected: boolean) => {
    const color = PRIORITY_COLORS[priority] || '#16a34a';
    const emoji = TYPE_EMOJI[type] || '📦';
    const size = isSelected ? 42 : 36;
    
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
                ${priority === 'URGENT' ? `
                    <div style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: ${size + 16}px;
                        height: ${size + 16}px;
                        border-radius: 50%;
                        border: 2px solid ${color}80;
                        animation: markerPulse 2s infinite;
                        pointer-events: none;
                    "></div>
                ` : ''}
                <div style="
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, ${color}, ${color}cc);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: ${isSelected ? '20px' : '16px'};
                    border: 3px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'};
                    box-shadow: 0 4px 16px ${color}50, 0 2px 6px rgba(0,0,0,0.2);
                    transition: all 0.2s ease;
                ">
                    ${emoji}
                </div>
            </div>
        `,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2]
    });
};

// ============================================================
// Sub-component: View Controller (smooth pan and zoom)
// ============================================================
const MapController: React.FC<{ selectedNeed: UINeed | null }> = ({ selectedNeed }) => {
    const map = useMap();

    useEffect(() => {
        if (selectedNeed) {
            map.setView([selectedNeed.lat, selectedNeed.lng], 9.5, { animate: true, duration: 1.2 });
        } else {
            map.setView([36.2, 10.0], 7.5, { animate: true, duration: 1.2 });
        }
    }, [selectedNeed, map]);

    return null;
};

// ============================================================
// Need Detail Panel
// ============================================================
const NeedDetailPanel: React.FC<{
    need: UINeed | null;
    onClose: () => void;
    onDonate: (need: UINeed) => void;
    isDark: boolean;
}> = ({ need, onClose, onDonate, isDark }) => {
    if (!need) return null;
    const color = TYPE_COLORS[need.type] || '#6b7280';

    return (
        <Drawer
            open={!!need}
            onClose={onClose}
            placement="right"
            width={380}
            title={
                <Space>
                    <span style={{ fontSize: 20 }}>{TYPE_EMOJI[need.type] || '📦'}</span>
                    <span>{need.committeeName}</span>
                </Space>
            }
            style={{ zIndex: 1001 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
                {/* Priority + Type tags */}
                <Space wrap>
                    <Tag style={{
                        background: `${PRIORITY_COLORS[need.priority]}15`,
                        color: PRIORITY_COLORS[need.priority],
                        border: 'none',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 12,
                        padding: '4px 14px',
                    }}>
                        {need.priority === 'URGENT' ? '🔴' : need.priority === 'NORMAL' ? '🟡' : '🟢'} {need.priority}
                    </Tag>
                    <Tag style={{ background: `${color}15`, color, border: 'none', borderRadius: 8, fontSize: 12, padding: '4px 14px' }}>
                        {need.type}
                    </Tag>
                    <Tag style={{ color: STATUS_LABELS[need.status]?.color || '#999', border: `1px solid ${STATUS_LABELS[need.status]?.color || '#999'}30`, borderRadius: 8, fontSize: 11 }}>
                        {STATUS_LABELS[need.status]?.label || need.status}
                    </Tag>
                </Space>

                {/* Location */}
                <div style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc',
                    borderRadius: 12,
                    padding: '14px 18px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0'}`,
                }}>
                    <Space>
                        <EnvironmentOutlined style={{ color, fontSize: 18 }} />
                        <div>
                            <Text strong style={{ display: 'block' }}>{need.city}</Text>
                            <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13 }}>
                                {need.committeeRegion}
                            </Text>
                        </div>
                    </Space>
                </div>

                {/* Description */}
                <div>
                    <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
                        Description du besoin
                    </Text>
                    <Text style={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.7)' : '#555', lineHeight: 1.6 }}>
                        {need.description}
                    </Text>
                </div>

                {/* Details grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                        { label: 'Quantité demandée', value: need.quantityNeeded || 'Non spécifié', icon: '📦' },
                        { label: 'Bénéficiaires', value: need.beneficiaries ? `${need.beneficiaries} personnes` : 'Non spécifié', icon: '👥' },
                        { label: 'Publié le', value: new Date(need.publishedAt).toLocaleDateString('fr-FR'), icon: '📅' },
                        { label: 'Comité', value: need.committeeName, icon: '🏛' },
                    ].map((item) => (
                        <div key={item.label} style={{
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                            borderRadius: 10,
                            padding: '12px 14px',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                        }}>
                            <Text style={{ color: isDark ? 'rgba(255,255,255,0.4)' : '#999', fontSize: 11, display: 'block', marginBottom: 4 }}>
                                {item.icon} {item.label}
                            </Text>
                            <Text strong style={{ fontSize: 13 }}>{item.value}</Text>
                        </div>
                    ))}
                </div>

                {/* CTA Button */}
                <Button
                    type="primary"
                    block
                    size="large"
                    icon={<HeartOutlined />}
                    onClick={() => onDonate(need)}
                    style={{
                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                        border: 'none',
                        borderRadius: 14,
                        fontWeight: 700,
                        fontSize: 15,
                        height: 52,
                        boxShadow: '0 4px 20px rgba(22,163,74,0.4)',
                        marginTop: 'auto',
                    }}
                >
                    💝 Faire un don pour ce besoin
                </Button>

                <Text style={{ textAlign: 'center', fontSize: 12, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>
                    100% transparent — Don tracé et certifié
                </Text>
            </div>
        </Drawer>
    );
};

// ============================================================
// Main Map Page
// ============================================================
const DonorMapPage: React.FC = () => {
    const navigate = useNavigate();
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';

    const [needs, setNeeds] = useState<UINeed[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNeed, setSelectedNeed] = useState<UINeed | null>(null);
    const [filterType, setFilterType] = useState<string>('ALL');
    const [filterPriority, setFilterPriority] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [searchText, setSearchText] = useState('');
    const [mapDimensions, setMapDimensions] = useState({ w: 700, h: 500 });

    useEffect(() => {
        const fetchNeeds = async () => {
            try {
                setLoading(true);
                const data = await donationService.getAllNeeds();
                // Map regions to UI coordinates with circular deterministic offsets to avoid overlaps
                const uiNeeds = data.map((n) => {
                    const coords = REGION_COORDS[n.committeeRegion] || REGION_COORDS['DEFAULT'];
                    
                    const siblings = data.filter(item => item.committeeRegion === n.committeeRegion);
                    const siblingIndex = siblings.findIndex(item => item.id === n.id);
                    
                    let latOffset = 0;
                    let lngOffset = 0;
                    
                    if (siblings.length > 1) {
                        const angle = (siblingIndex * 2 * Math.PI) / siblings.length;
                        const radius = 0.04; // small circular spread (~4km)
                        latOffset = Math.sin(angle) * radius;
                        lngOffset = Math.cos(angle) * radius;
                    }
                    
                    return {
                        ...n,
                        city: n.committeeRegion,
                        lat: coords.lat + latOffset,
                        lng: coords.lng + lngOffset
                    };
                });
                setNeeds(uiNeeds);
            } catch (err) {
                console.error('Error fetching needs', err);
                message.error('Erreur lors du chargement des besoins');
            } finally {
                setLoading(false);
            }
        };
        fetchNeeds();
    }, []);

    const filteredNeeds = needs.filter((need) => {
        if (filterType !== 'ALL' && need.type !== filterType) return false;
        if (filterPriority !== 'ALL' && need.priority !== filterPriority) return false;
        if (filterStatus !== 'ALL' && need.status !== filterStatus) return false;
        if (searchText && !need.committeeName.toLowerCase().includes(searchText.toLowerCase()) && !need.city.toLowerCase().includes(searchText.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{
            background: isDark ? '#0f172a' : '#f0fdf4',
            margin: -24,
            padding: 24,
            minHeight: '100vh',
        }}>
            {/* Header */}
            <div style={{
                background: isDark ? 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(22,163,74,0.05))' : 'linear-gradient(135deg, rgba(22,163,74,0.1), rgba(255,255,255,0.9))',
                borderRadius: 20,
                padding: '20px 28px',
                marginBottom: 24,
                border: `1px solid rgba(22,163,74,0.2)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 22,
                        boxShadow: '0 0 20px rgba(22,163,74,0.4)',
                    }}>
                        🗺
                    </div>
                    <div>
                        <Title level={4} style={{ margin: 0 }}>Carte des Besoins</Title>
                        <Text style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#888', fontSize: 13 }}>
                            {filteredNeeds.length} besoin(s) actif(s) sur toute la Tunisie
                        </Text>
                    </div>
                </div>
                <Space wrap>
                    <Tag color="error">{needs.filter(n => n.priority === 'URGENT').length} Urgents</Tag>
                    <Tag color="warning">{needs.filter(n => n.status === 'OPEN').length} Ouverts</Tag>
                    <Tag color="processing">{needs.filter(n => n.status === 'IN_PROGRESS').length} En cours</Tag>
                </Space>
            </div>

            {/* Filters bar */}
            <div style={{
                background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
                borderRadius: 16,
                padding: '16px 20px',
                marginBottom: 20,
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                alignItems: 'center',
            }}>
                <FilterOutlined style={{ color: '#16a34a', fontSize: 16 }} />
                <Input
                    placeholder="Chercher comité ou ville..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 220, borderRadius: 8 }}
                />
                <Select
                    value={filterType}
                    onChange={setFilterType}
                    style={{ width: 150, borderRadius: 8 }}
                    options={[
                        { value: 'ALL', label: 'Tous les types' },
                        { value: 'Alimentaire', label: '🍞 Alimentaire' },
                        { value: 'Médical', label: '🏥 Médical' },
                        { value: 'Équipement', label: '⚙️ Équipement' },
                        { value: 'Vêtements', label: '👕 Vêtements' },
                        { value: 'Urgence', label: '🚨 Urgence' },
                    ]}
                />
                <Select
                    value={filterPriority}
                    onChange={setFilterPriority}
                    style={{ width: 150 }}
                    options={[
                        { value: 'ALL', label: 'Toutes priorités' },
                        { value: 'URGENT', label: '🔴 Urgent' },
                        { value: 'NORMAL', label: '🟡 Normal' },
                        { value: 'LOW', label: '🟢 Bas' },
                    ]}
                />
                <Select
                    value={filterStatus}
                    onChange={setFilterStatus}
                    style={{ width: 140 }}
                    options={[
                        { value: 'ALL', label: 'Tous statuts' },
                        { value: 'OPEN', label: '🟢 Ouvert' },
                        { value: 'IN_PROGRESS', label: '🟡 En cours' },
                        { value: 'COMPLETED', label: '⚪ Complété' },
                    ]}
                />
                <Button
                    icon={<ReloadOutlined />}
                    onClick={() => { setFilterType('ALL'); setFilterPriority('ALL'); setFilterStatus('ALL'); setSearchText(''); }}
                    style={{ borderRadius: 8 }}
                >
                    Réinitialiser
                </Button>
            </div>

            {/* Main Content: Map + Legend */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {/* Real Interactive Leaflet Map */}
                <div
                    id="donor-map-container"
                    style={{
                        flex: '1 1 60%',
                        minWidth: 300,
                        background: isDark ? '#1a2e1a' : '#e6f4ea',
                        borderRadius: 20,
                        border: `2px solid ${isDark ? 'rgba(22,163,74,0.3)' : 'rgba(22,163,74,0.2)'}`,
                        position: 'relative',
                        overflow: 'hidden',
                        height: mapDimensions.h,
                    }}
                >
                    {loading ? (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        <MapContainer
                            center={[36.2, 10.0]}
                            zoom={7.5}
                            zoomControl={true}
                            style={{ width: '100%', height: '100%', zIndex: 1 }}
                        >
                            <TileLayer
                                url={
                                    isDark
                                        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                                        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
                                }
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                            />
                            <MapController selectedNeed={selectedNeed} />
                            {filteredNeeds.map((need) => (
                                <Marker
                                    key={need.id}
                                    position={[need.lat, need.lng]}
                                    icon={createCustomIcon(need.priority, need.type, selectedNeed?.id === need.id)}
                                    eventHandlers={{
                                        click: () => {
                                            setSelectedNeed(selectedNeed?.id === need.id ? null : need);
                                        }
                                    }}
                                />
                            ))}
                        </MapContainer>
                    )}

                    {/* Legend on map */}
                    <div style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        background: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.95)',
                        borderRadius: 12,
                        padding: '10px 14px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        zIndex: 2,
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 8, color: isDark ? '#fff' : '#333' }}>
                            Priorités
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                            <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>🔴 Urgent</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                            <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>🟡 Normal</Text>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }} />
                            <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>🟢 Bas</Text>
                        </div>
                    </div>
                </div>

                {/* Needs List (sidebar) */}
                <div style={{
                    flex: '1 1 30%',
                    minWidth: 280,
                    maxHeight: mapDimensions.h,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}>
                            <Spin size="large" />
                        </div>
                    ) : filteredNeeds.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: isDark ? 'rgba(255,255,255,0.4)' : '#999' }}>
                            <EnvironmentOutlined style={{ fontSize: 40, marginBottom: 12, display: 'block' }} />
                            <Text>Aucun besoin trouvé</Text>
                        </div>
                    ) : filteredNeeds.map((need) => (
                        <div
                            key={need.id}
                            onClick={() => setSelectedNeed(selectedNeed?.id === need.id ? null : need)}
                            style={{
                                background: selectedNeed?.id === need.id
                                    ? (isDark ? 'rgba(22,163,74,0.15)' : '#f0fdf4')
                                    : (isDark ? 'rgba(255,255,255,0.03)' : '#fff'),
                                borderRadius: 14,
                                padding: '14px 16px',
                                border: `1px solid ${selectedNeed?.id === need.id ? '#16a34a40' : isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => { if (selectedNeed?.id !== need.id) { e.currentTarget.style.borderColor = '#16a34a30'; } }}
                            onMouseLeave={(e) => { if (selectedNeed?.id !== need.id) { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f0'; } }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Space size={4}>
                                    <span style={{ fontSize: 16 }}>{TYPE_EMOJI[need.type] || '📦'}</span>
                                    <Text strong style={{ fontSize: 13 }}>{need.city}</Text>
                                </Space>
                                <Badge color={PRIORITY_COLORS[need.priority]} text={
                                    <Text style={{ fontSize: 11, color: PRIORITY_COLORS[need.priority], fontWeight: 600 }}>
                                        {need.priority}
                                    </Text>
                                } />
                            </div>
                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.5)' : '#888', display: 'block', marginBottom: 8 }}>
                                {need.committeeName}
                            </Text>
                            <Text style={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.6)' : '#555', display: 'block', marginBottom: 10, lineHeight: 1.4 }}>
                                {need.description.slice(0, 80)}...
                            </Text>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Tag style={{ background: `${TYPE_COLORS[need.type] || '#ccc'}15`, color: TYPE_COLORS[need.type] || '#999', border: 'none', borderRadius: 6, fontSize: 11, margin: 0 }}>
                                    {need.quantityNeeded || 'Non spécifié'}
                                </Tag>
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<HeartOutlined />}
                                    style={{
                                        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: 11,
                                        fontWeight: 600,
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate('/donor/donate', { state: { needId: need.id } });
                                    }}
                                >
                                    Donner
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Drawer */}
            <NeedDetailPanel
                need={selectedNeed}
                onClose={() => setSelectedNeed(null)}
                onDonate={(need) => navigate('/donor/donate', { state: { needId: need.id } })}
                isDark={isDark}
            />

            <style>{`
                @keyframes markerPulse {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.4; }
                    100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
};

export default DonorMapPage;


