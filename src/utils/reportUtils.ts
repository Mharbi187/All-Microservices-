// ============================================================
// Report Utilities — Official CRT PDF Export
// Same approach as standalone HTML editor:
// buildPrintHTML() → clean clone → new window → auto print
// ============================================================

export interface PDFMetadata {
  managerName: string;
  committee: string;
  date: string;
}

/**
 * Build clean print HTML from all .a4-sheet elements.
 * Removes delete buttons, contenteditable, interactive UI.
 */
function buildPrintHTML(containerId: string): string {
  const container = document.getElementById(containerId);
  if (!container) return '';

  // Find all A4 sheets inside the container, or use container itself
  let sheets = container.querySelectorAll('.a4-sheet');
  if (sheets.length === 0) {
    sheets = ([container] as unknown) as NodeListOf<Element>;
  }

  let pagesHTML = '';
  sheets.forEach((sheet, i) => {
    const clone = sheet.cloneNode(true) as HTMLElement;

    // Remove interactive/UI elements
    clone.querySelectorAll('.block-del, .ant-btn, button, .no-print').forEach(b => b.remove());
    clone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    clone.querySelectorAll('.ant-tooltip').forEach(t => t.remove());

    // ── Critical: reset inline sizing so @media print CSS controls dimensions ──
    clone.style.cssText = '';          // wipe ALL inline styles first
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.boxShadow = 'none';
    clone.style.position = 'relative';
    clone.style.background = 'white';
    clone.style.fontFamily = 'Arial, sans-serif';
    // NOTE: Do NOT set overflow:hidden — it clips multi-page content!
    clone.style.overflow = 'visible';
    if (i < sheets.length - 1) clone.style.pageBreakAfter = 'always';

    pagesHTML += clone.outerHTML;
  });
  return pagesHTML;
}

/** 
 * Shared CSS for the print window — matches official CRT A4 document.
 * Self-contained, no external dependencies needed.
 */
const PRINT_CSS = `
  /* ── Page setup: reserve space for fixed header & footer ── */
  @page {
    size: A4;
    margin: 40mm 15mm 30mm 15mm;
    /* Fallback for @top-center/@bottom-center not supported everywhere */
  }

  /* ── CSS page counter for "Page X / Y" ── */
  body {
    counter-reset: page-number;
  }
  .doc-footer .page-num::after {
    content: "Page " counter(page-number) " / " counter(pages);
    font-size: 7.5px;
    color: #999;
    display: block;
    text-align: center;
    margin-top: 2px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important; }

  html, body {
    width: 210mm;
    margin: 0 !important;
    padding: 0 !important;
    background: white;
    font-family: Arial, sans-serif;
  }

  /* Screen: show as A4 card */
  .a4-sheet, .crt-document {
    width: 210mm;
    min-height: 297mm;
    background: white;
    page-break-after: always;
    position: relative;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    /* Do NOT overflow:hidden — it clips multi-page content */
  }

  /* Print overrides */
  @media print {
    html, body {
      width: 100%;
      margin: 0 !important;
      padding: 0 !important;
    }
    .a4-sheet, .crt-document {
      width: 100% !important;
      min-height: auto !important;
      box-shadow: none !important;
      margin: 0 !important;
      padding: 0 !important;
      page-break-after: always;
      overflow: visible !important;
    }

    /* ── HEADER: fixed on every page ── */
    .lh-wrap, .crt-letterhead {
      position: fixed !important;
      top: 0; left: 0; right: 0;
      background: white !important;
      z-index: 100;
      padding: 10px 20px 0 !important;
    }

    /* ── FOOTER: fixed on every page ── */
    .doc-footer, .crt-footer {
      position: fixed !important;
      bottom: 0; left: 0; right: 0;
      background: #f8f8f8 !important;
      border-top: 0.5px solid #ddd !important;
      z-index: 100;
    }

    /* ── Content zone: respect fixed header & footer space ── */
    .body-wrap, .crt-body {
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    /* ── Avoid cutting blocks ── */
    .block-wrap, .sig-wrap, .crt-signature-block, .sender-center, .meta-row {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    h1,h2,h3,h4,h5,h6 { break-after: avoid; }
    p { orphans: 3; widows: 3; }
  }

  /* ── Letterhead ── */
  .lh-wrap, .crt-letterhead { padding: 18px 28px 0; }
  .lh-row, .crt-letterhead-row {
    display: flex; align-items: flex-start;
    justify-content: space-between; margin-bottom: 6px;
  }
  .lh-ar, .crt-lh-ar {
    font-size: 11px; color: #333; text-align: right;
    line-height: 1.7; min-width: 110px; direction: rtl;
  }
  .lh-center, .crt-lh-center {
    display: flex; flex-direction: column;
    align-items: center; flex: 1; gap: 2px;
  }
  .lh-name-ar, .crt-lh-name-ar {
    font-size: 10.5px; color: #C8102E; font-weight: 700;
    text-align: center; direction: rtl;
  }
  .lh-name-fr, .crt-lh-name-fr, .crt-lh-name-en {
    font-size: 8.5px; color: #555; text-align: center;
  }
  .lh-fr, .crt-lh-en {
    font-size: 11.5px; font-weight: 700; color: #9B0B22;
    text-align: left; line-height: 1.6; min-width: 130px;
  }
  .lh-line, .crt-red-line {
    height: 3px; background: #C8102E; margin: 6px -28px 0; border: none;
  }
  .crt-lh-logo { width: 50mm; height: auto; max-height: 35mm; object-fit: contain; }
  img { max-width: 100%; }

  /* ── Metadata ── */
  .meta-row, .crt-meta {
    display: flex; justify-content: space-between;
    padding: 8px 28px; border-bottom: 0.5px solid #eee;
    font-size: 11px; color: #333;
  }
  .crt-meta-ref, .crt-meta-date { font-size: 11px; color: #333; direction: rtl; }

  /* ── Sender ── */
  .sender-center, .crt-sender-block {
    text-align: center; margin-bottom: 16px;
    direction: rtl; font-size: 12px; line-height: 2;
    padding: 5mm 15mm 4mm;
  }
  .from-lbl, .crt-sender-label { color: #666; font-size: 11px; }
  .from-name, .crt-sender-name { font-weight: 700; font-size: 13px; }
  .from-title, .crt-sender-role { font-weight: 700; color: #C8102E; }
  .to-lbl { color: #666; font-size: 11px; margin-top: 4px; }
  .to-name, .crt-recipient { font-weight: 700; }
  .doc-hr, .crt-section-divider { border: none; border-top: 0.5px solid #ddd; margin: 10px 0; }

  /* ── Body ── */
  .body-wrap, .crt-body { padding: 14px 32px 90px; min-height: 120mm; }
  .block-wrap { margin-bottom: 10px; }
  .content-ar, .crt-rtl {
    font-family: 'Times New Roman', serif; font-size: 13px;
    line-height: 2; color: #222; direction: rtl;
    text-align: right; white-space: pre-wrap;
  }
  .content-fr, .crt-ltr {
    font-family: Arial, sans-serif; font-size: 12px;
    line-height: 1.8; color: #222; direction: ltr;
    text-align: left; white-space: pre-wrap;
  }
  .content-center {
    font-family: Arial, sans-serif; font-size: 12px;
    line-height: 1.8; color: #222; text-align: center;
    white-space: pre-wrap;
  }

  /* ── Signature ── */
  .sig-wrap, .crt-signature-block {
    margin-top: 28px; display: flex;
    justify-content: flex-end; direction: rtl;
    padding: 0 15mm;
  }
  .sig-box, .crt-sig-left { text-align: right; }
  .sig-name, .crt-sig-name { font-weight: 700; font-size: 13px; color: #222; }
  .sig-title, .crt-sig-role { color: #C8102E; font-size: 11px; margin-top: 2px; }
  .sig-stamp, .crt-stamp-zone {
    width: 70px; height: 70px; border: 1.5px dashed #ccc;
    border-radius: 50%; display: flex; align-items: center;
    justify-content: center; font-size: 9px; color: #aaa;
    margin-top: 8px; margin-right: auto;
  }
  .crt-closing {
    text-align: center; margin-top: 5mm; padding: 0 15mm;
    font-size: 12px; font-style: italic; color: #555; direction: rtl;
  }

  /* ── Footer ── */
  .doc-footer, .crt-footer {
    background: #f8f8f8; border-top: 0.5px solid #ddd;
    padding: 7px 28px; font-size: 8.5px; color: #666;
    text-align: center; direction: rtl; line-height: 1.7;
    /* Screen: absolute (static single-page preview)
       Print: overridden to position:fixed by @media print block above */
    position: absolute; bottom: 0; left: 0; right: 0;
  }

  /* ── V2Renderer elements ── */
  h1, h2, h3, h4, h5, h6 { color: #1F2937; margin-bottom: 6px; }
  p { margin-bottom: 6px; line-height: 1.7; }
  input, textarea, select { border: none !important; background: transparent !important; box-shadow: none !important; font-family: inherit; font-size: inherit; }
  .ant-input, .ant-select, .ant-picker { border: none !important; background: transparent !important; box-shadow: none !important; }
  .ant-checkbox-wrapper, .ant-radio-wrapper { pointer-events: none; }
  .ant-btn, button, .ant-tooltip { display: none !important; }
  /* ── Tables: header repeats on each printed page ── */
  table { width: 100%; border-collapse: collapse; font-size: 11pt; }
  table th, table td { border: 1px solid #E5E7EB; padding: 4px 8px; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }

  /* ── Page number span (shown in print only via @media print) ── */
  .page-num { display: none; }
  @media print {
    .page-num {
      display: block;
      font-size: 7.5px;
      color: #999;
      text-align: center;
      margin-top: 2px;
    }
    .page-num::after {
      content: "Page " counter(page) " / " counter(pages);
    }
  }
`;

/**
 * Export official PDF — opens a clean window with ONLY the A4 document.
 * Auto-triggers print dialog. User selects "Save as PDF".
 */
export const exportOfficialPDF = (elementId: string, filename: string) => {
  const pagesHTML = buildPrintHTML(elementId);
  if (!pagesHTML) {
    console.error('exportOfficialPDF: no content found in', elementId);
    return;
  }

  const printWin = window.open('', '_blank', 'width=800,height=1000');
  if (!printWin) {
    alert('Activez les popups pour exporter en PDF');
    return;
  }

  // Fix image paths to absolute URLs
  const origin = window.location.origin;
  const fixedHTML = pagesHTML.replace(
    /src="\/([^"]+)"/g,
    `src="${origin}/$1"`
  );

  printWin.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${filename} — Croissant Rouge Tunisien</title>
<style>${PRINT_CSS}</style>
</head>
<body>
${fixedHTML}
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 500);
  };
<\/script>
</body>
</html>`);
  printWin.document.close();
};

/**
 * Preview before print — shows document with gray background + print button.
 */
export const previewOfficialPDF = (elementId: string, filename: string) => {
  const pagesHTML = buildPrintHTML(elementId);
  if (!pagesHTML) return;

  const printWin = window.open('', '_blank', 'width=800,height=1000');
  if (!printWin) return;

  const origin = window.location.origin;
  const fixedHTML = pagesHTML.replace(
    /src="\/([^"]+)"/g,
    `src="${origin}/$1"`
  );

  printWin.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Aperçu — ${filename}</title>
<style>
  ${PRINT_CSS}
  body {
    background: #E5E5E5 !important;
    padding: 30px; display: flex; flex-direction: column;
    align-items: center; gap: 24px;
  }
  .a4-sheet, .crt-document {
    box-shadow: 0 4px 20px rgba(0,0,0,.2);
  }
  .preview-bar {
    background: #333; color: white; padding: 12px 24px;
    border-radius: 6px; display: flex; gap: 12px;
    align-items: center; font-size: 13px; margin-bottom: 10px;
  }
  .preview-bar button {
    padding: 8px 20px; color: white; border: none;
    border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 500;
  }
  .pbtn-red { background: #C8102E; }
  .pbtn-red:hover { background: #9B0B22; }
  .pbtn-gray { background: #555; }
  .pbtn-gray:hover { background: #444; }
  @media print {
    .preview-bar { display: none !important; }
    body { background: white !important; padding: 0; gap: 0; }
    .a4-sheet, .crt-document { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="preview-bar">
  <span>Aperçu avant impression — CRT</span>
  <button class="pbtn-red" onclick="window.print()">Imprimer / Sauvegarder PDF</button>
  <button class="pbtn-gray" onclick="window.close()">Fermer</button>
</div>
${fixedHTML}
</body>
</html>`);
  printWin.document.close();
};

// ── Legacy helper ─────────────────────────────────────────────
export const formatPercent = (value: number, total: number) => {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
};
