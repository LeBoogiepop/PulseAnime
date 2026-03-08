import { createClient, type User, type Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Auth] Supabase non configuré. Crée un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
    return null;
  }
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}

export type AuthState = {
  user: User | null;
  session: Session | null;
};

type AuthListener = (state: AuthState) => void;

const listeners: AuthListener[] = [];

function notifyListeners(state: AuthState) {
  listeners.forEach((fn) => fn(state));
}

export function onAuthStateChange(callback: AuthListener) {
  listeners.push(callback);
  const client = getSupabase();
  if (client) {
    client.auth.getSession().then(({ data: { session } }) => {
      callback({ user: session?.user ?? null, session });
    });
  } else {
    callback({ user: null, session: null });
  }
  return () => {
    const i = listeners.indexOf(callback);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export async function initAuth() {
  const client = getSupabase();
  if (!client) return;

  client.auth.onAuthStateChange((_event, session) => {
    notifyListeners({ user: session?.user ?? null, session });
  });

  const { data: { session } } = await client.auth.getSession();
  notifyListeners({ user: session?.user ?? null, session });
}

export async function signUp(email: string, password: string) {
  const client = getSupabase();
  if (!client) {
    return { error: new Error('Supabase non configuré') };
  }
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    },
  });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const client = getSupabase();
  if (!client) {
    return { error: new Error('Supabase non configuré') };
  }
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const client = getSupabase();
  if (!client) return { error: new Error('Supabase non configuré') };
  return client.auth.signOut();
}

export function isConfigured() {
  return !!(supabaseUrl && supabaseAnonKey);
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabase();
  if (!client) return null;
  const { data: { user } } = await client.auth.getUser();
  return user;
}
