import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Row, Col, Spin, Result, Button } from 'antd';
import { crisisApi } from '@/services/crisisApi';
import CrisisMessagingPanel from '@/components/crisis/CrisisMessagingPanel';
import SituationBoard from '@/components/crisis/SituationBoard';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rr, rfont, rp } from '@/components/crisis/radarTheme';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

export default function VolunteerCrisisRoom() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const [summary, setSummary] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        crisisApi.getRoomSummary(id)
            .then((res) => {
                setSummary(res);
                setError('');
            })
            .catch(() => {
                setError('Impossible de rejoindre la salle de crise.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [id]);

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
                    title={<Text style={{ color: t.text }}>Accès Refusé</Text>}
                    subTitle={<Text style={{ color: t.textSub }}>{error || 'Erreur inconnue'}</Text>}
                />
            </div>
        );
    }

    return (
        <Layout style={{ height: '100vh', background: t.pageBg, overflow: 'hidden' }}>
            <Header
                style={{
                    background: t.topbarBg,
                    borderBottom: `1px solid ${t.topbarBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 24px',
                    height: '64px',
                }}
            >
                <Title level={4} style={{ color: t.text, margin: 0, fontFamily: rfont.display, fontWeight: 700 }}>
                    Nexus-AID Volunteer Portal : {summary.room.disaster_name.toUpperCase()}
                </Title>
            </Header>

            <Content style={{ padding: '16px', overflowY: 'auto' }}>
                <Row gutter={[16, 16]} style={{ minHeight: 'calc(100vh - 96px)', justifyContent: 'center' }}>
                    <Col xs={24} lg={8} style={{ display: 'flex', flexDirection: 'column' }}>
                        <SituationBoard data={summary.situation_board} />
                    </Col>
                    <Col xs={24} lg={12} style={{ display: 'flex', flexDirection: 'column' }}>
                        <CrisisMessagingPanel roomId={summary.room.id} initialMessages={summary.recent_messages} />
                    </Col>
                </Row>
            </Content>
        </Layout>
    );
}
