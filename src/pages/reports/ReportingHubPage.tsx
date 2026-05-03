// ============================================================
// ReportingHubPage — Page centrale unifiée du système de reporting
// Adapte les onglets selon le rôle de l'utilisateur
// ============================================================
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layout, Tabs, Badge, Button, Card, Col, Row, Statistic, Table, Tag, Space,
  Typography, Spin, Select, Input, Empty, message, Popconfirm, Alert,
  Tooltip, Dropdown, notification, Avatar,
} from 'antd';
import {
  FileTextOutlined, PlusOutlined, EditOutlined, CheckCircleOutlined,
  FilePdfOutlined, LockOutlined, ThunderboltOutlined, SearchOutlined,
  BellOutlined, BarChartOutlined, EyeOutlined, AppstoreOutlined,
  FilterOutlined, WifiOutlined, DisconnectOutlined, MoreOutlined,
  CloudUploadOutlined, SafetyCertificateOutlined, UserAddOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/stores';
import { useReportingStore } from '@/stores/reportingStore';
import { adminReportService } from '@/services/adminReportService';
import { templateBuilderService } from '@/services/templateBuilderService';
import ReportAssignModal from '@/components/shared/ReportAssignModal';
import WorkflowTimeline from '@/components/shared/WorkflowTimeline';
import TemplateVersionsModal from '@/pages/templates/components/TemplateVersionsModal';
import type {
  ReportInstanceDTO, TemplateDTO, ReportWorkflowStatus, ReportDashboardSummary,
  ReportNotification,
} from '@/types/template.types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

// ── Helpers ──────────────────────────────────────────────────────────────────

const SCOPE_COLOR: Record<string, string> = { NATIONAL: 'volcano', REGIONAL: 'blue', LOCAL: 'green' };
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'Soumis', VALIDATED: 'Validé',
  FINALIZED: 'Finalisé', ARCHIVED: 'Archivé',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', SUBMITTED: 'orange', VALIDATED: 'blue',
  FINALIZED: 'green', ARCHIVED: 'purple',
};

/** Returns true if the user has a management role (can validate/finalize/archive) */
function canManage(roles: string[], rawRoles?: any[]): boolean {
  // Check RoleTitle strings first (the primary roles array)
  const managementRoles = ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL'];
  if (roles.some((r: string) => managementRoles.some((m) => r.includes(m)))) return true;
  // Fallback: check rawRoles objects if available
  if (rawRoles) {
    return rawRoles.some((r: any) =>
      managementRoles.some((m) => (r.role || '').includes(m))
    );
  }
  return false;
}

function canCreateTemplate(roles: string[], rawRoles: any[], scope: string): boolean {
  if (scope === 'NATIONAL')
    return rawRoles.some((r: any) => r.committeeType === 'NATIONAL') ||
           roles.some((r) => r.includes('PRESIDENT') || r.includes('SECRETAIRE_GENERAL'));
  if (scope === 'REGIONAL')
    return rawRoles.some((r: any) => ['NATIONAL', 'REGIONAL'].includes(r.committeeType)) ||
           roles.some((r) => r.includes('PRESIDENT') || r.includes('SECRETAIRE_GENERAL'));
  return true; // LOCAL — everyone with a role can create
}

function getUserScope(roles: string[], rawRoles?: any[]): 'NATIONAL' | 'REGIONAL' | 'LOCAL' {
  // Check rawRoles for committeeType
  if (rawRoles && rawRoles.length > 0) {
    if (rawRoles.some((r: any) => r.committeeType === 'NATIONAL')) return 'NATIONAL';
    if (rawRoles.some((r: any) => r.committeeType === 'REGIONAL')) return 'REGIONAL';
  }
  // Fallback: infer from role name patterns
  if (roles.some((r) => r.includes('NATIONAL'))) return 'NATIONAL';
  if (roles.some((r) => r.includes('REGIONAL'))) return 'REGIONAL';
  return 'LOCAL';
}

// ── Sub-components ────────────────────────────────────────────────────────────

const DashboardTab: React.FC<{ summary: ReportDashboardSummary | null; loading: boolean }> = ({ summary, loading }) => {
  if (loading) return <div className="flex justify-center py-12"><Spin size="large" /></div>;
  if (!summary) return <Empty description="Impossible de charger le tableau de bord" />;

  const stats = [
    { title: 'Total rapports', value: summary.totalReports, color: '#6366f1', icon: <FileTextOutlined /> },
    { title: 'En attente', value: summary.pendingValidation, color: '#f59e0b', icon: <EditOutlined /> },
    { title: 'Validés', value: summary.validated, color: '#3b82f6', icon: <CheckCircleOutlined /> },
    { title: 'Finalisés', value: summary.finalized, color: '#10b981', icon: <FilePdfOutlined /> },
    { title: 'Archivés', value: summary.archived, color: '#8b5cf6', icon: <LockOutlined /> },
    { title: 'Brouillons', value: summary.draft, color: '#94a3b8', icon: <EditOutlined /> },
  ];

  return (
    <Row gutter={[16, 16]}>
      {stats.map((s) => (
        <Col xs={12} sm={8} md={4} key={s.title}>
          <Card size="small" style={{ borderTop: `3px solid ${s.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${s.color}18`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: s.color, fontSize: 18,
              }}>{s.icon}</div>
              <Statistic title={s.title} value={s.value}
                valueStyle={{ fontSize: 22, fontWeight: 700, color: s.color }} />
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const ReportingHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { notifications, unreadCount, wsConnected, markAllRead, markRead, startWs, stopWs } = useReportingStore();

  const userRoles: string[] = user?.roles || [];
  const rawRoles: any[] = (user as any)?.rawRoles || [];
  const isVolunteer = user?.type === 'VOLUNTEER' && !canManage(userRoles, rawRoles);
  const scope = getUserScope(userRoles, rawRoles);
  const canManageReports = canManage(userRoles, rawRoles);

  // State
  const [reports, setReports] = useState<ReportInstanceDTO[]>([]);
  const [assignedReports, setAssignedReports] = useState<ReportInstanceDTO[]>([]);
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [summary, setSummary] = useState<ReportDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState<{ open: boolean; templateId?: string }>({ open: false });
  const [versionsModalOpen, setVersionsModalOpen] = useState<{ open: boolean; templateId: string; templateTitle: string }>({ open: false, templateId: '', templateTitle: '' });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Start WebSocket
  useEffect(() => {
    const token = localStorage.getItem('nexus_token') || localStorage.getItem('token') || '';
    if (user?.id && token) startWs(user.id, token);
    return () => stopWs();
  }, [user?.id]);

  // Show toast on new notification
  useEffect(() => {
    const latest = notifications[0];
    if (latest && !latest.read) {
      notification.info({
        message: 'Notification Reporting',
        description: latest.message,
        placement: 'topRight',
        duration: 5,
        onClick: () => {
          markRead(latest.id);
          navigate(`/admin-reports/${latest.reportId}`);
        },
      });
    }
  }, [notifications.length]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [allReports, myReports, dashSummary] = await Promise.all([
        canManageReports ? adminReportService.list() : Promise.resolve([]),
        adminReportService.getMyReports(),
        canManageReports ? adminReportService.getDashboardSummary() : Promise.resolve(null),
      ]);
      setReports(Array.isArray(allReports) ? allReports : (allReports?.content || allReports?.data || []));
      setAssignedReports(Array.isArray(myReports) ? myReports : (myReports?.content || myReports?.data || []));
      setSummary(dashSummary);
    } catch {
      message.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  }, [canManageReports]);

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data: any = await templateBuilderService.list();
      const arrayData = Array.isArray(data) ? data : (data?.content || data?.data || []);
      setTemplates(arrayData.filter((t: any) => t.isActive && t.version > 0));
    } catch {
      message.error('Erreur lors du chargement des modèles');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (activeTab === 'templates') fetchTemplates();
  }, [activeTab]);

  // Workflow actions
  const performAction = async (id: string, action: 'validate' | 'finalize' | 'archive') => {
    setActionLoading(`${action}-${id}`);
    try {
      if (action === 'validate') await adminReportService.validate(id);
      else if (action === 'finalize') await adminReportService.finalize(id);
      else await adminReportService.archive(id);
      message.success('Action effectuée avec succès.');
      fetchAll();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await adminReportService.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `rapport-${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { message.error('Erreur PDF'); }
  };

  const safeReports = Array.isArray(reports) ? reports : [];
  const safeAssignedReports = Array.isArray(assignedReports) ? assignedReports : [];

  // Filtered reports
  const filteredReports = useMemo(() => {
    const source = safeReports;
    return source.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.workflowStatus === statusFilter;
      const matchSearch = !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.committeeName ?? '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [reports, statusFilter, search]);

  // ── Table columns for Reports ──────────────────────────────

  const reportColumns = [
    {
      title: 'Rapport',
      key: 'title',
      render: (_: any, r: ReportInstanceDTO) => (
        <Space>
          <Avatar icon={<FileTextOutlined />}
            style={{ background: r.reportLevel === 'URGENT' ? '#ef4444' : '#6366f1' }} size="small" />
          <div>
            <Text strong style={{ fontSize: 13 }}>{r.title}</Text>
            <div>
              {r.scope && <Tag color={SCOPE_COLOR[r.scope]} style={{ fontSize: 10 }}>{r.scope}</Tag>}
              {r.reportLevel === 'URGENT' && <Tag color="red" style={{ fontSize: 10 }}>URGENT</Tag>}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'workflowStatus',
      key: 'status',
      render: (s: ReportWorkflowStatus) => (
        <Tag color={STATUS_COLOR[s]} bordered={false}>{STATUS_LABEL[s]}</Tag>
      ),
    },
    {
      title: 'Assigné à',
      dataIndex: 'assignedToName',
      key: 'assigned',
      responsive: ['lg'] as any,
      render: (name: string) => name ? <Text style={{ fontSize: 12 }}>{name}</Text> : <Text type="secondary" style={{ fontSize: 12 }}>—</Text>,
    },
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['md'] as any,
      render: (d: string) => <Text style={{ fontSize: 12, color: '#888' }}>{new Date(d).toLocaleDateString('fr-FR')}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: ReportInstanceDTO) => {
        const items: any[] = [
          { key: 'view', icon: <EyeOutlined />, label: 'Voir', onClick: () => navigate(`/admin-reports/${r.id}`) },
          ...(r.workflowStatus === 'DRAFT' ? [{ key: 'fill', icon: <EditOutlined />, label: 'Remplir', onClick: () => navigate(`/admin-reports/${r.id}/fill`) }] : []),
          ...(canManageReports && r.workflowStatus === 'SUBMITTED' ? [{ key: 'validate', icon: <CheckCircleOutlined />, label: 'Valider', onClick: () => performAction(r.id, 'validate') }] : []),
          ...(canManageReports && r.workflowStatus === 'VALIDATED' ? [{ key: 'finalize', icon: <ThunderboltOutlined />, label: 'Finaliser', onClick: () => performAction(r.id, 'finalize') }] : []),
          ...(canManageReports && r.workflowStatus === 'FINALIZED' && scope !== 'LOCAL' ? [{ key: 'archive', icon: <LockOutlined />, label: 'Archiver', onClick: () => performAction(r.id, 'archive') }] : []),
          ...(r.workflowStatus === 'ARCHIVED' ? [{ key: 'pdf', icon: <FilePdfOutlined />, label: 'Télécharger PDF', onClick: () => handleDownloadPdf(r.id) }] : []),
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              size="small"
              loading={actionLoading?.includes(r.id)}
            />
          </Dropdown>
        );
      },
    },
  ];

  // ── Template columns ──────────────────────────────────────

  const templateColumns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <Text strong>{t}</Text>,
    },
    {
      title: 'Portée',
      dataIndex: 'scope',
      key: 'scope',
      render: (s: string) => s ? <Tag color={SCOPE_COLOR[s] ?? 'default'}>{s}</Tag> : '—',
    },
    {
      title: 'Statut',
      dataIndex: 'isActive',
      key: 'active',
      render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'Actif' : 'Inactif'}</Tag>,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (v: number) => `v${v}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, t: TemplateDTO) => (
        <Space>
          <Tooltip title="Gérer les versions">
            <Button type="text" icon={<FilePdfOutlined />} onClick={() => setVersionsModalOpen({ open: true, templateId: t.id, templateTitle: t.title })} />
          </Tooltip>
          <Tooltip title="Modifier dans le builder">
            <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/templates/${t.id}/edit`)} />
          </Tooltip>
          <Tooltip title="Affecter un rapport">
            <Button type="text" icon={<UserAddOutlined />} onClick={() => { setAssignModalOpen({ open: true, templateId: t.id }); }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ── Notifications tab ──────────────────────────────────────

  const NotificationsTab = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>
          Notifications &amp; Rapports assignés
        </Title>
        {unreadCount > 0 && (
          <Button size="small" onClick={markAllRead}>Tout marquer comme lu</Button>
        )}
      </div>

      {/* Assigned reports to fill */}
      <Card
        title={<Space><FileTextOutlined /><span>Rapports à remplir</span><Badge count={safeAssignedReports.filter(r => r.workflowStatus === 'DRAFT').length} /></Space>}
        style={{ marginBottom: 16 }}
        size="small"
      >
        {loading ? <Spin /> : safeAssignedReports.filter(r => r.workflowStatus === 'DRAFT').length === 0 ? (
          <Empty description="Aucun rapport assigné en attente" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Table
            dataSource={safeAssignedReports.filter(r => r.workflowStatus === 'DRAFT')}
            rowKey="id"
            size="small"
            pagination={false}
            columns={[
              { title: 'Titre', dataIndex: 'title', render: (t: string) => <Text strong>{t}</Text> },
              { title: 'Urgence', dataIndex: 'reportLevel', render: (l: string) => <Tag color={l === 'URGENT' ? 'red' : 'green'}>{l}</Tag> },
              { title: 'Créé le', dataIndex: 'createdAt', render: (d: string) => new Date(d).toLocaleDateString('fr-FR') },
              {
                title: '', key: 'action',
                render: (_: any, r: ReportInstanceDTO) => (
                  <Button type="primary" size="small" icon={<EditOutlined />}
                    onClick={() => navigate(`/admin-reports/${r.id}/fill`)}>
                    Remplir
                  </Button>
                ),
              },
            ]}
          />
        )}
      </Card>

      {/* Notification list */}
      <Card title="Historique des notifications" size="small">
        {notifications.length === 0 ? (
          <Empty description="Aucune notification" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.map((n: ReportNotification) => (
              <div
                key={n.id}
                onClick={() => { markRead(n.id); navigate(`/admin-reports/${n.reportId}`); }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: n.read ? 'transparent' : 'rgba(99,102,241,0.06)',
                  borderLeft: n.read ? '3px solid transparent' : '3px solid #6366f1',
                  marginBottom: 8,
                  transition: 'background 0.2s',
                }}
              >
                <Text strong style={{ fontSize: 13 }}>{n.message}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(n.timestamp).toLocaleString('fr-FR')}
                </Text>
                {!n.read && <Badge dot style={{ marginLeft: 8 }} />}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );

  // ── Tabs configuration ─────────────────────────────────────

  const tabs = [
    ...(!isVolunteer ? [{
      key: 'dashboard',
      label: <Space><BarChartOutlined />Tableau de bord</Space>,
      children: <DashboardTab summary={summary} loading={loading} />,
    }] : []),
    ...(!isVolunteer ? [{
      key: 'reports',
      label: (
        <Space>
          <FileTextOutlined />
          Rapports
          {safeReports.filter(r => r.workflowStatus === 'SUBMITTED').length > 0 && (
            <Badge count={safeReports.filter(r => r.workflowStatus === 'SUBMITTED').length} size="small" />
          )}
        </Space>
      ),
      children: (
        <div>
          {/* Filters */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space wrap>
              <Input
                prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                placeholder="Rechercher un rapport..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 260 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 160 }}
                options={[
                  { value: 'ALL', label: 'Tous les statuts' },
                  { value: 'DRAFT', label: '🖊 Brouillons' },
                  { value: 'SUBMITTED', label: '📤 Soumis' },
                  { value: 'VALIDATED', label: '✅ Validés' },
                  { value: 'FINALIZED', label: '🏁 Finalisés' },
                  { value: 'ARCHIVED', label: '📦 Archivés' },
                ]}
              />
              <Text style={{ fontSize: 12, color: '#999' }}>
                {filteredReports.length} rapport{filteredReports.length > 1 ? 's' : ''}
              </Text>
            </Space>
          </Card>

          {/* Table */}
          <Card>
            {loading ? (
              <div className="flex justify-center py-12"><Spin size="large" /></div>
            ) : (
              <Table
                dataSource={filteredReports}
                columns={reportColumns}
                rowKey="id"
                pagination={{ pageSize: 15, showTotal: (t) => `${t} rapports` }}
                size="middle"
                scroll={{ x: 700 }}
                locale={{ emptyText: <Empty description="Aucun rapport" /> }}
              />
            )}
          </Card>
        </div>
      ),
    }] : []),
    ...(!isVolunteer ? [{
      key: 'templates',
      label: <Space><AppstoreOutlined />Modèles</Space>,
      children: (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>Modèles de rapports</Title>
              <Text type="secondary">Gérez les modèles par portée hiérarchique ({scope})</Text>
            </div>
            <Space>
              <Button
                icon={<PlusOutlined />}
                onClick={() => navigate('/templates/new')}
              >
                Nouveau modèle
              </Button>
              <Button
                type="primary"
                icon={<UserAddOutlined />}
                onClick={() => setAssignModalOpen({ open: true })}
                style={{ background: '#6366f1' }}
              >
                Affecter un rapport
              </Button>
            </Space>
          </div>

          {/* Scope info */}
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <span>
                Votre niveau : <Tag color={SCOPE_COLOR[scope]}>{scope}</Tag>
                {scope === 'NATIONAL' && ' — Vous pouvez créer des modèles NATIONAL, REGIONAL et LOCAL'}
                {scope === 'REGIONAL' && ' — Vous pouvez créer des modèles REGIONAL et LOCAL'}
                {scope === 'LOCAL' && ' — Vous pouvez créer des modèles LOCAL uniquement'}
              </span>
            }
          />

          <Card>
            <Spin spinning={templatesLoading}>
              <Table
                dataSource={templates}
                columns={templateColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                locale={{ emptyText: <Empty description="Aucun modèle disponible" /> }}
                size="middle"
              />
            </Spin>
          </Card>
        </div>
      ),
    }] : []),
    {
      key: 'notifications',
      label: (
        <Space>
          <BellOutlined />
          {isVolunteer ? 'Mes rapports' : 'Notifications'}
          {unreadCount > 0 && <Badge count={unreadCount} size="small" />}
        </Space>
      ),
      children: NotificationsTab,
    },
  ];

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8, color: '#6366f1' }} />
            Système de Reporting
          </Title>
          <Space style={{ marginTop: 4 }}>
            <Text type="secondary">
              {user?.committeeName || 'Nexus-AID'} — Niveau <Tag color={SCOPE_COLOR[scope]}>{scope}</Tag>
            </Text>
            <Tooltip title={wsConnected ? 'Notifications temps-réel actives' : 'Hors ligne — Mode polling'}>
              {wsConnected
                ? <Tag color="green" icon={<WifiOutlined />}>Live</Tag>
                : <Tag color="orange" icon={<DisconnectOutlined />}>Offline</Tag>
              }
            </Tooltip>
          </Space>
        </div>

        {!isVolunteer && (
          <Space>
            <Button
              icon={<UserAddOutlined />}
              type="primary"
              style={{ background: '#6366f1' }}
              onClick={() => setAssignModalOpen({ open: true })}
            >
              Affecter un rapport
            </Button>
            <Button
              icon={<PlusOutlined />}
              onClick={() => navigate('/templates/new')}
            >
              Nouveau modèle
            </Button>
          </Space>
        )}
      </div>

      {/* Main tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        size="middle"
        items={tabs}
        style={{ background: 'transparent' }}
      />

      {/* Assign modal */}
      <ReportAssignModal
        open={assignModalOpen.open}
        defaultTemplateId={assignModalOpen.templateId}
        onClose={() => setAssignModalOpen({ open: false })}
        onSuccess={fetchAll}
        allowedScope={scope}
      />

      <TemplateVersionsModal
        open={versionsModalOpen.open}
        templateId={versionsModalOpen.templateId}
        templateTitle={versionsModalOpen.templateTitle}
        onClose={() => setVersionsModalOpen({ open: false, templateId: '', templateTitle: '' })}
      />
    </div>
  );
};

export default ReportingHubPage;
