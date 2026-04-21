import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';

// Sync store config - same as /api/store GET
export async function GET() {
  const DB_URL = 'postgresql://neondb_owner:npg_GBoFNmzL9vW2@ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
  const DB_HOST = 'ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech';
  try {
    const r = await fetch(`https://${DB_HOST}/sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': DB_URL },
      body: JSON.stringify({ query: 'SELECT key, value FROM "StoreConfig"' })
    });
    const d = await r.json();
    const rows = d.rows || [];
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

export async function PUT() { return GET(); }
export async function POST() { return GET(); }
export async function DELETE() { return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } }); }
