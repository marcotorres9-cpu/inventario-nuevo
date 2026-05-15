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

// POST: store any file (PDF, HTML, XLS) and return URL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, data, filename, contentType } = body;

    if (!id || !data) {
      return NextResponse.json({ error: 'id and data required' }, { status: 400 });
    }

    const ct = contentType || 'application/pdf';

    // Create table if not exists (with content_type column)
    await query(`
      CREATE TABLE IF NOT EXISTS "PdfCache" (
        id VARCHAR(255) PRIMARY KEY,
        data TEXT NOT NULL,
        filename VARCHAR(255),
        content_type VARCHAR(100) DEFAULT 'application/pdf',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Add content_type column if missing (for existing tables)
    try {
      await query(`ALTER TABLE "PdfCache" ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) DEFAULT 'application/pdf'`);
    } catch(e) { /* column may already exist */ }

    // Upsert file data
    await query(
      `INSERT INTO "PdfCache" (id, data, filename, content_type) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET data = $2, filename = $3, content_type = $4, created_at = NOW()`,
      [id, data, filename || 'archivo.pdf', ct]
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
