import apiClient from '../client';
import { Team } from './team';

export interface ProctorEvent {
  id: string;
  userId: string;
  eventType: 'TAB_SWITCH' | 'DEVTOOLS_OPEN' | 'CLIPBOARD_COPY' | 'CLIPBOARD_PASTE' | 'FULLSCREEN_EXIT' | 'FOCUS_LOSS' | 'SUSPICIOUS_ACTIVITY';
  details?: string;
  timestamp: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ContainerStats {
  cpu: number;
  memory: number;
  network: {
    rx: number;
    tx: number;
  };
}

export interface SystemStats {
  totalTeams: number;
  activeContainers: number;
  totalSubmissions: number;
  aiUsageCount: number;
  proctoringEvents: number;
}

export const adminAPI = {
  // Team management
  getTeams: async (page = 1, limit = 20): Promise<{ teams: Team[]; total: number }> => {
    const response = await apiClient.get<{ teams: Team[]; total: number }>(`/api/admin/teams?page=${page}&limit=${limit}`);
    return response.data;
  },

  getTeam: async (teamId: string): Promise<{ team: Team }> => {
    const response = await apiClient.get<{ team: Team }>(`/api/admin/teams/${teamId}`);
    return response.data;
  },

  disqualifyTeam: async (teamId: string, reason: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/api/admin/teams/${teamId}/disqualify`, { reason });
    return response.data;
  },

  // Proctoring
  getProctorEvents: async (limit = 50): Promise<{ events: ProctorEvent[] }> => {
    const response = await apiClient.get<{ events: ProctorEvent[] }>(`/api/admin/proctoring/events?limit=${limit}`);
    return response.data;
  },

  getTeamViolations: async (teamId: string): Promise<{ violations: ProctorEvent[] }> => {
    const response = await apiClient.get<{ violations: ProctorEvent[] }>(`/api/admin/proctoring/violations/${teamId}`);
    return response.data;
  },

  getTeamEvents: async (teamId: string): Promise<{ events: ProctorEvent[] }> => {
    const response = await apiClient.get<{ events: ProctorEvent[] }>(`/api/admin/proctoring/events/${teamId}`);
    return response.data;
  },

  // Container management
  restartContainer: async (teamId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/api/admin/containers/${teamId}/restart`);
    return response.data;
  },

  stopContainer: async (teamId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>(`/api/admin/containers/${teamId}/stop`);
    return response.data;
  },

  getContainerStats: async (teamId: string): Promise<{ stats: ContainerStats }> => {
    const response = await apiClient.get<{ stats: ContainerStats }>(`/api/admin/containers/${teamId}/stats`);
    return response.data;
  },

  // System stats
  getStats: async (): Promise<SystemStats> => {
    const response = await apiClient.get<SystemStats>('/api/admin/stats');
    return response.data;
  },

  // Terminal logs
  getTerminalLogs: async (teamId: string): Promise<{ logs: string[] }> => {
    const response = await apiClient.get<{ logs: string[] }>(`/api/admin/terminals/${teamId}`);
    return response.data;
  },

  // AI usage
  getAIUsage: async (teamId: string): Promise<{ usage: any[] }> => {
    const response = await apiClient.get<{ usage: any[] }>(`/api/admin/ai-usage/${teamId}`);
    return response.data;
  },

  // WebSocket status
  getWebSocketStatus: async (): Promise<any> => {
    const response = await apiClient.get('/api/websocket/status');
    return response.data;
  },
};
