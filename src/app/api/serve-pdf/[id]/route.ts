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

// GET: serve any file by id (PDF, HTML, XLS, etc.)
export async function GET(request: Request, context: any) {
  try {
    const id = context.params.id;
    const { searchParams } = new URL(request.url);
    const forceDownload = searchParams.get('download');

    const rows = await query(
      'SELECT data, filename, content_type FROM "PdfCache" WHERE id = $1',
      [id]
    );

    if (!rows || rows.length === 0) {
      return new Response('Archivo no encontrado', { status: 404 });
    }

    const row = rows[0];
    const base64 = row.data;
    const filename = row.filename || 'archivo.pdf';
    const contentType = row.content_type || 'application/pdf';

    // Decode base64 to binary
    const binary = Buffer.from(base64, 'base64');

    // Si se pide descarga explicita, usar attachment. Si no, inline.
    const disposition = forceDownload
      ? 'attachment; filename="' + filename + '"'
      : 'inline; filename="' + filename + '"';

    return new Response(binary, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': '' + binary.length
      }
    });
  } catch (err: any) {
    console.error('serve-pdf GET error:', err);
    return new Response('Error: ' + err.message, { status: 500 });
  }
}
