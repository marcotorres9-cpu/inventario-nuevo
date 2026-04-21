import {NextResponse} from 'next/server';

export const dynamic = 'force-dynamic';

function getDbInfo() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  const match = dbUrl.match(/postgresql:\/\/([^@]+)@([^/]+)\/(.+)/);
  if (!match) return null;
  return { dbUrl, host: match[2] };
}

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'mo';
  for (let i = 0; i < 14; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const dbInfo = getDbInfo();
    if (!dbInfo) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const sqlUrl = `https://${dbInfo.host}/sql`;

    // Check if user already exists
    const checkResp = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': dbInfo.dbUrl,
      },
      body: JSON.stringify({
        query: 'SELECT id FROM "AppUser" WHERE LOWER(email) = LOWER($1)',
        params: [email.trim()]
      }),
    });

    if (checkResp.ok) {
      const checkData = await checkResp.json();
      if (checkData.rows && checkData.rows.length > 0) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }

    // Check if this is the first user (will be admin)
    const countResp = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': dbInfo.dbUrl,
      },
      body: JSON.stringify({
        query: 'SELECT COUNT(*)::int as total FROM "AppUser"',
        params: []
      }),
    });

    let isFirst = false;
    if (countResp.ok) {
      const countData = await countResp.json();
      isFirst = (countData.rows && countData.rows[0] && countData.rows[0].total === 0);
    }

    const userRole = role || (isFirst ? 'admin' : 'user');
    const userId = generateId();

    // Hash password using pgcrypto
    const insertResp = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': dbInfo.dbUrl,
      },
      body: JSON.stringify({
        query: `INSERT INTO "AppUser" (id, name, email, password, role, active, "createdAt", "updatedAt")
                VALUES ($1, $2, LOWER($3), crypt($4, gen_salt('bf', 10)), $5, true, NOW(), NOW())
                RETURNING id, name, email, role, "createdAt"`,
        params: [userId, name.trim(), email.trim(), password, userRole]
      }),
    });

    if (!insertResp.ok) {
      const errText = await insertResp.text();
      console.error('[REGISTER] SQL error:', errText);
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    const insertData = await insertResp.json();
    const newUser = insertData.rows && insertData.rows[0];

    if (!newUser) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
      }
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    console.error('[REGISTER ERROR]', error.message, error.stack);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'auth ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
