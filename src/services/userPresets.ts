import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabase;
}

export interface UserPreset {
  id: string;
  sketch_id: string;
  name: string;
  data: Record<string, unknown>;
  created_at?: string;
}

/** Liste des presets d'un sketch pour l'utilisateur connecté */
export async function fetchUserPresets(sketchId: string): Promise<UserPreset[]> {
  const client = getSupabase();
  if (!client) return [];

  const { data: { user } } = await client.auth.getUser();
  if (!user) return [];

  const { data, error } = await client
    .from('user_presets')
    .select('id, sketch_id, name, data, created_at')
    .eq('user_id', user.id)
    .eq('sketch_id', sketchId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[UserPresets]', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    sketch_id: r.sketch_id,
    name: r.name,
    data: r.data || {},
    created_at: r.created_at,
  }));
}

/** Sauvegarde un preset (insert ou update si même nom) */
export async function saveUserPreset(
  sketchId: string,
  name: string,
  data: Record<string, unknown>
): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (!client) return { error: new Error('Supabase non configuré') };

  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: new Error('Utilisateur non connecté') };

  const { error } = await client
    .from('user_presets')
    .upsert(
      { user_id: user.id, sketch_id: sketchId, name: name.trim(), data },
      { onConflict: 'user_id,sketch_id,name', ignoreDuplicates: false }
    );

  if (error) {
    console.error('[UserPresets]', error);
    return { error };
  }
  return { error: null };
}

/** Supprime un preset */
export async function deleteUserPreset(presetId: string): Promise<{ error: Error | null }> {
  const client = getSupabase();
  if (!client) return { error: new Error('Supabase non configuré') };

  const { error } = await client
    .from('user_presets')
    .delete()
    .eq('id', presetId);

  if (error) {
    console.error('[UserPresets]', error);
    return { error };
  }
  return { error: null };
}
