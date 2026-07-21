import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

const H = {'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};

export async function OPTIONS(){
  return new NextResponse(null,{status:204,headers:{...H,'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
}

export async function GET(){
  try{
    const rows=await query('SELECT id,"customerName","customerPhone","customerEmail",subtotal,total,notes,"createdAt","updatedAt" FROM "Quotation" ORDER BY "updatedAt" DESC');
    const quotes=rows.map((r:any)=>({
      id:r.id,clientName:r.customerName||'',clientPhone:r.customerPhone||'',
      clientEmail:r.customerEmail||'',items:'[]',
      subtotal:r.subtotal||0,tax:0,discount:0,
      total:r.total||0,status:'',notes:r.notes||'',
      createdAt:r.createdAt,updatedAt:r.updatedAt
    }));
    return NextResponse.json(quotes,{headers:H});
  }catch(e:any){
    console.error('[DB] GET /quotations:',e.message);
    return NextResponse.json([],{headers:H});
  }
}

export async function POST(request:Request){
  try{
    let items:any[]=[];
    try{items=await request.json();}catch{items=[];}
    if(!Array.isArray(items))items=[items];
    for(const q of items){
      if(!q||!q.id)continue;
      await query(
        `INSERT INTO "Quotation" (id,"customerName","customerPhone","customerEmail",subtotal,total,notes,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (id) DO UPDATE SET "customerName"=$2,"customerPhone"=$3,"customerEmail"=$4,subtotal=$5,total=$6,notes=$7,"updatedAt"=NOW()`,
        [q.id,q.clientName||q.customerName||'',q.clientPhone||q.customerPhone||'',q.clientEmail||q.customerEmail||'',
         parseFloat(q.subtotal)||0,parseFloat(q.total)||0,q.notes||'']
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