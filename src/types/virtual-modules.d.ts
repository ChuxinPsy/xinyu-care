// src/types/virtual-modules.d.ts

declare module '@/db/supabase' {
  export {};
}

declare module '@/types/types' {
  export interface Profile {
    [key: string]: unknown;
  }
}
