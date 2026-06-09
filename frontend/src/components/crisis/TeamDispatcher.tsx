import { useState, useEffect } from 'react';
import { Card, Table, Button, Typography, Tag, notification } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { crisisApi } from '@/services/crisisApi';

const { Text } = Typography;

export default function TeamDispatcher({ disasterLat = 36.8, disasterLon = 10.18 }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    crisisApi.getAvailableTeams().then((data: any) => {
      setTeams(data);
      setLoading(false);
    });
  }, []);

  const handleDeploy = async (teamId: string) => {
    try {
      await crisisApi.dispatchTeam(teamId, disasterLat, disasterLon);
      notification.success({ message: 'Team Deployed Successfully', description: `${teamId} is en route.` });
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (e: any) {
      notification.error({ message: 'Deployment Failed', description: e.message });
    }
  };

  const columns = [
    {
      title: 'Team Name',
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
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          type="primary"
          danger
          icon={<RocketOutlined />}
          onClick={() => handleDeploy(record.id)}
          size="small"
        >
          Deploy
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={<Text style={{ color: '#fff' }}>🚑 Team Dispatch Matrix</Text>}
      style={{ background: '#1e293b', borderColor: '#334155', height: '100%' }}
      bodyStyle={{ padding: 0 }}
    >
      <Table
        dataSource={teams.map(t => ({ ...t, key: t.id }))}
        columns={columns}
        pagination={false}
        loading={loading}
        size="small"
        scroll={{ y: 250 }}
        expandable={{
            expandedRowRender: (record: any) => (
                <div style={{ padding: '8px 16px', background: '#334155', borderRadius: 8 }}>
                    <Text strong style={{ color: '#e2e8f0' }}>Membres de l'équipe :</Text>
                    {record.members && record.members.length > 0 ? (
                        <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                            {record.members.map((m: any, idx: number) => (
                                <li key={m.id || idx} style={{ color: '#94a3b8', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600 }}>{m.name}</span> - {m.role} 
                                    {m.is_available ? 
                                        <span style={{ color: '#22c55e', marginLeft: 8, fontSize: 11 }}>● Disponible</span> : 
                                        <span style={{ color: '#ef4444', marginLeft: 8, fontSize: 11 }}>● Indisponible</span>
                                    }
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Text type="secondary" style={{ display: 'block', marginTop: 8, color: '#94a3b8' }}>Aucun membre enregistré.</Text>
                    )}
                </div>
            ),
        }}
      />
    </Card>
  );
}
