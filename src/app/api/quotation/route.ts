import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

const H = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };

// Fix double-encoded UTF-8 stored in DB (e.g. "SanguÃ±a" → "Sanguña")
function fixUtf8(str: string | undefined | null): string {
  if (!str) return '';
  try { return decodeURIComponent(escape(str)); } catch { return str; }
}

// Fix encoding in all string fields of a quotation snapshot
function fixDataFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const out: any = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v === 'string') {
      out[k] = fixUtf8(v);
    } else if (typeof v === 'object' && v !== null) {
      out[k] = fixDataFields(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Returns the FULL quotation JSON (items, dual mode, totals, etc.) by id
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'Falta el parámetro id' }, { status: 400, headers: H });
    }

    // Ensure table has data column
    try {
      await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS data TEXT`);
    } catch (e: any) {
      // ignore — column may already exist
    }

    const rows: any[] = await query(
      `SELECT id, "customerName", "customerPhone", "customerEmail", subtotal, total, notes, data, "createdAt", "updatedAt"
       FROM "Quotation" WHERE id = $1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Cotización no encontrada. Pídele al vendedor que la sincronice.' }, { status: 404, headers: H });
    }

    const r = rows[0];
    let fullData: any = null;
    if (r.data) {
      try {
        fullData = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      } catch {
        fullData = null;
      }
    }

    // Merge: prefer full JSON, fall back to row fields
    const merged: any = {
      id: r.id,
      number: fullData?.number || ('COT-' + r.id.slice(-6).toUpperCase()),
      clientName: fullData?.clientName || r.customerName || '',
      customerPhone: fullData?.customerPhone || r.customerPhone || '',
      customerEmail: fullData?.customerEmail || r.customerEmail || '',
      itemsA: fullData?.itemsA || fullData?.items || [],
      itemsB: fullData?.itemsB || [],
      isDualMode: !!fullData?.isDualMode,
      optionTitleA: fullData?.optionTitleA || '',
      optionTitleB: fullData?.optionTitleB || '',
      totalsA: fullData?.totalsA || { subtotal: r.subtotal || 0, total: r.total || 0 },
      totalsB: fullData?.totalsB || null,
      discountA: fullData?.discountA || null,
      discountB: fullData?.discountB || null,
      subtotal: fullData?.subtotal ?? r.subtotal ?? 0,
      total: fullData?.total ?? r.total ?? 0,
      notes: fullData?.notes || r.notes || '',
      validDays: fullData?.validDays || 15,
      createdAt: fullData?.createdAt || r.createdAt,
      store: fullData?.store || null,
    };

    // Fix double-encoded UTF-8 in all string fields (e.g. store address "SanguÃ±a" → "Sanguña")
    const fixed = fixDataFields(merged);

    return NextResponse.json(fixed, { headers: H });
  } catch (e: any) {
    console.error('[DB] GET /api/quotation:', e.message);
    return NextResponse.json({ error: 'Error interno: ' + e.message }, { status: 500, headers: H });
  }
}
