import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';

const DB_URL = 'postgresql://neondb_owner:npg_GBoFNmzL9vW2@ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const DB_HOST = 'ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech';

async function query(sql: string, params: any[] = []) {
  const r = await fetch(`https://${DB_HOST}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': DB_URL
    },
    body: JSON.stringify({ query: sql, params })
  });
  if (!r.ok) throw new Error(await r.text());
  const d = await r.json();
  return d.rows || [];
}

// POST: store PDF and return URL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, data, filename } = body;

    if (!id || !data) {
      return NextResponse.json({ error: 'id and data required' }, { status: 400 });
    }

    // Create table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS "PdfCache" (
        id VARCHAR(255) PRIMARY KEY,
        data TEXT NOT NULL,
        filename VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Upsert PDF data
    await query(
      `INSERT INTO "PdfCache" (id, data, filename) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET data = $2, filename = $3, created_at = NOW()`,
      [id, data, filename || 'cotizacion.pdf']
    );

    const baseUrl = 'https://inventario-nuevo.vercel.app';

    return NextResponse.json({
      success: true,
      url: baseUrl + '/api/serve-pdf/' + encodeURIComponent(id)
    });
  } catch (err: any) {
    console.error('serve-pdf POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
