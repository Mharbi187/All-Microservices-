import React, { useState, useEffect } from 'react';
import { Modal, Table, Tag, Button, Space, message, Spin, Popconfirm, Typography } from 'antd';
import { FilePdfOutlined, CheckCircleOutlined, CopyOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { templateBuilderService } from '@/services/templateBuilderService';
import type { TemplateVersionDTO } from '@/types/template.types';

const { Text } = Typography;

interface Props {
  templateId: string;
  templateTitle: string;
  open: boolean;
  onClose: () => void;
}

const TemplateVersionsModal: React.FC<Props> = ({ templateId, templateTitle, open, onClose }) => {
  const [versions, setVersions] = useState<TemplateVersionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchVersions = async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const data = await templateBuilderService.getVersionHistory(templateId);
      setVersions(data);
    } catch (err) {
      message.error('Erreur lors du chargement des versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchVersions();
  }, [open, templateId]);

  const handlePublish = async (versionId: string) => {
    setActionLoading(`publish-${versionId}`);
    try {
      await templateBuilderService.publishVersion(versionId);
      message.success('Version publiée avec succès');
      fetchVersions();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Erreur lors de la publication');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async (version: TemplateVersionDTO) => {
    setActionLoading(`pdf-${version.id}`);
    try {
      const blob = await templateBuilderService.downloadVersionPdf(templateId, version.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `modele-${templateId}-v${version.versionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      message.error('Erreur lors du téléchargement du PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      title: 'Version',
      dataIndex: 'versionNumber',
      key: 'versionNumber',
      render: (v: number) => <Text strong>v{v}</Text>,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => {
        let color = 'default';
        if (s === 'PUBLISHED') color = 'green';
        if (s === 'ARCHIVED') color = 'purple';
        if (s === 'DRAFT') color = 'orange';
        return <Tag color={color}>{s}</Tag>;
      },
    },
    {
      title: 'Résumé des modifications',
      dataIndex: 'changeSummary',
      key: 'changeSummary',
      render: (txt: string) => txt || <Text type="secondary">Aucun résumé</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => new Date(d).toLocaleDateString('fr-FR'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: TemplateVersionDTO) => (
        <Space>
          {record.status === 'DRAFT' && (
            <Popconfirm
              title="Publier cette version ?"
              description="Cela verrouillera ce brouillon et le rendra disponible pour les rapports."
              onConfirm={() => handlePublish(record.id)}
            >
              <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={actionLoading === `publish-${record.id}`}>
                Publier
              </Button>
            </Popconfirm>
          )}
          <Button size="small" icon={<FilePdfOutlined />} onClick={() => handleDownloadPdf(record)} loading={actionLoading === `pdf-${record.id}`}>
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={<span>Versions de <Text type="secondary">{templateTitle}</Text></span>}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Table
          dataSource={versions}
          columns={columns}
          rowKey="id"
          pagination={false}
          size="middle"
        />
      </Spin>
    </Modal>
  );
};

export default TemplateVersionsModal;
