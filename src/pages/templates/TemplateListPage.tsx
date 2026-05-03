// ============================================================
// Template List Page
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  Button, Card, Col, Row, Space, Spin, Table, Tag, Typography, message, Tooltip
} from 'antd';
import {
  PlusOutlined, EditOutlined, EyeOutlined, BranchesOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { templateBuilderService } from '@/services/templateBuilderService';
import type { TemplateDTO } from '@/types/template.types';

const { Title, Text } = Typography;

const SCOPE_COLORS = { NATIONAL: 'volcano', REGIONAL: 'blue', LOCAL: 'green' };

const TemplateListPage: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    templateBuilderService.list()
      .then(setTemplates)
      .catch(() => message.error('Impossible de charger les modèles'))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <strong>{t}</strong>,
    },
    {
      title: 'Portée',
      dataIndex: 'scope',
      key: 'scope',
      render: (s: string) =>
        s ? <Tag color={SCOPE_COLORS[s as keyof typeof SCOPE_COLORS] ?? 'default'}>{s}</Tag> : '—',
    },
    {
      title: 'Statut',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (a: boolean) => <Tag color={a ? 'success' : 'default'}>{a ? 'Actif' : 'Inactif'}</Tag>,
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      render: (v: number) => `v${v}`,
    },
    {
      title: 'Créé le',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, record: TemplateDTO) => (
        <Space>
          <Tooltip title="Modifier">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/templates/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="Versions">
            <Button
              type="text"
              icon={<BranchesOutlined />}
              onClick={() => navigate(`/templates/${record.id}/versions`)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Modèles de rapports</Title>
          <Text type="secondary">Gérez les modèles de rapports par portée hiérarchique</Text>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/templates/new')}
          >
            Nouveau modèle
          </Button>
        </Col>
      </Row>

      <Card>
        <Spin spinning={loading}>
          <Table
            dataSource={templates}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Aucun modèle disponible' }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default TemplateListPage;
