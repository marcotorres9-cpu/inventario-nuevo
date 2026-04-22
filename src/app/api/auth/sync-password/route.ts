import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';

const DB_URL = 'postgresql://neondb_owner:npg_GBoFNmzL9vW2@ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';
const DB_HOST = 'ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech';

async function query(sql: string, params: any[] = []) {
  const r = await fetch(`https://${DB_HOST}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Neon-Connection-String': DB_URL },
    body: JSON.stringify({ query: sql, params })
  });
  if (!r.ok) throw new Error(await r.text());
  const d = await r.json();
  return d.rows || [];
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user exists
    const existing = await query('SELECT id FROM "AppUser" WHERE email = $1', [emailLower]);
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    // Hash password with bcrypt and update
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await query('UPDATE "AppUser" SET password = $1, "updatedAt" = NOW() WHERE email = $2', [hashedPassword, emailLower]);

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
