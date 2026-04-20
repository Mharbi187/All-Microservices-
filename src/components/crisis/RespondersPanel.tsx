import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, List, Space, Tag, Typography, notification } from 'antd';
import { ReloadOutlined, RocketOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';

const { Text } = Typography;

interface ResponderTeam {
    id: string;
    name: string;
    team_type: string;
    member_count: number;
    base_location_name?: string;
    status?: string;
}

interface RespondersPanelProps {
    targetLat: number;
    targetLon: number;
    targetLabel: string;
}

export default function RespondersPanel({ targetLat, targetLon, targetLabel }: RespondersPanelProps) {
    const [teams, setTeams] = useState<ResponderTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const [deployingId, setDeployingId] = useState<string | null>(null);

    const loadTeams = useCallback(async () => {
        try {
            setLoading(true);
            const result = await crisisApi.getAvailableTeams();
            setTeams(Array.isArray(result) ? result : []);
        } catch (error) {
            notification.error({
                message: 'Team feed unavailable',
                description: 'Unable to fetch responder availability.',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadTeams();
    }, [loadTeams]);

    const availableCount = useMemo(() => teams.filter((team) => team.status === 'available' || !team.status).length, [teams]);

    const dispatchTeam = useCallback(
        async (team: ResponderTeam) => {
            try {
                setDeployingId(team.id);
                await crisisApi.dispatchTeam(team.id, targetLat, targetLon);
                notification.success({
                    message: 'Team deployed',
                    description: `${team.name} dispatched to ${targetLabel}.`,
                });
                setTeams((prev) => prev.filter((item) => item.id !== team.id));
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Dispatch request failed';
                notification.error({
                    message: 'Dispatch failed',
                    description: message,
                });
            } finally {
                setDeployingId(null);
            }
        },
        [targetLat, targetLon, targetLabel],
    );

    return (
        <Card
            title="Responder Readiness"
            extra={
                <Button icon={<ReloadOutlined />} onClick={() => void loadTeams()} loading={loading}>
                    Refresh
                </Button>
            }
            style={{ height: '100%', background: 'rgba(30,41,59,0.85)', border: '1px solid #334155' }}
            styles={{ body: { maxHeight: 540, overflowY: 'auto' } }}
        >
            <Alert
                type="info"
                showIcon
                message={`Target: ${targetLabel} (${targetLat.toFixed(3)}, ${targetLon.toFixed(3)})`}
                style={{ marginBottom: 12 }}
            />
            <Space style={{ marginBottom: 12 }}>
                <Tag color="processing">Available: {availableCount}</Tag>
                <Tag color="default">Total loaded: {teams.length}</Tag>
            </Space>
            <List
                loading={loading}
                dataSource={teams}
                locale={{ emptyText: 'No response teams available right now.' }}
                renderItem={(team) => (
                    <List.Item
                        actions={[
                            <Button
                                key={`deploy-${team.id}`}
                                type="primary"
                                danger
                                icon={<RocketOutlined />}
                                loading={deployingId === team.id}
                                onClick={() => void dispatchTeam(team)}
                            >
                                Deploy
                            </Button>,
                        ]}
                    >
                        <List.Item.Meta
                            title={
                                <Space>
                                    <Text strong>{team.name}</Text>
                                    <Tag color={team.team_type === 'NDRT' ? 'red' : 'orange'}>{team.team_type}</Tag>
                                </Space>
                            }
                            description={
                                <Space size={16}>
                                    <Text type="secondary">Members: {team.member_count}</Text>
                                    <Text type="secondary">Base: {team.base_location_name ?? 'Unknown'}</Text>
                                </Space>
                            }
                        />
                    </List.Item>
                )}
            />
        </Card>
    );
}
