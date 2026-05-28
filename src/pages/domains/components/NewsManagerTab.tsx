// ============================================================
// NEXUS-AID — News Manager Tab (Resp. Diffusion)
// Gestion dynamique des actualités — 100% API, sans mock
// Portée hiérarchique : LOCAL | REGIONAL | NATIONAL (CommitteeType)
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, Select, Space, message,
  Tooltip, Empty, Avatar, Spin, Alert, Popconfirm,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, DeleteOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CloseCircleOutlined, SendOutlined,
  GlobalOutlined, ApartmentOutlined, TeamOutlined,
  CheckOutlined, StopOutlined, PictureOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { ColumnsType } from 'antd/es/table';
import newsService from '@/services/newsService';
import type { NewsItemDTO, NewsCreateDTO } from '@/services/newsService';
import { useAuthStore } from '@/stores';

const { TextArea } = Input;
const { Option } = Select;

// ── Palette ──────────────────────────────────────────────────
const C = {
  red: '#CC0000', redDark: '#990000', redFade: 'rgba(204,0,0,0.07)',
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
  PUBLIE:     { color: '#15803D', bg: '#DCFCE7', label: 'Publié',     icon: <CheckCircleOutlined /> },
  REJETE:     { color: '#DC2626', bg: '#FEE2E2', label: 'Rejeté',     icon: <CloseCircleOutlined /> },
};

interface Props { isDark?: boolean; }

const NewsManagerTab: React.FC<Props> = ({ isDark = false }) => {
  const { user } = useAuthStore();
  const [items, setItems] = useState<NewsItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form] = Form.useForm();

  const [base64Image, setBase64Image] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result as string);
        form.setFieldsValue({ imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Detect if user can validate news (president/VP/admin)
  const isPresident = user?.roles?.some((r: string) =>
    ['PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'SECRETAIRE_GENERAL'].includes(r)
  ) || user?.type === 'ADMIN';

  const glassCard: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.03)' : C.white,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : C.gray100}`,
    borderRadius: 16, padding: 24, marginBottom: 16,
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await newsService.getAll({ committeeId: (user as any)?.committeeId });
      setItems(data);
    } catch {
      message.error('Erreur de chargement des actualités');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (values: any) => {
    setSubmitLoading(true);
    try {
      const payload: NewsCreateDTO = {
        title: values.title,
        summary: values.summary,
        content: values.content,
        category: values.category,
        committeeId: (user as any)?.committeeId,
        targetScope: values.targetScope,
        imageUrl: values.imageUrl || undefined,
        isPublic: values.isPublic !== undefined ? values.isPublic : true,
      };
      const created = await newsService.createNews(payload);
      setItems(prev => [created, ...prev]);
      const hasDirectPublish = user?.roles?.some((r: string) =>
        ['PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'SECRETAIRE_GENERAL'].includes(r)
      ) || user?.type === 'ADMIN';

      message.success(
        (values.targetScope === 'NATIONAL' || hasDirectPublish)
          ? 'Actualité publiée directement !'
          : 'Actualité soumise — en attente de validation du Président'
      );
      setCreateOpen(false);
      setBase64Image('');
      form.resetFields();
    } catch {
      message.error("Erreur lors de la soumission");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await newsService.deleteNews(id);
      setItems(prev => prev.filter(x => x.id !== id));
      message.success('Actualité supprimée');
    } catch {
      message.error('Erreur lors de la suppression');
    }
  };

  /** Président: approuver ou rejeter une actualité */
  const handleValidation = async (id: string, action: 'PUBLIE' | 'REJETE') => {
    setActionLoading(id);
    try {
      const updated = await newsService.updateStatus(id, action);
      setItems(prev => prev.map(item => item.id === id ? updated : item));
      message.success(action === 'PUBLIE' ? '✅ Actualité approuvée et publiée' : '🚫 Actualité rejetée');
    } catch {
      message.error("Erreur lors de la validation");
    } finally {
      setActionLoading(null);
    }
  };

  // Pending news for president validation panel
  const pendingItems = items.filter(i => i.status === 'EN_ATTENTE');

  const columns: ColumnsType<NewsItemDTO> = [
    {
      title: 'Actualité',
      key: 'title',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {r.imageUrl ? (
            <img src={r.imageUrl} alt={r.title}
              style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <Avatar size={44} style={{ background: C.redFade, color: C.red, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
              {r.category?.charAt(0)}
            </Avatar>
          )}
          <div>
            <div style={{ fontWeight: 700, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 14 }}>{r.title}</div>
            <div style={{ color: C.gray400, fontSize: 12 }}>{r.summary?.slice(0, 60)}{r.summary && r.summary.length > 60 ? '…' : ''}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Portée',
      dataIndex: 'targetScope',
      key: 'scope',
      width: 120,
      render: (s: string) => {
        const cfg = SCOPE_CFG[s] || SCOPE_CFG.LOCAL;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${cfg.color}15`, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (c: string) => <Tag bordered={false} style={{ borderRadius: 6, fontWeight: 600 }}>{c}</Tag>,
    },
    {
      title: 'Comité',
      dataIndex: 'committeeName',
      key: 'committee',
      width: 140,
      render: (v: string) => <span style={{ color: C.gray400, fontSize: 12 }}>{v || '—'}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'publishedAt',
      key: 'date',
      width: 100,
      render: (d: string) => (
        <span style={{ color: C.gray400, fontSize: 12 }}>
          {d ? new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short' }) : '—'}
        </span>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: string) => {
        const cfg = STATUS_CFG[s] || STATUS_CFG.EN_ATTENTE;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: cfg.bg, color: cfg.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
            {cfg.icon} {cfg.label}
          </span>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: isPresident ? 160 : 60,
      render: (_, r) => (
        <Space size={4}>
          {/* President validation buttons — only for EN_ATTENTE items */}
          {isPresident && r.status === 'EN_ATTENTE' && (
            <>
              <Tooltip title="Approuver & Publier">
                <Button
                  type="primary" size="small" icon={<CheckOutlined />}
                  loading={actionLoading === r.id}
                  onClick={() => handleValidation(r.id, 'PUBLIE')}
                  style={{ background: '#15803D', borderColor: '#15803D', borderRadius: 6 }}
                />
              </Tooltip>
              <Tooltip title="Rejeter">
                <Button
                  danger size="small" icon={<StopOutlined />}
                  loading={actionLoading === r.id}
                  onClick={() => handleValidation(r.id, 'REJETE')}
                  style={{ borderRadius: 6 }}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Supprimer">
            <Popconfirm
              title="Supprimer cette actualité ?"
              onConfirm={() => handleDelete(r.id)}
              okText="Oui" cancelText="Non"
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Stats par statut
  const statsData = Object.entries(STATUS_CFG).map(([k, cfg]) => ({
    key: k, label: cfg.label, color: cfg.color, icon: cfg.icon,
    count: items.filter(i => (i.status || 'EN_ATTENTE') === k).length,
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {statsData.map(s => (
          <div key={s.key} style={{ ...glassCard, padding: '12px 20px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 120px' }}>
            <span style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#F3F4F6' : C.gray800 }}>{s.count}</div>
              <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Panneau de validation Président ── */}
      {isPresident && pendingItems.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginBottom: 16, borderRadius: 12 }}
          message={
            <span style={{ fontWeight: 700 }}>
              {pendingItems.length} actualité{pendingItems.length > 1 ? 's' : ''} en attente de votre validation
            </span>
          }
          description={
            <div style={{ marginTop: 8 }}>
              {pendingItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)',
                  flexWrap: 'wrap', gap: 8,
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</span>
                    <span style={{ color: '#92400E', fontSize: 11, marginLeft: 8 }}>
                      par {item.authorName} · {item.committeeName || 'Mon comité'}
                    </span>
                  </div>
                  <Space>
                    <Button size="small" icon={<StopOutlined />} danger
                      loading={actionLoading === item.id}
                      onClick={() => handleValidation(item.id, 'REJETE')}
                      style={{ borderRadius: 6 }}>
                      Rejeter
                    </Button>
                    <Button size="small" icon={<CheckOutlined />} type="primary"
                      loading={actionLoading === item.id}
                      onClick={() => handleValidation(item.id, 'PUBLIE')}
                      style={{ background: '#15803D', borderColor: '#15803D', borderRadius: 6 }}>
                      Approuver
                    </Button>
                  </Space>
                </div>
              ))}
            </div>
          }
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontWeight: 700, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 15 }}>
          Mes Actualités ({items.length})
        </span>
        <Space>
          <Button onClick={load} loading={loading} style={{ borderRadius: 10 }}>Actualiser</Button>
          <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
            style={{ background: C.red, color: C.white, border: 'none', borderRadius: 10, fontWeight: 700, height: 38 }}>
            Nouvelle Actualité
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
            scroll={{ x: 720 }}
            locale={{ emptyText: <Empty description="Aucune actualité" /> }}
          />
        )}
      </div>

      {/* ── Modal Création ── */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><SendOutlined style={{ color: C.red }} /><span style={{ fontWeight: 800 }}>Publier une Actualité</span></div>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        footer={null} width="min(700px, 95vw)" centered
        styles={{ content: { borderRadius: 20, padding: 0, overflow: 'hidden' } }}
      >
        <div style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, padding: '16px 28px' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            Portée <strong>LOCAL / RÉGIONAL</strong> → validation Président requise. <strong>NATIONAL</strong> → publication directe.
          </p>
        </div>
        <div style={{ padding: 28 }}>
          <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
            <Form.Item name="title" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Titre</span>} rules={[{ required: true, message: 'Titre requis' }]}>
              <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Journée de sensibilisation..." />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0 16px' }}>
              <Form.Item name="category" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Catégorie</span>} rules={[{ required: true }]}>
                <Select size="large" style={{ borderRadius: 10 }}>
                  <Option value="EVENT">Événement</Option>
                  <Option value="FORMATION">Formation</Option>
                  <Option value="NATIONAL">National</Option>
                  <Option value="COMMITTEE">Comité</Option>
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

            <Form.Item name="isPublic" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Visibilité de l'actualité</span>} rules={[{ required: true }]} initialValue={true}>
              <Select size="large" style={{ borderRadius: 10 }}>
                <Option value={true}>🌐 Public — Visible sur la page d'accueil par tout le monde</Option>
                <Option value={false}>🔒 Interne — Réservé aux membres connectés sur le portail</Option>
              </Select>
            </Form.Item>

            <Form.Item name="summary" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Description / Résumé court (Affiché en accroche)</span>} rules={[{ required: true }]}>
              <Input size="large" style={{ borderRadius: 10 }} placeholder="1-2 phrases d'accroche qui décrivent l'actualité..." />
            </Form.Item>

            <Form.Item name="content" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Contenu complet de l'article</span>} rules={[{ required: true }]}>
              <TextArea rows={5} style={{ borderRadius: 10, resize: 'vertical' }} placeholder="Détaillez l'actualité..." />
            </Form.Item>

            {/* Photo upload zone */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
                <PictureOutlined /> Photo de l'actualité (Importer un fichier)
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div 
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                  style={{
                    flex: 1, height: 100, border: '2px dashed rgba(204,0,0,0.3)', borderRadius: 12,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', background: 'rgba(204,0,0,0.02)', transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = C.red}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(204,0,0,0.3)'}
                >
                  <PlusOutlined style={{ fontSize: 20, color: C.red, marginBottom: 4 }} />
                  <span style={{ fontSize: 12, color: C.gray800, fontWeight: 600 }}>Importer une photo</span>
                  <span style={{ fontSize: 10, color: C.gray400 }}>PNG, JPG jusqu'à 5Mo</span>
                  <input 
                    type="file" id="file-upload-input" accept="image/*" 
                    onChange={handleFileChange} style={{ display: 'none' }} 
                  />
                </div>
                {base64Image && (
                  <div style={{ position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }}>
                    <img src={base64Image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button"
                      onClick={() => {
                        setBase64Image('');
                        form.setFieldsValue({ imageUrl: '' });
                      }}
                      style={{
                        position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', 
                        color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <Form.Item name="imageUrl" noStyle>
              <Input type="hidden" />
            </Form.Item>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Button onClick={() => { setCreateOpen(false); form.resetFields(); }} style={{ borderRadius: 10 }}>Annuler</Button>
              <Button htmlType="submit" loading={submitLoading}
                style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, color: C.white, border: 'none', borderRadius: 10, fontWeight: 700, height: 38 }}>
                <EyeOutlined /> Soumettre
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </motion.div>
  );
};

export default NewsManagerTab;
