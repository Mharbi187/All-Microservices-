// ============================================================
// NEXUS-AID — Quiz Page (Espace Volontaire)
// Participation aux quiz, badges, historique résultats
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Row, Col, Typography, Spin, Empty, Progress, Modal,
  Button, Radio, Checkbox, Tag, Space, Result, Avatar, Divider,
} from 'antd';
import {
  TrophyOutlined, ClockCircleOutlined, CheckCircleOutlined,
  QuestionCircleOutlined, StarOutlined, PlayCircleOutlined,
  FireOutlined, LockOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import quizService from '@/services/quizService';
import type { QuizDTO, QuizResultDTO, QuizAnswerDTO } from '@/services/quizService';
import { useAuthStore, useUIStore } from '@/stores';

const { Title, Text } = Typography;

// ── Palette ──────────────────────────────────────────────────
const C = {
  red: '#CC0000', redDark: '#990000', redFade: 'rgba(204,0,0,0.08)',
  white: '#FFFFFF', gray50: '#F7F5F3', gray100: '#EEEBE8',
  gray200: '#DEDAD6', gray400: '#A09890', gray600: '#5E5650', gray800: '#2C2420',
};

// ── Quiz Card ────────────────────────────────────────────────
const QuizCard: React.FC<{
  quiz: QuizDTO;
  myResults: QuizResultDTO[];
  isDark: boolean;
  onStart: (quiz: QuizDTO) => void;
}> = ({ quiz, myResults, isDark, onStart }) => {
  const myResult = myResults.find(r => r.quizId === quiz.id);
  const catColor = quizService.categoryColor(quiz.category);
  const cardBg = isDark ? '#1A1D27' : C.white;

  return (
    <motion.div
      whileHover={{ y: -6, boxShadow: `0 20px 60px ${catColor}20` }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      style={{
        background: cardBg, borderRadius: 24, overflow: 'hidden',
        border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : C.gray100}`,
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
        height: '100%', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Color strip */}
      <div style={{ height: 5, background: `linear-gradient(90deg, ${catColor}, ${catColor}70)` }} />

      <div style={{ padding: '20px 20px 14px', flex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <Tag bordered={false} style={{ background: `${catColor}15`, color: catColor, borderRadius: 20, fontWeight: 800, fontSize: 11 }}>
            {quizService.categoryLabel(quiz.category)}
          </Tag>
          {myResult && (
            <div style={{
              background: myResult.passed ? '#DCFCE7' : '#FEE2E2',
              color: myResult.passed ? '#15803D' : '#DC2626',
              borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {myResult.passed ? <CheckCircleOutlined /> : <LockOutlined />}
              {myResult.score}%
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ fontSize: 16, fontWeight: 900, color: isDark ? '#F3F4F6' : C.gray800, lineHeight: 1.3, marginBottom: 10 }}>
          {quiz.title}
        </div>
        <div style={{ fontSize: 13, color: isDark ? '#9CA3AF' : C.gray600, lineHeight: 1.6, marginBottom: 16 }}>
          {quiz.description}
        </div>

        {/* Meta */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.gray400 }}>
            <QuestionCircleOutlined /> {quiz.questions.length} questions
          </div>
          {quiz.timeLimit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.gray400 }}>
              <ClockCircleOutlined /> {quiz.timeLimit} min
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: C.gray400 }}>
            <FireOutlined /> Score min: {quiz.minScore}%
          </div>
        </div>

        {/* Badge */}
        {quiz.badgeTitle && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: `${quiz.badgeColor || C.red}10`, borderRadius: 10, padding: '8px 12px', marginBottom: 14,
          }}>
            <TrophyOutlined style={{ color: quiz.badgeColor || C.red, fontSize: 16 }} />
            <div>
              <div style={{ fontSize: 10, color: C.gray400, fontWeight: 700, textTransform: 'uppercase' }}>Badge à gagner</div>
              <div style={{ fontWeight: 800, color: quiz.badgeColor || C.red, fontSize: 13 }}>{quiz.badgeTitle}</div>
            </div>
          </div>
        )}

        {/* Progress if already done */}
        {myResult && (
          <div style={{ marginBottom: 12 }}>
            <Progress percent={myResult.score} strokeColor={myResult.passed ? '#10B981' : '#EF4444'} size="small" />
          </div>
        )}
      </div>

      <Divider style={{ margin: 0, borderColor: isDark ? 'rgba(255,255,255,0.06)' : C.gray100 }} />
      <div style={{ padding: '14px 20px' }}>
        {myResult ? (
          <Button block onClick={() => onStart(quiz)} style={{
            borderRadius: 12, fontWeight: 700,
            background: isDark ? 'rgba(255,255,255,0.07)' : C.gray50, border: 'none',
            color: isDark ? '#F3F4F6' : C.gray800,
          }}>
            Repasser le Quiz
          </Button>
        ) : (
          <button
            onClick={() => onStart(quiz)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`,
              color: C.white, border: 'none', borderRadius: 12, padding: '10px 0',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(204,0,0,0.28)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.02)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <PlayCircleOutlined /> Commencer
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ── Badge Card ───────────────────────────────────────────────
const BadgeCard: React.FC<{ result: QuizResultDTO; isDark: boolean }> = ({ result, isDark }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ type: 'spring', stiffness: 400 }}
    style={{
      background: isDark ? '#1A1D27' : C.white, borderRadius: 16,
      border: `2px solid ${result.badgeColor || C.red}40`,
      padding: '20px 16px', textAlign: 'center',
      boxShadow: `0 8px 24px ${result.badgeColor || C.red}18`,
    }}
  >
    <div style={{
      width: 60, height: 60, borderRadius: '50%', margin: '0 auto 12px',
      background: `linear-gradient(135deg, ${result.badgeColor || C.red}, ${result.badgeColor || C.red}80)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
      boxShadow: `0 8px 20px ${result.badgeColor || C.red}40`,
    }}>
      🏆
    </div>
    <div style={{ fontWeight: 800, color: isDark ? '#F3F4F6' : C.gray800, fontSize: 14, marginBottom: 4 }}>{result.badgeEarned}</div>
    <div style={{ fontSize: 12, color: C.gray400 }}>{result.quizTitle}</div>
    <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCFCE7', color: '#15803D', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>
      <StarOutlined /> {result.score}%
    </div>
  </motion.div>
);

// ── Main Page ─────────────────────────────────────────────────
const QuizPage: React.FC = () => {
  const { user } = useAuthStore();
  const { themeMode } = useUIStore();
  const isDark = themeMode === 'dark';

  const [quizzes, setQuizzes] = useState<QuizDTO[]>([]);
  const [myResults, setMyResults] = useState<QuizResultDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'badges'>('available');

  // Quiz session state
  const [session, setSession] = useState<QuizDTO | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswerDTO[]>([]);
  const [result, setResult] = useState<QuizResultDTO | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const bg = isDark ? '#0F1117' : '#F5F5F7';
  const cardBg = isDark ? '#1A1D27' : C.white;
  const textPrimary = isDark ? '#F3F4F6' : C.gray800;
  const textSecondary = isDark ? '#9CA3AF' : C.gray600;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [q, r] = await Promise.all([
          quizService.getPublishedQuizzes(user?.committeeId).catch(() => [] as typeof quizzes),
          quizService.getMyResults().catch(() => [] as typeof myResults),
        ]);
        setQuizzes(q);
        setMyResults(r);
      } catch {
        // Network/gateway error — keep empty state, page remains usable
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Timer effect
  useEffect(() => {
    if (!session?.timeLimit || timeLeft === null) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setTimeLeft(p => (p ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, session]);

  const startQuiz = (quiz: QuizDTO) => {
    setSession(quiz);
    setCurrentQ(0);
    setAnswers([]);
    setResult(null);
    setTimeLeft(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  };

  const handleAnswerChange = (selectedAnswers: number[]) => {
    setAnswers(prev => {
      const filtered = prev.filter(a => a.questionIndex !== currentQ);
      return [...filtered, { questionIndex: currentQ, selectedAnswers }];
    });
  };

  const getCurrentAnswer = () => answers.find(a => a.questionIndex === currentQ)?.selectedAnswers || [];

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    setSessionLoading(true);
    try {
      const res = await quizService.submitQuiz({
        quizId: session.id, answers,
        timeTaken: session.timeLimit ? session.timeLimit * 60 - (timeLeft ?? 0) : undefined,
      });
      setResult(res);
      if (res.passed && res.badgeEarned) {
        setMyResults(prev => [...prev, res]);
      }
    } finally { setSessionLoading(false); }
  }, [session, answers, timeLeft]);

  const badges = myResults.filter(r => r.passed && r.badgeEarned);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexDirection: 'column' }}>
      <Spin size="large" /><Text type="secondary">Chargement des quiz...</Text>
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px', fontFamily: "Plus Jakarta Sans, Segoe UI, system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        style={{
          background: `linear-gradient(135deg, ${C.redDark} 0%, ${C.red} 55%, #FF3333 100%)`,
          borderRadius: 24, padding: 'clamp(24px, 4vw, 40px)', marginBottom: 32,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(204,0,0,0.3)',
        }}
      >
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', border: '40px solid rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 12px', marginBottom: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>🎓 FORMATION CRT</span>
            </div>
            <Title level={2} style={{ margin: 0, color: C.white, fontSize: 'clamp(20px, 3.5vw, 30px)', fontWeight: 900, letterSpacing: '-0.03em' }}>
              Quiz & Certifications
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 6, display: 'block' }}>
              Testez vos connaissances et obtenez vos badges officiels CRT
            </Text>
          </div>
          {badges.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
              {badges.slice(0, 3).map((b, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.18)', borderRadius: 12,
                  padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 18 }}>🏆</span>
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>Badge</div>
                    <div style={{ fontSize: 12, color: C.white, fontWeight: 800 }}>{b.badgeEarned}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Tab switcher ── */}
      <div style={{ display: 'flex', gap: 8, background: cardBg, padding: 6, borderRadius: 16, marginBottom: 28, boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.05)', width: 'fit-content' }}>
        {[
          { key: 'available', label: 'Quiz Disponibles', icon: <PlayCircleOutlined /> },
          { key: 'badges', label: `Mes Badges (${badges.length})`, icon: <TrophyOutlined /> },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 20px',
            borderRadius: 11, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: activeTab === t.key ? (isDark ? 'rgba(204,0,0,0.2)' : C.white) : 'transparent',
            color: activeTab === t.key ? C.red : textSecondary,
            boxShadow: activeTab === t.key && !isDark ? '0 2px 10px rgba(0,0,0,0.07)' : 'none',
            transition: 'all 0.2s',
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Available Quizzes ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'available' && (
          <motion.div key="available" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {quizzes.length === 0 ? (
              <Empty description={<Text style={{ color: textSecondary }}>Aucun quiz disponible pour le moment</Text>} />
            ) : (
              <Row gutter={[20, 20]}>
                {quizzes.map((quiz, idx) => (
                  <Col xs={24} sm={12} lg={8} key={quiz.id}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }} style={{ height: '100%' }}>
                      <QuizCard quiz={quiz} myResults={myResults} isDark={isDark} onStart={startQuiz} />
                    </motion.div>
                  </Col>
                ))}
              </Row>
            )}
          </motion.div>
        )}

        {/* ── Badges ── */}
        {activeTab === 'badges' && (
          <motion.div key="badges" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {badges.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <TrophyOutlined style={{ fontSize: 48, color: C.gray400 }} />
                <Title level={4} style={{ color: textSecondary, marginTop: 16 }}>Aucun badge encore</Title>
                <Text style={{ color: C.gray400 }}>Complétez des quiz pour gagner vos premiers badges !</Text>
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {badges.map((b, i) => (
                  <Col xs={12} sm={8} md={6} lg={4} key={i}>
                    <BadgeCard result={b} isDark={isDark} />
                  </Col>
                ))}
              </Row>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Quiz Session Modal ── */}
      <Modal
        open={!!session && !result}
        onCancel={() => { setSession(null); setResult(null); }}
        footer={null} closable={!sessionLoading}
        width="min(700px, 96vw)" centered
        styles={{ body: { padding: 0 }, content: { borderRadius: 20, overflow: 'hidden' } }}
      >
        {session && !result && (
          <>
            {/* Quiz header */}
            <div style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 700 }}>Question {currentQ + 1}/{session.questions.length}</div>
                <div style={{ color: C.white, fontWeight: 800, fontSize: 16 }}>{session.title}</div>
              </div>
              {timeLeft !== null && (
                <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: '8px 16px', color: C.white, fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClockCircleOutlined /> {formatTime(timeLeft)}
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ background: 'rgba(255,255,255,0.3)', height: 4 }}>
              <div style={{ height: 4, background: C.white, width: `${((currentQ + 1) / session.questions.length) * 100}%`, transition: 'width 0.3s' }} />
            </div>

            {/* Question body */}
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.gray800, marginBottom: 20, lineHeight: 1.4 }}>
                {session.questions[currentQ].text}
              </div>

              {session.questions[currentQ].type === 'MULTIPLE' ? (
                <Checkbox.Group value={getCurrentAnswer()} onChange={vals => handleAnswerChange(vals as number[])} style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    {session.questions[currentQ].options.map((opt, i) => (
                      <Checkbox key={i} value={i} style={{ fontSize: 15, padding: '12px 16px', border: `1.5px solid ${getCurrentAnswer().includes(i) ? C.red : C.gray200}`, borderRadius: 12, width: '100%', background: getCurrentAnswer().includes(i) ? C.redFade : 'transparent', marginLeft: 0 }}>
                        {opt}
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              ) : (
                <Radio.Group value={getCurrentAnswer()[0] ?? null} onChange={e => handleAnswerChange([e.target.value])} style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }} size={10}>
                    {session.questions[currentQ].options.map((opt, i) => (
                      <Radio key={i} value={i} style={{ fontSize: 15, padding: '12px 16px', border: `1.5px solid ${getCurrentAnswer()[0] === i ? C.red : C.gray200}`, borderRadius: 12, width: '100%', background: getCurrentAnswer()[0] === i ? C.redFade : 'transparent', marginLeft: 0 }}>
                        {opt}
                      </Radio>
                    ))}
                  </Space>
                </Radio.Group>
              )}

              {/* Navigation */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
                <Button disabled={currentQ === 0} onClick={() => setCurrentQ(p => p - 1)} style={{ borderRadius: 10 }}>← Précédent</Button>
                <Text style={{ color: C.gray400, fontSize: 13 }}>{getCurrentAnswer().length === 0 ? 'Aucune réponse sélectionnée' : 'Réponse sélectionnée ✓'}</Text>
                {currentQ < session.questions.length - 1 ? (
                  <Button onClick={() => setCurrentQ(p => p + 1)} style={{ borderRadius: 10, background: C.red, color: C.white, border: 'none', fontWeight: 700 }}>Suivant →</Button>
                ) : (
                  <Button onClick={handleSubmit} loading={sessionLoading}
                    style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, color: C.white, border: 'none', borderRadius: 10, fontWeight: 700, height: 40 }}>
                    Terminer & Soumettre
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* ── Result Modal ── */}
      <Modal
        open={!!result}
        onCancel={() => { setResult(null); setSession(null); }}
        footer={null} centered
        width="min(500px, 95vw)"
        styles={{ content: { borderRadius: 24, overflow: 'hidden', padding: 0 } }}
      >
        {result && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{result.passed ? '🎉' : '😔'}</div>
            <Title level={3} style={{ color: result.passed ? '#15803D' : '#DC2626', margin: '0 0 8px' }}>
              {result.passed ? 'Félicitations !' : 'Presque...'}
            </Title>
            <Text style={{ color: C.gray600, fontSize: 15 }}>
              {result.passed ? 'Vous avez réussi ce quiz !' : `Score insuffisant. Il fallait ${session?.minScore}%.`}
            </Text>

            <div style={{ margin: '24px 0' }}>
              <Progress
                type="circle"
                percent={result.score}
                strokeColor={result.passed ? '#10B981' : '#EF4444'}
                strokeWidth={10}
                format={p => <span style={{ fontWeight: 900, fontSize: 22, color: result.passed ? '#15803D' : '#DC2626' }}>{p}%</span>}
              />
            </div>

            {result.passed && result.badgeEarned && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: `${result.badgeColor || C.red}10`, borderRadius: 16, padding: '14px 18px', marginBottom: 20, justifyContent: 'center' }}>
                <span style={{ fontSize: 32 }}>🏆</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 11, color: C.gray400, fontWeight: 700, textTransform: 'uppercase' }}>Badge Obtenu</div>
                  <div style={{ fontWeight: 900, color: result.badgeColor || C.red, fontSize: 16 }}>{result.badgeEarned}</div>
                </div>
              </div>
            )}

            <Space>
              <Button onClick={() => { setResult(null); setSession(null); }} style={{ borderRadius: 12 }}>Fermer</Button>
              {!result.passed && session && (
                <Button onClick={() => { setResult(null); startQuiz(session); }}
                  style={{ background: `linear-gradient(135deg, ${C.redDark}, ${C.red})`, color: C.white, border: 'none', borderRadius: 12, fontWeight: 700 }}>
                  Réessayer
                </Button>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuizPage;
