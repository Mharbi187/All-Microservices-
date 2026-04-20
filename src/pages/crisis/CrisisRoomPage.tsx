import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Layout, Typography, Row, Col, Button, Spin, Result, Card, Tag } from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { crisisApi } from '@/services/crisisApi';
import SituationBoard from '@/components/crisis/SituationBoard';
import TeamDispatcher from '@/components/crisis/TeamDispatcher';
import LogisticsProcurement from '@/components/crisis/LogisticsProcurement';
import CrisisMessagingPanel from '@/components/crisis/CrisisMessagingPanel';
import ParticipantInviteModal from '@/components/crisis/ParticipantInviteModal';
import { useRadar } from '@/hooks/useRadar';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

interface RoomSummary {
    room: {
        id: string;
        disaster_id: string;
        disaster_name: string;
        video_call_url: string;
    };
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

export default function CrisisRoomPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { data: radarData } = useRadar();

    const [summary, setSummary] = useState<RoomSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [inviteModalVisible, setInviteModalVisible] = useState(false);

    const isFullscreen = location.pathname.endsWith('/fullscreen');
    const radarPath = isFullscreen ? '/radar/fullscreen' : '/radar';

    useEffect(() => {
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
    }, [id]);

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

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0f1c' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (error || !summary) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0f1c' }}>
                <Result
                    status="error"
                    title={<Text style={{ color: '#fff' }}>Connection Failed</Text>}
                    subTitle={<Text style={{ color: '#94a3b8' }}>{error || 'Unknown error'}</Text>}
                    extra={[
                        <Button key="return-btn" type="primary" onClick={() => navigate(radarPath)}>
                            Return to Radar
                        </Button>,
                    ]}
                />
            </div>
        );
    }

    return (
        <Layout style={{ height: '100vh', background: '#0a0f1c', overflow: 'hidden' }}>
            <Header
                style={{
                    background: '#0f172a',
                    borderBottom: '1px solid #1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(radarPath)} style={{ color: '#94a3b8' }} />
                    <Title level={4} style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                            style={{
                                height: 12,
                                width: 12,
                                borderRadius: '50%',
                                background: '#ef4444',
                                border: '2px solid #7f1d1d',
                                animation: 'pulse 2s infinite',
                            }}
                        />
                        CRISIS COMMAND CENTER: {summary.room.disaster_name.toUpperCase()}
                    </Title>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button
                        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        onClick={() => navigate(`/crisis-room/${id}${isFullscreen ? '' : '/fullscreen'}`)}
                    >
                        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </Button>
                    <Button type="primary" onClick={() => setInviteModalVisible(true)} style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
                        + Sync Officer
                    </Button>
                    <Button type="primary" style={{ background: '#3b82f6' }} icon={<VideoCameraOutlined />} href={summary.room.video_call_url} target="_blank">
                        Join C2 Video Conf
                    </Button>
                </div>
            </Header>

            <Content style={{ padding: '16px', overflowY: 'auto' }}>
                <Row gutter={[16, 16]} style={{ height: 'calc(100vh - 96px)' }}>
                    <Col span={6} style={{ display: 'flex', flexDirection: 'column' }}>
                        <SituationBoard data={summary.situation_board} />
                        <Card
                            title="Live Crisis Map Anchor"
                            style={{ flex: 1, background: '#1e293b', borderColor: '#334155' }}
                            bodyStyle={{ height: '100%', minHeight: 260, padding: 8 }}
                            extra={
                                <Tag color={target.risk != null && target.risk >= 0.7 ? 'error' : 'processing'}>
                                    {target.label}
                                </Tag>
                            }
                        >
                            <MapContainer center={[target.lat, target.lon]} zoom={8} style={{ height: '100%', borderRadius: 8 }}>
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                <CircleMarker center={[target.lat, target.lon]} radius={10} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.7 }}>
                                    <Popup>
                                        Target: {target.label}
                                        {target.risk != null ? ` (risk ${target.risk.toFixed(2)})` : ''}
                                    </Popup>
                                </CircleMarker>
                            </MapContainer>
                        </Card>
                    </Col>

                    <Col span={10} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <TeamDispatcher disasterLat={target.lat} disasterLon={target.lon} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <LogisticsProcurement disasterId={summary.room.disaster_id} />
                        </div>
                    </Col>

                    <Col span={8}>
                        <CrisisMessagingPanel roomId={summary.room.id} initialMessages={summary.recent_messages} />
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
        </Layout>
    );
}
