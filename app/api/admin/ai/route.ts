import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const aiUrl = process.env.SWIFTMART_AI_URL;
    const adminPass = process.env.SWIFTMART_ADMIN_PASSWORD;

    if (!aiUrl) {
      return NextResponse.json(
        { error: 'SWIFTMART_AI_URL is not set on the server' },
        { status: 500 }
      );
    }

    if (!adminPass) {
      return NextResponse.json(
        { error: 'SWIFTMART_ADMIN_PASSWORD is not set on the server' },
        { status: 500 }
      );
    }

    const res = await fetch(`${aiUrl}/api/swiftmart/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPass,
      },
      body: JSON.stringify({ message, history: history || [] }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
