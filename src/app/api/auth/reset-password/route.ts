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
    const { email, newPassword } = await req.json();
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password required' }, { status: 400 });
    }
    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const dbInfo = getDbInfo();
    if (!dbInfo) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const sqlUrl = `https://${dbInfo.host}/sql`;

    const resp = await fetch(sqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Neon-Connection-String': dbInfo.dbUrl,
      },
      body: JSON.stringify({
        query: `UPDATE "AppUser" SET password = crypt($1, gen_salt('bf', 10)), "updatedAt" = NOW()
                WHERE LOWER(email) = LOWER($2) AND active = true
                RETURNING id, name, email`,
        params: [newPassword, email.trim()]
      }),
    });

    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    const data = await resp.json();
    const rows = data.rows || [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Password updated' }, { headers: { 'Cache-Control': 'no-store' } });

  } catch (error: any) {
    console.error('[RESET-PASSWORD ERROR]', error.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
