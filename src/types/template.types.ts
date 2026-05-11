// ============================================================
// Template & Report Types — v2 (JSONB structure-based)
// ============================================================

// ── Template Scope ───────────────────────────────────────────────────────────

export type TemplateScope = 'NATIONAL' | 'REGIONAL' | 'LOCAL';

// ── Template Elements (11 types) ─────────────────────────────────────────────

export type ElementType =
  | 'heading'
  | 'paragraph'
  | 'subtitle'
  | 'divider'
  | 'image'
  | 'table'
  | 'text_input'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'date_picker'
  | 'signature_block'
  | 'file_upload'
  | 'page_break';

export interface HeadingProps {
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  indentation?: number;
}

export interface ParagraphProps {
  text: string;
}

export interface ImageProps {
  src: string;
  alt: string;
  width?: number;
}

export interface TableColumn {
  id: string;
  title: string;
  type: 'txt' | 'num' | 'bool' | 'date';
  width: number;
  align: 'left' | 'center' | 'right';
  visible: boolean;
  frozen?: boolean;
}

export interface TableRow {
  id: string;
  height?: number;
  visible?: boolean;
  align?: 'top' | 'middle' | 'bottom';
  cells: Record<string, { value: any; colSpan?: number; rowSpan?: number;[key: string]: any }>;
}

export interface TableStyle {
  headerBg: string;
  headerColor: string;
  alternateRows: boolean;
  borderColor?: string;
  borders?: boolean;
  fontSize?: number;
  padding?: number;
}

export interface TableProps {
  columns: TableColumn[];
  rows: TableRow[];
  style: TableStyle;
}

export interface InputProps {
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface OptionItem {
  id: string;
  label: string;
  value: string;
}

export interface DatePickerProps {
  label: string;
  required?: boolean;
  format?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  defaultValue?: 'today' | 'none';
}

export interface CheckboxProps {
  label: string;
  options?: OptionItem[];
  layout?: 'horizontal' | 'vertical';
  required?: boolean;
}

export interface RadioProps {
  label: string;
  options: OptionItem[];
  layout?: 'horizontal' | 'vertical';
  required?: boolean;
}

export interface SignatureBlockProps {
  label: string;
  required?: boolean;
}

export type ElementProps =
  | HeadingProps
  | ParagraphProps
  | ImageProps
  | TableProps
  | InputProps
  | CheckboxProps
  | RadioProps
  | DatePickerProps
  | SignatureBlockProps
  | Record<string, unknown>;

export interface TemplateElement {
  id: string;
  type: ElementType;
  props: ElementProps & {
    x?: number;
    y?: number;
    width?: number | '100%';
    height?: number | 'auto';
    fullWidth?: boolean;
  };
}

// ── Template DTOs ────────────────────────────────────────────────────────────

export type VisibilityScope = 'ALL' | 'COMMITTEE_ONLY' | 'NATIONAL_ONLY';

export interface TemplateDTO {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  creatorRole: string;
  visibilityScope: VisibilityScope;
  scope?: TemplateScope;
  isBaseTemplate: boolean;
  parentTemplateId?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVersionDTO {
  id: string;
  templateId: string;
  versionNumber: number;
  structure: TemplateElement[];
  changeSummary?: string;
  createdBy: string;
  createdAt: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface TemplateVersionAuditEntry {
  id: string;
  templateVersionId: string;
  userId: string;
  action: 'CREATED' | 'UPDATED' | 'PUBLISHED' | 'ARCHIVED';
  timestamp: string;
}

// ── Report DTOs ──────────────────────────────────────────────────────────────

export type ReportWorkflowStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VALIDATED'
  | 'FINALIZED'
  | 'ARCHIVED';

export interface ReportInstanceDTO {
  id: string;
  templateId: string;
  templateVersionId?: string;
  filledBy: string;
  assignedTo?: string;
  assignedToName?: string;
  title: string;
  reportLevel: string;
  scope?: TemplateScope;
  committeeId?: string;
  committeeName?: string;
  workflowStatus: ReportWorkflowStatus;
  filledData?: Record<string, unknown>;
  contentHash?: string;
  pdfStorageKey?: string;
  pdfUrl?: string;
  pdfVersion?: number;
  assignedUsers?: string[];
  submittedAt?: string;
  validatedAt?: string;
  finalizedAt?: string;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt: string;
  templateVersion?: { structure: TemplateElement[] };
}

// ── Signature DTOs ───────────────────────────────────────────────────────────

export interface SignatureDTO {
  id: string;
  reportId: string;
  userId: string;
  imageUrl: string;
  imageHash: string;
  bindingHash: string;
  signerRole: string;
  signedAt: string;
  verified: boolean;
}

// ── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  reportId: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: Record<string, unknown>;
}

// ── Requests ─────────────────────────────────────────────────────────────────

export interface CreateTemplateRequest {
  title: string;
  description?: string;
  scope: TemplateScope;
  isBaseTemplate?: boolean;
  changeSummary?: string;
  structure?: TemplateElement[];
}

export interface CreateDraftReportRequest {
  templateVersionId: string;
  title: string;
  reportLevel: 'NORMAL' | 'URGENT';
  assignedTo?: string;
}

export interface AssignReportRequest {
  assignedTo: string;
}

// ── Dashboard summary ────────────────────────────────────────────────────────

export interface ReportDashboardSummary {
  totalReports: number;
  draft: number;
  pendingValidation: number;
  validated: number;
  finalized: number;
  archived: number;
}

// ── WebSocket notification ────────────────────────────────────────────────────

export type ReportNotificationType =
  | 'REPORT_ASSIGNED'
  | 'REPORT_SUBMITTED'
  | 'REPORT_VALIDATED'
  | 'REPORT_FINALIZED'
  | 'REPORT_ARCHIVED';

export interface ReportNotification {
  id: string;
  type: ReportNotificationType;
  reportId: string;
  reportTitle: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// ── Hierarchy filter ─────────────────────────────────────────────────────────

export type HierarchyLevel = 'ALL' | 'NATIONAL' | 'REGIONAL' | 'LOCAL';

export interface HierarchyFilter {
  level: HierarchyLevel;
  committeeId?: string;
  status?: ReportWorkflowStatus | 'ALL';
  search?: string;
}
