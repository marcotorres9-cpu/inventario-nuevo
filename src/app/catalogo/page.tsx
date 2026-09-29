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

export const metadata: Metadata = {
  title: 'Catálogo',
  description: 'Catálogo de productos',
};

function esc(s: any): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDec(n: number): string {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function PublicCatalogPage() {
  type Item = {
    slug: string; name: string; brand: string; category: string;
    price: number; costPrice: number; specs: string[]; imgId: string; color: string;
  };
  let items: Item[] = [];
  let storeName = '';
  let storePhone = '';

  try {
    const rows = await query(
      'SELECT slug, name, products, "storeInfo", "mainImage" FROM "ElectronicCatalog" ORDER BY "updatedAt" DESC'
    );
    for (const r of rows as any[]) {
      let prods: any[] = [];
      try { prods = typeof r.products === 'string' ? JSON.parse(r.products) : (r.products || []); } catch {}
      const p0 = prods[0];
      if (!p0) continue;
      const price = parseFloat(p0.salePrice) || 0;
      const costPrice = parseFloat(p0.costPrice) || 0;
      let specs: string[] = [];
      try {
        if (p0.specs) {
          if (Array.isArray(p0.specs)) specs = p0.specs.map((s: any) => String(s.text || s)).filter(Boolean);
          else if (typeof p0.specs === 'object') specs = Object.values(p0.specs).map((s: any) => String(s && s.text ? s.text : s)).filter(Boolean);
        }
      } catch {}
      const imgIds: string[] = p0.imageIds || [];
      const mainIdx = parseInt(r.mainImage) || 0;
      const imgId = imgIds[Math.min(mainIdx, imgIds.length - 1)] || imgIds[0] || '';
      if (!storeName) {
        let si: any = {};
        try { si = typeof r.storeInfo === 'string' ? JSON.parse(r.storeInfo) : (r.storeInfo || {}); } catch {}
        storeName = si.storeName || si.name || '';
        storePhone = si.phone || si.whatsapp || '';
      }
      items.push({
        slug: String(r.slug || ''),
        name: String(p0.name || r.name || 'Producto'),
        brand: String(p0.brand || ''),
        category: String(p0.category || ''),
        price, costPrice,
        specs: specs.slice(0, 3),
        imgId,
        color: String(p0.color || ''),
      });
    }
  } catch (e: any) {
    console.error('[catalogo] DB error:', e?.message);
  }

  const title = storeName ? `Catálogo — ${storeName}` : 'Catálogo de productos';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        *{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f6f8;}
        .pl-back{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;padding:12px 16px;background:linear-gradient(180deg,rgba(0,0,0,0.35) 0%,transparent 100%);pointer-events:none;}
        .pl-back-btn{pointer-events:all;width:40px;height:40px;border-radius:50%;background:rgba(0,0,0,0.45);color:#fff;border:none;font-size:22px;line-height:40px;text-align:center;cursor:pointer;display:flex;align-items:center;justify-content:center;text-decoration:none;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);}
        .pl-wrap{max-width:600px;margin:0 auto;min-height:100vh;background:#f5f6f8;padding-bottom:40px;}
        .pl-hero{background:linear-gradient(135deg,#0A2540 0%,#1E3A5F 100%);padding:34px 20px 22px;color:#fff;}
        .pl-hero-tag{background:#22C55E;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:10px;letter-spacing:1px;text-transform:uppercase;display:inline-block;margin-bottom:8px;}
        .pl-hero h1{font-size:22px;font-weight:800;line-height:1.25;}
        .pl-hero-sub{font-size:12px;opacity:0.85;margin-top:4px;}
        .pl-toolbar{position:sticky;top:0;z-index:60;background:#f5f6f8;padding:10px 14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
        .pl-search{width:100%;padding:11px 14px 11px 38px;border-radius:12px;border:1.5px solid #e0e3e8;background:#fff;font-size:14px;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239aa0a6' stroke-width='2.5' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cline x1='21' y1='21' x2='16.5' y2='16.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:13px center;}
        .pl-search:focus{border-color:#1a73e8;}
        .pl-chips{display:flex;gap:6px;overflow-x:auto;padding-top:8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
        .pl-chips::-webkit-scrollbar{display:none;}
        .pl-chip{flex-shrink:0;padding:6px 14px;border-radius:18px;border:1.5px solid #e0e3e8;background:#fff;font-size:12px;font-weight:600;color:#5f6368;cursor:pointer;white-space:nowrap;}
        .pl-chip.pl-on{background:#0A2540;border-color:#0A2540;color:#fff;}
        .pl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:12px 14px 0;}
        @media(min-width:480px){.pl-grid{grid-template-columns:repeat(3,1fr);}}
        .pl-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);display:flex;flex-direction:column;text-decoration:none;position:relative;}
        .pl-card:active{transform:scale(0.98);}
        .pl-img{aspect-ratio:1;background:#f0f0f0;display:flex;align-items:center;justify-content:center;position:relative;}
        .pl-img img{width:100%;height:100%;object-fit:contain;}
        .pl-ph{font-size:40px;opacity:0.18;}
        .pl-disc{position:absolute;top:8px;left:8px;background:#e53935;color:#fff;font-size:10px;font-weight:800;padding:3px 7px;border-radius:8px;z-index:2;}
        .pl-body{padding:10px 12px 12px;display:flex;flex-direction:column;flex:1;}
        .pl-name{font-size:13px;font-weight:700;color:#111;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
        .pl-brand{font-size:11px;color:#9aa0a6;margin-top:2px;}
        .pl-price-row{margin-top:6px;}
        .pl-price-old{font-size:11px;color:#b9bec6;text-decoration:line-through;margin-right:5px;}
        .pl-price{font-size:16px;font-weight:800;color:#0A2540;}
        .pl-specs{font-size:10px;color:#5f6368;margin-top:5px;line-height:1.5;}
        .pl-specs div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .pl-specs div::before{content:'• ';color:#22C55E;font-weight:700;}
        .pl-ver{margin-top:8px;background:#0A2540;color:#fff;border:none;border-radius:9px;padding:8px 0;font-size:12px;font-weight:700;cursor:pointer;text-align:center;}
        .pl-empty{text-align:center;padding:50px 20px;color:#9aa0a6;}
        .pl-empty .ico{font-size:48px;margin-bottom:10px;}
        .pl-footer{text-align:center;padding:20px;font-size:11px;color:#c3c8cf;}
      ` }} />

      <div className="pl-back">
        <a className="pl-back-btn" id="plBackBtn" href="#">&#8592;</a>
      </div>

      <div className="pl-wrap">
        <div className="pl-hero">
          <span className="pl-hero-tag">Catálogo</span>
          <h1>{esc(storeName || 'Nuestros productos')}</h1>
          <div className="pl-hero-sub">{items.length} producto{items.length === 1 ? '' : 's'} disponible{items.length === 1 ? '' : 's'}</div>
        </div>

        <div className="pl-toolbar">
          <input type="text" id="plSearch" className="pl-search" placeholder="Buscar producto, marca..." />
          <div className="pl-chips" id="plChips"></div>
        </div>

        {items.length === 0 ? (
          <div className="pl-empty"><div className="ico">📖</div>Catálogo vacío por el momento</div>
        ) : (
          <div className="pl-grid" id="plGrid">
            {items.map((it, i) => {
              const discount = (it.costPrice > 0 && it.price > 0 && it.price < it.costPrice)
                ? Math.round((1 - it.price / it.costPrice) * 100) : 0;
              return (
                <a key={i} className="pl-card" href={`/c/${esc(it.slug)}`}
                   data-name={esc(it.name.toLowerCase())} data-brand={esc(it.brand.toLowerCase())}
                   data-cat={esc(it.category)} data-img-id={esc(it.imgId)}>
                  {discount > 0 && <span className="pl-disc">-{discount}%</span>}
                  <div className="pl-img"><span className="pl-ph" data-ph>📦</span></div>
                  <div className="pl-body">
                    <div className="pl-name">{esc(it.name)}</div>
                    {it.brand && <div className="pl-brand">{esc(it.brand)}</div>}
                    {it.price > 0 && (
                      <div className="pl-price-row">
                        {discount > 0 && <span className="pl-price-old">${fmtDec(it.costPrice)}</span>}
                        <span className="pl-price">${fmtDec(it.price)}</span>
                      </div>
                    )}
                    {it.specs.length > 0 && (
                      <div className="pl-specs">
                        {it.specs.map((s, j) => <div key={j}>{esc(s)}</div>)}
                      </div>
                    )}
                    <span className="pl-ver">Ver detalle</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <div className="pl-footer">{esc(storeName || '')}</div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var bb=document.getElementById("plBackBtn");
          if(bb){bb.addEventListener('click',function(e){e.preventDefault();if(window.history.length>1){window.history.back();}else{window.location.href='/';}});}

          /* Load thumbnails */
          var cards=document.querySelectorAll(".pl-card[data-img-id]");
          for(var i=0;i<cards.length;i++){
            (function(card){
              var id=card.getAttribute("data-img-id");
              if(!id)return;
              fetch('/api/catalog-upload?id='+encodeURIComponent(id))
              .then(function(r){return r.json();})
              .then(function(res){
                if(!res.data)return;
                var img=document.createElement('img');
                img.src='data:'+(res.imageType||'image/jpeg')+';base64,'+res.data;
                img.alt='producto';
                var ph=card.querySelector('[data-ph]');
                var box=card.querySelector('.pl-img');
                if(ph&&ph.parentNode)ph.parentNode.removeChild(ph);
                if(box)box.insertBefore(img,box.firstChild);
              }).catch(function(){});
            })(cards[i]);
          }

          /* Category chips */
          var cats=[],seen={};
          for(var j=0;j<cards.length;j++){
            var c=(cards[j].getAttribute("data-cat")||'').trim();
            if(c&&!seen[c]){seen[c]=1;cats.push(c);}
          }
          var chipsBox=document.getElementById("plChips");
          var activeCat='';
          if(cats.length>0&&chipsBox){
            var mk=function(label,val){
              var b=document.createElement("button");
              b.className="pl-chip"+(val===''?" pl-on":"");
              b.textContent=label;
              b.addEventListener("click",function(){
                activeCat=(activeCat===val?'':val);
                var all=chipsBox.querySelectorAll(".pl-chip");
                for(var k=0;k<all.length;k++)all[k].classList.remove("pl-on");
                if(activeCat===val)b.classList.add("pl-on");
                applyFilter();
              });
              chipsBox.appendChild(b);
            };
            mk('Todos','');
            for(var m=0;m<cats.length;m++)mk(cats[m],cats[m]);
          }else if(chipsBox){chipsBox.style.display='none';}

          /* Search + filter */
          var input=document.getElementById("plSearch");
          function applyFilter(){
            var q=(input.value||'').toLowerCase().trim();
            for(var n=0;n<cards.length;n++){
              var el=cards[n];
              var okQ=!q||((el.getAttribute("data-name")||'')+' '+(el.getAttribute("data-brand")||'')).indexOf(q)>=0;
              var okC=!activeCat||(el.getAttribute("data-cat")||'')===activeCat;
              el.style.display=(okQ&&okC)?'':'none';
            }
          }
          if(input)input.addEventListener("input",applyFilter);
        })();
      ` }} />
    </>
  );
}
