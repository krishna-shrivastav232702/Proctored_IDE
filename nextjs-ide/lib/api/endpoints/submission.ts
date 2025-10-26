import apiClient from '../client';

export type SubmissionStatus = 'PROCESSING' | 'UPLOADED' | 'EXTRACTED' | 'VALIDATED' | 'DEPLOYED' | 'FAILED';

export interface Submission {
  id: string;
  teamId: string;
  fileName: string;
  cdnUrl?: string;
  status: SubmissionStatus;
  submittedAt: string;
}

export const submissionAPI = {
  upload: async (file: File): Promise<{ submission: Submission }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{ submission: Submission }>('/api/submission/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAll: async (): Promise<{ submissions: Submission[] }> => {
    const response = await apiClient.get<{ submissions: Submission[] }>('/api/submission/');
    return response.data;
  },
};
