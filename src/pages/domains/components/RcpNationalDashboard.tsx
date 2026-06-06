// ============================================================
// NEXUS-AID — Tableau de Bord National RCP
// Vue agrégée pour PRESIDENT_NATIONAL / VP_NATIONAL
// Statistiques cross-comités + drill-down évaluations
// ============================================================

import React, { useState, useEffect } from 'react';
import {
    Row, Col, Table, Tag, Button, Drawer, Typography, Space,
    Spin, Empty, Statistic, Select, Input, Tooltip, Image, Badge, Progress
} from 'antd';
import {
    HeartOutlined, GlobalOutlined, FilterOutlined, SearchOutlined,
    EyeOutlined, TeamOutlined, TrophyOutlined, CheckCircleOutlined,
    BarChartOutlined, AlertOutlined, WarningOutlined, CloseCircleOutlined,
    RobotOutlined, UserOutlined, FileTextOutlined, CameraOutlined, StarOutlined,
    FilePdfOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { motion } from 'framer-motion';
import { rcpService } from '@/services/domainServices';
import type { RcpEvaluationDTO, RcpNationalStatsDTO } from '@/types';
import { exportRcpToPdf } from '@/utils/rcpPdfExporter';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const CONCORDANCE_COLORS: Record<string, string> = {
    EXCELLENT: '#10b981', BON: '#22c55e', MOYEN: '#f59e0b', FAIBLE: '#ef4444'
};
const DECISION_LABELS: Record<string, { color: string; label: string; icon?: React.ReactNode }> = {
    PRET:                   { color: 'success', label: 'Prêt', icon: <CheckCircleOutlined /> },
    AMELIORATIONS_MINEURES: { color: 'warning', label: 'Amél. mineures', icon: <WarningOutlined /> },
    AMELIORATIONS_MAJEURES: { color: 'orange',  label: 'Amél. majeures', icon: <WarningOutlined /> },
    NON_RECOMMANDE:         { color: 'error',   label: 'Non recommandé', icon: <CloseCircleOutlined /> },
};
const LEVEL_LABELS: Record<string, string> = {
    DEBUTANT: 'Débutant', INTERMEDIAIRE: 'Intermédiaire',
    AVANCE: 'Avancé', PROFESSIONNEL: 'Professionnel',
};
const CRITERIA_LABELS: Record<string, string> = {
    handPosition: 'Position mains', compressionDepth: 'Profondeur',
    frequency: 'Fréquence', chestRelease: 'Décompression', ventilation: 'Insufflations',
    ratio: 'Ratio 30:2', interruptions: 'Interruptions', fatigue: 'Résistance fatigue',
    reactivity: 'Réactivité IA', globalQuality: 'Qualité globale',
};

interface Props { isDark: boolean; }

const RcpNationalDashboard: React.FC<Props> = ({ isDark }) => {
    const [evaluations, setEvaluations]     = useState<RcpEvaluationDTO[]>([]);
    const [stats, setStats]                 = useState<RcpNationalStatsDTO | null>(null);
    const [loading, setLoading]             = useState(true);
    const [selected, setSelected]           = useState<RcpEvaluationDTO | null>(null);
    const [drawerOpen, setDrawerOpen]       = useState(false);
    const [filterCommittee, setFilter]      = useState<string>('ALL');
    const [filterDecision, setFilterDec]    = useState<string>('ALL');
    const [search, setSearch]               = useState('');

    useEffect(() => {
        Promise.all([
            rcpService.getAllNational().catch(() => []),
            rcpService.getStatistics().catch(() => null),
        ]).then(([evals, statsData]) => {
            setEvaluations(evals);
            setStats(statsData);
        }).finally(() => setLoading(false));
    }, []);

    const committees = Array.from(new Set(evaluations.map(e => e.committeeName).filter(Boolean)));

    const filtered = evaluations.filter(e => {
        if (filterCommittee !== 'ALL' && e.committeeName !== filterCommittee) return false;
        if (filterDecision !== 'ALL' && e.trainerDecision !== filterDecision) return false;
        if (search && !`${e.participantName}${e.trainerName}${e.committeeName}`.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const glassBox = {
        background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        borderRadius: 20,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        padding: 20,
    };

    // Committee performance summary
    const committeeStats = committees.map(name => {
        const items = evaluations.filter(e => e.committeeName === name);
        const avgIa = items.filter(e => e.scoreIa).length
            ? items.reduce((s, e) => s + (e.scoreIa || 0), 0) / items.filter(e => e.scoreIa).length
            : 0;
        const avgFm = items.filter(e => e.scoreTrainer).length
            ? items.reduce((s, e) => s + (e.scoreTrainer || 0), 0) / items.filter(e => e.scoreTrainer).length
            : 0;
        const readyPct = items.length ? Math.round((items.filter(e => e.trainerDecision === 'PRET').length / items.length) * 100) : 0;
        return { name, count: items.length, avgIa, avgFm, readyPct };
    });

    const columns: ColumnsType<RcpEvaluationDTO> = [
        {
            title: 'COMITÉ', dataIndex: 'committeeName', key: 'committee',
            width: 150,
            render: (n) => (
                <Space size={8} style={{ whiteSpace: 'nowrap' }}>
                    <GlobalOutlined style={{ color: '#ef4444' }} />
                    <Text strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{n || '—'}</Text>
                </Space>
            ),
        },
        {
            title: 'PARTICIPANT', key: 'participant',
            width: 180,
            render: (_, r) => {
                const getLevelBadge = (lvl?: string) => {
                    if (!lvl) return '';
                    const config: Record<string, { status: "success" | "processing" | "warning" | "error"; text: string }> = {
                        DEBUTANT: { status: 'success', text: 'Débutant' },
                        INTERMEDIAIRE: { status: 'processing', text: 'Intermédiaire' },
                        AVANCE: { status: 'warning', text: 'Avancé' },
                        PROFESSIONNEL: { status: 'error', text: 'Professionnel' },
                    };
                    const cfg = config[lvl];
                    return cfg ? <Badge status={cfg.status} text={cfg.text} style={{ fontSize: 11 }} /> : lvl;
                };
                return (
                    <div>
                        <Text strong style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap' }}>{r.participantName || 'Anonyme'}</Text>
                        {getLevelBadge(r.participantLevel)}
                    </div>
                );
            },
        },
        {
            title: 'FORMATEUR', dataIndex: 'trainerName', key: 'trainer',
            width: 150,
            render: (n) => <Text style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{n}</Text>,
        },
        {
            title: 'DATE', dataIndex: 'evaluationDate', key: 'date',
            width: 120,
            render: (d) => (
                <Text style={{ whiteSpace: 'nowrap' }}>
                    {d ? new Date(d).toLocaleDateString('fr-FR') : '—'}
                </Text>
            ),
        },
        {
            title: 'SCORE IA / FM', key: 'scores',
            width: 160,
            render: (_, r) => (
                <Space size={4}>
                    {r.scoreIa !== undefined && <Tag color="blue" icon={<RobotOutlined />} style={{ borderRadius: 8, fontWeight: 700, fontSize: 12 }}> {Number(r.scoreIa).toFixed(1)}</Tag>}
                    {r.scoreTrainer !== undefined && <Tag color="red" icon={<UserOutlined />} style={{ borderRadius: 8, fontWeight: 700, fontSize: 12 }}> {Number(r.scoreTrainer).toFixed(1)}</Tag>}
                </Space>
            ),
        },
        {
            title: 'CONCORDANCE', dataIndex: 'concordanceLevel', key: 'concordance',
            width: 130,
            render: (c) => c ? (
                <Tag style={{ borderRadius: 8, fontWeight: 600, background: CONCORDANCE_COLORS[c], color: '#fff', border: 'none' }}>{c}</Tag>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'DÉCISION', dataIndex: 'trainerDecision', key: 'decision',
            width: 160,
            render: (d) => {
                const cfg = DECISION_LABELS[d];
                return cfg ? <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 8, fontWeight: 600, fontSize: 11 }}>{cfg.label}</Tag> : <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'ACTIONS', key: 'actions',
            width: 100,
            render: (_, r) => (
                <Space>
                    <Tooltip title="Voir le détail complet">
                        <Button
                            icon={<EyeOutlined />}
                            type="primary"
                            size="small"
                            onClick={() => { setSelected(r); setDrawerOpen(true); }}
                            style={{ borderRadius: 8, background: '#ef4444', borderColor: '#ef4444' }}
                        />
                    </Tooltip>
                    <Tooltip title="Télécharger PDF">
                        <Button
                            icon={<FilePdfOutlined />}
                            size="small"
                            onClick={() => exportRcpToPdf(r)}
                            style={{ borderRadius: 8 }}
                        />
                    </Tooltip>
                </Space>
            ),
        },
    ];

    if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

    if (!evaluations.length) return (
        <Empty
            image={<HeartOutlined style={{ fontSize: 80, color: '#ef4444' }} />}
            description={<><Title level={4}>Aucune évaluation RCP</Title><Text type="secondary">Les évaluations soumises par les formateurs de tous les comités apparaîtront ici.</Text></>}
            style={{ padding: '80px 0' }}
        />
    );

    return (
        <div>
            {/* ---- KPI Cards ---- */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { label: 'Total évaluations', value: stats?.totalEvaluations || evaluations.length, color: '#ef4444', icon: <HeartOutlined /> },
                    { label: 'Score IA moyen', value: (stats?.avgScoreIa || 0).toFixed(1) + '/10', color: '#3b82f6', icon: <BarChartOutlined /> },
                    { label: 'Score FM moyen', value: (stats?.avgScoreTrainer || 0).toFixed(1) + '/10', color: '#8b5cf6', icon: <TrophyOutlined /> },
                    { label: 'Comités actifs', value: committees.length, color: '#10b981', icon: <GlobalOutlined /> },
                ].map((kpi, i) => (
                    <Col xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                            <div style={glassBox}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{kpi.label}</Text>
                                        <Title level={2} style={{ margin: '4px 0 0', color: kpi.color, fontWeight: 800 }}>{kpi.value}</Title>
                                    </div>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color, fontSize: 20 }}>
                                        {kpi.icon}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Col>
                ))}
            </Row>

            {/* ---- Concordance distribution ---- */}
            {stats?.byConcordance && Object.keys(stats.byConcordance).length > 0 && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                        <div style={glassBox}>
                            <Title level={5} style={{ marginBottom: 16 }}>🎯 Distribution de la concordance</Title>
                            {['EXCELLENT', 'BON', 'MOYEN', 'FAIBLE'].map(level => {
                                const count = stats.byConcordance[level] || 0;
                                const total = Object.values(stats.byConcordance).reduce((s, v) => s + v, 0);
                                const pct = total ? Math.round((count / total) * 100) : 0;
                                return (
                                    <div key={level} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 12, fontWeight: 600 }}>{level}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>{count} ({pct}%)</Text>
                                        </div>
                                        <Progress
                                            percent={pct}
                                            strokeColor={CONCORDANCE_COLORS[level]}
                                            showInfo={false}
                                            strokeWidth={8}
                                            style={{ borderRadius: 4 }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </Col>
                    <Col xs={24} md={12}>
                        <div style={glassBox}>
                            <Title level={5} style={{ marginBottom: 16 }}>📊 Performance par comité</Title>
                            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                {committeeStats.sort((a, b) => b.avgIa - a.avgIa).map((cs, i) => (
                                    <div key={cs.name} style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{cs.name}</Text>
                                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{cs.count} éval.</Text>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <Tag color="blue" icon={<RobotOutlined />} style={{ borderRadius: 6, fontSize: 11 }}> {cs.avgIa.toFixed(1)}</Tag>
                                                <Tag color="red" icon={<UserOutlined />} style={{ borderRadius: 6, fontSize: 11 }}> {cs.avgFm.toFixed(1)}</Tag>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Text type="secondary" style={{ fontSize: 11 }}>Prêts:</Text>
                                            <Progress percent={cs.readyPct} size="small" showInfo={false} strokeColor="#10b981" style={{ flex: 1 }} />
                                            <Text strong style={{ fontSize: 11, color: '#10b981' }}>{cs.readyPct}%</Text>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Col>
                </Row>
            )}

            {/* ---- Filters ---- */}
            <div style={{ ...glassBox, marginBottom: 16, padding: '14px 20px' }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} md={8}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                            placeholder="Rechercher par participant, formateur, comité..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ borderRadius: 12 }}
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <Select value={filterCommittee} onChange={setFilter} style={{ width: '100%', borderRadius: 12 }} suffixIcon={<GlobalOutlined />}>
                            <Option value="ALL">Tous les comités</Option>
                            {committees.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Select value={filterDecision} onChange={setFilterDec} style={{ width: '100%', borderRadius: 12 }}>
                            <Option value="ALL">Toutes les décisions</Option>
                            {Object.entries(DECISION_LABELS).map(([k, cfg]) => <Option key={k} value={k}>{cfg.label}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={4}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            <FilterOutlined style={{ marginRight: 6 }} />
                            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
                        </Text>
                    </Col>
                </Row>
            </div>

            {/* ---- Table ---- */}
            <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                className="premium-table"
                scroll={{ x: 1050 }}
            />

            {/* ---- Detail Drawer ---- */}
            <Drawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                width={700}
                title={
                    <Space size={12}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <HeartOutlined />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700 }}>Détail — {selected?.participantName || 'Participant'}</div>
                            <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>{selected?.committeeName}</div>
                        </div>
                    </Space>
                }
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <Button icon={<FilePdfOutlined />} onClick={() => selected && exportRcpToPdf(selected)} style={{ borderRadius: 10 }}>Télécharger PDF</Button>
                        <Button onClick={() => setDrawerOpen(false)} style={{ borderRadius: 10 }}>Fermer</Button>
                    </div>
                }
            >
                {selected && (
                    <div>
                        {/* Info générale */}
                        <div style={{ ...glassBox, marginBottom: 16 }}>
                            <Title level={5} style={{ marginBottom: 12 }}>
                                <FileTextOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Informations générales
                            </Title>
                            <Row gutter={[12, 12]}>
                                {[
                                    { label: 'Comité', value: selected.committeeName || '—' },
                                    { label: 'Formateur', value: selected.trainerName },
                                    { label: 'Centre', value: selected.trainerCenter || '—' },
                                    { label: 'Participant', value: selected.participantName || '—' },
                                    { label: 'Niveau', value: selected.participantLevel ? LEVEL_LABELS[selected.participantLevel] : '—' },
                                    { label: 'Date', value: selected.evaluationDate ? new Date(selected.evaluationDate).toLocaleDateString('fr-FR') : '—' },
                                    { label: 'Version IA', value: selected.aiVersion || '—' },
                                    { label: 'Essais', value: selected.totalAttempts?.toString() || '—' },
                                ].map(item => (
                                    <Col xs={12} key={item.label}>
                                        <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.label}</Text>
                                        <Text strong style={{ fontSize: 13 }}>{item.value}</Text>
                                    </Col>
                                ))}
                            </Row>
                        </div>

                        {/* Photos */}
                        {(selected.photoParticipant || selected.photoCardiacPosition || selected.photoAiScreenshot) && (
                            <div style={{ ...glassBox, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    <CameraOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Photos
                                </Title>
                                <Row gutter={[10, 10]}>
                                    {[
                                        { label: 'Participant', src: selected.photoParticipant },
                                        { label: 'Position', src: selected.photoCardiacPosition },
                                        { label: 'Screenshot IA', src: selected.photoAiScreenshot },
                                    ].filter(p => p.src).map(photo => (
                                        <Col xs={8} key={photo.label}>
                                            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{photo.label}</Text>
                                            <Image src={photo.src} alt={photo.label} style={{ borderRadius: 10, maxHeight: 120, objectFit: 'cover', width: '100%' }} />
                                        </Col>
                                    ))}
                                </Row>
                            </div>
                        )}

                        {/* Scores par critère */}
                        {selected.scores && Object.keys(selected.scores).length > 0 && (
                            <div style={{ ...glassBox, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    <StarOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Scores détaillés
                                </Title>
                                {Object.entries(selected.scores).map(([key, score]) => {
                                    const s = score as number;
                                    const scoreColors: Record<number, string> = {
                                        1: '#ef4444', 2: '#f87171', 3: '#f97316', 4: '#fb923c', 5: '#eab308',
                                        6: '#fde047', 7: '#a3e635', 8: '#84cc16', 9: '#22c55e', 10: '#10b981'
                                    };
                                    const comment = (selected.comments || {})[key] as string;
                                    return (
                                        <div key={key} style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 10, background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text strong style={{ fontSize: 13 }}>{CRITERIA_LABELS[key] || key}</Text>
                                                {comment && <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{comment}</Text>}
                                            </div>
                                            <Tag style={{ borderRadius: 8, fontWeight: 700, background: scoreColors[s] || '#gray', color: '#fff', border: 'none' }}>{s}/10</Tag>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Résultats */}
                        <div style={{ ...glassBox, marginBottom: 16 }}>
                            <Title level={5} style={{ marginBottom: 12 }}>
                                <BarChartOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Résultats & Décision
                            </Title>
                            <Row gutter={[12, 12]}>
                                <Col xs={12}><Text type="secondary" style={{ fontSize: 11 }}>Score IA</Text><br /><Text strong style={{ fontSize: 16, color: '#3b82f6' }}>{selected.scoreIa !== undefined ? `${Number(selected.scoreIa).toFixed(1)}/10` : '—'}</Text></Col>
                                <Col xs={12}><Text type="secondary" style={{ fontSize: 11 }}>Score Formateur</Text><br /><Text strong style={{ fontSize: 16, color: '#ef4444' }}>{selected.scoreTrainer !== undefined ? `${Number(selected.scoreTrainer).toFixed(1)}/10` : '—'}</Text></Col>
                                <Col xs={12}><Text type="secondary" style={{ fontSize: 11 }}>Concordance</Text><br />{selected.concordanceLevel ? <Tag style={{ borderRadius: 8, background: CONCORDANCE_COLORS[selected.concordanceLevel], color: '#fff', border: 'none', fontWeight: 600 }}>{selected.concordanceLevel}</Tag> : <Text>—</Text>}</Col>
                                <Col xs={12}><Text type="secondary" style={{ fontSize: 11 }}>Décision</Text><br />{selected.trainerDecision && DECISION_LABELS[selected.trainerDecision] ? <Tag color={DECISION_LABELS[selected.trainerDecision].color} icon={DECISION_LABELS[selected.trainerDecision].icon} style={{ borderRadius: 8, fontWeight: 600 }}>{DECISION_LABELS[selected.trainerDecision].label}</Tag> : <Text>—</Text>}</Col>
                            </Row>
                            {selected.trainerFinalComments && (
                                <Paragraph style={{ marginTop: 12, fontSize: 13 }}>{selected.trainerFinalComments}</Paragraph>
                            )}
                        </div>

                        {/* Recommandations */}
                        {selected.recommendations && (selected.recommendations.high?.length || selected.recommendations.medium?.length || selected.recommendations.low?.length) ? (
                            <div style={{ ...glassBox, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    <FileTextOutlined style={{ color: '#ef4444', marginRight: 8 }} /> Recommandations d'amélioration
                                </Title>
                                {['high', 'medium', 'low'].map(lvl => {
                                    const items = selected.recommendations?.[lvl as 'high' | 'medium' | 'low'] || [];
                                    if (!items.length) return null;
                                    const config: Record<string, { color: string; label: string }> = {
                                        high: { color: 'red', label: 'Priorité Haute' },
                                        medium: { color: 'gold', label: 'Priorité Moyenne' },
                                        low: { color: 'green', label: 'Priorité Basse' }
                                    };
                                    return (
                                        <div key={lvl} style={{ marginBottom: 10 }}>
                                            <Tag color={config[lvl]?.color} style={{ borderRadius: 6, marginBottom: 6, fontWeight: 600 }}>
                                                {config[lvl]?.label}
                                            </Tag>
                                            <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
                                                {items.map((item, index) => <li key={index} style={{ marginBottom: 4 }}>{item}</li>)}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                )}
            </Drawer>
        </div>
    );
};

export default RcpNationalDashboard;
