
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const offline = String(import.meta.env.VITE_SUPABASE_OFFLINE || "").toLowerCase() === "true";

const customFetch: typeof fetch = async (input, init) => {
  try {
    const headers = new Headers(init?.headers || {});
    if (!headers.has("apikey") && supabaseAnonKey) headers.set("apikey", supabaseAnonKey);
    if (!headers.has("Authorization") && supabaseAnonKey) headers.set("Authorization", `Bearer ${supabaseAnonKey}`);
    return await fetch(input, { ...init, headers });
  } catch {
    return new Response(JSON.stringify({ error: "network_error" }), {
      status: 520,
      statusText: "Network Error",
      headers: { "Content-Type": "application/json" },
    });
  }
};

function createOfflineClient() {
  let currentUser: { id: string; email: string } | null = null;
  const listeners = new Set<(event: string, session: { user: typeof currentUser } | null) => void>();
  const notify = (session: { user: typeof currentUser } | null) => {
    listeners.forEach(fn => fn("TOKEN_REFRESHED", session));
  };

  class OfflineQuery {
    private _data: any[] = [];
    constructor(private _table: string) {}
    select(_cols?: string) { return this; }
    eq(_col: string, _val: any) { return this; }
    order(_col: string, _opts?: { ascending?: boolean }) { return this; }
    limit(_n: number) { return this; }
    maybeSingle() { return Promise.resolve({ data: null, error: null }); }
    then<TResult1 = any, TResult2 = never>(
      onfulfilled?: ((value: { data: any[]; error: null }) => TResult1) | undefined | null,
      onrejected?: ((reason: any) => TResult2) | undefined | null
    ) {
      return Promise.resolve({ data: this._data, error: null }).then(onfulfilled, onrejected);
    }
    catch<TResult = never>(onrejected?: ((reason: any) => TResult) | undefined | null) {
      return Promise.resolve({ data: this._data, error: null }).catch(onrejected);
    }
    finally(onfinally?: (() => void) | undefined | null) {
      return Promise.resolve({ data: this._data, error: null }).finally(onfinally);
    }
  }

  const storage = {
    from: (_bucket: string) => ({
      upload: async (_path: string, _file: File | Blob, _opts?: any) => ({ data: { path: _path }, error: null }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `${location.origin}/storage/${path}` }, error: null }),
    }),
  };

  const functions = {
    invoke: async (_name: string, _opts?: any) => ({ data: { text: '' }, error: null }),
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: currentUser ? { user: currentUser } : null } }),
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        currentUser = { id: "offline-user-id", email };
        notify(currentUser ? { user: currentUser } : null);
        return { data: { user: currentUser }, error: null };
      },
      signUp: async ({ email }: { email: string; password: string }) => {
        currentUser = { id: "offline-user-id", email };
        notify(currentUser ? { user: currentUser } : null);
        return { data: { user: currentUser }, error: null };
      },
      signOut: async () => {
        currentUser = null;
        notify(null);
      },
      onAuthStateChange: (cb: (event: string, session: { user: typeof currentUser } | null) => void) => {
        listeners.add(cb);
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
      },
    },
    from: (table: string) => ({
      select: (_cols?: string) => new OfflineQuery(table),
      insert: (_row: any) => ({
        select: () => ({
          maybeSingle: async () => ({ data: _row, error: null }),
        }),
      }),
      update: (_updates: any) => ({
        eq: (_col: string, _val: any) => ({
          select: () => ({
            maybeSingle: async () => ({ data: _updates, error: null }),
          }),
        }),
      }),
      delete: () => ({
        eq: (_col: string, _val: any) => Promise.resolve({ error: null }),
      }),
    }),
    rpc: async (_fn: string, _args: any) => ({ data: null, error: null }),
    storage,
    functions,
  } as any;
}

export const supabase = offline
  ? createOfflineClient()
  : createClient(supabaseUrl, supabaseAnonKey, { global: { fetch: customFetch } });
            
