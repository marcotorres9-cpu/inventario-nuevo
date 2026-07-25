import { query } from '@/lib/db';
import { Metadata, Viewport } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

type Props = { params: Promise<{ slug: string }> };

async function resolveImageIds(imageIds: string[]): Promise<Record<string, {type: string; data: string}>> {
  const map: Record<string, {type: string; data: string}> = {};
  if (!imageIds || imageIds.length === 0) return map;
  try { await query(`CREATE TABLE IF NOT EXISTS "CatalogImage" (id TEXT PRIMARY KEY,"catalogId" TEXT DEFAULT '',"imageType" TEXT DEFAULT 'image/jpeg',data TEXT NOT NULL,"createdAt" TIMESTAMPTZ DEFAULT NOW())`); } catch{}
  for (let i = 0; i < imageIds.length; i += 20) {
    const batch = imageIds.slice(i, i + 20);
    const ph = batch.map((_, idx) => `$${idx + 1}`).join(',');
    try {
      const rows = await query(`SELECT id,"imageType",data FROM "CatalogImage" WHERE id IN (${ph})`, batch);
      for (const r of rows as any[]) { map[r.id] = { type: r.imageType, data: r.data }; }
    } catch {}
  }
  return map;
}

function getImages(p: any, imgMap: Record<string, {type: string; data: string}>): { src: string }[] {
  if (p.imageIds && p.imageIds.length > 0) {
    return p.imageIds.map((id: string) => {
      const img = imgMap[id];
      return img ? { src: `data:${img.type};base64,${img.data}` } : { src: '' };
    }).filter((i: any) => i.src);
  }
  return (p.images || []).map((img: any) => {
    if (img.data) return { src: `data:${img.type || 'image/jpeg'};base64,${img.data}` };
    if (img.url) return { src: img.url };
    return { src: '' };
  }).filter((i: any) => i.src);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const rows = await query(
      'SELECT id, name, products FROM "ElectronicCatalog" WHERE slug=$1',
      [slug]
    );
    if (rows.length === 0) return { title: 'Producto no encontrado' };
    const cat = rows[0] as any;
    const prods: any[] = typeof cat.products === 'string' ? JSON.parse(cat.products) : (cat.products || []);
    const p = prods[0] || {};
    const price = parseFloat(p.salePrice) || 0;
    const ogImages: string[] = [`https://inventario-nuevo.vercel.app/api/catalog-og-image/${slug}`];
    return {
      title: (p.name || cat.name) + (price > 0 ? ` - $${price.toLocaleString('es-MX')}` : ''),
      description: `Catálogo de producto: ${p.name || cat.name}`,
      openGraph: {
        title: (p.name || cat.name) + (price > 0 ? ` - $${price.toLocaleString('es-MX')}` : ''),
        description: p.brand ? `${p.brand} ${p.category || ''}` : (p.category || ''),
        images: ogImages,
        type: 'website' as any,
      },
    };
  } catch {
    return { title: 'Catálogo' };
  }
}

export default async function CatalogPage({ params }: Props) {
  const { slug } = await params;
  let cat: any = null;
  let prods: any[] = [];
  let p: any = null;
  let storeInfo: any = {};
  let mainImageIdx = 0;

  // STRATEGY 1: Fetch from DB directly
  try {
    const rows = await query(
      'SELECT id, slug, name, description, products, "storeInfo", "mainImage", "createdAt" FROM "ElectronicCatalog" WHERE slug=$1',
      [slug]
    );
    if (rows.length > 0) cat = rows[0];
  } catch (e: any) {
    console.error('[DB] catalog page:', e.message);
  }

  if (cat) {
    try { prods = typeof cat.products === 'string' ? JSON.parse(cat.products) : (cat.products || []); } catch {}
    p = prods[0] || null;
    storeInfo = cat.storeInfo || {};
    mainImageIdx = parseInt(cat.mainImage) || 0;
  }

  // STRATEGY 2: If DB query failed or no product, try fetching from our own API
  if (!p) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      const apiRes = await fetch(`${baseUrl}/api/catalogs/${slug}`, { cache: 'no-store' });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData && !apiData.error) {
          prods = apiData.products || [];
          p = prods[0] || null;
          storeInfo = apiData.storeInfo || {};
          mainImageIdx = parseInt(apiData.mainImage) || 0;
        }
      }
    } catch (e: any) {
      console.error('[API fallback] catalog page:', e.message);
    }
  }

  if (!p) {
    return (
      <div style={{ margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: '-apple-system,sans-serif', color: '#999', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#333', marginBottom: 8 }}>Producto no encontrado</div>
          <div style={{ fontSize: 13 }}>El enlace que buscas no existe o fue eliminado.</div>
          <a href="/go.html" style={{ marginTop: 20, display: 'inline-block', padding: '10px 24px', background: '#1a73e8', color: '#fff', borderRadius: 8, textDecoration: 'none', fontSize: 14 }}>← Volver a la app</a>
        </div>
      </div>
    );
  }

  const storeName = storeInfo.name || '';
  const price = parseFloat(p.salePrice) || 0;
  const mainImage = mainImageIdx;

  // Resolve images: use imageIds from DB, or images from API fallback
  let allImgs: { src: string }[] = [];
  if (p.imageIds && p.imageIds.length > 0) {
    const imgMap = await resolveImageIds(p.imageIds);
    allImgs = getImages(p, imgMap);
  } else if (p.images && p.images.length > 0) {
    allImgs = p.images.map((img: any) => {
      if (img.data) return { src: `data:${img.type || 'image/jpeg'};base64,${img.data}` };
      if (img.url) return { src: img.url };
      return { src: '' };
    }).filter((i: any) => i.src);
  }

  // Reorder: main image first
  if (mainImage > 0 && mainImage < allImgs.length) {
    const main = allImgs.splice(mainImage, 1)[0];
    allImgs.unshift(main);
  }

  let specObj: Record<string, string> = {};
  if (p.specifications) {
    try { specObj = typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications; } catch {}
  }
  const specEntries = Object.entries(specObj).filter(([, v]) => v?.trim());

  // Extract measurement-related specs for the measurement grid
  const measurements: { key: string; value: string; type: string }[] = [];
  for (const [k, v] of specEntries) {
    const lk = k.toLowerCase().trim();
    if (lk.includes('alto') || lk.includes('altura')) {
      measurements.push({ key: k, value: v, type: 'height' });
    } else if (lk.includes('ancho') || lk.includes('diametro')) {
      measurements.push({ key: k, value: v, type: 'width' });
    } else if (lk.includes('profundidad') || lk.includes('largo') || lk.includes('dimensiones')) {
      measurements.push({ key: k, value: v, type: 'depth' });
    } else if (lk.includes('peso')) {
      measurements.push({ key: k, value: v, type: 'weight' });
    }
  }

  // Fallback: parse dimensions from description text (e.g., "91 x 54 x 56 cm")
  if (measurements.length === 0 && p.description) {
    const dimMatch = p.description.match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(cm|mm|m|in|pulg)?/);
    if (dimMatch) {
      const unit = dimMatch[4] || 'cm';
      measurements.push({ key: 'Alto', value: dimMatch[1] + ' ' + unit, type: 'height' });
      measurements.push({ key: 'Ancho', value: dimMatch[2] + ' ' + unit, type: 'width' });
      measurements.push({ key: 'Profundidad', value: dimMatch[3] + ' ' + unit, type: 'depth' });
    }
  }

  // Calculate proportional bar percentages for Kisuu-style visualization
  const measureNums = measurements.map(m => {
    const num = parseFloat(m.value) || 0;
    return { ...m, num };
  });
  const maxMeasure = Math.max(...measureNums.map(m => m.num), 1);

  const esc = (s: string) => s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : '';

  const imgCount = allImgs.length;
  const slidesHtml = allImgs.length > 0
    ? allImgs.map((img, i) =>
        `<div class="catpg-slide${i === 0 ? ' catpg-active' : ''}"><img src="${esc(img.src)}" alt="${esc(p.name)}" loading="lazy" /></div>`
      ).join('')
    : '<div class="catpg-slide catpg-active"><div class="catpg-no-img">📷</div></div>';

  const dotsHtml = imgCount > 1
    ? `<div class="catpg-dots">${allImgs.map((_, i) =>
        `<span class="catpg-dot${i === 0 ? ' catpg-dot-active' : ''}" data-idx="${i}"></span>`
      ).join('')}</div>`
    : '';

  const counterHtml = imgCount > 1
    ? `<div class="catpg-img-counter" id="catpgCounter">1 / ${imgCount}</div>`
    : '';

  // Thumbnails HTML
  const thumbsHtml = imgCount > 1
    ? `<div class="catpg-thumbs" id="catpgThumbs">${allImgs.map((img, i) =>
        `<img class="catpg-thumb${i === 0 ? ' catpg-thumb-active' : ''}" data-idx="${i}" src="${esc(img.src)}" alt="" />`
      ).join('')}</div>`
    : '';

  // Specs accordion HTML
  const specAccordionHtml = specEntries.length > 0
    ? `<div class="catpg-accordion" id="catpgSpecAccordion">
        <div class="catpg-accordion-header" data-target="catpgSpecBody">
          <span class="catpg-accordion-title">Especificaciones</span>
          <svg class="catpg-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="catpg-accordion-body" id="catpgSpecBody">
          ${specEntries.map(([k, v], i) =>
            `<div class="catpg-spec-row${i % 2 === 1 ? ' catpg-spec-row-alt' : ''}"><span class="catpg-spec-label">${esc(k)}</span><span class="catpg-spec-value">${esc(v)}</span></div>`
          ).join('')}
        </div>
      </div>`
    : '';

  // Description accordion HTML
  const descAccordionHtml = p.description
    ? `<div class="catpg-accordion" id="catpgDescAccordion">
        <div class="catpg-accordion-header" data-target="catpgDescBody">
          <span class="catpg-accordion-title">Descripción</span>
          <svg class="catpg-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="catpg-accordion-body" id="catpgDescBody">
          <div class="catpg-desc">${esc(p.description).split('\n').map(l => l + '<br />').join('')}</div>
        </div>
      </div>`
    : '';

  // Measurement grid HTML
  let measureGridHtml = '';
  if (measurements.length > 0) {
    const iconMap: Record<string, { svg: string; label: string }> = {
      height: {
        label: 'Alto',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><polyline points="8 6 12 2 16 6"/><polyline points="8 18 12 22 16 18"/><line x1="6" y1="12" x2="18" y2="12"/></svg>`
      },
      width: {
        label: 'Ancho',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/><polyline points="6 8 2 12 6 16"/><polyline points="18 8 22 12 18 16"/><line x1="12" y1="6" x2="12" y2="18"/></svg>`
      },
      depth: {
        label: 'Profundidad',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`
      },
      weight: {
        label: 'Peso',
        svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9aa0a6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2V7a4 4 0 0 0-4-4z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>`
      }
    };
    measureGridHtml = `<div class="catpg-measure-section">
      <div class="catpg-measure-heading">Medidas del producto</div>
      <div class="catpg-measure-grid">
        ${measureNums.map(m => {
          const info = iconMap[m.type] || iconMap.depth;
          const pct = maxMeasure > 0 ? Math.round((m.num / maxMeasure) * 100) : 50;
          const barPct = Math.max(pct, 15);
          return `<div class="catpg-measure-cell">
            ${info.svg}
            <div class="catpg-measure-value">${esc(m.value)}</div>
            <div class="catpg-measure-bar-wrap"><div class="catpg-measure-bar" style="width:${barPct}%;"></div></div>
            <div class="catpg-measure-label">${info.label}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  // Color swatch HTML (Kisuu-style)
  const colorSwatchHtml = p.color ? (() => {
    const colorMap: Record<string, string> = {
      'Negro': '#222222', 'Blanco': '#f5f5f5', 'Gris': '#9e9e9e',
      'Rojo': '#d32f2f', 'Azul': '#1976d2', 'Verde': '#388e3c',
      'Dorado': '#c5a028', 'Rosa': '#e91e63', 'Plateado': '#bdbdbd',
      'Naranja': '#f57c00', 'Marron': '#795548'
    };
    const hex = colorMap[p.color] || '#888888';
    const border = hex === '#f5f5f5' ? '#ccc' : 'transparent';
    return `<div class="catpg-color-section">
      <div class="catpg-color-label">Color</div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="width:28px;height:28px;border-radius:50%;background:${hex};border:2px solid ${border};display:inline-block;box-shadow:0 1px 4px rgba(0,0,0,0.15);"></span>
        <span class="catpg-color-name">${esc(p.color)}</span>
      </div>
    </div>`;
  })() : '';

  // Action icons HTML
  const actionIconsHtml = `<div class="catpg-actions" id="catpgActions">
    <div class="catpg-action-item" id="catpgShareBtn">
      <button class="catpg-action-btn" aria-label="Compartir">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </button>
      <span class="catpg-action-label">Compartir</span>
    </div>
    <div class="catpg-action-item" id="catpgSaveBtn">
      <button class="catpg-action-btn" aria-label="Guardar foto">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
      <span class="catpg-action-label">Guardar foto</span>
    </div>
    <div class="catpg-action-item" id="catpgCopyBtn">
      <button class="catpg-action-btn" aria-label="Copiar enlace">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <span class="catpg-action-label">Copiar enlace</span>
    </div>
  </div>
  <div class="catpg-toast" id="catpgToast">Enlace copiado</div>`;

  // Store info "por [StoreName]" HTML
  const storeInfoHtml = storeName
    ? `<div class="catpg-store-line">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>por ${esc(storeName)}</span>
      </div>`
    : '';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .catpg-back{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;padding:12px 16px;background:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,transparent 100%);pointer-events:none;}
        .catpg-back-btn{pointer-events:all;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,0.45);color:#fff;border:none;font-size:22px;line-height:40px;text-align:center;cursor:pointer;padding:0;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;text-decoration:none;}
        .catpg-back-btn:active{background:rgba(0,0,0,0.7);}
        .catpg-wrap{max-width:600px;margin:0 auto;min-height:100vh;background:#fff;}
        .catpg-gallery{position:relative;width:100%;aspect-ratio:1;background:#f0f0f0;overflow:hidden;touch-action:pan-y;cursor:pointer;}
        .catpg-slide{position:absolute;top:0;left:0;width:100%;height:100%;display:none;align-items:center;justify-content:center;background:#fafafa;}
        .catpg-slide.catpg-active{display:flex;}
        .catpg-slide img{width:100%;height:100%;object-fit:contain;pointer-events:none;}
        .catpg-no-img{font-size:72px;opacity:0.15;}
        .catpg-dots{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;gap:8px;z-index:5;background:rgba(0,0,0,0.3);padding:6px 12px;border-radius:20px;}
        .catpg-dot{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.4);cursor:pointer;transition:all .2s;}
        .catpg-dot.catpg-dot-active{background:#fff;transform:scale(1.4);box-shadow:0 0 6px rgba(255,255,255,0.8);}
        .catpg-img-counter{position:absolute;bottom:14px;right:14px;background:rgba(0,0,0,0.5);color:#fff;font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px;z-index:5;}
        /* Thumbnails */
        .catpg-thumbs{display:flex;gap:8px;padding:10px 16px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:#fff;}
        .catpg-thumbs::-webkit-scrollbar{display:none;}
        .catpg-thumbs{-ms-overflow-style:none;scrollbar-width:none;}
        .catpg-thumb{width:50px;height:50px;min-width:50px;border-radius:8px;object-fit:cover;border:2px solid transparent;cursor:pointer;opacity:0.5;transition:all .2s;}
        .catpg-thumb.catpg-thumb-active{border-color:#1a73e8;opacity:1;box-shadow:0 0 0 1px #1a73e8;}
        .catpg-thumb:active{opacity:0.8;}
        /* Content */
        .catpg-content{padding:8px 16px 20px;}
        .catpg-badge{display:inline-block;background:#e8f0fe;color:#1a73e8;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;margin-bottom:8px;}
        .catpg-name{font-size:22px;font-weight:800;line-height:1.3;margin-bottom:4px;color:#111;}
        .catpg-brand{font-size:14px;color:#888;margin-bottom:6px;}
        /* Stock badge */
        .catpg-stock-badge{display:inline-flex;align-items:center;gap:4px;background:#198754;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:4px;margin-bottom:8px;}
        /* Store info line */
        .catpg-store-line{display:inline-flex;align-items:center;gap:4px;font-size:13px;color:#999;margin-bottom:6px;}
        /* Price */
        .catpg-price{font-size:28px;font-weight:800;color:#1a73e8;margin-bottom:16px;}
        /* Accordion */
        .catpg-accordion{border:1px solid #e8eaed;border-radius:10px;overflow:hidden;margin-bottom:12px;background:#fff;}
        .catpg-accordion-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;transition:background .15s;}
        .catpg-accordion-header:active{background:#f8f9fa;}
        .catpg-accordion-title{font-size:14px;font-weight:700;color:#202124;}
        .catpg-chevron{transition:transform .25s ease;color:#9aa0a6;flex-shrink:0;}
        .catpg-accordion-header.catpg-open .catpg-chevron{transform:rotate(180deg);}
        .catpg-accordion-body{max-height:0;overflow:hidden;transition:max-height .3s ease;}
        .catpg-accordion-body.catpg-open{max-height:2000px;}
        /* Specs rows */
        .catpg-spec-row{display:flex;justify-content:space-between;padding:11px 16px;border-bottom:1px solid #f0f0f0;}
        .catpg-spec-row:last-child{border-bottom:none;}
        .catpg-spec-row-alt{background:#f8f9fa;}
        .catpg-spec-label{font-size:13px;color:#5f6368;}
        .catpg-spec-value{font-size:13px;font-weight:600;color:#202124;text-align:right;max-width:60%;}
        /* Description */
        .catpg-desc{padding:12px 16px 16px;font-size:14px;color:#3c4043;line-height:1.7;}
        /* Measurement grid */
        .catpg-measure-section{margin-bottom:12px;}
        .catpg-measure-heading{font-size:14px;font-weight:700;color:#202124;margin-bottom:12px;}
        .catpg-measure-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#f8f9fa;border-radius:10px;padding:16px 8px;}
        .catpg-measure-cell{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;}
        .catpg-measure-value{font-size:16px;font-weight:800;color:#1a73e8;line-height:1.2;}
        .catpg-measure-bar-wrap{width:80%;height:5px;background:#e8eaf6;border-radius:3px;overflow:hidden;}
        .catpg-measure-bar{height:100%;background:linear-gradient(90deg,#1a73e8,#42a5f5);border-radius:3px;transition:width .4s ease;}
        .catpg-measure-label{font-size:11px;color:#9aa0a6;font-weight:600;}
        /* Color swatch */
        .catpg-color-section{margin-bottom:12px;padding:12px 16px;background:#f8f9fa;border-radius:10px;display:flex;align-items:center;gap:14px;}
        .catpg-color-label{font-size:11px;color:#9aa0a6;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;}
        .catpg-color-name{font-size:14px;font-weight:600;color:#202124;}
        /* Action icons */
        .catpg-actions{display:flex;justify-content:center;gap:28px;padding:20px 16px 8px;}
        .catpg-action-item{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;}
        .catpg-action-btn{width:44px;height:44px;border-radius:50%;background:#fff;border:1px solid #dadce0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;padding:0;}
        .catpg-action-btn:active{background:#f1f3f4;border-color:#bdc1c6;transform:scale(0.94);}
        .catpg-action-label{font-size:11px;color:#9aa0a6;}
        /* Toast */
        .catpg-toast{position:fixed;bottom:40px;left:50%;transform:translateX(-50%) translateY(80px);background:#323232;color:#fff;font-size:13px;font-weight:500;padding:10px 20px;border-radius:8px;opacity:0;transition:all .3s ease;z-index:200;pointer-events:none;white-space:nowrap;}
        .catpg-toast.catpg-toast-show{opacity:1;transform:translateX(-50%) translateY(0);}
        /* Footer */
        .catpg-footer{text-align:center;padding:16px;font-size:11px;color:#ccc;border-top:1px solid #f0f0f0;margin-top:8px;}
      ` }} />

      <div className="catpg-back">
        <a className="catpg-back-btn" id="catpgBackBtn" href="#">&#8592;</a>
      </div>

      <div className="catpg-wrap">
        <div className="catpg-gallery" id="catpgGallery">
          <div dangerouslySetInnerHTML={{ __html: slidesHtml + dotsHtml + counterHtml }} />
        </div>
        <div dangerouslySetInnerHTML={{ __html: thumbsHtml }} />

        <div className="catpg-content">
          {p.category && <span className="catpg-badge">{esc(p.category)}</span>}
          <div className="catpg-name">{esc(p.name)}</div>

          {/* Store info line */}
          <div dangerouslySetInnerHTML={{ __html: storeInfoHtml }} />

          {/* Stock badge */}
          <div className="catpg-stock-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            En stock
          </div>

          {(p.brand || p.color) && (
            <div className="catpg-brand">{esc(p.brand || '')}{p.color ? ` · ${esc(p.color)}` : ''}</div>
          )}
          {price > 0 && <div className="catpg-price">${price.toLocaleString('es-MX')}</div>}

          {/* Measurement grid (Kisuu-style) - shown prominently after price */}
          <div dangerouslySetInnerHTML={{ __html: measureGridHtml }} />

          {/* Color swatch */}
          <div dangerouslySetInnerHTML={{ __html: colorSwatchHtml }} />

          {/* Specs accordion */}
          <div dangerouslySetInnerHTML={{ __html: specAccordionHtml }} />

          {/* Description accordion */}
          <div dangerouslySetInnerHTML={{ __html: descAccordionHtml }} />

          {/* Action icons */}
          <div dangerouslySetInnerHTML={{ __html: actionIconsHtml }} />
        </div>

        {storeName && <div className="catpg-footer">{esc(storeName)}</div>}
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        var slides,cur=0,dots,totalSlides,counter;
        (function(){
          var bb=document.getElementById("catpgBackBtn");if(bb){if(document.referrer&&document.referrer.indexOf(location.host)>=0){bb.href='/go.html';}else{bb.href='javascript:history.back()';}}
          slides=document.querySelectorAll(".catpg-slide");
          dots=document.querySelectorAll(".catpg-dot");
          totalSlides=slides.length;
          counter=document.getElementById("catpgCounter");

          // Go to slide n
          function go(n){
            if(!slides.length)return;
            slides[cur].classList.remove("catpg-active");
            if(dots[cur])dots[cur].classList.remove("catpg-dot-active");
            cur=n;if(cur<0)cur=0;if(cur>=slides.length)cur=slides.length-1;
            slides[cur].classList.add("catpg-active");
            if(dots[cur])dots[cur].classList.add("catpg-dot-active");
            if(counter)counter.textContent=(cur+1)+' / '+totalSlides;
            // Update thumbnail active state
            var thumbs=document.querySelectorAll(".catpg-thumb");
            for(var t=0;t<thumbs.length;t++){
              thumbs[t].classList.toggle("catpg-thumb-active",t===cur);
            }
            // Scroll active thumb into view
            var activeThumb=document.querySelector(".catpg-thumb-active");
            if(activeThumb)activeThumb.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"});
          }

          // Dot click handlers
          for(var i=0;i<dots.length;i++){
            dots[i].addEventListener("click",function(e){e.stopPropagation();go(parseInt(this.dataset.idx));});
          }

          // Thumbnail click handlers
          var thumbs=document.querySelectorAll(".catpg-thumb");
          for(var i=0;i<thumbs.length;i++){
            thumbs[i].addEventListener("click",function(e){
              e.stopPropagation();
              go(parseInt(this.dataset.idx));
            });
          }

          // Gallery swipe
          var sx=0,gal=document.getElementById("catpgGallery");
          if(gal){
            gal.addEventListener("touchstart",function(e){sx=e.touches[0].clientX;},{passive:true});
            gal.addEventListener("touchend",function(e){
              var d=sx-e.changedTouches[0].clientX;
              if(Math.abs(d)>50){go(cur+(d>0?1:-1));}
            });
            gal.addEventListener("click",function(e){
              if(e.target.closest(".catpg-dot")||e.target.closest(".catpg-img-counter"))return;
              saveCurrentImage();
            });
          }

          // Accordion toggle logic
          var accHeaders=document.querySelectorAll(".catpg-accordion-header");
          for(var i=0;i<accHeaders.length;i++){
            accHeaders[i].addEventListener("click",function(){
              var targetId=this.dataset.target;
              var body=document.getElementById(targetId);
              if(!body)return;
              var isOpen=body.classList.contains("catpg-open");
              // Close all accordions
              var allBodies=document.querySelectorAll(".catpg-accordion-body");
              var allHeaders=document.querySelectorAll(".catpg-accordion-header");
              for(var j=0;j<allBodies.length;j++){allBodies[j].classList.remove("catpg-open");}
              for(var j=0;j<allHeaders.length;j++){allHeaders[j].classList.remove("catpg-open");}
              // Open clicked if it was closed
              if(!isOpen){
                body.classList.add("catpg-open");
                this.classList.add("catpg-open");
              }
            });
          }

          // Toast helper
          function showToast(msg){
            var toast=document.getElementById("catpgToast");
            if(!toast)return;
            if(msg)toast.textContent=msg;
            toast.classList.add("catpg-toast-show");
            setTimeout(function(){toast.classList.remove("catpg-toast-show");},2000);
          }

          // Share button
          var shareBtn=document.getElementById("catpgShareBtn");
          if(shareBtn){
            shareBtn.addEventListener("click",function(){
              var productName = document.querySelector(".catpg-name");
              var shareData = {url: window.location.href};
              if(productName) shareData.title = productName.textContent;
              if(navigator.share){
                navigator.share(shareData).catch(function(){});
              } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(window.location.href).then(function(){showToast("Enlace copiado");}).catch(function(){});
              }
            });
          }

          // Save photo: Web Share API then download fallback
          function saveCurrentImage(){
            var activeSlide=slides[cur];
            if(!activeSlide)return;
            var img=activeSlide.querySelector("img");
            if(!img||!img.src)return;
            var imgSrc=img.src;
            // Try Web Share API first (works in some WebViews)
            if(navigator.share && imgSrc.indexOf("data:")===0){
              try{
                var parts=imgSrc.split(",");
                var bStr=atob(parts[1]);
                var mime=parts[0].split(":")[1].split(";")[0];
                var buf=new ArrayBuffer(bStr.length);
                var arr=new Uint8Array(buf);
                for(var j=0;j<bStr.length;j++)arr[j]=bStr.charCodeAt(j);
                var blob=new Blob([buf],{type:mime});
                var file=new File([blob],"foto-producto.jpg",{type:mime});
                if(navigator.canShare&&navigator.canShare({files:[file]})){
                  navigator.share({files:[file],title:"Foto producto"}).catch(function(){});
                  return;
                }
              }catch(ex){}
            }
            // Fallback: create download link
            if(imgSrc.indexOf("data:")===0){
              try{
                var parts2=imgSrc.split(",");
                var bStr2=atob(parts2[1]);
                var mime2=parts2[0].split(":")[1].split(";")[0];
                var buf2=new ArrayBuffer(bStr2.length);
                var arr2=new Uint8Array(buf2);
                for(var k=0;k<bStr2.length;k++)arr2[k]=bStr2.charCodeAt(k);
                var blob2=new Blob([buf2],{type:mime2});
                var url2=URL.createObjectURL(blob2);
                var a=document.createElement("a");
                a.href=url2;
                a.download="foto-producto.jpg";
                a.style.display="none";
                document.body.appendChild(a);
                a.click();
                setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url2);},1000);
              }catch(ex2){}
            }else{
              var a2=document.createElement("a");
              a2.href=imgSrc;
              a2.download="foto-producto.jpg";
              a2.target="_self";
              a2.style.display="none";
              document.body.appendChild(a2);
              a2.click();
              setTimeout(function(){document.body.removeChild(a2);},500);
            }
          }
          var saveBtn=document.getElementById("catpgSaveBtn");
          if(saveBtn){
            saveBtn.addEventListener("click",function(){
              saveCurrentImage();
            });
          }

          // Copy link button
          var copyBtn=document.getElementById("catpgCopyBtn");
          if(copyBtn){
            copyBtn.addEventListener("click",function(){
              navigator.clipboard.writeText(window.location.href).then(function(){showToast("Enlace copiado");}).catch(function(){showToast("No se pudo copiar");});
            });
          }
        })();
      ` }} />
    </>
  );
}