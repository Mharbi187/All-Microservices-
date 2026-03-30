import { useMemo } from 'react';
import { Card, Typography, Table, Tag, Tooltip } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import type { RadarResponse } from '../types';

const { Text } = Typography;

interface RegionalTableProps {
    data: RadarResponse | null;
    onSelect: (name: string) => void;
}

export default function RegionalTable({ data, onSelect }: RegionalTableProps) {
    const dataSource = useMemo(() => {
        if (!data?.wilayats) return [];
        return Object.entries(data.wilayats)
            .map(([name, info]) => ({
                key: name,
                name,
                risk_score: info.risk_score,
                confidence_pct: info.confidence_pct,
                is_high_risk: info.is_high_risk,
                disaster_type: info.disaster_type,
                temperature: info.weather?.temperature ?? 0,
                wind_speed: info.weather?.wind_speed ?? 0,
                fire_count: info.satellite?.fire_count ?? 0,
                flood_km2: info.satellite?.flood_area_km2 ?? 0,
                magnitude: info.seismic?.max_magnitude ?? 0,
                sources: info.data_sources?.join('+') ?? '',
            }))
            .sort((a, b) => b.risk_score - a.risk_score);
    }, [data]);

    const columns = [
        {
            title: 'Wilaya',
            dataIndex: 'name',
            key: 'name',
            width: 100,
            render: (name: string) => (
                <Text strong style={{ color: '#e2e8f0', cursor: 'pointer', fontSize: 12 }} onClick={() => onSelect(name)}>{name}</Text>
            ),
        },
        {
            title: 'Risk',
            dataIndex: 'risk_score',
            key: 'risk_score',
            width: 60,
            render: (score: number, record: { confidence_pct: number }) => (
                <Tooltip title={`Confidence: ${record.confidence_pct}%`}>
                    <Text style={{ color: score > 0.85 ? '#ef4444' : score > 0.7 ? '#f59e0b' : '#22c55e', fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                        {score.toFixed(2)}
                    </Text>
                </Tooltip>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'is_high_risk',
            key: 'status',
            width: 80,
            render: (isHigh: boolean, record: { disaster_type: string }) => (
                isHigh
                    ? <Tag color="error" style={{ fontSize: 10 }}>{record.disaster_type}</Tag>
                    : <Tag color="success" style={{ fontSize: 10 }}>CLEAR</Tag>
            ),
        },
        {
            title: '°C',
            dataIndex: 'temperature',
            key: 'temperature',
            width: 45,
            render: (v: number) => <Text style={{ color: '#94a3b8', fontSize: 11 }}>{v}</Text>,
        },
        {
            title: '🔥',
            dataIndex: 'fire_count',
            key: 'fire_count',
            width: 35,
            render: (v: number) => <Text style={{ color: v > 0 ? '#ef4444' : '#334155', fontSize: 11, fontWeight: v > 0 ? 700 : 400 }}>{v}</Text>,
        },
        {
            title: '🌊',
            dataIndex: 'flood_km2',
            key: 'flood_km2',
            width: 45,
            render: (v: number) => <Text style={{ color: v > 1 ? '#3b82f6' : '#334155', fontSize: 11 }}>{v > 0 ? v.toFixed(1) : '-'}</Text>,
        },
    ];

    return (
        <Card
            title={
                <span style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                    <UnorderedListOutlined style={{ color: '#06b6d4', marginRight: 8 }} />
                    All Regions ({dataSource.length})
                </span>
            }
            style={{
                background: 'rgba(30,41,59,0.85)',
                border: '1px solid #334155',
                borderRadius: 10,
                height: '100%',
            }}
            styles={{ body: { padding: 0 } }}
        >
            <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                size="small"
                scroll={{ y: 280 }}
                style={{ background: 'transparent' }}
                onRow={(record) => ({
                    onClick: () => onSelect(record.name),
                    style: { cursor: 'pointer' },
                })}
            />
        </Card>
    );
}
