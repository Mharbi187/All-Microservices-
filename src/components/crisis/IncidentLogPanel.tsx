import { useMemo, useState } from 'react';
import { Button, Card, Segmented, Space, Table, Tag, Typography } from 'antd';
import type { RadarResponse } from '@/types';

const { Text } = Typography;

interface IncidentLogPanelProps {
    data: RadarResponse | null;
    onFocusWilaya: (wilaya: string) => void;
    onCreateRoom: (wilaya: string) => void;
}

type FilterMode = 'critical' | 'high' | 'all';

function statusTag(status?: 'online' | 'offline' | 'degraded') {
    if (status === 'online') return <Tag color="success">ONLINE</Tag>;
    if (status === 'degraded') return <Tag color="warning">DEGRADED</Tag>;
    return <Tag color="error">OFFLINE</Tag>;
}

export default function IncidentLogPanel({ data, onFocusWilaya, onCreateRoom }: IncidentLogPanelProps) {
    const [mode, setMode] = useState<FilterMode>('all');

    const rows = useMemo(() => {
        if (!data?.wilayats) return [];

        const mapped = Object.entries(data.wilayats)
            .map(([wilaya, payload]) => ({
                key: wilaya,
                wilaya,
                risk: payload.risk_score,
                confidence: payload.confidence_pct,
                type: payload.disaster_type,
                high: payload.is_high_risk,
                critical: payload.risk_score > 0.85,
                rain7d: payload.satellite?.precipitation_7d_mm ?? 0,
                flood: payload.satellite?.flood_area_km2 ?? 0,
                sourceHealth: (payload.source_health?.status ?? 'offline') as 'online' | 'offline' | 'degraded',
                precipSource: payload.source_health?.precipitation_source ?? 'missing',
            }))
            .sort((a, b) => b.risk - a.risk);

        if (mode === 'critical') return mapped.filter((row) => row.critical);
        if (mode === 'high') return mapped.filter((row) => row.high);
        return mapped;
    }, [data, mode]);

    const columns = [
        {
            title: 'Wilaya',
            dataIndex: 'wilaya',
            key: 'wilaya',
            render: (wilaya: string) => (
                <Button type="link" onClick={() => onFocusWilaya(wilaya)} style={{ paddingInline: 0 }}>
                    {wilaya}
                </Button>
            ),
        },
        {
            title: 'Risk',
            dataIndex: 'risk',
            key: 'risk',
            render: (risk: number, record: { confidence: number }) => (
                <Space size={8}>
                    <Text style={{ color: risk > 0.85 ? '#ef4444' : risk > 0.7 ? '#f59e0b' : '#e2e8f0', fontWeight: 700 }}>
                        {risk.toFixed(3)}
                    </Text>
                    <Text type="secondary">({record.confidence.toFixed(1)}%)</Text>
                </Space>
            ),
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type: string) => <Tag color={type === 'FLOOD' ? 'blue' : type === 'FIRE' ? 'volcano' : 'gold'}>{type}</Tag>,
        },
        {
            title: 'Flood km²',
            dataIndex: 'flood',
            key: 'flood',
            render: (flood: number) => <Text>{Number(flood).toFixed(1)}</Text>,
        },
        {
            title: 'Rain 7d',
            dataIndex: 'rain7d',
            key: 'rain7d',
            render: (rain: number) => <Text>{Number(rain).toFixed(1)} mm</Text>,
        },
        {
            title: 'Sources',
            key: 'sources',
            render: (_: unknown, record: { sourceHealth: 'online' | 'offline' | 'degraded'; precipSource: string }) => (
                <Space size={6}>
                    {statusTag(record.sourceHealth)}
                    <Tag>{record.precipSource}</Tag>
                </Space>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: { wilaya: string }) => (
                <Button type="primary" danger size="small" onClick={() => onCreateRoom(record.wilaya)}>
                    Activate Room
                </Button>
            ),
        },
    ];

    return (
        <Card
            title="Incident Command Log"
            extra={
                <Segmented
                    value={mode}
                    onChange={(value) => setMode(value as FilterMode)}
                    options={[
                        { label: 'High+', value: 'high' },
                        { label: 'Critical', value: 'critical' },
                        { label: 'All', value: 'all' },
                    ]}
                />
            }
            style={{ height: '100%', background: 'rgba(30,41,59,0.85)', border: '1px solid #334155' }}
            styles={{ body: { paddingTop: 8 } }}
        >
            <Table
                rowKey="key"
                size="small"
                pagination={{ pageSize: 8 }}
                dataSource={rows}
                columns={columns}
                locale={{ emptyText: 'No incidents for selected filter.' }}
            />
        </Card>
    );
}
