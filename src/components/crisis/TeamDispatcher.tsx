import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Table, Typography, Tag, notification } from 'antd';
import { ReloadOutlined, RocketOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';

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
            notification.success({ message: 'Team deployed', description: `${team.name} is en route.` });
            setTeams((prev) => prev.filter((item) => item.id !== team.id));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Deployment request failed';
            notification.error({ message: 'Deployment failed', description: message });
        } finally {
            setDeployingId(null);
        }
    }, [disasterLat, disasterLon]);

    const columns = [
        {
            title: 'Team',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong style={{ color: '#e2e8f0' }}>{text}</Text>,
        },
        {
            title: 'Type',
            dataIndex: 'team_type',
            key: 'type',
            render: (type: string) => (
                <Tag color={type === 'NDRT' ? 'red' : type === 'RDRT' ? 'orange' : 'blue'}>
                    {type}
                </Tag>
            ),
        },
        {
            title: 'Base',
            dataIndex: 'base_location_name',
            key: 'base',
            render: (base: string) => <Text type="secondary">{base || 'Unknown'}</Text>,
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: unknown, record: TeamRecord) => (
                <Button
                    type="primary"
                    danger
                    icon={<RocketOutlined />}
                    onClick={() => void handleDeploy(record)}
                    loading={deployingId === record.id}
                    size="small"
                >
                    Deploy
                </Button>
            ),
        },
    ];

    return (
        <Card
            title={<Text style={{ color: '#fff' }}>Team Dispatch Matrix</Text>}
            extra={<Button icon={<ReloadOutlined />} onClick={() => void loadTeams()} loading={loading} />}
            style={{ background: '#1e293b', borderColor: '#334155', height: '100%' }}
            bodyStyle={{ padding: 0 }}
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
                dataSource={teams.map((team) => ({ ...team, key: team.id }))}
                columns={columns}
                pagination={false}
                loading={loading}
                size="small"
                scroll={{ y: 250 }}
            />
        </Card>
    );
}
