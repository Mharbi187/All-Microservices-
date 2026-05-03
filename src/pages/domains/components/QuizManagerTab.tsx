// ============================================================
// QuizManagerTab — Onglet Quiz & Formation (Resp. Diffusion)
// Création de quiz, gestion statuts, résultats par volontaire
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, Select, Space, message,
  Tooltip, Empty, Progress, Drawer, InputNumber, Divider, Radio,
  Checkbox, Typography,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EyeOutlined, TrophyOutlined,
  QuestionCircleOutlined, CheckCircleOutlined, PlayCircleOutlined,
  PauseCircleOutlined, BarChartOutlined, MinusCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { ColumnsType } from 'antd/es/table';
import quizService from '@/services/quizService';
import type { QuizDTO, QuizCreateDTO, QuizQuestion } from '@/services/quizService';
import { useAuthStore } from '@/stores';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

const C = {
  red: '#CC0000', redDark: '#990000', redFade: 'rgba(204,0,0,0.07)',
  white: '#FFFFFF', gray50: '#F7F5F3', gray100: '#EEEBE8',
  gray400: '#A09890', gray600: '#5E5650', gray800: '#2C2420',
};

interface Props { isDark?: boolean; }

const QuizManagerTab: React.FC<Props> = ({ isDark = false }) => {
  const { user } = useAuthStore();
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsDrawer, setDetailsDrawer] = useState<QuizDTO | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const glassCard = {
    background: isDark ? 'rgba(255,255,255,0.03)' : C.white,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : C.gray100}`,
    borderRadius: 16, padding: 24, marginBottom: 16,
  };

  const load = async () => {
    setLoading(true);
    try { const data = await quizService.getQuizzes(user?.committeeId); setQuizzes(data); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      text: '', type: 'SINGLE', options: ['', ''], correctAnswers: [0], points: 10,
    }]);
  };

  const removeQuestion = (idx: number) => setQuestions(prev => prev.filter((_, i) => i !== idx));

  const updateQuestion = (idx: number, field: keyof QuizQuestion, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleCreate = async (values: any) => {
    if (questions.length === 0) { message.error('Ajoutez au moins une question.'); return; }
    setSubmitLoading(true);
    try {
      const payload: QuizCreateDTO = {
        title: values.title,
        description: values.description,
        category: values.category,
        minScore: values.minScore ?? 70,
        timeLimit: values.timeLimit,
        questions,
        badgeTitle: values.badgeTitle,
        badgeColor: values.badgeColor || C.red,
        committeeId: user?.committeeId,
      };
      const created = await quizService.createQuiz(payload);
      setQuizzes(prev => [created, ...prev]);
      message.success('Quiz créé en brouillon — publiez-le pour le rendre visible.');
      setCreateOpen(false);
      form.resetFields();
      setQuestions([]);
    } finally { setSubmitLoading(false); }
  };

  const handlePublish = async (q: QuizDTO) => {
    await quizService.publishQuiz(q.id);
    setQuizzes(prev => prev.map(x => x.id === q.id ? { ...x, status: 'PUBLISHED' } : x));
    message.success('Quiz publié — visible aux volontaires !');
  };

  const handleArchive = async (q: QuizDTO) => {
    await quizService.archiveQuiz(q.id);
    setQuizzes(prev => prev.map(x => x.id === q.id ? { ...x, status: 'ARCHIVED' } : x));
    message.info('Quiz archivé.');
  };

  const handleDelete = async (q: QuizDTO) => {
    await quizService.deleteQuiz(q.id);
    setQuizzes(prev => prev.filter(x => x.id !== q.id));
    message.success('Quiz supprimé.');
  };

  const columns: ColumnsType<QuizDTO> = [
    {
      title: 'Quiz',
      key: 'title',
      render: (_, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${quizService.categoryColor(r.category)}18`,
            color: quizService.categoryColor(r.category),
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
          }}>
            <TrophyOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 14 }}>{r.title}</div>
            <div style={{ color: C.gray400, fontSize: 12, marginTop: 2 }}>
              {r.questions.length} questions · Score min : {r.minScore}%
              {r.timeLimit && ` · ${r.timeLimit} min`}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (c: string) => (
        <Tag bordered={false} style={{ background: `${quizService.categoryColor(c)}15`, color: quizService.categoryColor(c), borderRadius: 6, fontWeight: 600 }}>
          {quizService.categoryLabel(c)}
        </Tag>
      ),
    },
    {
      title: 'Participants',
      key: 'participants',
      width: 130,
      render: (_, r) => (
        <div>
          <div style={{ fontWeight: 700, color: isDark ? '#F3F4F6' : C.gray800 }}>{r.totalParticipants ?? 0}</div>
          {(r.totalParticipants ?? 0) > 0 && (
            <div style={{ width: 80 }}>
              <Progress percent={r.passRate ?? 0} size="small" strokeColor="#10B981" showInfo={false} />
              <div style={{ fontSize: 10, color: C.gray400 }}>{r.passRate ?? 0}% réussite</div>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (s: string) => (
        <Tag style={{
          background: `${quizService.statusColor(s as any)}18`, color: quizService.statusColor(s as any),
          border: 'none', borderRadius: 20, padding: '3px 12px', fontWeight: 700,
        }}>
          {quizService.statusLabel(s as any)}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 160,
      render: (_, r) => (
        <Space size={6}>
          <Tooltip title="Voir Détails">
            <Button type="text" icon={<EyeOutlined />} onClick={() => setDetailsDrawer(r)} />
          </Tooltip>
          {r.status === 'DRAFT' && (
            <Tooltip title="Publier">
              <Button type="text" icon={<PlayCircleOutlined style={{ color: '#10B981' }} />} onClick={() => handlePublish(r)} />
            </Tooltip>
          )}
          {r.status === 'PUBLISHED' && (
            <Tooltip title="Archiver">
              <Button type="text" icon={<PauseCircleOutlined style={{ color: '#F59E0B' }} />} onClick={() => handleArchive(r)} />
            </Tooltip>
          )}
          <Tooltip title="Supprimer">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(r)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Quiz', value: quizzes.length, color: C.red, icon: <QuestionCircleOutlined /> },
          { label: 'Publiés', value: quizzes.filter(q => q.status === 'PUBLISHED').length, color: '#10B981', icon: <CheckCircleOutlined /> },
          { label: 'Brouillons', value: quizzes.filter(q => q.status === 'DRAFT').length, color: '#F59E0B', icon: <PauseCircleOutlined /> },
          { label: 'Participants', value: quizzes.reduce((a, q) => a + (q.totalParticipants ?? 0), 0), color: '#3B82F6', icon: <BarChartOutlined /> },
        ].map(s => (
          <div key={s.label} style={{ ...glassCard, padding: '12px 20px', marginBottom: 0, display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 120px' }}>
            <span style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#F3F4F6' : C.gray800 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.gray400, fontWeight: 600 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontWeight: 700, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 15 }}>Mes Quiz ({quizzes.length})</span>
        <Button icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}
          style={{ background: C.red, color: C.white, border: 'none', borderRadius: 10, fontWeight: 700, height: 38 }}>
          Créer un Quiz
        </Button>
      </div>

      <div style={glassCard as React.CSSProperties}>
        <Table columns={columns} dataSource={quizzes} rowKey="id" loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="Aucun quiz créé" /> }} />
      </div>

      {/* ── Details Drawer ── */}
      <Drawer
        title={detailsDrawer?.title}
        open={!!detailsDrawer}
        onClose={() => setDetailsDrawer(null)}
        width="min(540px, 95vw)"
        extra={<Tag color="green">{detailsDrawer?.totalParticipants ?? 0} participants</Tag>}
      >
        {detailsDrawer && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[
                { l: 'Catégorie', v: quizService.categoryLabel(detailsDrawer.category) },
                { l: 'Score Minimum', v: `${detailsDrawer.minScore}%` },
                { l: 'Questions', v: detailsDrawer.questions.length },
                { l: 'Temps Limite', v: detailsDrawer.timeLimit ? `${detailsDrawer.timeLimit} min` : 'Illimité' },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: C.gray50, borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
                  <div style={{ fontWeight: 700, color: C.gray800, fontSize: 15, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>

            {(detailsDrawer.totalParticipants ?? 0) > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: C.gray800, marginBottom: 8 }}>Taux de Réussite</div>
                <Progress percent={detailsDrawer.passRate ?? 0} strokeColor={{ from: C.red, to: '#10B981' }} />
              </div>
            )}

            {detailsDrawer.badgeTitle && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${detailsDrawer.badgeColor || C.red}12`, borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                <TrophyOutlined style={{ color: detailsDrawer.badgeColor || C.red, fontSize: 22 }} />
                <div>
                  <div style={{ fontSize: 11, color: C.gray400, fontWeight: 700, textTransform: 'uppercase' }}>Badge attribué</div>
                  <div style={{ fontWeight: 800, color: detailsDrawer.badgeColor || C.red }}>{detailsDrawer.badgeTitle}</div>
                </div>
              </div>
            )}

            <Divider />
            <div style={{ fontWeight: 700, color: C.gray800, marginBottom: 12 }}>Questions ({detailsDrawer.questions.length})</div>
            {detailsDrawer.questions.map((q, i) => (
              <div key={i} style={{ background: C.gray50, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ fontWeight: 600, color: C.gray800, marginBottom: 8 }}>Q{i + 1}. {q.text}</div>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: q.type === 'SINGLE' ? '50%' : 4, flexShrink: 0,
                      background: q.correctAnswers.includes(oi) ? '#DCFCE7' : C.gray100,
                      border: `2px solid ${q.correctAnswers.includes(oi) ? '#10B981' : C.gray100}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {q.correctAnswers.includes(oi) && <CheckCircleOutlined style={{ fontSize: 10, color: '#10B981' }} />}
                    </div>
                    <span style={{ fontSize: 13, color: q.correctAnswers.includes(oi) ? '#15803D' : C.gray600 }}>{opt}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: C.gray400, marginTop: 6, textAlign: 'right' }}>{q.points} pts</div>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {/* ── Create Modal ── */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><TrophyOutlined style={{ color: C.red }} /><span style={{ fontWeight: 800 }}>Créer un Quiz</span></div>}
        open={createOpen}
        onCancel={() => { setCreateOpen(false); form.resetFields(); setQuestions([]); }}
        footer={null} width="min(800px, 95vw)" centered
        styles={{ body: { maxHeight: '80vh', overflowY: 'auto' }, content: { borderRadius: 20, padding: 0, overflow: 'hidden' } }}
      >
        <div style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, padding: '16px 28px' }}>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
            Le quiz sera visible aux volontaires après publication. Les réussites génèrent automatiquement un badge.
          </p>
        </div>
        <div style={{ padding: 28 }}>
          <Form form={form} layout="vertical" onFinish={handleCreate} requiredMark={false}>
            {/* Basic info */}
            <Form.Item name="title" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Titre du Quiz</span>} rules={[{ required: true }]}>
              <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Premiers Secours — Niveau 1" />
            </Form.Item>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              <Form.Item name="category" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Catégorie</span>} rules={[{ required: true }]}>
                <Select size="large">
                  <Option value="SECOURISME">Secourisme</Option>
                  <Option value="GOUVERNANCE">Gouvernance</Option>
                  <Option value="SANTE">Santé</Option>
                  <Option value="FORMATION">Formation</Option>
                  <Option value="DIFFUSION">Diffusion</Option>
                </Select>
              </Form.Item>
              <Form.Item name="minScore" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Score Minimum (%)</span>} initialValue={70}>
                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={0} max={100} />
              </Form.Item>
              <Form.Item name="timeLimit" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Durée (min) — optionnel</span>}>
                <InputNumber size="large" style={{ width: '100%', borderRadius: 10 }} min={1} placeholder="Illimité" />
              </Form.Item>
            </div>

            <Form.Item name="description" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Description</span>} rules={[{ required: true }]}>
              <TextArea rows={2} style={{ borderRadius: 10 }} placeholder="Objectif pédagogique du quiz..." />
            </Form.Item>

            {/* Badge */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              <Form.Item name="badgeTitle" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Badge (réussite)</span>}>
                <Input size="large" style={{ borderRadius: 10 }} placeholder="Ex: Secouriste Niveau 1" prefix={<TrophyOutlined />} />
              </Form.Item>
              <Form.Item name="badgeColor" label={<span style={{ fontWeight: 600, fontSize: 13 }}>Couleur Badge</span>} initialValue={C.red}>
                <Select size="large">
                  <Option value="#CC0000">Rouge CRT</Option>
                  <Option value="#10B981">Vert</Option>
                  <Option value="#3B82F6">Bleu</Option>
                  <Option value="#F59E0B">Or</Option>
                  <Option value="#8B5CF6">Violet</Option>
                </Select>
              </Form.Item>
            </div>

            <Divider />

            {/* Questions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, color: C.gray800, fontSize: 15 }}>Questions ({questions.length})</span>
              <Button icon={<PlusOutlined />} onClick={addQuestion} style={{ borderRadius: 8 }}>Ajouter une Question</Button>
            </div>

            {questions.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', background: C.gray50, borderRadius: 12, marginBottom: 16 }}>
                <QuestionCircleOutlined style={{ fontSize: 28, color: C.gray400 }} />
                <div style={{ color: C.gray400, marginTop: 8 }}>Ajoutez des questions pour construire le quiz</div>
              </div>
            )}

            {questions.map((q, idx) => (
              <div key={idx} style={{ background: C.gray50, borderRadius: 14, padding: 16, marginBottom: 12, position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, color: C.gray800 }}>Question {idx + 1}</span>
                  <Button type="text" danger size="small" icon={<MinusCircleOutlined />} onClick={() => removeQuestion(idx)} />
                </div>
                <Input
                  value={q.text}
                  onChange={e => updateQuestion(idx, 'text', e.target.value)}
                  placeholder="Énoncé de la question..." style={{ borderRadius: 8, marginBottom: 8 }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 10px', marginBottom: 8 }}>
                  <Select value={q.type} onChange={v => updateQuestion(idx, 'type', v)} size="small">
                    <Option value="SINGLE">Choix unique</Option>
                    <Option value="MULTIPLE">Choix multiple</Option>
                    <Option value="TRUE_FALSE">Vrai/Faux</Option>
                  </Select>
                  <InputNumber value={q.points} onChange={v => updateQuestion(idx, 'points', v || 10)} min={1} size="small" addonBefore="pts" style={{ borderRadius: 6 }} />
                </div>
                {q.options.map((opt, oi) => (
                  <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {q.type === 'MULTIPLE' ? (
                      <Checkbox
                        checked={q.correctAnswers.includes(oi)}
                        onChange={e => {
                          const ca = e.target.checked ? [...q.correctAnswers, oi] : q.correctAnswers.filter(x => x !== oi);
                          updateQuestion(idx, 'correctAnswers', ca);
                        }}
                      />
                    ) : (
                      <Radio checked={q.correctAnswers[0] === oi} onChange={() => updateQuestion(idx, 'correctAnswers', [oi])} />
                    )}
                    <Input value={opt} onChange={e => {
                      const newOpts = [...q.options];
                      newOpts[oi] = e.target.value;
                      updateQuestion(idx, 'options', newOpts);
                    }} placeholder={`Option ${oi + 1}`} size="small" style={{ borderRadius: 6 }} />
                    {q.options.length > 2 && (
                      <Button type="text" size="small" icon={<MinusCircleOutlined />} danger
                        onClick={() => {
                          const newOpts = q.options.filter((_, i) => i !== oi);
                          updateQuestion(idx, 'options', newOpts);
                          updateQuestion(idx, 'correctAnswers', []);
                        }}
                      />
                    )}
                  </div>
                ))}
                {q.type !== 'TRUE_FALSE' && (
                  <Button type="dashed" size="small" icon={<PlusOutlined />}
                    onClick={() => updateQuestion(idx, 'options', [...q.options, ''])}
                    style={{ borderRadius: 6, marginTop: 4 }}>
                    Ajouter option
                  </Button>
                )}
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <Button onClick={() => { setCreateOpen(false); form.resetFields(); setQuestions([]); }} style={{ borderRadius: 10 }}>Annuler</Button>
              <Button htmlType="submit" loading={submitLoading}
                style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, color: C.white, border: 'none', borderRadius: 10, fontWeight: 700, height: 38 }}>
                Enregistrer le Quiz
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </motion.div>
  );
};

export default QuizManagerTab;
