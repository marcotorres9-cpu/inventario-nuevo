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
    const rows = await query('SELECT id, name, sku, barcode, category, brand, color, "costPrice", "salePrice", stock, "minStock", description, specifications, "createdAt", "updatedAt" FROM "Product" ORDER BY "updatedAt" DESC');
    const products = rows.map((r: any) => ({
      id: r.id, name: r.name || '', sku: r.sku || '', barcode: r.barcode || '',
      category: r.category || '', brand: r.brand || '', color: r.color || '',
      costPrice: parseFloat(r.costPrice) || 0, salePrice: parseFloat(r.salePrice) || 0,
      stock: parseInt(r.stock) || 0, minStock: parseInt(r.minStock) || 5,
      description: r.description || '',
      specifications: r.specifications || null,
      createdAt: r.createdAt, updatedAt: r.updatedAt
    }));
    return NextResponse.json(products, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function POST(request: Request) {
  try {
    let items: any[] = [];
    try { items = await request.json(); } catch { items = []; }
    if (!Array.isArray(items)) items = [items];
    for (const p of items) {
      if (!p || !p.id) continue;
      const specs = p.specifications ? (typeof p.specifications === 'string' ? p.specifications : JSON.stringify(p.specifications)) : null;
      await query(
        `INSERT INTO "Product" (id, name, sku, barcode, category, brand, color, "costPrice", "salePrice", stock, "minStock", description, specifications, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2,sku=$3,barcode=$4,category=$5,brand=$6,color=$7,"costPrice"=$8,"salePrice"=$9,stock=$10,"minStock"=$11,description=$12,specifications=$13,"updatedAt"=NOW()`,
        [p.id, p.name||'', p.sku||'', p.barcode||'', p.category||'', p.brand||'', p.color||'',
         parseFloat(p.costPrice)||0, parseFloat(p.salePrice)||0, parseInt(p.stock)||0, parseInt(p.minStock)||5,
         p.description||'', specs, p.createdAt||new Date().toISOString()]
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
    if (!id) return NextResponse.json({ error: 'Product id required' }, { status: 400 });
    await query('DELETE FROM "Product" WHERE id = $1', [id]);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
