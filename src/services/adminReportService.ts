// ============================================================
// Admin Report API Service — v2
// ============================================================
import apiClient from './api';
import type {
  ReportInstanceDTO,
  AuditLogEntry,
  CreateDraftReportRequest,
  AssignReportRequest,
  ReportDashboardSummary,
} from '@/types/template.types';

const BASE = '/admin/reports';

export const adminReportService = {
  // ── CRUD ───────────────────────────────────────────────────

  list: () =>
    apiClient.get<ReportInstanceDTO[]>(BASE).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<ReportInstanceDTO>(`${BASE}/${id}`).then((r) => r.data),

  getMyReports: () =>
    apiClient.get<ReportInstanceDTO[]>(`${BASE}/my`).then((r) => r.data),

  getByStatus: (status: string) =>
    apiClient.get<ReportInstanceDTO[]>(`${BASE}/status/${status}`).then((r) => r.data),

  // ── Draft creation ─────────────────────────────────────────

  createDraft: (data: CreateDraftReportRequest) =>
    apiClient.post<ReportInstanceDTO>(`${BASE}/draft`, data).then((r) => r.data),

  /** Récupérer les rapports assignés à l'utilisateur courant */
  getAssigned: () =>
    apiClient.get<ReportInstanceDTO[]>(`${BASE}/assigned`).then((r) => r.data),

  getAssignableUsers: () =>
    apiClient.get<any[]>(`${BASE}/assignable-users`).then((r) => r.data),

  // ── Autosave ───────────────────────────────────────────────

  updateFilledData: (reportId: string, filledData: Record<string, unknown>) =>
    apiClient
      .put<ReportInstanceDTO>(`${BASE}/${reportId}/data`, { filledData })
      .then((r) => r.data),

  // ── Workflow transitions ────────────────────────────────────

  submit: (id: string) =>
    apiClient.post(`${BASE}/${id}/submit`).then((r) => r.data),

  validate: (id: string) =>
    apiClient.post(`${BASE}/${id}/validate`).then((r) => r.data),

  finalize: (id: string) =>
    apiClient.post(`${BASE}/${id}/finalize`).then((r) => r.data),

  archive: (id: string) =>
    apiClient.post(`${BASE}/${id}/archive`).then((r) => r.data),

  // ── PDF & Audit ────────────────────────────────────────────

  downloadPdf: (id: string) =>
    apiClient
      .get(`${BASE}/${id}/pdf`, { responseType: 'blob' })
      .then((r) => r.data as Blob),

  exportDraftPdf: (id: string) =>
    apiClient
      .get(`${BASE}/${id}/pdf/draft`, { responseType: 'blob' })
      .then((r) => r.data as Blob),

  regenerateOfficialPdf: (id: string, force: boolean = false) =>
    apiClient
      .post(`${BASE}/${id}/regenerate-pdf?force=${force}`)
      .then((r) => r.data),

  getAuditTrail: (id: string) =>
    apiClient.get<AuditLogEntry[]>(`${BASE}/${id}/audit`).then((r) => r.data),

  // ── Dashboard ──────────────────────────────────────────────

  getDashboardSummary: () =>
    apiClient.get<ReportDashboardSummary>(`${BASE}/dashboard/summary`).then((r) => r.data),
};
