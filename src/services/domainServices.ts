// ============================================================
// NEXUS-AID — Domain Services
// API calls for all domain-specific modules
// ============================================================

import apiClient from './api';
import type {
    RescueEquipmentDTO, RescueDeviceDTO,
    EducationalResourceDTO, AwarenessCampaignDTO,
    YouthIntegrationFormDTO, MicroProjectDTO,
    HealthActionDTO, BloodDonationDTO, MedicalDistributionDTO,
    FamilyDTO, SocialActionDTO, VulnerabilityScoreDTO, SocialAnalyticsDTO,
    MigrantCaseDTO, FamilyLinkCaseDTO,
    VictimCaseDTO, ProtectionCampaignDTO,
    ShelterDTO, PartnerDTO,
    RcpEvaluationDTO, RcpNationalStatsDTO
} from '@/types';

// ---- Secourisme ----
export const secourismeService = {
    getEquipment: async (committeeId: string): Promise<RescueEquipmentDTO[]> => {
        const { data } = await apiClient.get(`/secourisme/committees/${committeeId}/equipment`);
        return data;
    },
    addEquipment: async (committeeId: string, payload: RescueEquipmentDTO): Promise<RescueEquipmentDTO> => {
        const { data } = await apiClient.post(`/secourisme/committees/${committeeId}/equipment`, payload);
        return data;
    },
    getDevices: async (committeeId: string): Promise<RescueDeviceDTO[]> => {
        const { data } = await apiClient.get(`/secourisme/committees/${committeeId}/devices`);
        return data;
    },
    createDevice: async (committeeId: string, payload: RescueDeviceDTO): Promise<RescueDeviceDTO> => {
        const { data } = await apiClient.post(`/secourisme/committees/${committeeId}/devices`, payload);
        return data;
    },
    approveDevice: async (deviceId: string, actionChiefName: string, approvalStatus: string): Promise<RescueDeviceDTO> => {
        const { data } = await apiClient.put(`/secourisme/devices/${deviceId}/approve`, null, {
            params: { actionChiefName, approvalStatus }
        });
        return data;
    },
};

// ---- RCP Evaluations ----
export const rcpService = {
    create: async (payload: RcpEvaluationDTO): Promise<RcpEvaluationDTO> => {
        const { data } = await apiClient.post('/secourisme/rcp-evaluations', payload);
        return data;
    },
    getMyEvaluations: async (): Promise<RcpEvaluationDTO[]> => {
        const { data } = await apiClient.get('/secourisme/rcp-evaluations/my');
        return data;
    },
    getByCommittee: async (committeeId: string): Promise<RcpEvaluationDTO[]> => {
        const { data } = await apiClient.get(`/secourisme/committees/${committeeId}/rcp-evaluations`);
        return data;
    },
    getAllNational: async (): Promise<RcpEvaluationDTO[]> => {
        const { data } = await apiClient.get('/secourisme/rcp-evaluations/national');
        return data;
    },
    getStatistics: async (): Promise<RcpNationalStatsDTO> => {
        const { data } = await apiClient.get('/secourisme/rcp-evaluations/statistics');
        return data;
    },
};

// ---- Diffusion ----
export const diffusionService = {
    getResources: async (): Promise<EducationalResourceDTO[]> => {
        const { data } = await apiClient.get('/diffusion/resources');
        return data;
    },
    createResource: async (payload: EducationalResourceDTO): Promise<EducationalResourceDTO> => {
        const { data } = await apiClient.post('/diffusion/resources', payload);
        return data;
    },
    getCampaigns: async (): Promise<AwarenessCampaignDTO[]> => {
        const { data } = await apiClient.get('/diffusion/campaigns');
        return data;
    },
    createCampaign: async (payload: AwarenessCampaignDTO): Promise<AwarenessCampaignDTO> => {
        const { data } = await apiClient.post('/diffusion/campaigns', payload);
        return data;
    },
};

// ---- Jeunesse ----
export const jeunesseService = {
    getForms: async (): Promise<YouthIntegrationFormDTO[]> => {
        const { data } = await apiClient.get('/jeunesse/forms');
        return data;
    },
    submitForm: async (payload: YouthIntegrationFormDTO): Promise<YouthIntegrationFormDTO> => {
        const { data } = await apiClient.post('/jeunesse/forms', payload);
        return data;
    },
    getRecommendation: async (formId: string) => {
        const { data } = await apiClient.get(`/jeunesse/forms/${formId}/recommendation`);
        return data;
    },
    createRecommendation: async (formId: string, payload: Record<string, unknown>) => {
        const { data } = await apiClient.post(`/jeunesse/forms/${formId}/recommendation`, payload);
        return data;
    },
    getProjects: async (): Promise<MicroProjectDTO[]> => {
        const { data } = await apiClient.get('/jeunesse/projects');
        return data;
    },
    createProject: async (payload: MicroProjectDTO): Promise<MicroProjectDTO> => {
        const { data } = await apiClient.post('/jeunesse/projects', payload);
        return data;
    },
};

// ---- Santé ----
export const santeService = {
    getActions: async (committeeId: string): Promise<HealthActionDTO[]> => {
        const { data } = await apiClient.get(`/sante/committees/${committeeId}/actions`);
        return data;
    },
    createAction: async (committeeId: string, payload: HealthActionDTO): Promise<HealthActionDTO> => {
        const { data } = await apiClient.post(`/sante/committees/${committeeId}/actions`, payload);
        return data;
    },
    getBloodDonations: async (): Promise<BloodDonationDTO[]> => {
        const { data } = await apiClient.get('/sante/blood-donations');
        return data;
    },
    getBloodDonationsByCommittee: async (committeeId: string): Promise<BloodDonationDTO[]> => {
        const { data } = await apiClient.get(`/sante/blood-donations/committee/${committeeId}`);
        return data;
    },
    createBloodDonation: async (payload: BloodDonationDTO): Promise<BloodDonationDTO> => {
        const { data } = await apiClient.post('/sante/blood-donations', payload);
        return data;
    },
    createHealthFile: async (payload: Record<string, unknown>) => {
        const { data } = await apiClient.post('/sante/health-files', payload);
        return data;
    },
    getHealthFilesByIntervention: async (interventionId: string) => {
        const { data } = await apiClient.get(`/sante/health-files/intervention/${interventionId}`);
        return data;
    },
    assignActionChief: async (payload: Record<string, unknown>) => {
        const { data } = await apiClient.post('/sante/action-chiefs', payload);
        return data;
    },
    // --- Distributions Médicales ---
    createDistribution: async (payload: MedicalDistributionDTO): Promise<MedicalDistributionDTO> => {
        const { data } = await apiClient.post('/sante/distributions', payload);
        return data;
    },
    getDistributionsByCommittee: async (committeeId: string): Promise<MedicalDistributionDTO[]> => {
        const { data } = await apiClient.get(`/sante/distributions/committee/${committeeId}`);
        return data;
    },
    getPendingDistributions: async (): Promise<MedicalDistributionDTO[]> => {
        const { data } = await apiClient.get('/sante/distributions/pending');
        return data;
    },
    getAllDistributions: async (): Promise<MedicalDistributionDTO[]> => {
        const { data } = await apiClient.get('/sante/distributions');
        return data;
    },
    approveDistribution: async (distributionId: string, approvedByName: string): Promise<MedicalDistributionDTO> => {
        const { data } = await apiClient.put(`/sante/distributions/${distributionId}/approve`, null, {
            params: { approvedByName }
        });
        return data;
    },
    rejectDistribution: async (distributionId: string, reason: string): Promise<MedicalDistributionDTO> => {
        const { data } = await apiClient.put(`/sante/distributions/${distributionId}/reject`, null, {
            params: { reason }
        });
        return data;
    },
    markDistributed: async (distributionId: string): Promise<MedicalDistributionDTO> => {
        const { data } = await apiClient.put(`/sante/distributions/${distributionId}/distribute`);
        return data;
    },
};

// ---- Action Sociale ----
export const socialService = {
    getFamilies: async (): Promise<FamilyDTO[]> => {
        const { data } = await apiClient.get('/social/families');
        return data;
    },
    getFamily: async (familyId: string): Promise<FamilyDTO> => {
        const { data } = await apiClient.get(`/social/families/${familyId}`);
        return data;
    },
    createFamily: async (payload: FamilyDTO): Promise<FamilyDTO> => {
        const { data } = await apiClient.post('/social/families', payload);
        return data;
    },
    updateFamily: async (familyId: string, payload: FamilyDTO): Promise<FamilyDTO> => {
        const { data } = await apiClient.put(`/social/families/${familyId}`, payload);
        return data;
    },
    getScore: async (familyId: string): Promise<VulnerabilityScoreDTO> => {
        const { data } = await apiClient.get(`/social/families/${familyId}/score`);
        return data;
    },
    getScoreHistory: async (familyId: string): Promise<VulnerabilityScoreDTO[]> => {
        const { data } = await apiClient.get(`/social/families/${familyId}/score/history`);
        return data;
    },
    updateScore: async (familyId: string, payload: Record<string, unknown>): Promise<VulnerabilityScoreDTO> => {
        const { data } = await apiClient.post(`/social/families/${familyId}/score`, payload);
        return data;
    },
    getActions: async (familyId: string): Promise<SocialActionDTO[]> => {
        const { data } = await apiClient.get(`/social/families/${familyId}/actions`);
        return data;
    },
    getAllActions: async (): Promise<SocialActionDTO[]> => {
        const { data } = await apiClient.get('/social/actions');
        return data;
    },
    createAction: async (payload: SocialActionDTO): Promise<SocialActionDTO> => {
        const { data } = await apiClient.post('/social/actions', payload);
        return data;
    },
    getAnalytics: async (): Promise<SocialAnalyticsDTO> => {
        const { data } = await apiClient.get('/social/analytics');
        return data;
    },
};

// ---- Immigration ----
export const immigrationService = {
    getCases: async (): Promise<MigrantCaseDTO[]> => {
        const { data } = await apiClient.get('/immigration/cases');
        return data;
    },
    createCase: async (payload: MigrantCaseDTO): Promise<MigrantCaseDTO> => {
        const { data } = await apiClient.post('/immigration/cases', payload);
        return data;
    },
    getFamilyLinks: async (): Promise<FamilyLinkCaseDTO[]> => {
        const { data } = await apiClient.get('/immigration/family-links');
        return data;
    },
    createFamilyLink: async (payload: FamilyLinkCaseDTO): Promise<FamilyLinkCaseDTO> => {
        const { data } = await apiClient.post('/immigration/family-links', payload);
        return data;
    },
    resolveFamilyLink: async (caseId: string, notes: string) => {
        const { data } = await apiClient.put(`/immigration/family-links/${caseId}/resolve`, JSON.stringify(notes), {
            headers: { 'Content-Type': 'application/json' },
        });
        return data;
    },
    getTracking: async (migrantCaseId: string) => {
        const { data } = await apiClient.get(`/immigration/tracking/${migrantCaseId}`);
        return data;
    },
    updateTracking: async (migrantCaseId: string, payload: Record<string, unknown>) => {
        const { data } = await apiClient.post(`/immigration/tracking/${migrantCaseId}`, payload);
        return data;
    },
};

// ---- VFF ----
export const vffService = {
    getCases: async (): Promise<VictimCaseDTO[]> => {
        const { data } = await apiClient.get('/vff/cases');
        return data;
    },
    createCase: async (payload: VictimCaseDTO): Promise<VictimCaseDTO> => {
        const { data } = await apiClient.post('/vff/cases', payload);
        return data;
    },
    createSupportPath: async (caseId: string, payload: Record<string, unknown>) => {
        const { data } = await apiClient.post(`/vff/support-paths/${caseId}`, payload);
        return data;
    },
    updateSupportPath: async (caseId: string, payload: Record<string, unknown>) => {
        const { data } = await apiClient.put(`/vff/support-paths/${caseId}`, payload);
        return data;
    },
    getSupportPath: async (caseId: string) => {
        const { data } = await apiClient.get(`/vff/support-paths/${caseId}`);
        return data;
    },
    getCampaigns: async (): Promise<ProtectionCampaignDTO[]> => {
        const { data } = await apiClient.get('/vff/campaigns');
        return data;
    },
    createCampaign: async (payload: ProtectionCampaignDTO): Promise<ProtectionCampaignDTO> => {
        const { data } = await apiClient.post('/vff/campaigns', payload);
        return data;
    },
    getShelters: async (): Promise<ShelterDTO[]> => {
        const { data } = await apiClient.get('/vff/shelters');
        return data;
    },
    createShelter: async (payload: ShelterDTO): Promise<ShelterDTO> => {
        const { data } = await apiClient.post('/vff/shelters', payload);
        return data;
    },
    getPartners: async (): Promise<PartnerDTO[]> => {
        const { data } = await apiClient.get('/vff/partners');
        return data;
    },
    createPartner: async (payload: PartnerDTO): Promise<PartnerDTO> => {
        const { data } = await apiClient.post('/vff/partners', payload);
        return data;
    },
};
