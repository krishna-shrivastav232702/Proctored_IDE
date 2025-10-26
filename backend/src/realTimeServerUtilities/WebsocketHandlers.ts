import { Socket } from "socket.io";
import { JWTPayload } from "../lib/jwt";
import { addConnection, handleYjsSync, persistYjsSnapshot, setupYjsRoom, handleAwarenessSync, handleAwarenessDisconnect, getYjsDocument, removeConnection } from "./yjs";
import { prisma } from "../lib/prismaClient";
import { closeTerminalSession, createTerminalSession, resizeTerminal, sendCommand } from "../lib/terminal";
import { logProctoringEvent } from "./proctoring";
import { executeCommand } from "../lib/docker";
import { submitTeamBuild } from "./submission";
import { addBuildJob, getQueuePosition } from "./buildQueue";
import * as Y from "yjs";

interface AuthSocket extends Socket {
    user?: JWTPayload;
}

export const setupWebSocketHandlers = (socket: AuthSocket): void => {
    const user = socket.user!;
    if (user.role === "ADMIN") {
        socket.join("admin-room");
        console.log(`Admin ${user.email} joined the admin-room`);
    }
    if (user.teamId) { // join team room if exists
        socket.join(`team-${user.teamId}`);
        setupYjsRoom(user.teamId);
        addConnection(user.teamId, socket.id);
        console.log(`User ${user.email} joined team-${user.teamId}`);
    }
    socket.on("editor:sync", (data) => {
        if (!user.teamId) return;
        const update = new Uint8Array(data.update);
        handleYjsSync(user.teamId, user.userId, update);
    });

    socket.on("awareness:update", (data) => {
        if (!user.teamId) return;
        const update = new Uint8Array(data.update);
        handleAwarenessSync(user.teamId, user.userId, update);
    });

    socket.on("awareness:sync", async (data: { awarenessUpdate: number[] }) => {
        if (!user.teamId) return;
        try {
            const awarenessUpdate = new Uint8Array(data.awarenessUpdate);
            handleAwarenessSync(user.teamId, user.userId, awarenessUpdate);
        } catch (error) {
            console.error("Error syncing awareness:", error);
        }
    });

    socket.on("editor:request-state", () => {
        if (!user.teamId) return;

        const doc = getYjsDocument(user.teamId);
        if (doc) {
            const state = Y.encodeStateAsUpdate(doc);
            socket.emit("editor:state", { update: Array.from(state) });
        }
    });

    // terminal

    socket.on("terminal:create", async (data: { sessionId: string }) => {
        if (!user.teamId) return;
        try {
            const containerInfo = await prisma.containerInfo.findUnique({
                where: {
                    teamId: user.teamId
                }
            });
            if (!containerInfo) {
                socket.emit("terminal:error", {
                    message: "container not found. please start a session first",
                })
                return;
            }
            await createTerminalSession(data.sessionId, containerInfo.containerId, user.teamId);
            socket.emit("terminal:ready", { sessionId: data.sessionId });
        } catch (error: any) {
            console.error("Error creating terminal:", error);
            socket.emit("terminal:error", { message: error.message });
        }
    })

    socket.on("terminal:input", (data: {
        sessionId: string;
        input: string
    }) => {
        try {
            const success = sendCommand(data.sessionId, data.input);
            if (!success) {
                socket.emit("terminal:error", {
                    sessionId: data.sessionId,
                    message: "Terminal session not found"
                });
            }
        } catch (error) {
            console.error("Error sending terminal input:", error);
        }
    });

    socket.on("terminal:resize", (data: { sessionId: string; rows: number; cols: number }) => {
        try {
            resizeTerminal(data.sessionId, data.rows, data.cols);
        } catch (error) {
            console.error("Error resizing terminal:", error);
        }
    });

    socket.on("terminal:close", (data: { sessionId: string }) => {
        try {
            closeTerminalSession(data.sessionId);
        } catch (error) {
            console.error("error closing terminal:", error);
        }
    });



    // File operations



    socket.on("file:save", async (data: { path: string; content: string }) => {
        if (!user.teamId) return;
        try {
            const containerInfo = await prisma.containerInfo.findUnique({
                where: {
                    teamId: user.teamId
                }
            });
            if (!containerInfo) {
                socket.emit("file:error", {
                    message: "Container not found . Start a session first"
                });
                return;
            }
            //base64 safer than shell escaping
            const base64Content = Buffer.from(data.content).toString('base64');
            await executeCommand(
                containerInfo.containerId,
                `mkdir -p "/workspace/$(dirname "${data.path}")" && echo '${base64Content}' | base64 -d > "/workspace/${data.path}"`
            )
            await prisma.file.upsert({
                where: {
                    teamId_path: {
                        teamId: user.teamId,
                        path: data.path,
                    },
                },
                update: {
                    content: "",
                    version: { increment: 1 },
                },
                create: {
                    teamId: user.teamId,
                    path: data.path,
                    content: "",
                }
            });
            socket.emit("file:saved", { path: data.path });
            socket.to(`team-${user.teamId}`).emit("file:changed", {
                path: data.path,
                action: "modify",
                userId: user.userId,
            });
        } catch (error) {
            console.error("error saving file:", error);
            socket.emit("file:error", {
                message: "failed to save file"
            });
        }
    });



    socket.on("file:create", async (data: {
        path: string;
        content?: string
    }) => {
        if (!user.teamId) return;
        try {
            const containerInfo = await prisma.containerInfo.findUnique({
                where: {
                    teamId: user.teamId
                }
            });
            if (!containerInfo) {
                socket.emit("file:error", {
                    message: "Container not found. Start a session first"
                });
                return;
            }

            const base64Content = Buffer.from(data.content || "").toString('base64');
            await executeCommand(
                containerInfo.containerId,
                `mkdir -p "/workspace/$(dirname "${data.path}")" && echo '${base64Content}' | base64 -d > "/workspace/${data.path}"`
            )
            await prisma.file.create({
                data: {
                    teamId: user.teamId,
                    path: data.path,
                    content: "",
                }
            });
            socket.emit("file:created", { path: data.path });
            socket.to(`team-${user.teamId}`).emit("file:changed", {
                path: data.path,
                action: "add",
                userId: user.userId,
            });
        } catch (error) {
            console.error("Error creating file", error);
            socket.emit("file:error", {
                message: "failed to create file"
            });
        }
    });


    socket.on("file:delete", async (data: { path: string }) => {
        if (!user.teamId) return;
        try {
            const containerInfo = await prisma.containerInfo.findUnique({
                where: { teamId: user.teamId }
            });

            if (containerInfo) {
                // Delete from container
                await executeCommand(
                    containerInfo.containerId,
                    `rm -f "/workspace/${data.path}"`
                );
            }
            await prisma.file.delete({
                where: {
                    teamId_path: {
                        teamId: user.teamId,
                        path: data.path
                    }
                }
            }).catch(() => {

            });
            socket.emit("file:deleted", { path: data.path });
            socket.to(`team-${user.teamId}`).emit("file:changed", {
                path: data.path,
                action: "delete",
                userId: user.userId,
            });
        } catch (error) {
            console.error("Error deleting file:", error);
            socket.emit("file:error", {
                message: "failed to delete file"
            })
        }
    });


    socket.on("build:start", async (data: { buildCommand?: string }) => {
        if (!user.teamId) return;
        try {
            const containerInfo = await prisma.containerInfo.findUnique({
                where: { teamId: user.teamId }
            });

            if (!containerInfo) {
                socket.emit("build:error", { message: "Container not found" });
                return;
            }

            // Add to build queue
            const job = await addBuildJob({
                teamId: user.teamId,
                containerId: containerInfo.containerId,
                buildCommand: data.buildCommand || "npm run build"
            });

            socket.emit("build:queued", {
                jobId: job.id,
                position: await getQueuePosition(job.id)
            });
        } catch (error) {
            console.error("Error starting build:", error);
            socket.emit("build:error", { message: "Failed to start build" });
        }
    });

    socket.on("submission:create", async () => {
        if (!user.teamId) return;
        try {
            const result = await submitTeamBuild(user.teamId);

            socket.emit("submission:success", {
                submissionId: result.submissionId,
                cdnUrl: result.cdnUrl,
                deploymentUrl: result.deploymentUrl
            });
        } catch (error: any) {
            console.error("Error creating submission:", error);
            socket.emit("submission:error", {
                message: error.message || "Failed to create submission"
            });
        }
    });



    // Proctoring


    socket.on("procter:event", async (data: {
        eventType: string;
        details?: any
    }) => {
        if (!user.teamId) return;
        try {
            await logProctoringEvent(user.teamId, user.userId, data.eventType, data.details);
        } catch (error) {
            console.error("Error logging proctor event:", error);
        }
    })

    // Note: Manual cursor tracking removed - now handled by Yjs Awareness protocol
    // Cursor positions are synced via awareness:sync events

    socket.on("disconnect", async () => {
        console.log(`User ${user.email} disconnected`);
        if (user.teamId) {
            handleAwarenessDisconnect(user.teamId, user.userId);
            removeConnection(user.teamId, socket.id);
            await persistYjsSnapshot(user.teamId);
            socket.to(`team-${user.teamId}`).emit("member:left", {
                userId: user.userId,
                email: user.email,
            })
        }
    });


}