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
    const rows = await query('SELECT id, name, sku, barcode, category, brand, color, cost_price as "costPrice", sale_price as "salePrice", stock, min_stock as "minStock", description, specifications, created_at as "createdAt", updated_at as "updatedAt" FROM "Product" ORDER BY updated_at DESC');
    const products = rows.map((r: any) => ({
      id: r.id, name: r.name || '', sku: r.sku || '', barcode: r.barcode || '',
      category: r.category || '', brand: r.brand || '', color: r.color || '',
      costPrice: parseFloat(r.costPrice) || 0, salePrice: parseFloat(r.salePrice) || 0,
      stock: parseInt(r.stock) || 0, minStock: parseInt(r.minStock) || 5,
      description: r.description || '',
      specifications: r.specifications || null,
      createdAt: r.createdAt, updatedAt: r.updatedAt
    }));
    return NextResponse.json(products, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.id) return NextResponse.json({ error: 'Product id required' }, { status: 400 });
    const specs = body.specifications ? (typeof body.specifications === 'string' ? body.specifications : JSON.stringify(body.specifications)) : null;
    await query(
      `INSERT INTO "Product" (id, name, sku, barcode, category, brand, color, cost_price, sale_price, stock, min_stock, description, specifications, created_at, updated_at, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (id) DO UPDATE SET name=$2,sku=$3,barcode=$4,category=$5,brand=$6,color=$7,cost_price=$8,sale_price=$9,stock=$10,min_stock=$11,description=$12,specifications=$13,updated_at=$15,user_id=$16`,
      [body.id, body.name||'', body.sku||'', body.barcode||'', body.category||'', body.brand||'', body.color||'',
       parseFloat(body.costPrice)||0, parseFloat(body.salePrice)||0, parseInt(body.stock)||0, parseInt(body.minStock)||5,
       body.description||'', specs, body.createdAt||new Date().toISOString(), body.updatedAt||new Date().toISOString(), body.userId||null]
    );
    return NextResponse.json({ success: true, id: body.id }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PUT(request: Request) { return POST(request); }

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const id = body?.id;
    if (!id) return NextResponse.json({ error: 'Product id required' }, { status: 400 });
    await query('DELETE FROM "Product" WHERE id = $1', [id]);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
