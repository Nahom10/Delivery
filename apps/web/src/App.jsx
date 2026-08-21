'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from './api.js';
import { t, detectLanguage, localizedStatus, localizedProductName } from './i18n.js';
import { haptic, initialiseTelegramTheme, requestPreferredLocation, telegramApp } from './telegram.js';

const MapPicker = dynamic(() => import('./MapPicker.jsx'), { ssr: false });
const TrackingMap = dynamic(() => import('./TrackingMap.jsx'), { ssr: false });

const etb = new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 });
const money = (value) => etb.format(value || 0).replace('ETB', 'ETB ');
const pName = (product, lang) => localizedProductName(product, lang);

/* ─── SVG Icons ─── */
function IconHeart({ filled = false, size = 20, color = 'currentColor' }) {
  return filled ? (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  ) : (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  );
}

function IconStar({ size = 16, color = '#f59e0b' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconShare({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function IconFilter({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function IconBag({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconSearch({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconPhone({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconChat({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

/* ─── Circular / Pill Quantity Stepper ─── */
function QuantityControl({ quantity, onAdd, onRemove, lang = 'en', pill = false }) {
  if (!quantity) {
    return (
      <button className="add-button-circle" onClick={(e) => { e.stopPropagation(); onAdd(); }} aria-label={t(lang, 'add')}>
        <span>+</span>
      </button>
    );
  }
  return (
    <div className={`quantity-control-modern ${pill ? 'pill-style' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button className="stepper-btn minus" onClick={onRemove} aria-label="Remove one">−</button>
      <span className="stepper-count">{quantity}</span>
      <button className="stepper-btn plus" onClick={onAdd} aria-label="Add one">+</button>
    </div>
  );
}

/* ─── Product Card (Attractive modern grocery card) ─── */
function ProductCard({ product, quantity, isFavorite, onToggleFavorite, onAdd, onRemove, onClick, lang = 'en' }) {
  const discountPercent = product.price.discountPercent;
  const rating = product.rating || 4.8;

  return (
    <article className="modern-product-card" onClick={onClick}>
      <div className="card-media-wrapper">
        {discountPercent > 0 && (
          <span className="modern-discount-badge">{discountPercent}%</span>
        )}
        <button
          className={`card-wishlist-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          aria-label="Wishlist"
        >
          <IconHeart filled={isFavorite} size={18} color="#6b7280" />
        </button>
        <img src={product.imageUrl} alt={product.name} className="card-product-img" loading="lazy" />
      </div>

      <div className="card-info">
        <h3 className="card-product-title">{pName(product, lang)}</h3>
        <p className="card-unit-label">{product.unit === 'kg' ? '1 kg' : product.unit === 'piece' ? '1 Piece' : product.unit === 'bunch' ? '1 Bunch' : product.unit === 'pack' ? '3 Pieces / pack' : product.unit}</p>

        <div className="card-bottom-row">
          <div className="card-prices">
            {discountPercent > 0 && <span className="card-old-price">{money(product.price.original)}</span>}
            <span className="card-current-price">{money(product.price.current)}</span>
          </div>

          <QuantityControl
            quantity={quantity}
            onAdd={onAdd}
            onRemove={onRemove}
            lang={lang}
          />
        </div>
      </div>
    </article>
  );
}

/* ─── Product Details Modal / Sheet (Left screen in reference) ─── */
function ProductDetailModal({ product, quantity, isFavorite, onToggleFavorite, onAdd, onRemove, onAddToCart, onClose, relatedProducts = [], onSelectRelated, lang = 'en' }) {
  const [expanded, setExpanded] = useState(false);
  const rating = product.rating || 4.8;
  const reviewsCount = product.reviewsCount || 128;
  const discountPercent = product.price?.discountPercent || 0;
  const currentPrice = product.price?.current || product.price || 0;
  const totalPrice = currentPrice * Math.max(1, quantity || 1);

  return (
    <div className="sheet-backdrop modal-fade-in" onClick={onClose} role="presentation">
      <section className="product-detail-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Detail Top Header */}
        <div className="detail-top-nav">
          <button className="nav-icon-circle" onClick={onClose} aria-label="Back">
            ‹
          </button>
          <h2 className="detail-header-title">{t(lang, 'productDetails')}</h2>
          <div className="detail-nav-actions">
            <button className="nav-icon-circle" onClick={() => {
              if (navigator.share) {
                navigator.share({ title: product.name, text: product.description, url: window.location.href }).catch(() => {});
              } else {
                haptic('notification', 'success');
              }
            }} aria-label="Share">
              <IconShare size={18} />
            </button>
            <button className={`nav-icon-circle ${isFavorite ? 'favorited' : ''}`} onClick={() => onToggleFavorite(product.id)} aria-label="Wishlist">
              <IconHeart filled={isFavorite} size={18} />
            </button>
          </div>
        </div>

        <div className="detail-scrollable-content">
          {/* Hero Image Container */}
          <div className="detail-hero-media">
            <div className="detail-hero-glow" />
            <img src={product.imageUrl} alt={product.name} className="detail-hero-img" />
            {discountPercent > 0 && <span className="detail-discount-tag">−{discountPercent}% OFF</span>}
          </div>

          {/* Title, Rating & Stepper Row */}
          <div className="detail-main-info">
            <div className="detail-title-rating">
              <h1 className="detail-name">{pName(product, lang)}</h1>
              <div className="detail-rating-row">
                <IconStar size={17} color="#f59e0b" />
                <span className="rating-score">{rating}</span>
                <span className="reviews-count">({reviewsCount} reviews)</span>
              </div>
            </div>

            <div className="detail-price-stepper-row">
              <div className="detail-price-box">
                <span className="detail-active-price">{money(currentPrice)}</span>
                <span className="detail-unit-text">/{product.unit}</span>
                {discountPercent > 0 && <span className="detail-strikethrough">{money(product.price.original)}</span>}
              </div>

              <div className="detail-stepper-pill">
                <button className="detail-stepper-btn minus" onClick={onRemove} disabled={!quantity}>−</button>
                <span className="detail-stepper-val">{quantity || 1}</span>
                <button className="detail-stepper-btn plus" onClick={onAdd}>+</button>
              </div>
            </div>

            {/* Description Section */}
            <div className="detail-section">
              <h3 className="section-subtitle">{t(lang, 'description')}</h3>
              <p className={`detail-description-text ${expanded ? 'expanded' : 'clamped'}`}>
                {product.description || 'Freshly handpicked, crisp, nutrient-dense organic produce sourced sustainably from local farms with strict quality selection.'}
              </p>
              {product.description && product.description.length > 90 && (
                <button className="read-more-btn" onClick={() => setExpanded(!expanded)}>
                  {expanded ? t(lang, 'readLess') : t(lang, 'readMore')}
                </button>
              )}
            </div>

            {/* Recommendation Rail */}
            {relatedProducts.length > 0 && (
              <div className="detail-section recommendation-section">
                <div className="section-head-row">
                  <h3 className="section-subtitle">{t(lang, 'recommendation')}</h3>
                  <span className="see-all-link">{t(lang, 'seeAll')}</span>
                </div>
                <div className="recommendation-rail">
                  {relatedProducts.slice(0, 4).map((rel) => (
                    <div className="recommendation-card" key={rel.id} onClick={() => onSelectRelated(rel)}>
                      <img src={rel.imageUrl} alt={rel.name} />
                      <div className="rec-info">
                        <strong>{pName(rel, lang)}</strong>
                        <span>{money(rel.price.current)} / {rel.unit}</span>
                      </div>
                      <button className="rec-add-btn" onClick={(e) => { e.stopPropagation(); onAddToCart(rel.id); }}>+</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="detail-bottom-bar">
          <div className="bottom-price-info">
            <span className="price-label">{t(lang, 'priceTotal')}</span>
            <strong className="final-price">{money(totalPrice)}</strong>
            {discountPercent > 0 && <small className="discount-note">{discountPercent}% Off applied</small>}
          </div>

          <button className="detail-add-cart-btn" onClick={() => { onAddToCart(product.id); onClose(); }}>
            <IconBag size={20} />
            <span>{t(lang, 'addToCart')}</span>
          </button>
        </div>
      </section>
    </div>
  );
}

/* ─── Cart Sheet (Right screen in reference) ─── */
function CartSheet({ cart, products, onClose, onChange, onCheckout, appliedCoupon, onApplyCoupon, lang }) {
  const [couponInput, setCouponInput] = useState('');
  const [couponOpen, setCouponOpen] = useState(false);
  const lines = products.filter((p) => cart[p.id]).map((p) => ({ product: p, quantity: cart[p.id] }));
  const subtotal = lines.reduce((sum, l) => sum + l.product.price.current * l.quantity, 0);

  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discount) / 100 : 0;
  const deliveryFee = subtotal > 0 ? 30 : 0;
  const total = Math.max(0, subtotal - discountAmount + deliveryFee);

  const handleApply = (code) => {
    const cleanCode = (code || couponInput).trim().toUpperCase();
    if (cleanCode === 'FRESH30') {
      onApplyCoupon({ code: 'FRESH30', discount: 30 });
      haptic('notification', 'success');
      setCouponOpen(false);
    } else if (cleanCode === 'WELCOME10') {
      onApplyCoupon({ code: 'WELCOME10', discount: 10 });
      haptic('notification', 'success');
      setCouponOpen(false);
    } else {
      onApplyCoupon({ code: cleanCode, discount: 15 });
      haptic('notification', 'success');
      setCouponOpen(false);
    }
  };

  return (
    <div className="sheet-backdrop modal-fade-in" onClick={onClose} role="presentation">
      <section className="cart-sheet modern-cart-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Cart Top Bar */}
        <div className="cart-top-bar">
          <button className="nav-icon-circle" onClick={onClose} aria-label="Back">‹</button>
          <h2 className="cart-title">{t(lang, 'myCart')}</h2>
          <button className="nav-icon-circle" onClick={() => haptic('impact', 'medium')} aria-label="Wishlist">
            <IconHeart size={18} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="empty modern-empty">
            <div className="empty-cart-circle">🧺</div>
            <h3>{t(lang, 'basketEmpty')}</h3>
            <p>{t(lang, 'basketEmptyHint')}</p>
          </div>
        ) : (
          <>
            <div className="cart-items-scroll">
              {lines.map(({ product, quantity }) => (
                <div className="modern-cart-item" key={product.id}>
                  <div className="item-thumb-box">
                    <img src={product.imageUrl} alt={product.name} />
                  </div>

                  <div className="item-text-info">
                    <h4 className="item-title">{pName(product, lang)}</h4>
                    <span className="item-subtext">{product.unit === 'pack' ? '3 Pieces' : product.unit === 'kg' ? '1 kg' : `1 ${product.unit}`}</span>
                    <span className="item-price">{money(product.price.current)} <small>/{product.unit}</small></span>
                  </div>

                  <div className="cart-item-stepper">
                    <button className="cart-step-btn minus" onClick={() => onChange(product.id, -1)}>−</button>
                    <span className="cart-step-num">{quantity}</span>
                    <button className="cart-step-btn plus" onClick={() => onChange(product.id, 1)}>+</button>
                  </div>
                </div>
              ))}

              {/* Coupon Banner */}
              <div className="coupon-banner-card">
                <div className="coupon-card-left">
                  <div className="coupon-tag-icon">🏷️</div>
                  <div>
                    <strong>{appliedCoupon ? `Promo: ${appliedCoupon.code} (${appliedCoupon.discount}% OFF)` : t(lang, 'couponBanner', { count: 3 })}</strong>
                    <small>{appliedCoupon ? t(lang, 'couponApplied', { discount: appliedCoupon.discount }) : 'Click to apply extra discount'}</small>
                  </div>
                </div>
                <button className="apply-coupon-btn" onClick={() => setCouponOpen(!couponOpen)}>
                  {appliedCoupon ? 'Change' : t(lang, 'applyCoupon')}
                </button>
              </div>

              {couponOpen && (
                <div className="coupon-input-expand">
                  <input
                    placeholder={t(lang, 'couponCodePlaceholder')}
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                  />
                  <button onClick={() => handleApply()}>OK</button>
                </div>
              )}

              {/* Cost Summary Box */}
              <div className="modern-bill-summary">
                <div className="bill-row">
                  <span>{t(lang, 'subtotal')}</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                {appliedCoupon && (
                  <div className="bill-row discount-row">
                    <span>{t(lang, 'discountSaved')} ({appliedCoupon.discount}%)</span>
                    <strong className="discount-val">−{money(discountAmount)}</strong>
                  </div>
                )}
                <div className="bill-row">
                  <span>{t(lang, 'deliveryFeeLabel')}</span>
                  <strong>{money(deliveryFee)}</strong>
                </div>
                <div className="bill-divider" />
                <div className="bill-row total-highlight">
                  <span>{t(lang, 'total')}</span>
                  <strong className="grand-total">{money(total)}</strong>
                </div>
              </div>
            </div>

            {/* Checkout Action Button */}
            <div className="cart-footer-bar">
              <button className="modern-checkout-btn" onClick={onCheckout}>
                <IconBag size={20} />
                <span>{t(lang, 'checkoutNow')}</span>
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
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

  return (
    <div className="sheet-backdrop modal-fade-in">
      <section className="cart-sheet payment-flow modern-payment-sheet" role="dialog" aria-modal="true">
        <div className="sheet-head">
          <div><p className="eyebrow">{t(lang, 'waitingPayment')}</p><h2>{t(lang, 'securePayment')}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="payment-status-area">
          {status === 'pending' && (
            <>
              <div className="payment-icon pending-icon"><span>◎</span></div>
              <p className="payment-msg">{t(lang, 'waitingPaymentDesc')}</p>
              {payment?.checkoutUrl && <a href={payment.checkoutUrl} target="_blank" rel="noopener noreferrer" className="modern-checkout-btn telebirr-btn">{t(lang, 'openPayment')}</a>}
              {payment?.sandboxMock && <button className="modern-checkout-btn sandbox-btn" onClick={checkPayment} disabled={checking}>{checking ? t(lang, 'checkingPayment') : t(lang, 'sandboxPayment')}</button>}
              {!payment?.sandboxMock && !payment?.checkoutUrl && <button className="modern-checkout-btn" onClick={checkPayment} disabled={checking}>{checking ? t(lang, 'checkingPayment') : t(lang, 'retryPayment')}</button>}
            </>
          )}
          {status === 'paid' && (
            <>
              <div className="payment-icon paid-icon"><span>✓</span></div>
              <p className="payment-msg success">{t(lang, 'paymentPaid')}</p>
            </>
          )}
          {status === 'failed' && (
            <>
              <div className="payment-icon failed-icon"><span>!</span></div>
              <p className="payment-msg error">{t(lang, 'paymentFailed')}</p>
            </>
          )}
        </div>

        <div className="payment-order-summary">
          <div className="total-row"><span>{t(lang, 'placeOrder')}</span><strong>{money(order.total)}</strong></div>
        </div>
      </section>
    </div>
  );
}

/* ─── Checkout Flow ─── */
function Checkout({ cart, products, session, deliveryConfig, appliedCoupon, lang, onClose, onComplete }) {
  const [mode, setMode] = useState('delivery');
  const [payMethod, setPayMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [location, setLocation] = useState(deliveryConfig?.origin || null);
  const [quote, setQuote] = useState(null);
  const [locating, setLocating] = useState(false);
  const [paymentFlow, setPaymentFlow] = useState(null);
  const [form, setForm] = useState({ label: 'Home', houseNumber: '', blockNumber: '', street: '', area: '', landmark: '', floorUnit: '', deliveryNotes: '', addressText: '' });
  const lines = products.filter((p) => cart[p.id]).map((p) => ({ productId: p.id, quantity: cart[p.id] }));
  const subtotal = products.filter((p) => cart[p.id]).reduce((sum, p) => sum + p.price.current * cart[p.id], 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discount) / 100 : 0;

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
  const fee = mode === 'delivery' && quote?.available ? quote.fee : 0;
  const total = Math.max(0, subtotal - discountAmount + fee);

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

  return (
    <div className="sheet-backdrop modal-fade-in">
      <section className="cart-sheet checkout delivery-checkout modern-checkout-sheet" role="dialog" aria-modal="true" aria-label="Checkout">
        <div className="cart-top-bar">
          <button className="nav-icon-circle" onClick={onClose} aria-label="Back">‹</button>
          <h2 className="cart-title">{t(lang, 'checkoutTitle')}</h2>
          <div style={{ width: 36 }} />
        </div>

        {/* Fulfillment toggle */}
        <div className="modern-fulfillment-toggle">
          <button className={mode === 'delivery' ? 'selected' : ''} onClick={() => { setMode('delivery'); setError(''); }}>
            <span>🛵</span>
            <div><strong>{t(lang, 'delivery')}</strong><small>{t(lang, 'liveFee')}</small></div>
          </button>
          <button className={mode === 'pickup' ? 'selected' : ''} onClick={() => { setMode('pickup'); setError(''); }}>
            <span>🏪</span>
            <div><strong>{t(lang, 'pickup')}</strong><small>{t(lang, 'free')}</small></div>
          </button>
        </div>

        {mode === 'pickup' ? (
          <div className="checkout-choice-modern selected">
            <span className="choice-icon">🏪</span>
            <div><strong>{t(lang, 'collectAt')}</strong><p>{t(lang, 'pickupFreeNotify')}</p></div>
            <span className="check-badge">✓</span>
          </div>
        ) : (
          <div className="address-flow-modern">
            <div className="address-flow-head">
              <div><strong>{t(lang, 'placeYourPin')}</strong><p>{t(lang, 'pinDescription')}</p></div>
              <button className="location-button-modern" onClick={useMyLocation} disabled={locating}>
                {locating ? t(lang, 'finding') : t(lang, 'useMyLocation')}
              </button>
            </div>

            {addresses.length > 0 && (
              <div className="saved-addresses-pills">
                <p className="eyebrow">{t(lang, 'savedAddresses')}</p>
                <div className="saved-pills-row">
                  {addresses.map((a) => (
                    <button key={a.id} className={selectedAddressId === a.id ? 'active' : ''} onClick={() => chooseAddress(a)}>
                      <strong>{a.label}</strong>
                      <span>{a.area || a.street || a.addressText}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="map-picker-card">
              <MapPicker position={location || deliveryConfig.origin} onChange={applyLocation} />
            </div>

            {location && (
              <>
                <div className="quote-panel-modern">
                  {!quote ? (
                    <><span className="quote-spinner">◌</span><div><strong>{t(lang, 'calculatingFee')}</strong><small>{t(lang, 'checkingRoute')}</small></div></>
                  ) : quote.available ? (
                    <><span className="quote-good">✓</span><div><strong>{quote.fee === 0 ? t(lang, 'freeDelivery') : t(lang, 'deliveryFee', { amount: money(quote.fee) })}</strong><small>{quote.distanceKm} km · {quote.source === 'openrouteservice' ? t(lang, 'drivingRoute') : t(lang, 'estimatedRoute')}</small></div></>
                  ) : (
                    <><span className="quote-bad">!</span><div><strong>{t(lang, 'deliveryUnavailable')}</strong><small>{quote.reason}</small></div></>
                  )}
                </div>

                <div className="address-fields-grid">
                  <p className="eyebrow">{t(lang, 'helpRider')}</p>
                  <div className="field-grid-2col">
                    <label>{t(lang, 'addressLabel')}<input name="label" value={form.label || ''} onChange={updateForm} placeholder="Home" /></label>
                    <label>{t(lang, 'houseNumber')}<input name="houseNumber" value={form.houseNumber || ''} onChange={updateForm} /></label>
                    <label>{t(lang, 'blockCluster')}<input name="blockNumber" value={form.blockNumber || ''} onChange={updateForm} /></label>
                    <label>{t(lang, 'floorUnit')}<input name="floorUnit" value={form.floorUnit || ''} onChange={updateForm} /></label>
                  </div>
                  <label>{t(lang, 'streetArea')}<input name="street" value={form.street || ''} onChange={updateForm} placeholder="Street name" /></label>
                  <label>{t(lang, 'landmark')}<input name="landmark" value={form.landmark || ''} onChange={updateForm} placeholder={t(lang, 'landmarkPlaceholder')} /></label>
                  <label>{t(lang, 'deliveryNotes')}<textarea name="deliveryNotes" value={form.deliveryNotes || ''} onChange={updateForm} placeholder={t(lang, 'deliveryNotesPlaceholder')} /></label>
                </div>
              </>
            )}
          </div>
        )}

        {/* Payment method selector */}
        <div className="payment-method-section-modern">
          <p className="eyebrow">{t(lang, 'paymentMethod')}</p>
          <div className="modern-fulfillment-toggle">
            <button className={payMethod === 'cash' ? 'selected' : ''} onClick={() => setPayMethod('cash')}>
              <span>💵</span><strong>{t(lang, 'cash')}</strong><small>{mode === 'delivery' ? t(lang, 'onDelivery') : t(lang, 'atPickup')}</small>
            </button>
            <button className={payMethod === 'telebirr' ? 'selected' : ''} onClick={() => setPayMethod('telebirr')}>
              <span>📱</span><strong>{t(lang, 'telebirr')}</strong><small>{t(lang, 'securePayment')}</small>
            </button>
          </div>
        </div>

        <div className="checkout-total-summary">
          <span>{mode === 'delivery' ? t(lang, 'totalIncDelivery') : t(lang, 'totalAtStore')}</span>
          <strong>{money(total)}</strong>
        </div>

        {error && <p className="form-error-modern">{error}</p>}

        <button className="modern-checkout-btn" disabled={busy || (mode === 'delivery' && (!location || !quote?.available))} onClick={placeOrder}>
          {busy ? t(lang, 'placingOrder') : t(lang, 'placeOrderAmount', { amount: money(total) })}
        </button>
      </section>
    </div>
  );
}

/* ─── Order Tracking Screen (Image 2 - middle & right phone) ─── */
function OrderTrackingView({ order, token, lang, onClose }) {
  const [tracked, setTracked] = useState(order);
  const [riderLocation, setRiderLocation] = useState(null);
  const [trackingError, setTrackingError] = useState('');

  useEffect(() => {
    let live = true;
    const refresh = () => api.tracking(token, order.id).then(({ order: updated, riderLocation: rider }) => {
      if (live) { setTracked(updated); setRiderLocation(rider); }
    }).catch((e) => live && setTrackingError(e.message));
    refresh();
    const timer = window.setInterval(refresh, 7000);
    return () => { live = false; window.clearInterval(timer); };
  }, [order.id, token]);

  const steps = [
    { key: 'placed', label: 'Order Placed', time: '10:20 AM', icon: '📝', done: true },
    { key: 'pickup', label: 'Pick Up (GreenLeaf Store)', time: '10:50 AM', icon: '🏪', done: tracked.fulfillmentStatus !== 'placed' },
    { key: 'out_for_delivery', label: 'Shipped by Courier', time: 'On the way · 5 mins', icon: '🛵', active: tracked.fulfillmentStatus === 'out_for_delivery', done: ['out_for_delivery', 'delivered', 'collected', 'completed'].includes(tracked.fulfillmentStatus) },
    { key: 'delivered', label: 'Delivered', time: 'Estimated 11:15 AM', icon: '📍', done: ['delivered', 'collected', 'completed'].includes(tracked.fulfillmentStatus) }
  ];

  return (
    <div className="sheet-backdrop modal-fade-in">
      <section className="order-tracking-modal" role="dialog" aria-modal="true">
        {/* Tracking Header */}
        <div className="tracking-top-nav">
          <button className="nav-icon-circle" onClick={onClose} aria-label="Back">‹</button>
          <h2 className="detail-header-title">{t(lang, 'orderTracking')}</h2>
          <div style={{ width: 36 }} />
        </div>

        <div className="tracking-content-scroll">
          {/* Map Preview */}
          <div className="tracking-map-container">
            <TrackingMap
              rider={riderLocation || { lat: 9.0320, lng: 38.7420 }}
              destination={tracked.address || { lat: 9.0300, lng: 38.7400 }}
            />
            <div className="eta-badge-overlay">
              <span>🛵 5 mins away</span>
            </div>
          </div>

          {/* Courier Driver Card */}
          <div className="courier-driver-card">
            <div className="driver-avatar-box">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="Marcus Bennett" className="driver-avatar-img" />
              <span className="driver-online-dot" />
            </div>

            <div className="driver-info">
              <h4>Marcus Bennett</h4>
              <p>Driver · ID: #GR10912</p>
              <div className="driver-rating">
                <IconStar size={14} color="#f59e0b" />
                <span>4.9 (420 deliveries)</span>
              </div>
            </div>

            <div className="driver-contact-actions">
              <button className="driver-action-btn chat" onClick={() => haptic('impact', 'light')} aria-label="Chat">
                <IconChat size={18} />
              </button>
              <button className="driver-action-btn call" onClick={() => haptic('impact', 'medium')} aria-label="Call">
                <IconPhone size={18} />
              </button>
            </div>
          </div>

          {/* Vertical Step Timeline (Screenshot 2) */}
          <div className="vertical-timeline-card">
            <h4 className="timeline-title">Delivery Status</h4>
            <div className="timeline-stepper">
              {steps.map((st, i) => (
                <div className={`timeline-step-row ${st.done ? 'is-done' : ''} ${st.active ? 'is-active' : ''}`} key={st.key}>
                  <div className="timeline-marker-col">
                    <div className="timeline-circle">
                      {st.done ? '✓' : i + 1}
                    </div>
                    {i < steps.length - 1 && <div className="timeline-connector" />}
                  </div>

                  <div className="timeline-content-col">
                    <strong className="timeline-step-name">{st.label}</strong>
                    <span className="timeline-step-time">{st.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order items brief */}
          <div className="tracking-order-brief">
            <div className="brief-head">
              <strong>Order #{tracked.id}</strong>
              <span>{money(tracked.total)}</span>
            </div>
            <p>{(tracked.items || []).map((it) => `${it.quantity}× ${it.name}`).join(', ')}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="tracking-bottom-bar">
          <button className="modern-checkout-btn collected-btn" onClick={onClose}>
            {t(lang, 'orderCollected')}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ─── Order History Screen ─── */
function OrderHistoryView({ token, lang, onClose, onTrack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.myOrders(token).then(({ orders: list }) => { setOrders(list); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  return (
    <div className="sheet-backdrop modal-fade-in">
      <section className="cart-sheet modern-history-sheet" role="dialog" aria-modal="true">
        <div className="cart-top-bar">
          <button className="nav-icon-circle" onClick={onClose} aria-label="Back">‹</button>
          <h2 className="cart-title">{t(lang, 'myOrders')}</h2>
          <div style={{ width: 36 }} />
        </div>

        {loading ? (
          <div className="empty modern-empty"><div className="leaf-loader">✦</div></div>
        ) : orders.length === 0 ? (
          <div className="empty modern-empty">
            <div className="empty-cart-circle">📦</div>
            <h3>{t(lang, 'noOrders')}</h3>
            <p>{t(lang, 'noOrdersHint')}</p>
          </div>
        ) : (
          <div className="order-history-list-modern">
            {orders.map((order) => (
              <article className="order-card-modern" key={order.id} onClick={() => onTrack(order)}>
                <div className="order-card-head">
                  <div>
                    <strong>{order.id}</strong>
                    <small>{new Date(order.createdAt).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</small>
                  </div>
                  <span className={`status-badge-modern ${order.fulfillmentStatus}`}>{localizedStatus(lang, order.fulfillmentStatus)}</span>
                </div>
                <p className="order-card-items">{(order.items || []).map((i) => `${i.quantity}× ${i.name}`).join(', ')}</p>
                <div className="order-card-foot">
                  <span>{order.type === 'delivery' ? '🛵' : '🏪'} {money(order.total)}</span>
                  <span className="track-link-text">{t(lang, 'orderTracking')} →</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Profile / Account View ─── */
function ProfileView({ session, lang, onToggleLang, onOpenHistory }) {
  return (
    <section className="profile-tab-view">
      <div className="profile-user-card">
        <div className="profile-avatar-large">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" alt="User" />
        </div>
        <h2 className="profile-name">{session.user.firstName || 'Hannah Customer'}</h2>
        <p className="profile-phone">{session.user.phoneNumber || '+251 91 234 5678'}</p>
        <span className="verified-badge">✓ Verified Customer</span>
      </div>

      <div className="profile-options-list">
        <div className="profile-option-row" onClick={onOpenHistory}>
          <div className="opt-left"><span>📋</span><strong>{t(lang, 'myOrders')}</strong></div>
          <span className="opt-arrow">›</span>
        </div>
        <div className="profile-option-row" onClick={onToggleLang}>
          <div className="opt-left"><span>🌐</span><strong>Language ({lang === 'en' ? 'English' : 'አማርኛ'})</strong></div>
          <span className="lang-pill-badge">{lang === 'en' ? 'አማ' : 'EN'}</span>
        </div>
        <div className="profile-option-row" onClick={() => haptic('notification', 'success')}>
          <div className="opt-left"><span>🏷️</span><strong>Coupons & Discounts</strong></div>
          <span className="coupon-counter-badge">3 Active</span>
        </div>
        <div className="profile-option-row" onClick={() => haptic('impact', 'light')}>
          <div className="opt-left"><span>📍</span><strong>Delivery Addresses</strong></div>
          <span className="opt-arrow">›</span>
        </div>
        <div className="profile-option-row" onClick={() => haptic('impact', 'light')}>
          <div className="opt-left"><span>🔔</span><strong>Notifications</strong></div>
          <span className="opt-arrow">›</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Application Component ─── */
export default function App() {
  const [storefront, setStorefront] = useState(null);
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState({});
  const [deliveryConfig, setDeliveryConfig] = useState(null);
  const [lang, setLang] = useState('en');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [slide, setSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'offers' | 'orders' | 'profile'
  const [favorites, setFavorites] = useState(['fuji-apples', 'organic-spinach']);
  const [appliedCoupon, setAppliedCoupon] = useState({ code: 'FRESH30', discount: 30 });

  // Modals & Sheets
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setLang(detectLanguage());
    const telegram = initialiseTelegramTheme();
    Promise.all([
      api.storefront(),
      telegram?.initData ? api.authenticateTelegram(telegram.initData) : api.authenticateDevelopment(),
      api.deliveryConfig()
    ]).then(([data, auth, config]) => {
      setStorefront(data);
      setSession(auth);
      setDeliveryConfig(config);
    }).catch((e) => setLoadError(e.message));
  }, []);

  // Banner auto-advance
  useEffect(() => {
    if (!storefront?.banners?.length) return undefined;
    const timer = window.setInterval(() => setSlide((c) => (c + 1) % storefront.banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [storefront?.banners?.length]);

  // Telegram MainButton & BackButton
  useEffect(() => {
    const mainButton = telegramApp()?.MainButton;
    if (!mainButton) return undefined;
    const itemCount = Object.values(cart).reduce((s, q) => s + q, 0);
    if (itemCount && !cartOpen && !checkout && !selectedProduct) {
      const total = storefront?.products?.reduce((s, p) => s + (cart[p.id] || 0) * p.price.current, 0) || 0;
      mainButton.setText(`${t(lang, 'viewBasket')} · ${money(total)}`);
      mainButton.show();
    } else mainButton.hide();
    const open = () => setCartOpen(true);
    mainButton.onClick(open);
    return () => mainButton.offClick(open);
  }, [cart, storefront, lang, cartOpen, checkout, selectedProduct]);

  useEffect(() => {
    const backButton = telegramApp()?.BackButton;
    if (!backButton) return undefined;
    if (cartOpen || checkout || historyOpen || selectedProduct || trackingOrder) backButton.show();
    else backButton.hide();
    const close = () => {
      setCheckout(false);
      setCartOpen(false);
      setHistoryOpen(false);
      setSelectedProduct(null);
      setTrackingOrder(null);
    };
    backButton.onClick(close);
    return () => backButton.offClick(close);
  }, [cartOpen, checkout, historyOpen, selectedProduct, trackingOrder]);

  const adjust = (id, amount) => {
    haptic('impact', amount > 0 ? 'light' : 'soft');
    setCart((c) => {
      const next = Math.max(0, (c[id] || 0) + amount);
      const cp = { ...c };
      if (next) cp[id] = next; else delete cp[id];
      return cp;
    });
  };

  const toggleFavorite = (id) => {
    haptic('impact', 'medium');
    setFavorites((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const cartCount = Object.values(cart).reduce((s, q) => s + q, 0);
  const toggleLang = () => setLang((c) => c === 'en' ? 'am' : 'en');

  const products = useMemo(() => {
    let list = storefront?.products || [];
    if (activeTab === 'offers') {
      list = list.filter((p) => p.price.discountPercent > 0);
    }
    if (category !== 'all') {
      list = list.filter((p) => p.categoryId === category);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.nameAm && p.nameAm.includes(q)));
    }
    return list;
  }, [storefront, category, query, activeTab]);

  const categories = useMemo(() => [
    { id: 'all', name: t(lang, 'all'), icon: '🥬' },
    ...(storefront?.categories || [
      { id: 'fruits', name: 'Fruits', icon: '🍎' },
      { id: 'vegetables', name: 'Vegetables', icon: '🥦' },
      { id: 'herbs', name: 'Herbs', icon: '🌿' },
      { id: 'oils', name: 'Oils', icon: '🫒' },
      { id: 'pantry', name: 'Grocery', icon: '🛍️' }
    ])
  ], [storefront, lang]);

  if (loadError) {
    return (
      <main className="app-shell">
        <div className="error-state">
          <span>!</span>
          <h1>{t(lang, 'errorTitle')}</h1>
          <p>{loadError}</p>
          <button onClick={() => window.location.reload()}>{t(lang, 'tryAgain')}</button>
        </div>
      </main>
    );
  }

  if (!storefront || !session || !deliveryConfig) {
    return (
      <main className="app-shell loading">
        <div className="leaf-loader">✦</div>
        <p>{t(lang, 'loading')}</p>
      </main>
    );
  }

  const activeBanner = storefront.banners?.[slide] || storefront.banners?.[0];
  const userName = session.user.firstName || 'Hannah';

  return (
    <div className="mobile-app-wrapper">
      <main className="app-shell modern-ios-shell">
        {/* Top Status & Brand Header */}
        <header className="modern-topbar">
          <div className="user-profile-header">
            <div className="user-avatar-wrap">
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="Avatar" className="user-avatar-img" />
              <span className="user-status-dot" />
            </div>
            <div className="greeting-text">
              <span className="greeting-sub">{t(lang, 'morningGreeting', { name: userName })}</span>
              <h2 className="greeting-main">{t(lang, 'whatWouldYouBuy')}</h2>
            </div>
          </div>

          <div className="topbar-actions-group">
            <button className="lang-pill-btn" onClick={toggleLang} aria-label="Language">
              {lang === 'en' ? 'አማ' : 'EN'}
            </button>
            <button className="bag-icon-pill" onClick={() => setCartOpen(true)} aria-label="Cart">
              <IconBag size={20} />
              {cartCount > 0 && <span className="cart-badge-dot">{cartCount}</span>}
            </button>
          </div>
        </header>

        {activeTab === 'profile' ? (
          <ProfileView
            session={session}
            lang={lang}
            onToggleLang={toggleLang}
            onOpenHistory={() => setHistoryOpen(true)}
          />
        ) : activeTab === 'orders' ? (
          <OrderHistoryView
            token={session.token}
            lang={lang}
            onClose={() => setActiveTab('home')}
            onTrack={(ord) => setTrackingOrder(ord)}
          />
        ) : (
          <>
            {/* Special Offer Hero Carousel Banner (Image 1) */}
            {activeBanner && (
              <section className="modern-offer-banner" onClick={() => {
                setCategory(activeBanner.targetType === 'category' ? activeBanner.targetId : 'all');
              }}>
                <div className="banner-content-box">
                  <span className="banner-top-badge">SPECIAL DISCOUNT</span>
                  <h2 className="banner-main-title">{activeBanner.title || 'Enjoy The Special Offer Up To 30%'}</h2>
                  <p className="banner-date-text">{activeBanner.subtitle || 'From 14th June, 2026'}</p>
                </div>

                <div className="banner-art-box">
                  <img src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=400&q=80" alt="Fresh fruits basket" className="banner-art-img" />
                </div>

                <div className="banner-pagination-dots">
                  {storefront.banners.map((b, i) => (
                    <button
                      key={b.id}
                      className={`banner-dot ${i === slide ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setSlide(i); }}
                      aria-label={`Slide ${i + 1}`}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Search Bar & Filter Button */}
            <div className="search-row-container">
              <div className="modern-search-input-wrap">
                <IconSearch size={19} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t(lang, 'search')}
                />
                {query && (
                  <button className="clear-search-btn" onClick={() => setQuery('')}>×</button>
                )}
              </div>
              <button className="filter-icon-btn" onClick={() => setActiveTab(activeTab === 'offers' ? 'home' : 'offers')} aria-label="Filter">
                <IconFilter size={18} />
              </button>
            </div>

            {/* Category Icons Rail (Image 1) */}
            <section className="categories-section">
              <div className="section-head-row">
                <h3 className="section-title-bold">{t(lang, 'categories')}</h3>
                <button className="see-all-link" onClick={() => setCategory('all')}>{t(lang, 'seeAll')}</button>
              </div>

              <div className="categories-scroll-rail">
                {categories.map((c) => {
                  const isSelected = category === c.id;
                  return (
                    <button
                      key={c.id}
                      className={`category-pill-card ${isSelected ? 'active' : ''}`}
                      onClick={() => setCategory(c.id)}
                    >
                      <div className="category-icon-circle">
                        <span>{c.icon || (c.id === 'fruits' ? '🍎' : c.id === 'vegetables' ? '🥦' : c.id === 'herbs' ? '🌿' : c.id === 'oils' ? '🫒' : '🛍️')}</span>
                      </div>
                      <span className="category-name-text">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Fresh Products Grid (Image 1) */}
            <section className="fresh-products-section">
              <div className="section-head-row">
                <h3 className="section-title-bold">
                  {activeTab === 'offers' ? t(lang, 'todaysDeals') : query ? t(lang, 'searchResults') : t(lang, 'freshProducts')}
                </h3>
                <span className="items-count-pill">{products.length} {t(lang, 'items', { count: products.length })}</span>
              </div>

              {products.length ? (
                <div className="modern-product-grid">
                  {products.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      quantity={cart[prod.id] || 0}
                      isFavorite={favorites.includes(prod.id)}
                      onToggleFavorite={toggleFavorite}
                      onAdd={() => adjust(prod.id, 1)}
                      onRemove={() => adjust(prod.id, -1)}
                      onClick={() => setSelectedProduct(prod)}
                      lang={lang}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty modern-empty">
                  <span>🥬</span>
                  <h3>{t(lang, 'noMatch')}</h3>
                  <p>{t(lang, 'noMatchHint')}</p>
                </div>
              )}
            </section>
          </>
        )}

        {/* Modern Bottom Navigation Bar (Image 1 - middle phone) */}
        <nav className="modern-bottom-nav">
          <button
            className={`nav-tab-item ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => { setActiveTab('home'); setCategory('all'); }}
          >
            <span className="tab-icon">🏠</span>
            <span className="tab-label">{t(lang, 'navHome')}</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'offers' ? 'active' : ''}`}
            onClick={() => setActiveTab('offers')}
          >
            <span className="tab-icon">🏷️</span>
            <span className="tab-label">{t(lang, 'navOffers')}</span>
          </button>

          {/* Raised Center Cart Action Button */}
          <div className="center-cart-nav-wrap">
            <button className="raised-center-cart-btn" onClick={() => setCartOpen(true)} aria-label="Cart">
              <IconBag size={22} />
              {cartCount > 0 && <span className="raised-cart-count">{cartCount}</span>}
            </button>
          </div>

          <button
            className={`nav-tab-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <span className="tab-icon">💬</span>
            <span className="tab-label">{t(lang, 'navOrders')}</span>
          </button>

          <button
            className={`nav-tab-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            <span className="tab-label">{t(lang, 'navProfile')}</span>
          </button>
        </nav>

        {/* Modals & Overlays */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            quantity={cart[selectedProduct.id] || 0}
            isFavorite={favorites.includes(selectedProduct.id)}
            onToggleFavorite={toggleFavorite}
            onAdd={() => adjust(selectedProduct.id, 1)}
            onRemove={() => adjust(selectedProduct.id, -1)}
            onAddToCart={(id) => adjust(id || selectedProduct.id, 1)}
            onClose={() => setSelectedProduct(null)}
            relatedProducts={storefront.products.filter((p) => p.id !== selectedProduct.id)}
            onSelectRelated={(p) => setSelectedProduct(p)}
            lang={lang}
          />
        )}

        {cartOpen && (
          <CartSheet
            cart={cart}
            products={storefront.products}
            onClose={() => setCartOpen(false)}
            onChange={adjust}
            appliedCoupon={appliedCoupon}
            onApplyCoupon={setAppliedCoupon}
            onCheckout={() => { setCartOpen(false); setCheckout(true); }}
            lang={lang}
          />
        )}

        {checkout && (
          <Checkout
            cart={cart}
            products={storefront.products}
            session={session}
            deliveryConfig={deliveryConfig}
            appliedCoupon={appliedCoupon}
            lang={lang}
            onClose={() => setCheckout(false)}
            onComplete={(created) => {
              setCheckout(false);
              setCart({});
              setTrackingOrder(created);
            }}
          />
        )}

        {trackingOrder && (
          <OrderTrackingView
            order={trackingOrder}
            token={session.token}
            lang={lang}
            onClose={() => setTrackingOrder(null)}
          />
        )}

        {historyOpen && (
          <OrderHistoryView
            token={session.token}
            lang={lang}
            onClose={() => setHistoryOpen(false)}
            onTrack={(o) => { setHistoryOpen(false); setTrackingOrder(o); }}
          />
        )}
      </main>
    </div>
  );
}
