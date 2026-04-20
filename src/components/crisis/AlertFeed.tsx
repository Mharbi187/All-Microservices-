import { useMemo } from 'react';
import { Card, Timeline, Tag, Typography, Empty } from 'antd';
import { WarningOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RadarResponse } from '@/types';

const { Text } = Typography;

interface AlertFeedProps {
    data: RadarResponse | null;
}

export default function AlertFeed({ data }: AlertFeedProps) {
    const alerts = useMemo(() => {
        if (!data?.wilayats) return [];
        return Object.entries(data.wilayats)
            .filter(([, info]) => info.is_high_risk)
            .sort(([, a], [, b]) => b.risk_score - a.risk_score)
            .map(([name, info]) => ({
                name,
                score: info.risk_score,
                type: info.disaster_type,
                isCritical: info.risk_score > 0.85,
                temp: info.weather?.temperature ?? 0,
                wind: info.weather?.wind_speed ?? 0,
                confidence: info.confidence_pct ?? 0,
            }));
    }, [data]);

    const timestamp = data?.timestamp ? dayjs(data.timestamp).format('HH:mm:ss') : '--:--:--';

    return (
        <Card
            title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                        <WarningOutlined style={{ color: '#ef4444', marginRight: 8 }} />
                        Live Alert Feed
                    </span>
                    <Tag icon={<ClockCircleOutlined />} color="processing" style={{ fontSize: 11 }}>
                        {timestamp}
                    </Tag>
                </div>
            }
            style={{
                background: 'rgba(30,41,59,0.85)',
                border: '1px solid #334155',
                borderRadius: 10,
                height: '100%',
            }}
            styles={{ body: { padding: '12px 16px', maxHeight: 320, overflowY: 'auto' } }}
        >
            {alerts.length === 0 ? (
                <Empty
                    image={<CheckCircleOutlined style={{ fontSize: 48, color: '#22c55e' }} />}
                    description={<Text style={{ color: '#94a3b8' }}>All regions operating normally</Text>}
                    style={{ margin: '40px 0' }}
                />
            ) : (
                <Timeline
                    items={alerts.map((alert) => ({
                        color: alert.isCritical ? 'red' : 'orange',
                        children: (
                            <div style={{ paddingBottom: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text strong style={{ color: '#e2e8f0', fontSize: 13 }}>{alert.name}</Text>
                                    <Tag color={alert.isCritical ? 'error' : 'warning'} style={{ fontSize: 11 }}>
                                        {alert.score.toFixed(3)}
                                    </Tag>
                                </div>
                                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                                    {alert.type} — {alert.temp}°C, {alert.wind} km/h wind
                                </Text>
                            </div>
                        ),
                    }))}
                />
            )}
        </Card>
    );
}
