import React, { useEffect, useState } from 'react';
import { Layout, Table, Tag, Typography, Button, Modal } from 'antd';
import {
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { complaintService } from '@/services/complaintService';
import type { ComplaintDto } from '@/types/complaint.types';
import { ComplaintStatus, ComplaintVisibility } from '@/types/complaint.types';
import { ComplaintForm } from '@/components/complaints/ComplaintForm';
import { ComplaintDetailsDialog } from '@/components/complaints/ComplaintDetailsDialog';
import committeeService from '@/services/committeeService';
import { useAuthStore } from '@/stores';

const { Content } = Layout;
const { Title } = Typography;

/* ── Palette Red Crescent Tunisian ──────────────────────────────────── */
const C = {
  red: '#CC0000',
  redLight: '#FF3333',
  redDark: '#990000',
  redFade: 'rgba(204,0,0,0.07)',
  gold: '#C8963E',
  white: '#FFFFFF',
  offWhite: '#FAF8F6',
  gray50: '#F7F5F3',
  gray100: '#EEEBE8',
  gray200: '#DEDAD6',
  gray400: '#A09890',
  gray600: '#5E5650',
  gray800: '#2C2420',
};

/* ── Stat card ──────────────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number;
  color: string;
  bg: string;
  icon: React.ReactNode;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, color, bg, icon }) => (
  <div
    style={{
      background: C.white,
      border: `1px solid ${C.gray100}`,
      borderRadius: 16,
      padding: '20px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      flex: '1 1 180px',
      minWidth: 160,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: 12,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        color,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color: C.gray800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.gray400, marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  </div>
);

/* ── Status tag ─────────────────────────────────────────────────────── */
const getStatusTag = (status: ComplaintStatus) => {
  const cfg: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
    [ComplaintStatus.EN_ATTENTE]: { color: '#B45309', bg: '#FEF3C7', icon: <ClockCircleOutlined />, label: 'En Attente' },
    [ComplaintStatus.EN_COURS]: { color: '#1D4ED8', bg: '#DBEAFE', icon: <SyncOutlined spin />, label: 'En Cours' },
    [ComplaintStatus.RESOLU]: { color: '#15803D', bg: '#DCFCE7', icon: <CheckCircleOutlined />, label: 'Résolu' },
    [ComplaintStatus.REJETE]: { color: '#DC2626', bg: '#FEE2E2', icon: <CloseCircleOutlined />, label: 'Rejeté' },
  };
  const s = cfg[status] ?? { color: C.gray600, bg: C.gray100, icon: null, label: status };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: s.bg,
        color: s.color,
        borderRadius: 20,
        padding: '3px 10px',
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
};

/* ── Main component ─────────────────────────────────────────────────── */
export const ComplaintsDashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<ComplaintDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDto | null>(null);
  const [committeesList, setCommitteesList] = useState<{ id: string; name: string }[]>([]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      let data: ComplaintDto[] = [];
      if ((user?.roles as string[])?.includes('PRESIDENT_NATIONAL')) {
        data = await complaintService.getAllComplaints();
      } else if (
        user?.roles?.some(r => ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL'].includes(r)) &&
        user?.committeeId
      ) {
        data = await complaintService.getComplaintsByCommittee(user.committeeId);
      } else {
        data = await complaintService.getMyComplaints();
      }
      setComplaints(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommittees = async () => {
    try {
      const data = await committeeService.getAll();
      setCommitteesList(data.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchComplaints();
    fetchCommittees();
  }, [user]);

  const counts = {
    total: complaints.length,
    enAttente: complaints.filter(c => c.status === ComplaintStatus.EN_ATTENTE).length,
    enCours: complaints.filter(c => c.status === ComplaintStatus.EN_COURS).length,
    resolu: complaints.filter(c => c.status === ComplaintStatus.RESOLU).length,
    rejete: complaints.filter(c => c.status === ComplaintStatus.REJETE).length,
  };

  const hasOfficialRole =
    user?.roles?.some(r => ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL'].includes(r)) ||
    user?.type === 'ADMIN';

  /* ── Table columns ── */
  const columns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['md'] as any,
      render: (d: string) => (
        <span style={{ color: C.gray600, fontSize: 13 }}>
          {new Date(d).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      title: 'Objet',
      dataIndex: 'subject',
      key: 'subject',
      render: (s: string) => (
        <span style={{ fontWeight: 600, color: C.gray800, fontSize: 14 }}>{s}</span>
      ),
    },
    {
      title: 'Demandeur',
      key: 'submitter',
      responsive: ['sm'] as any,
      render: (_: any, record: ComplaintDto) => {
        if (record.visibility === ComplaintVisibility.ANONYMOUS && !record.submitterId) {
          return (
            <span
              style={{
                background: C.gray100,
                color: C.gray600,
                borderRadius: 20,
                padding: '2px 10px',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Anonyme
            </span>
          );
        }
        return <span style={{ color: C.gray600 }}>{record.submitterName}</span>;
      },
    },
    {
      title: 'Comité',
      dataIndex: 'targetCommitteeName',
      key: 'targetCommitteeName',
      responsive: ['lg'] as any,
      render: (n: string) => <span style={{ color: C.gray600, fontSize: 13 }}>{n}</span>,
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (s: ComplaintStatus) => getStatusTag(s),
    },
    {
      title: '',
      key: 'actions',
      width: 110,
      render: (_: any, record: ComplaintDto) => (
        <button
          onClick={() => { setSelectedComplaint(record); setIsDetailsVisible(true); }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: C.redFade,
            color: C.red,
            border: `1px solid rgba(204,0,0,0.18)`,
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = C.red;
            (e.currentTarget as HTMLButtonElement).style.color = C.white;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = C.redFade;
            (e.currentTarget as HTMLButtonElement).style.color = C.red;
          }}
        >
          <EyeOutlined /> Voir
        </button>
      ),
    },
  ];

  /* ── Render ── */
  return (
    <Layout style={{ background: 'transparent', minHeight: '100vh' }}>
      <Content style={{ padding: 'clamp(16px, 3vw, 40px)' }}>

        {/* ── Header ── */}
        <div
          style={{
            background: `linear-gradient(135deg, ${C.redDark} 0%, ${C.red} 60%, ${C.redLight} 100%)`,
            borderRadius: 20,
            padding: 'clamp(24px, 4vw, 40px)',
            marginBottom: 28,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            boxShadow: '0 8px 32px rgba(204,0,0,0.25)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Crescent decorative shape */}
          <div
            style={{
              position: 'absolute',
              right: -40,
              top: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              border: `40px solid rgba(255,255,255,0.08)`,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 60,
              top: 20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.15)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  color: C.white,
                }}
              >
                <FileTextOutlined />
              </div>
              <h1
                style={{
                  margin: 0,
                  color: C.white,
                  fontSize: 'clamp(18px, 3vw, 26px)',
                  fontWeight: 700,
                  letterSpacing: '-0.3px',
                }}
              >
                Gestion des Réclamations
              </h1>
            </div>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>
              Croissant-Rouge Tunisien — Suivi sécurisé des réclamations
            </p>
          </div>

          <button
            onClick={() => setIsFormVisible(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: C.white,
              color: C.red,
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              transition: 'transform 0.15s',
              position: 'relative',
              zIndex: 1,
              flexShrink: 0,
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
          >
            <PlusOutlined /> Nouvelle Réclamation
          </button>
        </div>

        {/* ── Stats ── */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 28,
          }}
        >
          <StatCard label="Total" value={counts.total} color={C.gray800} bg={C.gray100} icon={<FileTextOutlined />} />
          <StatCard label="En Attente" value={counts.enAttente} color="#B45309" bg="#FEF3C7" icon={<ClockCircleOutlined />} />
          <StatCard label="En Cours" value={counts.enCours} color="#1D4ED8" bg="#DBEAFE" icon={<SyncOutlined />} />
          <StatCard label="Résolus" value={counts.resolu} color="#15803D" bg="#DCFCE7" icon={<CheckCircleOutlined />} />
          <StatCard label="Rejetés" value={counts.rejete} color="#DC2626" bg="#FEE2E2" icon={<CloseCircleOutlined />} />
        </div>

        {/* ── Table ── */}
        <div
          style={{
            background: C.white,
            borderRadius: 16,
            border: `1px solid ${C.gray100}`,
            boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 24px',
              borderBottom: `1px solid ${C.gray100}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span style={{ fontWeight: 700, color: C.gray800, fontSize: 15 }}>
              Liste des Réclamations
            </span>
            <span
              style={{
                background: C.redFade,
                color: C.red,
                borderRadius: 20,
                padding: '2px 12px',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {complaints.length} entrée{complaints.length !== 1 ? 's' : ''}
            </span>
          </div>

          <Table
            columns={columns}
            dataSource={complaints}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              style: { padding: '12px 24px' },
            }}
            scroll={{ x: 600 }}
            rowClassName={() => 'complaint-row'}
            style={{ '--row-hover': C.redFade } as any}
          />
        </div>

        {/* ── Form Modal ── */}
        <Modal
          title={null}
          open={isFormVisible}
          onCancel={() => setIsFormVisible(false)}
          footer={null}
          width="min(800px, 95vw)"
          destroyOnClose
          styles={{ body: { padding: 0 } }}
        >
          <ComplaintForm
            onSuccess={() => { setIsFormVisible(false); fetchComplaints(); }}
            committees={committeesList}
          />
        </Modal>

        {/* ── Details Dialog ── */}
        <ComplaintDetailsDialog
          visible={isDetailsVisible}
          complaint={selectedComplaint}
          onClose={() => setIsDetailsVisible(false)}
          onUpdate={() => { fetchComplaints(); setIsDetailsVisible(false); }}
          isOfficial={hasOfficialRole}
        />
      </Content>

      <style>{`
        .complaint-row:hover td { background: ${C.redFade} !important; transition: background 0.15s; }
        .ant-table-thead > tr > th {
          background: ${C.gray50} !important;
          color: ${C.gray600} !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          border-bottom: 1px solid ${C.gray100} !important;
        }
        .ant-table-tbody > tr > td { border-bottom: 1px solid ${C.gray50} !important; }
        .ant-pagination-item-active { border-color: ${C.red} !important; }
        .ant-pagination-item-active a { color: ${C.red} !important; }
        .ant-spin-dot-item { background: ${C.red} !important; }
      `}</style>
    </Layout>
  );
};