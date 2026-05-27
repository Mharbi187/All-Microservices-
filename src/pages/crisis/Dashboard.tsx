import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Badge, Row, Col, Button, Alert, Space, Tag, message, Select, Drawer, Steps, Result } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { FullscreenExitOutlined, FullscreenOutlined, ReloadOutlined, ThunderboltOutlined, ClearOutlined, ExperimentOutlined, RightOutlined } from '@ant-design/icons';
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
import type { SimulationScenario, FullSimulationResult } from '@/services/crisisApi';

const { Content } = Layout;
const { Text, Title, Paragraph } = Typography;

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

    // ─── Missing Hooks Restored ──────────────────────
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


    // ─── Simulation State ────────────────────────────
    const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState('wildfire_jendouba');
    const [simDrawerOpen, setSimDrawerOpen] = useState(false);
    const [simRunning, setSimRunning] = useState(false);
    const [simResult, setSimResult] = useState<FullSimulationResult | null>(null);
    const [simCurrentPhase, setSimCurrentPhase] = useState(-1);

    // Load available scenarios
    useEffect(() => {
        crisisApi.getScenarios().then((res) => {
            setScenarios(res.scenarios || []);
        }).catch(() => {
            // Fallback
            setScenarios([
                { id: 'wildfire_jendouba', name: 'Wildfire: Jendouba / Tabarka', description: 'Critical wildfire in Northwest', disaster_count: 3, high_risk_count: 2 },
                { id: 'flood_nabeul', name: 'Floods: Nabeul / Sousse', description: 'Flash flooding in coastal region', disaster_count: 3, high_risk_count: 2 },
                { id: 'earthquake_kasserine', name: 'Earthquake: Kasserine', description: 'M5.2 Earthquake', disaster_count: 3, high_risk_count: 2 },
                { id: 'multi_crisis', name: 'Multi-Region Crisis', description: 'Simultaneous wildfire + flood', disaster_count: 4, high_risk_count: 2 },
            ]);
        });
    }, []);

    const handleRunSimulation = async () => {
        setSimRunning(true);
        setSimResult(null);
        setSimCurrentPhase(0);

        try {
            // UI Delay
            const phaseLabels = ['Radar Injection', 'Crisis Room', 'Team Dispatch', 'Messages'];
            for (let i = 0; i < phaseLabels.length; i++) {
                setSimCurrentPhase(i);
                await new Promise(r => setTimeout(r, 600));
            }

            const result = await crisisApi.triggerFullSimulation(selectedScenario);
            setSimResult(result);
            setSimCurrentPhase(4);

            if (result.success) {
                message.success({ content: `✅ Simulation "${result.scenario_name}" deployed! Radar is fetching data.`, duration: 5 });
            } else {
                message.warning({ content: 'Simulation partially complete.', duration: 4 });
            }
        } catch (e) {
            message.error({ content: 'Simulation backend unreachable. Check MS4.', duration: 4 });
        } finally {
            setSimRunning(false);
        }
    };

    const handleResetSimulation = async () => {
        try {
            await crisisApi.resetSimulation();
            setSimResult(null);
            setSimCurrentPhase(-1);
            message.success({ content: 'Radar cache cleared.', duration: 3 });
        } catch {
            message.error({ content: 'Reset failed.', duration: 3 });
        }
    };

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

    const activeScenarioObj = scenarios.find(s => s.id === selectedScenario);

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
                        <Button
                            icon={<ThunderboltOutlined />}
                            style={{ background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', color: 'white', borderColor: 'transparent', fontWeight: 600 }}
                            onClick={() => setSimDrawerOpen(true)}
                        >
                            SIMULATION CONTROL
                        </Button>
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

                {daemonStatus !== 'running' && panel === 'radar' && (
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

                {/* SIMULATION CONTROL DRAWER */}
                <Drawer
                    title={<span style={{ color: '#fff', fontSize: 18 }}><ExperimentOutlined /> End-to-End Platform Simulation</span>}
                    placement="right"
                    width={480}
                    onClose={() => setSimDrawerOpen(false)}
                    open={simDrawerOpen}
                    closable={true}
                    styles={{ header: { background: '#0a0f1c', borderBottom: '1px solid #1e293b' }, body: { background: '#0f172a', color: '#e2e8f0', padding: 24 } }}
                >
                    <Paragraph style={{ color: '#94a3b8' }}>
                        Transform the platform into showcase mode. This orchestrator will inject a multi-region disaster into the ML radar, auto-create a Crisis Room, deploy response teams, and populate live messages.
                    </Paragraph>

                    <div style={{ marginBottom: 24 }}>
                        <Text strong style={{ color: 'white', display: 'block', marginBottom: 8 }}>Select Scenario</Text>
                        <Select
                            value={selectedScenario}
                            onChange={setSelectedScenario}
                            style={{ width: '100%' }}
                            size="large"
                            disabled={simRunning}
                            options={scenarios.map(s => ({ label: s.name, value: s.id }))}
                        />
                        {activeScenarioObj && (
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, marginTop: 12 }}>
                                <Text style={{ color: '#bae6fd', display: 'block' }}>{activeScenarioObj.description}</Text>
                                <Space style={{ marginTop: 8 }}>
                                    <Tag color="red">{activeScenarioObj.high_risk_count} Critical Zones</Tag>
                                    <Tag color="blue">{activeScenarioObj.disaster_count} Regions Overlaid</Tag>
                                </Space>
                            </div>
                        )}
                    </div>

                    <Space direction="vertical" style={{ width: '100%', marginBottom: 32 }}>
                        <Button
                            type="primary"
                            size="large"
                            block
                            icon={<ThunderboltOutlined />}
                            loading={simRunning}
                            disabled={simRunning && simCurrentPhase < 4}
                            style={{ background: '#7c3aed', borderColor: '#7c3aed', height: 48, fontSize: 16 }}
                            onClick={handleRunSimulation}
                        >
                            {simResult?.success ? 'RE-RUN SCENARIO' : 'EXECUTE SCENARIO'}
                        </Button>
                        <Button
                            block
                            danger
                            icon={<ClearOutlined />}
                            onClick={handleResetSimulation}
                            disabled={simRunning}
                        >
                            Clear Radar Cache & Reset
                        </Button>
                    </Space>

                    <Title level={5} style={{ color: 'white', marginBottom: 16 }}>Execution Pipeline</Title>
                    <Steps
                        direction="vertical"
                        size="small"
                        current={simCurrentPhase}
                        status={simResult && !simResult.success ? 'error' : 'process'}
                        items={[
                            { title: <span style={{ color: 'white' }}>Radar Injection</span>, description: <span style={{ color: '#94a3b8' }}>Pushing mock data to ML cache</span> },
                            { title: <span style={{ color: 'white' }}>Crisis Room Generation</span>, description: <span style={{ color: '#94a3b8' }}>Creating dedicated Operation Room</span> },
                            { title: <span style={{ color: 'white' }}>Team Dispatch</span>, description: <span style={{ color: '#94a3b8' }}>Allocating local rescue teams</span> },
                            { title: <span style={{ color: 'white' }}>Communications</span>, description: <span style={{ color: '#94a3b8' }}>Simulating real-time field reports</span> },
                        ]}
                    />

                    {simResult && simResult.success && simResult.crisis_room_id && (
                        <Result
                            status="success"
                            title={<span style={{ color: 'white' }}>Scenario Deployed!</span>}
                            subTitle={<span style={{ color: '#94a3b8' }}>Radar is detecting the impact.</span>}
                            extra={[
                                <Button
                                    type="primary"
                                    key="console"
                                    onClick={() => {
                                        setSimDrawerOpen(false);
                                        navigate(`/crisis-room/${simResult.crisis_room_id}`);
                                    }}
                                    style={{ background: '#10b981', borderColor: '#10b981' }}
                                >
                                    Jump to Crisis Room <RightOutlined />
                                </Button>
                            ]}
                            style={{ padding: '24px 0 0', marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    )}
                </Drawer>
            </Content>
        </Layout>
    );
}
