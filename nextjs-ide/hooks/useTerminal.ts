"use client";

import { useWebSocket } from "./useWebsocket";
import {Terminal} from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import "@xterm/xterm/css/xterm.css";



export const useTerminal = () => {
    const {isConnected,emit,on} = useWebSocket();
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    const initializeTerminal = useCallback((container:HTMLElement) =>{
        if(terminalRef.current){
            return terminalRef.current;
        }
        const terminal = new Terminal({
            cursorBlink: true,
            fontSize:14,
            fontFamily:'Menlo,Monaco,"Courier New",monospace',
            theme:{
                background:'#1e1e1e',
                foreground:'#d4d4d4',
                cursor: '#d4d4d4',
                selectionBackground: '#264f78',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5',
            },
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        terminal.open(container);
        fitAddon.fit();

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        terminal.onData((data)=>{
            if(sessionIdRef.current && isConnected){
                emit('terminal:input',{
                    sessionId:sessionIdRef.current,
                    input:data
                });
            }
        });

        if(isConnected){
            const sessionId = `terminal-${Date.now()}`;
            sessionIdRef.current = sessionId;
            emit('terminal:create',{sessionId});
        }

        return terminal;
    },[emit,isConnected]);

    const sendInput = useCallback((input:string) => {
        if(!sessionIdRef.current || !isConnected){
            toast.error('Terminal not connected');
            return;
        }
        emit(`terminal:input`,{
            sessionId:sessionIdRef.current,
            input
        });
    },[emit,isConnected]);

    const resize = useCallback((rows:number,cols:number) => {
        if(!sessionIdRef.current || !isConnected){
            return;
        }
        emit('terminal:resize',{
            sessionId:sessionIdRef.current,
            rows,
            cols
        });
    },[emit,isConnected]);


    const closeTerminal = useCallback(() => {
        if(sessionIdRef.current && isConnected){
            emit('terminal:close',{
                sessionId:sessionIdRef.current
            })
        }
        if(terminalRef.current){
            terminalRef.current.dispose();
            terminalRef.current = null;
        }
        fitAddonRef.current = null;
        sessionIdRef.current = null;
    },[emit,isConnected]);


    const fitTerminal = useCallback(() => {
        if(fitAddonRef.current && terminalRef.current){
            fitAddonRef.current.fit();
            const {rows,cols} = terminalRef.current;
            resize(rows,cols);
        }
    },[resize]);


    useEffect(() => {
        if(!isConnected) return;
        const cleanupReady = on('terminal:ready',(data:{sessionId:string})=>{
            if(data.sessionId === sessionIdRef.current){
                console.log('Terminal ready:',data.sessionId);
                toast.success('Terminal ready');
            }
        });

        const cleanupOutput = on('terminal:output',(data:{sessionId:string;output:string;timestamp:number}) => {
            if(data.sessionId === sessionIdRef.current && terminalRef.current){
                terminalRef.current.write(data.output);
            }
        });

        const cleanupError = on('terminal:error',(data:{message:string}) => {
            console.error('terminal error',data.message);
            if(terminalRef.current){
                terminalRef.current.write(`\x1b[31mError: ${data.message}\x1b[0m\r\n`);
            }
            toast.error(`Terminal error: ${data.message}`);
        });


        const cleanupClosed = on('terminal:closed',(data:{sessionId:string}) => {
            if(data.sessionId === sessionIdRef.current){
                console.log('Terminal closed:',data.sessionId);
                toast.info('Terminal session closed');
                closeTerminal();
            }
        })

        return() => {
            cleanupReady();
            cleanupOutput();
            cleanupClosed();
            cleanupError();
        }
    },[on,isConnected,closeTerminal]);
    

    useEffect(() => {
        return () => {
            closeTerminal();
        }
    },[closeTerminal]);

    return {
        initializeTerminal,
        sendInput,
        resize,
        closeTerminal,
        fitTerminal,
        terminal:terminalRef.current,
        isConnected
    }
    // const addTerminalOutput = useIdeStore((state) => state.addTerminalOutput);
    // useEffect(() => {
    //     if(!socket || !isConnected || !autoCreate) return;
    //     emit("terminal:create",{sessionId});
        
    //     const handleTerminalReady = (data:{sessionId:string}) => {
    //         if(data.sessionId === sessionId){
    //             console.log("Terminal ready",sessionId);
    //             toast.success("Terminal ready");
    //         }
    //     };
        
    //     const handleTerminalOutput = (data:{
    //         sessionId:string;
    //         output:string;
    //         timestamp:number
    //     }) => {
    //         if(data.sessionId === sessionId){
    //             addTerminalOutput(data.output);
    //         }
    //     };
        
    //     const handleTerminalError = (data: {message:string}) => {
    //         console.error("Terminal error:",data.message);
    //         addTerminalOutput(`\x1b[31mError: ${data.message}\x1b[0m\n`);
    //         toast.error(`Terminal error: ${data.message}`);
    //     };
        
    //     const handleTerminalClosed = (data:{sessionId:string}) => {
    //         if(data.sessionId === sessionId){
    //             console.log("Terminal closed:",sessionId);
    //             toast.info("Terminal session closed");
    //         }
    //     };
        
    //     socket.on("terminal:ready", handleTerminalReady);
    //     socket.on("terminal:output", handleTerminalOutput);
    //     socket.on("terminal:error", handleTerminalError);
    //     socket.on("terminal:closed", handleTerminalClosed);
        
    //     return () => {
    //         socket.off("terminal:ready", handleTerminalReady);
    //         socket.off("terminal:output", handleTerminalOutput);
    //         socket.off("terminal:error", handleTerminalError);
    //         socket.off("terminal:closed", handleTerminalClosed);
    //     };
    // },[socket,isConnected,sessionId,autoCreate,emit,addTerminalOutput]);

    // const sendInput = useCallback((input:string) => {
    //     emit("terminal:input",{sessionId,input});
    // },[emit,sessionId]);

    // const resize = useCallback((rows:number,cols:number) => {
    //     emit("terminal:resize",{
    //         sessionId,rows,cols
    //     });
    // },[emit,sessionId]);
    // const close = useCallback(() => {
    //     emit("terminal:close",{sessionId});
    // },[emit,sessionId]);

    // return {
    //     sendInput,
    //     resize,
    //     close
    // }
}