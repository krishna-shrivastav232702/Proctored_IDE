import { useCallback, useEffect } from "react";
import { useWebSocket } from "./useWebsocket";
import { toast } from "sonner";
import { useIdeStore } from "@/store/store";

export const useContainer = () => {
    const { emit, on, isConnected } = useWebSocket();
    const { setContainerStatus, setCurrentSession } = useIdeStore();

    const startContainer = useCallback(async () => {
        if (!isConnected) return;
        emit('container:start');
    }, [emit, isConnected]);

    const stopContainer = useCallback(async () => {
        if (!isConnected) return;
        emit('container:stop');
    }, [emit, isConnected]);

    const restartContainer = useCallback(async () => {
        if (!isConnected) return;
        emit('container:restart');
    }, [emit, isConnected]);

    useEffect(() => {
        if (!isConnected) return;

        const cleanupStatus = on('container:status', (data: { status: string }) => {
            setContainerStatus(data.status as any);
        });

        const cleanupStarted = on('container:started', (data: { sessionId: string }) => {
            setCurrentSession(data as any);
            toast.success('Container started successfully');
        });

        const cleanupStopped = on('container:stopped', () => {
            setContainerStatus('stopped');
            toast.info('Container stopped');
        });

        return () => {
            cleanupStatus();
            cleanupStarted();
            cleanupStopped();
        };
    }, [on, isConnected]);

    return { startContainer, stopContainer, restartContainer };
};
