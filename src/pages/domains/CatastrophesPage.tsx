// ============================================================
// NEXUS-AID - Catastrophes (Disaster Monitor) Page
// Weather tracking and satellite monitoring hub
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Spin, Typography, Row, Col, Tag, Button, Space } from 'antd';
import {
    GlobalOutlined, CloudOutlined, AlertOutlined,
    ExpandOutlined, ReloadOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores';
import apiClient from '@/services/api';

const { Title, Text } = Typography;

const FALLBACK_HTML = `
<html>
  <body style="margin:0;background:#0f172a;color:#e2e8f0;font-family:Segoe UI,Arial,sans-serif;">
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px;">
      <div>
        <h3 style="margin-bottom:8px;">Disaster monitor unavailable</h3>
        <p style="opacity:.85;">Please verify MS4 API and Gateway connectivity.</p>
      </div>
    </div>
  </body>
</html>
`;

const REFRESH_INTERVAL_MS = 5000;
const DEMO_CRISIS_ROOM_ID = 'crisis_demo_01';

const CatastrophesPage: React.FC = () => {
    const themeMode = useUIStore((s) => s.themeMode);
    const isDark = themeMode === 'dark';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [slowLoading, setSlowLoading] = useState(false);
    const [mapHtml, setMapHtml] = useState<string>(FALLBACK_HTML);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);

    const fetchMonitor = useCallback(async (showLoader = true) => {
        if (showLoader) {
            setLoading(true);
            setSlowLoading(false);
        } else {
            setRefreshing(true);
        }
        setErrorMessage(null);

        try {
            const response = await apiClient.get<string>('/disasters/monitor', {
                responseType: 'text',
                timeout: 15000,
                headers: { Accept: 'text/html' },
            });

            const html = typeof response.data === 'string' && response.data.trim().length > 0
                ? response.data
                : FALLBACK_HTML;

            setMapHtml(html);
            setLastUpdated(new Date().toLocaleTimeString('fr-TN'));
        } catch (error) {
            console.error('Failed to fetch disaster monitor:', error);
            setErrorMessage('Moniteur indisponible. Verifiez la connexion au Gateway/MS4 puis reessayez.');
        } finally {
            if (showLoader) {
                setLoading(false);
            } else {
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchMonitor(true);
        const intervalId = window.setInterval(() => {
            void fetchMonitor(false);
        }, REFRESH_INTERVAL_MS);
        return () => window.clearInterval(intervalId);
    }, [fetchMonitor]);

    useEffect(() => {
        if (!loading) {
            setSlowLoading(false);
            return;
        }
        const timer = setTimeout(() => setSlowLoading(true), 8000);
        return () => clearTimeout(timer);
    }, [loading]);

    const openCommandCenter = useCallback(() => {
        navigate('/radar/fullscreen');
    }, [navigate]);

    const openCrisisRoom = useCallback(() => {
        navigate(`/crisis-room/${DEMO_CRISIS_ROOM_ID}/fullscreen`);
    }, [navigate]);

    const glassStyle = {
        background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: 32,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 24px 80px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        height: 'calc(100vh - 120px)',
    };

    return (
        <div style={{ padding: '0 40px 40px 40px', maxWidth: 1600, margin: '0 auto' }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
            >
                <div style={glassStyle}>
                    <Row gutter={0} style={{ height: '100%' }}>
                        <Col
                            xs={24}
                            lg={7}
                            style={{
                                borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
                                background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.5)',
                                padding: '40px 32px',
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 40 }}>
                                    <div
                                        style={{
                                            width: 60,
                                            height: 60,
                                            borderRadius: 20,
                                            background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 28,
                                            boxShadow: '0 12px 24px rgba(224,28,46,0.25)',
                                            color: '#fff',
                                        }}
                                    >
                                        <AlertOutlined />
                                    </div>
                                    <div>
                                        <Title level={3} style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>
                                            Catastrophes
                                        </Title>
                                        <Tag
                                            color={loading ? 'processing' : errorMessage ? 'error' : 'success'}
                                            icon={<GlobalOutlined />}
                                            style={{ borderRadius: 6, margin: '4px 0 0 0', fontWeight: 700, fontSize: 11 }}
                                        >
                                            {loading
                                                ? 'CAPTEURS INIT'
                                                : refreshing
                                                    ? 'CAPTEURS SYNC'
                                                    : errorMessage
                                                        ? 'MONITEUR DEGRADED'
                                                        : 'MONITEUR LIVE'}
                                        </Tag>
                                        {lastUpdated && (
                                            <div style={{ marginTop: 6 }}>
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    Derniere MAJ: {lastUpdated}
                                                </Text>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Space direction="vertical" style={{ width: '100%' }} size={24}>
                                    <div
                                        style={{
                                            padding: 24,
                                            borderRadius: 24,
                                            background: isDark ? 'rgba(224,28,46,0.04)' : '#fff',
                                            border: `1px solid ${isDark ? 'rgba(224,28,46,0.1)' : 'rgba(0,0,0,0.05)'}`,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <GlobalOutlined style={{ color: '#e01c2e', fontSize: 20 }} />
                                            <Text strong>Surveillance Globale</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                            Donnees en temps reel provenant des capteurs environnementaux et d'alertes MS4.
                                        </Text>
                                    </div>

                                    <div
                                        style={{
                                            padding: 24,
                                            borderRadius: 24,
                                            background: isDark ? 'rgba(31,31,31,0.5)' : '#fff',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                            <AlertOutlined style={{ color: '#e01c2e', fontSize: 20 }} />
                                            <Text strong>Alertes Precoces</Text>
                                        </div>
                                        <Text type="secondary" style={{ fontSize: 13 }}>
                                            Detection automatique des anomalies climatiques, inondations et risques.
                                        </Text>
                                    </div>
                                </Space>
                            </div>

                            <div style={{ marginTop: 'auto' }}>
                                <Button
                                    type="primary"
                                    block
                                    loading={loading}
                                    icon={<ReloadOutlined />}
                                    onClick={() => void fetchMonitor(true)}
                                    style={{
                                        height: 52,
                                        borderRadius: 16,
                                        background: 'linear-gradient(135deg, #e01c2e, #c0152a)',
                                        border: 'none',
                                        fontWeight: 700,
                                        boxShadow: '0 8px 20px rgba(224,28,46,0.2)',
                                    }}
                                >
                                    Rafraichir le Flux
                                </Button>
                            </div>
                        </Col>

                        <Col xs={24} lg={17} style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 8 }}>
                                <Button
                                    shape="circle"
                                    icon={<ExpandOutlined />}
                                    onClick={openCommandCenter}
                                    title="Ouvrir le command center complet"
                                    style={{ background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', border: 'none' }}
                                />
                                <Button
                                    shape="circle"
                                    icon={<InfoCircleOutlined />}
                                    onClick={openCrisisRoom}
                                    title="Ouvrir la crisis room"
                                    style={{ background: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)', border: 'none' }}
                                />
                            </div>

                            {errorMessage && (
                                <div style={{ position: 'absolute', top: 20, left: 20, right: 100, zIndex: 12 }}>
                                    <Alert
                                        type="warning"
                                        showIcon
                                        message={errorMessage}
                                        style={{ borderRadius: 10 }}
                                    />
                                </div>
                            )}

                            {loading && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isDark ? '#0f172a' : '#f8fafc',
                                        zIndex: 5,
                                    }}
                                >
                                    <Spin size="large" />
                                    <Text type="secondary" style={{ marginTop: 16, fontWeight: 600 }}>
                                        Initialisation du moniteur satellite...
                                    </Text>
                                    {slowLoading && (
                                        <Text type="secondary" style={{ marginTop: 6 }}>
                                            Connexion GEE plus lente que prevu. Le tableau va continuer des reception des donnees.
                                        </Text>
                                    )}
                                </div>
                            )}

                            <iframe
                                srcDoc={mapHtml}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    filter: isDark ? 'brightness(0.8) contrast(1.2)' : 'none',
                                }}
                                title="Nexus-AID Disaster Monitor"
                            />
                        </Col>
                    </Row>
                </div>
            </motion.div>
        </div>
    );
};

export default CatastrophesPage;
