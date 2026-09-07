import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Edge Functions run with the service role key — this is the ONLY place in
// the whole app that's allowed to write to `wallets` and `transactions`
// directly. RLS blocks the client from doing this itself (see migration
// 0001_init.sql), which is what makes "the API is the only path to moving
// money" actually true rather than just a comment.
export function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
