import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

const H = { 'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,PUT,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization' };

export async function OPTIONS(){return new NextResponse(null,{status:204,headers:H});}

export async function GET(){
  try{
    const rows=await query('SELECT * FROM "Store" LIMIT 1');
    if(rows.length>0){
      const r=rows[0];
      const parse=(v:any)=>{try{return typeof v==='string'?JSON.parse(v):v;}catch{return v;}};
      return NextResponse.json({
        id:r.id,name:r.name||'Mi Tienda',address:r.address||'',
        phone:r.phone||'',email:r.email||'',currency:r.currency||'USD',
        footer:r.footer||'',footerText:r.footer||'',logo:r.logo||null,
        categories:parse(r.categories),brands:parse(r.brands),colors:parse(r.colors),
        categorySpecs:parse(r.categorySpecs||'{}')
      },{headers:H});
    }
    return NextResponse.json({},{headers:H});
  }catch(e:any){
    console.error('[DB] GET /sync/store:',e.message);
    return NextResponse.json({},{headers:H});
  }
}

export async function PUT(request:Request){
  try{
    const b=await request.json();
    await query(
      `INSERT INTO "Store" (id,name,address,phone,email,website,logo,currency,footer,categories,brands,colors,"categorySpecs","updatedAt")
       VALUES ('store',$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (id) DO UPDATE SET name=$1,address=$2,phone=$3,email=$4,website=$5,logo=$6,currency=$7,footer=$8,categories=$9,brands=$10,colors=$11,"categorySpecs"=$12,"updatedAt"=NOW()`,
      [b.name||b.storeName||'Mi Tienda',b.address||'',b.phone||'',b.email||'',b.website||'',b.logo||null,
       b.currency||'USD',b.footer||b.footerText||'',
       typeof b.categories==='string'?b.categories:JSON.stringify(b.categories||[]),
       typeof b.brands==='string'?b.brands:JSON.stringify(b.brands||[]),
       typeof b.colors==='string'?b.colors:JSON.stringify(b.colors||[]),
       typeof b.categorySpecs==='string'?b.categorySpecs:JSON.stringify(b.categorySpecs||'{}')]
    );
    return NextResponse.json({success:true},{headers:H});
  }catch(e:any){
    console.error('[DB] PUT /sync/store:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}

export async function POST(request:Request){return PUT(request);}