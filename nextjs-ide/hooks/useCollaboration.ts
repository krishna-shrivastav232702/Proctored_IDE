// "use client";

// import { useIdeStore } from "@/store/store";
// import { useWebSocket } from "./useWebsocket";
// import { useCallback, useEffect } from "react";
// import { toast } from "sonner";




// export const useCollaboration = () => {
//     const {socket,emit} = useWebSocket();
//     const {addMember,removeMember,updateMemberCursor} = useIdeStore();

//     useEffect(() => {
//         if(!socket) return;
//         const handleCurrentPosition = (data:{file:string;line:number;column:number;userId:string;email:string;}) => {
//             console.log(`Cursor moved from ${data.email} at ${data.file}:${data.line}:${data.column}`);
//             updateMemberCursor(data.userId,{
//                 file:data.file,
//                 line:data.line,
//                 column:data.column,
//             });
//         }

//         const handleMemberJoin = (data:{userId:string; email:string}) => {
//             console.log("Member:Joined:",data.email);
//             addMember(data.userId,data.email);
//             toast.success(`${data.email} joined the session`);
//         }
        
//         const handleMemberLeft = (data:{userId:string; email:string}) => {
//             console.log("Member left",data.email);
//             removeMember(data.userId);
//             toast.info(`${data.email} left the session`);
//         }

//         socket.on("current.position",handleCurrentPosition);
//         socket.on("member:joined",handleMemberJoin);
//         socket.on("member:left",handleMemberLeft);

//         return () => {
//             socket.off("current.position",handleCurrentPosition);
//             socket.off("member:joined",handleMemberJoin);
//             socket.off("member:left",handleMemberLeft);
//         }
//     },[socket,addMember,removeMember,updateMemberCursor]);

//     const sendCursorPosition = useCallback((file:string,line:number,column:number) => {
//         if(!socket?.connected){
//             console.warn("Cannot send cursor position: Socket not connected");
//             return;
//         }
//         emit("cursor:move",{file,line,column});
//     },[emit,socket]);

//     return {
//         sendCursorPosition,
//         isConnected: socket?.connected || false,
//     };

// }
"use client";

import { useIdeStore } from "@/store/store";
import { useWebSocket } from "./useWebsocket";
import { useEffect } from "react";
import { toast } from "sonner";

/**
 * useCollaboration - Now handles member presence only
 * Note: Cursor tracking and collaboration features are now handled by Yjs Awareness
 * via the useCollaborativeEditor hook
 */
export const useCollaboration = () => {
    const {socket} = useWebSocket();
    const {addMember, removeMember} = useIdeStore();

    useEffect(() => {
        if(!socket) return;

        const handleMemberJoin = (data:{userId:string; email:string}) => {
            console.log("Member:Joined:",data.email);
            addMember(data.userId,data.email);
            toast.success(`${data.email} joined the session`);
        }
        
        const handleMemberLeft = (data:{userId:string; email:string}) => {
            console.log("Member left",data.email);
            removeMember(data.userId);
            toast.info(`${data.email} left the session`);
        }

        socket.on("member:joined",handleMemberJoin);
        socket.on("member:left",handleMemberLeft);

        return () => {
            socket.off("member:joined",handleMemberJoin);
            socket.off("member:left",handleMemberLeft);
        }
    },[socket,addMember,removeMember]);

    return {
        isConnected: socket?.connected || false,
    };
}