// ============================================================
// PrintRenderer — Production-grade A4 PDF layout engine
// Converts absolute canvas elements → clean document flow
// Features:
//   ✅ Sort by Y position (reading order)
//   ✅ Overlap detection & validation
//   ✅ break-inside: avoid on all blocks
//   ✅ Fixed header/footer repeating on every page
//   ✅ Page numbers (Page X / Total)
//   ✅ Table header repetition
//   ✅ RTL Arabic support
//   ✅ Pure HTML/CSS — Puppeteer-compatible
//   ✅ React Component for in-app flow preview/fill
// ============================================================

import React, { useMemo } from 'react';
import type { TemplateElement } from '@/types/template.types';
import type { DocumentHeaderConfig, DocumentFooterConfig } from './OfficialDocumentWrapper';
import { V2ElementRenderer } from './V2Renderer';

/** Result of the overlap/bounds validation pass */
export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

const A4_WIDTH_PX = 794;   // ~210mm at 96dpi
const A4_HEIGHT_PX = 1123; // ~297mm at 96dpi
const HEADER_HEIGHT_MM = 38;
const FOOTER_HEIGHT_MM = 16;
const MARGIN_MM = { top: 20, right: 15, bottom: 20, left: 15 };

// ─── 1. Layout Normalizer ────────────────────────────────────────────────────
/** Sort elements by Y, group into visual rows, return clean vertical-flow order */
export function normalizeLayout(elements: TemplateElement[]): TemplateElement[] {
  if (!elements.length) return [];

  // Sort by Y first, then X within same row
  const sorted = [...elements].sort((a, b) => {
    const ay = (a.props as any).y ?? 0;
    const by = (b.props as any).y ?? 0;
    if (Math.abs(ay - by) < 20) return ((a.props as any).x ?? 0) - ((b.props as any).x ?? 0);
    return ay - by;
  });

  return sorted;
}

// ─── 2. Overlap Detection ────────────────────────────────────────────────────
function getBoundingBox(el: TemplateElement) {
  const p = el.props as any;
  const x = p.fullWidth ? 0 : (p.x ?? 0);
  const y = p.y ?? 0;
  const w = p.fullWidth ? A4_WIDTH_PX : (p.width ?? 400);
  const h = p.height ?? 60; // estimate
  return { x, y, w, h, right: x + w, bottom: y + h };
}

export function validateLayout(elements: TemplateElement[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  elements.forEach((el, i) => {
    const bb = getBoundingBox(el);

    // Out of page bounds
    if (bb.right > A4_WIDTH_PX + 10) {
      warnings.push(`Élément "${el.type}" (#${i + 1}) dépasse la largeur de la page A4.`);
    }
    if (bb.x < 0) {
      warnings.push(`Élément "${el.type}" (#${i + 1}) a une position X négative.`);
    }

    // Check overlap with other elements
    for (let j = i + 1; j < elements.length; j++) {
      const bb2 = getBoundingBox(elements[j]);
      const overlap =
        bb.x < bb2.right && bb.right > bb2.x &&
        bb.y < bb2.bottom && bb.bottom > bb2.y;
      if (overlap) {
        warnings.push(`Chevauchement détecté entre "${el.type}" (#${i + 1}) et "${elements[j].type}" (#${j + 1}).`);
      }
    }
  });

  return { valid: errors.length === 0, warnings, errors };
}

// ─── 3. Element → HTML converter ─────────────────────────────────────────────
function elementToHtml(el: TemplateElement, filledData: Record<string, unknown>): string {
  const p = el.props as any;
  const value = filledData[el.id];

  const wrapStyle = `
    margin-bottom: 12pt;
    break-inside: avoid;
    page-break-inside: avoid;
    width: ${p.fullWidth ? '100%' : (p.width ? p.width + 'px' : '100%')};
    box-sizing: border-box;
  `.trim().replace(/\n\s*/g, ' ');

  switch (el.type) {
    case 'heading': {
      const level = p.level || 1;
      const sizeMap: Record<number, number> = { 1: 22, 2: 17, 3: 15, 4: 13, 5: 12, 6: 11 };
      const text = (value as string) || p.text || 'Titre';
      return `<h${level} style="font-size:${sizeMap[level] || 16}pt;font-weight:700;color:${p.color || '#1F2937'};text-align:${p.textAlign || 'left'};margin-bottom:8pt;break-inside:avoid;">${text}</h${level}>`;
    }

    case 'subtitle': {
      const text = (value as string) || p.text || '';
      if (!text) return '';
      return `<h4 style="font-size:11pt;font-weight:600;color:${p.color || '#6B7280'};text-transform:uppercase;letter-spacing:1px;margin-bottom:6pt;break-inside:avoid;">${text}</h4>`;
    }

    case 'paragraph': {
      const text = (value as string) || p.text || '';
      if (!text) return '';
      return `<p style="font-size:${p.fontSize || 11}pt;color:${p.color || '#374151'};line-height:1.7;white-space:pre-wrap;text-align:${p.textAlign || 'left'};margin-bottom:8pt;">${text}</p>`;
    }

    case 'divider': {
      return `<hr style="border:none;border-top:${p.borderWidth || 1}px ${p.style || 'solid'} ${p.color || '#E5E7EB'};margin:8pt 0;break-inside:avoid;" />`;
    }

    case 'image': {
      if (!p.src) return `<div style="width:${p.width ? p.width + 'px' : '100%'};height:60pt;background:#F9FAFB;border:1px dashed #E5E7EB;display:flex;align-items:center;justify-content:center;color:#9CA3AF;font-size:10pt;break-inside:avoid;">📷 Image</div>`;
      return `<div style="${wrapStyle}text-align:${p.textAlign || 'left'};"><img src="${p.src}" alt="${p.alt || ''}" style="max-width:100%;width:${p.width ? p.width + '%' : 'auto'};border-radius:4px;" /></div>`;
    }

    case 'text_input': {
      const val = (value as string) || '';
      return `<div style="${wrapStyle}"><div style="font-size:9pt;font-weight:600;color:#374151;margin-bottom:3pt;">${p.label || 'Champ texte'}${p.required ? ' *' : ''}</div><div style="border-bottom:1pt solid #9CA3AF;min-height:20pt;padding:2pt 0;">${val}</div></div>`;
    }

    case 'textarea': {
      const val = (value as string) || '';
      return `<div style="${wrapStyle}"><div style="font-size:9pt;font-weight:600;color:#374151;margin-bottom:3pt;">${p.label || 'Zone de texte'}${p.required ? ' *' : ''}</div><div style="border:1pt solid #E5E7EB;min-height:${(p.rows || 3) * 16}pt;padding:4pt;border-radius:3pt;">${val}</div></div>`;
    }

    case 'date_picker': {
      const val = (value as string) || '';
      return `<div style="${wrapStyle}"><div style="font-size:9pt;font-weight:600;color:#374151;margin-bottom:3pt;">${p.label || 'Date'}${p.required ? ' *' : ''}</div><div style="border-bottom:1pt solid #9CA3AF;width:120pt;min-height:18pt;">${val}</div></div>`;
    }

    case 'checkbox': {
      const opts = p.options;
      const checked = value as string[] || [];
      if (opts && Array.isArray(opts)) {
        const items = opts.map((o: any) => `<div style="display:flex;align-items:center;gap:6pt;margin-bottom:3pt;break-inside:avoid;"><span style="width:10pt;height:10pt;border:1pt solid #374151;display:inline-block;border-radius:2pt;background:${checked.includes(o.value) ? '#374151' : '#fff'};"></span><span style="line-height:1.6;">${o.label}</span></div>`).join('');
        return `<div style="${wrapStyle}"><div style="font-size:9pt;font-weight:600;color:#374151;margin-bottom:4pt;">${p.label || ''}${p.required ? ' *' : ''}</div>${items}</div>`;
      }
      const isChecked = !!value;
      return `<div style="${wrapStyle}display:flex;align-items:center;gap:6pt;"><span style="width:10pt;height:10pt;border:1pt solid #374151;display:inline-block;border-radius:2pt;background:${isChecked ? '#374151' : '#fff'};"></span><span style="line-height:1.6;">${p.label || 'Case à cocher'}</span></div>`;
    }

    case 'radio': {
      const opts = p.options || [{ label: 'Option 1', value: 'opt1' }, { label: 'Option 2', value: 'opt2' }];
      const selected = value as string;
      const items = opts.map((o: any) => `<div style="display:flex;align-items:center;gap:6pt;margin-bottom:3pt;break-inside:avoid;"><span style="width:10pt;height:10pt;border:1pt solid #374151;border-radius:50%;display:inline-block;background:${selected === o.value ? '#374151' : '#fff'};"></span><span style="line-height:1.6;">${o.label}</span></div>`).join('');
      return `<div style="${wrapStyle}"><div style="font-size:9pt;font-weight:600;color:#374151;margin-bottom:4pt;">${p.label || 'Choix unique'}${p.required ? ' *' : ''}</div>${items}</div>`;
    }

    case 'table': {
      const cols = p.columns || [];
      const rows = p.rows || [];
      if (!cols.length) return '';
      const thead = `<thead style="display:table-header-group;"><tr>${cols.map((c: any) => `<th style="border:1pt solid #E5E7EB;padding:4pt 6pt;background:#F9FAFB;font-size:9pt;font-weight:600;text-align:left;">${c.title || c.id}</th>`).join('')}</tr></thead>`;
      const tbody = `<tbody>${rows.map((row: any) => `<tr style="break-inside:avoid;">${cols.map((c: any) => `<td style="border:1pt solid #E5E7EB;padding:4pt 6pt;font-size:9pt;">${row.cells?.[c.id]?.value ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>`;
      return `<div style="${wrapStyle}overflow-x:auto;"><table style="width:100%;border-collapse:collapse;break-inside:avoid;">${thead}${tbody}</table></div>`;
    }

    case 'signature_block': {
      const sig = value as string;
      return `<div style="${wrapStyle}"><div style="font-size:9pt;font-weight:600;color:#374151;margin-bottom:4pt;">${p.label || 'Signature'}${p.required ? ' *' : ''}</div>${sig ? `<img src="${sig}" style="max-height:60pt;border:1pt solid #E5E7EB;padding:3pt;" />` : `<div style="border-bottom:1pt solid #9CA3AF;width:150pt;height:40pt;"></div>`}${p.signerName ? `<div style="font-size:9pt;font-weight:600;margin-top:3pt;">${p.signerName}</div>` : ''}${p.signerRole ? `<div style="font-size:8pt;color:#C8102E;">${p.signerRole}</div>` : ''}</div>`;
    }
    
    case 'file_upload': {
      return `<div style="${wrapStyle}"><div style="font-size:9pt;font-weight:600;color:#374151;margin-bottom:3pt;">${p.label || 'Fichier'}${p.required ? ' *' : ''}</div><div style="border:1pt dashed #9CA3AF;min-height:20pt;padding:4pt 6pt;font-size:9pt;color:#6B7280;background:#F9FAFB;">[Fichier joint]</div></div>`;
    }

    case 'page_break':
      return '<div style="page-break-after:always;break-after:page;height:1px;"></div>';

    default:
      return '';
  }
}

// ─── 4. Header HTML builder ──────────────────────────────────────────────────
function buildHeaderHtml(header?: DocumentHeaderConfig): string {
  const h = header || {};
  const logo = h.logoUrl || '/logos/logo_symbole.png';
  const orgAr = h.organizationAr || 'الهلال الأحمر التونسي';
  const subAr = h.subtitleAr || 'الهيئة الوطنية';
  const orgFr = h.organizationFr || 'Croissant Rouge Tunisien';
  const orgEn = h.organizationEn || 'Tunisian Red Crescent';
  const headerEn = h.headerEn || 'Tunisian Red Crescent';
  const subEn = h.subtitleEn || 'National Committee';
  const color = h.primaryColor || '#C8102E';
  const logoSize = h.logoSize || 44;

  return `
    <div class="print-header">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;padding:10px 20px 0;">
        <div style="font-size:10px;color:#333;text-align:right;line-height:1.7;min-width:100px;direction:rtl;font-family:'Times New Roman',serif;">
          ${orgAr}<br/>${subAr}
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:2px;">
          <img src="${logo}" alt="Logo CRT" style="width:${logoSize}px;height:${logoSize}px;object-fit:contain;" />
          <div style="font-size:9px;color:${color};font-weight:700;text-align:center;direction:rtl;">${orgAr}</div>
          <div style="font-size:7.5px;color:#555;text-align:center;">${orgFr}</div>
          <div style="font-size:7.5px;color:#555;text-align:center;">${orgEn}</div>
        </div>
        <div style="font-size:10px;font-weight:700;color:#9B0B22;text-align:left;line-height:1.5;min-width:120px;">
          ${headerEn}<br/>${subEn}
        </div>
      </div>
      <div style="height:3px;background:${color};margin:6px 0 0;"></div>
    </div>
  `;
}

// ─── 5. Footer HTML builder ──────────────────────────────────────────────────
function buildFooterHtml(footer?: DocumentFooterConfig): string {
  const text = footer?.text || 'المقر الاجتماعي: 19 نهج الجلاترا تونس 1000 | الهاتف: 71320151 | contact@croissant-rouge.tn';
  return `
    <div class="print-footer">
      <div style="font-size:7.5px;color:#666;text-align:center;direction:rtl;line-height:1.6;">${text.replace(/\n/g, '<br/>')}</div>
      <div style="font-size:7.5px;color:#999;text-align:center;margin-top:2px;" class="page-number"></div>
    </div>
  `;
}

// ─── 6. Main: Build full print HTML ─────────────────────────────────────────
export function buildPrintHtml(
  elements: TemplateElement[],
  filledData: Record<string, unknown>,
  header?: DocumentHeaderConfig,
  footer?: DocumentFooterConfig,
  title?: string
): string {
  const ordered = normalizeLayout(elements);
  const bodyHtml = ordered.map(el => elementToHtml(el, filledData)).join('\n');
  const headerHtml = buildHeaderHtml(header);
  const footerHtml = buildFooterHtml(footer);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<title>${title || 'Document CRT'} — Croissant Rouge Tunisien</title>
<style>
  @page {
    size: A4;
    margin: ${HEADER_HEIGHT_MM + MARGIN_MM.top}mm ${MARGIN_MM.right}mm ${FOOTER_HEIGHT_MM + MARGIN_MM.bottom}mm ${MARGIN_MM.left}mm;
    @top-center { content: ''; }
  }

  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important; }

  html, body {
    width: 210mm;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11pt;
    background: white;
    color: #222;
  }

  /* ── Fixed header & footer (repeat every page) ── */
  .print-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    background: white;
    border-bottom: none;
    z-index: 100;
    padding-bottom: 0;
  }

  .print-footer {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: #f8f8f8;
    border-top: 0.5px solid #ddd;
    padding: 5px 20px;
    z-index: 100;
  }

  /* ── Page number via CSS counter ── */
  .page-number::after {
    content: "Page " counter(page) " / " counter(pages);
  }
  @page { counter-increment: page; }

  /* ── Body content area ── */
  .print-body {
    padding: 10mm 0 0;
  }

  h1,h2,h3,h4,h5,h6 { break-after: avoid; margin-bottom: 6pt; }
  p { margin-bottom: 8pt; line-height: 1.7; }

  .element-block {
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 12pt;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
    break-inside: auto;
  }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { border: 0.5px solid #E5E7EB; padding: 4pt 6pt; text-align: left; }
  th { background: #F9FAFB; font-weight: 600; }

  /* ── RTL support ── */
  [dir="rtl"] { direction: rtl; text-align: right; }
  [lang="ar"] { font-family: 'Times New Roman', 'Traditional Arabic', serif; }

  /* ── Hide screen-only elements ── */
  .no-print, button, .ant-btn, .ant-tooltip { display: none !important; }
  input, textarea { border: none !important; background: transparent !important; box-shadow: none !important; }
  .ant-input, .ant-select { border: none !important; background: transparent !important; }

  @media screen {
    body { background: #e5e5e5; padding: 20px; }
    .print-header, .print-footer { position: relative; }
    .print-body { background: white; padding: 20mm 15mm; max-width: 210mm; margin: 0 auto; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
  }
</style>
</head>
<body>
  ${headerHtml}
  ${footerHtml}
  <div class="print-body">
    ${bodyHtml}
  </div>
<script>
  // Fix relative image paths to absolute
  const imgs = document.querySelectorAll('img');
  imgs.forEach(img => {
    if (img.src.startsWith('/')) {
      img.src = window.location.origin + img.src;
    }
  });
  // Auto-print when in print mode
  if (window.location.hash === '#print') {
    window.onload = () => setTimeout(() => window.print(), 600);
  }
</script>
</body>
</html>`;
}

// ─── 7. Export functions ─────────────────────────────────────────────────────

/** Open a clean print window and auto-trigger print dialog */
export function exportToPrintWindow(
  elements: TemplateElement[],
  filledData: Record<string, unknown>,
  header?: DocumentHeaderConfig,
  footer?: DocumentFooterConfig,
  title?: string
): void {
  const html = buildPrintHtml(elements, filledData, header, footer, title);
  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) { alert('Activez les popups pour exporter en PDF'); return; }
  win.document.write(html.replace('#print', '#print') + '<script>window.location.hash="#print";</script>');
  win.document.close();
}

/** Open a preview window (with preview bar, no auto-print) */
export function openPrintPreview(
  elements: TemplateElement[],
  filledData: Record<string, unknown>,
  header?: DocumentHeaderConfig,
  footer?: DocumentFooterConfig,
  title?: string
): void {
  const html = buildPrintHtml(elements, filledData, header, footer, title);
  const previewBar = `
  <div style="position:fixed;top:0;left:0;right:0;background:#222;color:#fff;padding:10px 20px;display:flex;gap:12px;align-items:center;z-index:9999;font-family:sans-serif;font-size:13px;">
    <span>📄 Aperçu PDF — ${title || 'Document CRT'}</span>
    <button onclick="window.print()" style="background:#C8102E;color:#fff;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;">🖨 Imprimer / Sauvegarder PDF</button>
    <button onclick="window.close()" style="background:#555;color:#fff;border:none;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:12px;">✕ Fermer</button>
  </div>
  <div style="margin-top:44px;">`;

  const win = window.open('', '_blank', 'width=900,height=1100');
  if (!win) return;
  win.document.write(html.replace('<body>', `<body>${previewBar}`).replace('</body>', '</div></body>'));
  win.document.close();
}

// ─── 8. React Component for Browser Rendering ────────────────────────────────
export interface PrintRendererProps {
  structure?: TemplateElement[];
  legacyBlocks?: unknown[];
  filledData?: Record<string, unknown>;
  mode?: 'preview' | 'fill' | 'readonly';
  onChange?: (id: string, value: unknown) => void;
  showLetterhead?: boolean;
  showShell?: boolean;
}

const PrintRenderer: React.FC<PrintRendererProps> = ({
  structure,
  legacyBlocks,
  filledData = {},
  mode = 'preview',
  onChange,
}) => {
  const elements = useMemo(() => normalizeLayout(structure || []), [structure]);

  if (structure && structure.length > 0) {
    return (
      <div className="print-renderer-content" style={{ width: '100%', position: 'relative' }}>
        {elements.map((el, index) => (
          <div 
            key={el.id} 
            className="element-block"
            style={{ 
              display: 'block',
              width: '100%',
              marginBottom: '12pt',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
              position: 'relative',
              marginTop: index === 0 ? 0 : 12
            }}
          >
            <V2ElementRenderer
              element={el}
              filledData={filledData}
              mode={mode}
              onChange={onChange}
            />
          </div>
        ))}
      </div>
    );
  }

  // Legacy blocks fallback
  if (legacyBlocks && legacyBlocks.length > 0) {
    return (
      <div style={{ padding: 16 }}>
        <p style={{ color: '#888', fontStyle: 'italic' }}>
          [Modèle classique — affichage simplifié]
        </p>
        {legacyBlocks.map((block: any, idx) => (
          <div
            key={idx}
            style={{
              borderLeft: '3px solid #d9d9d9',
              paddingLeft: 12,
              marginBottom: 12,
            }}
          >
            <strong>{block.label ?? `Bloc ${idx + 1}`}</strong>
            {mode !== 'preview' && (
              <input
                style={{
                  display: 'block',
                  marginTop: 6,
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  padding: '4px 8px',
                  width: '100%',
                }}
                placeholder={block.label}
                onChange={(e) => onChange?.(String(idx), e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', color: '#aaa', padding: 48 }}>
      Aucun contenu à afficher.
    </div>
  );
};

export default PrintRenderer;
