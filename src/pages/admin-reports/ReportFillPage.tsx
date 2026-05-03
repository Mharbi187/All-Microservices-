// ============================================================
// Report Fill Page — Fill a DRAFT report with debounced autosave
// ============================================================
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Card, Col, Row, Space, Spin, Typography, message, Alert, Popconfirm
} from 'antd';
import {
  SaveOutlined, SendOutlined, ArrowLeftOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { adminReportService } from '@/services/adminReportService';
import { signatureService } from '@/services/signatureService';
import RenderEngine from '@/components/renderer/RenderEngine';
import WorkflowTimeline from '@/components/shared/WorkflowTimeline';
import SignatureModal from '@/components/shared/SignatureModal';
import type { ReportInstanceDTO, ReportWorkflowStatus } from '@/types/template.types';

const { Title, Text } = Typography;

// Simple debounce utility (avoids lodash dependency)
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

const ReportFillPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportInstanceDTO | null>(null);
  const [filledData, setFilledData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigLoading, setSigLoading] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (!id) return;
    adminReportService.getById(id)
      .then((r) => {
        setReport(r);
        setFilledData((r.filledData as Record<string, unknown>) ?? {});
      })
      .catch(() => message.error('Impossible de charger le rapport'))
      .finally(() => setLoading(false));
  }, [id]);

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (autoSaveStatus === 'saving') { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [autoSaveStatus]);

  // Debounced autosave — fires 1500ms after last change
  const debouncedSave = useMemo(
    () =>
      debounce(async (data: Record<string, unknown>) => {
        if (!id) return;
        setAutoSaveStatus('saving');
        try {
          await adminReportService.updateFilledData(id, data);
          setAutoSaveStatus('saved');
        } catch {
          setAutoSaveStatus('error');
        }
      }, 1500),
    [id]
  );

  const handleFieldChange = useCallback(
    (fieldId: string, value: unknown) => {
      setFilledData((prev) => {
        const next = { ...prev, [fieldId]: value };
        debouncedSave(next);
        setAutoSaveStatus('saving');
        return next;
      });
    },
    [debouncedSave]
  );

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await adminReportService.submit(id);
      message.success('Rapport soumis pour validation.');
      navigate('/admin-reports');
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignature = async (imageBase64: string) => {
    if (!id) return;
    setSigLoading(true);
    try {
      await signatureService.save(id, imageBase64);
      message.success('Signature enregistrée avec succès.');
      setSigModalOpen(false);
    } catch {
      message.error('Erreur lors de l\'enregistrement de la signature');
    } finally {
      setSigLoading(false);
    }
  };

  if (loading) return <Spin fullscreen />;
  if (!report) return <Alert type="error" message="Rapport introuvable" />;

  const isEditable = report.workflowStatus === 'DRAFT';

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin-reports')} type="text" />
            <div>
              <Title level={4} style={{ margin: 0 }}>{report.title}</Title>
              <Text type="secondary">
                {autoSaveStatus === 'saving' && '⏳ Sauvegarde automatique...'}
                {autoSaveStatus === 'saved' && '✅ Sauvegardé'}
                {autoSaveStatus === 'error' && '❌ Erreur de sauvegarde'}
              </Text>
            </div>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<CheckCircleOutlined />}
              onClick={() => setSigModalOpen(true)}
              disabled={!isEditable}
            >
              Signer
            </Button>
            <Popconfirm
              title="Soumettre le rapport ?"
              description="Une fois soumis, le rapport ne peut plus être modifié."
              onConfirm={handleSubmit}
              disabled={!isEditable}
            >
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                disabled={!isEditable}
              >
                Soumettre
              </Button>
            </Popconfirm>
          </Space>
        </Col>
      </Row>

      {/* Workflow timeline */}
      <WorkflowTimeline status={report.workflowStatus as ReportWorkflowStatus} />

      {/* Report form */}
      <Card>
        <RenderEngine
          structure={(report as any).templateVersion?.structure}
          filledData={filledData}
          mode={isEditable ? 'fill' : 'readonly'}
          onChange={handleFieldChange}
        />
      </Card>

      {/* Signature modal */}
      <SignatureModal
        open={sigModalOpen}
        onClose={() => setSigModalOpen(false)}
        onSave={handleSignature}
        loading={sigLoading}
      />
    </div>
  );
};

export default ReportFillPage;
