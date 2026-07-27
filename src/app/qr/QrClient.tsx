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

function fixEncoding(str: string | undefined | null): string {
  if (!str) return '';
  try { return decodeURIComponent(escape(str)); } catch { return str; }
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

function CardRow({ label, value, price, disc, final }: { label: string; value: number | string; price?: number; disc?: number; final?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
      <div style={{ flex: 1, minWidth: 0, fontWeight: 600, color: '#0f172a', paddingRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ width: 30, textAlign: 'center', color: '#64748b', flexShrink: 0 }}>{value}</div>
      <div style={{ width: 65, textAlign: 'right', color: '#64748b', flexShrink: 0 }}>{price !== undefined ? fmt(price) : ''}</div>
      <div style={{ width: 55, textAlign: 'right', color: '#64748b', flexShrink: 0 }}>{disc !== undefined && disc > 0 ? fmt(disc) : '-'}</div>
      <div style={{ width: 65, textAlign: 'right', fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>{final !== undefined ? fmt(final) : ''}</div>
    </div>
  );
}

function SectionCards({ title, items, totals, color }: { title?: string | null; items?: Item[]; totals?: Totals; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      {title && (
        <div style={{ background: color, color: '#fff', padding: '7px 12px', fontSize: 12, fontWeight: 700, borderRadius: '8px 8px 0 0' }}>
          {title}
        </div>
      )}
      <div style={{ background: '#fff', padding: '0 12px 4px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '2px solid ' + color, fontSize: 10, textTransform: 'uppercase', color: color, fontWeight: 700 }}>
          <div style={{ flex: 1, minWidth: 0 }}>Producto</div>
          <div style={{ width: 30, textAlign: 'center', flexShrink: 0 }}>Cant.</div>
          <div style={{ width: 65, textAlign: 'right', flexShrink: 0 }}>Costo</div>
          <div style={{ width: 55, textAlign: 'right', flexShrink: 0 }}>Desc.</div>
          <div style={{ width: 65, textAlign: 'right', flexShrink: 0 }}>Final</div>
        </div>
        {items.map((it, i) => {
          const name = it.productName || it.name || 'Producto';
          const qty = it.qty || 1;
          const price = parseFloat(String(it.price ?? it.costPrice ?? 0)) || 0;
          const lineCost = qty * price;
          const disc = parseFloat(String(it.lineDiscount ?? 0)) || 0;
          const lineFinal = Math.max(0, lineCost - disc);
          return <CardRow key={i} label={name} value={qty} price={price} disc={disc} final={lineFinal} />;
        })}
      </div>
      {totals && (
        <div style={{ background: '#f8fafc', padding: '8px 12px', fontSize: 12, display: 'flex', justifyContent: 'space-between', borderRadius: '0 0 8px 8px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
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
      setError('Falta el ID de la cotizacion');
      setLoading(false);
      return;
    }
    fetch('/api/quotation?id=' + encodeURIComponent(qid), { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setQ(data);
        } else {
          setError(data.error || 'Cotizacion no encontrada o no sincronizada');
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
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>...</div>
          <div>Cargando cotizacion...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>!</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Cotizacion no disponible</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>{error}</p>
          <p style={{ fontSize: 11, color: '#94a3b8' }}>ID: {id || '(vacio)'}</p>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 14 }}>Solicita al vendedor que reenvie la cotizacion o que la sincronice desde la app.</p>
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
        { title: q.optionTitleA || 'Opcion A', items: q.itemsA || q.items || [], totals: q.totalsA, color: '#22c55e' },
        { title: q.optionTitleB || 'Opcion B', items: q.itemsB || [], totals: q.totalsB, color: '#3b82f6' },
      ]
    : [{ title: null, items: q.itemsA || q.items || [], totals: q.totalsA || { subtotal: q.subtotal, total: q.total }, color: '#22c55e' }];

  const createdDate = fmtDate(q.createdAt);
  const validDays = q.validDays || 15;
  const validDate = q.createdAt ? fmtDate(new Date(new Date(q.createdAt).getTime() + validDays * 86400000).toISOString()) : '';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: 8, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '14px 16px', color: '#fff' }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 3 }}>{storeName}</div>
          {(storeAddr || storePhone || storeEmail) && (
            <div style={{ fontSize: 11, opacity: 0.9, lineHeight: 1.5, wordBreak: 'break-word' }}>
              {storeAddr && <div>Direccion: {storeAddr}</div>}
              {storePhone && <div>Tel: {storePhone}</div>}
              {storeEmail && <div>Email: {storeEmail}</div>}
            </div>
          )}
        </div>

        {/* Title bar */}
        <div style={{ padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ background: '#16a34a', color: '#fff', padding: '5px 14px', borderRadius: 8, fontSize: 14, fontWeight: 700 }}>COTIZACION</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{q.number || 'COT-001'}</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>{createdDate}</div>
          </div>
        </div>

        {/* Client info */}
        {(q.clientName || q.customerPhone || q.customerEmail) && (
          <div style={{ margin: '10px 16px', background: '#f0fdf4', borderRadius: 10, padding: 12, borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 4 }}>Cliente</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{q.clientName || '-'}</div>
            {q.customerPhone && <div style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>Tel: {q.customerPhone}</div>}
            {q.customerEmail && <div style={{ fontSize: 12, color: '#475569' }}>Email: {q.customerEmail}</div>}
          </div>
        )}

        {/* Product sections — using flex cards instead of table for mobile */}
        <div style={{ padding: '0 8px' }}>
          {sections.map((sec, i) => (
            <SectionCards key={i} title={sec.title} items={sec.items} totals={sec.totals} color={sec.color} />
          ))}
        </div>

        {/* Total */}
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #bbf7d0' }}>
            <div>
              <div style={{ fontSize: 10, color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>Total</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Moneda: {currency}</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#15803d' }}>{fmt(q.total, currency)}</div>
          </div>
        </div>

        {/* Valid until + notes */}
        <div style={{ padding: '0 16px 12px', fontSize: 11, color: '#64748b' }}>
          {validDate && <div>Valida hasta: <strong style={{ color: '#0f172a' }}>{validDate}</strong> ({validDays} dias)</div>}
          {q.notes && (
            <div style={{ marginTop: 10, padding: 10, background: '#fef9c3', borderRadius: 8, border: '1px solid #fde68a', fontSize: 12, color: '#713f12' }}>
              <strong>Notas:</strong> {q.notes}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#0f172a', color: '#94a3b8', padding: '10px 16px', textAlign: 'center', fontSize: 11 }}>
          <div style={{ color: '#fff', fontWeight: 600, marginBottom: 3 }}>{footerText}</div>
          <div>Generado desde Inventario Pro</div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '12px 16px 16px', display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{
              flex: 1,
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Imprimir / Guardar PDF
          </button>
          <button
            onClick={() => {
              const txt =
                'Cotizacion ' + (q.number || '') + ' de ' + storeName + '\n' +
                'Total: ' + fmt(q.total, currency) + '\n' +
                'Valida por ' + validDays + ' dias\n' +
                window.location.href;
              if (navigator.share) {
                navigator.share({ title: 'Cotizacion ' + (q.number || ''), text: txt }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.href);
                alert('Enlace copiado: ' + window.location.href);
              }
            }}
            style={{
              flex: 1,
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Compartir
          </button>
        </div>
      </div>
    </div>
  );
}
