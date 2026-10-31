// Removes expired NON-product story files from storage, then their database rows.
// What counts as eligible is decided by the database function stories_purge_candidates
// (no product link, exact file path saved, path inside the vendor's own folder,
// expired more than 5 minutes ago). Product stories are never selected.
//
// Protected by CRON_SECRET (Vercel Cron sends it automatically as a Bearer token).
// Safe test: GET /api/cron/purge-stories?dry=1 -> lists what it WOULD delete, deletes nothing.
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'story-media';

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get('dry') === '1';
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const { data: rows, error } = await db.rpc('stories_purge_candidates', { max_rows: 100 });
    if (error) throw error;
    if (!rows || rows.length === 0) return NextResponse.json({ purged: 0 });

    if (dryRun) {
      return NextResponse.json({ dryRun: true, wouldPurge: rows.map((r: any) => r.storage_path) });
    }

    // 1. Delete the files first.
    const { data: removed, error: rmErr } = await db.storage
      .from(BUCKET)
      .remove(rows.map((r: any) => r.storage_path));
    if (rmErr) throw rmErr;

    // 2. Delete only the rows whose file was confirmed removed.
    const removedNames = new Set((removed ?? []).map((f: any) => f.name));
    const doneIds = rows.filter((r: any) => removedNames.has(r.storage_path)).map((r: any) => r.id);

    if (doneIds.length) {
      const { error: delErr } = await db.from('stories').delete().in('id', doneIds);
      if (delErr) throw delErr;
    }

    return NextResponse.json({ purged: doneIds.length, skipped: rows.length - doneIds.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
