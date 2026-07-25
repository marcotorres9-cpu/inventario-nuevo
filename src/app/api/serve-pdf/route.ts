import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';
export const maxDuration=30;

const H={'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};

async function ensureTable(){
  try{
    await query(`CREATE TABLE IF NOT EXISTS "PdfFile" (
      id TEXT PRIMARY KEY,
      filename TEXT DEFAULT 'documento.pdf',
      "contentType" TEXT DEFAULT 'application/pdf',
      data TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )`);
    try{ await query(`CREATE INDEX IF NOT EXISTS "idx_pdffile_created" ON "PdfFile"("createdAt")`); }catch{}
  }catch(e:any){console.error('[DB] ensureTable PdfFile:',e.message);}
}

// Auto-cleanup PDFs older than 6 hours
async function cleanupOld(){
  try{
    await query(`DELETE FROM "PdfFile" WHERE "createdAt" < NOW() - INTERVAL '6 hours'`);
  }catch(e:any){}
}

export async function OPTIONS(){
  return new NextResponse(null,{status:204,headers:H});
}

// POST: upload PDF as base64, return public URL
export async function POST(request:Request){
  try{
    await ensureTable();
    await cleanupOld();
    const body=await request.json();
    const {id,data,filename,contentType}=body;
    if(!id||!data){
      return NextResponse.json({error:'id y data son requeridos'},{status:400,headers:H});
    }
    // Limit: max ~8MB of base64 (~6MB binary)
    if(data.length>11_000_000){
      return NextResponse.json({error:'Archivo demasiado grande (max 8MB)'},{status:413,headers:H});
    }
    const safeFilename=(filename||'documento.pdf').replace(/[^a-zA-Z0-9._-]/g,'_');
    const ct=contentType||'application/pdf';
    await query(
      `INSERT INTO "PdfFile" (id,filename,"contentType",data,"createdAt") VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (id) DO UPDATE SET filename=$2,"contentType"=$3,data=$4,"createdAt"=NOW()`,
      [id,safeFilename,ct,data]
    );
    const publicUrl=`https://inventario-nuevo-v2.vercel.app/api/serve-pdf?id=${encodeURIComponent(id)}`;
    return NextResponse.json({success:true,url:publicUrl,id:id},{headers:H});
  }catch(e:any){
    console.error('[DB] POST /serve-pdf:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}

// GET: serve PDF by id (also try /api/serve-pdf/[id] dynamic route)
export async function GET(request:Request){
  try{
    await ensureTable();
    const url=new URL(request.url);
    const id=url.searchParams.get('id')||'';
    if(!id){
      return NextResponse.json({error:'id requerido'},{status:400,headers:H});
    }
    const rows=await query(`SELECT filename,"contentType",data FROM "PdfFile" WHERE id=$1`,[id]);
    if(rows.length===0){
      return new NextResponse('PDF no encontrado o expirado', {status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
    const row=rows[0] as any;
    const bin=Buffer.from(row.data,'base64');
    return new NextResponse(bin,{
      status:200,
      headers:{
        'Content-Type':row.contentType||'application/pdf',
        'Content-Disposition':`inline; filename="${encodeURIComponent(row.filename||'documento.pdf')}"`,
        'Content-Length':String(bin.length),
        'Cache-Control':'no-store'
      }
    });
  }catch(e:any){
    console.error('[DB] GET /serve-pdf:',e.message);
    return new NextResponse('Error interno', {status:500,headers:{'Content-Type':'text/plain'}});
  }
}
