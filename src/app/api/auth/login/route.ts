import {NextResponse} from 'next/server';

export const dynamic = 'force-dynamic';

function getDbInfo() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return null;
  const match = dbUrl.match(/postgresql:\/\/([^@]+)@([^/]+)\/(.+)/);
  if (!match) return null;
  return { dbUrl, host: match[2] };
}

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const dbInfo = getDbInfo();
    if (!dbInfo) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Query: find user AND verify password in one SQL call using pgcrypto
    const sqlUrl = `https://${dbInfo.host}/sql`;
    const resp = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': dbInfo.dbUrl,
      },
      body: JSON.stringify({
        query: `SELECT id, name, email, role, "createdAt",
                (password = crypt($1, password)) as password_valid
                FROM "AppUser"
                WHERE LOWER(email) = LOWER($2) AND active = true`,
        params: [password, email.trim()]
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[LOGIN] SQL error:', errText);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    const data = await resp.json();
    const rows = data.rows || [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const row = rows[0];

    if (row.password_valid !== true && row.password_valid !== 'true') {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create a simple token
    const token = Buffer.from(JSON.stringify({
      id: row.id,
      email: row.email,
      role: row.role,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    })).toString('base64');

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.createdAt,
      }
    }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    console.error('[LOGIN ERROR]', error.message, error.stack);
    return NextResponse.json({ error: 'Server error: ' + error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'auth ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
