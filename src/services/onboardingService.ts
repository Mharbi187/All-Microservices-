// ============================================================
// NEXUS-AID — Onboarding Service
// Handles post-approval extended profile form submission and
// marking the first login as completed.
// ============================================================

import apiClient from './api';

const onboardingService = {
    /**
     * Submit the extended profile form data.
     * POST /api/v1/onboarding/complete-profile
     */
    completeProfile: async (data: Record<string, unknown>): Promise<{ profileCompleted: boolean; completionScore: number; message: string }> => {
        const { data: response } = await apiClient.post('/onboarding/complete-profile', data);
        return response;
    },

    /**
     * Mark first login as completed so the modal never appears again.
     * PUT /api/v1/profiles/me/mark-first-login-complete
     */
    markFirstLoginComplete: async (): Promise<void> => {
        await apiClient.put('/profiles/me/mark-first-login-complete');
    },
};

export default onboardingService;
