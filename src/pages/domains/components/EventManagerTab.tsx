// ============================================================
// NEXUS-AID — Event Manager Tab (Resp. Diffusion)
// Gestion dynamique des événements — 100% API, sans mock
// Portée hiérarchique : LOCAL | REGIONAL | NATIONAL (CommitteeType)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, Select, DatePicker,
  Space, message, Tooltip, Empty, Spin, InputNumber,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, CalendarOutlined,
  EnvironmentOutlined, TeamOutlined, ApartmentOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { ColumnsType } from 'antd/es/table';
import calendarService from '@/services/calendarService';
import type { CalendarEventDTO, CalendarEventCreateDTO } from '@/services/calendarService';
import { useAuthStore } from '@/stores';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ── Palette ──────────────────────────────────────────────────
const C = {
  red: '#CC0000', redDark: '#990000',
  white: '#FFFFFF', gray100: '#EEEBE8', gray400: '#A09890', gray800: '#2C2420',
};

// ── Hiérarchie : LOCAL | REGIONAL | NATIONAL (CommitteeType) ──
const SCOPE_CFG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  LOCAL:    { color: '#3B82F6', icon: <TeamOutlined />,      label: 'Local'    },
  REGIONAL: { color: '#8B5CF6', icon: <ApartmentOutlined />, label: 'Régional' },
  NATIONAL: { color: '#DC2626', icon: <GlobalOutlined />,    label: 'National' },
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  EN_ATTENTE: { color: '#B45309', bg: '#FEF3C7', label: 'En Attente', icon: <ClockCircleOutlined /> },
  VALIDE:     { color: '#15803D', bg: '#DCFCE7', label: 'Validé',     icon: <CheckCircleOutlined /> },
  REJETE:     { color: '#DC2626', bg: '#FEE2E2', label: 'Rejeté',     icon: <CloseCircleOutlined /> },
  ANNULE:     { color: '#6B7280', bg: '#F3F4F6', label: 'Annulé',     icon: <CloseCircleOutlined /> },
};

const TYPE_COLOR: Record<string, string> = {
  DIFFUSION: '#F59E0B', EVENT: '#10B981', FORMATION: '#3B82F6',
  REUNION: '#8B5CF6', URGENCE: '#EF4444', COLLECTE: '#F97316',
};

interface Props { isDark?: boolean; }

const EventManagerTab: React.FC<Props> = ({ isDark = false }) => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<CalendarEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const glassCard: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.03)' : C.white,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : C.gray100}`,
    borderRadius: 16, padding: 24, marginBottom: 16,
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await calendarService.getUpcomingEvents();
      setItems(data);
    } catch {
      message.error('Erreur de chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values: any) => {
    setSubmitLoading(true);
    try {
      const payload: CalendarEventCreateDTO = {
        title: values.title,
        description: values.description,
        type: values.type || 'DIFFUSION',
        startDate: values.dates[0].toISOString(),
        endDate: values.dates[1].toISOString(),
        location: values.location,
        committeeId: user?.committeeId,
        maxParticipants: values.maxParticipants,
        targetScope: values.targetScope,  // LOCAL | REGIONAL | NATIONAL
      };
      const created = await calendarService.createEvent(payload);
      setItems(prev => [created, ...prev]);
      message.success(
        values.targetScope === 'NATIONAL'
          ? 'Événement validé et ajouté au calendrier (portée nationale)'
          : 'Événement soumis — en attente de validation du Président'
      );
      setCreateOpen(false);
      form.resetFields();
    } catch {
      message.error("Erreur lors de la création de l'événement");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await calendarService.deleteEvent(id);
      setItems(prev => prev.filter(x => x.id !== id));
      message.success('Événement supprimé');
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  const columns: ColumnsType<CalendarEventDTO> = [
    {
      title: 'Événement',
      key: 'title',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: `${TYPE_COLOR[r.type] || C.red}15`,
            color: TYPE_COLOR[r.type] || C.red,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>
            <CalendarOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 14 }}>{r.title}</div>
            <div style={{ color: C.gray400, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <EnvironmentOutlined /> {r.location || '—'}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (t: string) => (
        <Tag bordered={false} style={{ borderRadius: 6, fontWeight: 600, background: `${TYPE_COLOR[t] || C.red}15`, color: TYPE_COLOR[t] || C.red, border: 'none' }}>
          {t}
        </Tag>
      ),
    },
    {
      title: 'Date',
      key: 'date',
      width: 140,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 600, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 13 }}>
            {new Date(r.startDate).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div style={{ color: C.gray400, fontSize: 11 }}>
            {new Date(r.startDate).toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ),
    },
    {
      title: 'Portée',
      dataIndex: 'targetScope',
      key: 'scope',
      width: 110,
      render: (s: string) => {
        const cfg = SCOPE_CFG[s] || SCOPE_CFG.LOCAL;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${cfg.color}15`, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      title: 'Comité',
      dataIndex: 'committeeName',
      key: 'committee',
      width: 130,
      render: (v: string) => <span style={{ color: C.gray400, fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (s: string) => {
        const cfg = STATUS_CFG[s || 'EN_ATTENTE'];
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, r) => (
        <Tooltip title="Supprimer">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleDelete(r.id)} />
        </Tooltip>
      ),
    },
  ];

  const statsData = Object.entries(STATUS_CFG).map(([k, cfg]) => ({
    key: k, label: cfg.label, color: cfg.color, icon: cfg.icon,
    count: items.filter(i => (i.status || 'EN_ATTENTE') === k).length,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {statsData.map(s => (
          <div key={s.key} style={{ ...glassCard, padding: '12px 20px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 100px' }}>
            <span style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#F3F4F6' : C.gray800 }}>{s.count}</div>
              <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontWeight: 700, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 15 }}>Mes Événements ({items.length})</span>
        <Space>
          <Button onClick={load} loading={loading} style={{ borderRadius: 10 }}>Actualiser</Button>
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
            style={{ background: C.red, color: C.white, border: 'none', borderRadius: 10, fontWeight: 700, height: 38 }}>
            Nouvel Événement
          </Button>
        </Space>
      </div>

      <div style={glassCard}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        ) : (
          <Table
            columns={columns} dataSource={items} rowKey="id"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 800 }}
            locale={{ emptyText: <Empty description="Aucun événement" /> }}
          />
        )}
      </div>

      {/* Modal Création */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><CalendarOutlined style={{ color: C.red }} /><span style={{ fontWeight: 800 }}>Créer un Événement</span></div>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        footer={null} width="min(750px, 95vw)" centered
        styles={{ content: { borderRadius: 20, padding: 0, overflow: 'hidden' } }}
      >
        <div style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, padding: '16px 28px' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            Portée <strong>LOCAL / RÉGIONAL</strong> → validation Président requise. <strong>NATIONAL</strong> → validation directe.
          </p>
        </div>
        <div style={{ padding: 28 }}>
          <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
            <Form.Item name="title" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Titre de l'événement</span>} rules={[{ required: true }]}>
              <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Atelier Communication..." />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0 16px' }}>
              <Form.Item name="type" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Type</span>} rules={[{ required: true }]} initialValue="DIFFUSION">
                <Select size="large">
                  <Option value="DIFFUSION">Diffusion</Option>
                  <Option value="EVENT">Événement</Option>
                  <Option value="FORMATION">Formation</Option>
                  <Option value="REUNION">Réunion</Option>
                  <Option value="COLLECTE">Collecte</Option>
                  <Option value="URGENCE">Urgence</Option>
                </Select>
              </Form.Item>
              <Form.Item name="targetScope" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Portée Hiérarchique</span>} rules={[{ required: true }]} initialValue="LOCAL">
                <Select size="large">
                  <Option value="LOCAL">
                    <span style={{ color: SCOPE_CFG.LOCAL.color, fontWeight: 700 }}>🏠 Local — Mon comité</span>
                  </Option>
                  <Option value="REGIONAL">
                    <span style={{ color: SCOPE_CFG.REGIONAL.color, fontWeight: 700 }}>🌍 Régional — Tous les comités locaux</span>
                  </Option>
                  <Option value="NATIONAL">
                    <span style={{ color: SCOPE_CFG.NATIONAL.color, fontWeight: 700 }}>🇹🇳 National — Toute la structure CRT</span>
                  </Option>
                </Select>
              </Form.Item>
            </div>

            <Form.Item name="dates" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Période</span>} rules={[{ required: true }]}>
              <RangePicker showTime size="large" style={{ width: '100%', borderRadius: 10 }} format="DD/MM/YYYY HH:mm" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0 16px' }}>
              <Form.Item name="location" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Lieu</span>}>
                <Input size="large" style={{ borderRadius: 10 }} placeholder="Adresse ou lieu..." prefix={<EnvironmentOutlined />} />
              </Form.Item>
              <Form.Item name="maxParticipants" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Nb. Max Participants</span>}>
                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={1} />
              </Form.Item>
            </div>

            <Form.Item name="description" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Description</span>}>
              <TextArea rows={3} style={{ borderRadius: 10 }} placeholder="Détaillez l'événement..." />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Button onClick={() => { setCreateOpen(false); form.resetFields(); }} style={{ borderRadius: 10 }}>Annuler</Button>
              <Button htmlType="submit" loading={submitLoading}
                style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, color: C.white, border: 'none', borderRadius: 10, fontWeight: 700, height: 38 }}>
                Soumettre
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </motion.div>
  );
};

export default EventManagerTab;
