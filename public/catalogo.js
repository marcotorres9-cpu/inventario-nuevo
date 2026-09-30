/* Catálogo público — lógica interactiva (cargada con next/script afterInteractive
   para que React no borre el DOM insertado durante la hidratación) */
(function(){
  function init(){
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
    var ICONS={televisor:'📺',tv:'📺',televisores:'📺',celular:'📱',celulares:'📱',smartphone:'📱','teléfono':'📱','teléfonos':'📱',phone:'📱',laptop:'💻',computadora:'💻',notebook:'💻',tablet:'📲',tablets:'📲','audífono':'🎧','audífonos':'🎧',auricular:'🎧',auriculares:'🎧',audio:'🎧',accesorio:'🔌',accesorios:'🔌',cables:'🔌',smartwatch:'⌚',reloj:'⌚',relojes:'⌚','cámara':'📷','cámaras':'📷',camara:'📷',camaras:'📷',refrigerador:'🧊',refrigeradores:'🧊',nevera:'🧊',neveras:'🧊',lavadora:'🫧',lavadoras:'🫧',cocina:'🍳',estufa:'🍳',horno:'🍳',microondas:'🍳',consola:'🎮',videojuego:'🎮',impresora:'🖨️',impresoras:'🖨️',hogar:'🏠',mueble:'🪑',muebles:'🪑',herramienta:'🔧',herramientas:'🔧',deporte:'⚽',deportes:'⚽',juguete:'🧸',juguetes:'🧸',otros:'📋'};
    function catIcon(n){if(!n)return'📋';var l=n.toLowerCase().trim();if(ICONS[l])return ICONS[l];for(var k in ICONS){if(l.indexOf(k)>=0||k.indexOf(l)>=0)return ICONS[k];}return'📋';}

    var grid=document.getElementById("plGrid");
    var chipsBox=document.getElementById("plChips");
    var brandBox=document.getElementById("plBrandChips");
    var countEl=document.getElementById("plCount");
    var noRes=document.getElementById("plNoRes");
    var input=document.getElementById("plSearch");
    var sortSel=document.getElementById("plSort");
    if(!grid)return;

    /* Collect categories */
    var cardsAll=[].slice.call(document.querySelectorAll(".pl-card"));
    var cats=[],seenC={};
    for(var j=0;j<cardsAll.length;j++){
      var c=(cardsAll[j].getAttribute("data-cat")||'').trim();
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
      for(var n=0;n<cardsAll.length;n++){
        var cc=(cardsAll[n].getAttribute("data-cat")||'').trim();
        if(cc!==activeCat)continue;
        var br=(cardsAll[n].getAttribute("data-brand")||'').trim();
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

    /* Sort (DOM reorder) */
    function applySort(){
      var arr=cardsAll.slice(0);
      if(_sort==='name')arr.sort(function(a,b){return (a.getAttribute('data-name')||'').localeCompare(b.getAttribute('data-name')||'');});
      else if(_sort==='price-asc')arr.sort(function(a,b){return (parseFloat(a.getAttribute('data-price'))||0)-(parseFloat(b.getAttribute('data-price'))||0);});
      else if(_sort==='price-desc')arr.sort(function(a,b){return (parseFloat(b.getAttribute('data-price'))||0)-(parseFloat(a.getAttribute('data-price'))||0);});
      else if(_sort==='discount')arr.sort(function(a,b){return (parseInt(b.getAttribute('data-disc'),10)||0)-(parseInt(a.getAttribute('data-disc'),10)||0);});
      for(var s=0;s<arr.length;s++)grid.appendChild(arr[s]);
    }

    /* Filter + count */
    function applyFilter(){
      var visible=0;
      for(var n=0;n<cardsAll.length;n++){
        var el=cardsAll[n];
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

    /* ==================== CARRITO / PEDIDO POR WHATSAPP ==================== */
    function escH(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    function fmtN(n){return (Math.round(n*100)/100).toLocaleString('es-MX');}

    var PHONE='',STORE='';
    try{
      var wrapEl=document.querySelector('.pl-wrap');
      if(wrapEl){PHONE=wrapEl.getAttribute('data-phone')||'';STORE=wrapEl.getAttribute('data-store')||'';}
    }catch(e){}

    var cart=[];
    try{ cart=JSON.parse(localStorage.getItem('catCart')||'[]'); }catch(e){ cart=[]; }
    if(!cart||typeof cart.length!=='number'||!cart.push)cart=[];
    function cartSave(){ try{ localStorage.setItem('catCart',JSON.stringify(cart)); }catch(e){} updateFab(); }
    function cartTotal(){ var t=0; for(var i=0;i<cart.length;i++)t+=(cart[i].price||0)*cart[i].qty; return t; }
    function cartCount(){ var n=0; for(var i=0;i<cart.length;i++)n+=cart[i].qty; return n; }

    /* Toast */
    var _toastT=null;
    function showToast(msg){
      var t=document.getElementById('plToast');
      if(!t){ t=document.createElement('div'); t.id='plToast'; t.className='pl-toast'; document.body.appendChild(t); }
      t.textContent=msg; t.className='pl-toast pl-toast-show';
      clearTimeout(_toastT); _toastT=setTimeout(function(){ t.className='pl-toast'; },1600);
    }

    /* Botones + de las tarjetas */
    var addBtns=document.querySelectorAll('.pl-add');
    for(var ab=0;ab<addBtns.length;ab++){
      (function(btn){
        btn.addEventListener('click',function(e){
          e.preventDefault();e.stopPropagation();
          var slug=btn.getAttribute('data-slug')||'',name=btn.getAttribute('data-name')||'';
          var price=parseFloat(btn.getAttribute('data-price'))||0;
          var found=null;
          for(var i=0;i<cart.length;i++){ if(cart[i].slug===slug){found=cart[i];break;} }
          if(found)found.qty++; else cart.push({slug:slug,name:name,price:price,qty:1});
          cartSave(); showToast('✓ '+name+' agregado al pedido');
        });
      })(addBtns[ab]);
    }

    /* Botón flotante del carrito */
    var fab=document.createElement('button');
    fab.id='plCartFab'; fab.className='pl-fab'; fab.setAttribute('aria-label','Ver mi pedido');
    fab.innerHTML='<span>🛒</span><span class="pl-fab-badge" id="plCartBadge">0</span>';
    fab.addEventListener('click',function(){ openCart(); });
    document.body.appendChild(fab);
    function updateFab(){
      var b=document.getElementById('plCartBadge');
      if(b)b.textContent=String(cartCount());
      fab.style.display=cartCount()>0?'flex':'none';
    }
    updateFab();

    /* Panel del pedido */
    var _cartOv=null;
    function openCart(){
      closeCart();
      _cartOv=document.createElement('div');
      _cartOv.className='pl-cart-ov';
      var h='<div class="pl-cart-sheet">';
      h+='<div class="pl-cart-head"><div><div class="pl-cart-title">Tu pedido</div>';
      h+='<div class="pl-cart-sub">'+(STORE?escH(STORE)+' · ':'')+cartCount()+' producto'+(cartCount()!==1?'s':'')+'</div></div>';
      h+='<button class="pl-cart-x" data-act="close">✕</button></div>';
      if(cart.length===0){
        h+='<div class="pl-cart-empty"><div class="ico">🛒</div>Tu pedido está vacío.<br/>Agrega productos con el botón + del catálogo.</div>';
        h+='<div class="pl-cart-foot"></div>';
      }else{
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
        h+='<div class="pl-cart-total"><span>Total <button class="pl-cart-clear" data-act="clear">vaciar</button></span><b>$'+fmtN(cartTotal())+'</b></div>';
        h+='<button class="pl-cart-send" data-act="send">📲 Enviar pedido por WhatsApp</button>';
        h+='</div>';
      }
      h+='</div>';
      _cartOv.innerHTML=h;
      _cartOv.addEventListener('click',function(e){
        var el=e.target;
        while(el&&el!==_cartOv&&!el.getAttribute('data-act'))el=el.parentNode;
        if(!el||el===_cartOv){ if(e.target===_cartOv)closeCart(); return; }
        var act=el.getAttribute('data-act'),idx=parseInt(el.getAttribute('data-i'),10);
        if(act==='close'){ closeCart(); }
        else if(act==='inc'&&cart[idx]){ cart[idx].qty++; cartSave(); openCart(); }
        else if(act==='dec'&&cart[idx]){ cart[idx].qty--; if(cart[idx].qty<=0)cart.splice(idx,1); cartSave(); openCart(); }
        else if(act==='del'&&cart[idx]){ cart.splice(idx,1); cartSave(); openCart(); }
        else if(act==='clear'){ cart=[]; cartSave(); closeCart(); showToast('Pedido vaciado'); }
        else if(act==='send'){ sendOrder(); }
      });
      document.body.appendChild(_cartOv);
    }
    function closeCart(){
      if(_cartOv&&_cartOv.parentNode){ _cartOv.parentNode.removeChild(_cartOv); }
      _cartOv=null;
    }

    /* Enviar pedido por WhatsApp */
    function waPhone(){
      var d=String(PHONE||'').replace(/[^0-9]/g,'');
      if(d.indexOf('00')===0&&d.length>4)return d.substring(2);
      if(d.charAt(0)==='0'&&d.length>=9)return '593'+d.substring(1);
      return d;
    }
    function buildMsg(){
      var L=[];
      L.push('Hola! Quiero hacer un pedido'+(STORE?' en '+STORE:'')+':');
      L.push('');
      for(var i=0;i<cart.length;i++){
        L.push((i+1)+'. '+cart[i].qty+'x '+cart[i].name+' — $'+fmtN(cart[i].price*cart[i].qty));
      }
      L.push('');
      L.push('Total: $'+fmtN(cartTotal()));
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
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
