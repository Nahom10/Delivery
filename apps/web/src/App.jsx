'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from './api.js';
import { t, detectLanguage, localizedStatus, localizedProductName } from './i18n.js';
import { haptic, initialiseTelegramTheme, requestPreferredLocation, telegramApp } from './telegram.js';
const MapPicker = dynamic(() => import('./MapPicker.jsx'), { ssr: false });
const TrackingMap = dynamic(() => import('./TrackingMap.jsx'), { ssr: false });

const etb = new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 });
const money = (value) => etb.format(value).replace('ETB', 'ETB ');
const pName = (product, lang) => localizedProductName(product, lang);

/* ─── Quantity Control ─── */
function QuantityControl({ quantity, onAdd, onRemove, lang = 'en' }) {
  if (!quantity) return <button className="add-button" onClick={onAdd}>{t(lang, 'add')}</button>;
  return <div className="quantity-control"><button aria-label="Remove one" onClick={onRemove}>−</button><span>{quantity}</span><button aria-label="Add one" onClick={onAdd}>+</button></div>;
}

/* ─── Product Card ─── */
function ProductCard({ product, quantity, onAdd, onRemove, compact = false, lang = 'en' }) {
  return <article className={`product-card ${compact ? 'compact-card' : ''}`}>
    <div className="product-image-wrap">
      <img src={product.imageUrl} alt="" className="product-image" loading="lazy" />
      {product.price.discountPercent > 0 && <span className="discount-badge">−{product.price.discountPercent}%</span>}
    </div>
    <div className="product-copy">
      <p className="product-name">{pName(product, lang)}</p>
      {!compact && <p className="product-description">{product.description}</p>}
      <div className="price-row">
        {product.price.discountPercent > 0 && <span className="old-price">{money(product.price.original)}</span>}
        <strong>{money(product.price.current)}</strong>
        <span className="unit">/ {product.unit}</span>
      </div>
      <QuantityControl quantity={quantity} onAdd={onAdd} onRemove={onRemove} lang={lang} />
    </div>
  </article>;
}

/* ─── Cart Sheet ─── */
function CartSheet({ cart, products, onClose, onChange, onCheckout, lang }) {
  const lines = products.filter((p) => cart[p.id]).map((p) => ({ product: p, quantity: cart[p.id] }));
  const total = lines.reduce((sum, l) => sum + l.product.price.current * l.quantity, 0);
  return <div className="sheet-backdrop" role="presentation">
    <section className="cart-sheet" role="dialog" aria-modal="true" aria-label={t(lang, 'basket')}>
      <div className="sheet-head">
        <div><p className="eyebrow">{t(lang, 'basket')}</p><h2>{t(lang, 'freshPicks')}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close cart">×</button>
      </div>
      {lines.length === 0
        ? <div className="empty"><span>🧺</span><h3>{t(lang, 'basketEmpty')}</h3><p>{t(lang, 'basketEmptyHint')}</p></div>
        : <>
          <div className="cart-lines">
            {lines.map(({ product, quantity }) => <div className="cart-line" key={product.id}>
              <img src={product.imageUrl} alt="" />
              <div><strong>{pName(product, lang)}</strong><small>{money(product.price.current)} / {product.unit}</small></div>
              <QuantityControl quantity={quantity} onAdd={() => onChange(product.id, 1)} onRemove={() => onChange(product.id, -1)} lang={lang} />
            </div>)}
          </div>
          <div className="total-row"><span>{t(lang, 'pickupTotal')}</span><strong>{money(total)}</strong></div>
          <button className="checkout-button" onClick={onCheckout}>{t(lang, 'continueCheckout')}</button>
        </>}
    </section>
  </div>;
}

/* ─── Telebirr Payment Flow ─── */
function PaymentFlow({ payment, order, token, lang, onPaid, onClose }) {
  const [status, setStatus] = useState(payment?.status || 'pending');
  const [checking, setChecking] = useState(false);

  const checkPayment = useCallback(async () => {
    try {
      setChecking(true);
      if (payment?.sandboxMock) {
        const result = await api.completeSandboxPayment(token, payment.id);
        setStatus(result.payment.status);
        if (result.payment.status === 'paid') { haptic('notification', 'success'); onPaid(result.order); }
      } else {
        const result = await api.paymentStatus(token, order.id);
        setStatus(result.payment.status);
        if (result.payment.status === 'paid') { haptic('notification', 'success'); onPaid(result.order); }
      }
    } catch { haptic('notification', 'error'); }
    finally { setChecking(false); }
  }, [payment, token, order, onPaid]);

  useEffect(() => {
    if (status !== 'pending') return;
    const interval = setInterval(async () => {
      try {
        const result = await api.paymentStatus(token, order.id);
        if (result.payment.status === 'paid') { setStatus('paid'); haptic('notification', 'success'); onPaid(result.order); clearInterval(interval); }
        else if (result.payment.status === 'failed') { setStatus('failed'); clearInterval(interval); }
      } catch { /* poll silently */ }
    }, 6000);
    return () => clearInterval(interval);
  }, [status, token, order, onPaid]);

  return <div className="sheet-backdrop">
    <section className="cart-sheet payment-flow" role="dialog" aria-modal="true">
      <div className="sheet-head">
        <div><p className="eyebrow">{t(lang, 'waitingPayment')}</p><h2>{t(lang, 'securePayment')}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="payment-status-area">
        {status === 'pending' && <>
          <div className="payment-icon pending-icon"><span>◎</span></div>
          <p className="payment-msg">{t(lang, 'waitingPaymentDesc')}</p>
          {payment?.checkoutUrl && <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="checkout-button telebirr-btn">{t(lang, 'openPayment')}</a>}
          {payment?.sandboxMock && <button className="checkout-button sandbox-btn" onClick={checkPayment} disabled={checking}>{checking ? t(lang, 'checkingPayment') : t(lang, 'sandboxPayment')}</button>}
          {!payment?.sandboxMock && !payment?.checkoutUrl && <button className="checkout-button" onClick={checkPayment} disabled={checking}>{checking ? t(lang, 'checkingPayment') : t(lang, 'retryPayment')}</button>}
        </>}
        {status === 'paid' && <>
          <div className="payment-icon paid-icon"><span>✓</span></div>
          <p className="payment-msg success">{t(lang, 'paymentPaid')}</p>
        </>}
        {status === 'failed' && <>
          <div className="payment-icon failed-icon"><span>!</span></div>
          <p className="payment-msg error">{t(lang, 'paymentFailed')}</p>
        </>}
      </div>

      <div className="payment-order-summary">
        <div className="total-row"><span>{t(lang, 'placeOrder')}</span><strong>{money(order.total)}</strong></div>
      </div>
    </section>
  </div>;
}

/* ─── Checkout ─── */
function Checkout({ cart, products, session, deliveryConfig, lang, onClose, onComplete }) {
  const [mode, setMode] = useState('pickup');
  const [payMethod, setPayMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [location, setLocation] = useState(null);
  const [quote, setQuote] = useState(null);
  const [locating, setLocating] = useState(false);
  const [paymentFlow, setPaymentFlow] = useState(null);
  const [form, setForm] = useState({ label: 'Home', houseNumber: '', blockNumber: '', street: '', area: '', landmark: '', floorUnit: '', deliveryNotes: '', addressText: '' });
  const lines = products.filter((p) => cart[p.id]).map((p) => ({ productId: p.id, quantity: cart[p.id] }));
  const subtotal = products.filter((p) => cart[p.id]).reduce((sum, p) => sum + p.price.current * cart[p.id], 0);

  useEffect(() => { api.addresses(session.token).then(({ addresses: saved }) => setAddresses(saved)).catch(() => {}); }, [session.token]);

  useEffect(() => {
    if (mode !== 'delivery' || !location) { setQuote(null); return undefined; }
    let live = true;
    const timer = window.setTimeout(() => api.deliveryQuote({ ...location, lines }).then(({ quote: q }) => live && setQuote(q)).catch((e) => live && setError(e.message)), 350);
    return () => { live = false; window.clearTimeout(timer); };
  }, [mode, location?.lat, location?.lng, JSON.stringify(lines)]);

  const updateForm = (e) => { const { name, value } = e.target; setSelectedAddressId(''); setForm((c) => ({ ...c, [name]: value })); };
  const applyLocation = async (loc) => {
    setLocation(loc); setSelectedAddressId(''); setError('');
    try { const place = await api.reverseGeocode(loc.lat, loc.lng); setForm((c) => ({ ...c, street: c.street || place.street, area: c.area || place.area, landmark: c.landmark || place.landmark, addressText: c.addressText || place.displayName })); } catch { /* manual fields */ }
  };
  const chooseAddress = (a) => { setSelectedAddressId(a.id); setLocation({ lat: a.lat, lng: a.lng }); setForm(a); setError(''); };
  const useMyLocation = async () => { try { setLocating(true); await applyLocation(await requestPreferredLocation()); } catch (e) { setError(e.message); } finally { setLocating(false); } };
  const total = mode === 'delivery' && quote?.available ? subtotal + quote.fee : subtotal;

  const placeOrder = async () => {
    try {
      setBusy(true); setError('');
      let addressId = selectedAddressId;
      if (mode === 'delivery') {
        if (!location) throw new Error('Choose your delivery location on the map.');
        if (!quote) throw new Error('Calculating the delivery fee — please wait a moment.');
        if (!quote.available) throw new Error(quote.reason);
        if (!addressId) { const saved = await api.saveAddress(session.token, { ...form, ...location }); addressId = saved.address.id; setAddresses((c) => [saved.address, ...c]); }
      }
      const { order, payment } = await api.checkout(session.token, { orderType: mode, paymentMethod: payMethod, addressId, lines });
      haptic('notification', 'success');
      if (payMethod === 'telebirr' && payment) {
        setPaymentFlow({ order, payment });
      } else {
        onComplete(order);
      }
    } catch (e) { haptic('notification', 'error'); setError(e.message); }
    finally { setBusy(false); }
  };

  if (paymentFlow) {
    return <PaymentFlow
      payment={paymentFlow.payment} order={paymentFlow.order} token={session.token} lang={lang}
      onPaid={(updatedOrder) => onComplete(updatedOrder)}
      onClose={() => { setPaymentFlow(null); onComplete(paymentFlow.order); }}
    />;
  }

  return <div className="sheet-backdrop">
    <section className="cart-sheet checkout delivery-checkout" role="dialog" aria-modal="true" aria-label="Checkout">
      <div className="sheet-head">
        <div><p className="eyebrow">{t(lang, 'checkoutTitle')}</p><h2>{t(lang, 'howDeliver')}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close checkout">×</button>
      </div>

      {/* Fulfillment toggle */}
      <div className="fulfillment-toggle">
        <button className={mode === 'pickup' ? 'selected' : ''} onClick={() => { setMode('pickup'); setError(''); }}>
          <span>🏪</span><strong>{t(lang, 'pickup')}</strong><small>{t(lang, 'free')}</small>
        </button>
        <button className={mode === 'delivery' ? 'selected' : ''} onClick={() => { setMode('delivery'); setError(''); }}>
          <span>🛵</span><strong>{t(lang, 'delivery')}</strong><small>{t(lang, 'liveFee')}</small>
        </button>
      </div>

      {mode === 'pickup'
        ? <div className="checkout-choice selected"><span>🏪</span><div><strong>{t(lang, 'collectAt')}</strong><p>{t(lang, 'pickupFreeNotify')}</p></div><span className="check">✓</span></div>
        : <div className="address-flow">
          <div className="address-flow-head">
            <div><strong>{t(lang, 'placeYourPin')}</strong><p>{t(lang, 'pinDescription')}</p></div>
            <button className="location-button" onClick={useMyLocation} disabled={locating}>{locating ? t(lang, 'finding') : t(lang, 'useMyLocation')}</button>
          </div>
          {addresses.length > 0 && <div className="saved-addresses">
            <p className="eyebrow">{t(lang, 'savedAddresses')}</p>
            <div>{addresses.map((a) => <button key={a.id} className={selectedAddressId === a.id ? 'active' : ''} onClick={() => chooseAddress(a)}><strong>{a.label}</strong><span>{a.area || a.street || a.addressText}</span></button>)}</div>
          </div>}
          <MapPicker position={location || deliveryConfig.origin} onChange={applyLocation} />
          {location && <>
            <div className="quote-panel">
              {!quote ? <><span className="quote-spinner">◌</span><div><strong>{t(lang, 'calculatingFee')}</strong><small>{t(lang, 'checkingRoute')}</small></div></>
                : quote.available ? <><span className="quote-good">✓</span><div><strong>{quote.fee === 0 ? t(lang, 'freeDelivery') : t(lang, 'deliveryFee', { amount: money(quote.fee) })}</strong><small>{quote.distanceKm} km · {quote.source === 'openrouteservice' ? t(lang, 'drivingRoute') : t(lang, 'estimatedRoute')}</small></div></>
                  : <><span className="quote-bad">!</span><div><strong>{t(lang, 'deliveryUnavailable')}</strong><small>{quote.reason}</small></div></>}
            </div>
            <div className="address-fields">
              <p className="eyebrow">{t(lang, 'helpRider')}</p>
              <div className="field-grid">
                <label>{t(lang, 'addressLabel')}<input name="label" value={form.label || ''} onChange={updateForm} placeholder="Home" /></label>
                <label>{t(lang, 'houseNumber')}<input name="houseNumber" value={form.houseNumber || ''} onChange={updateForm} /></label>
                <label>{t(lang, 'blockCluster')}<input name="blockNumber" value={form.blockNumber || ''} onChange={updateForm} /></label>
                <label>{t(lang, 'floorUnit')}<input name="floorUnit" value={form.floorUnit || ''} onChange={updateForm} /></label>
              </div>
              <label>{t(lang, 'streetArea')}<input name="street" value={form.street || ''} onChange={updateForm} placeholder="Street name" /></label>
              <label>{t(lang, 'areaNbh')}<input name="area" value={form.area || ''} onChange={updateForm} placeholder="Area name" /></label>
              <label>{t(lang, 'landmark')}<input name="landmark" value={form.landmark || ''} onChange={updateForm} placeholder={t(lang, 'landmarkPlaceholder')} /></label>
              <label>{t(lang, 'deliveryNotes')}<textarea name="deliveryNotes" value={form.deliveryNotes || ''} onChange={updateForm} placeholder={t(lang, 'deliveryNotesPlaceholder')} /></label>
            </div>
          </>}
        </div>}

      {/* Payment method selector */}
      <div className="payment-method-section">
        <p className="eyebrow">{t(lang, 'paymentMethod')}</p>
        <div className="fulfillment-toggle">
          <button className={payMethod === 'cash' ? 'selected' : ''} onClick={() => setPayMethod('cash')}>
            <span>💵</span><strong>{t(lang, 'cash')}</strong><small>{mode === 'delivery' ? t(lang, 'onDelivery') : t(lang, 'atPickup')}</small>
          </button>
          <button className={payMethod === 'telebirr' ? 'selected' : ''} onClick={() => setPayMethod('telebirr')}>
            <span>📱</span><strong>{t(lang, 'telebirr')}</strong><small>{t(lang, 'securePayment')}</small>
          </button>
        </div>
      </div>

      <div className="total-row">
        <span>{mode === 'delivery' ? t(lang, 'totalIncDelivery') : t(lang, 'totalAtStore')}</span>
        <strong>{money(total)}</strong>
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="checkout-button" disabled={busy || (mode === 'delivery' && (!location || !quote?.available))} onClick={placeOrder}>
        {busy ? t(lang, 'placingOrder') : t(lang, 'placeOrderAmount', { amount: money(total) })}
      </button>
      <p className="checkout-note">{t(lang, 'phoneNote')}</p>
    </section>
  </div>;
}

/* ─── Order Confirmation + Live Tracking ─── */
function Confirmation({ order, token, lang, onClose }) {
  const [tracked, setTracked] = useState(order);
  const [riderLocation, setRiderLocation] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    let live = true;
    const refresh = () => api.tracking(token, order.id).then(({ order: updated, riderLocation: rider }) => { if (live) { setTracked(updated); setRiderLocation(rider); } }).catch((e) => live && setTrackingError(e.message));
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => { live = false; window.clearInterval(timer); };
  }, [order.id, token]);

  const pickup = tracked.type === 'pickup';
  return <div className="sheet-backdrop">
    <section className="confirmation tracking-confirmation" role="dialog" aria-modal="true">
      <div className="success-circle">✓</div>
      <p className="eyebrow">{t(lang, 'orderReceived')}</p>
      <h2>{t(lang, 'weveGotIt')}</h2>
      <p>{t(lang, 'orderIs', { id: tracked.id, status: localizedStatus(lang, tracked.fulfillmentStatus) })}
        {tracked.paymentMethod === 'cash' && ` ${t(lang, 'payAmount', { amount: money(tracked.total), method: pickup ? t(lang, 'atPickup') : t(lang, 'onDelivery') })}`}
      </p>
      <div className="order-status">
        <span></span>
        <div>
          <strong>{tracked.fulfillmentStatus === 'out_for_delivery' ? t(lang, 'riderOnWay') : `${pickup ? t(lang, 'nextShopPrep') : t(lang, 'nextShopConfirm')}`}</strong>
          <small>{t(lang, 'statusUpdates')}</small>
        </div>
      </div>
      {riderLocation && <TrackingMap rider={riderLocation} destination={tracked.address} />}
      {trackingError && <p className="form-error">{trackingError}</p>}
      <button className="checkout-button" onClick={onClose}>{t(lang, 'backToMarket')}</button>
    </section>
  </div>;
}

/* ─── Order History ─── */
function OrderHistory({ token, lang, onClose, onTrack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myOrders(token).then(({ orders: list }) => { setOrders(list); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  return <div className="sheet-backdrop">
    <section className="cart-sheet order-history-sheet" role="dialog" aria-modal="true">
      <div className="sheet-head">
        <div><p className="eyebrow">{t(lang, 'myOrders')}</p><h2>{t(lang, 'orderHistory')}</h2></div>
        <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
      </div>
      {loading ? <div className="empty"><div className="leaf-loader">✦</div></div>
        : orders.length === 0
          ? <div className="empty"><span>📦</span><h3>{t(lang, 'noOrders')}</h3><p>{t(lang, 'noOrdersHint')}</p></div>
          : <div className="order-history-list">
            {orders.map((order) => <article className="order-history-card" key={order.id} onClick={() => onTrack(order)}>
              <div className="order-history-head">
                <div>
                  <strong>{order.id}</strong>
                  <small>{new Date(order.createdAt).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                </div>
                <span className={`status-pill ${order.fulfillmentStatus}`}>{localizedStatus(lang, order.fulfillmentStatus)}</span>
              </div>
              <p className="order-history-items">{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
              <div className="order-history-foot">
                <span>{order.type === 'delivery' ? '🛵' : '🏪'} {money(order.total)}</span>
                <span className="view-link">{t(lang, 'viewDetails')} →</span>
              </div>
            </article>)}
          </div>}
    </section>
  </div>;
}

/* ─── Main App ─── */
export default function App() {
  const [storefront, setStorefront] = useState(null);
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState({});
  const [deliveryConfig, setDeliveryConfig] = useState(null);
  const [lang, setLang] = useState('en');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [slide, setSlide] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [order, setOrder] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setLang(detectLanguage());
    const telegram = initialiseTelegramTheme();
    Promise.all([
      api.storefront(),
      telegram?.initData ? api.authenticateTelegram(telegram.initData) : api.authenticateDevelopment(),
      api.deliveryConfig()
    ]).then(([data, auth, config]) => { setStorefront(data); setSession(auth); setDeliveryConfig(config); })
      .catch((e) => setLoadError(e.message));
  }, []);

  // Banner auto-advance
  useEffect(() => {
    if (!storefront?.banners?.length) return undefined;
    const timer = window.setInterval(() => setSlide((c) => (c + 1) % storefront.banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [storefront?.banners?.length]);

  // Telegram MainButton
  useEffect(() => {
    const mainButton = telegramApp()?.MainButton;
    if (!mainButton) return undefined;
    const itemCount = Object.values(cart).reduce((s, q) => s + q, 0);
    if (itemCount) {
      const total = storefront?.products?.reduce((s, p) => s + (cart[p.id] || 0) * p.price.current, 0) || 0;
      mainButton.setText(`${t(lang, 'viewBasket')} · ${money(total)}`);
      mainButton.show();
    } else mainButton.hide();
    const open = () => setCartOpen(true);
    mainButton.onClick(open);
    return () => mainButton.offClick(open);
  }, [cart, storefront, lang]);

  // Telegram BackButton
  useEffect(() => {
    const backButton = telegramApp()?.BackButton;
    if (!backButton) return undefined;
    if (cartOpen || checkout || historyOpen) backButton.show(); else backButton.hide();
    const close = () => { setCheckout(false); setCartOpen(false); setHistoryOpen(false); };
    backButton.onClick(close);
    return () => backButton.offClick(close);
  }, [cartOpen, checkout, historyOpen]);

  const products = useMemo(() => (storefront?.products || []).filter((p) => (category === 'all' || p.categoryId === category) && p.name.toLowerCase().includes(query.toLowerCase())), [storefront, category, query]);
  const adjust = (id, amount) => { haptic('impact', amount > 0 ? 'light' : 'soft'); setCart((c) => { const next = Math.max(0, (c[id] || 0) + amount); const cp = { ...c }; if (next) cp[id] = next; else delete cp[id]; return cp; }); };
  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const toggleLang = () => setLang((c) => c === 'en' ? 'am' : 'en');

  // Error state
  if (loadError) return <main className="app-shell">
    <div className="error-state">
      <span>!</span>
      <h1>{t(lang, 'errorTitle')}</h1>
      <p>{loadError}</p>
      <button onClick={() => window.location.reload()}>{t(lang, 'tryAgain')}</button>
    </div>
  </main>;

  // Loading state
  if (!storefront || !session || !deliveryConfig) return <main className="app-shell loading">
    <div className="leaf-loader">✦</div>
    <p>{t(lang, 'loading')}</p>
  </main>;

  const activeBanner = storefront.banners?.[slide];

  return <main className="app-shell">
    {/* Header */}
    <header className="topbar">
      <div>
        <p className="eyebrow">{t(lang, 'welcome')}{session.user.firstName ? `, ${session.user.firstName.toUpperCase()}` : ''}</p>
        <h1>{t(lang, 'appName')}</h1>
      </div>
      <div className="topbar-actions">
        <button className="lang-toggle" onClick={toggleLang} aria-label="Switch language">{t(lang, 'language')}</button>
        <button className="history-button" onClick={() => setHistoryOpen(true)} aria-label="Order history">📋</button>
        <button className="basket-button" onClick={() => setCartOpen(true)} aria-label="Open basket">
          🧺{cartCount > 0 && <span>{cartCount}</span>}
        </button>
      </div>
    </header>

    {/* Search */}
    <label className="search">
      <span>⌕</span>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(lang, 'search')} />
    </label>

    {/* Banner Carousel */}
    {activeBanner && <section className="carousel" onClick={() => { setCategory(activeBanner.targetType === 'category' ? activeBanner.targetId : 'all'); setQuery(activeBanner.targetType === 'product' ? storefront.products.find((p) => p.id === activeBanner.targetId)?.name || '' : ''); }}>
      <div className="banner-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
        {storefront.banners.map((banner) => <article className="banner" key={banner.id} style={{ backgroundImage: `linear-gradient(135deg, rgba(8,53,31,.92) 0%, rgba(8,53,31,.3) 60%, rgba(8,53,31,.08) 100%), url(${banner.imageUrl})` }}>
          <div>
            <p className="eyebrow">{t(lang, 'freshRightNow')}</p>
            <h2>{banner.title}</h2>
            <p>{banner.subtitle}</p>
            <button>{t(lang, 'shopOffer')} <span>→</span></button>
          </div>
        </article>)}
      </div>
      <div className="dots">{storefront.banners.map((b, i) => <button aria-label={`Show promotion ${i + 1}`} onClick={(e) => { e.stopPropagation(); setSlide(i); }} className={i === slide ? 'active' : ''} key={b.id} />)}</div>
    </section>}

    {/* Today's Deals */}
    {storefront.deals?.length > 0 && <section className="deals-section">
      <div className="section-heading"><div><p className="eyebrow">{t(lang, 'onlyForALittleWhile')}</p><h2>{t(lang, 'todaysDeals')}</h2></div><span>{t(lang, 'swipe')}</span></div>
      <div className="deal-rail">{storefront.deals.map((p) => <ProductCard compact product={p} key={p.id} quantity={cart[p.id] || 0} onAdd={() => adjust(p.id, 1)} onRemove={() => adjust(p.id, -1)} lang={lang} />)}</div>
    </section>}

    {/* Categories */}
    <nav className="categories" aria-label="Product categories">
      <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>{t(lang, 'all')}</button>
      {storefront.categories.map((c) => <button className={category === c.id ? 'active' : ''} onClick={() => setCategory(c.id)} key={c.id}>{c.name}</button>)}
    </nav>

    {/* Catalog */}
    <section className="catalog">
      <div className="section-heading">
        <h2>{query ? t(lang, 'searchResults') : category === 'all' ? t(lang, 'freshInStore') : storefront.categories.find((c) => c.id === category)?.name}</h2>
        <span>{t(lang, 'items', { count: products.length })}</span>
      </div>
      {products.length
        ? <div className="product-grid">{products.map((p) => <ProductCard product={p} key={p.id} quantity={cart[p.id] || 0} onAdd={() => adjust(p.id, 1)} onRemove={() => adjust(p.id, -1)} lang={lang} />)}</div>
        : <div className="empty"><span>🥬</span><h3>{t(lang, 'noMatch')}</h3><p>{t(lang, 'noMatchHint')}</p></div>}
    </section>

    {/* Floating cart */}
    {cartCount > 0 && <button className="floating-cart" onClick={() => setCartOpen(true)}>
      <span>{cartCount > 1 ? t(lang, 'itemCountPlural', { count: cartCount }) : t(lang, 'itemCount', { count: cartCount })}</span>
      <strong>{t(lang, 'viewBasket')} →</strong>
    </button>}

    {/* Sheets */}
    {cartOpen && <CartSheet cart={cart} products={storefront.products} onClose={() => setCartOpen(false)} onChange={adjust} onCheckout={() => { setCartOpen(false); setCheckout(true); }} lang={lang} />}
    {checkout && <Checkout cart={cart} products={storefront.products} session={session} deliveryConfig={deliveryConfig} lang={lang} onClose={() => setCheckout(false)} onComplete={(created) => { setCheckout(false); setCart({}); setOrder(created); }} />}
    {order && <Confirmation order={order} token={session.token} lang={lang} onClose={() => setOrder(null)} />}
    {historyOpen && <OrderHistory token={session.token} lang={lang} onClose={() => setHistoryOpen(false)} onTrack={(o) => { setHistoryOpen(false); setOrder(o); }} />}
  </main>;
}
