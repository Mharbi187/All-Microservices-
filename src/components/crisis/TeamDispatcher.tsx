import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Table, Typography, Tag, notification } from 'antd';
import { ReloadOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Text } = Typography;

interface TeamRecord {
    id: string;
    name: string;
    team_type: string;
    base_location_name?: string;
    status?: string;
}

interface TeamDispatcherProps {
    disasterLat?: number;
    disasterLon?: number;
}

export default function TeamDispatcher({ disasterLat = 36.8, disasterLon = 10.18 }: TeamDispatcherProps) {
    const [teams, setTeams] = useState<TeamRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deployingId, setDeployingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    const loadTeams = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await crisisApi.getAvailableTeams();
            setTeams(Array.isArray(data) ? data : []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unable to fetch team list';
            setError(message);
            setTeams([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTeams();
    }, [loadTeams]);

    const handleDeploy = useCallback(async (team: TeamRecord) => {
        try {
            setDeployingId(team.id);
            await crisisApi.dispatchTeam(team.id, disasterLat, disasterLon);
            notification.success({ message: 'Équipe déployée', description: `${team.name} est en route.` });
            setTeams((prev) => prev.filter((item) => item.id !== team.id));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Deployment request failed';
            notification.error({ message: 'Déploiement échoué', description: message });
        } finally {
            setDeployingId(null);
        }
    }, [disasterLat, disasterLon]);

    const columns = [
        {
            title: 'Team',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong style={{ color: t.text, fontFamily: rfont.body }}>{text}</Text>,
        },
        {
            title: 'Type',
            dataIndex: 'team_type',
            key: 'type',
            render: (type: string) => (
                <Tag
                    style={{
                        fontFamily: rfont.data,
                        fontWeight: 700,
                        borderRadius: rr.pill,
                        padding: '1px 8px',
                        fontSize: 10,
                    }}
                    color={type === 'NDRT' ? 'red' : type === 'RDRT' ? 'orange' : 'blue'}
                >
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Base',
            dataIndex: 'base_location_name',
            key: 'base',
            render: (base: string) => <Text style={{ color: t.textSub, fontFamily: rfont.body, fontSize: 12 }}>{base || 'Base inconnue'}</Text>,
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: TeamRecord) => (
                <Button
                    type="primary"
                    icon={<RocketOutlined />}
                    onClick={() => void handleDeploy(record)}
                    loading={deployingId === record.id}
                    size="small"
                    style={{
                        background: `linear-gradient(90deg, ${rp.red600}, ${rp.red500})`,
                        borderColor: rp.red600,
                        borderRadius: rr.sm,
                        fontFamily: rfont.body,
                        fontWeight: 700,
                        boxShadow: '0 2px 6px rgba(220,38,38,0.2)',
                    }}
                >
                    Déployer
                </Button>
            ),
        },
    ];

    return (
        <>
            <style>{`
                .dispatcher-table .ant-table {
                    background: transparent !important;
                    color: ${t.text} !important;
                }
                .dispatcher-table .ant-table-thead > tr > th {
                    background: ${isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC'} !important;
                    color: ${isDark ? rp.dMuted : rp.slate} !important;
                    border-bottom: 1px solid ${t.divider} !important;
                    font-family: ${rfont.body};
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 11px;
                    letter-spacing: 0.05em;
                }
                .dispatcher-table .ant-table-tbody > tr > td {
                    background: transparent !important;
                    border-bottom: 1px solid ${t.divider} !important;
                    color: ${t.text} !important;
                    font-family: ${rfont.body};
                }
                .dispatcher-table .ant-table-tbody > tr:hover > td {
                    background: ${t.rowHoverBg} !important;
                }
                .dispatcher-table .ant-empty-description {
                    color: ${t.textSub} !important;
                }
                .dispatcher-table .ant-table-placeholder {
                    background: transparent !important;
                    border-bottom: 1px solid ${t.divider} !important;
                }
            `}</style>
            <Card
                title={<Text style={{ color: t.text, fontFamily: rfont.display, fontWeight: 700, fontSize: 14 }}><SettingOutlined style={{ marginRight: 8 }} />Team Dispatch Matrix</Text>}
                extra={
                    <Button
                        icon={<ReloadOutlined style={{ color: t.text }} />}
                        onClick={() => void loadTeams()}
                        loading={loading}
                        style={{ background: t.cardBg, borderColor: t.cardBorder, borderRadius: rr.sm }}
                    />
                }
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
                bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
            >
                {error && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Responder feed unavailable"
                        description={error}
                        style={{ margin: 12 }}
                    />
                )}
                <Table
                    className="dispatcher-table"
                    dataSource={teams.map((team) => ({ ...team, key: team.id }))}
                    columns={columns}
                    pagination={false}
                    loading={loading}
                    size="small"
                    scroll={{ y: 220 }}
                    style={{ flex: 1 }}
                />
            </Card>
        </>
    );
}
