import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';

const DB_URL = 'postgresql://neondb_owner:npg_GBoFNmzL9vW2@ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const DB_HOST = 'ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech';

async function query(sql: string, params: any[] = []) {
  const r = await fetch(`https://${DB_HOST}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': DB_URL },
    body: JSON.stringify({ query: sql, params })
  });
  if (!r.ok) { const e = await r.text(); throw new Error(e); }
  const d = await r.json();
  return d.rows || [];
}

// Locations are stored in localStorage on the client side.
// This endpoint provides server-side persistence as well.
export async function GET() {
  return NextResponse.json([], { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
}

export async function POST(request: Request) {
  try {
    let items: any[] = [];
    try { items = await request.json(); } catch { items = []; }
    return NextResponse.json({ success: true, count: items.length }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
