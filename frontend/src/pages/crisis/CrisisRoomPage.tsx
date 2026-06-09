import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Row, Col, Button, Spin, Result } from 'antd';
import { ArrowLeftOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import SituationBoard from '@/components/crisis/SituationBoard';
import TeamDispatcher from '@/components/crisis/TeamDispatcher';
import LogisticsProcurement from '@/components/crisis/LogisticsProcurement';
import CrisisMessagingPanel from '@/components/crisis/CrisisMessagingPanel';
import ParticipantInviteModal from '@/components/crisis/ParticipantInviteModal';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

export default function CrisisRoomPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [inviteModalVisible, setInviteModalVisible] = useState(false);

    useEffect(() => {
        if (!id) return;
        crisisApi.getRoomSummary(id)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load Crisis Room. Assure backend API is running.');
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0f1c' }}><Spin size="large" /></div>;

    if (error) return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0f1c' }}>
            <Result status="error" title={<Text style={{ color: '#fff' }}>Connection Failed</Text>} subTitle={<Text style={{ color: '#94a3b8' }}>{error}</Text>} extra={[<Button key="return-btn" type="primary" onClick={() => navigate('/radar')}>Return to Radar</Button>]} />
        </div>
    );

    return (
        <Layout style={{ height: '100vh', background: '#0a0f1c', overflow: 'hidden' }}>
            <Header style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/radar')} style={{ color: '#94a3b8' }} />
                    <Title level={4} style={{ color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ height: 12, width: 12, borderRadius: '50%', background: '#ef4444', border: '2px solid #7f1d1d', animation: 'pulse 2s infinite' }}></span>
                        CRISIS COMMAND CENTER: {data.room.disaster_name.toUpperCase()}
                    </Title>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <Button type="primary" onClick={() => setInviteModalVisible(true)} style={{ background: '#f59e0b', color: '#fff', border: 'none' }}>
                        + Sync Officer
                    </Button>
                    <Button type="primary" style={{ background: '#3b82f6' }} icon={<VideoCameraOutlined />} href={data.room.video_call_url} target="_blank">
                        Join C2 Video Conf
                    </Button>
                </div>
            </Header>

            <Content style={{ padding: '16px', overflowY: 'auto' }}>
                <Row gutter={[16, 16]} style={{ height: 'calc(100vh - 96px)' }}>
                    {/* Left Column: Situation & Map Box */}
                    <Col span={6} style={{ display: 'flex', flexDirection: 'column' }}>
                        <SituationBoard data={data.situation_board} />
                        <div style={{ flex: 1, background: '#1e293b', borderRadius: 8, border: '1px solid #334155', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <Text type="secondary">GPS Tracking View Offline</Text>
                        </div>
                    </Col>

                    {/* Middle Column: Resource & HR Dispatch */}
                    <Col span={10} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                            <TeamDispatcher disasterLat={36.5} disasterLon={10.2} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <LogisticsProcurement disasterId={data.room.disaster_id} />
                        </div>
                    </Col>

                    {/* Right Column: Comms & Decisions */}
                    <Col span={8}>
                        <CrisisMessagingPanel roomId={data.room.id} initialMessages={data.recent_messages} />
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
