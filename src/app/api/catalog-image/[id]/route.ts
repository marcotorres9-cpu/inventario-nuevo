import { query } from '@/lib/db';

const CORS = { 'Access-Control-Allow-Origin': '*' };

// 1×1 transparent PNG (89 bytes)
const TRANSPARENT_PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return new Response(TRANSPARENT_PX, { status: 404, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60', ...CORS } });
    }

    const rows = await query('SELECT "imageType", data FROM "CatalogImage" WHERE id = $1', [id]) as Array<{ imageType: string; data: string }>;

    if (rows.length === 0) {
      return new Response(TRANSPARENT_PX, { status: 404, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60', ...CORS } });
    }

    const { imageType, data } = rows[0];
    const buffer = Buffer.from(data, 'base64');

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': imageType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
        ...CORS,
      },
    });
  } catch (e: any) {
    console.error('[catalog-image] Error serving image:', e.message);
    return new Response(TRANSPARENT_PX, { status: 404, headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60', ...CORS } });
  }
}
