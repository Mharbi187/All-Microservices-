// src/utils/reportingRoles.ts

export const SCOPE_COLOR: Record<string, string> = { NATIONAL: 'volcano', REGIONAL: 'blue', LOCAL: 'green' };

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'Soumis', VALIDATED: 'Validé',
  FINALIZED: 'Finalisé', ARCHIVED: 'Archivé',
};

export const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', SUBMITTED: 'orange', VALIDATED: 'blue',
  FINALIZED: 'green', ARCHIVED: 'purple',
};

/** Returns true if the user has a management role (can validate/finalize/archive) */
export function canManageReports(roles: string[], rawRoles?: any[]): boolean {
  const managementRoles = ['PRESIDENT', 'VICE_PRESIDENT', 'SECRETAIRE_GENERAL', 'RESPONSABLE'];
  if (roles.some((r: string) => managementRoles.some((m) => r.includes(m)))) return true;
  if (rawRoles) {
    return rawRoles.some((r: any) =>
      managementRoles.some((m) => (r.role || '').includes(m))
    );
  }
  return false;
}

export function getUserScope(roles: string[], rawRoles?: any[]): 'NATIONAL' | 'REGIONAL' | 'LOCAL' {
  if (rawRoles && rawRoles.length > 0) {
    if (rawRoles.some((r: any) => r.committeeType === 'NATIONAL')) return 'NATIONAL';
    if (rawRoles.some((r: any) => r.committeeType === 'REGIONAL')) return 'REGIONAL';
  }
  if (roles.some((r) => r.includes('NATIONAL'))) return 'NATIONAL';
  if (roles.some((r) => r.includes('REGIONAL'))) return 'REGIONAL';
  return 'LOCAL';
}
