import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Space, Typography, Spin, Select, Input, Empty, message, Dropdown, Button, Avatar } from 'antd';
import {
  FileTextOutlined, EditOutlined, CheckCircleOutlined,
  FilePdfOutlined, LockOutlined, ThunderboltOutlined, SearchOutlined, EyeOutlined, MoreOutlined,
  CloudUploadOutlined, FlagOutlined, FolderOutlined
} from '@ant-design/icons';
import { adminReportService } from '@/services/adminReportService';
import { useAuthStore } from '@/stores';
import { SCOPE_COLOR, STATUS_COLOR, STATUS_LABEL, getUserScope, canManageReports } from '@/utils/reportingRoles';
import type { ReportInstanceDTO, ReportWorkflowStatus } from '@/types/template.types';

const { Title, Text } = Typography;

export default function ReportingListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const userRoles: string[] = user?.roles || [];
  const rawRoles: any[] = (user as any)?.rawRoles || [];
  const scope = getUserScope(userRoles, rawRoles);
  const isManager = canManageReports(userRoles, rawRoles);

  const [reports, setReports] = useState<ReportInstanceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = isManager ? await adminReportService.list() : await adminReportService.getMyReports();
      setReports(Array.isArray(data) ? data : ((data as any)?.content || (data as any)?.data || []));
    } catch {
      message.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const performAction = async (id: string, action: 'validate' | 'finalize' | 'archive') => {
    setActionLoading(`${action}-${id}`);
    try {
      if (action === 'validate') await adminReportService.validate(id);
      else if (action === 'finalize') await adminReportService.finalize(id);
      else await adminReportService.archive(id);
      message.success('Action effectuée avec succès.');
      fetchReports();
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

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const matchStatus = statusFilter === 'ALL' || r.workflowStatus === statusFilter;
      const matchSearch = !search ||
        r.title.toLowerCase().includes(search.toLowerCase()) ||
        (r.committeeName ?? '').toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [reports, statusFilter, search]);

  const columns = [
    {
      title: 'Rapport',
      key: 'title',
      render: (_: any, r: ReportInstanceDTO) => (
        <Space>
          <Avatar icon={<FileTextOutlined />} style={{ background: r.reportLevel === 'URGENT' ? 'var(--crt-red)' : '#6366f1' }} size="small" />
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
          { key: 'view', icon: <EyeOutlined />, label: 'Voir', onClick: () => navigate(`/reporting/reports/${r.id}`) },
          ...(r.workflowStatus === 'DRAFT' ? [{ key: 'fill', icon: <EditOutlined />, label: 'Remplir', onClick: () => navigate(`/reporting/reports/${r.id}/fill`) }] : []),
          ...(isManager && r.workflowStatus === 'SUBMITTED' ? [{ key: 'validate', icon: <CheckCircleOutlined />, label: 'Valider', onClick: () => performAction(r.id, 'validate') }] : []),
          ...(isManager && r.workflowStatus === 'VALIDATED' ? [{ key: 'finalize', icon: <ThunderboltOutlined />, label: 'Finaliser', onClick: () => performAction(r.id, 'finalize') }] : []),
          ...(isManager && r.workflowStatus === 'FINALIZED' && scope !== 'LOCAL' ? [{ key: 'archive', icon: <LockOutlined />, label: 'Archiver', onClick: () => performAction(r.id, 'archive') }] : []),
          ...(r.workflowStatus === 'ARCHIVED' ? [{ key: 'pdf', icon: <FilePdfOutlined />, label: 'Télécharger PDF', onClick: () => handleDownloadPdf(r.id) }] : []),
        ];
        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} size="small" loading={actionLoading?.includes(r.id)} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: 'var(--text-primary)' }}>Rapports</Title>
          <Text type="secondary">Consultez et gérez l'ensemble des rapports</Text>
        </div>
      </div>

      <Card size="small" style={{ marginBottom: 16 }} className="glass-card">
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
            style={{ width: 180 }}
            options={[
              { value: 'ALL', label: 'Tous les statuts' },
              { value: 'DRAFT', label: <Space><EditOutlined style={{ color: '#1890ff' }} />Brouillons</Space> },
              { value: 'SUBMITTED', label: <Space><CloudUploadOutlined style={{ color: '#faad14' }} />Soumis</Space> },
              { value: 'VALIDATED', label: <Space><CheckCircleOutlined style={{ color: '#52c41a' }} />Validés</Space> },
              { value: 'FINALIZED', label: <Space><FlagOutlined style={{ color: '#eb2f96' }} />Finalisés</Space> },
              { value: 'ARCHIVED', label: <Space><FolderOutlined style={{ color: '#8c8c8c' }} />Archivés</Space> },
            ]}
          />
          <Text style={{ fontSize: 12, color: '#999' }}>
            {filteredReports.length} rapport{filteredReports.length > 1 ? 's' : ''}
          </Text>
        </Space>
      </Card>

      <Card className="glass-card">
        {loading ? (
          <div className="flex justify-center py-12"><Spin size="large" /></div>
        ) : (
          <Table
            dataSource={filteredReports}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 15, showTotal: (t) => `${t} rapports` }}
            size="middle"
            scroll={{ x: 700 }}
            locale={{ emptyText: <Empty description="Aucun rapport" /> }}
          />
        )}
      </Card>
    </div>
  );
}
