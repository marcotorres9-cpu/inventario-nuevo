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
    const rows = await query('SELECT id, "customerName", "customerPhone", "customerEmail", subtotal, total, notes, number, mode, "validDays", "optionATitle", "optionBTitle", "itemsAJson", "itemsBJson", "totalsAJson", "totalsBJson", "createdAt", "updatedAt" FROM "Quotation" ORDER BY "updatedAt" DESC');
    const quotes = rows.map((r: any) => ({
      id: r.id,
      clientName: r.customerName || '',
      clientPhone: r.customerPhone || '',
      clientEmail: r.customerEmail || '',
      items: '[]',
      subtotal: parseFloat(r.subtotal)||0,
      total: parseFloat(r.total)||0,
      notes: r.notes || '',
      number: r.number || '',
      isDualMode: r.mode === 'dual',
      validDays: parseInt(r.validDays)||15,
      optionTitleA: r.optionATitle || 'Opcion A',
      optionTitleB: r.optionBTitle || 'Opcion B',
      itemsA: r.itemsAJson ? JSON.parse(r.itemsAJson) : [],
      itemsB: r.itemsBJson ? JSON.parse(r.itemsBJson) : [],
      totalsA: r.totalsAJson ? JSON.parse(r.totalsAJson) : null,
      totalsB: r.totalsBJson ? JSON.parse(r.totalsBJson) : null,
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

      // Extract real user notes (not the syncData JSON that was previously stored in notes)
      let realNotes = q.notes || '';
      try {
        const parsed = JSON.parse(realNotes);
        if (parsed && typeof parsed === 'object' && (parsed.itemsA || parsed.isDualMode !== undefined)) {
          // notes field contains syncData JSON — extract actual notes from it
          realNotes = parsed.notes || '';
        }
      } catch {
        // notes is a plain string, not JSON — use as-is
      }

      // Try to add columns if they don't exist (safe to run, ignores if already exists)
      try {
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS number TEXT DEFAULT ''`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'simple'`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "validDays" INTEGER DEFAULT 15`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "optionATitle" TEXT DEFAULT 'Opcion A'`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "optionBTitle" TEXT DEFAULT 'Opcion B'`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "itemsAJson" TEXT DEFAULT '[]'`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "itemsBJson" TEXT DEFAULT '[]'`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "totalsAJson" TEXT`);
        await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "totalsBJson" TEXT`);
      } catch (alterErr) {
        // Ignore alter errors — columns might already exist
      }

      await query(
        `INSERT INTO "Quotation" (id,"customerName","customerPhone","customerEmail",subtotal,total,notes,"createdAt","updatedAt",number,mode,"validDays","optionATitle","optionBTitle","itemsAJson","itemsBJson","totalsAJson","totalsBJson")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO UPDATE SET "customerName"=$2,"customerPhone"=$3,"customerEmail"=$4,subtotal=$5,total=$6,notes=$7,"updatedAt"=NOW(),number=$9,mode=$10,"validDays"=$11,"optionATitle"=$12,"optionBTitle"=$13,"itemsAJson"=$14,"itemsBJson"=$15,"totalsAJson"=$16,"totalsBJson"=$17`,
        [
          q.id,
          q.clientName||q.customerName||'',
          q.clientPhone||q.customerPhone||'',
          q.clientEmail||q.customerEmail||'',
          parseFloat(q.subtotal)||0,
          parseFloat(q.total)||0,
          realNotes,
          q.number||'',
          q.mode||'simple',
          parseInt(q.validDays)||15,
          q.optionATitle||'Opcion A',
          q.optionBTitle||'Opcion B',
          q.itemsAJson||'[]',
          q.itemsBJson||'[]',
          q.totalsAJson||null,
          q.totalsBJson||null
        ]
      );
    }
    return NextResponse.json({ success: true, count: items.length }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function DELETE(request: Request) {
  try {
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
