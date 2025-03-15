export interface User {
    id: number;
    email: string;
    name: string;
    address: string;
    priv: number;
    created_at: string;
  }
  
  export interface Privilege {
    id: number;
    name: string;
  }
  
  export interface Package {
    id: number;
    sid: number;
    rname: string;
    raddress: string;
    weight: number;
    method: number;
    cpw: number;
    status: number;
    created_at: string;
    User?: User;
  }
  
  export interface Status {
    id: number;
    name: string;
  }
  
  export interface MethodType {
    id: number;
    type: string;
    fee: number;
  }
  
  export interface SupabaseUser {
    id: string;
    aud?: string;
    email?: string;
   
  }