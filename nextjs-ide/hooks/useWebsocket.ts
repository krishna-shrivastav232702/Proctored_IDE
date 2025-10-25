"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {io, Socket} from "socket.io-client";
import { toast } from "sonner";



const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';

interface UseWebSocketReturn {
    socket: Socket | null;
    isConnected: boolean;
    connectionError: string | null;
    emit: (event:string, data?: any) => void;
    on: (event:string,handler:(...args:any[]) => void) => () => void;
    off: (event: string,handler?: (...args:any[]) => void) => void;
}

export const useWebSocket = ():UseWebSocketReturn => {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected,setIsConnected] = useState(false);
    const [connectionError,setConnectionError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("auth_token");
        if(!token){
            console.warn("No auth token found , websocket connection not initialized");
            setConnectionError("No authentication token found");
            toast.error("Please log in to connect");
            return;
        }
        const socket = io(WS_URL,{
            auth:{token},
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            transports:["websocket"] // use polling in dev for fallback
        })
        socketRef.current = socket;
        
        socket.on("connect",() => {
            console.log("Websocket connected");
            setIsConnected(true);
            setConnectionError(null);
            toast.success("Connected to server")
        })
        
        socket.on("disconnect",(reason) => {
            console.log("Websocket disconnected:",reason);
            setIsConnected(false);
            if(reason === "io server disconnect"){
                toast.error("Disconnected by server");
            }else{
                toast.warning("Connection lost");
            }
        })

        socket.on("reconnect",(attemptNumber) => {
            console.log(`Reconnected after ${attemptNumber} attempts`);
            toast.success("Reconnected to server");
        })

        socket.on("reconnect_error",(error) => {
            console.error("Reconnection error:",error);
            setConnectionError(error.message);
        })

        socket.on("connect_error",(error) => {
            console.error("websocket conection error",error);
            setConnectionError(error.message);
            toast.error(`Connection error: ${error.message}`);
        })
        
        socket.on("reconnect_failed",() => {
            console.error("✗ Reconnection failed");
            setConnectionError("Failed to reconnect to server");
            toast.error("Failed to reconnect. Please refresh the page.");
        })

        return () => {
            console.log("Cleaning up websocket connection");
            socket.disconnect();
            socket.removeAllListeners();
        }
    },[]);

    const emit = useCallback((event:string,data?:any) => {
        if(socketRef.current && isConnected){
            socketRef.current.emit(event,data);
        }else{
            console.warn(`Cannot emit ${event}: Socket not connected`);
            toast.error("Not connected to server");
        }
    },[isConnected]);


    const on = useCallback((event:string,handler: (...args:any[]) => void) => {
        if(socketRef.current){
            socketRef.current.on(event,handler);
            return () => socketRef.current?.off(event,handler);
        }
        return () => {};
    },[]);

    const off = useCallback((event:string,handler?:(...args:any[]) => void) => {
        if(socketRef.current){
            socketRef.current.off(event,handler);
        }
    },[]);

    return {
        socket: socketRef.current,
        isConnected,
        connectionError,
        emit,
        on,
        off
    }
}