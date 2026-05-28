import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Typography, Badge, Button, Alert, Space, Tag, message, Select, Drawer, Steps, Result } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FullscreenExitOutlined, FullscreenOutlined, ReloadOutlined,
    ThunderboltOutlined, ClearOutlined, ExperimentOutlined, RightOutlined,
    ClockCircleOutlined,
} from '@ant-design/icons';
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
import { useUIStore } from '@/stores';
import { crisisApi } from '@/services/crisisApi';
import { makeRadarTheme, rp, rr, rfont, injectRadarStyles } from '@/components/crisis/radarTheme';
import type { SimulationScenario, FullSimulationResult } from '@/services/crisisApi';

// Inject styles once
injectRadarStyles();

const { Content } = Layout;
const { Text, Paragraph } = Typography;

const DEFAULT_TARGET = { lat: 36.8065, lon: 10.1815, label: 'Tunis (cible commande par défaut)' };

export default function Dashboard() {
    const { data, isConnected, isLive, daemonStatus } = useRadar();
    const { role, panel, selectedWilaya, setSelectedWilaya, setPanel } = useCommandCenter();
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

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
        return Object.values(data.wilayats).filter(item => item.is_high_risk).length;
    }, [data]);

    const selectedInfo = selectedWilaya && data?.wilayats[selectedWilaya] ? data.wilayats[selectedWilaya] : null;
    const selectedHighRisk = Boolean(selectedInfo && selectedInfo.risk_score >= 0.7);

    const selectedTarget = useMemo(() => {
        if (selectedInfo?.coordinates) {
            return {
                lat: selectedInfo.coordinates.lat,
                lon: selectedInfo.coordinates.lon,
                label: `${selectedWilaya ?? 'Wilaya sélectionnée'}`,
            };
        }
        if (data?.wilayats) {
            const highest = Object.entries(data.wilayats).sort(([, a], [, b]) => b.risk_score - a.risk_score)[0];
            if (highest?.[1]?.coordinates) {
                return {
                    lat: highest[1].coordinates.lat,
                    lon: highest[1].coordinates.lon,
                    label: `${highest[0]} (risque le plus élevé)`,
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
        const interval = window.setInterval(() => void refreshResponderCount(), 20000);
        return () => window.clearInterval(interval);
    }, [refreshResponderCount]);

    // ── Simulation State ──────────────────────────────────────
    const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
    const [selectedScenario, setSelectedScenario] = useState('wildfire_jendouba');
    const [simDrawerOpen, setSimDrawerOpen] = useState(false);
    const [simRunning, setSimRunning] = useState(false);
    const [simResult, setSimResult] = useState<FullSimulationResult | null>(null);
    const [simCurrentPhase, setSimCurrentPhase] = useState(-1);

    useEffect(() => {
        crisisApi.getScenarios().then(res => {
            setScenarios(res.scenarios || []);
        }).catch(() => {
            setScenarios([
                { id: 'wildfire_jendouba', name: 'Incendie : Jendouba / Tabarka', description: 'Feu de forêt critique au Nord-Ouest', disaster_count: 3, high_risk_count: 2 },
                { id: 'flood_nabeul', name: 'Inondations : Nabeul / Sousse', description: 'Inondations éclair sur la côte', disaster_count: 3, high_risk_count: 2 },
                { id: 'earthquake_kasserine', name: 'Séisme : Kasserine', description: 'Séisme M5.2', disaster_count: 3, high_risk_count: 2 },
                { id: 'multi_crisis', name: 'Crise Multi-Régionale', description: 'Incendie + Inondations simultanés', disaster_count: 4, high_risk_count: 2 },
            ]);
        });
    }, []);

    const handleRunSimulation = async () => {
        setSimRunning(true);
        setSimResult(null);
        setSimCurrentPhase(0);
        try {
            const phaseCount = 4;
            for (let i = 0; i < phaseCount; i++) {
                setSimCurrentPhase(i);
                await new Promise(r => setTimeout(r, 600));
            }
            const result = await crisisApi.triggerFullSimulation(selectedScenario);
            setSimResult(result);
            setSimCurrentPhase(4);
            if (result.success) {
                message.success({ content: `Scénario "${result.scenario_name}" déployé !`, duration: 5 });
            } else {
                message.warning({ content: 'Simulation partiellement complète.', duration: 4 });
            }
        } catch {
            message.error({ content: 'Backend simulation inaccessible. Vérifier MS4.', duration: 4 });
        } finally {
            setSimRunning(false);
        }
    };

    const handleResetSimulation = async () => {
        try {
            await crisisApi.resetSimulation();
            setSimResult(null);
            setSimCurrentPhase(-1);
            message.success({ content: 'Cache radar effacé.', duration: 3 });
        } catch {
            message.error({ content: 'Réinitialisation échouée.', duration: 3 });
        }
    };

    // Telemetry color
    const telemetryColor = !isConnected ? rp.red500 : isLive ? rp.grn500 : rp.amb500;
    const telemetryLabel = !isConnected ? 'TÉLÉMÉTRIE HORS LIGNE' : isLive ? 'TÉLÉMÉTRIE EN DIRECT' : `TÉLÉMÉTRIE ${daemonStatus.toUpperCase()}`;

    const panelTitle = panel === 'radar'
        ? role === 'NATIONAL'
            ? 'Système National de Surveillance des Catastrophes'
            : selectedWilaya
                ? `${selectedWilaya} — Commandement Régional`
                : 'Commandement Régional'
        : panel === 'incidents'
            ? 'Journal de Commandement des Incidents'
            : 'Coordination des Intervenants';

    const activeScenarioObj = scenarios.find(s => s.id === selectedScenario);

    const lastUpdateStr = data?.timestamp
        ? `Mise à jour: ${new Date(data.timestamp).toLocaleString('fr-TN')}`
        : 'En attente de données...';

    return (
        <Layout style={{ height: '100vh', background: t.pageBg }}>
            <Sidebar
                wilayatNames={wilayatNames}
                isConnected={isConnected}
                incidentCount={incidentCount}
                responderCount={responderCount}
            />

            <Content style={{
                background: 'transparent',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
            }}>
                {/* ── Topbar ── */}
                <div style={{
                    minHeight: 56,
                    background: t.topbarBg,
                    borderBottom: `1px solid ${t.topbarBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 20px',
                    flexShrink: 0,
                    gap: 12,
                    boxShadow: isDark
                        ? '0 2px 16px rgba(0,0,0,0.25)'
                        : '0 2px 10px rgba(0,0,0,0.05)',
                }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <Text strong style={{
                            fontFamily: rfont.body, fontSize: 14, fontWeight: 700,
                            color: t.text, display: 'block',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                            {panelTitle}
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="rd-topbar-center">
                            <ClockCircleOutlined style={{ color: t.textFaint, fontSize: 11 }} />
                            <Text style={{ fontFamily: rfont.data, fontSize: 11, color: t.textFaint }}>
                                {lastUpdateStr}
                            </Text>
                        </div>
                    </div>

                    <Space size={10} wrap>
                        {/* Simulation Button */}
                        <Button
                            className="rd-sim-btn"
                            icon={<ThunderboltOutlined />}
                            style={{
                                background: `linear-gradient(90deg, ${rp.vio600}, #4f46e5)`,
                                color: 'white', borderColor: 'transparent',
                                fontWeight: 700, borderRadius: rr.sm,
                                boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                            }}
                            onClick={() => setSimDrawerOpen(true)}
                        >
                            <span>SIMULATION</span>
                        </Button>

                        {/* Crisis room activation */}
                        {selectedHighRisk && selectedWilaya && (
                            <Button
                                danger type="primary"
                                style={{ borderRadius: rr.sm, fontWeight: 700 }}
                                onClick={() => openRoomCreation(selectedWilaya)}
                            >
                                Activer Salle de Crise
                            </Button>
                        )}

                        {/* Refresh */}
                        <Button
                            onClick={() => void refreshResponderCount()}
                            icon={<ReloadOutlined />}
                            style={{
                                borderRadius: rr.sm,
                                background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                color: t.text,
                            }}
                        />

                        {/* Telemetry badge */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: isDark ? `${telemetryColor}10` : `${telemetryColor}10`,
                            border: `1px solid ${telemetryColor}25`,
                            borderRadius: rr.pill, padding: '4px 12px',
                        }}>
                            <div
                                className={isConnected ? 'rd-pulse-live' : ''}
                                style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: telemetryColor,
                                }}
                            />
                            <Text style={{ fontFamily: rfont.data, fontSize: 11, fontWeight: 700, color: telemetryColor }}>
                                {telemetryLabel}
                            </Text>
                        </div>

                        {/* CHIRPS lag tag */}
                        {data?.data_sources?.chirps_lag_days != null && (
                            <Tag
                                style={{
                                    background: Number(data.data_sources.chirps_lag_days) > 7
                                        ? isDark ? `${rp.amb500}18` : rp.amb100
                                        : isDark ? `${rp.grn500}12` : rp.grn100,
                                    color: Number(data.data_sources.chirps_lag_days) > 7 ? rp.amb500 : rp.grn500,
                                    border: `1px solid ${Number(data.data_sources.chirps_lag_days) > 7 ? rp.amb500 : rp.grn500}25`,
                                    borderRadius: rr.pill,
                                    fontFamily: rfont.data, fontSize: 11,
                                }}
                            >
                                CHIRPS retard {data.data_sources.chirps_lag_days}j
                            </Tag>
                        )}

                        {/* Fullscreen */}
                        <Button
                            size="small"
                            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                            onClick={() => navigate(isFullscreen ? '/radar' : '/radar/fullscreen')}
                            style={{
                                borderRadius: rr.sm,
                                background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                color: t.text,
                            }}
                        >
                            {isFullscreen ? 'Réduire' : 'Plein écran'}
                        </Button>
                    </Space>
                </div>

                {/* ── Telemetry stale alert ── */}
                {daemonStatus !== 'running' && panel === 'radar' && (
                    <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
                        <Alert
                            type="warning"
                            showIcon
                            style={{
                                background: t.alertWarningBg,
                                border: `1px solid ${t.alertWarningBorder}`,
                                borderRadius: rr.sm,
                            }}
                            message={
                                <Text style={{ fontFamily: rfont.body, fontSize: 13, color: t.alertWarningText }}>
                                    La télémétrie radar est <strong>{daemonStatus.toUpperCase()}</strong>. L'analyse en direct peut être retardée pendant la récupération des sources.
                                </Text>
                            }
                        />
                    </div>
                )}

                {/* ── RADAR PANEL ── */}
                {panel === 'radar' && (
                    <>
                        {/* KPI row */}
                        <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
                            <KpiCards data={data} />
                        </div>

                        {/* Main content: Map + Right panel */}
                        <div
                            className="rd-main-grid"
                            style={{
                                flex: 1, display: 'flex', overflow: 'hidden',
                                padding: '0 16px 12px', gap: 12,
                                minHeight: 0,
                            }}
                        >
                            {/* Map column */}
                            <div
                                className="rd-map-col"
                                style={{
                                    flex: 3, position: 'relative',
                                    borderRadius: rr.md, overflow: 'hidden',
                                    border: `1px solid ${t.cardBorder}`,
                                    boxShadow: t.cardShadow,
                                    minHeight: 280,
                                }}
                            >
                                <RadarMap
                                    data={data}
                                    role={role}
                                    selectedWilaya={selectedWilaya}
                                    onWilayaClick={name => setSelectedWilaya(name)}
                                />
                                <AnimatePresence>
                                    {selectedWilaya && selectedInfo && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 30 }}
                                            transition={{ duration: 0.35, ease: 'easeOut' }}
                                        >
                                            <RegionalOverlay wilayaName={selectedWilaya} info={selectedInfo} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Right column */}
                            <div
                                className="rd-right-col"
                                style={{
                                    flex: 2, display: 'flex', flexDirection: 'column',
                                    gap: 12, overflowY: 'auto', minHeight: 0,
                                }}
                            >
                                {/* Alert + Distribution row */}
                                <div style={{ display: 'flex', gap: 12, flexShrink: 0, height: 280 }}>
                                    <div style={{ flex: '0 0 58%' }}>
                                        <AlertFeed data={data} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <RiskDistribution data={data} />
                                    </div>
                                </div>

                                {/* Bar chart + Table row */}
                                <div className="rd-bottom-row" style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <RiskBarChart data={data} />
                                    </div>
                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <RegionalTable data={data} onSelect={setSelectedWilaya} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* ── INCIDENTS PANEL ── */}
                {panel === 'incidents' && (
                    <div style={{ padding: '12px 16px', flex: 1, overflow: 'auto' }}>
                        <IncidentLogPanel
                            data={data}
                            onFocusWilaya={wilaya => { setSelectedWilaya(wilaya); setPanel('radar'); }}
                            onCreateRoom={openRoomCreation}
                        />
                    </div>
                )}

                {/* ── RESPONDERS PANEL ── */}
                {panel === 'responders' && (
                    <div style={{ padding: '12px 16px', flex: 1, overflow: 'auto' }}>
                        <RespondersPanel
                            targetLat={selectedTarget.lat}
                            targetLon={selectedTarget.lon}
                            targetLabel={selectedTarget.label}
                        />
                    </div>
                )}

                {/* ── Room Creation Modal ── */}
                <RoomCreationModal
                    visible={creationVisible}
                    disasterId={pendingDisasterId}
                    initialName={pendingOperationLabel ? `Opération ${pendingOperationLabel}` : undefined}
                    onCancel={() => setCreationVisible(false)}
                    onSuccess={(roomId: string) => {
                        setCreationVisible(false);
                        navigate(`/crisis-room/${roomId}${isFullscreen ? '/fullscreen' : ''}`);
                    }}
                />

                {/* ── SIMULATION DRAWER ── */}
                <Drawer
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: rr.sm,
                                background: `${rp.vio600}20`, border: `1px solid ${rp.vio600}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, color: rp.vio400,
                            }}>
                                <ExperimentOutlined />
                            </div>
                            <span style={{ fontFamily: rfont.body, fontSize: 16, fontWeight: 700, color: t.text }}>
                                Simulation Plateforme
                            </span>
                        </div>
                    }
                    placement="right"
                    width={480}
                    onClose={() => setSimDrawerOpen(false)}
                    open={simDrawerOpen}
                    closable={true}
                    styles={{
                        header: {
                            background: isDark ? rp.d800 : '#FFFFFF',
                            borderBottom: `1px solid ${t.divider}`,
                        },
                        body: {
                            background: isDark ? rp.d700 : rp.mist,
                            padding: 24,
                        },
                    }}
                >
                    <Paragraph style={{ fontFamily: rfont.body, fontSize: 13, color: t.textSub, marginBottom: 24 }}>
                        Transformez la plateforme en mode démo. L'orchestrateur injectera une catastrophe multi-région dans le radar ML, créera automatiquement une Salle de Crise, déploiera des équipes et simulera des rapports de terrain en temps réel.
                    </Paragraph>

                    {/* Scenario select */}
                    <div style={{ marginBottom: 24 }}>
                        <Text strong style={{
                            fontFamily: rfont.body, fontSize: 13,
                            color: t.text, display: 'block', marginBottom: 8,
                        }}>
                            Sélectionner le Scénario
                        </Text>
                        <Select
                            value={selectedScenario}
                            onChange={setSelectedScenario}
                            style={{ width: '100%' }}
                            size="large"
                            disabled={simRunning}
                            className={!isDark ? 'rd-select-light' : ''}
                            options={scenarios.map(s => ({ label: s.name, value: s.id }))}
                        />
                        {activeScenarioObj && (
                            <div style={{
                                background: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
                                border: `1px solid ${t.cardBorder}`,
                                padding: '10px 14px', borderRadius: rr.sm, marginTop: 10,
                            }}>
                                <Text style={{ fontFamily: rfont.body, fontSize: 13, color: t.textSub, display: 'block' }}>
                                    {activeScenarioObj.description}
                                </Text>
                                <Space style={{ marginTop: 8 }}>
                                    <span style={{
                                        background: `${rp.red500}15`, color: rp.red500,
                                        border: `1px solid ${rp.red500}25`,
                                        borderRadius: rr.pill, padding: '1px 8px',
                                        fontSize: 11, fontFamily: rfont.data,
                                    }}>
                                        {activeScenarioObj.high_risk_count} Zones Critiques
                                    </span>
                                    <span style={{
                                        background: `${rp.blu500}15`, color: rp.blu500,
                                        border: `1px solid ${rp.blu500}25`,
                                        borderRadius: rr.pill, padding: '1px 8px',
                                        fontSize: 11, fontFamily: rfont.data,
                                    }}>
                                        {activeScenarioObj.disaster_count} Régions
                                    </span>
                                </Space>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <Space direction="vertical" style={{ width: '100%', marginBottom: 28 }}>
                        <Button
                            type="primary"
                            size="large"
                            block
                            icon={<ThunderboltOutlined />}
                            loading={simRunning}
                            disabled={simRunning && simCurrentPhase < 4}
                            style={{
                                background: `linear-gradient(90deg, ${rp.vio600}, #4f46e5)`,
                                borderColor: rp.vio600, height: 48, fontSize: 15,
                                fontFamily: rfont.body, fontWeight: 700,
                                borderRadius: rr.sm,
                                boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                            }}
                            onClick={handleRunSimulation}
                        >
                            {simResult?.success ? 'REJOUER LE SCÉNARIO' : 'EXÉCUTER LE SCÉNARIO'}
                        </Button>
                        <Button
                            block
                            danger
                            icon={<ClearOutlined />}
                            onClick={handleResetSimulation}
                            disabled={simRunning}
                            style={{ borderRadius: rr.sm, fontFamily: rfont.body }}
                        >
                            Effacer Cache Radar & Réinitialiser
                        </Button>
                    </Space>

                    {/* Pipeline steps */}
                    <Text strong style={{ fontFamily: rfont.body, fontSize: 14, color: t.text, display: 'block', marginBottom: 16 }}>
                        Pipeline d'Exécution
                    </Text>
                    <Steps
                        direction="vertical"
                        size="small"
                        current={simCurrentPhase}
                        status={simResult && !simResult.success ? 'error' : 'process'}
                        items={[
                            {
                                title: <span style={{ fontFamily: rfont.body, color: t.text }}>Injection Radar</span>,
                                description: <span style={{ fontFamily: rfont.body, color: t.textSub, fontSize: 12 }}>Envoi des données ML au cache</span>,
                            },
                            {
                                title: <span style={{ fontFamily: rfont.body, color: t.text }}>Création Salle de Crise</span>,
                                description: <span style={{ fontFamily: rfont.body, color: t.textSub, fontSize: 12 }}>Génération de la salle opérationnelle</span>,
                            },
                            {
                                title: <span style={{ fontFamily: rfont.body, color: t.text }}>Déploiement Équipes</span>,
                                description: <span style={{ fontFamily: rfont.body, color: t.textSub, fontSize: 12 }}>Allocation des équipes de secours</span>,
                            },
                            {
                                title: <span style={{ fontFamily: rfont.body, color: t.text }}>Communications</span>,
                                description: <span style={{ fontFamily: rfont.body, color: t.textSub, fontSize: 12 }}>Simulation des rapports terrain</span>,
                            },
                        ]}
                    />

                    {/* Result */}
                    {simResult && simResult.success && simResult.crisis_room_id && (
                        <Result
                            status="success"
                            title={<span style={{ fontFamily: rfont.body, color: t.text }}>Scénario Déployé !</span>}
                            subTitle={<span style={{ fontFamily: rfont.body, color: t.textSub }}>Le radar détecte l'impact.</span>}
                            extra={[
                                <Button
                                    type="primary"
                                    key="room"
                                    onClick={() => { setSimDrawerOpen(false); navigate(`/crisis-room/${simResult.crisis_room_id}`); }}
                                    style={{
                                        background: rp.grn600, borderColor: rp.grn600,
                                        borderRadius: rr.sm, fontFamily: rfont.body, fontWeight: 700,
                                    }}
                                >
                                    Accéder à la Salle de Crise <RightOutlined />
                                </Button>,
                            ]}
                            style={{ padding: '24px 0 0', marginTop: 12, borderTop: `1px solid ${t.divider}` }}
                        />
                    )}
                </Drawer>
            </Content>
        </Layout>
    );
}
