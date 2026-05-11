// ============================================================
// OfficialDocumentWrapper — CRT A4 Multi-Page Document Shell
// ✅ N pages A4 visibles à l'écran (stack vertical)
// ✅ Header + Footer répétés sur CHAQUE page
// ✅ Numérotation Page X / Total
// ✅ Print: @page avec marges + position:fixed header/footer
// ✅ Split automatique au page_break
// ============================================================
import React from 'react';

// ──────────────────────────────────────────────────────────────
// Public Types
// ──────────────────────────────────────────────────────────────
export interface DocumentHeaderConfig {
  organizationAr?: string;
  subtitleAr?: string;
  organizationFr?: string;
  organizationEn?: string;
  headerEn?: string;
  subtitleEn?: string;
  logoUrl?: string;
  primaryColor?: string;
  logoSize?: number;
  logoRotation?: number;
}

export interface DocumentMetadata {
  reference?: string;
  dateAr?: string;
  location?: string;
  senderName?: string;
  senderRole?: string;
  recipient?: string;
}

export interface DocumentSignature {
  name?: string;
  role?: string;
  closingFormula?: string;
  showStamp?: boolean;
}

export interface DocumentFooterConfig {
  text?: string;
}

export interface OfficialDocumentWrapperProps {
  header?: DocumentHeaderConfig;
  meta?: DocumentMetadata;
  signature?: DocumentSignature;
  footer?: DocumentFooterConfig;
  showHeader?: boolean;
  showFooter?: boolean;
  showSender?: boolean;
  showSignature?: boolean;
  /** Single-page content (used when no pageGroups provided) */
  children?: React.ReactNode;
  /**
   * Multi-page content: each element of this array = one A4 page.
   * Rendered in sequence with header+footer on every page.
   * Takes priority over children if both provided.
   */
  pageGroups?: React.ReactNode[];
  id?: string;
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────
const DEFAULTS = {
  organizationAr: 'الهلال الأحمر التونسي',
  subtitleAr: 'الهيئة الوطنية',
  organizationFr: 'Croissant Rouge Tunisien',
  organizationEn: 'Tunisian Red Crescent',
  headerEn: 'Tunisian Red Crescent',
  subtitleEn: 'National Committee',
  logoUrl: '/logos/logo_symbole.png',
  footerText:
    'المقر الاجتماعي: 19 نهج الجلاترا تونس 1000، شارع المحطة مقرين 2033 \u00A0|\u00A0 الهاتف: 71320151-71253052 \u00A0|\u00A0 الفاكس: 71320630-98936158\ncontact@croissant-rouge.tn \u00A0|\u00A0 www.croissant-rouge.tn',
};

// ──────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────

/** CRT official letterhead (tri-lingual: AR / center logo / EN) */
const Letterhead: React.FC<{ h: DocumentHeaderConfig }> = ({ h }) => (
  <div className="lh-wrap" style={{ padding: '14px 28px 0', background: '#fff' }}>
    <div className="lh-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
      {/* Arabic RTL — right */}
      <div className="lh-ar" style={{ fontSize: 10, color: '#333', textAlign: 'right', lineHeight: 1.6, minWidth: 100, direction: 'rtl' }}>
        {(h.organizationAr || DEFAULTS.organizationAr).split('\n').map((l, i) => (
          <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>
        ))}
        <br />{h.subtitleAr || DEFAULTS.subtitleAr}
      </div>

      {/* Center — Logo + names */}
      <div className="lh-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: 2 }}>
        <img
          src={h.logoUrl || DEFAULTS.logoUrl}
          alt="Logo CRT"
          style={{
            width: h.logoSize ? Math.round(h.logoSize * 0.8) : 44,
            height: h.logoSize ? Math.round(h.logoSize * 0.8) : 44,
            objectFit: 'contain',
            transform: h.logoRotation ? `rotate(${h.logoRotation}deg)` : undefined,
            display: 'block',
          }}
          crossOrigin="anonymous"
        />
        <div className="lh-name-ar" style={{ fontSize: 9.5, color: h.primaryColor || '#C8102E', fontWeight: 700, textAlign: 'center', direction: 'rtl' }}>
          {h.organizationAr || DEFAULTS.organizationAr}
        </div>
        <div style={{ fontSize: 7.5, color: '#555', textAlign: 'center' }}>{h.organizationFr || DEFAULTS.organizationFr}</div>
        <div style={{ fontSize: 7.5, color: '#555', textAlign: 'center' }}>{h.organizationEn || DEFAULTS.organizationEn}</div>
      </div>

      {/* English LTR — left */}
      <div className="lh-fr" style={{ fontSize: 10.5, fontWeight: 700, color: '#9B0B22', textAlign: 'left', lineHeight: 1.5, minWidth: 120 }}>
        {(h.headerEn || DEFAULTS.headerEn).split('\n').map((l, i) => (
          <React.Fragment key={i}>{i > 0 && <br />}{l}</React.Fragment>
        ))}
        <br />{h.subtitleEn || DEFAULTS.subtitleEn}
      </div>
    </div>
    {/* Red separator line */}
    <div className="lh-line" style={{ height: 3, background: h.primaryColor || '#C8102E', margin: '4px -28px 0' }} />
  </div>
);

/** Footer bar with page number */
const FooterBar: React.FC<{ f: DocumentFooterConfig; pageNum: number; totalPages: number }> = ({ f, pageNum, totalPages }) => (
  <div className="doc-footer" style={{
    background: '#f8f8f8', borderTop: '0.5px solid #ddd',
    padding: '5px 28px', fontSize: 8, color: '#666',
    textAlign: 'center', direction: 'rtl', lineHeight: 1.6,
  }}>
    {(f.text || DEFAULTS.footerText).split('\n').map((line, i) => (
      <React.Fragment key={i}>{i > 0 && <br />}{line}</React.Fragment>
    ))}
    {totalPages > 1 && (
      <div style={{ fontSize: 7.5, color: '#999', marginTop: 2, direction: 'ltr' }}>
        Page {pageNum} / {totalPages}
      </div>
    )}
  </div>
);

// ──────────────────────────────────────────────────────────────
// One A4 Page Shell
// ──────────────────────────────────────────────────────────────
interface A4PageProps {
  h: DocumentHeaderConfig;
  f: DocumentFooterConfig;
  m: DocumentMetadata;
  s: DocumentSignature;
  showHeader: boolean;
  showFooter: boolean;
  showSender: boolean;
  showSignature: boolean;
  pageNum: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
  id?: string;
}

const A4Page: React.FC<A4PageProps> = ({
  h, f, m, s,
  showHeader, showFooter, showSender, showSignature,
  pageNum, totalPages, isFirst, isLast, children, id,
}) => (
  <div
    id={id}
    className="a4-sheet"
    style={{
      width: 794,           // 210mm @96dpi
      minHeight: 1123,      // 297mm @96dpi
      background: '#fff',
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      borderRadius: 4,
      position: 'relative',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      pageBreakAfter: isLast ? 'auto' : 'always',
      breakAfter: isLast ? 'auto' : 'page',
      overflow: 'hidden',
    }}
  >
    {/* ── HEADER: every page ── */}
    {showHeader && <Letterhead h={h} />}

    {/* ── METADATA (page 1 only) ── */}
    {isFirst && (m.reference || m.dateAr) && (
      <div className="meta-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 28px', borderBottom: '0.5px solid #eee', fontSize: 11, color: '#333' }}>
        <div style={{ direction: 'rtl' }}>{m.reference && <>ص/ه.ج/{m.reference}</>}</div>
        <div style={{ direction: 'rtl' }}>{m.location && <>{m.location} في </>}{m.dateAr}</div>
      </div>
    )}

    {/* ── SENDER / RECIPIENT (page 1 only) ── */}
    {isFirst && showSender && (m.senderName || m.recipient) && (
      <div style={{ padding: '10px 32px 0' }}>
        <div className="sender-center" style={{ textAlign: 'center', marginBottom: 12, direction: 'rtl', fontSize: 12, lineHeight: 2 }}>
          {m.senderName && (<><div className="from-lbl" style={{ color: '#666', fontSize: 11 }}>من</div><div className="from-name" style={{ fontWeight: 700, fontSize: 13 }}>{m.senderName}</div></>)}
          {m.senderRole && <div className="from-title" style={{ fontWeight: 700 }}>{m.senderRole}</div>}
          {m.recipient && (<><div className="to-lbl" style={{ color: '#666', fontSize: 11, marginTop: 4 }}>الى السادة و السيدات</div><div className="to-name" style={{ fontWeight: 700 }}>{m.recipient}</div></>)}
        </div>
        <hr className="doc-hr" style={{ border: 'none', borderTop: '0.5px solid #ddd', margin: '8px 0' }} />
      </div>
    )}

    {/* ── BODY (flex-grow fills space between header and footer) ── */}
    <div className="body-wrap" style={{ flex: 1, padding: '12px 32px', paddingBottom: 12 }}>
      {children}

      {/* ── SIGNATURE (last page only) ── */}
      {isLast && showSignature && (s.name || s.role) && (
        <>
          <div className="sig-wrap" style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end', direction: 'rtl', padding: '0 0 40px' }}>
            <div className="sig-box" style={{ textAlign: 'right' }}>
              {s.name && <div className="sig-name" style={{ fontWeight: 700, fontSize: 13, color: '#222' }}>{s.name}</div>}
              {s.role && <div className="sig-title" style={{ color: '#C8102E', fontSize: 11, marginTop: 2 }}>{s.role}</div>}
              {s.showStamp !== false && (
                <div className="sig-stamp" style={{ width: 70, height: 70, border: '1.5px dashed #ccc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#aaa', marginTop: 8, marginRight: 'auto' }}>
                  الختم
                </div>
              )}
            </div>
          </div>
          {s.closingFormula && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#555', direction: 'rtl', padding: '0 32px' }}>{s.closingFormula}</div>
          )}
        </>
      )}
    </div>

    {/* ── FOOTER: every page ── */}
    {showFooter && <FooterBar f={f} pageNum={pageNum} totalPages={totalPages} />}
  </div>
);

// ──────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────
const OfficialDocumentWrapper: React.FC<OfficialDocumentWrapperProps> = ({
  header,
  meta,
  signature,
  footer,
  showHeader = true,
  showFooter = true,
  showSender = true,
  showSignature = true,
  children,
  pageGroups,
  id = 'crt-official-document',
}) => {
  const h = header || {};
  const m = meta || {};
  const s = signature || {};
  const f = footer || {};

  // Determine the list of pages to render
  // pageGroups takes priority; fallback to single children page
  const pages: React.ReactNode[] = pageGroups && pageGroups.length > 0
    ? pageGroups
    : [children];

  const totalPages = pages.length;

  return (
    <>
      {/* ══════════ Global Print CSS ══════════ */}
      <style>{`
        @media print {
          /* Page margins: leave space for fixed header (40mm) + footer (28mm) */
          @page {
            size: A4;
            margin: 40mm 15mm 28mm 15mm;
          }
          /* Each a4-sheet = one printed page */
          .a4-sheet {
            width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }
          /* Header: fixed top on every page */
          .lh-wrap {
            position: fixed !important;
            top: 0; left: 0; right: 0;
            background: white !important;
            z-index: 100;
          }
          /* Footer: fixed bottom on every page */
          .doc-footer {
            position: fixed !important;
            bottom: 0; left: 0; right: 0;
            background: #f8f8f8 !important;
            border-top: 0.5px solid #ddd !important;
            z-index: 100;
          }
          /* Avoid splitting blocks across pages */
          .block-wrap, .sender-center, .meta-row, .sig-wrap, .element-block {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          /* Table headers repeat on each page */
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          p { orphans: 3; widows: 3; }
          h1, h2, h3, h4 { break-after: avoid; }
          /* Hide page indicator labels (screen-only) */
          .odw-page-indicator { display: none !important; }
        }
        /* Screen: stack pages vertically */
        .odw-pages-stack {
          display: flex;
          flex-direction: column;
          gap: 24px;
          align-items: center;
        }
        .odw-page-indicator {
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
          font-family: Arial, sans-serif;
          user-select: none;
          letter-spacing: 0.5px;
        }
      `}</style>

      {/* ══════════ Pages stack ══════════ */}
      <div className="odw-pages-stack" id={id}>
        {pages.map((pageContent, idx) => {
          const pageNum = idx + 1;
          const isFirst = pageNum === 1;
          const isLast = pageNum === totalPages;
          return (
            <React.Fragment key={pageNum}>
              {totalPages > 1 && (
                <div className="odw-page-indicator">
                  ── Page {pageNum} / {totalPages} ──
                </div>
              )}
              <A4Page
                h={h} f={f} m={m} s={s}
                showHeader={showHeader}
                showFooter={showFooter}
                showSender={showSender}
                showSignature={showSignature}
                pageNum={pageNum}
                totalPages={totalPages}
                isFirst={isFirst}
                isLast={isLast}
                id={isFirst ? `${id}-p1` : undefined}
              >
                {pageContent}
              </A4Page>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};

export default OfficialDocumentWrapper;
