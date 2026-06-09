import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Table, Typography, Tag, notification } from 'antd';
import { ReloadOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Text } = Typography;

interface TeamMember {
    id?: string;
    name: string;
    role: string;
    is_available: boolean;
}

interface TeamRecord {
    id: string;
    name: string;
    team_type: string;
    base_location_name?: string;
    status?: string;
    base_location?: { lat: number; lon: number };
    distance_km?: number;
    members?: TeamMember[];
}

interface TeamDispatcherProps {
    roomId?: string;
    disasterLat?: number;
    disasterLon?: number;
    isClosed?: boolean;
}

export default function TeamDispatcher({ roomId, disasterLat = 36.8, disasterLon = 10.18, isClosed }: TeamDispatcherProps) {
    const [teams, setTeams] = useState<TeamRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deployingId, setDeployingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    // Haversine formula
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const loadTeams = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await crisisApi.getAllTeams();
            let loadedTeams = Array.isArray(data) ? data : [];
            
            // Calculate distance and sort
            if (disasterLat && disasterLon) {
                loadedTeams = loadedTeams.map(t => {
                    if (t.base_location?.lat && t.base_location?.lon) {
                        t.distance_km = calculateDistance(disasterLat, disasterLon, t.base_location.lat, t.base_location.lon);
                    }
                    return t;
                });
                
                loadedTeams.sort((a, b) => {
                    // Sort available teams first, then by distance
                    if (a.status === 'available' && b.status !== 'available') return -1;
                    if (b.status === 'available' && a.status !== 'available') return 1;
                    const distA = a.distance_km ?? 9999;
                    const distB = b.distance_km ?? 9999;
                    return distA - distB;
                });
            }
            
            setTeams(loadedTeams);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unable to fetch team list';
            setError(message);
            setTeams([]);
        } finally {
            setLoading(false);
        }
    }, [disasterLat, disasterLon]);

    useEffect(() => {
        void loadTeams();
    }, [loadTeams]);

    const handleDeploy = useCallback(async (team: TeamRecord) => {
        if (!roomId) {
            notification.error({ message: 'Erreur', description: 'ID de la salle introuvable.' });
            return;
        }
        try {
            setDeployingId(team.id);
            await crisisApi.dispatchTeam(team.id, disasterLat, disasterLon, roomId);
            notification.success({ message: 'Équipe déployée', description: `${team.name} est en route.` });
            setTeams((prev) => prev.filter((item) => item.id !== team.id));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Deployment request failed';
            notification.error({ message: 'Déploiement échoué', description: message });
        } finally {
            setDeployingId(null);
        }
    }, [disasterLat, disasterLon]);

    const columns = [
        {
            title: 'Team',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong style={{ color: t.text, fontFamily: rfont.body }}>{text}</Text>,
        },
        {
            title: 'Type',
            dataIndex: 'team_type',
            key: 'type',
            render: (type: string) => (
                <Tag
                    style={{
                        fontFamily: rfont.data,
                        fontWeight: 700,
                        borderRadius: rr.pill,
                        padding: '1px 8px',
                        fontSize: 10,
                    }}
                    color={type === 'NDRT' ? 'red' : type === 'RDRT' ? 'orange' : 'blue'}
                >
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Base & Distance',
            dataIndex: 'base_location_name',
            key: 'base',
            render: (base: string, record: TeamRecord) => (
                <div>
                    <Text style={{ color: t.textSub, fontFamily: rfont.body, fontSize: 12 }}>{base || 'Base inconnue'}</Text>
                    {record.distance_km !== undefined && (
                        <div style={{ color: rp.amb500, fontSize: 11, fontWeight: 600 }}>
                            {record.distance_km.toFixed(1)} km
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: TeamRecord) => {
                if (isClosed) return <Tag color="default">Clôturé</Tag>;
                return (
                <Button
                    type="primary"
                    icon={<RocketOutlined />}
                    onClick={() => void handleDeploy(record)}
                    loading={deployingId === record.id}
                    size="small"
                    disabled={record.status !== 'available' && record.status !== undefined}
                    style={{
                        background: record.status !== 'available' && record.status !== undefined ? t.cardBg : `linear-gradient(90deg, ${rp.red600}, ${rp.red500})`,
                        borderColor: record.status !== 'available' && record.status !== undefined ? t.divider : rp.red600,
                        color: record.status !== 'available' && record.status !== undefined ? t.textSub : '#fff',
                        borderRadius: rr.sm,
                        fontFamily: rfont.body,
                        fontWeight: 700,
                        boxShadow: record.status !== 'available' && record.status !== undefined ? 'none' : '0 2px 6px rgba(220,38,38,0.2)',
                    }}
                >
                    {record.status !== 'available' && record.status !== undefined ? 'Indisponible' : 'Déployer'}
                </Button>
                );
            },
        },
    ];

    return (
        <>
            <style>{`
                .dispatcher-table .ant-table {
                    background: transparent !important;
                    color: ${t.text} !important;
                }
                .dispatcher-table .ant-table-thead > tr > th {
                    background: ${isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC'} !important;
                    color: ${isDark ? rp.dMuted : rp.slate} !important;
                    border-bottom: 1px solid ${t.divider} !important;
                    font-family: ${rfont.body};
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.05em;
                }
                .dispatcher-table .ant-table-tbody > tr > td {
                    background: transparent !important;
                    border-bottom: 1px solid ${t.divider} !important;
                    color: ${t.text} !important;
                    font-family: ${rfont.body};
                }
                .dispatcher-table .ant-table-tbody > tr:hover > td {
                    background: ${t.rowHoverBg} !important;
                }
                .dispatcher-table .ant-empty-description {
                    color: ${t.textSub} !important;
                }
                .dispatcher-table .ant-table-placeholder {
                    background: transparent !important;
                    border-bottom: 1px solid ${t.divider} !important;
                }
            `}</style>
            <Card
                title={<Text style={{ color: t.text, fontFamily: rfont.display, fontWeight: 700, fontSize: 14 }}><SettingOutlined style={{ marginRight: 8 }} />Team Dispatch Matrix</Text>}
                extra={
                    <Button
                        icon={<ReloadOutlined style={{ color: t.text }} />}
                        onClick={() => void loadTeams()}
                        loading={loading}
                        style={{ background: t.cardBg, borderColor: t.cardBorder, borderRadius: rr.sm }}
                    />
                }
                style={{
                    background: t.cardBg,
                    borderColor: t.cardBorder,
                    borderRadius: rr.lg,
                    boxShadow: t.cardShadow,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
            >
                {error && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Responder feed unavailable"
                        description={error}
                        style={{ margin: 12 }}
                    />
                )}
                <Table
                    className="dispatcher-table"
                    dataSource={teams}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 5 }}
                    size="middle"
                    style={{ background: 'transparent' }}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div style={{ padding: '8px 16px', background: isDark ? 'rgba(0,0,0,0.2)' : '#fafafa', borderRadius: 8 }}>
                                <Text strong style={{ color: t.text }}>Membres de l'équipe :</Text>
                                {record.members && record.members.length > 0 ? (
                                    <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                                        {record.members.map((m, idx) => (
                                            <li key={m.id || idx} style={{ color: t.textSub, fontFamily: rfont.body, marginBottom: 4 }}>
                                                <span style={{ fontWeight: 600 }}>{m.name}</span> - {m.role} 
                                                {m.is_available ? 
                                                    <span style={{ color: rp.grn500, marginLeft: 8, fontSize: 11 }}>● Disponible</span> : 
                                                    <span style={{ color: rp.red500, marginLeft: 8, fontSize: 11 }}>● Indisponible</span>
                                                }
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>Aucun membre enregistré.</Text>
                                )}
                            </div>
                        ),
                    }}
                />
            </Card>
        </>
    );
}
