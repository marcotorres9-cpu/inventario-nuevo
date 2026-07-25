import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';
export const maxDuration=30;

const H = {'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};

async function ensureTable(){
  try{
    await query(`CREATE TABLE IF NOT EXISTS "ElectronicCatalog" (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      products JSONB DEFAULT '[]',
      "storeInfo" JSONB DEFAULT '{}',
      "storeId" TEXT DEFAULT '',
      "mainImage" INTEGER DEFAULT 0,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    )`);
    await query(`CREATE INDEX IF NOT EXISTS "idx_ecatalog_slug" ON "ElectronicCatalog"(slug)`);
    try{ await query(`ALTER TABLE "ElectronicCatalog" ADD COLUMN IF NOT EXISTS "storeInfo" JSONB DEFAULT '{}'`); }catch{}
    try{ await query(`ALTER TABLE "ElectronicCatalog" ADD COLUMN IF NOT EXISTS "mainImage" INTEGER DEFAULT 0`); }catch{}
    try{ await query(`ALTER TABLE "ElectronicCatalog" ADD COLUMN IF NOT EXISTS "displaySettings" JSONB DEFAULT '{}'`); }catch{}
  }catch(e:any){console.error('[DB] ensureTable:',e.message);}
}

async function ensureImageTable(){
  try{
    await query(`CREATE TABLE IF NOT EXISTS "CatalogImage" (
      id TEXT PRIMARY KEY,
      "catalogId" TEXT DEFAULT '',
      "imageType" TEXT DEFAULT 'image/jpeg',
      data TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )`);
  }catch(e:any){console.error('[DB] ensureImageTable:',e.message);}
}

// Resolve imageIds to full image objects with base64 data
async function resolveImages(products:any[]):Promise<any[]>{
  const allImageIds:string[]=[];
  for(const p of products){
    const imgs:string[]=(p as any).imageIds||[];
    for(const imgId of imgs){
      if(imgId && allImageIds.indexOf(imgId)===-1) allImageIds.push(imgId);
    }
  }
  if(allImageIds.length===0) return products;
  const imgMap:Record<string,{type:string,data:string}>={};
  // Fetch in batches of 20
  for(let i=0;i<allImageIds.length;i+=20){
    const batch=allImageIds.slice(i,i+20);
    const placeholders=batch.map((_,idx)=>'$'+(idx+1)).join(',');
    try{
      const rows=await query(`SELECT id,"imageType",data FROM "CatalogImage" WHERE id IN (${placeholders})`,batch);
      for(const r of rows){ imgMap[(r as any).id]={type:(r as any).imageType,data:(r as any).data}; }
    }catch{}
  }
  // Attach images to products
  for(const p of products){
    const prod=p as any;
    const ids:string[]=prod.imageIds||[];
    if(ids.length>0){
      prod.images=ids.map(id=>imgMap[id]).filter(Boolean);
    }
    delete prod.imageIds;
  }
  return products;
}

export async function OPTIONS(){
  return new NextResponse(null,{status:204,headers:{...H,'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
}

export async function GET(){
  try{
    await ensureTable();
    await ensureImageTable();
    const rows=await query('SELECT id,slug,name,description,products,"storeInfo","storeId","mainImage","displaySettings","createdAt","updatedAt" FROM "ElectronicCatalog" ORDER BY "updatedAt" DESC');
    // Resolve first image per catalog for thumbnail display
    for(const r of rows as any[]){
      let prods:any[]=[];
      try{prods=typeof r.products==='string'?JSON.parse(r.products):(r.products||[]);}catch{}
      const p0=prods[0]||{};
      const ids:string[]=(p0 as any).imageIds||[];
      const mainIdx=(typeof r.mainImage==='number')?r.mainImage:0;
      const firstId=ids[mainIdx]||ids[0]||'';
      if(firstId){
        try{
          const imgRows=await query(`SELECT "imageType",data FROM "CatalogImage" WHERE id=$1`,[firstId]);
          if(imgRows.length>0){
            r._thumb={type:(imgRows[0] as any).imageType,data:(imgRows[0] as any).data};
          }
        }catch{}
      }
    }
    return NextResponse.json(rows,{headers:H});
  }catch(e:any){
    console.error('[DB] GET /catalogs:',e.message);
    return NextResponse.json([],{headers:H});
  }
}

export async function POST(request:Request){
  try{
    await ensureTable();
    await ensureImageTable();
    const body=await request.json();
    const {id,slug,name,description,products,storeInfo,storeId,mainImage,displaySettings}=body;
    if(!slug||!name)return NextResponse.json({error:'Identificador y nombre requeridos'},{status:400,headers:H});
    const prods=products||[];
    const info=storeInfo||{};
    const ds=displaySettings||{};
    const catalogId=id||('cat_'+Date.now()+'_'+Math.random().toString(36).substr(2,6));
    const cleanSlug=slug.trim().toLowerCase().replace(/\s+/g,'-');
    const mainIdx=typeof mainImage==='number'?mainImage:0;
    // Save products without base64 data (only imageIds)
    const leanProds=prods.map((p:any)=>{
      const {images,...rest}=p;
      return rest;
    });
    await query(
      `INSERT INTO "ElectronicCatalog" (id,slug,name,description,products,"storeInfo","storeId","mainImage","displaySettings","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())
       ON CONFLICT (id) DO UPDATE SET slug=$2,name=$3,description=$4,products=$5,"storeInfo"=$6,"storeId"=$7,"mainImage"=$8,"displaySettings"=$9,"updatedAt"=NOW()`,
      [catalogId,cleanSlug,name,description||'',JSON.stringify(leanProds),JSON.stringify(info),storeId||'',mainIdx,JSON.stringify(ds)]
    );
    return NextResponse.json({success:true,id:catalogId,slug:cleanSlug},{headers:H});
  }catch(e:any){
    if(e.message&&e.message.indexOf('unique')>=0){
      return NextResponse.json({error:'Ese identificador ya existe. Usa otro.'},{status:409,headers:H});
    }
    console.error('[DB] POST /catalogs:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}

export async function DELETE(request:Request){
  try{
    await ensureImageTable();
    const url=new URL(request.url);
    const id=url.searchParams.get('id')||'';
    let bodyId='';
    try{const b=await request.json();bodyId=b?.id||'';}catch{}
    const finalId=id||bodyId;
    if(!finalId)return NextResponse.json({error:'Missing id'},{status:400,headers:H});
    // Delete catalog images first
    try{ await query('DELETE FROM "CatalogImage" WHERE "catalogId"=$1',[finalId]); }catch{}
    await query('DELETE FROM "ElectronicCatalog" WHERE id=$1',[finalId]);
    return NextResponse.json({success:true},{headers:H});
  }catch(e:any){
    console.error('[DB] DELETE /catalogs:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}