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

    const rows=await query('SELECT * FROM "AppUser" WHERE email = $1 AND active = true',[email.toLowerCase().trim()]);

    if(rows.length===0){
      return NextResponse.json({error:'Usuario no encontrado'},{status:404,headers:H});
    }

    const user=rows[0];

    // Compare password — bcrypt or plain text
    let passwordMatch=false;
    const storedPassword=user.password||'';
    if(storedPassword.startsWith('$2a$')||storedPassword.startsWith('$2b$')){
      const bcrypt=await import('bcryptjs');
      passwordMatch=await bcrypt.compare(password,storedPassword);
    }else{
      passwordMatch=(password===storedPassword);
    }

    if(!passwordMatch){
      return NextResponse.json({error:'Contraseña incorrecta'},{status:401,headers:H});
    }

    const tokenData=JSON.stringify({id:user.id,email:user.email,ts:Date.now()});
    const token=Buffer.from(tokenData).toString('base64');

    return NextResponse.json({
      token,
      user:{id:user.id,name:user.name,email:user.email,role:user.role,active:user.active,createdAt:user.createdAt||user.created_at,updatedAt:user.updatedAt||user.updated_at}
    },{headers:H});
  }catch(e:any){
    console.error('[DB] POST /auth/login:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}