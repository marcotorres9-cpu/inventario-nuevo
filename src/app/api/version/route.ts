import {NextResponse} from 'next/server'; export const dynamic='force-dynamic'; export async function GET(){return NextResponse.json({v:'v20260422'},{headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});} export async function HEAD(){return new Response(null,{status:200,headers:{'Cache-Control':'no-store'}});}
// deploy trigger 3
