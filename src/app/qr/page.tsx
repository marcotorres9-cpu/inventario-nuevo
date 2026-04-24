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

  // Fetch quotation data directly from database
  let r: any = null;
  let error = false;

  try {
    const rows = await query(
      `SELECT * FROM "Quotation" WHERE id=$1`,
      [qid]
    );
    r = rows.length > 0 ? rows[0] : null;
  } catch {
    error = true;
  }

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

  // Fetch store info
  let store: any = {};
  try {
    const storeRows = await query(
      `SELECT name, address, phone, email, logo, footer, currency FROM "Store" LIMIT 1`
    );
    store = storeRows.length > 0 ? storeRows[0] : {};
  } catch {}

  // Parse quotation data
  let itemsA: any[] = [];
  let itemsB: any[] = [];
  let discountA: any = { type: 'percentage', value: 0 };
  let discountB: any = { type: 'percentage', value: 0 };
  let totalsA: any = null;
  let totalsB: any = null;

  try { itemsA = JSON.parse(r.itemsAJson || '[]'); } catch {}
  try { itemsB = JSON.parse(r.itemsBJson || '[]'); } catch {}
  try { discountA = JSON.parse(r.discountAJson || '{}'); } catch {}
  try { discountB = JSON.parse(r.discountBJson || '{}'); } catch {}
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
  const notes = r.notes || '';
  const storeName = store.name || 'Mi Tienda';
  const storeAddr = store.address || '';
  const storePhone = store.phone || '';
  const storeEmail = store.email || '';
  const footerText = store.footer || 'Gracias por su preferencia';

  const sections = isDual
    ? [
        { title: r.optionATitle || 'Opción A', items: itemsA, discount: discountA, totals: totalsA, color: '#22c55e' },
        { title: r.optionBTitle || 'Opción B', items: itemsB, discount: discountB, totals: totalsB, color: '#3b82f6' }
      ]
    : [
        { title: null, items: itemsA, discount: discountA, totals: totalsA, color: '#22c55e' }
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
          .header { text-align: center; padding: 28px 24px 20px; border-bottom: 3px solid #22c55e; }
          .header h1 { font-size: 24px; color: #22c55e; margin-bottom: 4px; }
          .header .info { font-size: 12px; color: #6b7280; }
          .meta { display: flex; justify-content: space-between; padding: 16px 24px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
          .meta strong { color: #374151; }
          .client { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; }
          .client-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .client-name { font-size: 18px; font-weight: 700; color: #111; margin-top: 2px; }
          .client-info { font-size: 12px; color: #6b7280; margin-top: 2px; }
          .notes { padding: 12px 24px; background: #fffbeb; border-left: 4px solid #f59e0b; font-size: 13px; color: #92400e; }
          .section-title { padding: 16px 24px 8px; font-size: 15px; font-weight: 700; }
          .items-table { width: 100%; border-collapse: collapse; margin: 0; }
          .items-table th { padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #fff; text-align: left; }
          .items-table th:nth-child(2),
          .items-table th:nth-child(3),
          .items-table th:nth-child(4) { text-align: right; }
          .items-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
          .items-table td:nth-child(2),
          .items-table td:nth-child(3),
          .items-table td:nth-child(4) { text-align: right; }
          .items-table td:last-child { font-weight: 700; }
          .total-box { padding: 16px 24px; text-align: right; }
          .total-box-inner { display: inline-block; padding: 14px 24px; border: 2px solid #22c55e; border-radius: 10px; background: #f0fdf4; }
          .total-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
          .total-value { font-size: 28px; font-weight: 800; color: #16a34a; }
          .dual-total { text-align: center; padding: 20px 24px; margin: 0 24px 20px; border: 3px solid #22c55e; border-radius: 12px; background: #f0fdf4; }
          .discount-line { text-align: right; padding: 4px 24px 12px; font-size: 12px; color: #d97706; }
          .validity { text-align: center; padding: 12px 24px; font-size: 11px; color: #9ca3af; }
          .footer { text-align: center; padding: 20px 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; margin-top: 20px; }
          .pdf-btn { position: fixed; bottom: 24px; right: 24px; z-index: 100; background: #22c55e; color: #fff; border: none; border-radius: 16px; padding: 16px 28px; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 32px rgba(34,197,94,0.4); display: flex; align-items: center; gap: 8px; }
          .pdf-btn:hover { background: #16a34a; }
        ` }} />
      </head>
      <body>
        <div className="container">
          {/* Header */}
          <div className="header">
            <h1>{storeName}</h1>
            <div className="info">
              {storeAddr && <span>{storeAddr}</span>}
              {(storePhone || storeEmail) && <><br />{storePhone && <span>Tel: {storePhone}</span>}{storePhone && storeEmail && <span> | </span>}{storeEmail && <span>{storeEmail}</span>}</>}
            </div>
          </div>

          {/* Meta */}
          <div className="meta">
            <div><strong>Cotización:</strong> {qNumber}</div>
            <div><strong>Fecha:</strong> {createdDate}</div>
          </div>

          {/* Client */}
          {(clientName || customerPhone) && (
            <div className="client">
              <div className="client-label">Cliente</div>
              <div className="client-name">{clientName || 'Sin nombre'}</div>
              {customerPhone && <div className="client-info">Tel: {customerPhone}</div>}
              {customerEmail && <div className="client-info">{customerEmail}</div>}
            </div>
          )}

          {/* Notes */}
          {notes && (
            <div className="notes">
              <strong>Notas:</strong> {notes}
            </div>
          )}

          {/* Sections */}
          {sections.map((sec: any, sIdx: number) => (
            <div key={sIdx}>
              {isDual && (
                <div className="section-title" style={{ color: sec.color }}>
                  ↔️ {sec.title}
                </div>
              )}
              <table className="items-table">
                <thead>
                  <tr style={{ background: sec.color }}>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {sec.items.map((it: any, i: number) => {
                    const name = it.productName || it.name || '';
                    const qty = it.qty || 1;
                    const price = parseFloat(it.price) || 0;
                    const sub = qty * price;
                    const brand = it.brand || '';
                    const model = it.model || '';
                    return (
                      <tr key={i}>
                        <td>
                          {name}
                          {(brand || model) && <><br /><span style={{ fontSize: 11, color: '#6b7280' }}>{brand}{brand && model ? ' · ' : ''}{model}</span></>}
                        </td>
                        <td>{qty}</td>
                        <td>{currency}{price.toFixed(2)}</td>
                        <td>{currency}{sub.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {sec.discount && sec.discount.value > 0 && (
                <div className="discount-line">
                  Descuento: -{sec.discount.type === 'percentage' ? sec.discount.value + '%' : currency + sec.discount.value.toFixed(2)}
                </div>
              )}
              {isDual && sec.totals && (
                <div className="total-box">
                  <div className="total-box-inner" style={{ borderColor: sec.color, background: sec.color + '11' }}>
                    <div className="total-label">Total {sec.title}</div>
                    <div className="total-value" style={{ color: sec.color }}>{currency}{(sec.totals.total || total).toFixed(2)}</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Grand Total */}
          {isDual ? (
            <div className="dual-total">
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: 4 }}>Total Combinado</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#16a34a' }}>{currency}{total.toFixed(2)}</div>
            </div>
          ) : (
            <div className="total-box">
              <div className="total-box-inner">
                <div className="total-label">Total</div>
                <div className="total-value">{currency}{total.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Validity */}
          {(validDays || validDate) && (
            <div className="validity">
              Válida por {validDays} días — hasta {validDate}
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            {footerText}
          </div>
        </div>

        {/* PDF Button (hidden in print) */}
        <button className="pdf-btn no-print" onClick={() => window.print()}>
          📥 Descargar PDF
        </button>
      </body>
    </html>
  );
}
