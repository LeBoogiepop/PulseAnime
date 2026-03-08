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

export interface LibraryScene {
  id: string;
  title: string;
  author: string;
  description: string;
  image_url: string;
  tags: string[];
  complexity: string;
  reactivity: string;
  download_count: number;
  sketch_id: string;
  created_at?: string;
}

export async function fetchLibraryScenes(): Promise<LibraryScene[]> {
  const client = getSupabase();
  if (!client) return [];

  const { data, error } = await client
    .from('library_scenes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Library]', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    description: r.description,
    image_url: r.image_url || '',
    tags: r.tags || [],
    complexity: r.complexity || 'Medium',
    reactivity: r.reactivity || 'Full Spectrum',
    download_count: r.download_count ?? 0,
    sketch_id: r.sketch_id || r.id,
    created_at: r.created_at,
  }));
}

export async function incrementDownloadCount(sceneId: string) {
  const client = getSupabase();
  if (!client) return;

  const { data } = await client.from('library_scenes').select('download_count').eq('id', sceneId).single();
  const count = (data?.download_count ?? 0) + 1;
  await client.from('library_scenes').update({ download_count: count }).eq('id', sceneId);
}

/** Ordre des sketches sur la page principale (depuis Supabase) */
export async function fetchAppSketchOrder(): Promise<string[] | null> {
  const client = getSupabase();
  if (!client) return null;

  const { data, error } = await client
    .from('app_sketches')
    .select('sketch_id')
    .order('sort_order', { ascending: true });

  if (error || !data?.length) return null;
  return data.map((r: any) => r.sketch_id);
}
