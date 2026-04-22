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
    const { name, email, password, role } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await query('SELECT id FROM "AppUser" WHERE email = $1', [emailLower]);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Este correo ya está registrado' }, { status: 409, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
    }

    // Hash password with bcrypt
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if this is the first user (make admin)
    const userCount = await query('SELECT COUNT(*) as cnt FROM "AppUser"');
    const isFirstUser = parseInt(userCount[0]?.cnt) === 0;
    const userRole = isFirstUser ? 'admin' : (role || 'vendedor');

    // Generate ID
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

    // Insert user
    await query(
      'INSERT INTO "AppUser" (id, name, email, password, role, active, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())',
      [id, name.trim(), emailLower, hashedPassword, userRole]
    );

    // Generate token
    const tokenData = JSON.stringify({ id, email: emailLower, ts: Date.now() });
    const token = Buffer.from(tokenData).toString('base64');

    return NextResponse.json({
      token: token,
      user: {
        id: id,
        name: name.trim(),
        email: emailLower,
        role: userRole,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
