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

// GET: serve PDF by id
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;

    // Create table if not exists
    await query(`
      CREATE TABLE IF NOT EXISTS "PdfCache" (
        id VARCHAR(255) PRIMARY KEY,
        data TEXT NOT NULL,
        filename VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const rows = await query(
      'SELECT data, filename FROM "PdfCache" WHERE id = $1',
      [id]
    );

    if (!rows || rows.length === 0) {
      return new Response('PDF no encontrado', { status: 404 });
    }

    const row = rows[0];
    const base64 = row.data;
    const filename = row.filename || 'cotizacion.pdf';

    // Decode base64 to binary
    const binary = Buffer.from(base64, 'base64');

    return new Response(binary, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="' + filename + '"',
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': '' + binary.length
      }
    });
  } catch (err: any) {
    console.error('serve-pdf GET error:', err);
    return new Response('Error: ' + err.message, { status: 500 });
  }
}

// POST: store PDF
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

    const baseUrl = process.env.VERCEL_URL
      ? 'https://' + process.env.VERCEL_URL
      : 'https://inventario-nuevo.vercel.app';

    return NextResponse.json({
      success: true,
      url: baseUrl + '/api/serve-pdf/' + encodeURIComponent(id)
    });
  } catch (err: any) {
    console.error('serve-pdf POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
