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

const PILL_COLORS = [
  { fg: '#6c5ce7', bg: 'rgba(108,92,231,0.12)' },
  { fg: '#00875f', bg: 'rgba(0,184,148,0.12)' },
  { fg: '#0984e3', bg: 'rgba(9,132,227,0.12)' },
  { fg: '#c2410c', bg: 'rgba(225,112,85,0.14)' },
  { fg: '#b7791f', bg: 'rgba(253,203,110,0.25)' },
];

export default async function PublicCatalogPage() {
  type Item = {
    slug: string; name: string; brand: string; category: string;
    price: number; costPrice: number; specs: string[]; imgId: string; color: string; discount: number;
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
      const discount = (costPrice > 0 && price > 0 && price < costPrice)
        ? Math.round((1 - price / costPrice) * 100) : 0;
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
        price, costPrice, discount,
        specs,
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
        .pl-toolbar{position:sticky;top:0;z-index:60;background:#f5f6f8;padding:10px 14px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.06);}
        .pl-search{width:100%;padding:11px 14px 11px 38px;border-radius:12px;border:1.5px solid #e0e3e8;background:#fff;font-size:14px;outline:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239aa0a6' stroke-width='2.5' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cline x1='21' y1='21' x2='16.5' y2='16.5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:13px center;}
        .pl-search:focus{border-color:#16a34a;}
        .pl-chips{display:flex;gap:6px;overflow-x:auto;padding-top:8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
        .pl-chips::-webkit-scrollbar{display:none;}
        .pl-chip{flex-shrink:0;padding:6px 14px;border-radius:18px;border:1.5px solid #e0e3e8;background:#fff;font-size:12px;font-weight:600;color:#5f6368;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;}
        .pl-chip.pl-on{background:#16a34a;border-color:#16a34a;color:#fff;}
        .pl-chips2{display:flex;gap:6px;overflow-x:auto;padding-top:8px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
        .pl-chips2::-webkit-scrollbar{display:none;}
        .pl-chip2{flex-shrink:0;padding:5px 12px;border-radius:14px;border:1px solid #e0e3e8;background:#fff;font-size:11px;font-weight:600;color:#5f6368;cursor:pointer;white-space:nowrap;}
        .pl-chip2.pl-on{background:#0A2540;border-color:#0A2540;color:#fff;}
        .pl-meta{display:flex;align-items:center;justify-content:space-between;margin-top:9px;gap:8px;}
        .pl-count{font-size:11px;color:#9aa0a6;font-weight:600;flex:1;min-width:0;}
        .pl-sort{flex-shrink:0;padding:6px 8px;border-radius:9px;border:1px solid #e0e3e8;background:#fff;color:#44474b;font-size:11px;cursor:pointer;outline:none;-webkit-appearance:none;appearance:none;max-width:52%;}
        .pl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:12px 14px 0;}
        @media(min-width:480px){.pl-grid{grid-template-columns:repeat(3,1fr);}}
        .pl-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.07);display:flex;flex-direction:column;text-decoration:none;position:relative;}
        .pl-card:active{transform:scale(0.98);}
        .pl-img{aspect-ratio:1;background:#f0f0f0;display:flex;align-items:center;justify-content:center;position:relative;}
        .pl-img img{width:100%;height:100%;object-fit:contain;}
        .pl-ph{font-size:40px;opacity:0.18;}
        .pl-disc{position:absolute;top:8px;left:8px;background:#e53935;color:#fff;font-size:10px;font-weight:800;padding:3px 7px;border-radius:8px;z-index:2;}
        .pl-body{padding:10px 12px 12px;display:flex;flex-direction:column;flex:1;}
        .pl-bc{font-size:10px;color:#9aa0a6;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .pl-name{font-size:13px;font-weight:700;color:#111;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:35px;}
        .pl-price-row{margin-top:6px;}
        .pl-price-old{font-size:11px;color:#b9bec6;text-decoration:line-through;margin-right:5px;}
        .pl-price{font-size:16px;font-weight:800;color:#16a34a;}
        .pl-pills{display:flex;flex-wrap:wrap;gap:3px;margin-top:7px;}
        .pl-pill{font-size:9px;font-weight:600;padding:2px 7px;border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;}
        .pl-pill-more{font-size:9px;color:#16a34a;font-weight:700;padding:2px 5px;}
        .pl-ver{margin-top:9px;background:#0A2540;color:#fff;border:none;border-radius:9px;padding:8px 0;font-size:12px;font-weight:700;cursor:pointer;text-align:center;text-decoration:none;display:block;}
        .pl-empty{text-align:center;padding:50px 20px;color:#9aa0a6;}
        .pl-empty .ico{font-size:48px;margin-bottom:10px;}
        .pl-nores{display:none;text-align:center;padding:46px 20px;color:#5f6368;}
        .pl-nores .ico{font-size:44px;margin-bottom:10px;}
        .pl-nores b{font-size:15px;display:block;}
        .pl-nores span{font-size:12px;color:#9aa0a6;margin-top:4px;display:block;}
        .pl-footer{text-align:center;padding:20px;font-size:11px;color:#c3c8cf;}
      ` }} />

      <div className="pl-back">
        <a className="pl-back-btn" id="plBackBtn" href="#">&#8592;</a>
      </div>

      <div className="pl-wrap">
        <div className="pl-hero">
          <span className="pl-hero-tag">Catálogo</span>
          <h1>{esc(storeName || 'Nuestros productos')}</h1>
          <div className="pl-hero-sub">{items.length} producto{items.length === 1 ? '' : 's'} en catálogo</div>
        </div>

        <div className="pl-toolbar">
          <input type="text" id="plSearch" className="pl-search" placeholder="Buscar producto, marca, categoría..." />
          <div className="pl-chips" id="plChips"></div>
          <div className="pl-chips2" id="plBrandChips" style={{ display: 'none' }}></div>
          <div className="pl-meta">
            <div className="pl-count" id="plCount"></div>
            <select className="pl-sort" id="plSort">
              <option value="name">Nombre A-Z</option>
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
              <option value="discount">Mayor descuento</option>
            </select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="pl-empty"><div className="ico">📖</div>Catálogo vacío por el momento</div>
        ) : (
          <>
            <div className="pl-nores" id="plNoRes">
              <div className="ico">🔍</div>
              <b>Sin resultados</b>
              <span>Intenta con otro filtro o búsqueda.</span>
            </div>
            <div className="pl-grid" id="plGrid">
              {items.map((it, i) => {
                const showSpecs = it.specs.slice(0, 3);
                const extra = it.specs.length - showSpecs.length;
                return (
                  <a key={i} className="pl-card" href={`/c/${esc(it.slug)}`}
                     data-name={esc(it.name.toLowerCase())} data-brand={esc(it.brand.toLowerCase())}
                     data-cat={esc(it.category)} data-img-id={esc(it.imgId)}
                     data-price={it.price} data-disc={it.discount}>
                    {it.discount > 0 && <span className="pl-disc">-{it.discount}%</span>}
                    <div className="pl-img"><span className="pl-ph" data-ph>📦</span></div>
                    <div className="pl-body">
                      {(it.brand || it.category) && (
                        <div className="pl-bc">{esc(it.brand)}{it.brand && it.category ? ' · ' : ''}{esc(it.category)}</div>
                      )}
                      <div className="pl-name">{esc(it.name)}</div>
                      {it.price > 0 && (
                        <div className="pl-price-row">
                          {it.discount > 0 && <span className="pl-price-old">${fmtDec(it.costPrice)}</span>}
                          <span className="pl-price">${fmtDec(it.price)}</span>
                        </div>
                      )}
                      {showSpecs.length > 0 && (
                        <div className="pl-pills">
                          {showSpecs.map((s, j) => (
                            <span key={j} className="pl-pill" style={{ color: PILL_COLORS[j % 5].fg, background: PILL_COLORS[j % 5].bg }}>{esc(s)}</span>
                          ))}
                          {extra > 0 && <span className="pl-pill-more">+{extra}</span>}
                        </div>
                      )}
                      <span className="pl-ver">Ver detalle</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}

        <div className="pl-footer">{esc(storeName || '')}</div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          var bb=document.getElementById("plBackBtn");
          if(bb){bb.addEventListener('click',function(e){e.preventDefault();if(window.history.length>1){window.history.back();}else{window.location.href='/';}});}

          /* Load thumbnails */
          var cards=[].slice.call(document.querySelectorAll(".pl-card[data-img-id]"));
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

          /* Category icons (same mapping as the app) */
          var ICONS={televisor:'📺',tv:'📺',televisores:'📺',celular:'📱',celulares:'📱',smartphone:'📱',teléfono:'📱',teléfonos:'📱',phone:'📱',laptop:'💻',computadora:'💻',notebook:'💻',tablet:'📲',tablets:'📲','audífono':'🎧','audífonos':'🎧',auricular:'🎧',auriculares:'🎧',audio:'🎧',accesorio:'🔌',accesorios:'🔌',cables:'🔌',smartwatch:'⌚',reloj:'⌚',relojes:'⌚','cámara':'📷','cámaras':'📷',camara:'📷',camaras:'📷',refrigerador:'🧊',refrigeradores:'🧊',nevera:'🧊',neveras:'🧊',lavadora:'🫧',lavadoras:'🫧',cocina:'🍳',estufa:'🍳',horno:'🍳',microondas:'🍳',consola:'🎮',videojuego:'🎮',impresora:'🖨️',impresoras:'🖨️',hogar:'🏠',mueble:'🪑',muebles:'🪑',herramienta:'🔧',herramientas:'🔧',deporte:'⚽',deportes:'⚽',juguete:'🧸',juguetes:'🧸',otros:'📋'};
          function catIcon(n){if(!n)return'📋';var l=n.toLowerCase().trim();if(ICONS[l])return ICONS[l];for(var k in ICONS){if(l.indexOf(k)>=0||k.indexOf(l)>=0)return ICONS[k];}return'📋';}

          var grid=document.getElementById("plGrid");
          var chipsBox=document.getElementById("plChips");
          var brandBox=document.getElementById("plBrandChips");
          var countEl=document.getElementById("plCount");
          var noRes=document.getElementById("plNoRes");
          var input=document.getElementById("plSearch");
          var sortSel=document.getElementById("plSort");

          /* Collect categories */
          var cats=[],seenC={};
          for(var j=0;j<cards.length;j++){
            var c=(cards[j].getAttribute("data-cat")||'').trim();
            if(c&&!seenC[c]){seenC[c]=1;cats.push(c);}
          }
          var activeCat='',activeBrand='',_sort='name',_q='';

          /* Category chips */
          function renderCatChips(){
            var h='';
            var list=['Todos'].concat(cats);
            for(var m=0;m<list.length;m++){
              var cn=list[m];
              var val=(cn==='Todos')?'':cn;
              var icon=(cn==='Todos')?'📋':catIcon(cn);
              h+='<button class="pl-chip'+((activeCat===val)?' pl-on':'')+'" data-cat="'+cn.replace(/"/g,'&quot;')+'">'+icon+' '+cn+'</button>';
            }
            chipsBox.innerHTML=h;
            var btns=chipsBox.querySelectorAll('.pl-chip');
            for(var b=0;b<btns.length;b++){
              btns[b].addEventListener('click',function(){
                var v=this.getAttribute('data-cat');
                activeCat=(v==='Todos')?'':v;
                activeBrand='';
                renderCatChips();renderBrandChips();applyFilter();
              });
            }
          }

          /* Brand chips (only when a category is selected, like the app) */
          function renderBrandChips(){
            if(!activeCat){brandBox.style.display='none';brandBox.innerHTML='';return;}
            var brands=[],seen={};
            for(var n=0;n<cards.length;n++){
              var cc=(cards[n].getAttribute("data-cat")||'').trim();
              if(cc!==activeCat)continue;
              var br=(cards[n].getAttribute("data-brand")||'').trim();
              if(br&&!seen[br]){seen[br]=1;brands.push(br);}
            }
            if(brands.length<=1){brandBox.style.display='none';brandBox.innerHTML='';return;}
            var h='<button class="pl-chip2'+(!activeBrand?' pl-on':'')+'" data-br="">Todos</button>';
            for(var m=0;m<brands.length;m++){
              h+='<button class="pl-chip2'+((activeBrand===brands[m])?' pl-on':'')+'" data-br="'+brands[m].replace(/"/g,'&quot;')+'">'+brands[m]+'</button>';
            }
            brandBox.innerHTML=h;
            brandBox.style.display='flex';
            var b2=brandBox.querySelectorAll('.pl-chip2');
            for(var k=0;k<b2.length;k++){
              b2[k].addEventListener('click',function(){
                activeBrand=this.getAttribute('data-br')||'';
                renderBrandChips();applyFilter();
              });
            }
          }

          /* Sort (DOM reorder, like re-render) */
          function applySort(){
            var arr=cards.slice(0);
            if(_sort==='name')arr.sort(function(a,b){return (a.getAttribute('data-name')||'').localeCompare(b.getAttribute('data-name')||'');});
            else if(_sort==='price-asc')arr.sort(function(a,b){return (parseFloat(a.getAttribute('data-price'))||0)-(parseFloat(b.getAttribute('data-price'))||0);});
            else if(_sort==='price-desc')arr.sort(function(a,b){return (parseFloat(b.getAttribute('data-price'))||0)-(parseFloat(a.getAttribute('data-price'))||0);});
            else if(_sort==='discount')arr.sort(function(a,b){return (parseInt(b.getAttribute('data-disc'),10)||0)-(parseInt(a.getAttribute('data-disc'),10)||0);});
            for(var s=0;s<arr.length;s++)grid.appendChild(arr[s]);
          }

          /* Filter + count */
          function applyFilter(){
            var visible=0;
            for(var n=0;n<cards.length;n++){
              var el=cards[n];
              var hay=(el.getAttribute("data-name")||'')+' '+(el.getAttribute("data-brand")||'')+' '+(el.getAttribute("data-cat")||'');
              var okQ=!_q||hay.indexOf(_q)>=0;
              var okC=!activeCat||(el.getAttribute("data-cat")||'')===activeCat;
              var okB=!activeBrand||(el.getAttribute("data-brand")||'')===activeBrand;
              var ok=(okQ&&okC&&okB);
              el.style.display=ok?'':'none';
              if(ok)visible++;
            }
            if(countEl)countEl.textContent=visible+' resultado'+(visible!==1?'s':'');
            if(noRes){noRes.style.display=visible===0?'block':'none';}
            if(grid){grid.style.display=visible===0?'none':'';}
          }

          if(input){
            var tmr=null;
            input.addEventListener('input',function(){
              clearTimeout(tmr);
              tmr=setTimeout(function(){_q=(input.value||'').toLowerCase().trim();applyFilter();},200);
            });
          }
          if(sortSel)sortSel.addEventListener('change',function(){_sort=this.value;applySort();});

          if(cats.length>0)renderCatChips();
          applySort();
          applyFilter();
        })();
      ` }} />
    </>
  );
}
