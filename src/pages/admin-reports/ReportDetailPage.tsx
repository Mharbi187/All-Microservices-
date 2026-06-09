// ============================================================
// Report Detail Page — Official CRT Document View
// View report with official letterhead, signatures, audit trail
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Row, Space, Spin,
  Timeline, Typography, message, Popconfirm, Alert, Tag, List, Modal, Switch
} from 'antd';
import {
  CheckOutlined, LockOutlined, FilePdfOutlined, ArrowLeftOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined, SyncOutlined, PrinterOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { adminReportService } from '@/services/adminReportService';
import { signatureService } from '@/services/signatureService';
import WorkflowTimeline from '@/components/shared/WorkflowTimeline';
import StatusBadge from '@/components/shared/StatusBadge';
import PrintRenderer from '@/components/renderer/PrintRenderer';
import OfficialDocumentWrapper from '@/components/renderer/OfficialDocumentWrapper';
import { useAuthStore } from '@/stores/authStore';
import { exportOfficialPDF, previewOfficialPDF } from '@/utils/reportUtils';
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

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [encryptArchive, setEncryptArchive] = useState(true);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [r, sigs, audit] = await Promise.all([
        adminReportService.getById(id),
        signatureService.getByReport(id).catch(() => []),
        adminReportService.getAuditTrail(id).catch(() => []),
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
      else {
        await adminReportService.archive(id, encryptArchive);
        setArchiveModalOpen(false);
      }
      message.success('Action effectuée avec succès.');
      await loadData();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erreur lors de l\'action');
    } finally {
      setActionLoading(null);
    }
  };

  // ── PDF Export — Official CRT Document ──────────────────────
  const handlePrintPdf = () => {
    if (!report || !id) return;
    message.loading({ content: 'Préparation du document officiel...', key: 'pdfGen' });
    try {
      exportOfficialPDF('crt-official-document', `CRT_Rapport_${report.title.replace(/\s+/g, '_')}`);
      message.success({ content: 'Document prêt — utilisez "Enregistrer en PDF" dans la boîte de dialogue.', key: 'pdfGen', duration: 5 });
    } catch {
      message.error({ content: 'Erreur lors de la génération', key: 'pdfGen' });
    }
  };

  // ── Preview before print ────────────────────────────────────
  const handlePreview = () => {
    if (!report) return;
    previewOfficialPDF('crt-official-document', `CRT_Rapport_${report.title.replace(/\s+/g, '_')}`);
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
  const isSecGenOrAbove = user?.roles?.some(r => ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL'].includes(r)) || false;
  const isResponsable = (user?.roles as string[])?.some(r => r === 'RESPONSABLE') || false;
  const canArchive = (user?.roles as string[])?.some(r => ['PRESIDENT'].includes(r)) || false;

  const canGenerate = isSecGenOrAbove && (status === 'FINALIZED' || status === 'ARCHIVED');
  const canDownload = true; // Always allow preview/print of official document
  const canExportDraft = (isOwner || isAssigned) && isResponsable;
  const canFill = (isOwner || isAssigned) && (status === 'DRAFT' || status === 'SUBMITTED');

  // ── Dynamic date formatting in Arabic ───────────────────────
  const formatDateAr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const months = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Archive Modal */}
      <Modal
        title="Archiver le rapport"
        open={archiveModalOpen}
        onOk={() => performAction('archive')}
        onCancel={() => setArchiveModalOpen(false)}
        confirmLoading={actionLoading === 'archive'}
        okText="Archiver"
        cancelText="Annuler"
      >
        <p>Voulez-vous vraiment archiver ce rapport de façon permanente ?</p>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={encryptArchive} onChange={setEncryptArchive} />
          <span>Chiffrer les données avec AES-256 (Sécurité renforcée)</span>
        </div>
      </Modal>

      {/* ══════════ HEADER BAR ══════════ */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} className="no-print">
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
            {isSecGenOrAbove && status === 'SUBMITTED' && (
              <Popconfirm title="Valider ce rapport ?" onConfirm={() => performAction('validate')}>
                <Button type="primary" icon={<CheckOutlined />} loading={actionLoading === 'validate'}>Valider</Button>
              </Popconfirm>
            )}
            {isSecGenOrAbove && status === 'VALIDATED' && (
              <Popconfirm title="Finaliser ce rapport ?" onConfirm={() => performAction('finalize')}>
                <Button type="primary" icon={<ThunderboltOutlined />} loading={actionLoading === 'finalize'}>Finaliser</Button>
              </Popconfirm>
            )}
            {canArchive && status === 'FINALIZED' && (
              <Button type="default" icon={<LockOutlined />} onClick={() => setArchiveModalOpen(true)}>Archiver</Button>
            )}

            {canExportDraft && status !== 'ARCHIVED' && (
              <Button onClick={handleExportDraft}>Export Brouillon</Button>
            )}

            {canGenerate && (
              <Button type="dashed" icon={<SyncOutlined />} loading={actionLoading === 'generatePdf'} onClick={handleGeneratePdf}>
                Générer PDF Officiel
              </Button>
            )}

            {/* ★ Preview — aperçu avant impression */}
            {isSecGenOrAbove && (
              <Button
                icon={<EyeOutlined />}
                onClick={handlePreview}
              >
                Aperçu
              </Button>
            )}

            {/* ★ Official PDF Export — primary action */}
            {isSecGenOrAbove && (
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrintPdf}
                style={{ background: '#C8102E', borderColor: '#C8102E' }}
              >
                Exporter PDF
              </Button>
            )}

            {canFill && (
              <Button onClick={() => navigate(`/admin-reports/${id}/fill`)}>Remplir</Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Workflow */}
      <div className="no-print">
        <WorkflowTimeline status={status} />
      </div>

      {/* Archive integrity */}
      {report.contentHash && (
        <Alert
          type="success"
          icon={<SafetyCertificateOutlined />}
          showIcon
          message="Rapport archivé et intègre"
          description={`Hash SHA-256: ${report.contentHash}`}
          style={{ marginBottom: 16 }}
          className="no-print"
        />
      )}

      <Row gutter={16}>
        {/* ══════════ OFFICIAL DOCUMENT PREVIEW ══════════ */}
        <Col span={16}>
          {isSecGenOrAbove ? (
            <Card
              title="Document Officiel"
              className="no-print"
              styles={{ body: { padding: 0, background: '#f5f5f5' } }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{ padding: 24, overflowX: 'auto', display: 'flex', justifyContent: 'center' }}>
                {(() => {
                  const structure = (report as any).templateVersion?.structure ?? [];
                  const pageGroups: any[][] = [];
                  let currentGroup: any[] = [];
                  structure.forEach((el: any) => {
                    if (el.type === 'page_break') { pageGroups.push(currentGroup); currentGroup = []; }
                    else { currentGroup.push(el); }
                  });
                  pageGroups.push(currentGroup);
                  return (
                    <OfficialDocumentWrapper
                      header={{ logoUrl: '/logos/logo_symbole.png', primaryColor: '#C8102E' }}
                      meta={{
                        reference: `${new Date(report.createdAt).getMonth() + 1}/${new Date(report.createdAt).getFullYear().toString().slice(-2)}`,
                        dateAr: formatDateAr(report.createdAt),
                        location: 'تونس',
                        senderName: report.assignedToName || undefined,
                        senderRole: report.reportLevel === 'URGENT' ? 'تقرير عاجل' : undefined,
                        recipient: report.committeeName || undefined,
                      }}
                      signature={{
                        name: report.assignedToName || undefined,
                        closingFormula: 'مع فائق التقدير',
                        showStamp: true,
                      }}
                      showSender={!!(report.assignedToName || report.committeeName)}
                      showSignature={status === 'FINALIZED' || status === 'ARCHIVED'}
                      pageGroups={pageGroups.map((group, idx) => (
                        <PrintRenderer
                          key={idx}
                          structure={group}
                          filledData={(report.filledData as Record<string, unknown>) ?? {}}
                          mode="readonly"
                          showLetterhead={false}
                          showShell={false}
                        />
                      ))}
                    />
                  );
                })()}
              </div>
            </Card>
          ) : (
            <Card title="Données du rapport" className="no-print">
              <PrintRenderer
                structure={(report as any).templateVersion?.structure ?? []}
                filledData={(report.filledData as Record<string, unknown>) ?? {}}
                mode="readonly"
                showLetterhead={false}
                showShell={false}
              />
            </Card>
          )}
        </Col>

        {/* ══════════ SIDEBAR — Signatures + Audit ══════════ */}
        <Col span={8} className="no-print">
          {/* Signatures */}
          <Card title={`Signatures (${signatures.length})`} style={{ marginBottom: 16 }} size="small">
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
