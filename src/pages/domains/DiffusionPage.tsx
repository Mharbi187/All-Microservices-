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
  CheckCircleOutlined, CarOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion, AnimatePresence } from 'framer-motion';
import { diffusionService, santeService } from '@/services/domainServices';
import type { EducationalResourceDTO, AwarenessCampaignDTO, MedicalDistributionDTO } from '@/types';
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
  { key: 'resources',     label: 'Ressources',          icon: <BookOutlined /> },
  { key: 'news',          label: 'Actualités',           icon: <ReadOutlined /> },
  { key: 'events',        label: 'Événements',           icon: <CalendarOutlined /> },
  { key: 'quiz',          label: 'Quiz & Form.',         icon: <TrophyOutlined /> },
  { key: 'campaigns',     label: 'Campagnes',            icon: <NotificationOutlined /> },
  { key: 'distributions', label: 'Distribution Méd.',    icon: <SendOutlined /> },
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
  const [distributions, setDistributions] = useState<MedicalDistributionDTO[]>([]);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [resourceForm] = Form.useForm();
  const [campaignForm] = Form.useForm();

  const isRespDiffusion = user?.roles?.some((r: string) =>
    ['RESP_DIFFUSION', 'PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_NATIONAL', 'SECRETAIRE_GENERAL'].includes(r)
  ) || user?.type === 'ADMIN';

  const isPresident = user?.roles?.some((r: string) =>
    ['PRESIDENT', 'VICE_PRESIDENT', 'PRESIDENT_LOCAL', 'PRESIDENT_REGIONAL', 'PRESIDENT_NATIONAL', 'VICE_PRESIDENT_LOCAL', 'VICE_PRESIDENT_REGIONAL', 'VICE_PRESIDENT_NATIONAL'].includes(r)
  );

  const [resourceFile, setResourceFile] = useState<{ name: string; size: string; base64: string } | null>(null);
  const [campaignImage, setCampaignImage] = useState<string>('');

  const handleResourceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setResourceFile({
          name: file.name,
          size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          base64: reader.result as string,
        });
        resourceForm.setFieldsValue({ contentUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCampaignImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCampaignImage(reader.result as string);
        campaignForm.setFieldsValue({ imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, cam, dists] = await Promise.all([
        diffusionService.getResources().catch(() => []),
        diffusionService.getCampaigns().catch(() => []),
        user?.committeeId
          ? santeService.getDistributionsByCommittee(user.committeeId).catch(() => [])
          : Promise.resolve([]),
      ]);
      setResources(res || []);
      setCampaigns(cam || []);
      // Show only APPROVED distributions in DiffusionPage
      setDistributions((dists || []).filter((d: MedicalDistributionDTO) => d.status === 'APPROVED' || d.status === 'DISTRIBUTED'));
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
      setResourceFile(null);
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
        name: values.name, 
        description: values.description, 
        startDate, 
        endDate,
        targetAudience: values.targetAudience,
        channels: (values.channels || []).join(','),
        status: values.status || 'PLANNED',
        location: values.location || '',
        volunteersNeeded: values.volunteersNeeded ? Number(values.volunteersNeeded) : 0,
        collaborationType: values.collaborationType || 'INTERNAL',
        imageUrl: values.imageUrl || '',
      } as any);
      messageApi.success('Campagne créée !');
      setIsCampaignModalOpen(false);
      setCampaignImage('');
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
            {r.description && <Text type="secondary" style={{ fontSize: 11, display: 'block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</Text>}
          </div>
        </Space>
      ),
    },
    {
      title: 'FORMAT', dataIndex: 'contentType', key: 'contentType', width: 120,
      render: ct => <Tag bordered={false} style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', borderRadius: 6, fontWeight: 600 }}>{ct}</Tag>,
    },
    {
      title: 'ACTIONS', key: 'action', width: 110,
      render: (_, r) => (
        <Space>
          {(r.contentUrl?.startsWith('data:') || r.fileUrl?.startsWith('data:')) ? (
            <Button 
              type="primary" size="small" style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 6, fontSize: 11 }}
              onClick={() => {
                const link = document.createElement('a');
                link.href = r.contentUrl || r.fileUrl || '';
                link.download = `${r.title || 'ressource'}.bin`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Télécharger
            </Button>
          ) : (
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => r.contentUrl && window.open(r.contentUrl, '_blank')} />
          )}
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
          {r.imageUrl ? (
            <img src={r.imageUrl} alt={r.name || r.title}
              style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isDark ? 'rgba(99,102,241,0.1)' : '#eef2ff', color: '#6366f1',
            }}>
              <NotificationOutlined style={{ fontSize: 20 }} />
            </div>
          )}
          <div>
            <Text strong style={{ fontSize: 14, display: 'block' }}>{(r as any).name || r.title}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>Cible: {r.targetAudience || 'Public'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'DÉTAILS', key: 'details',
      render: (_, r) => (
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, display: 'block' }}>📍 {r.location || 'Non spécifiée'}</span>
          <span style={{ fontSize: 11, color: C.gray600 }}>👥 Besoin: {r.volunteersNeeded || 0} bénévoles</span>
        </div>
      )
    },
    {
      title: 'COLLABORATION', key: 'collaboration',
      render: (_, r) => (
        <Tag color={r.collaborationType === 'COLLABORATION' ? 'purple' : 'blue'} style={{ borderRadius: 6 }}>
          {r.collaborationType === 'COLLABORATION' ? '🤝 Multi-Comités' : '🏠 Interne Comité'}
        </Tag>
      )
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
      title: 'STATUT', dataIndex: 'status', key: 'status', width: 100,
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

                  {activeTab === 'distributions' && (
                    <div>
                      <div style={{ marginBottom: 20, padding: '14px 18px', borderRadius: 14, background: 'rgba(224,28,46,0.06)', border: '1px solid rgba(224,28,46,0.15)' }}>
                        <Text style={{ color: '#c0152a', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <SendOutlined /> Ces ressources médicales ont été <Text strong style={{ color: '#c0152a' }}>approuvées par le Président</Text> et sont disponibles pour distribution.
                        </Text>
                      </div>
                      <Table<MedicalDistributionDTO>
                        dataSource={distributions}
                        rowKey="id"
                        pagination={{ pageSize: 8, hideOnSinglePage: true }}
                        locale={{ emptyText: <div style={{ padding: '40px 0', textAlign: 'center' }}><Title level={5}>Aucune ressource médicale disponible</Title><Text type="secondary">Les ressources approuvées par le Président apparaîtront ici.</Text></div> }}
                        columns={[
                          {
                            title: 'RESSOURCE',
                            key: 'resource',
                            render: (_: any, r: MedicalDistributionDTO) => (
                              <div>
                                <Text strong style={{ display: 'block', fontSize: 14 }}>{r.title}</Text>
                                <Tag style={{ borderRadius: 6, background: 'rgba(224,28,46,0.08)', color: '#c0152a', border: '1px solid rgba(224,28,46,0.2)', fontSize: 11 }}>
                                  {r.resourceType?.replace(/_/g, ' ')}
                                </Tag>
                              </div>
                            )
                          },
                          {
                            title: 'DESTINATION',
                            key: 'dest',
                            render: (_: any, r: MedicalDistributionDTO) => (
                              <div>
                                <Text style={{ fontSize: 13 }}>{r.destinationName || '-'}</Text>
                                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{r.destinationType}</Text>
                              </div>
                            )
                          },
                          {
                            title: 'QUANTITÉ',
                            key: 'qty',
                            render: (_: any, r: MedicalDistributionDTO) => (
                              <Text strong style={{ color: '#c0152a' }}>{r.quantity} {r.unit || 'unités'}</Text>
                            )
                          },
                          {
                            title: 'APPROUVÉ PAR',
                            dataIndex: 'approvedByName',
                            key: 'approvedBy',
                            render: (n: string) => <Text style={{ fontSize: 12 }}>{n || '-'}</Text>
                          },
                          {
                            title: 'STATUT',
                            dataIndex: 'status',
                            key: 'status',
                            render: (s: string) => (
                              <Tag color={s === 'APPROVED' ? 'success' : 'cyan'} style={{ borderRadius: 8, fontWeight: 600 }}>
                                {s === 'APPROVED' ? <Space size={4}><CheckCircleOutlined /> Approuvé</Space> : <Space size={4}><CarOutlined /> Distribué</Space>}
                              </Tag>
                            )
                          }
                        ]}
                      />
                    </div>
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
        footer={null} width={650} centered
        styles={{ content: { borderRadius: 24, padding: 30 } }}
      >
        <Form form={resourceForm} layout="vertical" onFinish={handleCreateResource} requiredMark={false}>
          <Form.Item name="title" label={<span style={{ fontWeight: 600 }}>Intitulé / Titre du support</span>} rules={[{ required: true, message: 'Titre requis' }]}>
            <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Guide des premiers secours" />
          </Form.Item>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="category" label={<span style={{ fontWeight: 600 }}>Thématique</span>} rules={[{ required: true }]}>
                <Select size="large" style={{ borderRadius: 12 }}>
                  <Option value="PREMIERS_SECOURS">Secourisme</Option>
                  <Option value="HYGIENE">Santé & Hygiène</Option>
                  <Option value="GOUVERNANCE">Gouvernance</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contentType" label={<span style={{ fontWeight: 600 }}>Format du média</span>} rules={[{ required: true }]}>
                <Select size="large" style={{ borderRadius: 12 }}>
                  <Option value="DOCUMENT">Document (PDF, Word, PPT)</Option>
                  <Option value="VIDEO">Vidéo</Option>
                  <Option value="AUDIO">Audio / Podcast</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="language" label={<span style={{ fontWeight: 600 }}>Langue du support</span>} rules={[{ required: true }]}>
                <Select size="large" style={{ borderRadius: 12 }}>
                  <Option value="ARABIC">Arabe</Option>
                  <Option value="FRENCH">Français</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="contentUrl" label={<span style={{ fontWeight: 600 }}>Lien externe (Optionnel)</span>}>
                <Input size="large" style={{ borderRadius: 12 }} placeholder="https://..." />
              </Form.Item>
            </Col>
          </Row>

          {/* DRAG & DROP FILE UPLOAD AREA FOR RESOURCES */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
              📁 Importer un document / fichier (PDF, Word, PPT, TXT, Image)
            </span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div 
                onClick={() => document.getElementById('resource-file-input')?.click()}
                style={{
                  flex: 1, minWidth: 200, height: 95, border: '2px dashed rgba(16,185,129,0.3)', borderRadius: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: 'rgba(16,185,129,0.02)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'}
              >
                <PlusOutlined style={{ fontSize: 20, color: '#10b981', marginBottom: 4 }} />
                <span style={{ fontSize: 12, color: C.gray800, fontWeight: 600 }}>Importer le fichier</span>
                <span style={{ fontSize: 10, color: C.gray400 }}>PDF, Word, PowerPoint, TXT, Image (Max 10Mo)</span>
                <input 
                  type="file" id="resource-file-input" 
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/*" 
                  onChange={handleResourceFileChange} style={{ display: 'none' }} 
                />
              </div>
              {resourceFile && (
                <div style={{ 
                  padding: '12px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 12, 
                  display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(16,185,129,0.2)',
                  flexShrink: 0, minWidth: 180,
                }}>
                  <div style={{ fontSize: 24 }}>📄</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: C.gray800, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {resourceFile.name}
                    </div>
                    <div style={{ fontSize: 10, color: C.gray400 }}>{resourceFile.size}</div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setResourceFile(null);
                      resourceForm.setFieldsValue({ contentUrl: '' });
                    }}
                    style={{
                      background: 'transparent', border: 'none', color: '#ef4444', 
                      cursor: 'pointer', fontWeight: 800, fontSize: 14, marginLeft: 'auto'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>

          <Form.Item name="description" label={<span style={{ fontWeight: 600 }}>Description de la ressource</span>} rules={[{ required: true }]}>
            <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Décrivez succinctement les objectifs de ce document ou contenu..." />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button onClick={() => setIsResourceModalOpen(false)} style={{ borderRadius: 12 }}>Annuler</Button>
            <Button type="primary" htmlType="submit" loading={submitLoading} style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 12 }}>Enregistrer</Button>
          </div>
        </Form>
      </Modal>

      {/* ── Modal: Campagne ── */}
      <Modal
        title={<Space><NotificationOutlined style={{ color: '#6366f1' }} /><Text strong style={{ fontSize: 17 }}>Lancer une Campagne de Sensibilisation</Text></Space>}
        open={isCampaignModalOpen}
        onCancel={() => setIsCampaignModalOpen(false)}
        footer={null} width={700} centered
        styles={{ content: { borderRadius: 24, padding: 30 } }}
      >
        <Form form={campaignForm} layout="vertical" onFinish={handleCreateCampaign} requiredMark={false}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label={<span style={{ fontWeight: 600 }}>Nom de la campagne</span>} rules={[{ required: true }]}>
                <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Sensibilisation Gestes Qui Sauvent" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="dates" label={<span style={{ fontWeight: 600 }}>Période (Début et Fin)</span>} rules={[{ required: true }]}>
                <RangePicker size="large" style={{ width: '100%', borderRadius: 12 }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="targetAudience" label={<span style={{ fontWeight: 600 }}>Public cible</span>}>
                <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Écoles, Lycées, Grand Public" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="location" label={<span style={{ fontWeight: 600 }}>Localisation ou adresse précise</span>} rules={[{ required: true }]}>
                <Input size="large" style={{ borderRadius: 12 }} placeholder="Ex: Grand Tunis, Place du Gouvernement" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="volunteersNeeded" label={<span style={{ fontWeight: 600 }}>Nombre de bénévoles nécessaires</span>} initialValue={5}>
                <Input type="number" min={1} size="large" style={{ borderRadius: 12 }} placeholder="Ex: 10" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="collaborationType" label={<span style={{ fontWeight: 600 }}>Type de collaboration comités</span>} rules={[{ required: true }]} initialValue="INTERNAL">
                <Select size="large" style={{ borderRadius: 12 }}>
                  <Option value="INTERNAL">🏠 Comité local uniquement</Option>
                  <Option value="COLLABORATION">🤝 En collaboration avec d'autres comités locaux/régionaux</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="status" label={<span style={{ fontWeight: 600 }}>État de la campagne</span>} initialValue="PLANNED">
                <Select size="large" style={{ borderRadius: 12 }}>
                  <Option value="PLANNED">📅 Planifiée</Option>
                  <Option value="ACTIVE">⚡ En cours</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="channels" label={<span style={{ fontWeight: 600 }}>Canaux de diffusion</span>}>
                <Select mode="tags" size="large" style={{ borderRadius: 12 }} placeholder="Presse, Réseaux sociaux...">
                  <Option value="Radio">Radio</Option>
                  <Option value="Social Media">Réseaux Sociaux</Option>
                  <Option value="Print">Affichage public / Affiches</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* PHOTO UPLOAD DRAG & DROP ZONE FOR CAMPAIGNS */}
          <div style={{ marginBottom: 20 }}>
            <span style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 8 }}>
              📸 Photo / Affiche de la campagne (Fichier image)
            </span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div 
                onClick={() => document.getElementById('campaign-image-input')?.click()}
                style={{
                  flex: 1, minWidth: 200, height: 95, border: '2px dashed rgba(99,102,241,0.3)', borderRadius: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', background: 'rgba(99,102,241,0.02)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
              >
                <PlusOutlined style={{ fontSize: 20, color: '#6366f1', marginBottom: 4 }} />
                <span style={{ fontSize: 12, color: C.gray800, fontWeight: 600 }}>Importer une photo</span>
                <span style={{ fontSize: 10, color: C.gray400 }}>PNG, JPG, JPEG (Max 5Mo)</span>
                <input 
                  type="file" id="campaign-image-input" accept="image/*" 
                  onChange={handleCampaignImageChange} style={{ display: 'none' }} 
                />
              </div>
              {campaignImage && (
                <div style={{ position: 'relative', width: 95, height: 95, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }}>
                  <img src={campaignImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    type="button"
                    onClick={() => {
                      setCampaignImage('');
                      campaignForm.setFieldsValue({ imageUrl: '' });
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

          <Form.Item name="description" label={<span style={{ fontWeight: 600 }}>Objectifs & Description complète</span>} rules={[{ required: true }]}>
            <TextArea rows={3} style={{ borderRadius: 12 }} placeholder="Détaillez les buts de la campagne, les résultats attendus..." />
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
