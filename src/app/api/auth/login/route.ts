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

    const rows = await query('SELECT * FROM "AppUser" WHERE email = $1 AND active = true', [email.toLowerCase().trim()]);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    const user = rows[0];

    // Compare password - support both bcrypt and plain text
    let passwordMatch = false;
    const storedPassword = user.password || '';

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      // bcrypt hash
      const bcrypt = await import('bcryptjs');
      passwordMatch = await bcrypt.compare(password, storedPassword);
    } else {
      // Plain text comparison (for migrated users)
      passwordMatch = (password === storedPassword);
    }

    if (!passwordMatch) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    // Generate simple token (base64 of user data + timestamp)
    const tokenData = JSON.stringify({ id: user.id, email: user.email, ts: Date.now() });
    const token = Buffer.from(tokenData).toString('base64');

    return NextResponse.json({
      token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        createdAt: user.createdAt || user.created_at,
        updatedAt: user.updatedAt || user.updated_at
      }
    }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
