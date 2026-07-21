import { query } from '@/lib/db';
import { NextResponse } from 'next/server';

// 1×1 transparent PNG (89 bytes)
const TRANSPARENT_PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function notFound() {
  return new Response(TRANSPARENT_PX, {
    status: 404,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    if (!slug) return notFound();

    // 1. Fetch catalog products by slug
    const rows = await query(
      'SELECT products FROM "ElectronicCatalog" WHERE slug=$1',
      [slug],
    );

    if (!rows || (rows as any[]).length === 0) return notFound();

    const cat = (rows as any[])[0];
    // Handle both string JSON and already-parsed JSONB
    const prods: any[] = typeof cat.products === 'string'
      ? JSON.parse(cat.products)
      : (cat.products || []);

    if (prods.length === 0) return notFound();

    const p = prods[0];

    // 2a. Try imageIds → CatalogImage table
    if (p.imageIds && Array.isArray(p.imageIds) && p.imageIds.length > 0) {
      try {
        const imgRows = await query(
          'SELECT "imageType", data FROM "CatalogImage" WHERE id=$1',
          [p.imageIds[0]],
        ) as Array<{ imageType: string; data: string }>;

        if (imgRows && imgRows.length > 0) {
          const { imageType, data } = imgRows[0];
          const buffer = Buffer.from(data, 'base64');
          return new Response(buffer, {
            status: 200,
            headers: {
              'Content-Type': imageType || 'image/jpeg',
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
      } catch (e: any) {
        console.error('[catalog-og-image] CatalogImage lookup failed:', e.message);
        // Fall through to next strategy
      }
    }

    // 2b. Try inline images with base64 data
    if (p.images && Array.isArray(p.images) && p.images.length > 0) {
      for (const img of p.images) {
        if (img.data) {
          const buffer = Buffer.from(img.data, 'base64');
          return new Response(buffer, {
            status: 200,
            headers: {
              'Content-Type': img.type || 'image/jpeg',
              'Cache-Control': 'public, max-age=3600',
            },
          });
        }
        // 2c. Try inline image with URL → redirect
        if (img.url) {
          return NextResponse.redirect(img.url, 302);
        }
      }
    }

    return notFound();
  } catch (e: any) {
    console.error('[catalog-og-image] Error:', e.message);
    return notFound();
  }
}