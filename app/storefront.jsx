'use client';

import dynamic from 'next/dynamic';

const Storefront = dynamic(() => import('../apps/web/src/App.jsx'), {
  ssr: false,
  loading: () => <main className="app-shell loading"><div className="leaf-loader">✦</div><p>Gathering today’s fresh picks…</p></main>
});

export default function ClientStorefront() {
  return <Storefront />;
}
