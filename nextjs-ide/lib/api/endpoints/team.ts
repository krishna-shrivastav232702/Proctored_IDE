import apiClient from '../client';

export type Framework = 'NEXTJS' | 'REACT_VITE' | 'VUE' | 'ANGULAR' | 'SVELTE' | 'STATIC_HTML';

export interface CreateTeamData {
  name: string;
  framework: Framework;
}

export interface Team {
  id: string;
  name: string;
  framework: Framework;
  ownerId: string;
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  members?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  containerInfo?: {
    containerId: string;
    status: 'running' | 'stopped';
  };
  createdAt: string;
}

export interface InviteData {
  teamId: string;
  email: string;
}

export const teamAPI = {
  create: async (data: CreateTeamData): Promise<{ team: Team }> => {
    const response = await apiClient.post<{ team: Team }>('/api/team/create', data);
    return response.data;
  },

  get: async (teamId: string): Promise<{ team: Team }> => {
    const response = await apiClient.get<{ team: Team }>(`/api/team/${teamId}`);
    return response.data;
  },

  invite: async (data: InviteData): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/api/team/invite', data);
    return response.data;
  },
};
