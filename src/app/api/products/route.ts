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

export async function GET() {
  try {
    const rows = await query('SELECT * FROM products ORDER BY updated_at DESC');
    const prods = rows.map((r: any) => ({
      id: r.id, name: r.name||'', sku: r.sku||'', barcode: r.barcode||'',
      category: r.category||'', brand: r.brand||'', color: r.color||'',
      costPrice: r.cost_price||0, salePrice: r.sale_price||0, price: r.price||0,
      stock: r.stock||0, minStock: r.min_stock||5, description: r.description||'',
      createdAt: r.created_at, updatedAt: r.updated_at
    }));
    return NextResponse.json(prods, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  try {
    let items: any[] = [];
    try { items = await request.json(); } catch { items = []; }
    if (!Array.isArray(items)) items = [items];
    for (const p of items) {
      if (!p || !p.id) continue;
      await query(
        `INSERT INTO products (id,name,sku,barcode,category,brand,color,cost_price,sale_price,price,stock,min_stock,description,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2,sku=$3,barcode=$4,category=$5,brand=$6,color=$7,cost_price=$8,sale_price=$9,price=$10,stock=$11,min_stock=$12,description=$13,updated_at=NOW()`,
        [p.id, p.name||'', p.sku||'', p.barcode||'', p.category||'', p.brand||'', p.color||'',
         p.costPrice||0, p.salePrice||p.price||0, p.price||p.salePrice||0, p.stock||0, p.minStock||5, p.description||'']
      );
    }
    return NextResponse.json({ success: true, count: items.length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    await query('DELETE FROM products WHERE id=$1', [id]);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
