"use client"

import { useIdeStore } from "@/store/store";
import { useWebSocket } from "./useWebsocket";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";




function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}


export const useFileSync = () => {
    const { socket, emit, isConnected } = useWebSocket();
    const { refreshFileTree, addTab } = useIdeStore();

    const debouncedSaveRef = useRef(debounce((path: string, content: string) => {
        emit("file:save", { path, content });
    }, 1000));

    useEffect(() => {
        if (!socket) return;

        const handleFileSaved = (data: { path: string }) => {
            console.log("file saved", data.path);
        };
        const handleFileCreated = (data: { path: string }) => {
            console.log("File created", data.path);
            refreshFileTree();
            toast.success(`Created: ${data.path.split('/').pop()}`);
        };
        const handleFileDeleted = (data: { path: string }) => {
            console.log("File deleted:", data.path);
            refreshFileTree();
            toast.success(`Deleted: ${data.path.split('/').pop()}`);
        };
        const handleFileChanged = (data: { path: string; action: string; userId: string }) => {
            console.log(`File ${data.action}:`, data.path, "by", data.userId);
            refreshFileTree();
        };
        const handleFileError = (data: { message: string }) => {
            console.error("File error", data.message);
            toast.error(`File error: ${data.message}`);
        };
        const handleFilesChanged = (data: {
            changes: {
                added: string[];
                modified: string[];
                deleted: string[];
            };
            timestamp: number;
            totalChanges: number;
        }) => {
            console.log(`${data.totalChanges} files changed`, data.changes);
            refreshFileTree();
            if (data.totalChanges > 10) {
                toast.info(`${data.totalChanges} files changed`);
            }
        };
        const handleDependenciesInstalled = () => {
            console.log("Dependencies installed (node_modules detected)");
            toast.success("Dependencies installed");
            refreshFileTree();
        };
        const handleBuildComplete = () => {
            console.log("Build folder completed");
            toast.success("Build output detected");
            refreshFileTree();
        };
        const handlePackageUpdated = () => {
            console.log("packages updated");
        };

        socket.on('file:saved', handleFileSaved);
        socket.on('file:created', handleFileCreated);
        socket.on('file:deleted', handleFileDeleted);
        socket.on("file:changed", handleFileChanged);
        socket.on("file:error", handleFileError);
        socket.on("files:changed", handleFilesChanged);
        socket.on("build:dependencies-installed", handleDependenciesInstalled);
        socket.on("build:complete", handleBuildComplete);
        socket.on("package:updated", handlePackageUpdated);

        return () => {
            socket.off('file:saved', handleFileSaved);
            socket.off('file:created', handleFileCreated);
            socket.off('file:deleted', handleFileDeleted);
            socket.off("file:changed", handleFileChanged);
            socket.off("file:error", handleFileError);
            socket.off("files:changed", handleFilesChanged);
            socket.off("build:dependencies-installed", handleDependenciesInstalled);
            socket.off("build:complete", handleBuildComplete);
            socket.off("package:updated", handlePackageUpdated);
        };
    }, [socket, refreshFileTree]);


    const saveFile = useCallback((path: string, content: string, immediate = false) => {
        if (!isConnected) {
            toast.error("not connected to server");
            return;
        }
        if (immediate) {
            emit("file:save", { path, content });
        } else {
            debouncedSaveRef.current(path, content);
        }
    }, [emit, isConnected]);

    const createFile = useCallback((path: string, content?: string) => {
        if (!isConnected) {
            toast.error("Not connected to server");
            return;
        }
        emit("file:create", { path, content: content || "" });
    }, [emit, isConnected]);


    const deleteFile = useCallback((path: string) => {
        if (!isConnected) {
            toast.error("Not connected to server");
            return;
        }
        emit("file:delete", { path });
    }, [emit, isConnected]);

    const openFile = useCallback((path: string, content: string) => {
        const fileExtension = path.split(".").pop() || "txt";
        const fileName = path.split("/").pop() || path;

        addTab({
            id: path,
            name: fileName,
            path,
            content,
            language: getLanguageFromExtension(fileExtension),
            isDirty: false,
        });
    }, [addTab]);

    return {
        saveFile,
        createFile,
        deleteFile,
        openFile
    };
}


function getLanguageFromExtension(extension: string): string {
    const languageMap: Record<string, string> = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        json: "json",
        html: "html",
        css: "css",
        scss: "scss",
        sass: "scss",
        less: "less",
        md: "markdown",
        yaml: "yaml",
        yml: "yaml",
        xml: "xml",
        sql: "sql",
        sh: "shell",
        bash: "shell",
        go: "go",
        rs: "rust",
        java: "java",
        c: "c",
        cpp: "cpp",
        php: "php",
        rb: "ruby",
    };

    return languageMap[extension] || "plaintext";
}