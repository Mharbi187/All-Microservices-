// ============================================================
// TemplateVersionsModal — Version History with CRT Document Preview
// Shows version list + live preview with official CRT header/footer
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  Modal, Table, Tag, Button, Space, message, Spin,
  Popconfirm, Typography, Drawer, Empty,
} from 'antd';
import {
  FilePdfOutlined, CheckCircleOutlined, EyeOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { templateBuilderService } from '@/services/templateBuilderService';
import type { TemplateVersionDTO } from '@/types/template.types';
import OfficialDocumentWrapper from '@/components/renderer/OfficialDocumentWrapper';
import PrintRenderer from '@/components/renderer/PrintRenderer';
import { exportOfficialPDF, previewOfficialPDF } from '@/utils/reportUtils';

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
  const [previewVersion, setPreviewVersion] = useState<TemplateVersionDTO | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchVersions = async () => {
    if (!templateId) return;
    setLoading(true);
    try {
      const data = await templateBuilderService.getVersionHistory(templateId);
      setVersions(data);
    } catch {
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
    } catch {
      message.error('Erreur lors du téléchargement du PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePreview = (version: TemplateVersionDTO) => {
    setPreviewVersion(version);
    setPreviewOpen(true);
  };

  const handlePrintPreview = () => {
    previewOfficialPDF('crt-version-preview', `Modele-${templateTitle}`);
  };

  const handleExportPDF = () => {
    exportOfficialPDF('crt-version-preview', `Modele-${templateTitle}`);
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
      title: 'Résumé',
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
          {/* ── Preview with official CRT header/footer ── */}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            Voir
          </Button>

          {record.status === 'DRAFT' && (
            <Popconfirm
              title="Publier cette version ?"
              description="Cela verrouillera ce brouillon et le rendra disponible pour les rapports."
              onConfirm={() => handlePublish(record.id)}
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={actionLoading === `publish-${record.id}`}
              >
                Publier
              </Button>
            </Popconfirm>
          )}
          <Button
            size="small"
            icon={<FilePdfOutlined />}
            onClick={() => handleDownloadPdf(record)}
            loading={actionLoading === `pdf-${record.id}`}
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  const previewStructure = (previewVersion as any)?.structure;

  return (
    <>
      {/* ══════════ VERSIONS LIST MODAL ══════════ */}
      <Modal
        open={open}
        onCancel={onClose}
        title={<span>Versions de <Text type="secondary">{templateTitle}</Text></span>}
        footer={null}
        width={800}
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

      {/* ══════════ VERSION PREVIEW DRAWER ══════════ */}
      <Drawer
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={
          <Space>
            <Text strong>Aperçu officiel</Text>
            {previewVersion && <Tag color="blue">v{previewVersion.versionNumber}</Tag>}
            <Tag color="gray">{templateTitle}</Tag>
          </Space>
        }
        width="70vw"
        extra={
          <Space>
            <Button icon={<EyeOutlined />} onClick={handlePrintPreview}>
              Aperçu impression
            </Button>
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handleExportPDF}
              style={{ background: '#C8102E', borderColor: '#C8102E' }}
            >
              Exporter PDF
            </Button>
          </Space>
        }
        styles={{
          body: {
            background: '#f0f0f0',
            padding: '24px',
            display: 'flex',
            justifyContent: 'center',
            overflowY: 'auto',
          },
        }}
      >
        {previewVersion ? (
          <OfficialDocumentWrapper
            id="crt-version-preview"
            meta={{
              reference: `V${previewVersion.versionNumber}`,
              dateAr: new Date(previewVersion.createdAt).toLocaleDateString('ar-TN', {
                year: 'numeric', month: 'long', day: 'numeric',
              }),
              location: 'تونس',
            }}
            showSender={false}
            showSignature={false}
          >
            {previewStructure && previewStructure.length > 0 ? (
              <PrintRenderer
                structure={previewStructure}
                filledData={{}}
                mode="preview"
                showLetterhead={false}
                showShell={false}
              />
            ) : (
              <Empty description="Aucune structure pour cette version" style={{ padding: '40px 0' }} />
            )}
          </OfficialDocumentWrapper>
        ) : (
          <Empty description="Sélectionnez une version pour la prévisualiser" />
        )}
      </Drawer>
    </>
  );
};

export default TemplateVersionsModal;
