import api from './api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtendedProfile {
    id?: string;
    volunteerId?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    emergencyContactRelation?: string;
    photoUrl?: string;
    educationLevel?: EducationLevel;
    specializationDomain?: string;
    trainingCoursesAttended?: string;
    realIntegrationDate?: string;
    otherSkills?: string;
    profileCompleted: boolean;
    profileCompletionScore: number;
    submittedAt?: string;
    reviewedAt?: string;
    reviewNotes?: string;
}

export type EducationLevel =
    | 'MOINS_BAC' | 'BAC' | 'BAC_PLUS_1_2' | 'LICENCE' | 'MASTER' | 'DOCTORAT';

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
    MOINS_BAC: 'Moins que Bac',
    BAC: 'Bac',
    BAC_PLUS_1_2: 'Bac+1 / Bac+2',
    LICENCE: 'Licence',
    MASTER: 'Master',
    DOCTORAT: 'Doctorat',
};

export interface SecourismeCertification {
    id: string;
    code: string;
    label: string;
    description?: string;
    level: number;
    active: boolean;
    editableBy?: string;
}

export interface VolunteerCertification {
    id: string;
    volunteerId: string;
    certificationId: string;
    certificationCode?: string;
    certificationLabel?: string;
    dateObtained: string;
    dateExpiry?: string;
    issuedBy?: string;
    documentUrl?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'PENDING_RECYCLING';
    notes?: string;
}

export interface CommitteeOption {
    id: string;
    name: string;
    type: string;
    region: string;
}

export interface CompletenessStats {
    totalCompleted: number;
    totalIncomplete: number;
    averageScore: number | null;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const onboardingService = {

    // Profile
    getMyExtendedProfile: (): Promise<ExtendedProfile> =>
        api.get('/api/v1/onboarding/my-extended-profile').then(r => r.data),

    completeProfile: (data: Partial<ExtendedProfile>): Promise<{ profileCompleted: boolean; completionScore: number; message: string }> =>
        api.post('/api/v1/onboarding/complete-profile', data).then(r => r.data),

    getCompletionScore: (): Promise<{ score: number; completed: boolean }> =>
        api.get('/api/v1/onboarding/completion-score').then(r => r.data),

    getCompletenessStats: (): Promise<CompletenessStats> =>
        api.get('/api/v1/onboarding/completeness-stats').then(r => r.data),

    // Admin
    getVolunteerExtendedProfile: (volunteerId: string): Promise<ExtendedProfile> =>
        api.get(`/api/v1/onboarding/admin/volunteer/${volunteerId}/extended-profile`).then(r => r.data),

    adminUpdateProfile: (volunteerId: string, data: Partial<ExtendedProfile>, approve = false): Promise<ExtendedProfile> =>
        api.put(`/api/v1/onboarding/admin/volunteer/${volunteerId}/extended-profile?approve=${approve}`, data).then(r => r.data),

    // Certifications
    getAvailableCertifications: (): Promise<SecourismeCertification[]> =>
        api.get('/api/v1/onboarding/certifications').then(r => r.data),

    getMyCertifications: (): Promise<VolunteerCertification[]> =>
        api.get('/api/v1/onboarding/my-certifications').then(r => r.data),

    getVolunteerCertifications: (volunteerId: string): Promise<VolunteerCertification[]> =>
        api.get(`/api/v1/onboarding/volunteer/${volunteerId}/certifications`).then(r => r.data),

    addCertification: (data: { certificationId: string; dateObtained: string; dateExpiry?: string; issuedBy?: string }): Promise<VolunteerCertification> =>
        api.post('/api/v1/onboarding/my-certifications', data).then(r => r.data),

    addVolunteerCertification: (volunteerId: string, data: object): Promise<VolunteerCertification> =>
        api.post(`/api/v1/onboarding/admin/volunteer/${volunteerId}/certifications`, data).then(r => r.data),

    removeCertification: (volunteerId: string, certId: string): Promise<void> =>
        api.delete(`/api/v1/onboarding/volunteer/${volunteerId}/certifications/${certId}`).then(),

    createCertification: (cert: Partial<SecourismeCertification>): Promise<SecourismeCertification> =>
        api.post('/api/v1/onboarding/admin/certifications', cert).then(r => r.data),

    updateCertification: (certId: string, cert: Partial<SecourismeCertification>): Promise<SecourismeCertification> =>
        api.put(`/api/v1/onboarding/admin/certifications/${certId}`, cert).then(r => r.data),

    // Public cascade committee selection
    getGouvernorats: (): Promise<string[]> =>
        api.get('/api/v1/onboarding/public/gouvernorats').then(r => r.data),

    getRegionalCommittees: (gouvernorat?: string): Promise<CommitteeOption[]> =>
        api.get('/api/v1/onboarding/public/committees/regional', {
            params: gouvernorat ? { gouvernorat } : {}
        }).then(r => r.data),

    getLocalCommittees: (parentId: string): Promise<CommitteeOption[]> =>
        api.get(`/api/v1/onboarding/public/committees/${parentId}/sub-committees`).then(r => r.data),
};

export default onboardingService;
