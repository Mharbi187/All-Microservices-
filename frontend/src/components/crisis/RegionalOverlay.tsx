import { Card, Statistic, Tag, Space, Typography, Divider } from 'antd';
import { WarningOutlined, CheckCircleOutlined, BellOutlined } from '@ant-design/icons';
import type { WilayaData } from '@/types';

const { Text, Title } = Typography;

interface RegionalOverlayProps {
    wilayaName: string;
    info: WilayaData;
}

export default function RegionalOverlay({ wilayaName, info }: RegionalOverlayProps) {
    const getRiskTag = () => {
        if (info.is_high_risk) {
            if (info.risk_score > 0.85) {
                return <Tag icon={<WarningOutlined />} color="error" style={{ fontSize: 13, padding: '4px 10px' }}>CRITICAL</Tag>;
            }
            return <Tag icon={<BellOutlined />} color="warning" style={{ fontSize: 13, padding: '4px 10px' }}>WARNING</Tag>;
        }
        return <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 13, padding: '4px 10px' }}>NORMAL</Tag>;
    };

    return (
        <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, zIndex: 1000 }}>
            <Card
                style={{
                    background: 'rgba(30, 41, 59, 0.92)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid #334155',
                    borderRadius: 12,
                    overflowX: 'auto'
                }}
                styles={{ body: { padding: '16px 24px', minWidth: 'min-content' } }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'nowrap' }}>
                    {/* Wilaya Name */}
                    <div style={{ minWidth: '150px' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 13, whiteSpace: 'nowrap' }}>Selected Wilaya</Text>
                        <Title level={4} style={{ color: '#fff', margin: 0, whiteSpace: 'nowrap' }}>{wilayaName}</Title>
                        <Space size={4} style={{ marginTop: 4, flexWrap: 'nowrap' }}>
                            {info.data_sources?.map(src => (
                                <Tag key={src} color="processing" style={{ fontSize: 9 }}>{src}</Tag>
                            ))}
                        </Space>
                    </div>

                    <Divider type="vertical" style={{ height: 50, borderColor: '#334155' }} />

                    {/* Weather Metrics */}
                    <Space size={24} wrap={false} style={{ minWidth: 'max-content' }}>
                        <Statistic
                            title={<Text style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>🌡️ Temp</Text>}
                            value={info.weather?.temperature ?? 0}
                            suffix="°C"
                            valueStyle={{ color: '#fff', fontSize: 18, whiteSpace: 'nowrap' }}
                        />
                        <Statistic
                            title={<Text style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>💨 Wind</Text>}
                            value={info.weather?.wind_speed ?? 0}
                            suffix="km/h"
                            valueStyle={{ color: '#fff', fontSize: 18, whiteSpace: 'nowrap' }}
                        />
                        <Statistic
                            title={<Text style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>💧 Humidity</Text>}
                            value={info.weather?.humidity ?? 0}
                            suffix="%"
                            valueStyle={{ color: '#fff', fontSize: 18, whiteSpace: 'nowrap' }}
                        />
                    </Space>

                    <Divider type="vertical" style={{ height: 50, borderColor: '#334155' }} />

                    {/* Satellite Metrics */}
                    <Space size={24} wrap={false} style={{ minWidth: 'max-content' }}>
                        <Statistic
                            title={<Text style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>🔥 Fires</Text>}
                            value={info.satellite?.fire_count ?? 0}
                            valueStyle={{ color: (info.satellite?.fire_count ?? 0) > 0 ? '#ef4444' : '#4ade80', fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap' }}
                        />
                        <Statistic
                            title={<Text style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>🌊 Flood</Text>}
                            value={info.satellite?.flood_area_km2 ?? 0}
                            suffix="km²"
                            precision={1}
                            valueStyle={{ color: (info.satellite?.flood_area_km2 ?? 0) > 1 ? '#3b82f6' : '#4ade80', fontSize: 18, whiteSpace: 'nowrap' }}
                        />
                        <Statistic
                            title={<Text style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>🌧️ Rain 7d</Text>}
                            value={info.satellite?.precipitation_7d_mm ?? 0}
                            suffix="mm"
                            precision={1}
                            valueStyle={{ color: '#fff', fontSize: 18, whiteSpace: 'nowrap' }}
                        />
                    </Space>

                    <Divider type="vertical" style={{ height: 50, borderColor: '#334155' }} />

                    {/* Risk Assessment */}
                    <div style={{ textAlign: 'right', minWidth: '160px' }}>
                        <Text style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>ML Risk ({info.confidence_pct}% conf)</Text>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 4, flexWrap: 'nowrap' }}>
                            {getRiskTag()}
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>{info.risk_score.toFixed(3)}</Text>
                        </div>
                        {info.disaster_type !== 'NONE' && (
                            <Tag color="volcano" style={{ marginTop: 4, fontSize: 10, whiteSpace: 'nowrap' }}>{info.disaster_type}</Tag>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
