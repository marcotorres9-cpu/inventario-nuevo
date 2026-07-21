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

export async function GET() {
  try {
    const rows = await query('SELECT id, name, email, role, active, "createdAt", "updatedAt" FROM "AppUser" ORDER BY "createdAt" DESC');
    const users = rows.map((r: any) => ({
      id: r.id, name: r.name||'', email: r.email||'',
      role: r.role||'vendedor', active: r.active!==false,
      createdAt: r.createdAt, updatedAt: r.updatedAt
    }));
    return NextResponse.json(users, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function POST(request: Request) {
  try {
    let items: any[] = [];
    try { items = await request.json(); } catch { items = []; }
    if (!Array.isArray(items)) items = [items];
    for (const u of items) {
      if (!u || !u.id) continue;
      await query(
        `INSERT INTO "AppUser" (id, name, email, role, active, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,true,$5,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2,email=$3,role=$4,"updatedAt"=NOW()`,
        [u.id, u.name||'', (u.email||'').toLowerCase(), u.role||'vendedor', u.createdAt||new Date().toISOString()]
      );
    }
    return NextResponse.json({ success: true, count: items.length }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 });
    await query('DELETE FROM "AppUser" WHERE id = $1', [id]);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
