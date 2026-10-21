import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAiClient: SupabaseClient | null = null;

/** Client for the separate Supabase project that stores AI knowledge and logs. */
export function getAISupabaseClient(): SupabaseClient | null {
  const url = process.env.AI_SUPABASE_URL || process.env.SWIFTMART_AI_SUPABASE_URL;
  const key =
    process.env.AI_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.AI_SUPABASE_ANON_KEY ||
    process.env.SWIFTMART_AI_SUPABASE_KEY;

  if (!url || !key) return null;

  if (!cachedAiClient) {
    cachedAiClient = createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedAiClient;
}
