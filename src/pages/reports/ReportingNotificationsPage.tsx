import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Spin, Empty, Button, Space, Badge, Table, Tag } from 'antd';
import { BellOutlined, FileTextOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useReportingStore } from '@/stores/reportingStore';
import { adminReportService } from '@/services/adminReportService';
import type { ReportNotification, ReportInstanceDTO } from '@/types/template.types';

const { Title, Text } = Typography;

export default function ReportingNotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAllRead, markRead } = useReportingStore();
  const [assignedReports, setAssignedReports] = useState<ReportInstanceDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssigned = useCallback(async () => {
    setLoading(true);
    try {
      const myReports = await adminReportService.getMyReports();
      setAssignedReports(Array.isArray(myReports) ? myReports : ((myReports as any)?.content || (myReports as any)?.data || []));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssigned(); }, [fetchAssigned]);

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: 'var(--text-primary)' }}>
            <BellOutlined style={{ marginRight: 12, color: 'var(--crt-red)' }} />
            Notifications
          </Title>
          <Text type="secondary">Suivez vos alertes et rapports en attente de traitement</Text>
        </div>
        {unreadCount > 0 && (
          <Button type="primary" onClick={markAllRead} style={{ background: 'var(--crt-dark-red)' }}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Rapports à remplir */}
      <Card
        title={<Space><FileTextOutlined style={{ color: 'var(--crt-red)' }} /><span>Mes rapports à remplir (Brouillons)</span></Space>}
        className="glass-card"
        style={{ marginBottom: 24 }}
      >
        {loading ? <div className="flex justify-center"><Spin /></div> : assignedReports.filter(r => r.workflowStatus === 'DRAFT').length === 0 ? (
          <Empty description="Aucun rapport en attente de votre saisie" />
        ) : (
          <Table
            dataSource={assignedReports.filter(r => r.workflowStatus === 'DRAFT')}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Titre', dataIndex: 'title', render: (t: string) => <Text strong>{t}</Text> },
              { title: 'Urgence', dataIndex: 'reportLevel', render: (l: string) => <Tag color={l === 'URGENT' ? 'red' : 'green'}>{l}</Tag> },
              { title: 'Créé le', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString('fr-FR') },
              {
                title: 'Action', key: 'action', align: 'right',
                render: (_: any, r: ReportInstanceDTO) => (
                  <Button type="primary" size="small" icon={<EditOutlined />} onClick={() => navigate(`/reporting/reports/${r.id}/fill`)} style={{ background: '#6366f1' }}>
                    Remplir
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Notifications */}
      <Card title="Historique des alertes" className="glass-card">
        {notifications.length === 0 ? (
          <Empty description="Aucune notification" />
        ) : (
          <div>
            {notifications.map((n: ReportNotification) => (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); navigate(`/reporting/reports/${n.reportId}`); }}
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: n.read ? 'transparent' : 'var(--crt-light-red)',
                  borderLeft: n.read ? '4px solid transparent' : '4px solid var(--crt-red)',
                  borderBottom: '1px solid var(--input-border)',
                  marginBottom: 8,
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <Space>
                    {!n.read && <Badge status="error" />}
                    <Text strong style={{ fontSize: 14 }}>{n.message}</Text>
                  </Space>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {new Date(n.timestamp).toLocaleString('fr-FR')}
                    </Text>
                  </div>
                </div>
                <Button type="text" icon={<CheckCircleOutlined />} onClick={(e) => { e.stopPropagation(); markRead(n.id); }} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
