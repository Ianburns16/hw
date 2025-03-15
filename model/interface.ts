export interface User {
    id: number;
    name: string;
    address?: string;
    priv?: number;
    email: string;
  }
  
  export interface Privilege {
    id: number;
    name: string;
  }
  
  export interface Package {
    id: number;
    created_at: string; // ISO timestamp
    sid?: number;
    rname: string;
    raddress: string;
    weight: number;
    method?: number;
    cpw?: number;
    status?: number;
  }
  
  export interface Status {
    id: number;
    name: string;
  }
  
  export interface MethodType {
    id: number;
    fee: number;
    type: string;
  }
  
  export interface SupabaseUser {
    id: string;
    aud?: string;
    email?: string;
   
  }