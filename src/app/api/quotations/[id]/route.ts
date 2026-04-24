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
  if (!r.ok) throw new Error(await r.text());
  const d = await r.json();
  return d.rows || [];
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the quotation
    const rows = await query(
      `SELECT * FROM "Quotation" WHERE id=$1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    const r = rows[0];

    // Parse JSON fields
    let itemsA = [];
    let itemsB = [];
    let discountA = { type: 'percentage', value: 0 };
    let discountB = { type: 'percentage', value: 0 };
    let totalsA = null;
    let totalsB = null;

    try { itemsA = JSON.parse(r.itemsAJson || '[]'); } catch {}
    try { itemsB = JSON.parse(r.itemsBJson || '[]'); } catch {}
    try { discountA = JSON.parse(r.discountAJson || '{}'); } catch {}
    try { discountB = JSON.parse(r.discountBJson || '{}'); } catch {}
    try { totalsA = JSON.parse(r.totalsAJson || 'null'); } catch {}
    try { totalsB = JSON.parse(r.totalsBJson || 'null'); } catch {}

    // Fetch store info
    const storeRows = await query(
      `SELECT name, address, phone, email, logo, footer, currency FROM "Store" LIMIT 1`
    );
    const store = storeRows.length > 0 ? storeRows[0] : {};

    return NextResponse.json({
      id: r.id,
      number: r.number || '',
      clientName: r.customerName || '',
      customerPhone: r.customerPhone || '',
      customerEmail: r.customerEmail || '',
      subtotal: parseFloat(r.subtotal) || 0,
      total: parseFloat(r.total) || 0,
      notes: r.notes || '',
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      validDays: parseInt(r.validDays) || 15,
      mode: r.mode || 'simple',
      isDualMode: r.mode === 'dual',
      optionTitleA: r.optionATitle || 'Opcion A',
      optionTitleB: r.optionBTitle || 'Opcion B',
      itemsA: itemsA,
      itemsB: itemsB,
      discountA: discountA,
      discountB: discountB,
      totalsA: totalsA,
      totalsB: totalsB,
      store: {
        name: store.name || 'Mi Tienda',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        logo: store.logo || '',
        footer: store.footer || 'Gracias por su preferencia',
        currency: store.currency || 'MXN'
      }
    }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
