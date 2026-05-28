import { Card, Row, Col, Statistic, Typography } from 'antd';
import { AimOutlined, TeamOutlined, HeartOutlined, AlertOutlined, GlobalOutlined } from '@ant-design/icons';
import { useUIStore } from '@/stores';
import { makeRadarTheme, rp, rr, rfont } from '@/components/crisis/radarTheme';

const { Text } = Typography;

export default function SituationBoard({ data }: { data: any }) {
    const { themeMode } = useUIStore();
    const isDark = themeMode === 'dark';
    const t = makeRadarTheme(isDark);

    if (!data) return null;

    return (
        <Card
            title={<Text style={{ color: t.text, fontFamily: rfont.display, fontWeight: 700, fontSize: 14 }}><GlobalOutlined style={{ marginRight: 8 }} />Live Situation Board</Text>}
            style={{
                background: t.cardBg,
                borderColor: t.cardBorder,
                borderRadius: rr.lg,
                boxShadow: t.cardShadow,
                marginBottom: 16,
                transition: 'all 0.3s ease',
            }}
            bodyStyle={{ padding: 16 }}
        >
            <Row gutter={[16, 16]}>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: t.textSub, fontFamily: rfont.body, fontSize: 12 }}>Active Missions</Text>}
                        value={data.missions_active || 3}
                        prefix={<AimOutlined style={{ color: rp.red500 }} />}
                        valueStyle={{ color: t.text, fontFamily: rfont.data, fontWeight: 700, fontSize: 20 }}
                    />
                </Col>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: t.textSub, fontFamily: rfont.body, fontSize: 12 }}>Deployed Teams</Text>}
                        value={Object.keys(data.team_positions || {}).length || 2}
                        prefix={<TeamOutlined style={{ color: isDark ? '#38bdf8' : rp.blu600 }} />}
                        valueStyle={{ color: t.text, fontFamily: rfont.data, fontWeight: 700, fontSize: 20 }}
                    />
                </Col>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: t.textSub, fontFamily: rfont.body, fontSize: 12 }}>Civilian Beneficiaries</Text>}
                        value={data.beneficiaries_count || 450}
                        prefix={<HeartOutlined style={{ color: rp.grn500 }} />}
                        valueStyle={{ color: t.text, fontFamily: rfont.data, fontWeight: 700, fontSize: 20 }}
                    />
                </Col>
                <Col span={12}>
                    <Statistic
                        title={<Text style={{ color: t.textSub, fontFamily: rfont.body, fontSize: 12 }}>Critical Alerts</Text>}
                        value={data.alerts_summary?.CRITICAL || 1}
                        prefix={<AlertOutlined style={{ color: rp.amb500 }} />}
                        valueStyle={{ color: t.text, fontFamily: rfont.data, fontWeight: 700, fontSize: 20 }}
                    />
                </Col>
            </Row>
        </Card>
    );
}
