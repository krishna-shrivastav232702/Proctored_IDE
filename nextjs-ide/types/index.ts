export interface User {
  id:string;
  name:string;
  email:string;
  role:'PARTICIPANT' | 'ADMIN';
  teamId: string | null;
}

export interface Collaborator {
  id: string;
  user?: User;
  cursor?: {
      line: number;
      column: number;
      file: string;
  };
  color: string;
  email: string;
  name?: string;
}