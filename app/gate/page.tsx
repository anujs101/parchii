// app/gate/page.tsx
import dynamic from 'next/dynamic';
import React from 'react';

// dynamic import to ensure client component loads properly in app router
// relative path assumes this file sits next to ScanPage.tsx
const ScanPage = dynamic(() => import('./ScanPage'), { ssr: false });

export default function GateRoutePage() {
  return (
    <main style={{ padding: 20 }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>Parchi — Gate (Scan)</h1>
      <ScanPage />
    </main>
  );
}
