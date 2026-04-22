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
    const rows = await query('SELECT id, client_name as "clientName", client_phone as "clientPhone", client_email as "clientEmail", items, subtotal, tax, discount, total, status, notes, created_at as "createdAt", updated_at as "updatedAt" FROM "Quotation" ORDER BY updated_at DESC');
    const quotes = rows.map((r: any) => ({
      id: r.id, clientName: r.clientName||'', clientPhone: r.clientPhone||'',
      clientEmail: r.clientEmail||'', items: r.items||'[]',
      subtotal: parseFloat(r.subtotal)||0, tax: parseFloat(r.tax)||0, discount: parseFloat(r.discount)||0,
      total: parseFloat(r.total)||0, status: r.status||'pendiente', notes: r.notes||'',
      createdAt: r.createdAt, updatedAt: r.updatedAt
    }));
    return NextResponse.json(quotes, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    // Fallback to quotations table
    try {
      const rows = await query('SELECT * FROM quotations ORDER BY updated_at DESC');
      const quotes = rows.map((r: any) => ({
        id: r.id, clientName: r.client_name||'', clientPhone: r.client_phone||'',
        clientEmail: r.client_email||'', items: r.items||'[]',
        subtotal: r.subtotal||0, tax: r.tax||0, discount: r.discount||0,
        total: r.total||0, status: r.status||'pendiente', notes: r.notes||'',
        createdAt: r.created_at, updatedAt: r.updated_at
      }));
      return NextResponse.json(quotes, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    } catch (e2: any) {
      return NextResponse.json([], { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }
  }
}

export async function POST(request: Request) {
  try {
    let items: any[] = [];
    try { items = await request.json(); } catch { items = []; }
    if (!Array.isArray(items)) items = [items];
    for (const q of items) {
      if (!q || !q.id) continue;
      // Try Quotation table first
      try {
        await query(
          `INSERT INTO "Quotation" (id,client_name,client_phone,client_email,items,subtotal,tax,discount,total,status,notes,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
           ON CONFLICT (id) DO UPDATE SET client_name=$2,client_phone=$3,client_email=$4,items=$5,subtotal=$6,tax=$7,discount=$8,total=$9,status=$10,notes=$11,updated_at=NOW()`,
          [q.id, q.clientName||q.customerName||'', q.clientPhone||q.customerPhone||'', q.clientEmail||q.customerEmail||'',
           typeof q.items==='string'?q.items:JSON.stringify(q.items||[]),
           parseFloat(q.subtotal)||0, parseFloat(q.tax)||0, parseFloat(q.discount)||0, parseFloat(q.total)||0, q.status||'pendiente', q.notes||'']
        );
      } catch {
        // Fallback to quotations table
        await query(
          `INSERT INTO quotations (id,client_name,client_phone,client_email,items,subtotal,tax,discount,total,status,notes,created_at,updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
           ON CONFLICT (id) DO UPDATE SET client_name=$2,client_phone=$3,client_email=$4,items=$5,subtotal=$6,tax=$7,discount=$8,total=$9,status=$10,notes=$11,updated_at=NOW()`,
          [q.id, q.clientName||q.customerName||'', q.clientPhone||q.customerPhone||'', q.clientEmail||q.customerEmail||'',
           typeof q.items==='string'?q.items:JSON.stringify(q.items||[]),
           q.subtotal||0, q.tax||0, q.discount||0, q.total||0, q.status||'pendiente', q.notes||'']
        );
      }
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
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    try { await query('DELETE FROM "Quotation" WHERE id = $1', [id]); } catch { await query('DELETE FROM quotations WHERE id = $1', [id]); }
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
