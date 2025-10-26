"use client";

import { useEffect, useRef, useCallback } from "react";
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from "y-protocols/awareness";
import { debounce } from "lodash-es";
import { useWebSocket } from "./useWebsocket";
import { useIdeStore } from "@/store/store";
import { Collaborator } from "@/types";

export function useCollaborativeEditor(documentName: string) {
  const { emit, on, isConnected } = useWebSocket();
  const { setCollaborators, user } = useIdeStore();

  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);

  useEffect(() => {
    if (!isConnected || !user) return;

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText(documentName);
    const awareness = new Awareness(ydoc);

    ydocRef.current = ydoc;
    ytextRef.current = ytext;
    awarenessRef.current = awareness;

    // Set local user info in awareness
    awareness.setLocalStateField("user", {
      id: user.id,
      email: user.email,
      name: user.name,
      color: generateUserColor(user.id),
    });

    // Request initial document state
    emit("editor:request-state");

    // Debounced emitter for awareness updates to reduce message flood
    const emitAwarenessUpdate = debounce((update: Uint8Array) => {
      if (isConnected) {
        emit("awareness:sync", { awarenessUpdate: Array.from(update) });
      }
    }, 50);

    // Listen for local Yjs document updates to send to server
    const handleDocUpdate = (update: Uint8Array, origin: any) => {
      if (origin !== "remote" && isConnected) {
        emit("editor:sync", { update: Array.from(update) });
      }
    };
    ydoc.on("update", handleDocUpdate);

    // Listen for local awareness updates to send to server
    const handleAwarenessChange = ({ added, updated, removed }: any) => {
      const changedClients = added.concat(updated).concat(removed);
      const update = encodeAwarenessUpdate(awareness, changedClients);
      emitAwarenessUpdate(update);
    };
    awareness.on("change", handleAwarenessChange);

    // Receive and apply remote Yjs document updates
    const cleanupDocSync = on("yjs:sync", (data: { update: number[]; userId: string }) => {
      const update = new Uint8Array(data.update);
      Y.applyUpdate(ydoc, update, "remote");
    });

    // Receive and apply initial document state
    const cleanupDocState = on("editor:state", (data: { update: number[] }) => {
      const update = new Uint8Array(data.update);
      Y.applyUpdate(ydoc, update, "remote");
    });

    // Receive and apply awareness updates from server
    const cleanupAwareness = on("awareness:update", (data: { update: number[]; userId: string }) => {
      const update = new Uint8Array(data.update);
      applyAwarenessUpdate(awareness, update, "remote");
    });

    // Listen for awareness state changes and update the store of collaborators
    const awarenessChangeHandler = () => {
      const states = Array.from(awareness.getStates().entries());
      const collaborators: Collaborator[] = states
        .filter(([clientId]) => clientId !== awareness.clientID) // Exclude self
        .map(([clientId, state]) => {
          const stateUser = state.user || {};
          return {
            id: clientId.toString(),
            name: stateUser.name || "Anonymous",
            email: stateUser.email || "",
            cursor: state.cursor,
            color: stateUser.color || generateUserColor(clientId.toString()),
          };
        });
      setCollaborators(collaborators);
    };
    awareness.on("change", awarenessChangeHandler);

    // Initial collaborators update
    awarenessChangeHandler();

    return () => {
      cleanupDocSync();
      cleanupDocState();
      cleanupAwareness();
      ydoc.off("update", handleDocUpdate);
      awareness.off("change", handleAwarenessChange);
      awareness.off("change", awarenessChangeHandler);
      awareness.destroy();
      ydoc.destroy();
    };
  }, [documentName, emit, on, isConnected, setCollaborators, user]);

  // Local method to update cursor position
  const shareCursor = useCallback(
    (file: string, line: number, column: number) => {
      const awareness = awarenessRef.current;
      if (!isConnected || !awareness) return;

      awareness.setLocalStateField("cursor", { file, line, column });
    },
    [isConnected]
  );

  return {
    ydoc: ydocRef.current,
    ytext: ytextRef.current,
    awareness: awarenessRef.current,
    shareCursor,
  };
}

// Generate consistent color for user based on ID
function generateUserColor(userId: string): string {
  const colors = [
    "#ff6b6b",
    "#4ecdc4",
    "#45b7d1",
    "#ffa07a",
    "#98d8c8",
    "#f7dc6f",
    "#bb8fce",
    "#f1948a",
    "#85c1e2",
    "#f4d03f",
    "#52be80",
    "#eb984e",
  ];
  const hash = userId.split("").reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  return colors[Math.abs(hash) % colors.length];
}