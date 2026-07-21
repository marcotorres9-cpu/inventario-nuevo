import {NextResponse} from 'next/server';
import {query} from '@/lib/db';
export const dynamic='force-dynamic';

const H = {'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'};

export async function OPTIONS(){
  return new Response(null,{status:200,headers:{...H,'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}});
}

export async function POST(request:Request){
  try{
    const body=await request.json();
    const {email,password}=body;

    if(!email||!password){
      return NextResponse.json({error:'Email y contraseña requeridos'},{status:400,headers:H});
    }

    const emailLower=email.toLowerCase().trim();

    const existing=await query('SELECT id FROM "AppUser" WHERE email = $1',[emailLower]);
    if(existing.length===0){
      return NextResponse.json({error:'Usuario no encontrado'},{status:404,headers:H});
    }

    const bcrypt=await import('bcryptjs');
    const salt=await bcrypt.genSalt(10);
    const hashedPassword=await bcrypt.hash(password,salt);

    await query('UPDATE "AppUser" SET password = $1, "updatedAt" = NOW() WHERE email = $2',[hashedPassword,emailLower]);

    return NextResponse.json({success:true},{headers:H});
  }catch(e:any){
    console.error('[DB] POST /auth/sync-password:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}