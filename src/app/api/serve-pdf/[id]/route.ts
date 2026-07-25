import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

async function ensureTable(){
  try{
    await query(`CREATE TABLE IF NOT EXISTS "PdfFile" (
      id TEXT PRIMARY KEY,
      filename TEXT DEFAULT 'documento.pdf',
      "contentType" TEXT DEFAULT 'application/pdf',
      data TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ DEFAULT NOW()
    )`);
  }catch(e:any){}
}

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    await ensureTable();
    const {id}=await params;
    if(!id){
      return new NextResponse('Not found', {status:404,headers:{'Content-Type':'text/plain'}});
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
    console.error('[DB] GET /serve-pdf/[id]:',e.message);
    return new NextResponse('Error interno', {status:500,headers:{'Content-Type':'text/plain'}});
  }
}
