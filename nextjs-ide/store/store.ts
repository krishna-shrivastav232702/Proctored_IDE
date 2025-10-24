import { create } from "zustand";


interface User {
    id: string;
    email: string;
    name: string;
    role: 'PARTICIPANT' | 'ADMIN';
    teamId: string | null;
}

interface ContainerStats {
    cpu: number;
    memory: {
        usage: number;
        limit: number;
        percent: number;
    };
    network: {
        rx: number;
        tx: number;
    };
    disk?: {
        usage: number;
        limit: number;
    };
}


interface IdeState {
    user: User | null;
    setUser: (user: User | null) => void;
    isAuthenticated: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
}


export const useIdeStore = create<IdeState>((set,get) => ({
    user: null,
    setUser: (user) => set({user,isAuthenticated: !!user}),
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated) => set({isAuthenticated}),
}))



