import { useEffect, useState } from 'react';
import { Alert, Card, Statistic, Table, Tag, Typography } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';

const { Text } = Typography;

interface LogisticsResult {
    total_cost_usd: number;
    procurement_plan: Array<{
        resource: string;
        quantity: number;
        unit: string;
        estimated_cost_usd: number;
        priority: number;
    }>;
}

export default function LogisticsProcurement({ disasterId }: { disasterId: string }) {
    const [data, setData] = useState<LogisticsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError(null);

        crisisApi.getLogistics(disasterId)
            .then((res: LogisticsResult) => {
                if (!active) return;
                setData(res);
            })
            .catch((err: unknown) => {
                if (!active) return;
                const message = err instanceof Error ? err.message : 'Unable to fetch logistics plan';
                setError(message);
                setData(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
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
            render: (val: number, record: { unit: string }) => <Text strong style={{ color: '#38bdf8' }}>{val} {record.unit}</Text>,
        },
        {
            title: 'Est. Cost',
            dataIndex: 'estimated_cost_usd',
            key: 'cost',
            render: (val: number) => <Text style={{ color: '#4ade80' }}>${(val || 0).toLocaleString()}</Text>,
        },
        {
            title: 'Priority',
            dataIndex: 'priority',
            key: 'priority',
            render: (prio: number) => (
                <Tag color={prio === 1 ? 'purple' : prio === 2 ? 'red' : prio === 3 ? 'orange' : 'blue'}>
                    P{prio}
                </Tag>
            ),
        },
    ];

    return (
        <>
            <style>{`
                .logistics-table .ant-table {
                    background: #1e293b !important;
                    color: #e2e8f0 !important;
                }
                .logistics-table .ant-table-thead > tr > th {
                    background: #0f172a !important;
                    color: #94a3b8 !important;
                    border-bottom: 1px solid #334155 !important;
                    font-weight: 600;
                }
                .logistics-table .ant-table-tbody > tr > td {
                    background: #1e293b !important;
                    border-bottom: 1px solid #1e3a5f !important;
                    color: #e2e8f0 !important;
                }
                .logistics-table .ant-table-tbody > tr:hover > td {
                    background: #263348 !important;
                }
                .logistics-table .ant-empty-description {
                    color: #64748b !important;
                }
                .logistics-table .ant-table-placeholder {
                    background: #1e293b !important;
                }
                .logistics-table .ant-pagination-item a,
                .logistics-table .ant-pagination-item-active a {
                    color: #e2e8f0 !important;
                }
                .logistics-table .ant-pagination-item-active {
                    border-color: #3b82f6 !important;
                    background: #1e3a5f !important;
                }
                .logistics-table .ant-pagination-prev button,
                .logistics-table .ant-pagination-next button {
                    color: #94a3b8 !important;
                }
            `}</style>
            <Card
                title={<Text style={{ color: '#fff' }}>Automated Logistics Procurement</Text>}
                style={{ background: '#1e293b', borderColor: '#334155', height: '100%' }}
                bodyStyle={{ padding: '0 0 12px 0' }}
            >
                {error && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Logistics feed unavailable"
                        description={error}
                        style={{ margin: 12 }}
                    />
                )}
                <div style={{ padding: '16px', background: '#0f172a', borderBottom: '1px solid #334155' }}>
                    <Statistic
                        title={<Text style={{ color: '#94a3b8' }}>Total operation cost</Text>}
                        value={data?.total_cost_usd || 0}
                        precision={2}
                        prefix={<DollarOutlined />}
                        valueStyle={{ color: '#4ade80' }}
                    />
                </div>
                <Table
                    className="logistics-table"
                    dataSource={data?.procurement_plan.map((row, index) => ({ ...row, key: index })) || []}
                    columns={columns}
                    pagination={{ pageSize: 5 }}
                    loading={loading}
                    size="small"
                />
            </Card>
        </>
    );
}
