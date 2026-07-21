import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

const H = {'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};
const NO_IMG_ERR = {error:'Catálogo no encontrado'};

export async function OPTIONS(){
  return new NextResponse(null,{status:204,headers:{...H,'Access-Control-Allow-Methods':'GET,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
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
  }catch(e:any){}
}

// PUBLIC endpoint — returns catalog by slug with images resolved
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
  try{
    const {slug}=await params;
    if(!slug)return NextResponse.json({error:'Missing slug'},{status:400,headers:H});
    const rows=await query('SELECT id,slug,name,description,products,"storeInfo","mainImage","createdAt","updatedAt" FROM "ElectronicCatalog" WHERE slug=$1',[slug]);
    if(rows.length===0)return NextResponse.json(NO_IMG_ERR,{status:404,headers:H});
    const cat=rows[0] as any;
    let prods:any[]=[];
    try{prods=typeof cat.products==='string'?JSON.parse(cat.products):(cat.products||[]);}catch{}

    // Resolve imageIds to full image objects
    await ensureImageTable();
    const allIds:string[]=[];
    for(const p of prods){
      const ids:string[]=(p as any).imageIds||[];
      for(const id of ids){ if(id && allIds.indexOf(id)===-1) allIds.push(id); }
    }
    const imgMap:Record<string,{type:string,data:string}>={};
    if(allIds.length>0){
      const ph=allIds.map((_,i)=>'$'+(i+1)).join(',');
      try{
        const imgRows=await query(`SELECT id,"imageType",data FROM "CatalogImage" WHERE id IN (${ph})`,allIds);
        for(const r of imgRows as any[]){ imgMap[r.id]={type:r.imageType,data:r.data}; }
      }catch{}
    }
    for(const p of prods){
      const prod=p as any;
      const ids:string[]=prod.imageIds||[];
      if(ids.length>0){
        prod.images=ids.map(id=>imgMap[id]).filter(Boolean);
      }
      delete prod.imageIds;
    }

    return NextResponse.json({
      id:cat.id,slug:cat.slug,name:cat.name,description:cat.description||'',
      products:prods,storeInfo:cat.storeInfo||null,mainImage:cat.mainImage||0,createdAt:cat.createdAt,updatedAt:cat.updatedAt
    },{headers:H});
  }catch(e:any){
    console.error('[DB] GET /catalogs/[slug]:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}