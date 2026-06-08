import api from './api';

export interface AdminDonationNeed {
    id: string;
    committeeId: string;
    committeeName: string;
    committeeType: string;
    title: string;
    description: string;
    category: string;
    status: 'PENDING_VALIDATION' | 'VALIDATED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';
    targetAmount?: number;
    targetQuantity?: number;
    currentAmount?: number;
    currentQuantity?: number;
    createdBy: string;
    creatorName: string;
    creatorRoleName: string;
    validatedBy?: string;
    validatorName?: string;
    validatedAt?: string;
    rejectedBy?: string;
    rejectorName?: string;
    rejectedAt?: string;
    rejectionReason?: string;
    createdAt: string;
}

export interface CreateNeedRequest {
    committeeId: string;
    committeeType: string;
    committeeName: string;
    title: string;
    description: string;
    category: string; // e.g. "FOOD", "MEDICAL", "CLOTHING", "SHELTER", "FINANCIAL", "OTHER"
    targetAmount?: number;
    targetQuantity?: number;
}

export interface ValidateNeedRequest {
    action: 'VALIDATE' | 'REJECT';
    reason?: string;
    validatorName?: string;
}

export interface CreateMonetaryDonationRequest {
    donorId?: string;
    donorName: string;
    donorEmail?: string;
    donorCin?: string;
    needId?: string; // optionnel
    amount: number;
    currency?: string; // default "TND"
    paymentMethod: string; // "CASH", "CARD", "CHEQUE", "TRANSFER"
}

export interface CreateInKindDonationRequest {
    donorId?: string;
    donorName: string;
    donorEmail?: string;
    donorCin?: string;
    needId?: string; // optionnel
    itemsDescription: string; // JSON string representing: [{item, quantity, unit}]
}

export interface DonationReceiptResponse {
    receiptNumber: string;
    message: string;
    qrCodeData: string;
    pdfDownloadLink: string;
}

export interface DonationStatsResponse {
    totalNeeds: number;
    pendingNeeds: number;
    validatedNeeds: number;
    rejectedNeeds: number;
    fulfilledNeeds: number;
    totalMonetaryReceived: number;
    totalInKindDonations: number;
    committeeIds: string[];
}

export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

const ADMIN_DONATIONS_API = '/admin/donations';

export const adminDonationService = {
    // ─── Needs (Besoins) ────────────────────────────────────────────────────────

    getPendingNeeds: async (page = 0, size = 10): Promise<PaginatedResponse<AdminDonationNeed>> => {
        const response = await api.get<PaginatedResponse<AdminDonationNeed>>(`${ADMIN_DONATIONS_API}/needs/pending`, { params: { page, size } });
        return response.data;
    },

    getCommitteeNeeds: async (page = 0, size = 10): Promise<PaginatedResponse<AdminDonationNeed>> => {
        const response = await api.get<PaginatedResponse<AdminDonationNeed>>(`${ADMIN_DONATIONS_API}/needs/committee`, { params: { page, size } });
        return response.data;
    },

    getMyCreatedNeeds: async (): Promise<AdminDonationNeed[]> => {
        const response = await api.get<AdminDonationNeed[]>(`${ADMIN_DONATIONS_API}/needs/my`);
        return response.data;
    },

    getActivePublicNeeds: async (): Promise<AdminDonationNeed[]> => {
        const response = await api.get<AdminDonationNeed[]>(`${ADMIN_DONATIONS_API}/needs/active`);
        return response.data;
    },

    createNeed: async (request: CreateNeedRequest): Promise<AdminDonationNeed> => {
        const response = await api.post<AdminDonationNeed>(`${ADMIN_DONATIONS_API}/needs`, request);
        return response.data;
    },

    validateNeed: async (id: string, request: ValidateNeedRequest): Promise<AdminDonationNeed> => {
        const response = await api.put<AdminDonationNeed>(`${ADMIN_DONATIONS_API}/needs/${id}/validate`, request);
        return response.data;
    },

    // ─── Statistiques ──────────────────────────────────────────────────────────

    getStats: async (): Promise<DonationStatsResponse> => {
        const response = await api.get<DonationStatsResponse>(`${ADMIN_DONATIONS_API}/stats`);
        return response.data;
    },

    // ─── Enregistrement des Dons ────────────────────────────────────────────────

    processMonetaryDonation: async (request: CreateMonetaryDonationRequest): Promise<DonationReceiptResponse> => {
        const response = await api.post<DonationReceiptResponse>(`${ADMIN_DONATIONS_API}/monetary`, request);
        return response.data;
    },

    processInKindDonation: async (request: CreateInKindDonationRequest): Promise<DonationReceiptResponse> => {
        const response = await api.post<DonationReceiptResponse>(`${ADMIN_DONATIONS_API}/in-kind`, request);
        return response.data;
    },

    downloadReceiptPdf: async (receiptNumber: string): Promise<void> => {
        const response = await api.get(`${ADMIN_DONATIONS_API}/receipts/pdf/${receiptNumber}`, {
            responseType: 'blob',
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Recu_${receiptNumber}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};

export default adminDonationService;
