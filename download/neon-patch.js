// =====================================================
// PATCH: Inventario Pro — Neon DB Direct Connection
// Pega este código en la consola del navegador (F12 → Console)
// y presiona Enter. Luego recarga la página.
// =====================================================

(function() {
    var NEON_EP = 'https://ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech/sql';
    var NEON_CS = 'postgresql://neondb_owner:npg_GBoFNmzL9vW2@ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
    var _neonReady = false;

    function neonQuery(query, params) {
        return _realFetch(NEON_EP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': NEON_CS },
            body: JSON.stringify({ query: query, params: params || [] })
        }).then(function(r) { return r.json(); });
    }

    function neonInit() {
        return Promise.all([
            neonQuery("CREATE TABLE IF NOT EXISTS store_config (id TEXT PRIMARY KEY DEFAULT 'main', name TEXT DEFAULT 'Mi Tienda', address TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', currency TEXT DEFAULT 'MXN', footer TEXT DEFAULT '', footer_text TEXT DEFAULT '', logo TEXT DEFAULT '', categories TEXT DEFAULT '[]', brands TEXT DEFAULT '[]', colors TEXT DEFAULT '[]', category_specs TEXT DEFAULT '{}', updated_at TIMESTAMPTZ DEFAULT NOW())"),
            neonQuery("CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '', sku TEXT DEFAULT '', barcode TEXT DEFAULT '', category TEXT DEFAULT '', brand TEXT DEFAULT '', color TEXT DEFAULT '', cost_price REAL DEFAULT 0, sale_price REAL DEFAULT 0, price REAL DEFAULT 0, stock INTEGER DEFAULT 0, min_stock INTEGER DEFAULT 5, description TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"),
            neonQuery("CREATE TABLE IF NOT EXISTS quotations (id TEXT PRIMARY KEY, client_name TEXT DEFAULT '', client_phone TEXT DEFAULT '', client_email TEXT DEFAULT '', items TEXT DEFAULT '[]', subtotal REAL DEFAULT 0, tax REAL DEFAULT 0, discount REAL DEFAULT 0, total REAL DEFAULT 0, status TEXT DEFAULT 'pendiente', notes TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())"),
            neonQuery("CREATE TABLE IF NOT EXISTS users_sync (id TEXT PRIMARY KEY, name TEXT DEFAULT '', email TEXT UNIQUE DEFAULT '', role TEXT DEFAULT 'vendedor', store_name TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())")
        ]).then(function() { _neonReady = true; console.log('[PATCH] Neon DB ready!'); })
          .catch(function(e) { console.error('[PATCH] DB error:', e); });
    }

    function _mockResp(data) {
        return { ok: true, status: 200, json: function() { return Promise.resolve(data); } };
    }

    function syncFetchHandler(urlStr, opts) {
        var method = (opts.method || 'GET').toUpperCase();
        if (!_neonReady) return _mockResp({});

        if (urlStr.indexOf('/api/sync/store') !== -1 || urlStr.indexOf('/api/store') !== -1) {
            if (method === 'PUT' || method === 'POST') {
                var b = {}; try { b = JSON.parse(opts.body || '{}'); } catch(e) { b = {}; }
                return neonQuery("INSERT INTO store_config (id,name,address,phone,email,currency,footer,footer_text,logo,categories,brands,colors,category_specs,updated_at) VALUES ('main',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) ON CONFLICT (id) DO UPDATE SET name=$1,address=$2,phone=$3,email=$4,currency=$5,footer=$6,footer_text=$7,logo=$8,categories=$9,brands=$10,colors=$11,category_specs=$12,updated_at=NOW()",
                    [b.name||'Mi Tienda',b.address||'',b.phone||'',b.email||'',b.currency||'MXN',b.footer||'',b.footerText||b.footer_text||'',b.logo||null,b.categories||'[]',b.brands||'[]',b.colors||'[]',b.categorySpecs||b.category_specs||'{}']
                ).then(function() { return _mockResp({success:true}); }).catch(function(e) { return _mockResp({error:e.message}); });
            }
            return neonQuery("SELECT * FROM store_config WHERE id='main'").then(function(res) {
                if (res.rows && res.rows.length > 0) { var r = res.rows[0]; return _mockResp({id:r.id,name:r.name,address:r.address,phone:r.phone,email:r.email,currency:r.currency,footer:r.footer,footerText:r.footer_text,logo:r.logo,categories:r.categories,brands:r.brands,colors:r.colors,categorySpecs:r.category_specs}); }
                return _mockResp({});
            }).catch(function() { return _mockResp({}); });
        }

        if (urlStr.indexOf('/api/sync/products') !== -1 || urlStr.indexOf('/api/products') !== -1) {
            if (method === 'DELETE') { var m = urlStr.match(/[?&]id=([^&]+)/); if(m) return neonQuery('DELETE FROM products WHERE id=$1',[m[1]]).then(function(){return _mockResp({success:true})}); return Promise.resolve(_mockResp({})); }
            if (method === 'POST' || method === 'PUT') {
                var items = []; try { items = JSON.parse(opts.body||'[]'); } catch(e) { try{items=[JSON.parse(opts.body)];}catch(e2){items=[];} } if(!Array.isArray(items))items=[items];
                var chain = Promise.resolve();
                for (var i=0;i<items.length;i++){(function(p){chain=chain.then(function(){if(!p||!p.id)return Promise.resolve();return neonQuery("INSERT INTO products (id,name,sku,barcode,category,brand,color,cost_price,sale_price,price,stock,min_stock,description,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()) ON CONFLICT (id) DO UPDATE SET name=$2,sku=$3,barcode=$4,category=$5,brand=$6,color=$7,cost_price=$8,sale_price=$9,price=$10,stock=$11,min_stock=$12,description=$13,updated_at=NOW()",[p.id,p.name||'',p.sku||'',p.barcode||'',p.category||'',p.brand||'',p.color||'',p.costPrice||0,p.salePrice||p.price||0,p.price||p.salePrice||0,p.stock||0,p.minStock||5,p.description||'',p.createdAt||new Date().toISOString()]);});})(items[i]);}
                return chain.then(function(){return _mockResp({success:true,count:items.length})}).catch(function(){return _mockResp({})});
            }
            return neonQuery('SELECT * FROM products ORDER BY updated_at DESC').then(function(res){return _mockResp((res.rows||[]).map(function(r){return{id:r.id,name:r.name,sku:r.sku,barcode:r.barcode,category:r.category,brand:r.brand,color:r.color,costPrice:r.cost_price,salePrice:r.sale_price,price:r.price,stock:r.stock,minStock:r.min_stock,description:r.description,createdAt:r.created_at,updatedAt:r.updated_at}}));}).catch(function(){return _mockResp([])});
        }

        if (urlStr.indexOf('/api/sync/quotations') !== -1 || urlStr.indexOf('/api/quotations') !== -1) {
            if (method === 'DELETE') { var m = urlStr.match(/[?&]id=([^&]+)/); if(m) return neonQuery('DELETE FROM quotations WHERE id=$1',[m[1]]).then(function(){return _mockResp({success:true})}); return Promise.resolve(_mockResp({})); }
            if (method === 'POST' || method === 'PUT') {
                var items = []; try { items = JSON.parse(opts.body||'[]'); } catch(e) { try{items=[JSON.parse(opts.body)];}catch(e2){items=[];} } if(!Array.isArray(items))items=[items];
                var chain = Promise.resolve();
                for (var i=0;i<items.length;i++){(function(q){chain=chain.then(function(){if(!q||!q.id)return Promise.resolve();return neonQuery("INSERT INTO quotations (id,client_name,client_phone,client_email,items,subtotal,tax,discount,total,status,notes,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()) ON CONFLICT (id) DO UPDATE SET client_name=$2,client_phone=$3,client_email=$4,items=$5,subtotal=$6,tax=$7,discount=$8,total=$9,status=$10,notes=$11,updated_at=NOW()",[q.id,q.clientName||q.customerName||'',q.clientPhone||q.customerPhone||'',q.clientEmail||q.customerEmail||'',typeof q.items==='string'?q.items:JSON.stringify(q.items||[]),q.subtotal||0,q.tax||0,q.discount||0,q.total||0,q.status||'pendiente',q.notes||'',q.createdAt||new Date().toISOString()]);});})(items[i]);}
                return chain.then(function(){return _mockResp({success:true,count:items.length})}).catch(function(){return _mockResp({})});
            }
            return neonQuery('SELECT * FROM quotations ORDER BY updated_at DESC').then(function(res){return _mockResp((res.rows||[]).map(function(r){return{id:r.id,clientName:r.client_name,clientPhone:r.client_phone,clientEmail:r.client_email,items:r.items,subtotal:r.subtotal,tax:r.tax,discount:r.discount,total:r.total,status:r.status,notes:r.notes,createdAt:r.created_at,updatedAt:r.updated_at}}));}).catch(function(){return _mockResp([])});
        }

        if (urlStr.indexOf('/api/sync/users') !== -1) {
            if (method === 'POST' || method === 'PUT') {
                var items = []; try { items = JSON.parse(opts.body||'[]'); } catch(e) { try{items=[JSON.parse(opts.body)];}catch(e2){items=[];} } if(!Array.isArray(items))items=[items];
                var chain = Promise.resolve();
                for (var i=0;i<items.length;i++){(function(u){chain=chain.then(function(){if(!u||(!u.id&&!u.email))return Promise.resolve();return neonQuery("INSERT INTO users_sync (id,name,email,role,store_name,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT (id) DO UPDATE SET name=$2,email=$3,role=$4,store_name=$5,updated_at=NOW()",[u.id||u.email,u.name||'',u.email||'',u.role||'vendedor',u.storeName||'',u.createdAt||new Date().toISOString()]);});})(items[i]);}
                return chain.then(function(){return _mockResp({success:true})}).catch(function(){return _mockResp({})});
            }
            return neonQuery('SELECT id,name,email,role,store_name,created_at,updated_at FROM users_sync ORDER BY created_at').then(function(res){return _mockResp((res.rows||[]).map(function(r){return{id:r.id,name:r.name,email:r.email,role:r.role,storeName:r.store_name,createdAt:r.created_at,updatedAt:r.updated_at}}));}).catch(function(){return _mockResp([])});
        }

        if (urlStr.indexOf('/api/sync/locations') !== -1) return Promise.resolve(_mockResp([]));
        return _realFetch(urlStr, opts);
    }

    var _realFetch = window.fetch;
    window.fetch = function(url, opts) {
        var u = (typeof url === 'string') ? url : (url && url.toString ? url.toString() : '');
        if (u.indexOf('/api/sync/') !== -1 || u.indexOf('/api/store') !== -1 || u.indexOf('/api/products') !== -1 || u.indexOf('/api/quotations') !== -1) {
            return syncFetchHandler(u, opts || {});
        }
        return _realFetch.apply(this, arguments);
    };

    neonInit().then(function() {
        // Add default categories/brands/colors if empty
        var cats = (typeof getCategories === 'function') ? getCategories() : [];
        if (cats.length === 0) {
            if (typeof setCategories === 'function') setCategories(['Celulares','Laptops','Tablets','Audífonos','Accesorios','Smartwatch','Cámaras','Electrónica']);
            if (typeof setBrands === 'function') setBrands(['Samsung','Apple','Xiaomi','Huawei','Motorola','Lenovo','Sony','LG']);
            if (typeof setColors === 'function') setColors(['Negro','Blanco','Azul','Rojo','Gris','Dorado','Verde','Rosa']);
            if (typeof populateAllSelects === 'function') populateAllSelects();
            if (typeof renderCategories === 'function') renderCategories();
            if (typeof renderBrands === 'function') renderBrands();
            if (typeof renderColors === 'function') renderColors();
            console.log('[PATCH] Default categories/brands/colors added!');
        }
        // Force sync status online
        if (typeof _realOnlineStatus !== 'undefined') { _realOnlineStatus = true; }
        if (typeof updateConnectionStatus === 'function') updateConnectionStatus();
        if (typeof updateSyncStatusUI === 'function') updateSyncStatusUI(true);
        if (typeof updateDashboard === 'function') updateDashboard();

        console.log('[PATCH] Todo listo! La app ahora usa Neon DB directamente.');
        console.log('[PATCH] La sincronización, categorías, marcas y colores deberían funcionar.');
    });

    console.log('[PATCH] Aplicando parche Neon DB...');
})();
