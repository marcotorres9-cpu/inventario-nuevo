/* Página pública de producto (/c/[slug]) — lógica interactiva.
   Cargada con next/script afterInteractive para que React no borre el DOM
   insertado durante la hidratación (causa raíz de "sin imágenes" y sticky roto). */
(function(){
  function init(){
    var gal0=document.getElementById("catpgGallery");
    var IMG_IDS=[];
    if(gal0){
      try{ IMG_IDS=JSON.parse(gal0.getAttribute("data-imgs")||"[]")||[]; }catch(e){ IMG_IDS=[]; }
    }
    var slides,cur=0,dots,totalSlides,counter;
    var bb=document.getElementById("catpgBackBtn");if(bb){bb.href='javascript:history.back()';bb.addEventListener('click',function(e){e.preventDefault();if(window.history.length>1){window.history.back();}else{window.location.href='/';}});}
    /* Sticky medidas: toggle 'catpg-stuck' when the sentinel scrolls out of view */
    var _ms=document.getElementById("catpgMeasure"),_mSent=document.getElementById("catpgMeasureSentinel");
    if(_ms&&_mSent){
      var _mStuck=false;
      var _mOnScroll=function(){
        var stuck=_mSent.getBoundingClientRect().top<=0;
        if(stuck!==_mStuck){
          _mStuck=stuck;
          if(stuck){_ms.classList.add("catpg-stuck");}else{_ms.classList.remove("catpg-stuck");}
        }
      };
      window.addEventListener("scroll",_mOnScroll,{passive:true});
      _mOnScroll();
      /* Fallback for WebViews without position:sticky — emulate with fixed positioning */
      var _stickyOK=false;
      try{ _stickyOK=window.CSS&&CSS.supports&&(CSS.supports("position","sticky")||CSS.supports("position","-webkit-sticky")); }catch(e){}
      if(!_stickyOK){
        var _spacer=null,_fixed=false;
        var _wrap=_ms.parentNode;
        var _fix=function(){
          var sr=_ms.getBoundingClientRect();
          var pr=_wrap.getBoundingClientRect();
          var shouldFix=_mSent.getBoundingClientRect().top<=0&&pr.bottom>80;
          if(shouldFix&&!_fixed){
            _fixed=true;
            var _left=sr.left,_top=0,_w=sr.width,_h=sr.height;
            _spacer=document.createElement("div");
            _spacer.style.height=_h+"px";
            _wrap.insertBefore(_spacer,_ms);
            _ms.style.position="fixed";
            _ms.style.top=_top+"px";
            _ms.style.left=_left+"px";
            _ms.style.width=_w+"px";
            _ms.style.zIndex="50";
            _ms.style.background="#fff";
            _ms.style.boxShadow="0 4px 12px rgba(0,0,0,0.12)";
            _ms.style.paddingLeft="16px";
            _ms.style.paddingRight="16px";
            _ms.style.boxSizing="border-box";
            _ms.style.marginLeft="-16px";
            _ms.style.marginRight="-16px";
          }else if(!shouldFix&&_fixed){
            _fixed=false;
            _ms.style.position="";_ms.style.top="";_ms.style.left="";_ms.style.width="";
            _ms.style.zIndex="";_ms.style.background="";_ms.style.boxShadow="";
            _ms.style.paddingLeft="";_ms.style.paddingRight="";
            _ms.style.boxSizing="";_ms.style.marginLeft="";_ms.style.marginRight="";
            if(_spacer&&_spacer.parentNode){_wrap.removeChild(_spacer);}
            _spacer=null;
          }
        };
        window.addEventListener("scroll",_fix,{passive:true});
        window.addEventListener("resize",_fix,{passive:true});
        _fix();
      }
    }
    slides=document.querySelectorAll(".catpg-slide");
    dots=document.querySelectorAll(".catpg-dot");
    totalSlides=slides.length;
    counter=document.getElementById("catpgCounter");

    function loadImg(imgId,idx){
      fetch('/api/catalog-upload?id='+encodeURIComponent(imgId))
      .then(function(r){return r.json();})
      .then(function(res){
        if(!res.data)return;
        var src='data:'+(res.imageType||'image/jpeg')+';base64,'+res.data;
        var slide=slides[idx];
        if(slide){var loading=slide.querySelector('.catpg-img-loading');if(loading)loading.remove();var img=document.createElement('img');img.src=src;img.alt='producto';slide.appendChild(img);}
        var thumb=document.querySelector('.catpg-thumb[data-img-id="'+imgId+'"]');
        if(thumb){thumb.src=src;}
      }).catch(function(){});
    }
    for(var li=0;li<IMG_IDS.length;li++){loadImg(IMG_IDS[li],li);}

    function go(n){
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
      dots[i].addEventListener("click",function(e){e.stopPropagation();go(parseInt(this.getAttribute("data-idx")));});
    }

    // Thumbnail click handlers
    var thumbs=document.querySelectorAll(".catpg-thumb");
    for(var i=0;i<thumbs.length;i++){
      thumbs[i].addEventListener("click",function(e){
        e.stopPropagation();
        go(parseInt(this.getAttribute("data-idx")));
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
        var targetId=this.getAttribute("data-target");
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
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
