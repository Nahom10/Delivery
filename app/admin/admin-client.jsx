'use client';

import dynamic from 'next/dynamic';

const AdminApp = dynamic(() => import('../../apps/web/src/AdminApp.jsx'), { ssr: false });

export default function AdminClient() { return <AdminApp />; }