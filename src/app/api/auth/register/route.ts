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
    const {name,email,password,role}=body;

    if(!name||!email||!password){
      return NextResponse.json({error:'Nombre, email y contraseña son requeridos'},{status:400,headers:H});
    }
    if(password.length<4){
      return NextResponse.json({error:'La contraseña debe tener al menos 4 caracteres'},{status:400,headers:H});
    }

    const emailLower=email.toLowerCase().trim();

    // Check if user already exists
    const existing=await query('SELECT id FROM "AppUser" WHERE email = $1',[emailLower]);
    if(existing.length>0){
      return NextResponse.json({error:'Este correo ya está registrado'},{status:409,headers:H});
    }

    // Hash password
    const bcrypt=await import('bcryptjs');
    const salt=await bcrypt.genSalt(10);
    const hashedPassword=await bcrypt.hash(password,salt);

    // First user becomes admin
    const userCount=await query('SELECT COUNT(*) as cnt FROM "AppUser"');
    const isFirstUser=parseInt(userCount[0]?.cnt)===0;
    const userRole=isFirstUser?'admin':(role||'vendedor');

    const id=Date.now().toString(36)+Math.random().toString(36).substr(2,9);

    await query(
      'INSERT INTO "AppUser" (id,name,email,password,role,active,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,true,NOW(),NOW())',
      [id,name.trim(),emailLower,hashedPassword,userRole]
    );

    const tokenData=JSON.stringify({id,email:emailLower,ts:Date.now()});
    const token=Buffer.from(tokenData).toString('base64');

    return NextResponse.json({
      token,
      user:{id,name:name.trim(),email:emailLower,role:userRole,active:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
    },{headers:H});
  }catch(e:any){
    console.error('[DB] POST /auth/register:',e.message);
    return NextResponse.json({error:e.message},{status:500,headers:H});
  }
}