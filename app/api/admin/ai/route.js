export async function POST(req) {
  try {
    const { message, history } = await req.json();

    const res = await fetch(`${process.env.SWIFTMART_AI_URL}/api/swiftmart/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': process.env.SWIFTMART_ADMIN_PASSWORD,
      },
      body: JSON.stringify({ message, history: history || [] }),
    });

    const data = await res.json();
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
      }
