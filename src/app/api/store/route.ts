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
    const rows = await query('SELECT key, value FROM "StoreConfig"');
    const c: any = {};
    for (const row of rows) {
      try { c[row.key] = JSON.parse(row.value); } catch { c[row.key] = row.value; }
    }
    return NextResponse.json({
      storeName: c.name || 'Mi Tienda', address: c.address || '', phone: c.phone || '',
      email: c.email || '', currency: c.currency || 'MXN', footer: c.footer || '',
      footerText: c.footerText || '', logo: c.logo || null,
      categories: c.categories || [], brands: c.brands || [], colors: c.colors || [],
      categorySpecs: c.categorySpecs || {}
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const keys = [
      { k: 'name', v: body.name || body.storeName }, { k: 'address', v: body.address },
      { k: 'phone', v: body.phone }, { k: 'email', v: body.email },
      { k: 'currency', v: body.currency }, { k: 'footer', v: body.footer || body.footerText },
      { k: 'footerText', v: body.footerText || body.footer }, { k: 'logo', v: body.logo },
      { k: 'categories', v: body.categories }, { k: 'brands', v: body.brands },
      { k: 'colors', v: body.colors }, { k: 'categorySpecs', v: body.categorySpecs }
    ];
    for (const item of keys) {
      if (item.v === undefined || item.v === null) continue;
      const val = typeof item.v === 'string' ? item.v : JSON.stringify(item.v);
      await query('INSERT INTO "StoreConfig" (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()', [item.k, val]);
    }
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST() { return PUT; }
export async function DELETE() { return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } }); }
