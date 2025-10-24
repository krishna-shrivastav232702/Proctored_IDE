


interface User{
    id:string;
    email:string;
    name:string;
    role: 'PARTICIPANT' | 'ADMIN';
    teamId:string | null;
}

interface ContainerStats {
    cpu:number;
    memory:{
        usage: number;
        limit: number;
        percent: number;
    };
    network:{
        rx: number;
        tx: number;
    };
}

