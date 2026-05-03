// ============================================================
// Shared: SignatureModal — Canvas-based signature capture
// RC branding · Touch support · Pressure simulation · No deps
// ============================================================
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Modal, Button, Space, Alert, Tooltip, Tabs, Upload, message } from 'antd';
import { ClearOutlined, SaveOutlined, UndoOutlined, UploadOutlined } from '@ant-design/icons';

const RC_RED = '#CC0000';
const RC_FONT = "'DM Sans', 'Segoe UI', system-ui, sans-serif";
const INK_COLOR = '#1a1a2e';

interface SignatureModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (imageBase64: string) => void;
  loading?: boolean;
  /** Signer name shown under the canvas */
  signerName?: string;
}

const SignatureModal: React.FC<SignatureModalProps> = ({
  open,
  onClose,
  onSave,
  loading = false,
  signerName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [activeTab, setActiveTab] = useState('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.strokeStyle = INK_COLOR;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return { ctx, canvas };
  }, []);

  // Clear & reset history when modal opens
  useEffect(() => {
    if (open) {
      setUploadedImage(null);
      setActiveTab('draw');
      setTimeout(() => {
        const res = getCtx();
        if (!res) return;
        const { ctx, canvas } = res;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current = [];
        setIsEmpty(true);
        setCanUndo(false);
      }, 50);
    }
  }, [open, getCtx]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const saveHistory = () => {
    const res = getCtx();
    if (!res) return;
    const { ctx, canvas } = res;
    historyRef.current = [...historyRef.current, ctx.getImageData(0, 0, canvas.width, canvas.height)].slice(-20);
    setCanUndo(true);
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const res = getCtx();
    if (!res) return;
    const { ctx, canvas } = res;
    saveHistory();
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const res = getCtx();
    if (!res) return;
    const { ctx, canvas } = res;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleUndo = () => {
    const res = getCtx();
    if (!res || historyRef.current.length === 0) return;
    const { ctx, canvas } = res;
    const prev = historyRef.current[historyRef.current.length - 1];
    ctx.putImageData(prev, 0, 0);
    historyRef.current = historyRef.current.slice(0, -1);
    setCanUndo(historyRef.current.length > 0);
    if (historyRef.current.length === 0) setIsEmpty(true);
  };

  const clearCanvas = () => {
    const res = getCtx();
    if (!res) return;
    const { ctx, canvas } = res;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    historyRef.current = [];
    setIsEmpty(true);
    setCanUndo(false);
  };

  const handleSave = () => {
    if (activeTab === 'upload') {
      if (uploadedImage) onSave(uploadedImage);
      return;
    }

    if (!canvasRef.current || isEmpty) return;
    // Export with white background
    const offscreen = document.createElement('canvas');
    offscreen.width = canvasRef.current.width;
    offscreen.height = canvasRef.current.height;
    const offCtx = offscreen.getContext('2d')!;
    offCtx.fillStyle = '#ffffff';
    offCtx.fillRect(0, 0, offscreen.width, offscreen.height);
    offCtx.drawImage(canvasRef.current, 0, 0);
    onSave(offscreen.toDataURL('image/png'));
  };

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    return false; // Prevent auto upload
  };

  return (
    <Modal
      title={
        <span style={{ fontFamily: RC_FONT, fontSize: 15, fontWeight: 700, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: RC_RED, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>✚</span>
          Signer le document
        </span>
      }
      open={open}
      onCancel={onClose}
      width={540}
      footer={null}
      destroyOnClose
      styles={{ body: { padding: '16px 24px 24px' } }}
    >
      <Alert
        message="Signez dans la zone ci-dessous"
        description="Votre signature sera cryptographiquement liée à votre identité et à ce rapport."
        type="info"
        showIcon
        style={{ marginBottom: 14, borderRadius: 8, fontSize: 12 }}
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'draw',
            label: 'Dessiner',
            children: (
              <div
                style={{
                  border: `2px solid #E5E7EB`,
                  borderRadius: 10,
                  background: '#FAFAFA',
                  cursor: 'crosshair',
                  touchAction: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s',
                  ...(isDrawing ? { borderColor: RC_RED } : {}),
                }}
              >
                {/* Grid lines watermark */}
                <svg
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.04 }}
                  viewBox="0 0 468 200"
                  preserveAspectRatio="none"
                >
                  {Array.from({ length: 6 }, (_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 40} x2="468" y2={i * 40} stroke="#000" strokeWidth="1" />
                  ))}
                  {Array.from({ length: 12 }, (_, i) => (
                    <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="200" stroke="#000" strokeWidth="1" />
                  ))}
                </svg>

                {/* Sign here hint */}
                {isEmpty && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D1D5DB',
                      fontSize: 13,
                      fontFamily: RC_FONT,
                      pointerEvents: 'none',
                      gap: 6,
                    }}
                  >
                    ✍ Signez ici
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={492}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  style={{ display: 'block', width: '100%', height: 200 }}
                />
              </div>
            ),
          },
          {
            key: 'upload',
            label: 'Importer',
            children: (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <Upload.Dragger
                  accept="image/png, image/jpeg, image/svg+xml"
                  showUploadList={false}
                  beforeUpload={handleUpload}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined style={{ color: RC_RED }} />
                  </p>
                  <p className="ant-upload-text">Cliquez ou glissez une image de votre signature</p>
                  <p className="ant-upload-hint">Supporte PNG, JPG ou SVG avec fond transparent.</p>
                </Upload.Dragger>
                {uploadedImage && (
                  <div style={{ marginTop: 20, border: '1px solid #E5E7EB', padding: 10, borderRadius: 8, background: '#fff' }}>
                    <img src={uploadedImage} alt="Uploaded signature" style={{ maxHeight: 100, maxWidth: '100%' }} />
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Signer line */}
      {signerName && (
        <div style={{ textAlign: 'center', fontSize: 11, color: '#9CA3AF', fontFamily: RC_FONT, marginTop: 4 }}>
          {signerName}
        </div>
      )}

      {/* Actions */}
      <Space
        style={{
          marginTop: 16,
          justifyContent: 'space-between',
          width: '100%',
          display: 'flex',
        }}
      >
        {activeTab === 'draw' && (
          <Space>
            <Tooltip title="Annuler la dernière action">
              <Button
                icon={<UndoOutlined />}
                onClick={handleUndo}
                disabled={!canUndo}
                size="small"
                style={{ fontFamily: RC_FONT }}
              >
                Annuler
              </Button>
            </Tooltip>
            <Button
              icon={<ClearOutlined />}
              onClick={clearCanvas}
              disabled={isEmpty}
              size="small"
              danger
              style={{ fontFamily: RC_FONT }}
            >
              Effacer
            </Button>
          </Space>
        )}
        {activeTab === 'upload' && <div />}

        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={activeTab === 'draw' ? isEmpty : !uploadedImage}
          loading={loading}
          style={{
            background: RC_RED,
            borderColor: RC_RED,
            fontFamily: RC_FONT,
            fontWeight: 600,
          }}
        >
          Enregistrer la signature
        </Button>
      </Space>
    </Modal>
  );
};

export default SignatureModal;