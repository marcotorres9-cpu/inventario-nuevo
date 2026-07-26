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
      <td style={{ padding: '10px 8px', fontSize: 14, color: '#0f172a' }}>{name}</td>
      <td style={{ padding: '10px 8px', fontSize: 14, textAlign: 'center', color: '#475569' }}>{qty}</td>
      <td style={{ padding: '10px 8px', fontSize: 14, textAlign: 'right', color: '#475569' }}>{fmt(price)}</td>
      <td style={{ padding: '10px 8px', fontSize: 14, textAlign: 'right', color: '#475569' }}>{disc > 0 ? fmt(disc) : '—'}</td>
      <td style={{ padding: '10px 8px', fontSize: 14, textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>{fmt(lineFinal)}</td>
    </tr>
  );
}

function Section({ title, items, totals, color }: { title?: string | null; items?: Item[]; totals?: Totals; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      {title && (
        <div style={{ background: color, color: '#fff', padding: '8px 12px', fontSize: 13, fontWeight: 700, borderRadius: '8px 8px 0 0' }}>
          {title}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: color, color: '#fff' }}>
            <th style={{ padding: '8px 8px', fontSize: 10, textTransform: 'uppercase', textAlign: 'left' }}>Producto</th>
            <th style={{ padding: '8px 8px', fontSize: 10, textTransform: 'uppercase', textAlign: 'center' }}>Cant.</th>
            <th style={{ padding: '8px 8px', fontSize: 10, textTransform: 'uppercase', textAlign: 'right' }}>Costo</th>
            <th style={{ padding: '8px 8px', fontSize: 10, textTransform: 'uppercase', textAlign: 'right' }}>Desc.</th>
            <th style={{ padding: '8px 8px', fontSize: 10, textTransform: 'uppercase', textAlign: 'right' }}>Final</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => addItemRow(it, i))}
        </tbody>
      </table>
      {totals && (
        <div style={{ background: '#f8fafc', padding: '10px 12px', fontSize: 13, display: 'flex', justifyContent: 'space-between', borderRadius: '0 0 8px 8px', border: '1px solid #e2e8f0', borderTop: 'none' }}>
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
      setError('Falta el ID de la cotización');
      setLoading(false);
      return;
    }
    fetch(`/api/quotation?id=${encodeURIComponent(qid)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setQ(data);
        } else {
          setError(data.error || 'Cotización no encontrada o no sincronizada todavía');
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
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div>Cargando cotización...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto', padding: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Cotización no disponible</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>{error}</p>
          <p style={{ fontSize: 12, color: '#94a3b8' }}>ID: {id || '(vacío)'}</p>
          <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 16 }}>Solicita al vendedor que reenvíe la cotización o que la sincronice desde la app.</p>
        </div>
      </div>
    );
  }

  if (!q) return null;

  const store = q.store || {};
  const storeName = store.nm || 'Mi Tienda';
  const storeAddr = store.ad || '';
  const storePhone = store.ph || '';
  const storeEmail = store.em || '';
  const footerText = store.ft || 'Gracias por su preferencia';
  const currency = store.cr || 'MXN';

  const isDual = !!q.isDualMode && Array.isArray(q.itemsB) && (q.itemsB?.length ?? 0) > 0;
  const sections = isDual
    ? [
        { title: q.optionTitleA || 'Opción A', items: q.itemsA || q.items || [], totals: q.totalsA, color: '#22c55e' },
        { title: q.optionTitleB || 'Opción B', items: q.itemsB || [], totals: q.totalsB, color: '#3b82f6' },
      ]
    : [{ title: null, items: q.itemsA || q.items || [], totals: q.totalsA || { subtotal: q.subtotal, total: q.total }, color: '#22c55e' }];

  const createdDate = fmtDate(q.createdAt);
  const validDays = q.validDays || 15;
  const validDate = q.createdAt ? fmtDate(new Date(new Date(q.createdAt).getTime() + validDays * 86400000).toISOString()) : '';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '12px', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', padding: '20px 24px', color: '#fff' }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{storeName}</div>
          {(storeAddr || storePhone || storeEmail) && (
            <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.6 }}>
              {storeAddr && <div>📍 {storeAddr}</div>}
              {storePhone && <span>📞 {storePhone} </span>}
              {storeEmail && <span>✉️ {storeEmail}</span>}
            </div>
          )}
        </div>

        {/* Title bar */}
        <div style={{ padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ background: '#16a34a', color: '#fff', padding: '6px 16px', borderRadius: 10, fontSize: 16, fontWeight: 700 }}>COTIZACIÓN</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>{q.number || 'COT-001'}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{createdDate}</div>
          </div>
        </div>

        {/* Client info */}
        {(q.clientName || q.customerPhone || q.customerEmail) && (
          <div style={{ margin: '16px 24px', background: '#f0fdf4', borderRadius: 12, padding: 16, borderLeft: '4px solid #16a34a' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 6 }}>Cliente</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{q.clientName || '—'}</div>
            {q.customerPhone && <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>📞 {q.customerPhone}</div>}
            {q.customerEmail && <div style={{ fontSize: 13, color: '#475569' }}>✉️ {q.customerEmail}</div>}
          </div>
        )}

        {/* Sections */}
        <div style={{ padding: '0 24px' }}>
          {sections.map((sec, i) => (
            <Section key={i} title={sec.title} items={sec.items} totals={sec.totals} color={sec.color} />
          ))}
        </div>

        {/* Total */}
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #bbf7d0' }}>
            <div>
              <div style={{ fontSize: 11, color: '#15803d', textTransform: 'uppercase', fontWeight: 700 }}>Total</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Moneda: {currency}</div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#15803d' }}>{fmt(q.total, currency)}</div>
          </div>
        </div>

        {/* Valid until + notes */}
        <div style={{ padding: '0 24px 16px', fontSize: 12, color: '#64748b' }}>
          {validDate && <div>✅ Válida hasta: <strong style={{ color: '#0f172a' }}>{validDate}</strong> ({validDays} días)</div>}
          {q.notes && (
            <div style={{ marginTop: 12, padding: 12, background: '#fef9c3', borderRadius: 8, border: '1px solid #fde68a', fontSize: 13, color: '#713f12' }}>
              <strong>Notas:</strong> {q.notes}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#0f172a', color: '#94a3b8', padding: '14px 24px', textAlign: 'center', fontSize: 12 }}>
          <div style={{ color: '#fff', fontWeight: 600, marginBottom: 4 }}>{footerText}</div>
          <div>Generado desde Inventario Pro</div>
        </div>
      </div>
    </div>
  );
}
