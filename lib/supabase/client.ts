'use client';

import { createBrowserClient } from '@supabase/ssr';

// Single browser client instance reused across the app. Uses the anon key
// only — every table it touches is protected by the RLS policies in
// 0001_init.sql, so this client can never read/write more than the
// signed-in user is allowed to.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
