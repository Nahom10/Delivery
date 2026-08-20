'use client';

import dynamic from 'next/dynamic';

const OperationsApp = dynamic(() => import('../../apps/web/src/OperationsApp.jsx'), { ssr: false });

export default function OperationsClient() { return <OperationsApp />; }
