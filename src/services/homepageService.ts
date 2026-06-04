import apiClient from './api';

export interface HomepageConfig {
    id?: number;
    headline1: string;
    headline2: string;
    headlineAccent: string;
    subtitle: string;
    ctaLabel: string;
    badge1Icon: string;
    badge1Title: string;
    badge1Sub: string;
    badge2Icon: string;
    badge2Title: string;
    badge2Sub: string;
    stat1n: string;
    stat1label: string;
    stat2n: string;
    stat2label: string;
    stat3n: string;
    stat3label: string;
    heroImage: string;
}

const homepageService = {
    getHomepageConfig: async (): Promise<HomepageConfig> => {
        const { data } = await apiClient.get<HomepageConfig>('/homepage/config');
        return data;
    },

    updateHomepageConfig: async (config: HomepageConfig): Promise<HomepageConfig> => {
        const { data } = await apiClient.put<HomepageConfig>('/homepage/config', config);
        return data;
    }
};

export default homepageService;
