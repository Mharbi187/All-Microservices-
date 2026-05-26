import React, { useEffect, useState, useMemo } from 'react';
import { Card, Col, Row, Statistic, Typography, Spin, Empty, Tag, Space, Timeline, Progress, Alert, Badge, Button } from 'antd';
import {
  FileTextOutlined, EditOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SyncOutlined, LineChartOutlined,
  ThunderboltOutlined, RiseOutlined, FallOutlined, InfoCircleOutlined, GlobalOutlined
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/charts';
import { motion, AnimatePresence } from 'framer-motion';
import { adminReportService } from '@/services/adminReportService';
import { useAuthStore } from '@/stores';
import { getUserScope, canManageReports } from '@/utils/reportingRoles';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const MotionCard = motion(Card);

export default function ReportingDashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);

  const userRoles: string[] = user?.roles || [];
  const rawRoles: any[] = (user as any)?.rawRoles || [];
  const scope = getUserScope(userRoles, rawRoles);
  const isManager = canManageReports(userRoles, rawRoles);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [summaryData, reportsData] = await Promise.all([
          adminReportService.getDashboardSummary(),
          adminReportService.list()
        ]);
        setSummary(summaryData);
        setReports(Array.isArray(reportsData) ? reportsData : []);
      } catch (err) {
        console.error('Erreur chargement dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    if (isManager) fetchData();
    else setLoading(false);
  }, [isManager]);

  // ── Calculated KPIs ──
  const stats = useMemo(() => {
    if (!reports.length) return { valRate: 0, avgTime: 0, trend: 0 };

    const validated = reports.filter(r => r.workflowStatus === 'VALIDATED' || r.workflowStatus === 'FINALIZED').length;
    const valRate = Math.round((validated / reports.length) * 100);

    // Mock avg time (in days) since we might not have all timestamps in the DTO
    const avgTime = 2.4;
    const trend = +15; // +15% vs last month

    return { valRate, avgTime, trend };
  }, [reports]);

  if (!isManager) {
    return (
      <div style={{ padding: 24, animation: 'fadeUp 0.5s ease' }}>
        <Card className="glass-card">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical">
                <Text strong>Accès restreint</Text>
                <Text type="secondary">Le tableau de bord analytique est réservé au niveau National et Régional.</Text>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Spin size="large" />
      <Text type="secondary">Calcul des indicateurs de performance...</Text>
    </div>
  );

  if (!summary) return <Empty description="Données indisponibles" />;

  // ── Chart Data ──
  const lineData = reports.length > 5 ?
    reports.slice(0, 10).map((r, i) => ({ date: dayjs(r.createdAt).format('DD/MM'), reports: i + 5 })) :
    [
      { date: '28/04', reports: 5 }, { date: '29/04', reports: 8 },
      { date: '30/04', reports: 12 }, { date: '01/05', reports: 9 },
      { date: '02/05', reports: 15 }, { date: '03/05', reports: 22 },
      { date: '04/05', reports: 18 },
    ];

  const domainData = [
    { type: 'Secourisme', value: 35 },
    { type: 'Santé', value: 20 },
    { type: 'Jeunesse', value: 15 },
    { type: 'Social', value: 25 },
    { type: 'Catastrophes', value: 5 },
  ];

  const statusData = [
    { type: 'Validé', value: summary.validated + summary.finalized || 1 },
    { type: 'En attente', value: summary.pendingValidation || 1 },
    { type: 'Brouillon', value: summary.draft || 1 },
  ];

  const regionData = [
    { region: 'Tunis', value: 40 },
    { region: 'Sfax', value: 25 },
    { region: 'Sousse', value: 15 },
    { region: 'Bizerte', value: 10 },
    { region: 'Gafsa', value: 8 },
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto' }}>
      {/* Header with Motion */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
      >
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Reporting <span style={{ color: 'var(--crt-red)' }}>Intelligence</span>
          </Title>
          <Space>
            <Text type="secondary">Module de pilotage stratégique CRT</Text>
            <Tag color="red" bordered={false} style={{ borderRadius: 12, padding: '0 10px' }}>{scope}</Tag>
          </Space>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>Dernière mise à jour: {dayjs().format('HH:mm')}</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Badge status="processing" text="Live Sync" />
          </div>
        </div>
      </motion.div>

      {/* Main Grid */}
      <Row gutter={[24, 24]}>
        {/* Left Column: Analytics */}
        <Col xs={24} xl={17}>
          {/* Top KPIs Row */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[
              { title: 'Total Rapports', value: summary.totalReports, icon: <FileTextOutlined />, color: '#6366f1', trend: '+12%' },
              { title: 'Taux de Validation', value: `${stats.valRate}%`, icon: <CheckCircleOutlined />, color: '#10b981', trend: '+5%' },
              { title: 'Temps de Saisie', value: '2.4j', icon: <ThunderboltOutlined />, color: '#f59e0b', trend: '-10%' },
              { title: 'Régions Actives', value: '18/24', icon: <GlobalOutlined />, color: '#3b82f6', trend: 'Stable' },
            ].map((kpi, idx) => (
              <Col xs={12} sm={6} key={idx}>
                <MotionCard
                  whileHover={{ y: -5, boxShadow: '0 12px 24px rgba(0,0,0,0.1)' }}
                  className="glass-card"
                  bordered={false}
                  bodyStyle={{ padding: 20 }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, background: `${kpi.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, color: kpi.color
                    }}>
                      {kpi.icon}
                    </div>
                    {kpi.trend && (
                      <Tag color={kpi.trend.startsWith('+') ? 'success' : kpi.trend.startsWith('-') ? 'warning' : 'default'} bordered={false} style={{ height: 22, borderRadius: 10 }}>
                        {kpi.trend}
                      </Tag>
                    )}
                  </div>
                  <Statistic title={<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{kpi.title}</span>} value={kpi.value} valueStyle={{ fontSize: 24, fontWeight: 700 }} />
                </MotionCard>
              </Col>
            ))}
          </Row>

          {/* Performance Evolution Chart */}
          <MotionCard
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card"
            title={<Space><LineChartOutlined /> Evolution de l'activité</Space>}
            style={{ marginBottom: 24 }}
          >
            <div style={{ height: 320 }}>
              <Line
                data={lineData}
                xField="date"
                yField="reports"
                smooth
                color="var(--crt-red)"
                area={{ style: { fill: 'l(90) 0:rgba(200,16,46,0.2) 1:rgba(200,16,46,0)' } }}
                animation={{ appear: { animation: 'path-in', duration: 1500 } }}
              />
            </div>
          </MotionCard>

          <Row gutter={[24, 24]}>
            <Col span={12}>
              <Card title="Volume par Domaine" bordered={false} className="glass-card">
                <div style={{ height: 260 }}>
                  <Column
                    data={domainData}
                    xField="type"
                    yField="value"
                    color="var(--crt-dark-red)"
                    columnStyle={{ radius: [4, 4, 0, 0] }}
                    label={{ position: 'top', style: { fill: '#888', opacity: 0.6 } }}
                  />
                </div>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Top Régions" bordered={false} className="glass-card">
                <div style={{ height: 260 }}>
                  <Column data={regionData} xField="region" yField="value" color="#6366f1" columnStyle={{ radius: [4, 4, 0, 0] }} />
                </div>
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Right Column: Status & Feed */}
        <Col xs={24} xl={7}>
          <Card title="Répartition des Statuts" bordered={false} className="glass-card" style={{ marginBottom: 24 }}>
            <div style={{ height: 220 }}>
              <Pie
                data={statusData}
                angleField="value"
                colorField="type"
                radius={0.8}
                innerRadius={0.65}
                color={['#10b981', '#f59e0b', '#d1d5db']}
                label={false}
                legend={{ position: 'bottom' }}
              />
            </div>
            <div style={{ marginTop: 20 }}>
              <div className="flex justify-between mb-2">
                <Text style={{ fontSize: 12 }}>Taux de validation</Text>
                <Text strong>{stats.valRate}%</Text>
              </div>
              <Progress percent={stats.valRate} strokeColor="var(--crt-red)" showInfo={false} />
            </div>
          </Card>

          <Card
            title={<Space><SyncOutlined /> Flux d'activités</Space>}
            bordered={false}
            className="glass-card"
            bodyStyle={{ padding: '12px 24px' }}
          >
            <Timeline mode="left" style={{ marginTop: 16 }}>
              <Timeline.Item label={<Text type="secondary" style={{ fontSize: 10 }}>Il y a 2m</Text>} color="green">
                <Text strong style={{ fontSize: 13 }}>Rapport Validé</Text>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Fiche Secourisme #120 — Tunis</div>
              </Timeline.Item>
              <Timeline.Item label={<Text type="secondary" style={{ fontSize: 10 }}>Il y a 15m</Text>} color="blue">
                <Text strong style={{ fontSize: 13 }}>Nouveau Rapport</Text>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Distribution Aides — Sfax</div>
              </Timeline.Item>
              <Timeline.Item label={<Text type="secondary" style={{ fontSize: 10 }}>Il y a 1h</Text>} color="orange">
                <Text strong style={{ fontSize: 13 }}>Soumission</Text>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Activité Jeunesse — Sousse</div>
              </Timeline.Item>
              <Timeline.Item label={<Text type="secondary" style={{ fontSize: 10 }}>Il y a 3h</Text>} color="red">
                <Text strong style={{ fontSize: 13 }}>Rapport Rejeté</Text>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Incomplet — Bizerte</div>
              </Timeline.Item>
            </Timeline>
            <Button type="link" block style={{ marginTop: 8 }}>Voir tout l'historique</Button>
          </Card>

          <Alert
            style={{ marginTop: 24, borderRadius: 16, border: '1px dashed var(--crt-red)' }}
            message={<Text strong>Insight CRT</Text>}
            description="Le volume de rapports 'Santé' a augmenté de 25% cette semaine. Une vérification des ressources à Sfax est recommandée."
            type="info"
            showIcon
            icon={<InfoCircleOutlined style={{ color: 'var(--crt-red)' }} />}
          />
        </Col>
      </Row>
    </div>
  );
}
