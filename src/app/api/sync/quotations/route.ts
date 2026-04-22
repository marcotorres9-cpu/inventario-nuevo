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

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Cache-Control': 'no-store'
    }
  });
}

export async function GET() {
  try {
    const rows = await query('SELECT id, "customerName", "customerPhone", "customerEmail", subtotal, total, notes, "createdAt", "updatedAt" FROM "Quotation" ORDER BY "updatedAt" DESC');
    const quotes = rows.map((r: any) => ({
      id: r.id,
      clientName: r.customerName || '',
      clientPhone: r.customerPhone || '',
      clientEmail: r.customerEmail || '',
      items: '[]',
      subtotal: parseFloat(r.subtotal)||0,
      tax: 0,
      discount: 0,
      total: parseFloat(r.total)||0,
      status: '',
      notes: r.notes || '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));
    return NextResponse.json(quotes, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function POST(request: Request) {
  try {
    let items: any[] = [];
    try { items = await request.json(); } catch { items = []; }
    if (!Array.isArray(items)) items = [items];
    for (const q of items) {
      if (!q || !q.id) continue;
      await query(
        `INSERT INTO "Quotation" (id,"customerName","customerPhone","customerEmail",subtotal,total,notes,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (id) DO UPDATE SET "customerName"=$2,"customerPhone"=$3,"customerEmail"=$4,subtotal=$5,total=$6,notes=$7,"updatedAt"=NOW()`,
        [q.id, q.clientName||q.customerName||'', q.clientPhone||q.customerPhone||'', q.clientEmail||q.customerEmail||'',
         parseFloat(q.subtotal)||0, parseFloat(q.total)||0, q.notes||'']
      );
    }
    return NextResponse.json({ success: true, count: items.length }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function DELETE(request: Request) {
  try {
    // Accept ID from query param (?id=xxx) OR body ({ id: xxx })
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || request.headers.get('x-delete-id') || '';
    let bodyId = '';
    try { const b = await request.json(); bodyId = b?.id || ''; } catch {}
    const finalId = id || bodyId;
    if (!finalId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await query('DELETE FROM "Quotation" WHERE id = $1', [finalId]);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
