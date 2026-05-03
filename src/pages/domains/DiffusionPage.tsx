// ============================================================
// NEXUS-AID — Diffusion Page (RESP_DIFFUSION)
// Refonte complète : 4 onglets — Ressources, Actualités,
// Événements, Quiz & Formation
// Version 4: Module Responsable Diffusion
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Col, Row, Table, Tag, Typography, Space, Button,
  Spin, Modal, Form, Input, Select, App, DatePicker, Progress, Tooltip,
} from 'antd';
import {
  PlusOutlined, BookOutlined, VideoCameraOutlined,
  FileTextOutlined, NotificationOutlined, GlobalOutlined,
  FilterOutlined, SettingOutlined, ShareAltOutlined,
  EyeOutlined, BarChartOutlined, ReadOutlined,
  CalendarOutlined, TrophyOutlined, SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { diffusionService } from '@/services/domainServices';
import type { EducationalResourceDTO, AwarenessCampaignDTO } from '@/types';
import { useUIStore, useAuthStore } from '@/stores';
import NewsManagerTab from './components/NewsManagerTab';
import EventManagerTab from './components/EventManagerTab';
import QuizManagerTab from './components/QuizManagerTab';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

// ── Palette ──────────────────────────────────────────────────
const C = {
  red: '#CC0000', redLight: '#FF3333', redDark: '#990000',
  redFade: 'rgba(204,0,0,0.07)', gold: '#C8963E',
  white: '#FFFFFF', gray50: '#F7F5F3', gray100: '#EEEBE8',
  gray400: '#A09890', gray600: '#5E5650', gray800: '#2C2420',
};

// ── Tab config ────────────────────────────────────────────────
const TABS = [
  { key: 'resources',  label: 'Ressources',   icon: <BookOutlined /> },
  { key: 'news',       label: 'Actualités',    icon: <ReadOutlined /> },
  { key: 'events',     label: 'Événements',    icon: <CalendarOutlined /> },
  { key: 'quiz',       label: 'Quiz & Form.',  icon: <TrophyOutlined /> },
  { key: 'campaigns',  label: 'Campagnes',     icon: <NotificationOutlined /> },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── Component ─────────────────────────────────────────────────
const DiffusionPage: React.FC = () => {
  const { message: messageApi } = App.useApp();
  const themeMode = useUIStore((s) => s.themeMode);
  const user = useAuthStore((s) => s.user);
  const isDark = themeMode === 'dark';

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('resources');
  const [resources, setResources] = useState<EducationalResourceDTO[]>([]);
  const [campaigns, setCampaigns] = useState<AwarenessCampaignDTO[]>([]);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [resourceForm] = Form.useForm();
  const [campaignForm] = Form.useForm();

  const isRespDiffusion = user?.roles?.includes('RESP_DIFFUSION') || user?.type === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, cam] = await Promise.all([
        diffusionService.getResources().catch(() => []),
        diffusionService.getCampaigns().catch(() => []),
      ]);
      setResources(res || []);
      setCampaigns(cam || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateResource = async (values: any) => {
    setSubmitLoading(true);
    try {
      await diffusionService.createResource({
        title: values.title, description: values.description,
        category: values.category, contentType: values.contentType,
        contentUrl: values.contentUrl || '', language: values.language,
        tags: values.tags || 'sensibilisation',
      });
      messageApi.success('Ressource ajoutée !');
      setIsResourceModalOpen(false);
      resourceForm.resetFields();
      loadData();
    } catch { messageApi.error("Erreur lors de l'ajout."); }
    finally { setSubmitLoading(false); }
  };

  const handleCreateCampaign = async (values: any) => {
    setSubmitLoading(true);
    try {
      const startDate = values.dates?.[0]?.format('YYYY-MM-DD');
      const endDate = values.dates?.[1]?.format('YYYY-MM-DD');
      await diffusionService.createCampaign({
        name: values.name, description: values.description, startDate, endDate,
        targetAudience: values.targetAudience,
        channels: (values.channels || []).join(','),
        status: values.status || 'PLANNED',
      });
      messageApi.success('Campagne créée !');
      setIsCampaignModalOpen(false);
      campaignForm.resetFields();
      loadData();
    } catch { messageApi.error('Erreur lors de la création.'); }
    finally { setSubmitLoading(false); }
  };

  // ── Glass style ───────────────────────────────────────────────
  const glassStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(20px)',
    borderRadius: 28,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}`,
    boxShadow: isDark ? '0 24px 80px rgba(0,0,0,0.4)' : '0 12px 60px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  };

  // ── Resources table columns ────────────────────────────────────
  const resColumns: ColumnsType<EducationalResourceDTO> = [
    {
      title: 'MÉDIA & CONTENU', key: 'title',
      render: (_, r) => (
        <Space size={14}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: r.contentType === 'VIDEO' ? (isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2') : (isDark ? 'rgba(16,185,129,0.1)' : '#f0fdf4'),
            color: r.contentType === 'VIDEO' ? '#ef4444' : '#10b981',
          }}>
            {r.contentType === 'VIDEO' ? <VideoCameraOutlined style={{ fontSize: 20 }} /> : <FileTextOutlined style={{ fontSize: 20 }} />}
          </div>
          <div>
            <Text strong style={{ fontSize: 14, display: 'block' }}>{r.title}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.category} · {r.language}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'FORMAT', dataIndex: 'contentType', key: 'contentType', width: 120,
      render: ct => <Tag bordered={false} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 6, fontWeight: 600 }}>{ct}</Tag>,
    },
    {
      title: 'ACTIONS', key: 'action', width: 90,
      render: () => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} size="small" />
          <Button type="text" icon={<ShareAltOutlined />} size="small" />
        </Space>
      ),
    },
  ];

  const camColumns: ColumnsType<AwarenessCampaignDTO> = [
    {
      title: 'DÉSIGNATION', key: 'name',
      render: (_, r) => (
        <Space size={14}>
          <div style={{
            width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff', color: '#6366f1',
          }}>
            <NotificationOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 14, display: 'block' }}>{(r as any).name || r.title}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Cible: {r.targetAudience || 'Public'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'PLANIFICATION', key: 'period',
      render: (_, r) => (
        <div>
          <Text strong>{r.startDate ? new Date(r.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</Text>
          <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>au {r.endDate ? new Date(r.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}</Text>
        </div>
      ),
    },
    {
      title: 'STATUT', dataIndex: 'status', key: 'status', width: 120,
      render: s => <Tag color={s === 'ACTIVE' ? 'success' : 'processing'} style={{ borderRadius: 8, padding: '2px 12px', fontWeight: 700 }}>{s}</Tag>,
    },
  ];

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
      <Spin size="large" />
      <Text type="secondary">Chargement du module Diffusion...</Text>
    </div>
  );

  // ── Sidebar stats ────────────────────────────────────────────
  const sidebarStats = [
    { icon: <BookOutlined />, label: 'Assets Éducatifs', value: `${resources.length} Contenus`, color: '#10b981' },
    { icon: <NotificationOutlined />, label: 'Campagnes Actives', value: `${campaigns.filter(c => c.status === 'ACTIVE').length} En cours`, color: '#6366f1' },
    { icon: <ReadOutlined />, label: 'Actualités', value: 'Gérer →', color: C.red },
    { icon: <TrophyOutlined />, label: 'Quiz Publiés', value: 'Évaluer →', color: '#F59E0B' },
  ];

  return (
    <div style={{ padding: '0 28px 40px', maxWidth: 1600, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

        {/* ── Header Banner ── */}
        <div style={{
          background: `linear-gradient(135deg, ${C.redDark} 0%, ${C.red} 55%, ${C.redLight} 100%)`,
          borderRadius: 24, padding: 'clamp(20px, 3vw, 36px)',
          marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center',
          justifyContent: 'space-between', gap: 16,
          boxShadow: '0 12px 40px rgba(204,0,0,0.25)', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', border: '40px solid rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 80, top: 20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,0,0,0.12)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 12px', marginBottom: 10 }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>📢 DIFFUSION CRT</span>
            </div>
            <h1 style={{ margin: 0, color: C.white, fontSize: 'clamp(18px,3vw,26px)', fontWeight: 800, letterSpacing: '-0.3px' }}>
              Direction de la Diffusion
            </h1>
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
              Gestion des ressources, actualités, événements & formations
            </p>
          </div>
          {isRespDiffusion && (
            <button
              onClick={() => activeTab === 'resources' ? setIsResourceModalOpen(true) : activeTab === 'campaigns' ? setIsCampaignModalOpen(true) : undefined}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: C.white, color: C.red, border: 'none', borderRadius: 12,
                padding: '12px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)', position: 'relative', zIndex: 1,
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <PlusOutlined /> Nouveau Contenu
            </button>
          )}
        </div>

        {/* ── Main Container ── */}
        <div style={glassStyle}>
          <Row gutter={0}>
            {/* LEFT SIDEBAR */}
            <Col xs={24} lg={7} style={{
              borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : C.gray100}`,
              background: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(248,250,252,0.5)',
              padding: 32,
            }}>
              <div style={{ position: 'sticky', top: 32 }}>
                {/* Role badge */}
                {isRespDiffusion && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.redFade, color: C.red, borderRadius: 10, padding: '6px 14px', marginBottom: 24, fontWeight: 700, fontSize: 12 }}>
                    <GlobalOutlined /> Responsable Diffusion
                  </div>
                )}

                {/* Stats cards */}
                <Space direction="vertical" style={{ width: '100%' }} size={14}>
                  {sidebarStats.map((s, i) => (
                    <div key={i} style={{
                      padding: '16px 18px', borderRadius: 18,
                      background: isDark ? 'rgba(255,255,255,0.03)' : C.white,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : C.gray100}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                          {s.icon}
                        </div>
                        <BarChartOutlined style={{ color: s.color, fontSize: 18, opacity: 0.5 }} />
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginTop: 10 }}>{s.label}</Text>
                      <Title level={5} style={{ margin: '3px 0 0', fontWeight: 800, color: isDark ? '#F3F4F6' : C.gray800 }}>{s.value}</Title>
                    </div>
                  ))}
                </Space>

                {/* Quick actions */}
                {isRespDiffusion && (
                  <div style={{ marginTop: 20 }}>
                    <Button block icon={<PlusOutlined />}
                      onClick={() => {
                        if (activeTab === 'resources') setIsResourceModalOpen(true);
                        else if (activeTab === 'campaigns') setIsCampaignModalOpen(true);
                      }}
                      style={{ height: 46, borderRadius: 14, background: C.red, borderColor: C.red, fontWeight: 700, color: C.white, boxShadow: `0 4px 16px ${C.redFade}` }}>
                      {activeTab === 'resources' ? 'Nouvelle Ressource' : activeTab === 'campaigns' ? 'Nouvelle Campagne' : 'Ajouter'}
                    </Button>
                  </div>
                )}
              </div>
            </Col>

            {/* RIGHT CONTENT */}
            <Col xs={24} lg={17} style={{ padding: '32px 36px' }}>
              {/* Tab bar */}
              <div style={{ display: 'flex', gap: 6, background: isDark ? 'rgba(255,255,255,0.05)' : C.gray50, padding: 5, borderRadius: 16, marginBottom: 28, flexWrap: 'wrap' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      height: 38, padding: '0 18px', borderRadius: 11, border: 'none',
                      fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      background: activeTab === tab.key ? (isDark ? 'rgba(204,0,0,0.2)' : C.white) : 'transparent',
                      color: activeTab === tab.key ? C.red : (isDark ? 'rgba(255,255,255,0.45)' : C.gray600),
                      boxShadow: activeTab === tab.key && !isDark ? '0 2px 10px rgba(0,0,0,0.07)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>

                  {activeTab === 'resources' && (
                    <Table
                      columns={resColumns}
                      dataSource={resources}
                      rowKey="id"
                      pagination={{ pageSize: 8, hideOnSinglePage: true }}
                      locale={{ emptyText: <div style={{ padding: '40px 0', textAlign: 'center' }}><Title level={5}>Aucune ressource</Title><Text type="secondary">Commencez par ajouter une ressource.</Text></div> }}
                    />
                  )}

                  {activeTab === 'news' && <NewsManagerTab isDark={isDark} />}
                  {activeTab === 'events' && <EventManagerTab isDark={isDark} />}
                  {activeTab === 'quiz' && <QuizManagerTab isDark={isDark} />}

                  {activeTab === 'campaigns' && (
                    <Table
                      columns={camColumns}
                      dataSource={campaigns}
                      rowKey="id"
                      pagination={{ pageSize: 8, hideOnSinglePage: true }}
                      locale={{ emptyText: <div style={{ padding: '40px 0', textAlign: 'center' }}><Title level={5}>Aucune campagne</Title><Text type="secondary">Créez votre première campagne.</Text></div> }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </Col>
          </Row>
        </div>
      </motion.div>

      {/* ── Modal: Ressource ── */}
      <Modal
        title={<Space><BookOutlined style={{ color: '#10b981' }} /><Text strong style={{ fontSize: 17 }}>Ajouter une Ressource</Text></Space>}
        open={isResourceModalOpen}
        onCancel={() => setIsResourceModalOpen(false)}
        footer={null} width={620} centered
        styles={{ content: { borderRadius: 24, padding: 30 } }}
      >
        <Form form={resourceForm} layout="vertical" onFinish={handleCreateResource} requiredMark={false}>
          <Form.Item name="title" label="Intitulé" rules={[{ required: true }]}>
            <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Guide des premiers secours" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Thématique" rules={[{ required: true }]}>
                <Select size="large"><Option value="PREMIERS_SECOURS">Secourisme</Option><Option value="HYGIENE">Santé</Option><Option value="GOUVERNANCE">Gouvernance</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contentType" label="Format" rules={[{ required: true }]}>
                <Select size="large"><Option value="DOCUMENT">Document (PDF)</Option><Option value="VIDEO">Vidéo</Option><Option value="AUDIO">Audio</Option></Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="language" label="Langue" rules={[{ required: true }]}>
                <Select size="large"><Option value="ARABIC">Arabe</Option><Option value="FRENCH">Français</Option></Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contentUrl" label="Lien"><Input size="large" style={{ borderRadius: 12 }} placeholder="https://" /></Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={3} style={{ borderRadius: 12 }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setIsResourceModalOpen(false)} style={{ borderRadius: 12 }}>Annuler</Button>
            <Button type="primary" htmlType="submit" loading={submitLoading} style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 12 }}>Enregistrer</Button>
          </div>
        </Form>
      </Modal>

      {/* ── Modal: Campagne ── */}
      <Modal
        title={<Space><NotificationOutlined style={{ color: '#6366f1' }} /><Text strong style={{ fontSize: 17 }}>Lancer une Campagne</Text></Space>}
        open={isCampaignModalOpen}
        onCancel={() => setIsCampaignModalOpen(false)}
        footer={null} width={620} centered
        styles={{ content: { borderRadius: 24, padding: 30 } }}
      >
        <Form form={campaignForm} layout="vertical" onFinish={handleCreateCampaign} requiredMark={false}>
          <Form.Item name="name" label="Nom de la campagne" rules={[{ required: true }]}>
            <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Sensibilisation 2026" />
          </Form.Item>
          <Form.Item name="dates" label="Période" rules={[{ required: true }]}>
            <RangePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetAudience" label="Cible"><Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Écoles, Lycées" /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="État initial">
                <Select size="large"><Option value="PLANNED">Planifiée</Option><Option value="ACTIVE">En cours</Option></Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="channels" label="Canaux">
            <Select mode="tags" size="large" placeholder="Réseaux sociaux, Radio...">
              <Option value="Radio">Radio</Option><Option value="Social Media">Social Media</Option><Option value="Print">Affichage</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Objectifs" rules={[{ required: true }]}>
            <TextArea rows={3} style={{ borderRadius: 12 }} />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setIsCampaignModalOpen(false)} style={{ borderRadius: 12 }}>Annuler</Button>
            <Button type="primary" htmlType="submit" loading={submitLoading} style={{ background: '#6366f1', borderColor: '#6366f1', borderRadius: 12 }}>Valider</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default DiffusionPage;
