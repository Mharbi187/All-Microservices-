import { useState, useEffect } from 'react';
import { Card, Table, Typography, Tag, Statistic } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';

const { Text } = Typography;

export default function LogisticsProcurement({ disasterId }: { disasterId: string }) {
    const [data, setData] = useState<{ total_cost_usd: number, procurement_plan: any[] } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        crisisApi.getLogistics(disasterId).then((res: any) => {
            setData(res);
            setLoading(false);
        });
    }, [disasterId]);

    const columns = [
        {
            title: 'Resource',
            dataIndex: 'resource',
            key: 'resource',
            render: (text: string) => <Text style={{ color: '#e2e8f0', textTransform: 'capitalize' }}>{(text || '').replace(/_/g, ' ')}</Text>,
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (val: number, record: any) => <Text strong style={{ color: '#38bdf8' }}>{val} {record.unit}</Text>
        },
        {
            title: 'Est. Cost',
            dataIndex: 'estimated_cost_usd',
            key: 'cost',
            render: (val: number) => <Text style={{ color: '#4ade80' }}>${(val || 0).toLocaleString()}</Text>
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (prio: number) => (
                <Tag color={prio === 1 ? 'purple' : prio === 2 ? 'red' : prio === 3 ? 'orange' : 'blue'}>
                    P{prio}
                </Tag>
            )
        }
    ];

    return (
        <Card
            title={<Text style={{ color: '#fff' }}>📦 Automated Logistics Procurement</Text>}
            style={{ background: '#1e293b', borderColor: '#334155', height: '100%' }}
            bodyStyle={{ padding: '0 0 12px 0' }}
        >
            <div style={{ padding: '16px', background: '#0f172a', borderBottom: '1px solid #334155' }}>
                <Statistic
                    title={<Text style={{ color: '#94a3b8' }}>Total Operation Cost</Text>}
                    value={data?.total_cost_usd || 0}
                    precision={2}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#4ade80' }}
                />
            </div>
            <Table
                dataSource={data?.procurement_plan.map((r, i) => ({ ...r, key: i })) || []}
                columns={columns}
                pagination={{ pageSize: 5 }}
                loading={loading}
                size="small"
            />
        </Card>
    );
}
