// ============================================================
// Report Detail Page — View report, signatures, audit trail, workflow actions
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Descriptions, Divider, List, Row, Space, Spin,
  Timeline, Typography, message, Popconfirm, Alert, Tag
} from 'antd';
import {
  CheckOutlined, LockOutlined, FilePdfOutlined, ArrowLeftOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined, SyncOutlined
} from '@ant-design/icons';
import { adminReportService } from '@/services/adminReportService';
import { signatureService } from '@/services/signatureService';
import WorkflowTimeline from '@/components/shared/WorkflowTimeline';
import StatusBadge from '@/components/shared/StatusBadge';
import RenderEngine from '@/components/renderer/RenderEngine';
import { useAuthStore } from '@/stores/authStore';
import type { ReportInstanceDTO, ReportWorkflowStatus, SignatureDTO, AuditLogEntry } from '@/types/template.types';

const { Title, Text } = Typography;

const ReportDetailPage: React.FC = () => {
  const { user } = useAuthStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportInstanceDTO | null>(null);
  const [signatures, setSignatures] = useState<SignatureDTO[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [r, sigs, audit] = await Promise.all([
        adminReportService.getById(id),
        signatureService.getByReport(id),
        adminReportService.getAuditTrail(id),
      ]);
      setReport(r);
      setSignatures(sigs);
      setAuditLog(audit);
    } catch {
      message.error('Impossible de charger les données du rapport');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const performAction = async (action: 'validate' | 'finalize' | 'archive') => {
    if (!id) return;
    setActionLoading(action);
    try {
      if (action === 'validate') await adminReportService.validate(id);
      else if (action === 'finalize') await adminReportService.finalize(id);
      else await adminReportService.archive(id);
      message.success('Action effectuée avec succès.');
      await loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erreur lors de l\'action');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    try {
      const blob = await adminReportService.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `rapport-${id}.pdf`; 
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Erreur lors du téléchargement');
    }
  };

  const handleExportDraft = async () => {
    if (!id) return;
    try {
      const blob = await adminReportService.exportDraftPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `draft-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      message.error('Erreur lors de l\'export du brouillon');
    }
  };

  const handleGeneratePdf = async () => {
    if (!id) return;
    setActionLoading('generatePdf');
    try {
      await adminReportService.regenerateOfficialPdf(id, true);
      message.success('PDF officiel généré avec succès');
      await loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erreur lors de la génération du PDF');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <Spin fullscreen />;
  if (!report) return <Alert type="error" message="Rapport introuvable" />;

  const status = report.workflowStatus as ReportWorkflowStatus;

  // RBAC Checks
  const isOwner = report.filledBy === user?.id;
  const isAssigned = report.assignedUsers?.includes(user?.id || '') || false;
  const isPresidentOrSG = user?.roles?.some(r => r === 'PRESIDENT' || r === 'SECRETAIRE_GENERAL') || false;
  const isResponsable = user?.roles?.some(r => r === 'RESPONSABLE') || false;

  const canGenerate = (isPresidentOrSG || isResponsable) && (status === 'FINALIZED' || status === 'ARCHIVED');
  const canDownload = (isPresidentOrSG || isOwner || isAssigned) && status === 'ARCHIVED';
  const canExportDraft = (isOwner || isAssigned);
  const canFill = (isOwner || isAssigned) && (status === 'DRAFT' || status === 'SUBMITTED');

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin-reports')} type="text" />
            <div>
              <Title level={4} style={{ margin: 0 }}>{report.title}</Title>
              <StatusBadge status={status} />
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            {status === 'SUBMITTED' && (
              <Popconfirm title="Valider ce rapport ?" onConfirm={() => performAction('validate')}>
                <Button type="primary" icon={<CheckOutlined />} loading={actionLoading === 'validate'}>Valider</Button>
              </Popconfirm>
            )}
            {status === 'VALIDATED' && (
              <Popconfirm title="Finaliser ce rapport ?" onConfirm={() => performAction('finalize')}>
                <Button type="primary" icon={<ThunderboltOutlined />} loading={actionLoading === 'finalize'}>Finaliser</Button>
              </Popconfirm>
            )}
            {status === 'FINALIZED' && (
              <Popconfirm
                title="Archiver ce rapport ?"
                description="Le rapport sera archivé de façon permanente."
                onConfirm={() => performAction('archive')}
              >
                <Button type="default" icon={<LockOutlined />} loading={actionLoading === 'archive'}>Archiver</Button>
              </Popconfirm>
            )}
            
            {/* Conditional Action Buttons based on RBAC */}
            {canExportDraft && status !== 'ARCHIVED' && (
              <Button onClick={handleExportDraft}>Export Brouillon</Button>
            )}
            
            {canGenerate && (
              <Button 
                type="dashed" 
                icon={<SyncOutlined />} 
                loading={actionLoading === 'generatePdf'} 
                onClick={handleGeneratePdf}
              >
                Générer PDF Officiel
              </Button>
            )}
            
            {canDownload && (
              <Button type="primary" icon={<FilePdfOutlined />} onClick={handleDownloadPdf}>
                Télécharger PDF
              </Button>
            )}
            
            {canFill && (
              <Button onClick={() => navigate(`/admin-reports/${id}/fill`)}>Remplir</Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Workflow */}
      <WorkflowTimeline status={status} />

      {/* Archive integrity */}
      {report.contentHash && (
        <Alert
          type="success"
          icon={<SafetyCertificateOutlined />}
          showIcon
          message="Rapport archivé et intègre"
          description={`Hash SHA-256: ${report.contentHash}`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={16}>
        {/* Report content */}
        <Col span={16}>
          <Card title="Contenu du rapport">
            <RenderEngine
              structure={(report as any).templateVersion?.structure}
              filledData={(report.filledData as Record<string, unknown>) ?? {}}
              mode="readonly"
            />
          </Card>
        </Col>

        {/* Signatures + Audit */}
        <Col span={8}>
          {/* Signatures */}
          <Card
            title={`Signatures (${signatures.length})`}
            style={{ marginBottom: 16 }}
            size="small"
          >
            {signatures.length === 0 ? (
              <Text type="secondary">Aucune signature</Text>
            ) : (
              <List
                dataSource={signatures}
                renderItem={(sig) => (
                  <List.Item key={sig.id}>
                    <div>
                      <Tag color="blue">{sig.signerRole}</Tag>
                      <br />
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {new Date(sig.signedAt).toLocaleString('fr-FR')}
                      </Text>
                      {sig.verified && <Tag color="success" style={{ marginLeft: 4 }}>✓ Vérifié</Tag>}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>

          {/* Audit trail */}
          <Card title="Journal d'audit" size="small">
            <Timeline
              items={auditLog.map((entry) => ({
                key: entry.id,
                children: (
                  <div>
                    <Text strong>{entry.action}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {new Date(entry.performedAt).toLocaleString('fr-FR')}
                    </Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default ReportDetailPage;
