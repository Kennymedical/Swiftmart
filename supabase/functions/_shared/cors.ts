// supabase/functions/_shared/cors.ts
const ALLOWED_ORIGINS = [
  'https://swiftmart-eta.vercel.app',
  'https://swiftmart-hlbe.vercel.app',
  'http://localhost:3000',
];

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}
