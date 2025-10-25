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

interface FileNode{
    name:string;
    path:string;
    type:'file' | 'folder';
    children?:FileNode[];
}

interface IdeState {
    user: User | null;
    setUser: (user: User | null) => void;
    isAuthenticated: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;

    // terminal
    terminalOutput: string;
    addTerminalOutput: (output:string) => void;
    clearTerminal: () => void;

    // file tree
    fileTree: FileNode[];
    setFileTree: (files:FileNode[]) => void;
    refreshFileTree: () => void;
    fileTreeVersion: number;

}


export const useIdeStore = create<IdeState>((set,get) => ({
    user: null,
    setUser: (user) => set({user,isAuthenticated: !!user}),
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated) => set({isAuthenticated}),


    //terminal
    terminalOutput: "",
    addTerminalOutput: (output) => set((state) => ({
        terminalOutput: state.terminalOutput + output,
    })),
    clearTerminal: () => set({terminalOutput:""}),

    //file tree
    fileTree:[],
    fileTreeVersion: 0,
    setFileTree:(files) => set({fileTree: files}),
    refreshFileTree:() => set((state) => ({fileTreeVersion: state.fileTreeVersion + 1})),
}))



