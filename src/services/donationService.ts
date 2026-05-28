import api from './api';

export interface DonationNeed {
    id: string;
    committeeId: string;
    committeeName: string;
    committeeRegion: string;
    type: string;
    priority: string;
    description: string;
    quantityNeeded: string;
    beneficiaries: number;
    status: string;
    publishedAt: string;
}

export interface Donation {
    id: string;
    donationNumber: string;
    need: DonationNeed;
    donationType: string;
    description: string;
    quantity: string;
    note: string;
    photoUrl?: string;
    status: string;
    createdAt: string;
}

export interface DonationReceipt {
    id: string;
    receiptNumber: string;
    donationId: string;
    donationNumber: string;
    donationType: string;
    quantity: string;
    description: string;
    needId: string;
    committeeName: string;
    validatedAt?: string;
    validationNote?: string;
    createdAt: string;
    status: string;
}

export interface DonorStats {
    totalDonations: number;
    beneficiariesHelped: number;
    zonesCovered: number;
    validatedDonations: number;
    donationsByCategory: Record<string, number>;
}

export interface DonationCreateDto {
    needId: string;
    donationType: string;
    description: string;
    quantity: string;
    note: string;
    photoUrl?: string;
}

const DONATIONS_API = '/donations';

export const donationService = {
    getAllNeeds: async (): Promise<DonationNeed[]> => {
        const response = await api.get<DonationNeed[]>(`${DONATIONS_API}/needs`);
        return response.data;
    },

    createDonation: async (data: DonationCreateDto): Promise<Donation> => {
        const response = await api.post<Donation>(DONATIONS_API, data);
        return response.data;
    },

    getMyReceipts: async (): Promise<DonationReceipt[]> => {
        const response = await api.get<DonationReceipt[]>(`${DONATIONS_API}/my-receipts`);
        return response.data;
    },

    getMyStats: async (): Promise<DonorStats> => {
        const response = await api.get<DonorStats>(`${DONATIONS_API}/stats`);
        return response.data;
    },

    getDonationById: async (id: string): Promise<DonationReceipt> => {
        const response = await api.get<DonationReceipt>(`${DONATIONS_API}/${id}`);
        return response.data;
    },

    getDonationByNumber: async (donationNumber: string): Promise<DonationReceipt> => {
        const response = await api.get<DonationReceipt>(`${DONATIONS_API}/number/${donationNumber}`);
        return response.data;
    },

    getCommitteeDonations: async (committeeId: string): Promise<DonationReceipt[]> => {
        const response = await api.get<DonationReceipt[]>(`${DONATIONS_API}/committee/${committeeId}`);
        return response.data;
    },

    validateDonation: async (donationId: string, validationNote?: string): Promise<DonationReceipt> => {
        const response = await api.post<DonationReceipt>(`${DONATIONS_API}/${donationId}/validate`, validationNote || '', {
            headers: {
                'Content-Type': 'text/plain'
            }
        });
        return response.data;
    },
};

export default donationService;
