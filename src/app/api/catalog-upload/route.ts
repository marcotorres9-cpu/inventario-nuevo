import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

const H = {'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};

async function ensureTable(){
  try{
    await query(`CREATE TABLE IF NOT EXISTS "CatalogImage" (
      id TEXT PRIMARY KEY,
      "catalogId" TEXT DEFAULT '',
      "imageType" TEXT DEFAULT 'image/jpeg',
      data TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )`);
  }catch(e:any){console.error('[DB] ensureTable:',e.message);}
}

export async function OPTIONS(){
  return new NextResponse(null,{status:204,headers:{...H,'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
}

// POST: save one image, return its id
export async function POST(request:Request){
  try{
    await ensureTable();
    const body=await request.json();
    const {catalogId,imageType,data}=body;
    if(!data) return NextResponse.json({error:'No image data'},{status:400,headers:H});
    const imgId='img_'+Date.now()+'_'+Math.random().toString(36).substr(2,6);
    await query(
      `INSERT INTO "CatalogImage" (id,"catalogId","imageType",data,"createdAt") VALUES ($1,$2,$3,$4,NOW())`,
      [imgId, catalogId||'', imageType||'image/jpeg', data]
    );
    return NextResponse.json({success:true,id:imgId},{headers:H});
  }catch(e:any){
    console.error('[DB] POST /catalog-upload:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}

// GET: fetch image by id
export async function GET(request:Request){
  try{
    await ensureTable();
    const url=new URL(request.url);
    const id=url.searchParams.get('id')||'';
    const catalogId=url.searchParams.get('catalogId')||'';
    if(id){
      const rows=await query('SELECT id,"imageType",data FROM "CatalogImage" WHERE id=$1',[id]);
      if(rows.length===0) return NextResponse.json({error:'Not found'},{status:404,headers:H});
      return NextResponse.json(rows[0],{headers:H});
    }
    if(catalogId){
      const rows=await query('SELECT id,"imageType",data FROM "CatalogImage" WHERE "catalogId"=$1 ORDER BY "createdAt" ASC',[catalogId]);
      return NextResponse.json(rows,{headers:H});
    }
    return NextResponse.json({error:'Missing id or catalogId'},{status:400,headers:H});
  }catch(e:any){
    console.error('[DB] GET /catalog-upload:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}

// DELETE: remove image
export async function DELETE(request:Request){
  try{
    await ensureTable();
    const url=new URL(request.url);
    const id=url.searchParams.get('id')||'';
    const catalogId=url.searchParams.get('catalogId')||'';
    if(catalogId){
      await query('DELETE FROM "CatalogImage" WHERE "catalogId"=$1',[catalogId]);
      return NextResponse.json({success:true},{headers:H});
    }
    if(!id) return NextResponse.json({error:'Missing id'},{status:400,headers:H});
    await query('DELETE FROM "CatalogImage" WHERE id=$1',[id]);
    return NextResponse.json({success:true},{headers:H});
  }catch(e:any){
    console.error('[DB] DELETE /catalog-upload:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}