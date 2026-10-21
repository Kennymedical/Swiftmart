import { NextRequest, NextResponse } from 'next/server';
import { PIN_COOKIE_NAMES, dashboardCookieOptions } from '@/lib/auth/dashboard-session';

export async function POST(req: NextRequest) {
  if (req.headers.get('origin') !== req.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const response = NextResponse.json({ success: true });
  for (const name of PIN_COOKIE_NAMES) response.cookies.set(name, '', dashboardCookieOptions(0));
  return response;
}
