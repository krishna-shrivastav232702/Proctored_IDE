import { apiClient } from "../client";

export interface SignupData {
    email:string;
    password:string;
    name:string;
    teamName?:string;
}

export interface LoginData {
    email:string;
    password:string;
}

export interface AuthResponse{
    token:string;
    user:{
        id:string;
        email:string;
        name:string;
        role:'PARTICIPANT' | 'ADMIN';
        teamId:string | null;
        team?:{
            id:string;
            name:string;
            ownerId:string;
            members:Array<{
                id:string;
                name:string;
                email:string;
            }>;
        } | null;
    };
}


export const authAPI = {
    signup: async (data:SignupData):Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/signup',data);
        return response.data;
    },
    login: async(data:LoginData):Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/login',data);
        return response.data;
    },
    storeAuth:(authData:AuthResponse) => {
        localStorage.setItem('auth_token',authData.token);
        localStorage.setItem('user',JSON.stringify(authData.user));
    },
    getStoredUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    isAuthenticated: (): boolean => {
        return !!localStorage.getItem('auth_token');
    },
    logout: () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    }
}