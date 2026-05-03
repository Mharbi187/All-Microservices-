// ============================================================
// Template Builder API Service — v2
// ============================================================
import apiClient from './api';
import type {
  TemplateDTO,
  TemplateVersionDTO,
  CreateTemplateRequest,
  TemplateElement,
  TemplateScope,
} from '@/types/template.types';

const BASE = '/admin/templates';

export const templateBuilderService = {
  // ── Template CRUD ──────────────────────────────────────────

  list: () =>
    apiClient.get<TemplateDTO[]>(BASE).then((r) => r.data),

  /** Filtrer les templates par scope hiérarchique */
  getByScope: (scope: TemplateScope) =>
    apiClient.get<TemplateDTO[]>(`${BASE}?scope=${scope}`).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<TemplateDTO>(`${BASE}/${id}`).then((r) => r.data),

  /** Create a new v2 template (with optional initial structure) */
  create: (data: CreateTemplateRequest) =>
    apiClient.post<TemplateVersionDTO>(`${BASE}/v2`, data).then((r) => r.data),

  /** Preview a template structure — returns HTML string */
  preview: (structure: TemplateElement[]) =>
    apiClient
      .post<string>(`${BASE}/preview`, structure, {
        headers: { Accept: 'text/html' },
      })
      .then((r) => r.data),

  // ── Version management ─────────────────────────────────────

  getVersionHistory: (templateId: string) =>
    apiClient
      .get<TemplateVersionDTO[]>(`${BASE}/${templateId}/versions`)
      .then((r) => r.data),

  /** Get only published versions (usable for report creation) */
  getPublishedVersions: (templateId: string) =>
    apiClient
      .get<TemplateVersionDTO[]>(`${BASE}/${templateId}/versions`)
      .then((r) => r.data.filter((v) => v.status === 'PUBLISHED')),

  createDraftVersion: (
    templateId: string,
    structure: TemplateElement[],
    changeSummary?: string
  ) =>
    apiClient
      .post<TemplateVersionDTO>(`${BASE}/${templateId}/versions/draft`, {
        structure,
        changeSummary,
      })
      .then((r) => r.data),

  /** Publish a draft version (makes it immutable & available for report creation) */
  publishVersion: (versionId: string) =>
    apiClient
      .post<TemplateVersionDTO>(`${BASE}/versions/${versionId}/publish`)
      .then((r) => r.data),

  downloadVersionPdf: (templateId: string, versionId: string) =>
    apiClient
      .get(`${BASE}/${templateId}/versions/${versionId}/export-pdf`, { responseType: 'blob' })
      .then((r) => r.data),
};
