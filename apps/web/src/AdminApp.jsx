'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const money = (v) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(v).replace('ETB', 'ETB ');
const label = (s) => s?.replaceAll('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '';
const date = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const TABS = ['Products', 'Promotions', 'Orders', 'Delivery', 'Riders', 'Users', 'Reports'];

/* ─── API helpers for admin ─── */
const adminApi = {
  products: (token) => fetch('/api/admin/products', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
  createProduct: (token, data) => fetch('/api/admin/products', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  updateProduct: (token, id, data) => fetch(`/api/admin/products/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteProduct: (token, id) => fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }),
  promotions: (token) => fetch('/api/admin/promotions', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
  createPromotion: (token, data) => fetch('/api/admin/promotions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  updatePromotion: (token, id, data) => fetch(`/api/admin/promotions/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  orders: (token) => fetch('/api/admin/orders', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
  deliveryRules: (token) => fetch('/api/admin/delivery/rules', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
  updateDeliveryRules: (token, data) => fetch('/api/admin/delivery/rules', { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  zones: (token) => fetch('/api/admin/delivery/zones', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
  createZone: (token, data) => fetch('/api/admin/delivery/zones', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  updateZone: (token, id, data) => fetch(`/api/admin/delivery/zones/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  riders: (token) => fetch('/api/staff/riders', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
  users: (token) => fetch('/api/admin/users', { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
  updateUserRole: (token, id, role) => fetch(`/api/admin/users/${id}/role`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ role }) }).then(r => r.json()),
  report: (token, period) => fetch(`/api/admin/reports?period=${period}`, { headers: { authorization: `Bearer ${token}` } }).then(r => r.json()),
};

/* ─── Products Tab ─── */
function ProductsTab({ token }) {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { adminApi.products(token).then(d => setProducts(d.products || [])).catch(e => setError(e.message)); }, [token]);
  useEffect(load, [load]);

  const startNew = () => { setEditing('new'); setForm({ name: '', categoryId: 'vegetables', description: '', price: '', unit: 'kg', stock: '', imageUrl: '', active: true, discountType: 'none', discountValue: '', discountStartsAt: '', discountEndsAt: '', discountActive: true }); setError(''); };
  const startEdit = (p) => { setEditing(p.id); setForm({ name: p.name || '', categoryId: p.categoryId || '', description: p.description || '', price: p.price?.original ?? p.price ?? '', unit: p.unit || '', stock: p.stock || '', imageUrl: p.imageUrl || '', active: p.active !== false, discountType: p.discount?.active ? p.discount.kind : 'none', discountValue: p.discount?.value ?? '', discountStartsAt: p.discount?.startsAt?.slice(0, 16) || '', discountEndsAt: p.discount?.endsAt?.slice(0, 16) || '', discountActive: p.discount?.active !== false }); setError(''); };
  const cancel = () => { setEditing(null); setError(''); };

  const save = async () => {
    try {
      setBusy(true); setError('');
      const data = { ...form, price: Number(form.price), stock: Number(form.stock), discountType: form.discountType === 'none' ? 'none' : form.discountType, discountActive: form.discountActive };
      if (form.discountType === 'none') { data.discountValue = undefined; data.discountStartsAt = undefined; data.discountEndsAt = undefined; }
      if (editing === 'new') { await adminApi.createProduct(token, data); }
      else { await adminApi.updateProduct(token, editing, data); }
      setEditing(null); load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await adminApi.deleteProduct(token, id); load(); } catch (e) { setError(e.message); }
  };

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>Products ({products.length})</h2>
      {!editing && <button className="admin-btn" onClick={startNew}>+ Add Product</button>}
    </div>
    {error && <p className="form-error">{error}</p>}

    {editing && <div className="admin-card">
      <h3>{editing === 'new' ? 'New Product' : 'Edit Product'}</h3>
      <div className="admin-form">
        <div className="admin-form-row">
          <label>Name<input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Product name" /></label>
          <label>Category<select value={form.categoryId} onChange={e => update('categoryId', e.target.value)}>
            <option value="vegetables">Vegetables</option><option value="fruits">Fruits</option><option value="herbs">Herbs</option><option value="pantry">Packaged Goods</option>
          </select></label>
        </div>
        <label>Description<textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder="Short description" rows={2} /></label>
        <div className="admin-form-row">
          <label>Price (ETB)<input type="number" value={form.price} onChange={e => update('price', e.target.value)} min="0" /></label>
          <label>Unit<select value={form.unit} onChange={e => update('unit', e.target.value)}>
            <option value="kg">kg</option><option value="piece">piece</option><option value="bunch">bunch</option><option value="pack">pack</option>
          </select></label>
        </div>
        <div className="admin-form-row">
          <label>Stock<input type="number" value={form.stock} onChange={e => update('stock', e.target.value)} min="0" /></label>
          <label>Active<select value={form.active ? 'true' : 'false'} onChange={e => update('active', e.target.value === 'true')}>
            <option value="true">Active</option><option value="false">Inactive</option>
          </select></label>
        </div>
        <label>Image URL<input value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} placeholder="https://..." /></label>
        <div className="admin-card" style={{ margin: '14px 0 0', padding: 16, boxShadow: 'none' }}>
          <h3 style={{ marginBottom: 10 }}>Discount (optional)</h3>
          <div className="admin-form-row">
            <label>Discount Type<select value={form.discountType} onChange={e => update('discountType', e.target.value)}>
              <option value="none">No discount</option><option value="percentage">Percentage (%)</option><option value="fixed">Fixed (ETB)</option>
            </select></label>
            {form.discountType !== 'none' && <>
              <label>Discount Value<input type="number" value={form.discountValue} onChange={e => update('discountValue', e.target.value)} min="0" step="0.5" placeholder={form.discountType === 'percentage' ? 'e.g. 20' : 'e.g. 10'} /></label>
            </>}
          </div>
          {form.discountType !== 'none' && <div className="admin-form-row" style={{ marginTop: 12 }}>
            <label>Starts<input type="datetime-local" value={form.discountStartsAt} onChange={e => update('discountStartsAt', e.target.value)} /></label>
            <label>Ends<input type="datetime-local" value={form.discountEndsAt} onChange={e => update('discountEndsAt', e.target.value)} /></label>
          </div>}
          {form.discountType !== 'none' && <div className="admin-form-row" style={{ marginTop: 12 }}>
            <label>Status<select value={form.discountActive ? 'true' : 'false'} onChange={e => update('discountActive', e.target.value === 'true')}>
              <option value="true">Active</option><option value="false">Inactive</option>
            </select></label>
          </div>}
        </div>
        <div className="admin-actions">
          <button className="admin-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Product'}</button>
          <button className="admin-btn secondary" onClick={cancel}>Cancel</button>
        </div>
      </div>
    </div>}

    <table className="admin-table">
      <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>
        {products.map(p => <tr key={p.id}>
          <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />}
            <div><strong>{p.name}</strong><br /><small style={{ color: '#8fa398' }}>{p.unit}</small></div>
          </td>
          <td>{label(p.categoryId)}</td>
          <td>{money(p.price?.current ?? p.price)}{p.price?.discountPercent > 0 && <span className="discount-badge" style={{ marginLeft: 6, position: 'static' }}>-{p.price.discountPercent}%</span>}</td>
          <td><span style={{ color: p.stock < 5 ? '#d14c3b' : 'inherit', fontWeight: p.stock < 5 ? 800 : 400 }}>{p.stock}</span></td>
          <td><span className={`status-pill ${p.active !== false ? '' : 'cancelled'}`}>{p.active !== false ? 'Active' : 'Inactive'}</span></td>
          <td>
            <div className="admin-actions">
              <button className="admin-btn secondary" onClick={() => startEdit(p)}>Edit</button>
              <button className="admin-btn danger" onClick={() => remove(p.id)}>Remove</button>
            </div>
          </td>
        </tr>)}
      </tbody>
    </table>
  </>;
}

/* ─── Promotions Tab ─── */
function PromotionsTab({ token }) {
  const [promos, setPromos] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { adminApi.promotions(token).then(d => setPromos(d.promotions || [])).catch(e => setError(e.message)); }, [token]);
  useEffect(load, [load]);

  const startNew = () => { setEditing('new'); setForm({ title: '', subtitle: '', imageUrl: '', targetType: 'sale', targetId: '', priority: 0, startsAt: new Date().toISOString().slice(0, 16), endsAt: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16), active: true }); };
  const startEdit = (p) => { setEditing(p.id); setForm({ ...p, startsAt: p.startsAt?.slice(0, 16) || '', endsAt: p.endsAt?.slice(0, 16) || '' }); };
  const cancel = () => { setEditing(null); setError(''); };
  const update = (f, v) => setForm(c => ({ ...c, [f]: v }));

  const save = async () => {
    try {
      setBusy(true); setError('');
      if (editing === 'new') await adminApi.createPromotion(token, form);
      else await adminApi.updatePromotion(token, editing, form);
      setEditing(null); load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>Promotions ({promos.length})</h2>
      {!editing && <button className="admin-btn" onClick={startNew}>+ Add Promotion</button>}
    </div>
    {error && <p className="form-error">{error}</p>}

    {editing && <div className="admin-card">
      <h3>{editing === 'new' ? 'New Promotion' : 'Edit Promotion'}</h3>
      <div className="admin-form">
        <label>Title<input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Weekend Fruit Sale" /></label>
        <label>Subtitle<input value={form.subtitle} onChange={e => update('subtitle', e.target.value)} placeholder="e.g. 20% off all fruits" /></label>
        <label>Banner Image URL<input value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} placeholder="https://..." /></label>
        <div className="admin-form-row">
          <label>Target Type<select value={form.targetType} onChange={e => update('targetType', e.target.value)}>
            <option value="product">Product</option><option value="category">Category</option><option value="sale">Sale page</option>
          </select></label>
          <label>Target ID<input value={form.targetId || ''} onChange={e => update('targetId', e.target.value)} placeholder="Product or category ID" /></label>
        </div>
        <div className="admin-form-row">
          <label>Start<input type="datetime-local" value={form.startsAt} onChange={e => update('startsAt', e.target.value)} /></label>
          <label>End<input type="datetime-local" value={form.endsAt} onChange={e => update('endsAt', e.target.value)} /></label>
        </div>
        <div className="admin-form-row">
          <label>Priority (lower = first)<input type="number" value={form.priority} onChange={e => update('priority', e.target.value)} min="0" /></label>
          <label>Status<select value={form.active ? 'true' : 'false'} onChange={e => update('active', e.target.value === 'true')}>
            <option value="true">Active</option><option value="false">Inactive</option>
          </select></label>
        </div>
        <div className="admin-actions">
          <button className="admin-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Promotion'}</button>
          <button className="admin-btn secondary" onClick={cancel}>Cancel</button>
        </div>
      </div>
    </div>}

    <div style={{ display: 'grid', gap: 12 }}>
      {promos.map(p => <div className="admin-card" key={p.id} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: 100, height: 60, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{p.title}</strong>
          <div style={{ color: '#8fa398', fontSize: 12, marginTop: 2 }}>{p.subtitle}</div>
          <div style={{ color: '#8fa398', fontSize: 11, marginTop: 4 }}>{date(p.startsAt)} → {date(p.endsAt)}</div>
        </div>
        <span className={`status-pill ${p.active ? '' : 'cancelled'}`}>{p.active ? 'Active' : 'Inactive'}</span>
        <button className="admin-btn secondary" onClick={() => startEdit(p)}>Edit</button>
      </div>)}
    </div>
  </>;
}

/* ─── Orders Tab ─── */
function OrdersTab({ token }) {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => { adminApi.orders(token).then(d => setOrders(d.orders || [])).catch(e => setError(e.message)); }, [token]);
  useEffect(load, [load]);

  const filtered = filter === 'all' ? orders : orders.filter(o => o.fulfillmentStatus === filter);

  const nextStatus = (order) => order.type === 'delivery'
    ? ({ placed: 'confirmed', confirmed: 'preparing', preparing: 'out_for_delivery', out_for_delivery: 'delivered', delivered: 'completed' })[order.fulfillmentStatus]
    : ({ placed: 'confirmed', confirmed: 'preparing', preparing: 'ready_for_pickup', ready_for_pickup: 'collected', collected: 'completed' })[order.fulfillmentStatus];

  const advance = async (order) => {
    try { setBusy(order.id); await api.changeOrderStatus(token, order.id, nextStatus(order)); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };
  const cancelOrder = async (order) => {
    try { setBusy(order.id); await api.changeOrderStatus(token, order.id, 'cancelled'); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>Orders ({filtered.length})</h2>
      <button className="admin-btn secondary" onClick={load}>Refresh</button>
    </div>
    {error && <p className="form-error">{error}</p>}

    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 16, paddingBottom: 2 }}>
      {['all', 'placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'collected', 'completed', 'cancelled', 'refunded'].map(s =>
        <button key={s} className={`status-pill ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}
          style={{ cursor: 'pointer', border: filter === s ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', background: filter === s ? 'var(--color-primary-surface)' : 'var(--color-surface)' }}>
          {label(s)}
        </button>
      )}
    </div>

    <table className="admin-table">
      <thead><tr><th>Order</th><th>Type</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
      <tbody>
        {filtered.map(o => <tr key={o.id}>
          <td><strong>{o.id}</strong></td>
          <td>{o.type === 'delivery' ? '🛵' : '🏪'} {label(o.type)}</td>
          <td><span className={`status-pill ${o.fulfillmentStatus}`}>{label(o.fulfillmentStatus)}</span></td>
          <td>{label(o.paymentMethod)} <span className={`status-pill ${o.paymentStatus === 'paid' ? 'completed' : ''}`}>{label(o.paymentStatus)}</span></td>
          <td><strong>{money(o.total)}</strong></td>
          <td style={{ fontSize: 11, color: '#8fa398' }}>{date(o.createdAt)}</td>
          <td>
            <div className="admin-actions" style={{ margin: 0 }}>
              {nextStatus(o) && <button className="admin-btn" disabled={busy === o.id} onClick={() => advance(o)}>Mark {label(nextStatus(o))}</button>}
              {['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(o.fulfillmentStatus) && <button className="admin-btn danger" disabled={busy === o.id} onClick={() => cancelOrder(o)}>Cancel</button>}
            </div>
          </td>
        </tr>)}
      </tbody>
    </table>
    {!filtered.length && <div className="operations-empty" style={{ minHeight: '20vh' }}>No orders match this filter.</div>}
  </>;
}

/* ─── Delivery Tab ─── */
function DeliveryTab({ token }) {
  const [rules, setRules] = useState(null);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.deliveryRules(token).then(d => { setRules(d); setForm(d.rules || {}); }).catch(e => setError(e.message));
  }, [token]);

  const save = async () => {
    try {
      setBusy(true); setError('');
      const result = await adminApi.updateDeliveryRules(token, form);
      setForm(result.rules);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const update = (f, v) => setForm(c => ({ ...c, [f]: Number(v) }));

  if (!rules) return <div className="operations-empty">Loading delivery settings…</div>;

  return <>
    <h2 style={{ marginBottom: 16 }}>Delivery Fee Rules</h2>
    {error && <p className="form-error">{error}</p>}

    <div className="admin-card">
      <h3>Shop Origin</h3>
      <p style={{ color: '#8fa398', fontSize: 13 }}>📍 {rules.origin?.label || `${rules.origin?.lat}, ${rules.origin?.lng}`}</p>
    </div>

    <div className="admin-card">
      <h3>Fee Configuration</h3>
      <div className="admin-form">
        <div className="admin-form-row">
          <label>Base Fee (ETB)<input type="number" value={form.baseFee ?? ''} onChange={e => update('baseFee', e.target.value)} min="0" /></label>
          <label>Included KM<input type="number" value={form.includedKm ?? ''} onChange={e => update('includedKm', e.target.value)} min="0" step="0.5" /></label>
        </div>
        <div className="admin-form-row">
          <label>Per KM Rate (ETB)<input type="number" value={form.perKmRate ?? ''} onChange={e => update('perKmRate', e.target.value)} min="0" /></label>
          <label>Max Service KM<input type="number" value={form.maxServiceKm ?? ''} onChange={e => update('maxServiceKm', e.target.value)} min="1" /></label>
        </div>
        <div className="admin-form-row">
          <label>Free Delivery Threshold (ETB)<input type="number" value={form.freeDeliveryThreshold ?? ''} onChange={e => update('freeDeliveryThreshold', e.target.value)} min="0" /></label>
          <label>Free Delivery Max KM<input type="number" value={form.freeDeliveryMaxKm ?? ''} onChange={e => update('freeDeliveryMaxKm', e.target.value)} min="0" /></label>
        </div>
        <div className="admin-actions">
          <button className="admin-btn" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Rules'}</button>
        </div>
      </div>
    </div>

    <div className="admin-card" style={{ marginTop: 14 }}>
      <h3>Current Fee Formula</h3>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: '#627a6a' }}>
        <strong>Base fee:</strong> ETB {form.baseFee} covers the first {form.includedKm} km<br />
        <strong>Additional:</strong> ETB {form.perKmRate} per km after {form.includedKm} km<br />
        <strong>Free delivery:</strong> Orders over ETB {form.freeDeliveryThreshold} within {form.freeDeliveryMaxKm} km<br />
        <strong>Max range:</strong> {form.maxServiceKm} km — beyond this, only pickup is available
      </p>
    </div>

    <ZonesSection token={token} origin={rules.origin} />
  </>;
}

/* ─── Delivery Zones ─── */
function ZonesSection({ token, origin }) {
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ name: '', kind: 'inclusion', lat: origin?.lat ?? '', lng: origin?.lng ?? '', radiusKm: 5 });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { adminApi.zones(token).then(d => setZones(d.zones || [])).catch(e => setError(e.message)); }, [token]);
  useEffect(load, [load]);

  const update = (f, v) => setForm(c => ({ ...c, [f]: v }));

  const createZone = async () => {
    try {
      setBusy(true); setError('');
      await adminApi.createZone(token, { name: form.name, kind: form.kind, type: 'radius', center: { lat: Number(form.lat), lng: Number(form.lng) }, radiusKm: Number(form.radiusKm) });
      setForm({ ...form, name: '' });
      load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const toggleZone = async (zone) => {
    try { setBusy(zone.id); await adminApi.updateZone(token, zone.id, { ...zone, active: !zone.active }); load(); }
    catch (e) { setError(e.message); } finally { setBusy(''); }
  };

  return <>
    <h2 style={{ margin: '26px 0 16px' }}>Delivery Zones ({zones.length})</h2>
    {error && <p className="form-error">{error}</p>}

    <div className="admin-card">
      <h3>Add Radius Zone</h3>
      <div className="admin-form">
        <div className="admin-form-row">
          <label>Name<input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Bole area" /></label>
          <label>Kind<select value={form.kind} onChange={e => update('kind', e.target.value)}>
            <option value="inclusion">Inclusion (served area)</option><option value="exclusion">Exclusion (blocked area)</option>
          </select></label>
        </div>
        <div className="admin-form-row">
          <label>Center Lat<input type="number" step="any" value={form.lat} onChange={e => update('lat', e.target.value)} /></label>
          <label>Center Lng<input type="number" step="any" value={form.lng} onChange={e => update('lng', e.target.value)} /></label>
        </div>
        <div className="admin-form-row">
          <label>Radius (km)<input type="number" step="0.1" min="0.1" value={form.radiusKm} onChange={e => update('radiusKm', e.target.value)} /></label>
        </div>
        <div className="admin-actions">
          <button className="admin-btn" onClick={createZone} disabled={busy || !form.name}>{busy ? 'Saving…' : 'Add Zone'}</button>
        </div>
      </div>
    </div>

    <div style={{ display: 'grid', gap: 10 }}>
      {zones.map(z => <div className="admin-card" key={z.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, marginBottom: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>{z.name}</strong>
          <div style={{ color: '#8fa398', fontSize: 12, marginTop: 2 }}>
            {label(z.kind)} · {z.type === 'radius' ? `📍 ${z.center?.lat?.toFixed?.(4) ?? z.center?.lat}, ${z.center?.lng?.toFixed?.(4) ?? z.center?.lng} · ${z.radiusKm} km` : `Polygon · ${z.coordinates?.length || 0} points`}
          </div>
        </div>
        <span className={`status-pill ${z.active ? '' : 'cancelled'}`}>{z.active ? 'Active' : 'Inactive'}</span>
        <button className="admin-btn secondary" disabled={busy === z.id} onClick={() => toggleZone(z)}>{z.active ? 'Deactivate' : 'Activate'}</button>
      </div>)}
      {!zones.length && <div className="operations-empty" style={{ minHeight: '12vh' }}>No zones configured.</div>}
    </div>
  </>;
}

/* ─── Riders Tab ─── */
function RidersTab({ token }) {
  const [riders, setRiders] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => { adminApi.riders(token).then(d => setRiders(d.riders || [])).catch(e => setError(e.message)); }, [token]);
  useEffect(load, [load]);

  return <>
    <h2 style={{ marginBottom: 16 }}>Riders ({riders.length})</h2>
    {error && <p className="form-error">{error}</p>}

    <table className="admin-table">
      <thead><tr><th>Rider</th><th>Phone</th><th>Location</th><th>Last update</th></tr></thead>
      <tbody>
        {riders.map(r => <tr key={r.telegramUserId}>
          <td><strong>{r.firstName || r.username || r.telegramUserId}</strong>{r.username && <small style={{ display: 'block', color: '#8fa398' }}>@{r.username}</small>}</td>
          <td>{r.phoneNumber || '—'}</td>
          <td>{r.location ? `📍 ${r.location.lat?.toFixed?.(5) ?? r.location.lat}, ${r.location.lng?.toFixed?.(5) ?? r.location.lng}` : 'Not sharing'}</td>
          <td style={{ fontSize: 11, color: '#8fa398' }}>{r.location?.updatedAt ? date(r.location.updatedAt) : '—'}</td>
        </tr>)}
      </tbody>
    </table>
    {!riders.length && <div className="operations-empty" style={{ minHeight: '20vh' }}>No riders yet. Promote a user to Rider from the Users tab.</div>}
  </>;
}

/* ─── Users Tab ─── */
function UsersTab({ token }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(() => { adminApi.users(token).then(d => setUsers(d.users || [])).catch(e => setError(e.message)); }, [token]);
  useEffect(load, [load]);

  const changeRole = async (id, role) => {
    try { await adminApi.updateUserRole(token, id, role); load(); } catch (e) { setError(e.message); }
  };

  return <>
    <h2 style={{ marginBottom: 16 }}>Users ({users.length})</h2>
    {error && <p className="form-error">{error}</p>}

    <table className="admin-table">
      <thead><tr><th>User</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
      <tbody>
        {users.map(u => <tr key={u.telegramUserId}>
          <td><strong>{u.firstName || u.username || u.telegramUserId}</strong>{u.username && <small style={{ display: 'block', color: '#8fa398' }}>@{u.username}</small>}</td>
          <td>{u.phoneNumber || '—'} {u.phoneVerified && <span style={{ color: 'var(--color-success)', fontSize: 10, fontWeight: 800 }}>✓</span>}</td>
          <td>
            <select value={u.role} onChange={e => changeRole(u.telegramUserId, e.target.value)}
              style={{ padding: '6px 8px', borderRadius: 8, border: '1.5px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-primary-dark)', background: 'var(--color-surface)' }}>
              <option value="customer">Customer</option><option value="staff">Staff</option><option value="rider">Rider</option><option value="admin">Admin</option>
            </select>
          </td>
          <td style={{ fontSize: 11, color: '#8fa398' }}>{date(u.createdAt)}</td>
        </tr>)}
      </tbody>
    </table>
  </>;
}

/* ─── Reports Tab ─── */
function ReportsTab({ token }) {
  const [period, setPeriod] = useState('daily');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [csvBusy, setCsvBusy] = useState(false);

  const load = useCallback(() => { adminApi.report(token, period).then(setReport).catch(e => setError(e.message)); }, [token, period]);
  useEffect(load, [load]);

  const exportCsv = async () => {
    try {
      setCsvBusy(true); setError('');
      const response = await fetch(`/api/admin/reports.csv?period=${period}`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('CSV export failed.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `allfreshmart-${period}-report.csv`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); } finally { setCsvBusy(false); }
  };

  if (!report) return <div className="operations-empty">Loading report…</div>;

  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h2 style={{ margin: 0 }}>Sales Report</h2>
      <div style={{ display: 'flex', gap: 6 }}>
        {['daily', 'weekly', 'monthly'].map(p =>
          <button key={p} className={`admin-btn ${period === p ? '' : 'secondary'}`} onClick={() => setPeriod(p)}>{label(p)}</button>
        )}
        <button className="admin-btn secondary" onClick={exportCsv} disabled={csvBusy}>{csvBusy ? 'Exporting…' : '📊 CSV'}</button>
      </div>
    </div>
    {error && <p className="form-error">{error}</p>}

    <div className="admin-grid">
      <div className="admin-stat"><div className="stat-value">{report.totals?.orders || 0}</div><div className="stat-label">Orders</div></div>
      <div className="admin-stat"><div className="stat-value">{money(report.totals?.grossSales || 0)}</div><div className="stat-label">Gross Sales</div></div>
      <div className="admin-stat"><div className="stat-value">{money(report.totals?.deliveryRevenue || 0)}</div><div className="stat-label">Delivery Revenue</div></div>
      <div className="admin-stat"><div className="stat-value">{report.totals?.paidOrders || 0}</div><div className="stat-label">Paid Orders</div></div>
    </div>

    {report.payments?.length > 0 && <div className="admin-card">
      <h3>By Payment Method</h3>
      <table className="admin-table">
        <thead><tr><th>Method</th><th>Orders</th><th>Revenue</th></tr></thead>
        <tbody>{report.payments.map(p => <tr key={p.method}><td>{label(p.method)}</td><td>{p.orders}</td><td>{money(p.total)}</td></tr>)}</tbody>
      </table>
    </div>}

    {report.promotions?.length > 0 && <div className="admin-card">
      <h3>Promotion Performance</h3>
      <table className="admin-table">
        <thead><tr><th>Promotion</th><th>Views</th><th>Clicks</th><th>Orders</th><th>Revenue</th></tr></thead>
        <tbody>{report.promotions.map(p => <tr key={p.promotionId}><td>{p.title}</td><td>{p.views}</td><td>{p.clicks}</td><td>{p.orders}</td><td>{money(p.revenue)}</td></tr>)}</tbody>
      </table>
    </div>}
  </>;
}

/* ─── Main Admin App ─── */
export default function AdminApp() {
  const [session, setSession] = useState(null);
  const [tab, setTab] = useState('Products');
  const [error, setError] = useState('');

  useEffect(() => {
    api.authenticateDevelopment('admin')
      .then(setSession)
      .catch(() => setError('Admin access requires an admin Telegram account in production. For local preview, the development auth is used.'));
  }, []);

  if (error) return <main className="admin-shell"><div className="operations-empty">{error}</div></main>;
  if (!session) return <main className="admin-shell"><div className="operations-empty">Opening admin dashboard…</div></main>;

  return <main className="admin-shell">
    <header>
      <div>
        <p className="eyebrow">ADMIN DASHBOARD</p>
        <h1>AllFreshMart</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: '#8fa398' }}>{session.user.firstName || 'Admin'}</span>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 800 }}>
          {(session.user.firstName || 'A')[0].toUpperCase()}
        </div>
      </div>
    </header>

    <nav className="admin-tabs">
      {TABS.map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}
    </nav>

    {tab === 'Products' && <ProductsTab token={session.token} />}
    {tab === 'Promotions' && <PromotionsTab token={session.token} />}
    {tab === 'Orders' && <OrdersTab token={session.token} />}
    {tab === 'Delivery' && <DeliveryTab token={session.token} />}
    {tab === 'Riders' && <RidersTab token={session.token} />}
    {tab === 'Users' && <UsersTab token={session.token} />}
    {tab === 'Reports' && <ReportsTab token={session.token} />}
  </main>;
}
