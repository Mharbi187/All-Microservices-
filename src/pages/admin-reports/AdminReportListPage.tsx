// ============================================================
// Admin Report List Page
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  Button, Card, Col, Row, Space, Spin, Table, Tag, Typography, message, Tooltip, Select
} from 'antd';
import { PlusOutlined, FileTextOutlined, FilePdfOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { adminReportService } from '@/services/adminReportService';
import StatusBadge from '@/components/shared/StatusBadge';
import type { ReportInstanceDTO, ReportWorkflowStatus } from '@/types/template.types';

const { Title, Text } = Typography;

const AdminReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportInstanceDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = statusFilter === 'ALL'
        ? await adminReportService.list()
        : await adminReportService.getByStatus(statusFilter);
      setReports(data);
    } catch {
      message.error('Impossible de charger les rapports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, [statusFilter]);

  const handleDownloadPdf = async (id: string) => {
    try {
      const blob = await adminReportService.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Erreur lors du téléchargement PDF');
    }
  };

  const columns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      render: (t: string) => <strong>{t}</strong>,
    },
    {
      title: 'Statut',
      dataIndex: 'workflowStatus',
      key: 'workflowStatus',
      render: (s: ReportWorkflowStatus) => <StatusBadge status={s} />,
    },
    {
      title: 'Niveau',
      dataIndex: 'reportLevel',
      key: 'reportLevel',
      render: (l: string) => (
        <Tag color={l === 'URGENT' ? 'error' : 'default'}>{l}</Tag>
      ),
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
      render: (_: unknown, record: ReportInstanceDTO) => (
        <Space>
          <Tooltip title="Voir le rapport">
            <Button type="text" icon={<FileTextOutlined />} onClick={() => navigate(`/admin-reports/${record.id}`)} />
          </Tooltip>
          {record.workflowStatus === 'ARCHIVED' && (
            <Tooltip title="Télécharger PDF">
              <Button type="text" icon={<FilePdfOutlined />} onClick={() => handleDownloadPdf(record.id)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>Rapports administratifs</Title>
          <Text type="secondary">Suivi du cycle de vie complet des rapports</Text>
        </Col>
        <Col>
          <Space>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tous' },
                { value: 'DRAFT', label: 'Brouillons' },
                { value: 'SUBMITTED', label: 'Soumis' },
                { value: 'VALIDATED', label: 'Validés' },
                { value: 'FINALIZED', label: 'Finalisés' },
                { value: 'ARCHIVED', label: 'Archivés' },
              ]}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/templates')}>
              Nouveau rapport
            </Button>
          </Space>
        </Col>
      </Row>

      <Card>
        <Spin spinning={loading}>
          <Table
            dataSource={reports}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Aucun rapport disponible' }}
          />
        </Spin>
      </Card>
    </div>
  );
};

export default AdminReportListPage;
