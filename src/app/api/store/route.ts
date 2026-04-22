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
    const rows = await query("SELECT * FROM store_config WHERE id='main'");
    if (rows.length > 0) {
      const r = rows[0];
      const parse = (v: string) => { try { return JSON.parse(v); } catch { return v; } };
      return NextResponse.json({
        id: r.id, name: r.name || 'Mi Tienda', address: r.address || '',
        phone: r.phone || '', email: r.email || '', currency: r.currency || 'MXN',
        footer: r.footer || '', footerText: r.footer_text || '', logo: r.logo || null,
        categories: parse(r.categories), brands: parse(r.brands), colors: parse(r.colors),
        categorySpecs: parse(r.category_specs || '{}')
      }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function PUT(request: Request) {
  try {
    const b = await request.json();
    await query(
      `INSERT INTO store_config (id,name,address,phone,email,currency,footer,footer_text,logo,categories,brands,colors,category_specs,updated_at)
       VALUES ('main',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (id) DO UPDATE SET name=$1,address=$2,phone=$3,email=$4,currency=$5,footer=$6,footer_text=$7,logo=$8,categories=$9,brands=$10,colors=$11,category_specs=$12,updated_at=NOW()`,
      [b.name||b.storeName||'Mi Tienda', b.address||'', b.phone||'', b.email||'', b.currency||'MXN',
       b.footer||b.footerText||'', b.footerText||b.footer||'', b.logo||null,
       typeof b.categories==='string'?b.categories:JSON.stringify(b.categories||[]),
       typeof b.brands==='string'?b.brands:JSON.stringify(b.brands||[]),
       typeof b.colors==='string'?b.colors:JSON.stringify(b.colors||[]),
       typeof b.categorySpecs==='string'?b.categorySpecs:JSON.stringify(b.categorySpecs||b.category_specs||'{}')]
    );
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: Request) {
  return PUT(request);
}
