export interface User {
    id:string;
    name:string;
    email:string;
    role:'PARTICIPANT' | 'ADMIIN';
    teamId: string | null;
}

