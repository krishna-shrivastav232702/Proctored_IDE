"use client";

import { useEffect } from "react";

interface AntiCheatProviderProps {
  children: React.ReactNode;
  participantId?: string;
}

export default function AntiCheatProvider({
  children,
  participantId,
}: AntiCheatProviderProps) {
  useEffect(() => {
    // Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logEvent("right_click_blocked");
    };

    // Block copy/paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent("copy_blocked");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent("paste_blocked");
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      logEvent("cut_blocked");
    };

    // Block devtools shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey &&
          e.shiftKey &&
          (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
        logEvent("devtools_shortcut_blocked", { key: e.key });
      }

      // Ctrl+C, Ctrl+V, Ctrl+X
      if (e.ctrlKey && (e.key === "c" || e.key === "v" || e.key === "x")) {
        e.preventDefault();
        logEvent(`${e.key}_blocked`);
      }
    };

    // Detect tab switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent("tab_switched_away");
      } else {
        logEvent("tab_switched_back");
      }
    };

    // Log events to backend
    const logEvent = async (event: string, metadata?: any) => {
      try {
        await fetch("/api/log", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            participantId,
            event,
            timestamp: new Date().toISOString(),
            metadata,
          }),
        });
      } catch (error) {
        console.error("Failed to log event:", error);
      }
    };

    // Add event listeners
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Additional protection: disable text selection
    document.body.style.userSelect = "none";

    // Disable image drag
    document.addEventListener("dragstart", (e) => e.preventDefault());

    return () => {
      // Cleanup
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.body.style.userSelect = "";
    };
  }, [participantId]);

  return <>{children}</>;
}
