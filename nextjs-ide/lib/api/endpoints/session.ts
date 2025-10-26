import apiClient from '../client';

export interface Session {
    id: string;
    teamId: string;
    active: boolean;
    startedAt: string;
    endedAt?: string | null;
}

export interface StartSessionData {
    teamId: string;
}

export interface SessionStartResponse {
    session: Session;
    container: {
        containerId: string;
        status: 'running' | 'stopped';
    };
}

export interface EndSessionData {
    sessionId: string;
}

export const sessionAPI = {
    start: async (data: StartSessionData): Promise<SessionStartResponse> => {
        const response = await apiClient.post<SessionStartResponse>('/api/session/start', data);
        return response.data;
    },

    end: async (data: EndSessionData): Promise<{ message: string }> => {
        const response = await apiClient.post<{ message: string }>('/api/session/end', data);
        return response.data;
    },

    getStatus: async (sessionId: string): Promise<{ session: Session }> => {
        const response = await apiClient.get<{ session: Session }>(`/api/session/${sessionId}/status`);
        return response.data;
    },
};
