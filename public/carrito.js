/* Carrito compartido del catálogo público (/catalogo y /c/[slug]).
   Autocontenido: inyecta su propio CSS y crea el botón flotante, la barra
   "Pedido guardado" y el panel del pedido en cualquiera de las dos páginas.
   - Estado en localStorage (catCart): el pedido queda guardado en el teléfono
     del cliente para que lo complete o lo modifique cuando quiera.
   - Nombre del cliente (catClientName): identifica cada pedido en el WhatsApp
     de la tienda (además del número desde el que se envía).
   Cargada con next/script strategy="afterInteractive" (post-hidratación, ES5). */
(function(){
  var CSS = ''
    + '.pl-add{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:50%;background:#16a34a;color:#fff;border:none;font-size:20px;font-weight:700;line-height:1;cursor:pointer;z-index:3;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.28);padding:0;}'
    + '.pl-add:active{transform:scale(0.88);}'
    + '.pl-add[data-q]:not([data-q=""])::after{content:attr(data-q);position:absolute;top:-5px;right:-5px;background:#e53935;color:#fff;font-size:10px;font-weight:800;min-width:17px;height:17px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 1px 3px rgba(0,0,0,0.3);}'
    + '.catpg-addbtn{display:block;width:100%;background:#16a34a;color:#fff;border:none;border-radius:12px;padding:14px 0;font-size:15px;font-weight:800;cursor:pointer;margin:2px 0 16px;font-family:inherit;}'
    + '.catpg-addbtn:active{transform:scale(0.98);}'
    + '.pl-fab{position:fixed;bottom:20px;right:16px;width:58px;height:58px;border-radius:50%;background:#16a34a;color:#fff;border:none;font-size:25px;cursor:pointer;z-index:120;display:none;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,0.32);padding:0;}'
    + '.pl-fab:active{transform:scale(0.93);}'
    + '.pl-fab-badge{position:absolute;top:-4px;right:-4px;background:#e53935;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;padding:0 5px;}'
    + '.pl-bar{position:fixed;bottom:20px;left:16px;right:86px;background:#0A2540;color:#fff;border-radius:14px;padding:10px 12px;display:none;align-items:center;gap:10px;z-index:119;box-shadow:0 4px 14px rgba(0,0,0,0.28);cursor:pointer;}'
    + '.pl-bar-main{flex:1;min-width:0;}'
    + '.pl-bar-t{display:block;font-size:12px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '.pl-bar-s{display:block;font-size:11px;opacity:0.75;margin-top:1px;}'
    + '.pl-bar-x{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.16);color:#fff;border:none;font-size:12px;cursor:pointer;flex-shrink:0;padding:0;line-height:1;}'
    + '.pl-toast{position:fixed;bottom:92px;left:50%;transform:translateX(-50%) translateY(10px);background:#0A2540;color:#fff;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;opacity:0;transition:all .25s ease;z-index:130;pointer-events:none;max-width:86%;text-align:center;}'
    + '.pl-toast-show{opacity:1;transform:translateX(-50%) translateY(0);}'
    + '.pl-cart-ov{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:140;display:flex;align-items:flex-end;justify-content:center;}'
    + '.pl-cart-sheet{background:#fff;width:100%;max-width:600px;max-height:84vh;border-radius:18px 18px 0 0;display:flex;flex-direction:column;overflow:hidden;}'
    + '.pl-cart-head{padding:16px 18px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eef0f3;flex-shrink:0;}'
    + '.pl-cart-title{font-size:18px;font-weight:800;color:#0A2540;}'
    + '.pl-cart-sub{font-size:11px;color:#9aa0a6;margin-top:2px;}'
    + '.pl-cart-x{width:32px;height:32px;border-radius:50%;background:#f1f3f4;border:none;font-size:15px;cursor:pointer;color:#5f6368;flex-shrink:0;}'
    + '.pl-cart-namebox{padding:12px 18px 0;flex-shrink:0;}'
    + '.pl-cart-name{width:100%;padding:11px 12px;border-radius:10px;border:1.5px solid #e0e3e8;font-size:14px;outline:none;background:#fff;color:#111;-webkit-appearance:none;appearance:none;font-family:inherit;box-sizing:border-box;}'
    + '.pl-cart-name:focus{border-color:#16a34a;}'
    + '.pl-cart-list{flex:1;overflow-y:auto;padding:6px 18px;-webkit-overflow-scrolling:touch;}'
    + '.pl-row{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #f2f4f7;}'
    + '.pl-row-info{flex:1;min-width:0;}'
    + '.pl-row-name{font-size:13px;font-weight:700;color:#111;line-height:1.3;}'
    + '.pl-row-unit{font-size:11px;color:#9aa0a6;margin-top:2px;}'
    + '.pl-stepper{display:flex;align-items:center;gap:8px;flex-shrink:0;}'
    + '.pl-st{width:28px;height:28px;border-radius:50%;border:1.5px solid #16a34a;background:#fff;color:#16a34a;font-size:16px;font-weight:800;cursor:pointer;line-height:1;padding:0;display:flex;align-items:center;justify-content:center;}'
    + '.pl-qty{font-size:14px;font-weight:800;color:#111;min-width:18px;text-align:center;}'
    + '.pl-row-total{font-size:13px;font-weight:800;color:#0A2540;min-width:54px;text-align:right;flex-shrink:0;}'
    + '.pl-row-del{width:30px;height:30px;border-radius:8px;border:none;background:#feecec;font-size:14px;cursor:pointer;flex-shrink:0;padding:0;}'
    + '.pl-cart-foot{padding:12px 18px 18px;border-top:1px solid #eef0f3;background:#fff;flex-shrink:0;}'
    + '.pl-cart-total{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#5f6368;margin-bottom:10px;}'
    + '.pl-cart-total b{font-size:20px;color:#0A2540;}'
    + '.pl-cart-send{width:100%;background:#25D366;color:#fff;border:none;border-radius:12px;padding:14px 0;font-size:15px;font-weight:800;cursor:pointer;display:block;}'
    + '.pl-cart-send:active{transform:scale(0.98);}'
    + '.pl-cart-note{font-size:10.5px;color:#9aa0a6;text-align:center;margin-top:8px;}'
    + '.pl-cart-empty{text-align:center;padding:44px 20px;color:#9aa0a6;font-size:14px;}'
    + '.pl-cart-empty .ico{font-size:40px;margin-bottom:8px;}'
    + '.pl-cart-clear{background:none;border:none;color:#9aa0a6;font-size:12px;cursor:pointer;text-decoration:underline;padding:0;}';

  var LS_CART='catCart', LS_NAME='catClientName', SS_BAR='catBarHidden';
  var cart=[], PHONE='', STORE='', _ov=null, _toastT=null, _toast=null;

  function lsGet(k,d){ try{ return localStorage.getItem(k); }catch(e){ return d; } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
  function ssSet(k,v){ try{ sessionStorage.setItem(k,v); }catch(e){} }

  function load(){
    try{ cart=JSON.parse(lsGet(LS_CART,'[]')||'[]')||[]; }catch(e){ cart=[]; }
    if(!cart||typeof cart.length!=='number'||!cart.push)cart=[];
  }
  function save(){ lsSet(LS_CART, JSON.stringify(cart)); }
  function count(){ var n=0; for(var i=0;i<cart.length;i++)n+=(cart[i].qty||0); return n; }
  function total(){ var t=0; for(var i=0;i<cart.length;i++)t+=(cart[i].price||0)*(cart[i].qty||0); return t; }
  function findIt(slug){ for(var i=0;i<cart.length;i++){ if(cart[i].slug===slug)return i; } return -1; }
  function escH(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fmtN(n){ return (Math.round(n*100)/100).toLocaleString('es-MX'); }
  function getClientName(){ return String(lsGet(LS_NAME,'')||'').trim(); }

  function showToast(msg,ms){
    if(!_toast){ _toast=document.createElement('div'); _toast.id='plToast'; _toast.className='pl-toast'; document.body.appendChild(_toast); }
    _toast.textContent=msg; _toast.className='pl-toast pl-toast-show';
    clearTimeout(_toastT); _toastT=setTimeout(function(){ _toast.className='pl-toast'; }, ms||1600);
  }

  function add(slug,name,price){
    var i=findIt(slug);
    if(i>=0)cart[i].qty=(cart[i].qty||0)+1; else cart.push({slug:slug,name:name,price:price,qty:1});
    save(); updateAll();
    showToast('✓ '+name+' agregado al pedido');
  }

  function updateAll(){
    var c=count();
    var badge=document.getElementById('plCartBadge');
    if(badge)badge.textContent=String(c);
    var fab=document.getElementById('plCartFab');
    if(fab)fab.style.display=c>0?'flex':'none';
    /* Barra "pedido guardado" */
    var bar=document.getElementById('plCartBar');
    if(bar){
      var show=c>0&&!ssGet(SS_BAR);
      bar.style.display=show?'flex':'none';
      if(show){
        var t=bar.querySelector('.pl-bar-t'), s=bar.querySelector('.pl-bar-s');
        if(t)t.textContent='🛒 Pedido guardado · '+c+' producto'+(c!==1?'s':'');
        if(s)s.textContent='Toca para completarlo o enviarlo · $'+fmtN(total());
      }
    }
    /* Contador en los botones + de las tarjetas */
    var btns=document.querySelectorAll('.pl-add');
    for(var i=0;i<btns.length;i++){
      var fi=findIt(btns[i].getAttribute('data-slug'));
      btns[i].setAttribute('data-q', fi>=0?String(cart[fi].qty):'');
    }
    /* Texto del botón en la ficha del producto */
    var db=document.getElementById('catpgAddBtn');
    if(db){
      var fi2=findIt(db.getAttribute('data-slug'));
      var q=fi2>=0?cart[fi2].qty:0;
      db.textContent=q>0?('✓ En tu pedido ('+q+') · agregar otro'):('🛒 Agregar al pedido');
    }
  }

  /* ---------- Panel del pedido ---------- */
  function openPanel(){
    closePanel();
    _ov=document.createElement('div');
    _ov.className='pl-cart-ov';
    var h='<div class="pl-cart-sheet">';
    h+='<div class="pl-cart-head"><div><div class="pl-cart-title">Tu pedido</div>';
    h+='<div class="pl-cart-sub">'+(STORE?escH(STORE)+' · ':'')+count()+' producto'+(count()!==1?'s':'')+'</div></div>';
    h+='<button class="pl-cart-x" data-act="close">✕</button></div>';
    if(cart.length===0){
      h+='<div class="pl-cart-empty"><div class="ico">🛒</div>Tu pedido está vacío.<br/>Agrega productos con el botón + del catálogo.</div>';
      h+='<div class="pl-cart-foot"></div>';
    }else{
      h+='<div class="pl-cart-namebox"><input type="text" class="pl-cart-name" id="plCName" maxlength="40" placeholder="Tu nombre (para identificar tu pedido)" value="'+escH(getClientName())+'"></div>';
      h+='<div class="pl-cart-list">';
      for(var i=0;i<cart.length;i++){
        var it=cart[i];
        h+='<div class="pl-row">';
        h+='<div class="pl-row-info"><div class="pl-row-name">'+escH(it.name)+'</div><div class="pl-row-unit">$'+fmtN(it.price)+' c/u</div></div>';
        h+='<div class="pl-stepper"><button class="pl-st" data-act="dec" data-i="'+i+'">−</button><span class="pl-qty">'+it.qty+'</span><button class="pl-st" data-act="inc" data-i="'+i+'">+</button></div>';
        h+='<div class="pl-row-total">$'+fmtN(it.price*it.qty)+'</div>';
        h+='<button class="pl-row-del" data-act="del" data-i="'+i+'" aria-label="Quitar">🗑</button>';
        h+='</div>';
      }
      h+='</div>';
      h+='<div class="pl-cart-foot">';
      h+='<div class="pl-cart-total"><span>Total <button class="pl-cart-clear" data-act="clear">vaciar</button></span><b>$'+fmtN(total())+'</b></div>';
      h+='<button class="pl-cart-send" data-act="send">📲 Enviar pedido por WhatsApp</button>';
      h+='<div class="pl-cart-note">💾 Tu pedido queda guardado en este teléfono: vuelve cuando quieras para agregar o quitar productos.</div>';
      h+='</div>';
    }
    h+='</div>';
    _ov.innerHTML=h;
    var nameIn=_ov.querySelector('#plCName');
    if(nameIn){ nameIn.addEventListener('input',function(){ lsSet(LS_NAME,this.value); }); }
    _ov.addEventListener('click',function(e){
      var el=e.target;
      while(el&&el!==_ov&&!el.getAttribute('data-act'))el=el.parentNode;
      if(!el||el===_ov){ if(e.target===_ov)closePanel(); return; }
      var act=el.getAttribute('data-act'),idx=parseInt(el.getAttribute('data-i'),10);
      if(act==='close'){ closePanel(); }
      else if(act==='inc'&&cart[idx]){ cart[idx].qty++; save(); updateAll(); openPanel(); }
      else if(act==='dec'&&cart[idx]){ cart[idx].qty--; if(cart[idx].qty<=0)cart.splice(idx,1); save(); updateAll(); openPanel(); }
      else if(act==='del'&&cart[idx]){ cart.splice(idx,1); save(); updateAll(); openPanel(); }
      else if(act==='clear'){ cart=[]; save(); closePanel(); updateAll(); showToast('Pedido vaciado'); }
      else if(act==='send'){ sendOrder(); }
    });
    document.body.appendChild(_ov);
  }
  function closePanel(){
    if(_ov&&_ov.parentNode)_ov.parentNode.removeChild(_ov);
    _ov=null;
  }

  /* ---------- Envío por WhatsApp (mantiene el pedido guardado) ---------- */
  function waPhone(){
    var d=String(PHONE||'').replace(/[^0-9]/g,'');
    if(d.indexOf('00')===0&&d.length>4)return d.substring(2);
    if(d.charAt(0)==='0'&&d.length>=9)return '593'+d.substring(1);
    return d;
  }
  function buildMsg(){
    var name=getClientName();
    var L=[];
    L.push('Hola!'+(name?' Soy '+name+'.':'')+' Quiero hacer un pedido'+(STORE?' en '+STORE:'')+':');
    L.push('');
    for(var i=0;i<cart.length;i++){
      L.push((i+1)+'. '+cart[i].qty+'x '+cart[i].name+' — $'+fmtN(cart[i].price*cart[i].qty));
    }
    L.push('');
    L.push('Total: $'+fmtN(total()));
    L.push('');
    L.push('Enviado desde el catálogo web');
    return L.join('\n');
  }
  function sendOrder(){
    if(cart.length===0)return;
    var ph=waPhone();
    var url='https://wa.me/'+(ph?ph:'')+'?text='+encodeURIComponent(buildMsg());
    try{ window.open(url,'_blank'); }
    catch(e){ window.location.href=url; }
    closePanel();
    showToast('✓ Pedido enviado. Queda guardado para que agregues o quites productos', 3200);
  }

  /* ---------- UI base ---------- */
  function injectCss(){
    if(document.getElementById('catCartCss'))return;
    var st=document.createElement('style');
    st.id='catCartCss'; st.type='text/css';
    st.appendChild(document.createTextNode(CSS));
    document.head.appendChild(st);
  }
  function bindAddBtns(){
    var btns=document.querySelectorAll('.pl-add,#catpgAddBtn');
    for(var i=0;i<btns.length;i++){
      (function(btn){
        if(btn.getAttribute('data-cart-bound'))return;
        btn.setAttribute('data-cart-bound','1');
        btn.addEventListener('click',function(e){
          e.preventDefault(); e.stopPropagation();
          add(btn.getAttribute('data-slug')||'', btn.getAttribute('data-name')||'', parseFloat(btn.getAttribute('data-price'))||0);
        });
      })(btns[i]);
    }
  }
  function createFab(){
    if(document.getElementById('plCartFab'))return;
    var fab=document.createElement('button');
    fab.id='plCartFab'; fab.className='pl-fab'; fab.setAttribute('aria-label','Ver mi pedido');
    fab.innerHTML='<span>🛒</span><span class="pl-fab-badge" id="plCartBadge">0</span>';
    fab.addEventListener('click',function(){ openPanel(); });
    document.body.appendChild(fab);
  }
  function createBar(){
    if(document.getElementById('plCartBar'))return;
    var bar=document.createElement('div');
    bar.id='plCartBar'; bar.className='pl-bar'; bar.setAttribute('role','button');
    bar.innerHTML='<span class="pl-bar-main"><span class="pl-bar-t"></span><span class="pl-bar-s"></span></span>';
    var x=document.createElement('button');
    x.className='pl-bar-x'; x.setAttribute('aria-label','Ocultar aviso'); x.textContent='✕';
    x.addEventListener('click',function(e){ e.stopPropagation(); ssSet(SS_BAR,'1'); bar.style.display='none'; });
    bar.appendChild(x);
    bar.addEventListener('click',function(){ openPanel(); });
    document.body.appendChild(bar);
  }

  window.CatCart = {
    add: function(s,n,p){ add(s,n,p); },
    open: function(){ openPanel(); },
    count: count,
    total: total,
    items: function(){ return cart; },
    clientName: getClientName,
    refresh: updateAll
  };

  function init(){
    load();
    var wrap=document.querySelector('.pl-wrap')||document.querySelector('.catpg-wrap');
    if(wrap){
      PHONE=wrap.getAttribute('data-phone')||wrap.getAttribute('data-cart-phone')||'';
      STORE=wrap.getAttribute('data-store')||wrap.getAttribute('data-cart-store')||'';
    }
    injectCss();
    bindAddBtns();
    createFab();
    createBar();
    updateAll();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
