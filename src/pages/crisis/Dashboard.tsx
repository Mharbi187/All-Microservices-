import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Badge, Row, Col, Button, Alert, Space, Tag } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenExitOutlined, FullscreenOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '@/components/crisis/Sidebar';
import RadarMap from '@/components/crisis/RadarMap';
import RegionalOverlay from '@/components/crisis/RegionalOverlay';
import KpiCards from '@/components/crisis/KpiCards';
import AlertFeed from '@/components/crisis/AlertFeed';
import RiskBarChart from '@/components/crisis/RiskBarChart';
import RiskDistribution from '@/components/crisis/RiskDistribution';
import RegionalTable from '@/components/crisis/RegionalTable';
import RoomCreationModal from '@/components/crisis/RoomCreationModal';
import IncidentLogPanel from '@/components/crisis/IncidentLogPanel';
import RespondersPanel from '@/components/crisis/RespondersPanel';
import { useRadar } from '@/hooks/useRadar';
import { useCommandCenter } from '@/stores/commandCenterStore';
import { crisisApi } from '@/services/crisisApi';

const { Content } = Layout;
const { Text } = Typography;

const DEFAULT_TARGET = { lat: 36.8065, lon: 10.1815, label: 'Tunis (default command target)' };

export default function Dashboard() {
    const { data, isConnected, isLive, daemonStatus } = useRadar();
    const { role, panel, selectedWilaya, setSelectedWilaya, setPanel } = useCommandCenter();
    const navigate = useNavigate();
    const location = useLocation();
    const [creationVisible, setCreationVisible] = useState(false);
    const [pendingDisasterId, setPendingDisasterId] = useState('');
    const [pendingOperationLabel, setPendingOperationLabel] = useState('');
    const [responderCount, setResponderCount] = useState(0);
    const isFullscreen = location.pathname.endsWith('/fullscreen');

    const wilayatNames = useMemo(() => {
        if (!data) return [];
        return Object.keys(data.wilayats).sort();
    }, [data]);

    const incidentCount = useMemo(() => {
        if (!data?.wilayats) return 0;
        return Object.values(data.wilayats).filter((item) => item.is_high_risk).length;
    }, [data]);

    const selectedInfo = selectedWilaya && data?.wilayats[selectedWilaya] ? data.wilayats[selectedWilaya] : null;
    const selectedHighRisk = Boolean(selectedInfo && selectedInfo.risk_score >= 0.7);

    const selectedTarget = useMemo(() => {
        if (selectedInfo?.coordinates) {
            return {
                lat: selectedInfo.coordinates.lat,
                lon: selectedInfo.coordinates.lon,
                label: `${selectedWilaya ?? 'Selected wilaya'}`,
            };
        }

        if (data?.wilayats) {
            const highest = Object.entries(data.wilayats).sort(([, a], [, b]) => b.risk_score - a.risk_score)[0];
            if (highest?.[1]?.coordinates) {
                return {
                    lat: highest[1].coordinates.lat,
                    lon: highest[1].coordinates.lon,
                    label: `${highest[0]} (highest risk)`,
                };
            }
        }

        return DEFAULT_TARGET;
    }, [data, selectedInfo, selectedWilaya]);

    const openRoomCreation = useCallback((wilaya: string) => {
        setSelectedWilaya(wilaya);
        setPendingDisasterId(`disaster_${wilaya.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`);
        setPendingOperationLabel(wilaya);
        setCreationVisible(true);
    }, [setSelectedWilaya]);

    const refreshResponderCount = useCallback(async () => {
        try {
            const teams = await crisisApi.getAvailableTeams();
            setResponderCount(Array.isArray(teams) ? teams.length : 0);
        } catch {
            setResponderCount(0);
        }
    }, []);

    useEffect(() => {
        void refreshResponderCount();
        const interval = window.setInterval(() => {
            void refreshResponderCount();
        }, 20000);
        return () => window.clearInterval(interval);
    }, [refreshResponderCount]);

    const telemetryColor = !isConnected ? '#f87171' : isLive ? '#4ade80' : '#facc15';

    const panelTitle = panel === 'radar'
        ? role === 'NATIONAL'
            ? 'National Disaster Monitoring System'
            : selectedWilaya
                ? `${selectedWilaya} — Regional Command`
                : 'Regional Command'
        : panel === 'incidents'
            ? 'Incident Command Log'
            : 'Responder Coordination';

    return (
        <Layout style={{ height: '100vh' }}>
            <Sidebar
                wilayatNames={wilayatNames}
                isConnected={isConnected}
                incidentCount={incidentCount}
                responderCount={responderCount}
            />

            <Content style={{ background: '#0a0f1c', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div
                    style={{
                        minHeight: 56,
                        background: '#0f172a',
                        borderBottom: '1px solid #1e293b',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 20px',
                        flexShrink: 0,
                        gap: 12,
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <Text strong style={{ color: '#fff', fontSize: 15 }}>
                            {panelTitle}
                        </Text>
                        {data?.timestamp && (
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Last telemetry update: {new Date(data.timestamp).toLocaleString('fr-TN')}
                                </Text>
                            </div>
                        )}
                    </div>

                    <Space size={10} wrap>
                        {selectedHighRisk && selectedWilaya && (
                            <Button danger type="primary" onClick={() => openRoomCreation(selectedWilaya)}>
                                Activate Crisis Room
                            </Button>
                        )}
                        <Button onClick={() => void refreshResponderCount()} icon={<ReloadOutlined />} />
                        <Badge
                            status={isConnected ? (isLive ? 'success' : 'warning') : 'error'}
                            text={
                                <Text style={{ color: telemetryColor, fontSize: 12, fontWeight: 600 }}>
                                    {!isConnected ? 'TELEMETRY OFFLINE' : isLive ? 'TELEMETRY LIVE' : `TELEMETRY ${daemonStatus.toUpperCase()}`}
                                </Text>
                            }
                        />
                        {data?.data_sources?.chirps_lag_days != null && (
                            <Tag color={Number(data.data_sources.chirps_lag_days) > 7 ? 'warning' : 'success'}>
                                CHIRPS lag {data.data_sources.chirps_lag_days}d
                            </Tag>
                        )}
                        <Button
                            size="small"
                            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => navigate(isFullscreen ? '/radar' : '/radar/fullscreen')}
                        >
                            {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        </Button>
                    </Space>
                </div>

                {daemonStatus !== 'running' && (
                    <div style={{ padding: '10px 16px 0' }}>
                        <Alert
                            type="warning"
                            showIcon
                            message={`Radar telemetry is ${daemonStatus.toUpperCase()}. Live analysis may be delayed while data sources recover.`}
                        />
                    </div>
                )}

                {panel === 'radar' && (
                    <>
                        <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
                            <KpiCards data={data} />
                        </div>

                        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 16px 12px', gap: 12 }}>
                            <div style={{ flex: 3, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
                                <RadarMap
                                    data={data}
                                    role={role}
                                    selectedWilaya={selectedWilaya}
                                    onWilayaClick={(name) => setSelectedWilaya(name)}
                                />
                                <AnimatePresence>
                                    {selectedWilaya && selectedInfo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 30 }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                        >
                                            <RegionalOverlay wilayaName={selectedWilaya} info={selectedInfo} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                                <Row gutter={[12, 12]} style={{ flexShrink: 0 }}>
                                    <Col span={14}>
                                        <AlertFeed data={data} />
                                    </Col>
                                    <Col span={10}>
                                        <RiskDistribution data={data} />
                                    </Col>
                                </Row>
                                <Row gutter={[12, 12]} style={{ flex: 1, minHeight: 0 }}>
                                    <Col span={12}>
                                        <RiskBarChart data={data} />
                                    </Col>
                                    <Col span={12}>
                                        <RegionalTable data={data} onSelect={setSelectedWilaya} />
                                    </Col>
                                </Row>
                            </div>
                        </div>
                    </>
                )}

                {panel === 'incidents' && (
                    <div style={{ padding: '12px 16px', height: '100%', overflow: 'auto' }}>
                        <IncidentLogPanel
                            data={data}
                            onFocusWilaya={(wilaya) => {
                                setSelectedWilaya(wilaya);
                                setPanel('radar');
                            }}
                            onCreateRoom={openRoomCreation}
                        />
                    </div>
                )}

                {panel === 'responders' && (
                    <div style={{ padding: '12px 16px', height: '100%', overflow: 'auto' }}>
                        <RespondersPanel
                            targetLat={selectedTarget.lat}
                            targetLon={selectedTarget.lon}
                            targetLabel={selectedTarget.label}
                        />
                    </div>
                )}

                <RoomCreationModal
                    visible={creationVisible}
                    disasterId={pendingDisasterId}
                    initialName={pendingOperationLabel ? `Operation ${pendingOperationLabel}` : undefined}
                    onCancel={() => setCreationVisible(false)}
                    onSuccess={(roomId: string) => {
                        setCreationVisible(false);
                        navigate(`/crisis-room/${roomId}${isFullscreen ? '/fullscreen' : ''}`);
                    }}
                />
            </Content>
        </Layout>
    );
}
