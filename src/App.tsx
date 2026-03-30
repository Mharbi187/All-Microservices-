import { useMemo } from 'react';
import { Layout, Typography, Badge, ConfigProvider, theme, Row, Col } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import RadarMap from './components/RadarMap';
import RegionalOverlay from './components/RegionalOverlay';
import KpiCards from './components/KpiCards';
import AlertFeed from './components/AlertFeed';
import RiskBarChart from './components/RiskBarChart';
import RiskDistribution from './components/RiskDistribution';
import RegionalTable from './components/RegionalTable';
import { useRadar } from './hooks/useRadar';
import { useCommandCenter } from './stores/commandCenterStore';

const { Content } = Layout;
const { Text } = Typography;

const queryClient = new QueryClient();

function CommandCenter() {
  const { data, isConnected } = useRadar();
  const { role, selectedWilaya, setSelectedWilaya } = useCommandCenter();

  const wilayatNames = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.wilayats).sort();
  }, [data]);

  const handleWilayaClick = (name: string) => {
    if (role === 'NATIONAL') return;
    setSelectedWilaya(name);
  };

  const handleTableSelect = (name: string) => {
    setSelectedWilaya(name);
  };

  const selectedInfo = selectedWilaya && data?.wilayats[selectedWilaya] ? data.wilayats[selectedWilaya] : null;

  return (
    <Layout style={{ height: '100vh' }}>
      <Sidebar wilayatNames={wilayatNames} isConnected={isConnected} />

      <Content style={{ background: '#0a0f1c', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div style={{
          height: 48, background: '#0f172a', borderBottom: '1px solid #1e293b',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0 20px', flexShrink: 0,
        }}>
          <Text strong style={{ color: '#fff', fontSize: 15 }}>
            {role === 'NATIONAL' ? '🛰️ National Disaster Monitoring System' : selectedWilaya ? `📍 ${selectedWilaya} — Regional Command` : '📍 Regional Command'}
          </Text>
          <Badge
            status={isConnected ? 'success' : 'error'}
            text={
              <Text style={{ color: isConnected ? '#4ade80' : '#f87171', fontSize: 12, fontWeight: 600 }}>
                {isConnected ? 'TELEMETRY ONLINE' : 'TELEMETRY OFFLINE'}
              </Text>
            }
          />
        </div>

        {/* KPI Row */}
        <div style={{ padding: '10px 16px 6px', flexShrink: 0 }}>
          <KpiCards data={data} />
        </div>

        {/* Main Content — Map + Analytics Panel */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 16px 12px', gap: 12 }}>
          {/* Left: Map (60%) */}
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

          {/* Right: Analytics Panel (40%) */}
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
                <RegionalTable data={data} onSelect={handleTableSelect} />
              </Col>
            </Row>
          </div>
        </div>
      </Content>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#ef4444',
          borderRadius: 8,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          colorBgContainer: '#1e293b',
          colorBgElevated: '#1e293b',
          colorBorder: '#334155',
          colorText: '#e2e8f0',
          colorTextSecondary: '#94a3b8',
        },
        components: {
          Table: {
            headerBg: '#0f172a',
            headerColor: '#94a3b8',
            rowHoverBg: '#334155',
            borderColor: '#1e293b',
          },
          Card: {
            headerBg: 'transparent',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkItemColor: '#94a3b8',
            darkItemSelectedBg: 'rgba(239,68,68,0.1)',
            darkItemSelectedColor: '#ef4444',
          },
          Timeline: {
            dotBg: 'transparent',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <CommandCenter />
      </QueryClientProvider>
    </ConfigProvider>
  );
}
