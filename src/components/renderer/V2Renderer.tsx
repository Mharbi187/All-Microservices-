// ============================================================
// V2Renderer — renders JSONB template structure
// Supports preview / fill / readonly modes for all 11 element types
// RC branding · Color & typography props · Responsive A4 layout
// ============================================================
import React, { useRef, useState } from 'react';
import { Input, Checkbox, Radio, DatePicker, Divider, Button, Tooltip } from 'antd';
import { EditOutlined, PictureOutlined } from '@ant-design/icons';
import type {
  TemplateElement,
  HeadingProps,
  ParagraphProps,
  InputProps,
  CheckboxProps,
  RadioProps,
  TableProps,
  DatePickerProps,
} from '@/types/template.types';
import SignatureModal from '@/components/shared/SignatureModal';
import { TableElement } from '@/components/builder/table/TableElement';

const RC_RED = '#CC0000';
const RC_FONT = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

const FONT_MAP: Record<string, string> = {
  display: "'Playfair Display', Georgia, serif",
  body: RC_FONT,
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

// ── A4 paper shell ────────────────────────────────────────────
const A4_STYLE: React.CSSProperties = {
  width: '100%',
  maxWidth: '210mm',
  minHeight: '297mm',
  padding: 'clamp(16px, 5%, 20mm) clamp(16px, 6%, 25mm)',
  background: '#fff',
  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
  margin: '0 auto',
  fontFamily: RC_FONT,
  fontSize: 13,
  boxSizing: 'border-box',
  position: 'relative',
};

const ELEMENT_GAP: React.CSSProperties = { marginBottom: 18 };

// ── RC Official Letterhead (tri-lingual: AR / FR / EN) ────────
const RCLetterhead: React.FC = () => (
  <div style={{ marginBottom: '8mm' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '8mm',
        marginBottom: '4mm',
      }}
    >
      {/* Right — Arabic RTL */}
      <div
        style={{
          textAlign: 'right',
          direction: 'rtl',
          fontFamily: "'Amiri', 'Traditional Arabic', serif",
          fontSize: 13,
          fontWeight: 700,
          color: '#333',
          lineHeight: 1.7,
          minWidth: 110,
        }}
      >
        الهلال الأحمر التونسي
        <br />
        الهيئة الوطنية
      </div>

      {/* Center — Logo + name in 3 languages */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1mm' }}>
        <img
          src="/logos/logo_symbole.png"
          alt="Logo CRT"
          style={{ width: '40mm', height: 'auto', maxHeight: '30mm', objectFit: 'contain' }}
        />
        <div style={{ fontFamily: "'Amiri', serif", fontSize: 11, fontWeight: 700, color: RC_RED, textAlign: 'center', direction: 'rtl' }}>
          الهلال الأحمر التونسي
        </div>
        <div style={{ fontFamily: RC_FONT, fontSize: 9, color: '#666', textAlign: 'center' }}>
          Croissant Rouge Tunisien
        </div>
        <div style={{ fontFamily: RC_FONT, fontSize: 9, color: '#666', textAlign: 'center' }}>
          Tunisian Red Crescent
        </div>
      </div>

      {/* Left — English LTR */}
      <div
        style={{
          textAlign: 'left',
          direction: 'ltr',
          fontFamily: RC_FONT,
          fontSize: 12,
          fontWeight: 700,
          color: '#9B0B22',
          lineHeight: 1.5,
          minWidth: 140,
        }}
      >
        Tunisian Red Crescent
        <br />
        National Committee
      </div>
    </div>

    {/* Red line separator */}
    <div style={{ height: 3, background: RC_RED, margin: '0 -25mm' }} />
  </div>
);

// ── Exported Single Element Renderer for Builder ──────────────
export interface V2ElementRendererProps {
  element: TemplateElement;
  filledData: Record<string, unknown>;
  mode: 'preview' | 'fill' | 'readonly';
  onChange?: (id: string, value: unknown) => void;
  setSigModalEl?: (id: string | null) => void;
  sigModalEl?: string | null;
}

export const V2ElementRenderer: React.FC<V2ElementRendererProps> = React.memo(({
  element: el,
  filledData,
  mode,
  onChange,
  setSigModalEl,
  sigModalEl
}) => {
  const isEditable = mode === 'fill';
  const value = filledData[el.id];

  // Global Styles (Margin, Padding, Borders, Width)
  const props = el.props as any;
  const globalStyle: React.CSSProperties = {
    marginBottom: 18,
    width: '100%',
    paddingTop: props.padding?.top,
    paddingRight: props.padding?.right,
    paddingBottom: props.padding?.bottom,
    paddingLeft: props.padding?.left,
    marginTop: props.margin?.top,
    marginRight: props.margin?.right,
    marginLeft: props.margin?.left,
    borderWidth: props.borderWidth,
    borderStyle: props.borderWidth ? 'solid' : 'none',
    borderColor: '#E5E7EB',
    borderRadius: props.borderRadius,
    backgroundColor: props.backgroundColor,
    boxSizing: 'border-box',
    overflow: 'hidden',
    maxWidth: '100%'
  };

  const renderContent = () => {
    switch (el.type) {
      // ── Heading ────────────────────────────────────────────
      case 'heading': {
        const { text, level, color, fontFamily, textAlign, lineHeight, fontSize, fontWeight, indentation } = props;
        const Tag = `h${level || 1}` as keyof React.JSX.IntrinsicElements;
        const sizeMap: Record<number, number> = { 1: 26, 2: 20, 3: 17, 4: 15, 5: 13, 6: 12 };
        return (
          <Tag
            style={{
              fontFamily: FONT_MAP[fontFamily ?? 'display'] ?? FONT_MAP.display,
              fontSize: fontSize || sizeMap[level || 1] || 18,
              fontWeight: fontWeight || (level <= 2 ? 700 : 600),
              color: (value as string) ? '#1F2937' : (color ?? '#1F2937'),
              textAlign: (textAlign as any) ?? 'left',
              margin: 0,
              marginLeft: indentation ? `${indentation * 20}px` : 0,
              lineHeight: lineHeight ? `${lineHeight}px` : 1.3,
            }}
          >
            {(value as string) ?? text ?? 'Titre'}
          </Tag>
        );
      }

      // ── Paragraph ─────────────────────────────────────────
      case 'paragraph': {
        const { text, color, fontSize, textAlign, fontFamily, lineHeight, fontWeight } = props;
        return (
          <p
            style={{
              margin: 0,
              fontFamily: fontFamily === 'Montserrat' ? 'Montserrat, sans-serif' : fontFamily === 'Lato' ? 'Lato, sans-serif' : RC_FONT,
              fontSize: fontSize ?? 13,
              fontWeight: fontWeight || 'normal',
              color: color ?? '#374151',
              textAlign: (textAlign as any) ?? 'left',
              lineHeight: lineHeight ? `${lineHeight}px` : 1.7,
              whiteSpace: 'pre-wrap',
            }}
          >
            {(value as string) ?? text ?? 'Texte du paragraphe...'}
          </p>
        );
      }

      // ── Subtitle ──────────────────────────────────────────
      case 'subtitle': {
        const { text, color, fontSize, textAlign, fontFamily, lineHeight, fontWeight } = props;
        const displayText = (value as string) ?? text ?? '';
        if (!displayText && mode !== 'fill') {
          // In preview/readonly: show nothing for empty subtitles
          return <div style={{ minHeight: 20, opacity: 0.3, borderBottom: '1px dashed #CBD5E1', marginBottom: 4 }} />;
        }
        return (
          <h4
            style={{
              margin: 0,
              fontFamily: fontFamily === 'Montserrat' ? 'Montserrat, sans-serif' : fontFamily === 'Lato' ? 'Lato, sans-serif' : RC_FONT,
              fontSize: fontSize ?? 14,
              fontWeight: fontWeight || 600,
              color: color ?? '#6B7280',
              textAlign: (textAlign as any) ?? 'left',
              lineHeight: lineHeight ? `${lineHeight}px` : 1.5,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {displayText || <span style={{ color: '#CBD5E1', fontStyle: 'italic', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Sous-titre...</span>}
          </h4>
        );
      }

      // ── Divider ────────────────────────────────────────────
      case 'divider': {
        const { style: borderStyle, color, borderWidth } = props;
        return (
          <hr
            style={{
              border: 'none',
              borderTop: `${borderWidth ?? 1}px ${borderStyle ?? 'solid'} ${color ?? '#E5E7EB'}`,
              margin: 0,
              width: '100%',
            }}
          />
        );
      }

      // ── Image ──────────────────────────────────────────────
      case 'image': {
        const { src, alt, width, textAlign } = props;
        return (
          <div style={{ textAlign: textAlign ?? 'left', width: '100%' }}>
            {src ? (
              <img
                src={src}
                alt={alt}
                style={{ maxWidth: '100%', width: width ? `${width}%` : '100%', borderRadius: 6, display: 'inline-block' }}
              />
            ) : mode === 'preview' ? (
              // Clean placeholder for preview/PDF mode
              <div style={{
                width: width ? `${width}%` : '100%', minHeight: 80,
                background: '#F9FAFB', border: '1px dashed #D1D5DB', borderRadius: 8,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 6, color: '#9CA3AF',
              }}>
                <PictureOutlined style={{ fontSize: 24, color: '#D1D5DB' }} />
                <span style={{ fontSize: 11, color: '#D1D5DB' }}>Image</span>
              </div>
            ) : (
              <div style={{
                background: '#F9FAFB', border: '2px dashed #E5E7EB', borderRadius: 8,
                minHeight: 80, width: width ? `${width}%` : '100%',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                color: '#D1D5DB', fontSize: 13, fontFamily: RC_FONT,
              }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <PictureOutlined style={{ marginRight: 6, fontSize: 16 }} />
                  Zone image
                </div>
              </div>
            )}
          </div>
        );
      }

      // ── Table ──────────────────────────────────────────────
      case 'table': {
        return (
          <TableElement
            el={el}
            filledData={filledData}
            onChange={onChange}
            mode={mode}
          />
        );
      }

      // ── Text input ────────────────────────────────────────
      case 'text_input': {
        const { label, placeholder, required, color } = props;
        return (
          <div style={{ width: '100%' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 5, fontSize: 12, fontFamily: RC_FONT, color: color ?? '#374151' }}>
              {label || 'Champ de texte'}
              {required && <span style={{ color: RC_RED, marginLeft: 2 }}>*</span>}
            </label>
            {mode === 'readonly' && value ? (
              <div style={{ padding: '8px 11px', borderBottom: '1px dashed #E5E7EB' }}>{value as string}</div>
            ) : (
              <Input
                placeholder={placeholder}
                value={(value as string) ?? ''}
                readOnly={!isEditable}
                style={{ fontFamily: RC_FONT, fontSize: 13, pointerEvents: mode === 'preview' ? 'none' : 'auto' }}
                onChange={isEditable ? (e) => onChange?.(el.id, e.target.value) : undefined}
              />
            )}
          </div>
        );
      }

      // ── Textarea ──────────────────────────────────────────
      case 'textarea': {
        const { label, required, placeholder, rows } = props;
        return (
          <div style={{ width: '100%' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 5, fontSize: 12, fontFamily: RC_FONT, color: '#374151' }}>
              {label || 'Zone de texte'}
              {required && <span style={{ color: RC_RED, marginLeft: 2 }}>*</span>}
            </label>
            {mode === 'readonly' && value ? (
              <div style={{ padding: '8px 11px', borderBottom: '1px dashed #E5E7EB', whiteSpace: 'pre-wrap' }}>{value as string}</div>
            ) : (
              <Input.TextArea
                rows={rows ?? 4}
                placeholder={placeholder}
                value={(value as string) ?? ''}
                readOnly={!isEditable}
                style={{ fontFamily: RC_FONT, fontSize: 13, resize: 'vertical', pointerEvents: mode === 'preview' ? 'none' : 'auto' }}
                onChange={isEditable ? (e) => onChange?.(el.id, e.target.value) : undefined}
              />
            )}
          </div>
        );
      }

      // ── Checkbox ──────────────────────────────────────────
      case 'checkbox': {
        const { label, options, layout, required } = props as CheckboxProps;
        const opts = options || [{ id: 'opt1', label: 'Option 1', value: 'opt1' }];
        const isGroup = options && options.length > 0;

        return (
          <div style={{ width: '100%' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 12, fontFamily: RC_FONT, color: '#374151' }}>
              {label || 'Cases à cocher'}
              {required && <span style={{ color: RC_RED, marginLeft: 2 }}>*</span>}
            </label>

            {isGroup ? (
              <Checkbox.Group
                value={(value as string[]) || []}
                disabled={!isEditable && mode !== 'preview'}
                style={{ fontFamily: RC_FONT, fontSize: 13, pointerEvents: mode === 'preview' ? 'none' : 'auto' }}
                onChange={isEditable ? (checkedValues) => onChange?.(el.id, checkedValues) : undefined}
              >
                <div style={{ display: 'flex', flexDirection: layout === 'horizontal' ? 'row' : 'column', gap: layout === 'horizontal' ? 16 : 6, flexWrap: 'wrap' }}>
                  {opts.map((opt) => (
                    <Checkbox key={opt.id} value={opt.value} style={{ fontFamily: RC_FONT, fontSize: 13 }}>
                      {opt.label}
                    </Checkbox>
                  ))}
                </div>
              </Checkbox.Group>
            ) : (
              <Checkbox
                checked={!!value}
                disabled={!isEditable && mode !== 'preview'}
                style={{ fontFamily: RC_FONT, fontSize: 13, pointerEvents: mode === 'preview' ? 'none' : 'auto' }}
                onChange={isEditable ? (e) => onChange?.(el.id, e.target.checked) : undefined}
              >
                {label || 'Case à cocher'}
              </Checkbox>
            )}
          </div>
        );
      }
      // ── Radio ─────────────────────────────────────────────
      case 'radio': {
        const { label, options, layout, required } = props as RadioProps;
        const opts = options || [{ id: 'opt1', label: 'Option 1', value: 'opt1' }, { id: 'opt2', label: 'Option 2', value: 'opt2' }];
        return (
          <div style={{ width: '100%' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6, fontSize: 12, fontFamily: RC_FONT, color: '#374151' }}>
              {label || 'Choix unique'}
              {required && <span style={{ color: RC_RED, marginLeft: 2 }}>*</span>}
            </label>
            <Radio.Group
              value={value}
              disabled={!isEditable && mode !== 'preview'}
              style={{ fontFamily: RC_FONT, fontSize: 13, pointerEvents: mode === 'preview' ? 'none' : 'auto' }}
              onChange={isEditable ? (e) => onChange?.(el.id, e.target.value) : undefined}
            >
              <div style={{ display: 'flex', flexDirection: layout === 'horizontal' ? 'row' : 'column', gap: layout === 'horizontal' ? 16 : 6, flexWrap: 'wrap' }}>
                {opts.map((opt) => (
                  <Radio key={opt.id} value={opt.value} style={{ fontFamily: RC_FONT, fontSize: 13 }}>
                    {opt.label}
                  </Radio>
                ))}
              </div>
            </Radio.Group>
          </div>
        );
      }

      // ── Date Picker ───────────────────────────────────────
      case 'date_picker': {
        const { label, required, format, defaultValue } = props as DatePickerProps;
        let finalValue = value as string;
        if (!finalValue && defaultValue === 'today' && mode === 'preview') {
          const today = new Date();
          finalValue = format === 'MM/DD/YYYY' ? `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`
            : format === 'YYYY-MM-DD' ? `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
              : `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
        }

        return (
          <div style={{ width: '100%' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 5, fontSize: 12, fontFamily: RC_FONT, color: '#374151' }}>
              {label || 'Date'}
              {required && <span style={{ color: RC_RED, marginLeft: 2 }}>*</span>}
            </label>
            <input
              type="date"
              value={finalValue || ''}
              disabled={!isEditable && mode !== 'preview'}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid #D1D5DB`,
                borderRadius: 6,
                fontFamily: RC_FONT,
                fontSize: 13,
                color: '#1F2937',
                outline: 'none',
                boxSizing: 'border-box',
                pointerEvents: mode === 'preview' ? 'none' : 'auto',
                WebkitAppearance: 'none' // Better mobile rendering
              }}
              onChange={isEditable ? (e) => onChange?.(el.id, e.target.value) : undefined}
            />
          </div>
        );
      }

      // ── Signature block ───────────────────────────────────
      case 'signature_block': {
        const { label, required, signerName, signerRole } = props;
        return (
          <div style={{ width: '100%' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 5, fontSize: 12, fontFamily: RC_FONT, color: '#374151' }}>
              {label || 'Signature'}
              {required && <span style={{ color: RC_RED, marginLeft: 2 }}>*</span>}
            </label>

            {value ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={value as string}
                  alt="Signature"
                  style={{
                    maxHeight: 90,
                    border: '1px solid #E5E7EB',
                    borderRadius: 6,
                    padding: 6,
                    background: '#fff',
                    display: 'block',
                  }}
                />
                {isEditable && (
                  <Tooltip title="Modifier la signature">
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => setSigModalEl?.(el.id)}
                      style={{ position: 'absolute', top: 4, right: 4, opacity: 0.7, fontSize: 11 }}
                    />
                  </Tooltip>
                )}
                {signerName && <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4 }}>{signerName}</div>}
                {signerRole && <div style={{ fontSize: 10, color: '#6B7280' }}>{signerRole}</div>}
              </div>
            ) : (
              <div
                onClick={isEditable ? () => setSigModalEl?.(el.id) : undefined}
                style={{
                  border: `2px dashed ${isEditable ? RC_RED : '#D1D5DB'}`,
                  borderRadius: 8,
                  minHeight: 80,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isEditable ? RC_RED : '#9CA3AF',
                  cursor: isEditable ? 'pointer' : 'default',
                  background: isEditable ? '#FEF2F2' : '#F9FAFB',
                  fontSize: 13,
                  fontFamily: RC_FONT,
                  gap: 8,
                  transition: 'all 0.2s',
                  pointerEvents: mode === 'preview' ? 'none' : 'auto'
                }}
              >
                ✍ {isEditable ? 'Cliquez pour signer' : 'Zone de signature'}
              </div>
            )}
          </div>
        );
      }

      // ── File Upload ───────────────────────────────────────
      case 'file_upload': {
        const { label, required } = props;
        return (
          <div style={{ width: '100%' }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 5, fontSize: 12, fontFamily: RC_FONT, color: '#374151' }}>
              {label || 'Fichier'}
              {required && <span style={{ color: RC_RED, marginLeft: 2 }}>*</span>}
            </label>
            <div style={{
              border: `1px solid #D1D5DB`,
              borderRadius: 6,
              padding: '8px 12px',
              background: '#F9FAFB',
              color: '#9CA3AF',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: mode === 'preview' ? 'none' : 'auto'
            }}>
              📎 Uploader un fichier
            </div>
          </div>
        );
      }

      // ── Page Break ────────────────────────────────────────
      case 'page_break': {
        // In preview/fill/readonly: completely invisible — OfficialDocumentWrapper handles page splitting
        if (mode === 'preview' || mode === 'fill' || mode === 'readonly') {
          return null;
        }
        // In edit (canvas) mode only: show visual dashed indicator
        return (
          <div style={{ width: '100%', margin: '20px 0', textAlign: 'center', position: 'relative' }}>
            <div style={{ borderTop: '2px dashed #9CA3AF', position: 'absolute', top: '50%', width: '100%', zIndex: 1 }} />
            <span style={{ background: '#f8fafc', padding: '0 10px', color: '#6B7280', fontSize: 11, position: 'relative', zIndex: 2, fontFamily: RC_FONT, fontWeight: 600 }}>
              ✂ SAUT DE PAGE
            </span>
          </div>
        );
      }

      default:
        return (
          <div style={{ color: '#9CA3AF', fontSize: 12, fontFamily: RC_FONT }}>
            [Élément non reconnu : {el.type}]
          </div>
        );
    }
  };

  return (
    <div style={globalStyle}>
      {renderContent()}

      {/* Inline SignatureModal for standalone render */}
      {sigModalEl === el.id && setSigModalEl && (
        <SignatureModal
          open={true}
          onClose={() => setSigModalEl(null)}
          onSave={(dataUrl) => {
            onChange?.(el.id, dataUrl);
            setSigModalEl(null);
          }}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Deep equality check for React.memo to prevent unnecessary re-renders during DnD
  return prevProps.mode === nextProps.mode &&
    prevProps.sigModalEl === nextProps.sigModalEl &&
    JSON.stringify(prevProps.element) === JSON.stringify(nextProps.element) &&
    prevProps.filledData[prevProps.element.id] === nextProps.filledData[nextProps.element.id];
});
