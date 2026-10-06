import { query } from '@/lib/db';

/* Datos vivos del inventario (tabla Product) sobre los snapshots del catálogo.
   El catálogo electrónico guarda una COPIA del producto al publicarlo; si el
   usuario luego edita el producto en la app, el snapshot queda viejo. Estas
   helpers permiten que las páginas públicas (y las APIs de lectura) mezclen
   los datos VIVOS del inventario sobre el snapshot, campo por campo.
   Las FOTOS siempre vienen del snapshot (imageIds -> CatalogImage): la tabla
   Product no almacena imágenes. */

export type LiveProduct = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  color: string | null;
  costPrice: string | number | null;
  salePrice: string | number | null;
  stock: number | null;
  description: string | null;
  specifications: Record<string, string> | null;
};

const LIVE_COLS = 'id, name, brand, category, color, "costPrice", "salePrice", stock, description, specifications';

// Carga productos vivos por id (en lotes). Devuelve mapa id -> fila.
export async function fetchLiveProducts(ids: string[]): Promise<Record<string, LiveProduct>> {
  const map: Record<string, LiveProduct> = {};
  const clean: string[] = [];
  for (const id of ids || []) { if (id && clean.indexOf(id) === -1) clean.push(id); }
  if (clean.length === 0) return map;
  for (let i = 0; i < clean.length; i += 50) {
    const batch = clean.slice(i, i + 50);
    const ph = batch.map((_, idx) => '$' + (idx + 1)).join(',');
    try {
      const rows = await query(`SELECT ${LIVE_COLS} FROM "Product" WHERE id IN (${ph})`, batch);
      for (const r of rows as any[]) map[r.id] = r as LiveProduct;
    } catch {}
  }
  return map;
}

// Mezcla: los campos vivos ganan si existen; el snapshot provee el resto
// (sobre todo imageIds/images, que solo viven allí).
export function mergeLive(snap: any, live: any): any {
  if (!snap) return snap;
  if (!live) return snap;
  const m: any = { ...snap };
  if (live.name) m.name = live.name;
  if (live.brand) m.brand = live.brand;
  if (live.category) m.category = live.category;
  if (live.color) m.color = live.color;
  if (live.salePrice != null && live.salePrice !== '') m.salePrice = Number(live.salePrice);
  if (live.costPrice != null && live.costPrice !== '') m.costPrice = Number(live.costPrice);
  if (live.stock != null && live.stock !== '') m.stock = Number(live.stock);
  if (live.description) m.description = live.description;
  if (live.specifications != null) m.specifications = live.specifications;
  return m;
}

// Convierte specifications {k:v} en textos de pastillas "Clave: valor".
export function specsFromSpecObj(obj: any): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const out: string[] = [];
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    if (v == null || String(v).trim() === '') continue;
    out.push(String(k).trim() + ': ' + String(v).trim());
  }
  return out;
}

// Extrae el p0 (snapshot) de una fila ElectronicCatalog sin lanzar.
export function firstProductOf(rowProducts: any): any {
  let prods: any[] = [];
  try { prods = typeof rowProducts === 'string' ? JSON.parse(rowProducts) : (rowProducts || []); } catch {}
  return prods[0] || null;
}
