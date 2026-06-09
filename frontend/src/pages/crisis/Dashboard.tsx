import { useMemo } from 'react';
import { Layout, Typography, Badge, Row, Col } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/crisis/Sidebar';
import RadarMap from '@/components/crisis/RadarMap';
import RegionalOverlay from '@/components/crisis/RegionalOverlay';
import KpiCards from '@/components/crisis/KpiCards';
import AlertFeed from '@/components/crisis/AlertFeed';
import RiskBarChart from '@/components/crisis/RiskBarChart';
import RiskDistribution from '@/components/crisis/RiskDistribution';
import RegionalTable from '@/components/crisis/RegionalTable';
import RoomCreationModal from '@/components/crisis/RoomCreationModal';
import { useRadar } from '@/hooks/useRadar';
import { useCommandCenter } from '@/stores/commandCenterStore';
import { useState } from 'react';

const { Content } = Layout;
const { Text } = Typography;

export default function Dashboard() {
    const { data, isConnected } = useRadar();
    const { role, selectedWilaya, setSelectedWilaya } = useCommandCenter();
    const navigate = useNavigate();
    const [creationVisible, setCreationVisible] = useState(false);
    const [pendingDisasterId, setPendingDisasterId] = useState('');

    const wilayatNames = useMemo(() => {
        if (!data) return [];
        return Object.keys(data.wilayats).sort();
    }, [data]);

    const handleWilayaClick = (name: string) => {
        if (role === 'NATIONAL') return;
        setSelectedWilaya(name);
    };

    const selectedInfo = selectedWilaya && data?.wilayats[selectedWilaya] ? data.wilayats[selectedWilaya] : null;

    return (
        <Layout style={{ height: '100vh' }}>
            <Sidebar wilayatNames={wilayatNames} isConnected={isConnected} />

            <Content style={{ background: '#0a0f1c', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    height: 48, background: '#0f172a', borderBottom: '1px solid #1e293b',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0 20px', flexShrink: 0,
                }}>
                    <Text strong style={{ color: '#fff', fontSize: 15 }}>
                        {role === 'NATIONAL' ? '🛰️ National Disaster Monitoring System' : selectedWilaya ? `📍 ${selectedWilaya} — Regional Command` : '📍 Regional Command'}
                    </Text>
                    <div style={{ display: 'flex', gap: 16 }}>
                        {selectedWilaya && (selectedInfo as any)?.maxRisk >= 0.0 && (
                            <Badge count={"🔴 CRITICAL EVENT"} style={{ cursor: 'pointer' }} onClick={() => {
                                setPendingDisasterId((selectedInfo as any)?.id || `disaster_${Date.now()}`);
                                setCreationVisible(true);
                            }} />
                        )}
                        <Badge
                            status={isConnected ? 'success' : 'error'}
                            text={
                                <Text style={{ color: isConnected ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600 }}>
                                    {isConnected ? 'TELEMETRY ONLINE' : 'TELEMETRY OFFLINE'}
                                </Text>
                            }
                        />
                    </div>
                </div>

                <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
                    <KpiCards data={data} />
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 16px 12px', gap: 12 }}>
                    <div style={{ flex: 3, position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #334155' }}>
                        <RadarMap
                            data={data}
                            role={role}
                            selectedWilaya={selectedWilaya}
                            onWilayaClick={handleWilayaClick}
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

                <RoomCreationModal
                    visible={creationVisible}
                    disasterId={pendingDisasterId}
                    onCancel={() => setCreationVisible(false)}
                    onSuccess={(roomId: string) => {
                        setCreationVisible(false);
                        navigate(`/crisis-room/${roomId}`);
                    }}
                />
            </Content>
        </Layout>
    );
}
