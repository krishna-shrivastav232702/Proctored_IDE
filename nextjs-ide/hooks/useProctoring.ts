"use client";

import { useEffect, useCallback } from 'react';
import { useWebSocket } from './useWebsocket';
import { toast } from 'sonner';

export type ProctoringEventType = 
  | 'TAB_SWITCH' 
  | 'DEVTOOLS_OPEN' 
  | 'CLIPBOARD_COPY' 
  | 'CLIPBOARD_PASTE' 
  | 'FULLSCREEN_EXIT' 
  | 'FOCUS_LOSS' 
  | 'SUSPICIOUS_ACTIVITY';

export function useProctoring(enabled = true) {
  const { emit, isConnected } = useWebSocket();

  const logEvent = useCallback((eventType: ProctoringEventType, details?: any) => {
    if (!isConnected || !enabled) return;

    emit('procter:event', {
      eventType,
      details: details ? JSON.stringify(details) : undefined,
    });

    console.log(`[Proctoring] ${eventType}`, details);
  }, [emit, isConnected, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Track tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('TAB_SWITCH', { hidden: true, timestamp: Date.now() });
      }
    };

    // Track window focus
    const handleBlur = () => {
      logEvent('FOCUS_LOSS', { timestamp: Date.now() });
    };

    // Track fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logEvent('FULLSCREEN_EXIT', { timestamp: Date.now() });
      }
    };

    // Track clipboard events
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection()?.toString();
      if (selection && selection.length > 0) {
        logEvent('CLIPBOARD_COPY', { 
          length: selection.length,
          preview: selection.substring(0, 50) 
        });
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      const pasteData = e.clipboardData?.getData('text');
      if (pasteData && pasteData.length > 0) {
        logEvent('CLIPBOARD_PASTE', { 
          length: pasteData.length,
          preview: pasteData.substring(0, 50) 
        });
      }
    };

    // Detect DevTools opening (basic detection)
    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        logEvent('DEVTOOLS_OPEN', { 
          widthDiff: window.outerWidth - window.innerWidth,
          heightDiff: window.outerHeight - window.innerHeight 
        });
      }
    };

    // Track suspicious activity (rapid keyboard shortcuts)
    let shortcutCount = 0;
    let shortcutTimer: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common developer shortcuts
      const isDeveloperShortcut = 
        (e.ctrlKey || e.metaKey) && (
          e.key === 'i' || // Inspect element
          e.key === 'j' || // Console
          e.key === 'u' || // View source
          (e.shiftKey && (e.key === 'i' || e.key === 'j' || e.key === 'c'))
        );

      if (isDeveloperShortcut) {
        shortcutCount++;
        
        clearTimeout(shortcutTimer);
        shortcutTimer = setTimeout(() => {
          if (shortcutCount > 3) {
            logEvent('SUSPICIOUS_ACTIVITY', { 
              type: 'rapid_shortcuts',
              count: shortcutCount 
            });
          }
          shortcutCount = 0;
        }, 5000);
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);

    // Check for DevTools periodically
    const devToolsInterval = setInterval(detectDevTools, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(devToolsInterval);
      clearTimeout(shortcutTimer);
    };
  }, [enabled, logEvent]);

  return {
    logEvent,
  };
}

function getSeverity(eventType: ProctoringEventType): 'low' | 'medium' | 'high' {
  switch (eventType) {
    case 'DEVTOOLS_OPEN':
    case 'SUSPICIOUS_ACTIVITY':
      return 'high';
    case 'TAB_SWITCH':
    case 'CLIPBOARD_PASTE':
      return 'medium';
    case 'CLIPBOARD_COPY':
    case 'FULLSCREEN_EXIT':
    case 'FOCUS_LOSS':
      return 'low';
    default:
      return 'low';
  }
}

function getDescription(eventType: ProctoringEventType): string {
  switch (eventType) {
    case 'TAB_SWITCH':
      return 'User switched to another tab or window';
    case 'DEVTOOLS_OPEN':
      return 'Browser DevTools detected as open';
    case 'CLIPBOARD_COPY':
      return 'Content copied to clipboard';
    case 'CLIPBOARD_PASTE':
      return 'Content pasted from clipboard';
    case 'FULLSCREEN_EXIT':
      return 'User exited fullscreen mode';
    case 'FOCUS_LOSS':
      return 'Window lost focus';
    case 'SUSPICIOUS_ACTIVITY':
      return 'Suspicious activity detected';
    default:
      return 'Unknown event';
  }
}