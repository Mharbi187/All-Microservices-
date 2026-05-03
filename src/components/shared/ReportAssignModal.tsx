// ============================================================
// ReportAssignModal — Affecter un rapport à un utilisateur
// RC branding · Responsive · Improved UX · Step-by-step feel
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Input, Select, Radio, Space, Typography,
  message, Spin, Tag, Divider, Alert, Avatar,
} from 'antd';
import {
  UserAddOutlined, FileTextOutlined, TagOutlined,
  TeamOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { templateBuilderService } from '@/services/templateBuilderService';
import { adminReportService } from '@/services/adminReportService';
import volunteerService from '@/services/volunteerService';
import type { TemplateDTO, TemplateVersionDTO } from '@/types/template.types';

const { Text } = Typography;

const RC_RED = '#CC0000';
const RC_FONT = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

const SCOPE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  NATIONAL: { color: '#991B1B', bg: '#FEF2F2', label: 'National' },
  REGIONAL: { color: '#1D4ED8', bg: '#EFF6FF', label: 'Régional' },
  LOCAL: { color: '#15803D', bg: '#F0FDF4', label: 'Local' },
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allowedScope?: 'NATIONAL' | 'REGIONAL' | 'LOCAL';
  defaultTemplateId?: string;
}

interface Volunteer {
  id: string;
  fullName: string;
  email: string;
  committeeId?: string;
}

// Initials avatar helper
const InitialsAvatar: React.FC<{ name: string }> = ({ name }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#EFF6FF',
        color: '#1D4ED8',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
        fontFamily: RC_FONT,
      }}
    >
      {initials}
    </span>
  );
};

const ReportAssignModal: React.FC<Props> = ({ open, onClose, onSuccess, allowedScope, defaultTemplateId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState<TemplateDTO[]>([]);
  const [versions, setVersions] = useState<TemplateVersionDTO[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);

  const selectedTemplateId = Form.useWatch('templateId', form);
  const selectedVersionId = Form.useWatch('versionId', form);

  // ── Load on open ────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setLoading(true);

    if (defaultTemplateId) {
      form.setFieldValue('templateId', defaultTemplateId);
    }

    templateBuilderService
      .list()
      .then((data) => {
        const scopeOrder: Record<string, number> = { NATIONAL: 3, REGIONAL: 2, LOCAL: 1 };
        const allowed = scopeOrder[allowedScope ?? 'NATIONAL'] ?? 3;
        const filtered = allowedScope
          ? data.filter((t) => (scopeOrder[t.scope ?? 'LOCAL'] ?? 1) <= allowed)
          : data;
        setTemplates(filtered.filter((t) => t.isActive));
      })
      .catch(() => message.error('Impossible de charger les modèles'))
      .finally(() => setLoading(false));

    volunteerService
      .getVisible()
      .then((data: any[]) => {
        const users: Volunteer[] = [];
        data.forEach((committee: any) => {
          (committee.roles ?? []).forEach((r: any) => {
            if (r.volunteerId && !users.find((u) => u.id === r.volunteerId)) {
              users.push({
                id: r.volunteerId,
                fullName: r.volunteerName || r.volunteerId,
                email: r.volunteerEmail || '',
                committeeId: committee.id,
              });
            }
          });
        });
        setVolunteers(users);
      })
      .catch(() => setVolunteers([]));
  }, [open, allowedScope]);

  // ── Load versions when template changes ─────────────────────
  useEffect(() => {
    if (!selectedTemplateId) { setVersions([]); return; }
    templateBuilderService
      .getPublishedVersions(selectedTemplateId)
      .then((data) => {
        setVersions(data);
        if (data && data.length > 0) {
          const latest = [...data].sort((a, b) => b.versionNumber - a.versionNumber)[0];
          form.setFieldValue('versionId', latest.id);
        } else {
          form.setFieldValue('versionId', undefined);
        }
      })
      .catch(() => setVersions([]));
  }, [selectedTemplateId, form]);

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async () => {
    let values: any;
    try { values = await form.validateFields(); } catch { return; }
    setSubmitting(true);
    try {
      const report: any = await adminReportService.createDraft({
        templateVersionId: values.versionId,
        title: values.title,
        reportLevel: values.level ?? 'NORMAL',
        assignedTo: values.assignedTo,
      });
      
      const reportId = report?.id || report?.data?.id || report?.reportId;
      
      if (!reportId) {
        console.error("Erreur serveur: Rapport créé mais aucun ID n'a été renvoyé.", report);
        throw new Error("L'API n'a pas renvoyé l'ID du rapport.");
      }

      message.success('Rapport créé et assigné avec succès !');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? 'Erreur lors de la création du rapport');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Selected template info ───────────────────────────────────
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const scopeLabelStyle = (scope?: string): React.CSSProperties => {
    const cfg = SCOPE_CONFIG[scope ?? ''];
    if (!cfg) return {};
    return { background: cfg.bg, color: cfg.color, border: 'none' };
  };

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      onOk={handleSubmit}
      confirmLoading={submitting}
      title={
        <Space>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#FEF2F2',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: RC_RED,
              fontSize: 16,
            }}
          >
            <UserAddOutlined />
          </span>
          <span style={{ fontFamily: RC_FONT, fontWeight: 700, fontSize: 15, color: '#1F2937' }}>
            Affecter un rapport
          </span>
        </Space>
      }
      okText="Créer & Affecter"
      cancelText="Annuler"
      okButtonProps={{
        style: { background: RC_RED, borderColor: RC_RED, fontFamily: RC_FONT, fontWeight: 600 },
      }}
      width={620}
      destroyOnClose
      styles={{ body: { padding: '16px 24px 8px' } }}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" style={{ marginTop: 8, fontFamily: RC_FONT }}>

          {/* ── Section 1: Modèle ─────────────────────────── */}
          <div style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: RC_FONT }}>
              1. Sélectionner le modèle
            </Text>
          </div>

          <Form.Item
            name="templateId"
            label={<span style={{ fontFamily: RC_FONT, fontSize: 13, fontWeight: 600, color: '#374151' }}>Modèle de rapport</span>}
            rules={[{ required: true, message: 'Sélectionnez un modèle' }]}
          >
            <Select
              showSearch
              disabled={!!defaultTemplateId}
              placeholder="Choisir un modèle actif..."
              optionFilterProp="label"
              style={{ fontFamily: RC_FONT }}
              options={templates.map((t) => ({
                value: t.id,
                label: t.title,
                scope: t.scope,
              }))}
              optionRender={(opt) => (
                <Space>
                  <FileTextOutlined style={{ color: '#9CA3AF' }} />
                  <span style={{ fontFamily: RC_FONT, fontSize: 13 }}>{opt.label}</span>
                  {opt.data.scope && (
                    <Tag style={{ ...scopeLabelStyle(opt.data.scope), fontSize: 10, margin: 0 }}>
                      {SCOPE_CONFIG[opt.data.scope]?.label ?? opt.data.scope}
                    </Tag>
                  )}
                </Space>
              )}
            />
          </Form.Item>

          {/* Template summary card */}
          {selectedTemplate && (
            <div
              style={{
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                padding: '10px 14px',
                marginTop: -8,
                marginBottom: 16,
                display: 'flex',
                gap: 10,
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 24 }}>📋</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', fontFamily: RC_FONT }}>{selectedTemplate.title}</div>
                {selectedTemplate.scope && (
                  <Tag style={{ ...scopeLabelStyle(selectedTemplate.scope), fontSize: 10, marginTop: 2 }}>
                    {SCOPE_CONFIG[selectedTemplate.scope]?.label ?? selectedTemplate.scope}
                  </Tag>
                )}
              </div>
            </div>
          )}

          <Form.Item
            name="versionId"
            label={<span style={{ fontFamily: RC_FONT, fontSize: 13, fontWeight: 600, color: '#374151' }}>Version publiée</span>}
            rules={[{ required: true, message: 'Sélectionnez une version' }]}
          >
            <Select
              placeholder="Choisir une version..."
              disabled={!selectedTemplateId}
              style={{ fontFamily: RC_FONT }}
              options={versions.map((v) => ({
                value: v.id,
                label: `v${v.versionNumber} — ${v.changeSummary ?? 'Sans résumé'} (${new Date(v.createdAt).toLocaleDateString('fr-FR')})`,
              }))}
              notFoundContent={
                selectedTemplateId ? (
                  <div style={{ padding: '8px 0', textAlign: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 12, fontFamily: RC_FONT }}>
                      Aucune version publiée.{' '}
                      <a href={`/templates/${selectedTemplateId}/edit`} target="_blank" rel="noopener noreferrer">
                        Publier une version →
                      </a>
                    </Text>
                  </div>
                ) : null
              }
            />
          </Form.Item>

          <Divider style={{ margin: '8px 0 16px' }} />

          {/* ── Section 2: Rapport ────────────────────────── */}
          <div style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: RC_FONT }}>
              2. Détails du rapport
            </Text>
          </div>

          <Form.Item
            name="title"
            label={<span style={{ fontFamily: RC_FONT, fontSize: 13, fontWeight: 600, color: '#374151' }}>Titre du rapport</span>}
            rules={[{ required: true, message: 'Donnez un titre au rapport' }]}
          >
            <Input
              placeholder="Ex : Rapport mensuel d'activité — Mai 2026"
              prefix={<TagOutlined style={{ color: '#9CA3AF' }} />}
              style={{ fontFamily: RC_FONT }}
            />
          </Form.Item>

          <Form.Item
            name="level"
            label={<span style={{ fontFamily: RC_FONT, fontSize: 13, fontWeight: 600, color: '#374151' }}>Niveau d'urgence</span>}
            initialValue="NORMAL"
          >
            <Radio.Group style={{ fontFamily: RC_FONT }}>
              <Radio.Button value="NORMAL" style={{ fontFamily: RC_FONT }}>
                <span style={{ color: '#15803D', fontWeight: 500 }}>● Normal</span>
              </Radio.Button>
              <Radio.Button value="URGENT" style={{ fontFamily: RC_FONT }}>
                <span style={{ color: RC_RED, fontWeight: 500 }}>● Urgent</span>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Divider style={{ margin: '8px 0 16px' }} />

          {/* ── Section 3: Assignation ────────────────────── */}
          <div style={{ marginBottom: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: RC_FONT }}>
              3. Assigner à
            </Text>
          </div>

          <Form.Item
            name="assignedTo"
            label={<span style={{ fontFamily: RC_FONT, fontSize: 13, fontWeight: 600, color: '#374151' }}>Responsable / Volontaire</span>}
            tooltip={{ title: 'Le membre qui devra remplir et soumettre ce rapport', icon: <TeamOutlined /> }}
          >
            <Select
              showSearch
              allowClear
              placeholder="Choisir un utilisateur (optionnel)..."
              optionFilterProp="label"
              style={{ fontFamily: RC_FONT }}
              options={volunteers.map((v) => ({
                value: v.id,
                label: `${v.fullName} — ${v.email}`,
                fullName: v.fullName,
                email: v.email,
              }))}
              optionRender={(opt) => (
                <Space>
                  <InitialsAvatar name={opt.data.fullName} />
                  <div>
                    <div style={{ fontSize: 13, fontFamily: RC_FONT, fontWeight: 500 }}>{opt.data.fullName}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: RC_FONT }}>{opt.data.email}</div>
                  </div>
                </Space>
              )}
            />
          </Form.Item>

          {/* Info alert */}
          <Alert
            type="info"
            showIcon
            style={{ borderRadius: 8, fontSize: 12, fontFamily: RC_FONT, marginTop: 4 }}
            message="Le rapport sera créé en brouillon. L'assigné recevra une notification pour le remplir."
          />
        </Form>
      </Spin>
    </Modal>
  );
};

export default ReportAssignModal;