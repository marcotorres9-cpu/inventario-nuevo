import { Suspense } from 'react';
import QrClient from './QrClient';

export const dynamic = 'force-dynamic';

export default function QrPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', fontFamily: 'system-ui' }}>Cargando cotización...</div>}>
      <QrClient />
    </Suspense>
  );
}
