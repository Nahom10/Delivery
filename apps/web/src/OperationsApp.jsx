'use client';

import { useEffect, useState } from 'react';
import { api } from './api.js';
import { t, detectLanguage, localizedStatus } from './i18n.js';
import { requestPreferredLocation } from './telegram.js';

const money = (value) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(value).replace('ETB', 'ETB ');

function Message({ error, lang }) { return error ? <p className="operations-error">{error}</p> : null; }

function StaffBoard({ token, lang }) {
  const [orders, setOrders] = useState([]); const [riders, setRiders] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const refresh = () => Promise.all([api.staffOrders(token), api.staffRiders(token)]).then(([orderData, riderData]) => { setOrders(orderData.orders); setRiders(riderData.riders); }).catch((requestError) => setError(requestError.message));
  useEffect(() => { refresh(); }, [token]);
  const update = async (orderId, status) => { try { setBusy(orderId); await api.changeOrderStatus(token, orderId, status); await refresh(); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const assign = async (orderId, riderId) => { try { setBusy(orderId); await api.assignRider(token, orderId, riderId); await refresh(); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const next = (order) => order.type === 'pickup'
    ? ({ placed: 'confirmed', confirmed: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'collected', collected: 'completed' })[order.fulfillmentStatus]
    : ({ placed: 'confirmed', confirmed: 'preparing' })[order.fulfillmentStatus];
  return <main className="operations-shell"><header><p className="eyebrow">{t(lang, 'shopStaff')}</p><h1>{t(lang, 'orderBoard')}</h1><button onClick={refresh}>{t(lang, 'refresh')}</button></header><Message error={error} lang={lang} /><section className="operations-list">{orders.map((order) => <article className="operations-card" key={order.id}><div className="operations-card-head"><div><strong>{order.id}</strong><small>{order.type === 'delivery' ? t(lang, 'deliveryLabel') : t(lang, 'pickupLabel')} · {money(order.total)}</small></div><span className="status-pill">{localizedStatus(lang, order.fulfillmentStatus)}</span></div><p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</p>{order.type === 'delivery' && <><p className="muted">{order.address?.area || order.address?.street || t(lang, 'deliveryLabel')}</p><label className="operations-select">{t(lang, 'assignRider')}<select value={order.assignedRiderId || ''} disabled={busy === order.id} onChange={(event) => event.target.value && assign(order.id, event.target.value)}><option value="">{t(lang, 'assignRider')}</option>{riders.map((rider) => <option key={rider.telegramUserId} value={rider.telegramUserId}>{rider.firstName || rider.username || rider.telegramUserId}</option>)}</select></label></>}{next(order) && <button className="operations-primary" disabled={busy === order.id} onClick={() => update(order.id, next(order))}>{t(lang, 'mark', { status: localizedStatus(lang, next(order)) })}</button>}</article>)}</section>{!orders.length && <div className="operations-empty">{t(lang, 'noOrdersYet')}</div>}</main>;
}

function RiderBoard({ token, lang }) {
  const [orders, setOrders] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(''); const [proofOrder, setProofOrder] = useState(null); const [customerName, setCustomerName] = useState(''); const [photoDataUrl, setPhotoDataUrl] = useState('');
  const refresh = () => api.riderOrders(token).then(({ orders: assigned }) => setOrders(assigned)).catch((requestError) => setError(requestError.message));
  useEffect(() => { refresh(); }, [token]);
  const shareLocation = async () => { try { setBusy('location'); await api.publishRiderLocation(token, await requestPreferredLocation()); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const update = async (order, status) => { try { setBusy(order.id); await api.changeOrderStatus(token, order.id, status); await refresh(); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const capture = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setError(t(lang, 'imageTooLarge')); return; } const reader = new FileReader(); reader.onload = () => setPhotoDataUrl(String(reader.result)); reader.readAsDataURL(file); };
  const submitProof = async () => { try { setBusy(proofOrder.id); await api.deliveryProof(token, proofOrder.id, { customerName, photoDataUrl }); setProofOrder(null); setCustomerName(''); setPhotoDataUrl(''); await update(proofOrder, 'delivered'); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  return <main className="operations-shell"><header><p className="eyebrow">{t(lang, 'deliveryRider')}</p><h1>{t(lang, 'myDeliveries')}</h1><button onClick={shareLocation} disabled={busy === 'location'}>{busy === 'location' ? t(lang, 'sharing') : t(lang, 'shareLocation')}</button></header><Message error={error} lang={lang} /><section className="operations-list">{orders.map((order) => <article className="operations-card" key={order.id}><div className="operations-card-head"><div><strong>{order.id}</strong><small>{money(order.total)} · {order.address?.area || order.address?.street}</small></div><span className="status-pill">{localizedStatus(lang, order.fulfillmentStatus)}</span></div><p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</p>{order.address?.landmark && <p className="muted">{t(lang, 'landmarkPrefix')}{order.address.landmark}</p>}{order.fulfillmentStatus === 'preparing' && <button className="operations-primary" disabled={busy === order.id} onClick={() => update(order, 'out_for_delivery')}>{t(lang, 'startDelivery')}</button>}{order.fulfillmentStatus === 'out_for_delivery' && <button className="operations-primary" disabled={busy === order.id} onClick={() => setProofOrder(order)}>{t(lang, 'captureProof')}</button>}</article>)}</section>{!orders.length && <div className="operations-empty">{t(lang, 'noAssigned')}</div>}{proofOrder && <div className="sheet-backdrop"><section className="cart-sheet proof-sheet"><div className="sheet-head"><h2>{t(lang, 'deliveryProof')}</h2><button className="icon-button" onClick={() => setProofOrder(null)}>×</button></div><label>{t(lang, 'customerName')}<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={t(lang, 'customerNamePlaceholder')} /></label><label>{t(lang, 'photoProof')}<input type="file" accept="image/*" capture="environment" onChange={capture} /></label>{photoDataUrl && <img src={photoDataUrl} alt={t(lang, 'proofPreview')} className="proof-preview" />}<button className="checkout-button" disabled={busy === proofOrder.id || (!customerName && !photoDataUrl)} onClick={submitProof}>{t(lang, 'confirmDelivery')}</button></section></div>}</main>;
}

export default function OperationsApp() {
  const [session, setSession] = useState(null); const [error, setError] = useState('');
  const lang = detectLanguage();
  useEffect(() => { const role = new URLSearchParams(window.location.search).get('role') || 'staff'; api.authenticateDevelopment(role).then(setSession).catch(() => setError(t(lang, 'operationsAccessError'))); }, [lang]);
  if (error) return <main className="operations-shell"><div className="operations-empty">{error}</div></main>;
  if (!session) return <main className="operations-shell"><div className="operations-empty">{t(lang, 'openingOperations')}</div></main>;
  return session.user.role === 'rider' ? <RiderBoard token={session.token} lang={lang} /> : <StaffBoard token={session.token} lang={lang} />;
}