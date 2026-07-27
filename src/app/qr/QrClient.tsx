'use client';

import { useEffect, useState } from 'react';

type Item = {
  productName?: string;
  name?: string;
  brand?: string;
  model?: string;
  qty?: number;
  price?: number;
  costPrice?: number;
  lineDiscount?: number;
};

type Totals = {
  subtotal?: number;
  total?: number;
  discount?: number;
};

type Quotation = {
  id: string;
  number?: string;
  clientName?: string;
  customerPhone?: string;
  customerEmail?: string;
  itemsA?: Item[];
  itemsB?: Item[];
  items?: Item[];
  isDualMode?: boolean;
  optionTitleA?: string;
  optionTitleB?: string;
  totalsA?: Totals;
  totalsB?: Totals;
  discountA?: { value?: number; type?: string };
  discountB?: { value?: number; type?: string };
  subtotal?: number;
  total?: number;
  notes?: string;
  validDays?: number;
  createdAt?: string;
  store?: {
    nm?: string;
    ad?: string;
    ph?: string;
    em?: string;
    ft?: string;
    cr?: string;
  };
};

/** Fix double-encoded UTF-8 (e.g. "Sangu\u00c3\u00b1a" \u2192 "Sangu\u00f1a").
 *  When UTF-8 bytes (0xC3 0xB1 for \u00f1) get misread as Latin-1, they produce \u00c3\u00b1.
 *  escape() converts each char to its Latin-1 byte value (%XX),
 *  then decodeURIComponent interprets %C3%B1 as UTF-8 bytes \u2192 correct \u00f1. */
function fixEncoding(str: string | undefined | null): string {
  if (!str) return '';
  try {
    return decodeURIComponent(escape(str));
  } catch {
    return str;
  }
}

function fmt(n: number | undefined, currency = 'MXN') {
  const v = typeof n === 'number' && isFinite(n) ? n : 0;
  return '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

function addItemRow(it: Item, idx: number) {
  const name = it.productName || it.name || 'Producto';
  const qty = it.qty || 1;
  const price = parseFloat(String(it.price ?? it.costPrice ?? 0)) || 0;
  const lineCost = qty * price;
  const disc = parseFloat(String(it.lineDiscount ?? 0)) || 0;
  const lineFinal = Math.max(0, lineCost - disc);
  return (
    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={{ padding: '8px 5px', fontSize: 12, color: '#0f172a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</td>
      <td style={{ padding: '8px 4px', fontSize: 12, textAlign: 'center', color: '#475569' }}>{qty}</td>
      <td style={{ padding: '8px 4px', fontSize: 12, textAlign: 'right', color: '#475569' }}>{fmt(price)}</td>
      <td style={{ padding: '8px 4px', fontSize: 12, textAlign: 'right', color: '#475569' }}>{disc > 0 ? fmt(disc) : '\u2014'}</td>
      <td style={{ padding: '8px 5px', fontSize: 12, textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>{fmt(lineFinal)}</td>
    </tr>
  );
}

function Section({ title, items, totals, color }: { title?: string | null; items?: Item[]; totals?: Totals; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      {title && (
        <div style={{ background: color, color: '#fff', padding: '7px 10px', fontSize: 12, fontWeight: 700, borderRadius: '8px 8px 0 0' }}>
          {title}
        </div>
      )}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', minWidth: 340 }}>
          <thead>
            <tr style={{ background: color, color: '#fff' }}>
              <th style={{ padding: '6px 5px', fontSize: 9, textTransform: 'uppercase', textAlign: 'left', whiteSpace: 'nowrap' }}>Producto</th>
              <th style={{ padding: '6px 4px', fontSize: 9, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>Cant.</th>
              <th style={{ padding: '6px 4px', fontSize: 9, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Costo</th>
              <th style={{ padding: '6px 4px', fontSize: 9, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Desc.</th>
              <th style={{ padding: '6px 5px', fontSize: 9, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap' }}>Final</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => addItemRow(it, i))}
          </tbody>
        </table>
      </div>
      {totals && (
        <div style={{ background: '#f8fafc', padding: '7px 10px', fontSize: 12, display: 'flex', justifyContent: 'space-between', borderRadius: '0 0 8px 8px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
          <span style={{ color: '#64748b' }}>Subtotal:</span>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{fmt(totals.subtotal)}</span>
        </div>
      )}
    </div>
  );
}

export default function QrClient() {
  const [q, setQ] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [id, setId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qid = params.get('id') || '';
    setId(qid);
    if (!qid) {
      setError('Falta el ID de la cotizaci\u00f3n');
      setLoading(false);
      return;
    }
    fetch(`/api/quotation?id=${encodeURIComponent(qid)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setQ(data);
        } else {
          setError(data.error || 'Cotizaci\u00f3n no encontrada o no sincronizada');
        }
        setLoading(false);
      })
      .catch(e => {
        setError('Error de red: ' + e.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>\u23f3</div>
          <div>Cargando cotizaci\u00f3n...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>\u26a0\ufe0f</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Cotizaci\u00f3n no disponible</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>{error}</p>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>ID: {id || '(vac\u00edo)'}</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>Solicita al vendedor que reenv\u00ede la cotizaci\u00f3n o que la sincronice desde la app.</p>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const store = q.store || {};
  const storeName = fixEncoding(store.nm) || 'Mi Tienda';
  const storeAddr = fixEncoding(store.ad) || '';
  const storePhone = store.ph || '';
  const storeEmail = store.em || '';
  const footerText = fixEncoding(store.ft) || 'Gracias por su preferencia';
  const currency = store.cr || 'MXN';

  const isDual = !!q.isDualMode && Array.isArray(q.itemsB) && (q.itemsB?.length ?? 0) > 0;
  const sections = isDual
    ? [
        { title: q.optionTitleA || 'Opci\u00f3n A', items: q.itemsA || q.items || [], totals: q.totalsA, color: '#22c55e' },
        { title: q.optionTitleB || 'Opci\u00f3n B', items: q.itemsB || [], totals: q.totalsB, color: '#3b82f6' },
      ]
    : [{ title: null, items: q.itemsA || q.items || [], totals: q.totalsA || { subtotal: q.subtotal, total: q.total }, color: '#22c55e' }];

  const createdDate = fmtDate(q.createdAt);
  const validDays = q.validDays || 15;
  const validDate = q.createdAt ? fmtDate(new Date(new Date(q.createdAt).getTime() + validDays * 86400000).toISOString()) : '';

  // Responsive padding: tighter on small screens
  const px = typeof window !== 'undefined' && window.innerWidth < 400 ? 10 : 16;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: 8, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: `14px ${px}px`, color: '#fff' }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 3 }}>{storeName}</div>
          {(storeAddr || storePhone || storeEmail) && (
            <div style={{ fontSize: 11, opacity: 0.9, lineHeight: 1.5, wordBreak: 'break-word' }}>
              {storeAddr && <div>\ud83d\udccd {storeAddr}</div>}
              {storePhone && <div style={{ marginTop: 2 }}>\ud83d\udcde {storePhone}</div>}
              {storeEmail && <div>\u2709\ufe0f {storeEmail}</div>}
            </div>
          )}
        </div>

        {/* Title bar */}
        <div style={{ padding: `10px ${px}px`, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ background: '#16a34a', color: '#fff', padding: '5px 14px', borderRadius: 10, fontSize: 15, fontWeight: 700 }}>COTIZACI\u00d3N</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{q.number || 'COT-001'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{createdDate}</div>
          </div>
        </div>

        {/* Client info */}
        {(q.clientName || q.customerPhone || q.customerEmail) && (
          <div style={{ margin: `10px ${px}px`, background: '#f0fdf4', borderRadius: 12, padding: 12, borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 4 }}>Cliente</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{q.clientName || '\u2014'}</div>
            {q.customerPhone && <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>\ud83d\udcde {q.customerPhone}</div>}
            {q.customerEmail && <div style={{ fontSize: 12, color: '#475569' }}>\u2709\ufe0f {q.customerEmail}</div>}
          </div>
        )}

        {/* Sections */}
        <div style={{ padding: `0 ${Math.max(px - 6, 6)}px` }}>
          {sections.map((sec, i) => (
            <Section key={i} title={sec.title} items={sec.items} totals={sec.totals} color={sec.color} />
          ))}
        </div>

        {/* Total */}
        <div style={{ padding: `0 ${px}px 12px` }}>
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #bbf7d0' }}>
            <div>
              <div style={{ fontSize: 10, color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>Total</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Moneda: {currency}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#15803d' }}>{fmt(q.total, currency)}</div>
          </div>
        </div>

        {/* Valid until + notes */}
        <div style={{ padding: `0 ${px}px 12px`, fontSize: 11, color: '#64748b' }}>
          {validDate && <div>\u2705 V\u00e1lida hasta: <strong style={{ color: '#0f172a' }}>{validDate}</strong> ({validDays} d\u00edas)</div>}
          {q.notes && (
            <div style={{ marginTop: 10, padding: 10, background: '#fef9c3', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#713f12' }}>
              <strong>Notas:</strong> {q.notes}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#0f172a', color: '#94a3b8', padding: '12px 16px', textAlign: 'center', fontSize: 11 }}>
          <div style={{ color: '#fff', fontWeight: 600, marginBottom: 3 }}>{footerText}</div>
          <div>Generado desde Inventario Pro</div>
        </div>

        {/* Action bar */}
        <div style={{ padding: `0 ${px}px 18px`, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => window.print()}
            style={{
              flex: '1 1 140px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            \ud83d\udda8\ufe0f Imprimir / Guardar PDF
          </button>
          <button
            onClick={() => {
              const txt =
                'Cotizaci\u00f3n ' + (q.number || '') + ' de ' + storeName + '\n' +
                'Total: ' + fmt(q.total, currency) + '\n' +
                'V\u00e1lida por ' + validDays + ' d\u00edas\n' +
                window.location.href;
              if (navigator.share) {
                navigator.share({ title: 'Cotizaci\u00f3n ' + (q.number || ''), text: txt }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.href);
                alert('Enlace copiado: ' + window.location.href);
              }
            }}
            style={{
              flex: '1 1 140px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            \ud83d\udce4 Compartir
          </button>
        </div>
      </div>
    </div>
  );
}
