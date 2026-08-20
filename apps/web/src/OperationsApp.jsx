'use client';

import { useEffect, useState } from 'react';
import { api } from './api.js';
import { requestPreferredLocation } from './telegram.js';

const label = (status) => status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const money = (value) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(value).replace('ETB', 'ETB ');

function Message({ error }) { return error ? <p className="operations-error">{error}</p> : null; }

function StaffBoard({ token }) {
  const [orders, setOrders] = useState([]); const [riders, setRiders] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const refresh = () => Promise.all([api.staffOrders(token), api.staffRiders(token)]).then(([orderData, riderData]) => { setOrders(orderData.orders); setRiders(riderData.riders); }).catch((requestError) => setError(requestError.message));
  useEffect(() => { refresh(); }, [token]);
  const update = async (orderId, status) => { try { setBusy(orderId); await api.changeOrderStatus(token, orderId, status); await refresh(); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const assign = async (orderId, riderId) => { try { setBusy(orderId); await api.assignRider(token, orderId, riderId); await refresh(); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const next = (order) => order.type === 'pickup'
    ? ({ placed: 'confirmed', confirmed: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'collected', collected: 'completed' })[order.fulfillmentStatus]
    : ({ placed: 'confirmed', confirmed: 'preparing' })[order.fulfillmentStatus];
  return <main className="operations-shell"><header><p className="eyebrow">SHOP STAFF</p><h1>Order board</h1><button onClick={refresh}>Refresh</button></header><Message error={error} /><section className="operations-list">{orders.map((order) => <article className="operations-card" key={order.id}><div className="operations-card-head"><div><strong>{order.id}</strong><small>{order.type === 'delivery' ? '🛵 Delivery' : '🏪 Pickup'} · {money(order.total)}</small></div><span className="status-pill">{label(order.fulfillmentStatus)}</span></div><p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</p>{order.type === 'delivery' && <><p className="muted">{order.address?.area || order.address?.street || 'Delivery address'}</p><label className="operations-select">Rider<select value={order.assignedRiderId || ''} disabled={busy === order.id} onChange={(event) => event.target.value && assign(order.id, event.target.value)}><option value="">Assign a rider</option>{riders.map((rider) => <option key={rider.telegramUserId} value={rider.telegramUserId}>{rider.firstName || rider.username || rider.telegramUserId}</option>)}</select></label></>}{next(order) && <button className="operations-primary" disabled={busy === order.id} onClick={() => update(order.id, next(order))}>Mark {label(next(order))}</button>}</article>)}</section>{!orders.length && <div className="operations-empty">No orders yet.</div>}</main>;
}

function RiderBoard({ token }) {
  const [orders, setOrders] = useState([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(''); const [proofOrder, setProofOrder] = useState(null); const [customerName, setCustomerName] = useState(''); const [photoDataUrl, setPhotoDataUrl] = useState('');
  const refresh = () => api.riderOrders(token).then(({ orders: assigned }) => setOrders(assigned)).catch((requestError) => setError(requestError.message));
  useEffect(() => { refresh(); }, [token]);
  const shareLocation = async () => { try { setBusy('location'); await api.publishRiderLocation(token, await requestPreferredLocation()); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const update = async (order, status) => { try { setBusy(order.id); await api.changeOrderStatus(token, order.id, status); await refresh(); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  const capture = (event) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/') || file.size > 3 * 1024 * 1024) { setError('Select an image smaller than 3 MB.'); return; } const reader = new FileReader(); reader.onload = () => setPhotoDataUrl(String(reader.result)); reader.readAsDataURL(file); };
  const submitProof = async () => { try { setBusy(proofOrder.id); await api.deliveryProof(token, proofOrder.id, { customerName, photoDataUrl }); setProofOrder(null); setCustomerName(''); setPhotoDataUrl(''); await update(proofOrder, 'delivered'); } catch (requestError) { setError(requestError.message); } finally { setBusy(''); } };
  return <main className="operations-shell"><header><p className="eyebrow">DELIVERY RIDER</p><h1>My deliveries</h1><button onClick={shareLocation} disabled={busy === 'location'}>{busy === 'location' ? 'Sharing…' : 'Share location'}</button></header><Message error={error} /><section className="operations-list">{orders.map((order) => <article className="operations-card" key={order.id}><div className="operations-card-head"><div><strong>{order.id}</strong><small>{money(order.total)} · {order.address?.area || order.address?.street}</small></div><span className="status-pill">{label(order.fulfillmentStatus)}</span></div><p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</p>{order.address?.landmark && <p className="muted">Landmark: {order.address.landmark}</p>}{order.fulfillmentStatus === 'preparing' && <button className="operations-primary" disabled={busy === order.id} onClick={() => update(order, 'out_for_delivery')}>Start delivery</button>}{order.fulfillmentStatus === 'out_for_delivery' && <button className="operations-primary" disabled={busy === order.id} onClick={() => setProofOrder(order)}>Capture delivery proof</button>}</article>)}</section>{!orders.length && <div className="operations-empty">No assigned deliveries.</div>}{proofOrder && <div className="sheet-backdrop"><section className="cart-sheet proof-sheet"><div className="sheet-head"><h2>Delivery proof</h2><button className="icon-button" onClick={() => setProofOrder(null)}>×</button></div><label>Customer confirmation name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" /></label><label>Photo proof (optional)<input type="file" accept="image/*" capture="environment" onChange={capture} /></label>{photoDataUrl && <img src={photoDataUrl} alt="Delivery proof preview" className="proof-preview" />}<button className="checkout-button" disabled={busy === proofOrder.id || (!customerName && !photoDataUrl)} onClick={submitProof}>Confirm delivery</button></section></div>}</main>;
}

export default function OperationsApp() {
  const [session, setSession] = useState(null); const [error, setError] = useState('');
  useEffect(() => { const role = new URLSearchParams(window.location.search).get('role') || 'staff'; api.authenticateDevelopment(role).then(setSession).catch((requestError) => setError('Operations access requires a real staff/rider Telegram account in production. Local preview: add ?role=staff or ?role=rider.')); }, []);
  if (error) return <main className="operations-shell"><div className="operations-empty">{error}</div></main>;
  if (!session) return <main className="operations-shell"><div className="operations-empty">Opening operations…</div></main>;
  return session.user.role === 'rider' ? <RiderBoard token={session.token} /> : <StaffBoard token={session.token} />;
}
