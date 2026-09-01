import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

const H = {'Cache-Control':'no-store','Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'};

export async function OPTIONS(){
  return new NextResponse(null,{status:204,headers:H});
}

async function ensureDataColumn() {
  try {
    await query(`ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS data TEXT`);
  } catch (e: any) {
    // column may already exist — ignore
  }
}

export async function GET(){
  try{
    await ensureDataColumn();
    // FIX: Now includes the `data` column (full JSON snapshot) just like /api/sync/quotations,
    // so the client can restore complete quotation data instead of getting empty items.
    const rows=await query('SELECT id,"customerName","customerPhone","customerEmail",subtotal,total,notes,data,"createdAt","updatedAt" FROM "Quotation" ORDER BY "updatedAt" DESC');
    const quotes=rows.map((r:any)=>{
      let full: any = null;
      if (r.data) {
        try { full = typeof r.data === 'string' ? JSON.parse(r.data) : r.data; } catch { full = null; }
      }
      return {
        id:r.id,
        clientName: (full?.clientName) || r.customerName || '',
        clientPhone: (full?.customerPhone) || r.customerPhone || '',
        clientEmail: (full?.customerEmail) || r.customerEmail || '',
        items: [],
        subtotal: (full?.subtotal) || r.subtotal || 0,
        total: (full?.total) || r.total || 0,
        notes: (full?.notes) || r.notes || '',
        // Pass full snapshot so client can restore complete quotation
        data: full,
        createdAt:r.createdAt,
        updatedAt:r.updatedAt
      };
    });
    return NextResponse.json(quotes,{headers:H});
  }catch(e:any){
    console.error('[DB] GET /quotations:',e.message);
    return NextResponse.json([],{headers:H});
  }
}

export async function POST(request:Request){
  try{
    await ensureDataColumn();
    let items:any[]=[];
    try{items=await request.json();}catch{items=[];}
    if(!Array.isArray(items))items=[items];
    for(const q of items){
      if(!q||!q.id)continue;
      // Store full snapshot in data column (same as /api/sync/quotations)
      const dataJson = JSON.stringify(q);
      await query(
        `INSERT INTO "Quotation" (id,"customerName","customerPhone","customerEmail",subtotal,total,notes,data,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (id) DO UPDATE SET "customerName"=$2,"customerPhone"=$3,"customerEmail"=$4,subtotal=$5,total=$6,notes=$7,data=$8,"updatedAt"=NOW()`,
        [q.id,q.clientName||q.customerName||'',q.clientPhone||q.customerPhone||'',q.clientEmail||q.customerEmail||'',
         parseFloat(q.subtotal)||0,parseFloat(q.total)||0,q.notes||'',dataJson,q.createdAt||new Date().toISOString()]
      );
    }
    return NextResponse.json({success:true,count:items.length},{headers:H});
  }catch(e:any){
    console.error('[DB] POST /quotations:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}

export async function DELETE(request:Request){
  try{
    const url=new URL(request.url);
    const id=url.searchParams.get('id')||'';
    let bodyId='';
    try{const b=await request.json();bodyId=b?.id||'';}catch{}
    const finalId=id||bodyId;
    if(!finalId)return NextResponse.json({error:'Missing id'},{status:400});
    await query('DELETE FROM "Quotation" WHERE id=$1',[finalId]);
    return NextResponse.json({success:true},{headers:H});
  }catch(e:any){
    console.error('[DB] DELETE /quotations:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}
