import React, { useState } from 'react';
import { Modal, Tag, Timeline, Input, Button, message, Divider, Typography } from 'antd';
import {
  PaperClipOutlined,
  SyncOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MessageOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ComplaintDto } from '@/types/complaint.types';
import { ComplaintStatus } from '@/types/complaint.types';
import { complaintService } from '@/services/complaintService';

const { Text } = Typography;

const C = {
  red: '#CC0000',
  redLight: '#FF3333',
  redDark: '#990000',
  redFade: 'rgba(204,0,0,0.07)',
  white: '#FFFFFF',
  gray50: '#F7F5F3',
  gray100: '#EEEBE8',
  gray200: '#DEDAD6',
  gray400: '#A09890',
  gray600: '#5E5650',
  gray700: '#3D3530',
  gray800: '#2C2420',
};

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  [ComplaintStatus.EN_ATTENTE]: { color: '#B45309', bg: '#FEF3C7', label: 'En Attente', icon: <ClockCircleOutlined /> },
  [ComplaintStatus.EN_COURS]: { color: '#1D4ED8', bg: '#DBEAFE', label: 'En Cours', icon: <SyncOutlined spin /> },
  [ComplaintStatus.RESOLU]: { color: '#15803D', bg: '#DCFCE7', label: 'Résolu', icon: <CheckCircleOutlined /> },
  [ComplaintStatus.REJETE]: { color: '#DC2626', bg: '#FEE2E2', label: 'Rejeté', icon: <CloseCircleOutlined /> },
};

/* ── Section Title ── */
const SectionTitle: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
      paddingBottom: 10,
      borderBottom: `1.5px solid ${C.gray100}`,
    }}
  >
    <span style={{ color: C.red, fontSize: 15 }}>{icon}</span>
    <span style={{ fontWeight: 700, color: C.gray800, fontSize: 14 }}>{label}</span>
  </div>
);

/* ── Status badge ── */
const StatusBadge: React.FC<{ status: ComplaintStatus }> = ({ status }) => {
  const s = STATUS_CFG[status] ?? { color: C.gray600, bg: C.gray100, label: status, icon: null };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: s.bg,
        color: s.color,
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {s.icon} {s.label}
    </span>
  );
};

/* ── Action button helper ── */
interface ActionBtnProps {
  label: string;
  onClick: () => void;
  loading: boolean;
  variant?: 'default' | 'danger' | 'success';
}
const ActionBtn: React.FC<ActionBtnProps> = ({ label, onClick, loading, variant = 'default' }) => {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
    danger: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
    success: { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' },
  };
  const hover: Record<string, React.CSSProperties> = {
    default: { background: '#1D4ED8', color: C.white, border: '1px solid #1D4ED8' },
    danger: { background: '#DC2626', color: C.white, border: '1px solid #DC2626' },
    success: { background: '#15803D', color: C.white, border: '1px solid #15803D' },
  };
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s',
        opacity: loading ? 0.6 : 1,
        ...(hov ? hover[variant] : styles[variant]),
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  );
};

/* ── Main component ── */
interface ComplaintDetailsProps {
  complaint: ComplaintDto | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isOfficial: boolean;
}

export const ComplaintDetailsDialog: React.FC<ComplaintDetailsProps> = ({
  complaint, visible, onClose, onUpdate, isOfficial,
}) => {
  const [responseMsg, setResponseMsg] = useState('');
  const [loading, setLoading] = useState(false);

  if (!complaint) return null;

  const isClosed =
    complaint.status === ComplaintStatus.RESOLU ||
    complaint.status === ComplaintStatus.REJETE;

  const handleSendResponse = async () => {
    if (!responseMsg.trim()) return;
    try {
      setLoading(true);
      await complaintService.addResponse(complaint.id, responseMsg);
      message.success('Réponse envoyée');
      setResponseMsg('');
      onUpdate();
    } catch (e: any) {
      message.error(e.response?.data?.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: ComplaintStatus) => {
    try {
      setLoading(true);
      await complaintService.updateStatus(complaint.id, { status });
      message.success('Statut mis à jour');
      onUpdate();
    } catch {
      message.error('Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="min(750px, 96vw)"
      styles={{ body: { padding: 0 }, content: { borderRadius: 20, overflow: 'hidden' } }}
    >
      {/* ── Modal Header ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.gray800} 0%, #3D3530 100%)`,
          padding: 'clamp(20px, 3vw, 32px) clamp(20px, 3vw, 32px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute', right: -20, top: -20,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)', pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '3px 10px',
              marginBottom: 8,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>
              RÉCLAMATION #{complaint.id.substring(0, 8).toUpperCase()}
            </span>
          </div>
          <h3 style={{ margin: 0, color: C.white, fontSize: 'clamp(16px, 2.5vw, 20px)', fontWeight: 800 }}>
            Détails de la Réclamation
          </h3>
        </div>
        <StatusBadge status={complaint.status} />
      </div>

      {/* ── Modal Body ── */}
      <div
        style={{
          padding: 'clamp(20px, 3vw, 32px)',
          background: C.white,
          maxHeight: '75vh',
          overflowY: 'auto',
        }}
      >

        {/* ── Info grid ── */}
        <div
          style={{
            background: C.gray50,
            border: `1px solid ${C.gray100}`,
            borderRadius: 14,
            padding: 'clamp(16px, 2.5vw, 24px)',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px 24px',
              marginBottom: 16,
            }}
          >
            {[
              {
                label: 'Objet',
                value: <span style={{ fontWeight: 700, color: C.gray800, fontSize: 15 }}>{complaint.subject}</span>,
              },
              {
                label: 'Demandeur',
                value: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, color: C.gray700 }}>{complaint.submitterName || 'Anonyme'}</span>
                    {complaint.visibility === 'ANONYMOUS' && (
                      <span
                        style={{
                          background: C.gray100, color: C.gray600,
                          borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                        }}
                      >
                        ANONYME
                      </span>
                    )}
                  </div>
                ),
              },
              {
                label: 'Comité Ciblé',
                value: <span style={{ color: C.gray600, fontWeight: 500 }}>{complaint.targetCommitteeName}</span>,
              },
              {
                label: 'Date de Soumission',
                value: (
                  <span style={{ color: C.gray600, fontWeight: 500 }}>
                    {new Date(complaint.createdAt).toLocaleString('fr-TN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                ),
              },
            ].map(({ label, value }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
                    color: C.gray400, textTransform: 'uppercase', marginBottom: 5,
                  }}
                >
                  {label}
                </div>
                {value}
              </div>
            ))}
          </div>

          <Divider style={{ margin: '12px 0', borderColor: C.gray200 }} />

          <div>
            <div
              style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.7,
                color: C.gray400, textTransform: 'uppercase', marginBottom: 8,
              }}
            >
              Message / Description
            </div>
            <div
              style={{
                background: C.white,
                border: `1px solid ${C.gray200}`,
                borderRadius: 10,
                padding: '14px 16px',
                color: C.gray700,
                lineHeight: 1.7,
                fontSize: 14,
                borderLeft: `3px solid ${C.red}`,
              }}
            >
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                "{complaint.message}"
              </p>
            </div>
          </div>
        </div>

        {/* ── Attachments ── */}
        {complaint.attachments?.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionTitle icon={<PaperClipOutlined />} label={`Pièces Jointes (${complaint.attachments.length})`} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {complaint.attachments.map(item => (
                <a
                  key={item.id}
                  href={item.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: C.gray50,
                    border: `1px solid ${C.gray200}`,
                    borderRadius: 10,
                    padding: '9px 14px',
                    textDecoration: 'none',
                    transition: 'all 0.18s',
                    color: 'inherit',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = C.red;
                    (e.currentTarget as HTMLAnchorElement).style.background = C.redFade;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = C.gray200;
                    (e.currentTarget as HTMLAnchorElement).style.background = C.gray50;
                  }}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: C.gray100, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', color: C.red,
                    }}
                  >
                    <PaperClipOutlined />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.gray800, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.fileName}
                    </div>
                    <div style={{ fontSize: 10, color: C.gray400, marginTop: 1 }}>Cliquez pour ouvrir</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── History / Timeline ── */}
        <div style={{ marginBottom: isOfficial && !isClosed ? 24 : 0 }}>
          <SectionTitle icon={<SyncOutlined />} label="Historique des Échanges" />
          <div
            style={{
              background: C.gray50,
              border: `1px solid ${C.gray100}`,
              borderRadius: 12,
              padding: '20px 20px 12px',
              maxHeight: 280,
              overflowY: 'auto',
            }}
          >
            <Timeline>
              <Timeline.Item
                dot={<div style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803D', marginTop: 3 }} />}
              >
                <div style={{ paddingLeft: 4 }}>
                  <span style={{ fontWeight: 600, color: C.gray800, fontSize: 13 }}>Réclamation soumise</span>
                  <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>
                    {new Date(complaint.createdAt).toLocaleString('fr-TN')}
                  </div>
                </div>
              </Timeline.Item>

              {complaint.responses?.map(res => (
                <Timeline.Item
                  key={res.id}
                  dot={<div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D4ED8', marginTop: 3 }} />}
                >
                  <div
                    style={{
                      background: C.white,
                      border: `1px solid ${C.gray200}`,
                      borderRadius: 10,
                      padding: '10px 14px',
                      marginLeft: 4,
                      borderLeft: `3px solid #1D4ED8`,
                    }}
                  >
                    <p style={{ margin: 0, fontWeight: 700, color: '#1D4ED8', fontSize: 12 }}>
                      {res.responderName}
                    </p>
                    <p style={{ margin: '5px 0 0', color: C.gray700, fontSize: 13 }}>{res.message}</p>
                    <p style={{ margin: '6px 0 0', color: C.gray400, fontSize: 10, textAlign: 'right' }}>
                      {new Date(res.createdAt).toLocaleString('fr-TN')}
                    </p>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        </div>

        {/* ── Official Action Panel ── */}
        {isOfficial && !isClosed && (
          <div
            style={{
              background: C.white,
              border: `2px solid ${C.gray100}`,
              borderRadius: 16,
              padding: 'clamp(16px, 2.5vw, 24px)',
              marginTop: 24,
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            }}
          >
            <SectionTitle icon={<MessageOutlined />} label="Répondre / Traiter" />

            <Input.TextArea
              rows={4}
              value={responseMsg}
              onChange={e => setResponseMsg(e.target.value)}
              placeholder="Rédiger une réponse officielle ou une instruction de traitement..."
              style={{ borderRadius: 10, resize: 'vertical', fontSize: 14 }}
            />

            {/* Action row */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
                gap: 10,
              }}
            >
              {/* Status change buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <ActionBtn
                  label="En Cours"
                  variant="default"
                  loading={loading}
                  onClick={() => handleUpdateStatus(ComplaintStatus.EN_COURS)}
                />
                <ActionBtn
                  label="Rejeter"
                  variant="danger"
                  loading={loading}
                  onClick={() => handleUpdateStatus(ComplaintStatus.REJETE)}
                />
                <ActionBtn
                  label="✓ Résoudre"
                  variant="success"
                  loading={loading}
                  onClick={() => handleUpdateStatus(ComplaintStatus.RESOLU)}
                />
              </div>

              {/* Send message */}
              <button
                onClick={handleSendResponse}
                disabled={!responseMsg.trim() || loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  background: !responseMsg.trim() || loading
                    ? C.gray100
                    : `linear-gradient(135deg, ${C.redDark}, ${C.red})`,
                  color: !responseMsg.trim() || loading ? C.gray400 : C.white,
                  border: 'none',
                  borderRadius: 10,
                  padding: '9px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: !responseMsg.trim() || loading ? 'not-allowed' : 'pointer',
                  boxShadow: !responseMsg.trim() ? 'none' : '0 4px 14px rgba(204,0,0,0.28)',
                  transition: 'all 0.2s',
                }}
              >
                <SendOutlined /> Envoyer Message
              </button>
            </div>
          </div>
        )}

        {/* Closed banner */}
        {isClosed && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: complaint.status === ComplaintStatus.RESOLU ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${complaint.status === ComplaintStatus.RESOLU ? '#BBF7D0' : '#FECACA'}`,
              borderRadius: 12,
              padding: '14px 18px',
              marginTop: 24,
            }}
          >
            <span style={{ fontSize: 20, display: 'flex', alignItems: 'center' }}>
              {complaint.status === ComplaintStatus.RESOLU ? (
                <CheckCircleOutlined style={{ color: '#15803D' }} />
              ) : (
                <CloseCircleOutlined style={{ color: '#DC2626' }} />
              )}
            </span>
            <span
              style={{
                fontWeight: 600,
                color: complaint.status === ComplaintStatus.RESOLU ? '#15803D' : '#DC2626',
                fontSize: 14,
              }}
            >
              Cette réclamation est{' '}
              {complaint.status === ComplaintStatus.RESOLU ? 'résolue' : 'rejetée'}.
              Aucune action supplémentaire n'est possible.
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
};