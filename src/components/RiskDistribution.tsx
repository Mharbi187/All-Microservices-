import { useMemo } from 'react';
import { Card, Typography, Space } from 'antd';
import { PieChartOutlined } from '@ant-design/icons';
import type { RadarResponse } from '../types';

const { Text } = Typography;

interface RiskDistributionProps {
    data: RadarResponse | null;
}

export default function RiskDistribution({ data }: RiskDistributionProps) {
    const distribution = useMemo(() => {
        if (!data?.wilayats) return { critical: 0, high: 0, moderate: 0, low: 0, total: 0 };
        const entries = Object.values(data.wilayats);
        const total = entries.length;
        const critical = entries.filter(w => w.risk_score > 0.85).length;
        const high = entries.filter(w => w.risk_score > 0.7 && w.risk_score <= 0.85).length;
        const moderate = entries.filter(w => w.risk_score > 0.4 && w.risk_score <= 0.7).length;
        const low = entries.filter(w => w.risk_score <= 0.4).length;
        return { critical, high, moderate, low, total };
    }, [data]);

    const segments = [
        { label: 'Critical', count: distribution.critical, color: '#ef4444', icon: '🔴' },
        { label: 'High', count: distribution.high, color: '#f59e0b', icon: '🟠' },
        { label: 'Moderate', count: distribution.moderate, color: '#eab308', icon: '🟡' },
        { label: 'Low', count: distribution.low, color: '#22c55e', icon: '🟢' },
    ];

    const total = distribution.total || 1;

    return (
        <Card
            title={
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                    <PieChartOutlined style={{ color: '#a855f7', marginRight: 8 }} />
                    Risk Distribution
                </span>
            }
            style={{
                background: 'rgba(30,41,59,0.85)',
                border: '1px solid #334155',
                borderRadius: 10,
            }}
            styles={{ body: { padding: '16px' } }}
        >
            {/* Visual donut ring (pure CSS) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 120, height: 120 }}>
                    <svg viewBox="0 0 36 36" style={{ width: 120, height: 120, transform: 'rotate(-90deg)' }}>
                        {(() => {
                            let offset = 0;
                            return segments.map((seg) => {
                                const pct = (seg.count / total) * 100;
                                const dash = `${pct} ${100 - pct}`;
                                const el = (
                                    <circle
                                        key={seg.label}
                                        cx="18" cy="18" r="15.915"
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth="3"
                                        strokeDasharray={dash}
                                        strokeDashoffset={-offset}
                                        strokeLinecap="round"
                                        style={{ transition: 'all 0.8s ease' }}
                                    />
                                );
                                offset += pct;
                                return el;
                            });
                        })()}
                    </svg>
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                    }}>
                        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{distribution.total}</div>
                        <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase' }}>Regions</div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {segments.map((seg) => (
                    <div key={seg.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={6}>
                            <span>{seg.icon}</span>
                            <Text style={{ color: '#cbd5e1', fontSize: 12 }}>{seg.label}</Text>
                        </Space>
                        <Space size={8}>
                            <Text strong style={{ color: '#e2e8f0', fontSize: 13 }}>{seg.count}</Text>
                            <Text style={{ color: '#64748b', fontSize: 11 }}>({Math.round((seg.count / total) * 100)}%)</Text>
                        </Space>
                    </div>
                ))}
            </div>
        </Card>
    );
}
