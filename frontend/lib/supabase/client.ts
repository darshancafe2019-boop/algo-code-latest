import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-ref") &&
    !supabaseAnonKey.includes("your-anon-key")
  );
};

const globalForSupabase = globalThis as unknown as { _quantosSupabaseClient?: SupabaseClient };

export const getSupabase = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!globalForSupabase._quantosSupabaseClient) {
    globalForSupabase._quantosSupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "quantos_sb_auth_token",
      },
    });
  }
  return globalForSupabase._quantosSupabaseClient;
};

// Singleton instance reuses the exact same GoTrueClient to avoid multiple instances in browser
export const supabase: SupabaseClient | null = getSupabase();
