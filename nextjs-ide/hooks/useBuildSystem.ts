"use client";

import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebsocket';
import { toast } from 'sonner';

interface BuildStatus {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed';
  progress: number;
  timestamp: number;
  data: any;
}

export function useBuildSystem() {
  const { emit, on, isConnected } = useWebSocket();
  const [currentBuild, setCurrentBuild] = useState<BuildStatus | null>(null);
  const [buildLogs, setBuildLogs] = useState<string[]>([]);
  const [isBuildPanelOpen, setIsBuildPanelOpen] = useState(false);

  const startBuild = useCallback(async (buildCommand?: string) => {
    if (!isConnected) {
      toast.error('Not connected to server');
      return;
    }

    try {
      setBuildLogs([]);
      setIsBuildPanelOpen(true);

      // Start build via WebSocket (will be queued)
      emit('build:start', { buildCommand });
      
      toast.info('Build request sent...');
    } catch (error: any) {
      console.error('Failed to start build:', error);
      toast.error('Failed to start build');
    }
  }, [emit, isConnected]);

  const cancelBuild = useCallback(async (jobId: string) => {
    try {
      // You can implement REST API call here if needed
      setCurrentBuild(null);
      toast.info('Build cancelled');
    } catch (error: any) {
      console.error('Failed to cancel build:', error);
      toast.error('Failed to cancel build');
    }
  }, []);

  const clearBuildLogs = useCallback(() => {
    setBuildLogs([]);
  }, []);

  const toggleBuildPanel = useCallback(() => {
    setIsBuildPanelOpen(prev => !prev);
  }, []);

  const addBuildLog = useCallback((log: string) => {
    setBuildLogs(prev => [...prev, log]);
  }, []);

  // Listen for build events
  useEffect(() => {
    if (!isConnected) return;

    const cleanup1 = on('build:queued', (data: { jobId: string; position: number }) => {
      setCurrentBuild({
        id: data.jobId,
        state: 'waiting',
        progress: 0,
        timestamp: Date.now(),
        data: {},
      });
      addBuildLog(`Build queued at position ${data.position}\n`);
      toast.info(`Build queued at position ${data.position}`);
    });

    const cleanup2 = on('build:started', (data: { jobId: string }) => {
      setCurrentBuild(prev => prev ? {
        ...prev,
        state: 'active',
      } : null);
      addBuildLog('Build started...\n');
      toast.info('Build started');
    });

    const cleanup3 = on('build:log', (data: { output: string }) => {
      addBuildLog(data.output);
    });

    const cleanup4 = on('build:success', (data: { jobId: string; duration: number; framework?: string }) => {
      setCurrentBuild(prev => prev ? {
        ...prev,
        state: 'completed',
        progress: 100,
      } : null);
      addBuildLog(`\nBuild completed successfully in ${(data.duration / 1000).toFixed(2)}s\n`);
      toast.success('Build completed successfully!');
    });

    const cleanup5 = on('build:failed', (data: { jobId: string; error: string }) => {
      setCurrentBuild(prev => prev ? {
        ...prev,
        state: 'failed',
        progress: 0,
      } : null);
      addBuildLog(`\n❌ Build failed: ${data.error}\n`);
      toast.error(`Build failed: ${data.error}`);
    });

    const cleanup6 = on('build:error', (data: { message: string }) => {
      addBuildLog(`\n❌ Error: ${data.message}\n`);
      toast.error(data.message);
    });

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      cleanup5();
      cleanup6();
    };
  }, [on, isConnected, addBuildLog]);

  return {
    startBuild,
    cancelBuild,
    currentBuild,
    buildLogs,
    isBuildPanelOpen,
    toggleBuildPanel,
    clearBuildLogs,
  };
}