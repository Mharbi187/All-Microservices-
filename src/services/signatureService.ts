// ============================================================
// Signature API Service
// ============================================================
import apiClient from './api';
import type { SignatureDTO } from '@/types/template.types';

const BASE = '/admin/signatures';

export const signatureService = {
  /**
   * Save a signature for a report.
   * imageBase64: base64-encoded PNG (with or without data URI prefix).
   * NOTE: userId and role are extracted from JWT server-side.
   */
  save: (reportId: string, imageBase64: string) =>
    apiClient
      .post<SignatureDTO>(BASE, { reportId, imageBase64 })
      .then((r) => r.data),

  /** Get all signatures for a report */
  getByReport: (reportId: string) =>
    apiClient
      .get<SignatureDTO[]>(`${BASE}/report/${reportId}`)
      .then((r) => r.data),

  /** Verify a signature by recomputing its hash server-side */
  verify: (signatureId: string) =>
    apiClient
      .post<{ signatureId: string; valid: boolean }>(`${BASE}/${signatureId}/verify`)
      .then((r) => r.data),

  /** Delete a signature (only the original signer can delete their own) */
  delete: (signatureId: string) =>
    apiClient.delete(`${BASE}/${signatureId}`),
};
