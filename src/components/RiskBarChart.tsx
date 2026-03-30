import { useMemo } from 'react';
import { Card, Typography } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';
import type { RadarResponse } from '../types';

const { Text } = Typography;

interface RiskBarChartProps {
    data: RadarResponse | null;
}

export default function RiskBarChart({ data }: RiskBarChartProps) {
    const regions = useMemo(() => {
        if (!data?.wilayats) return [];
        return Object.entries(data.wilayats)
            .map(([name, info]) => ({
                name: name.length > 10 ? name.slice(0, 9) + '…' : name,
                fullName: name,
                score: info.risk_score,
                isHigh: info.is_high_risk,
                isCritical: info.risk_score > 0.85,
            }))
            .sort((a, b) => b.score - a.score);
    }, [data]);

    const maxScore = Math.max(...regions.map(r => r.score), 0.5);

    return (
        <Card
            title={
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                    <BarChartOutlined style={{ color: '#3b82f6', marginRight: 8 }} />
                    Regional Risk Comparison
                </span>
            }
            style={{
                background: 'rgba(30,41,59,0.85)',
                border: '1px solid #334155',
                borderRadius: 10,
                height: '100%',
            }}
            styles={{ body: { padding: '8px 16px', maxHeight: 320, overflowY: 'auto' } }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {regions.map((region) => {
                    const width = (region.score / maxScore) * 100;
                    const color = region.isCritical ? '#ef4444' : region.isHigh ? '#f59e0b' : '#3b82f6';

                    return (
                        <div key={region.fullName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Text style={{ color: '#94a3b8', fontSize: 11, width: 75, textAlign: 'right', flexShrink: 0 }} title={region.fullName}>
                                {region.name}
                            </Text>
                            <div style={{ flex: 1, background: '#1e293b', borderRadius: 4, height: 14, overflow: 'hidden' }}>
                                <div
                                    style={{
                                        width: `${width}%`,
                                        height: '100%',
                                        background: `linear-gradient(90deg, ${color}88, ${color})`,
                                        borderRadius: 4,
                                        transition: 'width 0.6s ease',
                                        minWidth: 2,
                                    }}
                                />
                            </div>
                            <Text style={{ color: '#e2e8f0', fontSize: 11, width: 40, textAlign: 'right', fontFamily: 'monospace', flexShrink: 0 }}>
                                {region.score.toFixed(2)}
                            </Text>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
