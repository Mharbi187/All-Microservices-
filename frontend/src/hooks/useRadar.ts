import { useQuery } from '@tanstack/react-query';
import { radarApi } from '@/services/radarApi';
import type { RadarResponse } from '@/types';

export function useRadar() {
    const { data, isError, isSuccess } = useQuery<RadarResponse>({
        queryKey: ['radar'],
        queryFn: radarApi.getRadar,
        refetchInterval: 5000,
        retry: 2,
        staleTime: 3000,
    });

    const daemonStatus = data?.daemon_status ?? 'unknown';
    const isConnected = isSuccess && daemonStatus === 'running';

    return {
        data: data ?? null,
        isConnected,
        daemonStatus,
        error: isError ? 'Connection lost' : null,
    };
}
