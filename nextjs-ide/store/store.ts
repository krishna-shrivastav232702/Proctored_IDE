import { create } from "zustand";
import { Collaborator } from "@/types";
import { Team } from "@/lib/api/endpoints/team";
import { Session } from "@/lib/api/endpoints/session";

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

interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: FileNode[];
}

interface EditorTab {
    id: string;
    name: string;
    path: string;
    content: string;
    language: string;
    isDirty: boolean;
}


interface IdeState {
    user: User | null;
    setUser: (user: User | null) => void;
    isAuthenticated: boolean;
    setIsAuthenticated: (isAuthenticated: boolean) => void;

    // terminal
    terminalOutput: string;
    addTerminalOutput: (output: string) => void;
    clearTerminal: () => void;

    // file tree
    fileTree: FileNode[];
    setFileTree: (files: FileNode[]) => void;
    refreshFileTree: () => void;
    fileTreeVersion: number;

    //active members
    activeMembers: Array<{
        userId: string;
        email: string;
        cursor?: {
            file: string;
            line: number;
            column: number;
        };
    }>;
    addMember: (userId: string, email: string) => void;
    removeMember: (userId: string) => void;
    updateMemberCursor: (userId: string, cursor: {
        file: string;
        line: number;
        column: number
    }) => void;

    // editor tabs
    tabs: EditorTab[];
    activeTabId: string | null;
    addTab: (tab: EditorTab) => void;
    removeTab: (tabId: string) => void;
    setActiveTab: (tabId: string) => void;
    updateTabContent: (tabId: string, content: string) => void;
    markTabDirty: (tabId: string, isDirty: boolean) => void;


    //collaborative editor
    collaborators: Collaborator[];
    setCollaborators: (collaborators: Collaborator[]) => void;
    cursorPositions: Record<string, { file: string; line: number; column: number; email: string }>;
    setCursorPosition: (userId: string, position: { file: string; line: number; column: number; email: string }) => void;
    removeCursorPosition: (userId: string) => void;


    // Team & Session
    currentTeam: Team | null;
    setCurrentTeam: (team: Team | null) => void;
    currentSession: Session | null;
    setCurrentSession: (session: Session | null) => void;
    containerStatus: 'running' | 'stopped' | 'starting' | null;
    setContainerStatus: (status: 'running' | 'stopped' | 'starting' | null) => void;
    containerStats: ContainerStats | null;
    setContainerStats: (stats: ContainerStats | null) => void;

}


export const useIdeStore = create<IdeState>((set, get) => ({
    user: null,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),


    //terminal
    terminalOutput: "",
    addTerminalOutput: (output) => set((state) => ({
        terminalOutput: state.terminalOutput + output,
    })),
    clearTerminal: () => set({ terminalOutput: "" }),

    //file tree
    fileTree: [],
    fileTreeVersion: 0,
    setFileTree: (files) => set({ fileTree: files }),
    refreshFileTree: () => set((state) => ({ fileTreeVersion: state.fileTreeVersion + 1 })),


    //active members

    activeMembers: [],
    addMember: (userId, email) => set((state) => {
        const exists = state.activeMembers.find((m) => m.userId === userId);
        if (exists) return state;
        return {
            activeMembers: [...state.activeMembers, { userId, email }],
        }
    }),
    removeMember: (userId) => set((state) => ({
        activeMembers: state.activeMembers.filter((m) => m.userId !== userId),
    })),
    updateMemberCursor: (userId, cursor) => set((state) => ({
        activeMembers: state.activeMembers.map((m) => m.userId === userId ? { ...m, cursor } : m)
    })),

    //editor tabs
    tabs: [],
    activeTabId: null,
    addTab: (tab) => set((state) => {
        const exists = state.tabs.find((t) => t.id === tab.id);
        if (exists) {
            return { activeTabId: tab.id };
        }
        return {
            tabs: [...state.tabs, tab],
            activeTabId: tab.id,
        }
    }),
    removeTab: (tabId) => set((state) => {
        const newTabs = state.tabs.filter((t) => t.id !== tabId);
        const newActiveTab = state.activeTabId === tabId ? newTabs[0]?.id || null : state.activeTabId;
        return {
            tabs: newTabs,
            activeTabId: newActiveTab,
        }
    }),
    setActiveTab: (tabId) => set({ activeTabId: tabId }),
    updateTabContent: (tabId, content) => set((state) => ({
        tabs: state.tabs.map((tab) => tab.id === tabId ? { ...tab, content } : tab),
    })),
    markTabDirty: (tabId, isDirty) => set((state) => ({
        tabs: state.tabs.map((tab) => tab.id === tabId ? { ...tab, isDirty } : tab)
    })),


    //collaborative editor
    collaborators: [],
    setCollaborators: (collaborators) => set({ collaborators }),
    cursorPositions: {},
    setCursorPosition: (userId, position) => set((state) => ({
        cursorPositions: {
            ...state.cursorPositions,
            [userId]: position,
        },
    })),
    removeCursorPosition: (userId) => set((state) => {
        const { [userId]: removed, ...rest } = state.cursorPositions;
        return { cursorPositions: rest };
    }),


    // Team & Session
    currentTeam: null,
    setCurrentTeam: (team) => set({ currentTeam: team }),
    currentSession: null,
    setCurrentSession: (session) => set({ currentSession: session }),
    containerStatus: null,
    setContainerStatus: (status) => set({ containerStatus: status }),
    containerStats: null,
    setContainerStats: (stats) => set({ containerStats: stats }),
}))