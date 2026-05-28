import { useEffect, useState } from 'react';
import { Alert, Card, Statistic, Table, Tag, Typography } from 'antd';
import { DollarOutlined, InboxOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Text } = Typography;

interface LogisticsResult {
    total_cost_usd: number;
    procurement_plan: Array<{
        IFRC_Code: string;
        Item_Description: string;
        Quantity: number;
        Unit: string;
        Priority: number;
        Deployment_H: number;
        Est_Cost_USD: number;
        Sources: string;
    }>;
}

export default function LogisticsProcurement({ disasterId }: { disasterId: string }) {
    const [data, setData] = useState<LogisticsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

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
            dataIndex: 'Item_Description',
            key: 'resource',
            render: (text: string) => <Text style={{ color: t.text, fontFamily: rfont.body, textTransform: 'capitalize' }}>{(text || '').replace(/_/g, ' ')}</Text>,
        },
        {
            title: 'Quantity',
            dataIndex: 'Quantity',
            key: 'quantity',
            render: (val: number, record: { Unit: string }) => <Text strong style={{ color: isDark ? '#38bdf8' : rp.blu600, fontFamily: rfont.data }}>{val} {record.Unit}</Text>,
        },
        {
            title: 'Est. Cost',
            dataIndex: 'Est_Cost_USD',
            key: 'cost',
            render: (val: number) => <Text style={{ color: isDark ? '#4ade80' : rp.grn600, fontFamily: rfont.data, fontWeight: 700 }}>${(val || 0).toLocaleString()}</Text>,
        },
        {
            title: 'Priority',
            dataIndex: 'Priority',
            key: 'priority',
            render: (prio: number) => (
                <Tag
                    style={{
                        fontFamily: rfont.data,
                        fontWeight: 700,
                        borderRadius: rr.pill,
                        padding: '1px 8px',
                        fontSize: 10,
                    }}
                    color={prio >= 4 ? 'red' : prio === 3 ? 'orange' : prio === 2 ? 'blue' : 'default'}
                >
                    P{prio}
                </Tag>
            ),
        },
    ];

    return (
        <>
            <style>{`
                .logistics-table .ant-table {
                    background: transparent !important;
                    color: ${t.text} !important;
                }
                .logistics-table .ant-table-thead > tr > th {
                    background: ${isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC'} !important;
                    color: ${isDark ? rp.dMuted : rp.slate} !important;
                    border-bottom: 1px solid ${t.divider} !important;
                    font-family: ${rfont.body};
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.05em;
                }
                .logistics-table .ant-table-tbody > tr > td {
                    background: transparent !important;
                    border-bottom: 1px solid ${t.divider} !important;
                    color: ${t.text} !important;
                    font-family: ${rfont.body};
                }
                .logistics-table .ant-table-tbody > tr:hover > td {
                    background: ${t.rowHoverBg} !important;
                }
                .logistics-table .ant-empty-description {
                    color: ${t.textSub} !important;
                }
                .logistics-table .ant-table-placeholder {
                    background: transparent !important;
                    border-bottom: 1px solid ${t.divider} !important;
                }
                .logistics-table .ant-pagination-item a,
                .logistics-table .ant-pagination-item-active a {
                    color: ${t.text} !important;
                }
                .logistics-table .ant-pagination-item-active {
                    border-color: ${rp.red500} !important;
                    background: ${isDark ? 'rgba(220,38,38,0.1)' : '#FEE2E2'} !important;
                }
                .logistics-table .ant-pagination-prev button,
                .logistics-table .ant-pagination-next button {
                    color: ${t.textSub} !important;
                }
            `}</style>
            <Card
                title={<Text style={{ color: t.text, fontFamily: rfont.display, fontWeight: 700, fontSize: 14 }}><InboxOutlined style={{ marginRight: 8 }} />Procurement & Logistics</Text>}
                style={{
                    background: t.cardBg,
                    borderColor: t.cardBorder,
                    borderRadius: rr.lg,
                    boxShadow: t.cardShadow,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                }}
                bodyStyle={{ padding: '0 0 12px 0', flex: 1, display: 'flex', flexDirection: 'column' }}
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
                <div style={{ padding: '16px', background: isDark ? 'rgba(15,23,42,0.4)' : '#F8FAFC', borderBottom: `1px solid ${t.divider}` }}>
                    <Statistic
                        title={<Text style={{ color: t.textSub, fontFamily: rfont.body, fontSize: 12 }}>Total operation cost</Text>}
                        value={data?.total_cost_usd || 0}
                        precision={2}
                        prefix={<DollarOutlined style={{ color: isDark ? '#4ade80' : rp.grn600 }} />}
                        valueStyle={{ color: isDark ? '#4ade80' : rp.grn600, fontFamily: rfont.data, fontWeight: 700, fontSize: 24 }}
                    />
                </div>
                <Table
                    className="logistics-table"
                    dataSource={data?.procurement_plan.map((row, index) => ({ ...row, key: index })) || []}
                    columns={columns}
                    pagination={{ pageSize: 5 }}
                    loading={loading}
                    size="small"
                    style={{ flex: 1 }}
                />
            </Card>
        </>
    );
}
