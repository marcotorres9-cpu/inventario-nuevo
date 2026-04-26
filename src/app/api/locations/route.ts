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
  if (!r.ok) { const e = await r.text(); throw new Error(e); }
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

// GET all locations
export async function GET() {
  try {
    const rows = await query('SELECT id, name, spaces, "modelTargets", movements, "createdAt", "updatedAt" FROM "Location" ORDER BY "updatedAt" DESC');
    const locs = rows.map((r: any) => {
      let spaces = [];
      try { spaces = typeof r.spaces === 'string' ? JSON.parse(r.spaces) : (r.spaces || []); } catch {}
      let modelTargets = [];
      try { modelTargets = typeof r.modelTargets === 'string' ? JSON.parse(r.modelTargets) : (r.modelTargets || []); } catch {}
      let movements = [];
      try { movements = typeof r.movements === 'string' ? JSON.parse(r.movements) : (r.movements || []); } catch {}
      return {
        id: r.id,
        name: r.name || '',
        spaces: spaces,
        modelTargets: modelTargets,
        movements: movements,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    });
    return NextResponse.json({ locations: locs }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ locations: [] }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}

// PUT - save all locations (full replace)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const locations = body.locations || [];
    await query('DELETE FROM "Location"');
    for (const loc of locations) {
      if (!loc || !loc.id) continue;
      const spacesStr = typeof loc.spaces === 'string' ? loc.spaces : JSON.stringify(loc.spaces || []);
      const modelTargetsStr = typeof loc.modelTargets === 'string' ? loc.modelTargets : JSON.stringify(loc.modelTargets || []);
      const movementsStr = typeof loc.movements === 'string' ? loc.movements : JSON.stringify(loc.movements || []);
      await query(
        `INSERT INTO "Location" (id, name, spaces, "modelTargets", movements, "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,NOW())
         ON CONFLICT (id) DO UPDATE SET name=$2, spaces=$3, "modelTargets"=$4, movements=$5, "updatedAt"=NOW()`,
        [loc.id, loc.name || '', spacesStr, modelTargetsStr, movementsStr, loc.createdAt || new Date().toISOString()]
      );
    }
    return NextResponse.json({ success: true, count: locations.length }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let items: any[] = [];
    try { items = await request.json(); } catch { items = []; }
    return NextResponse.json({ success: true, count: items.length }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
