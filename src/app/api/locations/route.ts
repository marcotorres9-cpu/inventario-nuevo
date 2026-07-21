import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

const H = {'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'};

export async function OPTIONS(){return new Response(null,{status:200,headers:H});}

export async function GET(){
  try{
    const rows=await query('SELECT id,name,spaces,"modelTargets",movements,"createdAt","updatedAt" FROM "Location" ORDER BY "updatedAt" DESC');
    const locs=rows.map((r:any)=>{
      let spaces=[];try{spaces=typeof r.spaces==='string'?JSON.parse(r.spaces):(r.spaces||[]);}catch{}
      let modelTargets=[];try{modelTargets=typeof r.modelTargets==='string'?JSON.parse(r.modelTargets):(r.modelTargets||[]);}catch{}
      let movements=[];try{movements=typeof r.movements==='string'?JSON.parse(r.movements):(r.movements||[]);}catch{}
      return{id:r.id,name:r.name||'',spaces,modelTargets,movements,createdAt:r.createdAt,updatedAt:r.updatedAt};
    });
    return NextResponse.json({locations:locs},{headers:H});
  }catch(e:any){
    console.error('[DB] GET /locations:',e.message);
    return NextResponse.json({locations:[]},{headers:H});
  }
}

export async function PUT(request:Request){
  try{
    const body=await request.json();
    const locations=body.locations||[];
    await query('DELETE FROM "Location"');
    for(const loc of locations){
      if(!loc||!loc.id)continue;
      const spacesStr=typeof loc.spaces==='string'?loc.spaces:JSON.stringify(loc.spaces||[]);
      const mtStr=typeof loc.modelTargets==='string'?loc.modelTargets:JSON.stringify(loc.modelTargets||[]);
      const mvStr=typeof loc.movements==='string'?loc.movements:JSON.stringify(loc.movements||[]);
      await query(
        `INSERT INTO "Location" (id,name,spaces,"modelTargets",movements,"createdAt","updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2,spaces=$3,"modelTargets"=$4,movements=$5,"updatedAt"=NOW()`,
        [loc.id,loc.name||'',spacesStr,mtStr,mvStr,loc.createdAt||new Date().toISOString()]
      );
    }
    return NextResponse.json({success:true,count:locations.length},{headers:H});
  }catch(e:any){
    console.error('[DB] PUT /locations:',e.message);
    return NextResponse.json({error:e.message},{status:500});
  }
}

export async function POST(request:Request){
  try{
    let items:any[]=[];
    try{items=await request.json();}catch{items=[];}
    return NextResponse.json({success:true,count:items.length},{headers:H});
  }catch(e:any){
    console.error('[DB] POST /locations:',e.message);
    return NextResponse.json({error:e.message},{status:500});
  }
}