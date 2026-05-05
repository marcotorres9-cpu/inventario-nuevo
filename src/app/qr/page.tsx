import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Cotización',
  description: 'Ver cotización',
};

const DB_HOST = 'ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech';
const DB_URL = 'postgresql://neondb_owner:npg_GBoFNmzL9vW2@ep-little-queen-anghflli.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require';

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

export default async function QRPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const qid = id || '';

  if (!qid) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ fontSize: 20, color: '#374151' }}>Cotización no encontrada</h1>
          <p style={{ color: '#6b7280', marginTop: 8 }}>No se proporcionó un ID de cotización</p>
        </div>
      </div>
    );
  }

  let r: any = null;
  let error = false;
  try {
    const rows = await query(`SELECT * FROM "Quotation" WHERE id=$1`, [qid]);
    r = rows.length > 0 ? rows[0] : null;
  } catch { error = true; }

  if (error || !r) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Arial, sans-serif', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <h1 style={{ fontSize: 20, color: '#374151' }}>Cotización no encontrada</h1>
          <p style={{ color: '#6b7280', marginTop: 8 }}>La cotización solicitada no existe o fue eliminada</p>
        </div>
      </div>
    );
  }

  let store: any = {};
  try {
    const storeRows = await query(`SELECT name, address, phone, email, logo, footer, currency FROM "Store" LIMIT 1`);
    store = storeRows.length > 0 ? storeRows[0] : {};
  } catch {}

  let itemsA: any[] = [];
  let itemsB: any[] = [];
  let totalsA: any = null;
  let totalsB: any = null;

  try { itemsA = JSON.parse(r.itemsAJson || '[]'); } catch {}
  try { itemsB = JSON.parse(r.itemsBJson || '[]'); } catch {}
  try { totalsA = JSON.parse(r.totalsAJson || 'null'); } catch {}
  try { totalsB = JSON.parse(r.totalsBJson || 'null'); } catch {}

  const isDual = r.mode === 'dual' && itemsB && itemsB.length > 0;
  const currency = '$';
  const createdDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  const validDays = parseInt(r.validDays) || 15;
  const validDate = r.createdAt
    ? new Date(new Date(r.createdAt).getTime() + validDays * 86400000).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const qNumber = r.number || 'COT-001';
  const clientName = r.customerName || '';
  const customerPhone = r.customerPhone || '';
  const customerEmail = r.customerEmail || '';
  const total = parseFloat(r.total) || 0;
  const storeName = store.name || 'Mi Tienda';
  const storeAddr = store.address || '';
  const storePhone = store.phone || '';
  const storeEmail = store.email || '';
  const footerText = store.footer || 'Gracias por su preferencia';

  const sections = isDual
    ? [
        { title: r.optionATitle || 'Opción A', items: itemsA, totals: totalsA, color: '#22c55e' },
        { title: r.optionBTitle || 'Opción B', items: itemsB, totals: totalsB, color: '#3b82f6' }
      ]
    : [
        { title: null, items: itemsA, totals: totalsA, color: '#22c55e' }
      ];

  return (
    <html lang="es">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Cotización {qNumber}</title>
        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Segoe UI', Arial, Helvetica, sans-serif; color: #222; font-size: 14px; line-height: 1.5; background: #f3f4f6; }
          .container { max-width: 800px; margin: 0 auto; background: #fff; min-height: 100vh; }
          @media print {
            body { background: #fff; }
            .no-print { display: none !important; }
            .container { max-width: 100%; box-shadow: none; }
          }
          .header { text-align: center; padding: 24px 20px 16px; border-bottom: 3px solid #22c55e; }
          .header h1 { font-size: 22px; color: #22c55e; margin-bottom: 4px; }
          .header .info { font-size: 12px; color: #6b7280; }
          .meta { display: flex; justify-content: space-between; padding: 12px 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
          .meta strong { color: #374151; }
          .client { padding: 12px 20px; border-bottom: 1px solid #e5e7eb; }
          .client-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .client-name { font-size: 16px; font-weight: 700; color: #111; margin-top: 2px; }
          .client-info { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .section-title { padding: 14px 20px 6px; font-size: 14px; font-weight: 700; }
          .items-table { width: 100%; border-collapse: collapse; }
          .items-table th { padding: 8px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; text-align: left; }
          .items-table th.r { text-align: right; }
          .items-table td { padding: 8px 10px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
          .items-table td.r { text-align: right; }
          .items-table .cost { color: #e17055; font-weight: 600; }
          .items-table .disc { color: #f59e0b; }
          .items-table .final { font-weight: 700; color: #00b894; }
          .total-box { padding: 14px 20px; text-align: right; }
          .total-box-inner { display: inline-block; padding: 12px 20px; border: 2px solid #22c55e; border-radius: 10px; background: #f0fdf4; }
          .total-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .total-value { font-size: 26px; font-weight: 800; color: #16a34a; }
          .dual-total { text-align: center; padding: 16px 20px; margin: 0 20px 16px; border: 3px solid #22c55e; border-radius: 12px; background: #f0fdf4; }
          .validity { text-align: center; padding: 10px 20px; font-size: 11px; color: #9ca3af; }
          .footer { text-align: center; padding: 16px 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; margin-top: 16px; }
          .pdf-btn { position: fixed; bottom: 20px; right: 20px; z-index: 100; background: #22c55e; color: #fff; border: none; border-radius: 14px; padding: 14px 24px; font-size: 15px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 32px rgba(34,197,94,0.4); display: flex; align-items: center; gap: 8px; }
          .pdf-btn:hover { background: #16a34a; }
        ` }} />
      </head>
      <body>
        <div className="container">
          <div className="header">
            <h1>{storeName}</h1>
            <div className="info">
              {storeAddr && <span>{storeAddr}</span>}
              {(storePhone || storeEmail) && <><br />{storePhone && <span>Tel: {storePhone}</span>}{storePhone && storeEmail && <span> | </span>}{storeEmail && <span>{storeEmail}</span>}</>}
            </div>
          </div>

          <div className="meta">
            <div><strong>Cotización:</strong> {qNumber}</div>
            <div><strong>Fecha:</strong> {createdDate}</div>
          </div>

          {(clientName || customerPhone) && (
            <div className="client">
              <div className="client-label">Cliente</div>
              <div className="client-name">{clientName || 'Sin nombre'}</div>
              {customerPhone && <div className="client-info">Tel: {customerPhone}</div>}
              {customerEmail && <div className="client-info">{customerEmail}</div>}
            </div>
          )}

          {sections.map((sec: any, sIdx: number) => {
            const secItems = sec.items || [];
            let secCost = 0, secDisc = 0;
            for (const it of secItems) {
              secCost += (it.qty || 1) * (parseFloat(it.price) || 0);
              secDisc += parseFloat(it.lineDiscount) || 0;
            }
            const secTotal = Math.max(0, secCost - secDisc);

            return (
              <div key={sIdx}>
                {isDual && (
                  <div className="section-title" style={{ color: sec.color }}>
                    {sec.title}
                  </div>
                )}
                <table className="items-table">
                  <thead>
                    <tr style={{ background: sec.color }}>
                      <th>Producto</th>
                      <th className="r">Cant.</th>
                      <th className="r">Costo</th>
                      <th className="r">Descuento</th>
                      <th className="r">Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {secItems.map((it: any, i: number) => {
                      const qty = it.qty || 1;
                      const price = parseFloat(it.price) || 0;
                      const lineCost = qty * price;
                      const disc = parseFloat(it.lineDiscount) || 0;
                      const lineFinal = Math.max(0, lineCost - disc);
                      return (
                        <tr key={i}>
                          <td>{it.productName || it.name || ''}</td>
                          <td className="r">{qty}</td>
                          <td className="r cost">{currency}{lineCost.toFixed(2)}</td>
                          <td className="r disc">{disc > 0 ? '-' + currency + disc.toFixed(2) : '-'}</td>
                          <td className="r final">{currency}{lineFinal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {secDisc > 0 && (
                  <div style={{ textAlign: 'right', padding: '4px 20px 8px', fontSize: 12, color: '#d97706' }}>
                    Descuentos: -{currency}{secDisc.toFixed(2)}
                  </div>
                )}
                {isDual && (
                  <div className="total-box">
                    <div className="total-box-inner" style={{ borderColor: sec.color, background: sec.color + '11' }}>
                      <div className="total-label">Total {sec.title}</div>
                      <div className="total-value" style={{ color: sec.color }}>{currency}{secTotal.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isDual ? (
            <div className="dual-total">
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 4 }}>Total Combinado</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#16a34a' }}>{currency}{total.toFixed(2)}</div>
            </div>
          ) : (
            <div className="total-box">
              <div className="total-box-inner">
                <div className="total-label">Total</div>
                <div className="total-value">{currency}{total.toFixed(2)}</div>
              </div>
            </div>
          )}

          {(validDays || validDate) && (
            <div className="validity">
              Válida por {validDays} días — hasta {validDate}
            </div>
          )}

          <div className="footer">{footerText}</div>
        </div>

        <button className="pdf-btn no-print" onClick={() => window.print()}>
          📥 Descargar PDF
        </button>
      </body>
    </html>
  );
}
