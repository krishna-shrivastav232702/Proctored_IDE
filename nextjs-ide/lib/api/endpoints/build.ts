import apiClient from '../client';

export interface StartBuildData {
    buildCommand?: string;
}

export interface BuildStartResponse {
    jobId: string;
    position: number;
    framework: string;
    buildCommand: string;
    message: string;
}

export interface BuildStatus {
    id: string;
    state: 'active' | 'waiting' | 'completed' | 'failed';
    progress: number;
    timestamp: number;
    data: {
        teamId: string;
        containerId: string;
    };
}

export interface QueuePosition {
    hasActiveBuild: boolean;
    jobId?: string;
    position?: number;
    state?: 'waiting' | 'active';
    isActive: boolean;
}

export const buildAPI = {
    start: async (data?: StartBuildData): Promise<BuildStartResponse> => {
        const response = await apiClient.post<BuildStartResponse>('/api/build/start', data || {});
        return response.data;
    },

    getStatus: async (jobId: string): Promise<{ status: BuildStatus }> => {
        const response = await apiClient.get<{ status: BuildStatus }>(`/api/build/status/${jobId}`);
        return response.data;
    },

    cancel: async (jobId: string): Promise<{ message: string }> => {
        const response = await apiClient.delete<{ message: string }>(`/api/build/${jobId}`);
        return response.data;
    },

    getQueuePosition: async (): Promise<QueuePosition> => {
        const response = await apiClient.get<QueuePosition>('/api/build/queue/position');
        return response.data;
    },

    getQueueStats: async (): Promise<any> => {
        const response = await apiClient.get('/api/build/queue/stats');
        return response.data;
    },
};
