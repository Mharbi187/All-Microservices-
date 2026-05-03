import React, { useState } from 'react';
import { Form, Input, Select, Switch, Upload, Button, message } from 'antd';
import { InboxOutlined, SendOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import type { ComplaintCreateDto } from '@/types/complaint.types';
import { ComplaintVisibility } from '@/types/complaint.types';
import { complaintService } from '@/services/complaintService';

const { Dragger } = Upload;
const { Option } = Select;

interface ComplaintFormProps {
  onSuccess?: () => void;
  committees: { id: string; name: string }[];
}

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
  gray800: '#2C2420',
};

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ onSuccess, committees }) => {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      const data: ComplaintCreateDto = {
        subject: values.subject,
        message: values.message,
        targetCommitteeId: values.targetCommitteeId,
        visibility: isAnonymous ? ComplaintVisibility.ANONYMOUS : ComplaintVisibility.VISIBLE,
      };
      const files = fileList.map(f => f.originFileObj as File).filter(Boolean);
      await complaintService.createComplaint(data, files);
      message.success('Votre réclamation a été soumise avec succès.');
      form.resetFields();
      setFileList([]);
      setIsAnonymous(false);
      onSuccess?.();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Erreur lors de la soumission de la réclamation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'inherit', overflow: 'hidden', borderRadius: 16 }}>

      {/* ── Header Banner ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.redDark} 0%, ${C.red} 55%, ${C.redLight} 100%)`,
          padding: 'clamp(24px, 4vw, 36px) clamp(24px, 4vw, 40px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        {[
          { size: 160, right: -30, top: -50, opacity: 0.08 },
          { size: 80, right: 80, top: 10, opacity: 0.12 },
        ].map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: d.size,
              height: d.size,
              borderRadius: '50%',
              background: `rgba(255,255,255,${d.opacity})`,
              right: d.right,
              top: d.top,
              pointerEvents: 'none',
            }}
          />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* CRT logo badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 8,
              padding: '4px 12px',
              marginBottom: 12,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              🩸 CROISSANT-ROUGE TUNISIEN
            </span>
          </div>
          <h2
            style={{
              margin: 0,
              color: C.white,
              fontSize: 'clamp(18px, 3vw, 24px)',
              fontWeight: 800,
              letterSpacing: '-0.3px',
            }}
          >
            Déposer une Réclamation
          </h2>
          <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.72)', fontSize: 14 }}>
            Nous sommes à l'écoute de toutes vos préoccupations
          </p>
        </div>
      </div>

      {/* ── Form body ── */}
      <div style={{ padding: 'clamp(20px, 4vw, 36px)', background: C.white }}>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>

          {/* Anonymous toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isAnonymous ? 'rgba(204,0,0,0.05)' : C.gray50,
              border: `1.5px solid ${isAnonymous ? 'rgba(204,0,0,0.25)' : C.gray100}`,
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 24,
              transition: 'all 0.2s',
              cursor: 'default',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: isAnonymous ? C.redFade : C.gray100,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: isAnonymous ? C.red : C.gray400,
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              >
                {isAnonymous ? <LockOutlined /> : <UserOutlined />}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: C.gray800, fontSize: 14 }}>Mode Anonyme</div>
                <div style={{ color: C.gray400, fontSize: 12, marginTop: 2 }}>
                  Votre identité ne sera pas révélée aux responsables
                </div>
              </div>
            </div>
            <Switch
              checked={isAnonymous}
              onChange={setIsAnonymous}
              checkedChildren="Oui"
              unCheckedChildren="Non"
              style={{ background: isAnonymous ? C.red : C.gray200, flexShrink: 0 }}
            />
          </div>

          {/* Two-column grid for large screens */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0 20px',
            }}
          >
            <Form.Item
              name="targetCommitteeId"
              label={<span style={{ fontWeight: 600, color: C.gray800, fontSize: 13 }}>Comité Cible</span>}
              rules={[{ required: true, message: 'Veuillez sélectionner le comité cible.' }]}
            >
              <Select
                placeholder="Sélectionnez un comité"
                size="large"
                style={{ borderRadius: 10 }}
              >
                {committees.map(c => (
                  <Option key={c.id} value={c.id}>{c.name}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="subject"
              label={<span style={{ fontWeight: 600, color: C.gray800, fontSize: 13 }}>Objet de la réclamation</span>}
              rules={[{ required: true, message: 'Veuillez saisir un objet.' }]}
            >
              <Input
                placeholder="Ex: Problème d'organisation..."
                size="large"
                style={{ borderRadius: 10 }}
              />
            </Form.Item>
          </div>

          <Form.Item
            name="message"
            label={<span style={{ fontWeight: 600, color: C.gray800, fontSize: 13 }}>Description détaillée</span>}
            rules={[{ required: true, message: 'Veuillez détailler votre réclamation.' }]}
          >
            <Input.TextArea
              placeholder="Décrivez les faits avec précision — qui, quoi, quand, où..."
              rows={5}
              size="large"
              style={{ borderRadius: 10, resize: 'vertical' }}
            />
          </Form.Item>

          {/* File upload */}
          <Form.Item
            label={
              <span style={{ fontWeight: 600, color: C.gray800, fontSize: 13 }}>
                Pièces Jointes{' '}
                <span style={{ color: C.gray400, fontWeight: 400 }}>(optionnel — max 5 fichiers)</span>
              </span>
            }
          >
            <Dragger
              multiple
              maxCount={5}
              fileList={fileList}
              beforeUpload={file => {
                const ok = ['image/jpeg', 'image/png', 'application/pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
                if (!ok) { message.error('Format non supporté (JPG, PNG, PDF, DOCX uniquement)'); return Upload.LIST_IGNORE; }
                if (file.size / 1024 / 1024 > 5) { message.error('Taille max 5 Mo par fichier.'); return Upload.LIST_IGNORE; }
                return false;
              }}
              onChange={info => setFileList(info.fileList)}
              style={{
                borderRadius: 12,
                border: `1.5px dashed ${C.gray200}`,
                background: C.gray50,
              }}
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                <InboxOutlined style={{ color: C.red, fontSize: 32 }} />
              </p>
              <p style={{ margin: 0, fontWeight: 600, color: C.gray800, fontSize: 14 }}>
                Cliquez ou glissez-déposez vos fichiers
              </p>
              <p style={{ margin: '4px 0 0', color: C.gray400, fontSize: 12 }}>
                Images, PDF, Word — Taille max 5 Mo/fichier
              </p>
            </Dragger>
          </Form.Item>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: loading ? C.gray200 : `linear-gradient(135deg, ${C.redDark}, ${C.red})`,
                color: loading ? C.gray400 : C.white,
                border: 'none',
                borderRadius: 12,
                padding: '13px 32px',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(204,0,0,0.3)',
                transition: 'all 0.2s',
                letterSpacing: '0.2px',
              }}
              onMouseEnter={e => {
                if (!loading) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
              }}
            >
              <SendOutlined style={{ fontSize: 15 }} />
              {loading ? 'Envoi en cours...' : 'Envoyer la réclamation'}
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
};