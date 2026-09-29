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
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
