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
    const rows = await query('SELECT * FROM "Store" LIMIT 1');
    if (rows.length > 0) {
      const r = rows[0];
      const parse = (v: string) => { try { return JSON.parse(v); } catch { return v; } };
      return NextResponse.json({
        id: r.id, name: r.name || 'Mi Tienda', address: r.address || '',
        phone: r.phone || '', email: r.email || '', currency: r.currency || 'USD',
        footer: r.footer || '', logo: r.logo || null,
        categories: parse(r.categories), brands: parse(r.brands), colors: parse(r.colors),
        categorySpecs: parse(r.categorySpecs || '{}')
      }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }
    return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({}, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

export async function POST(request: Request) { return PUT(request); }

export async function PUT(request: Request) {
  try {
    const b = await request.json();
    await query(
      `INSERT INTO "Store" (id,name,address,phone,email,website,logo,currency,footer,categories,brands,colors,"categorySpecs","updatedAt")
       VALUES ('store',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (id) DO UPDATE SET name=$1,address=$2,phone=$3,email=$4,website=$5,logo=$6,currency=$7,footer=$8,categories=$9,brands=$10,colors=$11,"categorySpecs"=$12,"updatedAt"=NOW()`,
      [b.name||b.storeName||'Mi Tienda', b.address||'', b.phone||'', b.email||'', b.website||'', b.logo||null,
       b.currency||'USD', b.footer||b.footerText||'',
       typeof b.categories==='string'?b.categories:JSON.stringify(b.categories||[]),
       typeof b.brands==='string'?b.brands:JSON.stringify(b.brands||[]),
       typeof b.colors==='string'?b.colors:JSON.stringify(b.colors||[]),
       typeof b.categorySpecs==='string'?b.categorySpecs:JSON.stringify(b.categorySpecs||'{}')]
    );
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
