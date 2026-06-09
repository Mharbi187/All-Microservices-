import { Card, Row, Col, Statistic, Typography } from 'antd';
import { AimOutlined, TeamOutlined, HeartOutlined, AlertOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function SituationBoard({ data }: { data: any }) {
    if (!data) return null;

    return (
        <Card
            title={<Text style={{ color: '#fff' }}>🗺️ Live Situation Board</Text>}
            style={{ background: '#1e293b', borderColor: '#334155', marginBottom: 16 }}
            bodyStyle={{ padding: 16 }}
        >
            <Row gutter={[16, 16]}>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: '#94a3b8' }}>Active Missions</Text>}
                        value={data.missions_active || 3}
                        prefix={<AimOutlined style={{ color: '#ef4444' }} />}
                        valueStyle={{ color: '#fff' }}
                    />
                </Col>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: '#94a3b8' }}>Deployed Teams</Text>}
                        value={Object.keys(data.team_positions || {}).length || 2}
                        prefix={<TeamOutlined style={{ color: '#38bdf8' }} />}
                        valueStyle={{ color: '#fff' }}
                    />
                </Col>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: '#94a3b8' }}>Civilian Beneficiaries</Text>}
                        value={data.beneficiaries_count || 450}
                        prefix={<HeartOutlined style={{ color: '#22c55e' }} />}
                        valueStyle={{ color: '#fff' }}
                    />
                </Col>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: '#94a3b8' }}>Critical Alerts</Text>}
                        value={data.alerts_summary?.CRITICAL || 1}
                        prefix={<AlertOutlined style={{ color: '#f59e0b' }} />}
                        valueStyle={{ color: '#fff' }}
                    />
                </Col>
            </Row>
        </Card>
    );
}
