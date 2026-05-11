import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Table, Tag, Space, Typography, Spin, Empty, Button, Tooltip, Alert } from 'antd';
import { 
  AppstoreOutlined, PlusOutlined, EditOutlined, FilePdfOutlined, UserAddOutlined
} from '@ant-design/icons';
import { templateBuilderService } from '@/services/templateBuilderService';
import { useAuthStore } from '@/stores';
import { SCOPE_COLOR, getUserScope } from '@/utils/reportingRoles';
import ReportAssignModal from '@/components/shared/ReportAssignModal';
import TemplateVersionsModal from '@/pages/templates/components/TemplateVersionsModal';
import type { TemplateDTO } from '@/types/template.types';

const { Title, Text } = Typography;

export default function ReportingTemplatesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const userRoles: string[] = user?.roles || [];
  const rawRoles: any[] = (user as any)?.rawRoles || [];
  const scope = getUserScope(userRoles, rawRoles);

  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState<{ open: boolean; templateId?: string }>({ open: false });
  const [versionsModalOpen, setVersionsModalOpen] = useState<{ open: boolean; templateId: string; templateTitle: string }>({ open: false, templateId: '', templateTitle: '' });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data: any = await templateBuilderService.list();
      const arrayData = Array.isArray(data) ? data : (data?.content || data?.data || []);
      setTemplates(arrayData.filter((t: any) => t.isActive && t.version > 0));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const columns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => (
        <Space>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--crt-red)' }}></div>
          <Text strong>{t}</Text>
        </Space>
      ),
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

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: 'var(--text-primary)' }}>Modèles de Rapports</Title>
          <Text type="secondary">Gérez les structures et modèles de rapports ({scope})</Text>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => navigate('/templates/new')}>Nouveau modèle</Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAssignModalOpen({ open: true })} style={{ background: 'var(--crt-red)' }}>
            Affecter un rapport
          </Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, background: 'var(--crt-gray-bg)', border: '1px solid var(--input-border)' }}
        message={
          <span>
            Votre niveau hiérarchique : <Tag color={SCOPE_COLOR[scope]}>{scope}</Tag>
            {scope === 'NATIONAL' && ' — Vous pouvez créer et affecter des modèles pour tous les niveaux.'}
            {scope === 'REGIONAL' && ' — Vous pouvez créer et affecter des modèles pour le niveau Régional et Local.'}
            {scope === 'LOCAL' && ' — Vous pouvez créer des modèles Locaux uniquement.'}
          </span>
        }
      />

      <Card className="glass-card">
        <Spin spinning={loading}>
          <Table
            dataSource={templates}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: <Empty description="Aucun modèle disponible" /> }}
            size="middle"
          />
        </Spin>
      </Card>

      <ReportAssignModal
        open={assignModalOpen.open}
        defaultTemplateId={assignModalOpen.templateId}
        onClose={() => setAssignModalOpen({ open: false })}
        onSuccess={() => {}} // No strict refresh needed here unless we list assigned reports
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
}
