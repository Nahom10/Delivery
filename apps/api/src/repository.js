import { priceFor, cartSummary } from '@allfreshmart/core/src/pricing.js';
import { assertTransition } from '@allfreshmart/core/src/order-lifecycle.js';

const seedProducts = [
  { id: 'fuji-apples', categoryId: 'fruits', name: 'Fresh Fuji Apples', nameAm: 'ፉጂ ፖም', description: 'Fuji apples are a popular apple variety prized for their exceptional sweetness, firm crisp texture, and beautiful rosy-red skin. Originally developed in Japan and now grown locally under sustainable standards.', price: 65, unit: 'pack', stock: 45, rating: 4.8, reviewsCount: 142, active: true, imageUrl: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80', discount: { active: true, kind: 'percentage', value: 10, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'organic-spinach', categoryId: 'vegetables', name: 'Organic Spinach', nameAm: 'ስፒናች', description: 'A nutrient-rich leafy green loaded with iron, calcium, and antioxidants. Hand-harvested daily from certified local organic farms.', price: 45, unit: 'bunch', stock: 35, rating: 4.9, reviewsCount: 98, active: true, imageUrl: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=600&q=80', discount: { active: true, kind: 'percentage', value: 10, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'organic-lettuce', categoryId: 'vegetables', name: 'Organic Lettuce', nameAm: 'ሰላጣ', description: 'Crisp green butterhead lettuce with succulent, tender leaves. Washed and ready for your fresh gourmet salad.', price: 35, unit: 'bunch', stock: 28, rating: 4.7, reviewsCount: 64, active: true, imageUrl: 'https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=600&q=80', discount: null },
  { id: 'avocados', categoryId: 'fruits', name: 'Hass Avocados', nameAm: 'አቮካዶ', description: 'Creamy, buttery ready-to-ripen Hass avocados. Rich in healthy monounsaturated fats and essential minerals.', price: 55, unit: 'piece', stock: 30, rating: 4.8, reviewsCount: 112, active: true, imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=80', discount: { active: true, kind: 'percentage', value: 15, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'strawberries', categoryId: 'fruits', name: 'Fresh Strawberries', nameAm: 'እንጆሪ', description: 'Plump, deeply fragrant crimson strawberries bursting with natural sweetness. Picked this morning.', price: 110, unit: 'pack', stock: 20, rating: 4.9, reviewsCount: 86, active: true, imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=600&q=80', discount: { active: true, kind: 'percentage', value: 20, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'tomatoes', categoryId: 'vegetables', name: 'Vine Tomatoes', nameAm: 'ቲማቲም', description: 'Sweet, sun-ripened vine tomatoes with rich aroma and intense garden flavor.', price: 60, unit: 'kg', stock: 40, rating: 4.6, reviewsCount: 75, active: true, imageUrl: 'https://images.unsplash.com/photo-1546470427-227c1f6ef8e1?auto=format&fit=crop&w=600&q=80', discount: { active: true, kind: 'percentage', value: 20, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'bananas', categoryId: 'fruits', name: 'Sweet Bananas', nameAm: 'ሙዝ', description: 'Naturally sweet Cavendish bananas by the fresh cluster. Perfect quick energy snack.', price: 50, unit: 'bunch', stock: 32, rating: 4.8, reviewsCount: 53, active: true, imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80', discount: { active: true, kind: 'fixed', value: 10, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'bell-peppers', categoryId: 'vegetables', name: 'Crisp Bell Peppers', nameAm: 'ቃሪያ / ባቄላ', description: 'Vibrant sweet tri-color bell peppers, crunchy and rich in vitamin C.', price: 65, unit: 'pack', stock: 24, rating: 4.8, reviewsCount: 41, active: true, imageUrl: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=600&q=80', discount: null },
  { id: 'olive-oil', categoryId: 'oils', name: 'Extra Virgin Olive Oil', nameAm: 'የወይራ ዘይት', description: 'Cold-pressed extra virgin olive oil with smooth, fruity profile and peppery finish.', price: 180, unit: 'bottle', stock: 15, rating: 5.0, reviewsCount: 110, active: true, imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80', discount: { active: true, kind: 'percentage', value: 15, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'basil', categoryId: 'herbs', name: 'Fresh Basil', nameAm: 'ባሲል', description: 'Aromatic Genovese sweet basil bundled fresh. Ideal for pesto and sauces.', price: 25, unit: 'bunch', stock: 18, rating: 4.9, reviewsCount: 39, active: true, imageUrl: 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=600&q=80', discount: null },
  { id: 'carrots', categoryId: 'vegetables', name: 'Crunchy Carrots', nameAm: 'ካሮት', description: 'Washed sweet carrots, excellent for snacking, soups and juices.', price: 40, unit: 'kg', stock: 25, rating: 4.7, reviewsCount: 60, active: true, imageUrl: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=600&q=80', discount: null },
  { id: 'potatoes', categoryId: 'vegetables', name: 'Red Potatoes', nameAm: 'ድንች', description: 'Everyday tender red potatoes for roasting, mashing and curries.', price: 45, unit: 'kg', stock: 50, rating: 4.6, reviewsCount: 32, active: true, imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80', discount: null }
];

const seedCategories = [
  { id: 'fruits', name: 'Fruits', icon: '🍎' },
  { id: 'vegetables', name: 'Vegetables', icon: '🥦' },
  { id: 'herbs', name: 'Herbs', icon: '🌿' },
  { id: 'oils', name: 'Oils', icon: '🫒' },
  { id: 'pantry', name: 'Grocery', icon: '🛍️' }
];

const seedBanners = [
  { id: 'offer-30', active: true, title: 'Enjoy The Special Offer Up To 30%', subtitle: 'From 14th June, 2026', badge: 'SPECIAL DISCOUNT', imageUrl: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=1200&q=80', targetType: 'category', targetId: 'fruits', priority: 1, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' },
  { id: 'today-tomatoes', active: true, title: 'Fresh Fuji Apples & Greens', subtitle: 'Handpicked daily for your home', badge: 'FARM FRESH', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80', targetType: 'product', targetId: 'fuji-apples', priority: 2, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' },
  { id: 'weekend-fruit', active: true, title: '100% Organic Leafy Greens', subtitle: 'Crisp, washed and pesticide-free', badge: 'TOP PICKS', imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80', targetType: 'category', targetId: 'vegetables', priority: 3, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' }
];

function isActive(item, at) {
  return item.active && (!item.startsAt || new Date(item.startsAt) <= at) && (!item.endsAt || new Date(item.endsAt) > at);
}

function exposedProduct(product, at) {
  const price = priceFor(product, at);
  return { ...product, price, inStock: product.stock > 0 };
}

export function createDevelopmentRepository({ bootstrapAdminTelegramId = '' } = {}) {
  const products = structuredClone(seedProducts);
  const banners = structuredClone(seedBanners);
  const users = new Map();
  const orders = [];
  const addresses = new Map();
  const riderLocations = new Map();
  const payments = new Map();
  const paymentWebhookLogs = [];
  const promotionEvents = [];
  const deliverySettings = {
    origin: { lat: 9.0300, lng: 38.7400, label: 'AllFreshMart — configure shop coordinates before launch' },
    rules: { baseFee: 30, includedKm: 2, perKmRate: 8, freeDeliveryThreshold: 500, freeDeliveryMaxKm: 5, maxServiceKm: 10, currency: 'ETB' }
  };
  const deliveryZones = [{ id: 'central-radius', name: 'Central delivery area', active: true, kind: 'inclusion', type: 'radius', center: { lat: 9.0300, lng: 38.7400 }, radiusKm: 10 }];
  let nextProduct = 100;
  let nextAddress = 1;
  let nextPayment = 1;

  function upsertTelegramUser(telegram, { phoneNumber, phoneVerified = false } = {}) {
    const id = String(telegram.id);
    const existing = users.get(id) || { telegramUserId: id, role: id === String(bootstrapAdminTelegramId) ? 'admin' : 'customer', phoneNumber: null, phoneVerified: false, createdAt: new Date().toISOString() };
    const user = {
      ...existing,
      username: telegram.username || null,
      firstName: telegram.first_name || null,
      lastName: telegram.last_name || null,
      languageCode: telegram.language_code || 'en',
      phoneNumber: phoneNumber || existing.phoneNumber,
      phoneVerified: phoneVerified || existing.phoneVerified,
      updatedAt: new Date().toISOString()
    };
    users.set(id, user);
    return user;
  }

  function createDevelopmentRoleUser(role) {
    const id = `dev-${role}`;
    const user = upsertTelegramUser({ id, first_name: `Demo ${role}`, username: `allfresh_${role}`, language_code: 'en' }, { phoneNumber: '+251900000000', phoneVerified: true });
    user.role = role;
    users.set(id, user);
    return user;
  }

  function calculateCart(lines) { return cartSummary(lines, products); }

  function createOrder({ telegramUserId, lines, note, orderType, delivery = null, paymentMethod = 'cash', promotionId = null }) {
    const summary = calculateCart(lines);
    for (const item of summary.items) products.find((product) => product.id === item.productId).stock -= item.quantity;
    const deliveryFee = orderType === 'delivery' ? delivery.quote.fee : 0;
    const order = {
      id: `AFM-${String(orders.length + 1).padStart(5, '0')}`,
      telegramUserId: String(telegramUserId), type: orderType, fulfillmentStatus: 'placed', paymentStatus: 'pending', paymentMethod,
      items: summary.items, subtotal: summary.subtotal, deliveryFee, total: summary.subtotal + deliveryFee,
      distanceKm: delivery?.quote.distanceKm ?? null, deliveryFeeBreakdown: delivery?.quote ?? null, address: delivery?.address ? structuredClone(delivery.address) : null,
      note: note?.trim() || null, promotionId, assignedRiderId: null, proofOfDelivery: null,
      statusHistory: [{ from: null, to: 'placed', actorId: String(telegramUserId), actorRole: 'customer', at: new Date().toISOString() }],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    orders.unshift(order);
    return order;
  }

  return {
    upsertTelegramUser,
    createDevelopmentRoleUser,
    getUser(telegramUserId) { return users.get(String(telegramUserId)) || null; },
    listRiders() {
      return [...users.values()].filter((user) => user.role === 'rider').map((user) => {
        const location = riderLocations.get(user.telegramUserId);
        return { ...structuredClone(user), location: location ? structuredClone(location) : null };
      });
    },
    getStorefront(at = new Date()) {
      const catalog = products.filter((product) => product.active).map((product) => exposedProduct(product, at));
      return {
        categories: seedCategories,
        banners: banners.filter((banner) => isActive(banner, at)).sort((a, b) => a.priority - b.priority),
        deals: catalog.filter((product) => product.price.discountPercent > 0),
        products: catalog
      };
    },
    getBanner(id) { return banners.find((banner) => banner.id === id) || null; },
    getProducts(at = new Date()) { return products.map((product) => exposedProduct(product, at)); },
    calculateCart,
    createProduct(input) {
      const product = { id: `product-${nextProduct++}`, active: true, stock: 0, discount: null, ...input };
      products.push(product);
      return exposedProduct(product, new Date());
    },
    updateProduct(id, changes) {
      const product = products.find((item) => item.id === id);
      if (!product) return null;
      Object.assign(product, changes);
      return exposedProduct(product, new Date());
    },
    getDeliverySettings() { return structuredClone(deliverySettings); },
    updateDeliveryRules(changes) { Object.assign(deliverySettings.rules, changes); return structuredClone(deliverySettings.rules); },
    getDeliveryZones() { return structuredClone(deliveryZones); },
    createDeliveryZone(input) { const zone = { id: `zone-${deliveryZones.length + 1}`, active: true, ...structuredClone(input) }; deliveryZones.push(zone); return structuredClone(zone); },
    updateDeliveryZone(id, changes) { const zone = deliveryZones.find((item) => item.id === id); if (!zone) return null; Object.assign(zone, structuredClone(changes)); return structuredClone(zone); },
    listAddresses(telegramUserId) { return structuredClone(addresses.get(String(telegramUserId)) || []); },
    getAddress(telegramUserId, addressId) { return (addresses.get(String(telegramUserId)) || []).find((address) => address.id === addressId) || null; },
    saveAddress(telegramUserId, input) {
      const userAddresses = addresses.get(String(telegramUserId)) || [];
      const address = { id: `address-${nextAddress++}`, telegramUserId: String(telegramUserId), ...structuredClone(input), createdAt: new Date().toISOString() };
      userAddresses.unshift(address); addresses.set(String(telegramUserId), userAddresses); return structuredClone(address);
    },
    createOrder,
    createPickupOrder({ telegramUserId, lines, note }) { return createOrder({ telegramUserId, lines, note, orderType: 'pickup' }); },
    getOrder(orderId) { return orders.find((order) => order.id === orderId) || null; },
    listOrdersFor(telegramUserId) { return orders.filter((order) => order.telegramUserId === String(telegramUserId)).map((order) => structuredClone(order)); },
    listOrdersForRider(riderId) { return orders.filter((order) => order.assignedRiderId === String(riderId)).map((order) => structuredClone(order)); },
    listAllOrders() { return orders.map((order) => structuredClone(order)); },
    assignRider(orderId, riderId, actor) {
      const order = orders.find((item) => item.id === orderId);
      const rider = users.get(String(riderId));
      if (!order) throw new Error('Order not found.');
      if (order.type !== 'delivery') throw new Error('Only delivery orders can be assigned to a rider.');
      if (!rider || rider.role !== 'rider') throw new Error('Choose an active rider.');
      order.assignedRiderId = rider.telegramUserId;
      order.statusHistory.push({ from: order.fulfillmentStatus, to: order.fulfillmentStatus, eventType: 'rider_assigned', actorId: String(actor.id), actorRole: actor.role, riderId: rider.telegramUserId, at: new Date().toISOString() });
      order.updatedAt = new Date().toISOString();
      return structuredClone(order);
    },
    updateOrderStatus(orderId, nextStatus, actor) {
      const order = orders.find((item) => item.id === orderId);
      if (!order) throw new Error('Order not found.');
      assertTransition(order.type, order.fulfillmentStatus, nextStatus);
      const previousStatus = order.fulfillmentStatus;
      order.fulfillmentStatus = nextStatus;
      order.statusHistory.push({ from: previousStatus, to: nextStatus, actorId: String(actor.id), actorRole: actor.role, at: new Date().toISOString() });
      order.updatedAt = new Date().toISOString();
      return structuredClone(order);
    },
    saveProofOfDelivery(orderId, proof, actor) {
      const order = orders.find((item) => item.id === orderId);
      if (!order) throw new Error('Order not found.');
      order.proofOfDelivery = { ...structuredClone(proof), capturedBy: String(actor.id), capturedAt: new Date().toISOString() };
      order.updatedAt = new Date().toISOString();
      return structuredClone(order);
    },
    updateRiderLocation(riderId, location) {
      const record = { ...structuredClone(location), updatedAt: new Date().toISOString() };
      riderLocations.set(String(riderId), record);
      return structuredClone(record);
    },
    getRiderLocation(riderId) { const location = riderLocations.get(String(riderId)); return location ? structuredClone(location) : null; }
    ,
    createPayment({ orderId, provider, merchantOrderId, amount, checkoutUrl = null, providerReference = null, raw = null, sandboxMock = false }) {
      const order = orders.find((item) => item.id === orderId);
      if (!order) throw new Error('Order not found.');
      const payment = {
        id: `payment-${nextPayment++}`, orderId, provider, merchantOrderId, amount: Number(amount), status: 'pending', checkoutUrl,
        providerReference, transactionId: null, sandboxMock, providerRaw: raw ? structuredClone(raw) : null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      payments.set(payment.id, payment);
      order.paymentStatus = 'pending'; order.paymentMethod = provider; order.updatedAt = new Date().toISOString();
      return structuredClone(payment);
    },
    getPayment(paymentId) { const payment = payments.get(paymentId); return payment ? structuredClone(payment) : null; },
    getPaymentForOrder(orderId) { const payment = [...payments.values()].find((item) => item.orderId === orderId); return payment ? structuredClone(payment) : null; },
    getPaymentByMerchantOrderId(merchantOrderId) { const payment = [...payments.values()].find((item) => item.merchantOrderId === merchantOrderId); return payment ? structuredClone(payment) : null; },
    updatePayment(paymentId, changes) {
      const payment = payments.get(paymentId); if (!payment) return null;
      Object.assign(payment, structuredClone(changes), { updatedAt: new Date().toISOString() });
      const order = orders.find((item) => item.id === payment.orderId);
      if (order && changes.status) { order.paymentStatus = changes.status; order.updatedAt = new Date().toISOString(); }
      return structuredClone(payment);
    },
    logPaymentWebhook({ provider, headers = {}, payload, rawBody = '', signatureValid, outcome = null }) {
      const record = { id: `webhook-${paymentWebhookLogs.length + 1}`, provider, headers: structuredClone(headers), payload: structuredClone(payload), rawBody, signatureValid, outcome, receivedAt: new Date().toISOString() };
      paymentWebhookLogs.unshift(record); return structuredClone(record);
    },
    recordPromotionEvent({ promotionId, type, telegramUserId = null, anonymousId = null, at = new Date() }) {
      const event = { id: `promotion-event-${promotionEvents.length + 1}`, promotionId, type, telegramUserId: telegramUserId ? String(telegramUserId) : null, anonymousId: anonymousId ? String(anonymousId).slice(0, 120) : null, at: new Date(at).toISOString() };
      promotionEvents.push(event); return structuredClone(event);
    },
    report({ from, to }) {
      const start = new Date(from); const end = new Date(to);
      const inside = (value) => { const at = new Date(value); return at >= start && at < end; };
      const scopedOrders = orders.filter((order) => inside(order.createdAt));
      const scopedEvents = promotionEvents.filter((event) => inside(event.at));
      const grossSales = scopedOrders.reduce((sum, order) => sum + order.total, 0);
      const deliveryRevenue = scopedOrders.reduce((sum, order) => sum + order.deliveryFee, 0);
      const promotions = [...new Set([...scopedEvents.map((event) => event.promotionId), ...scopedOrders.map((order) => order.promotionId).filter(Boolean)])].map((promotionId) => {
        const relatedOrders = scopedOrders.filter((order) => order.promotionId === promotionId);
        const events = scopedEvents.filter((event) => event.promotionId === promotionId);
        const banner = banners.find((item) => item.id === promotionId);
        return { promotionId, title: banner?.title || promotionId, views: events.filter((event) => event.type === 'view').length, clicks: events.filter((event) => event.type === 'click').length, orders: relatedOrders.length, revenue: relatedOrders.reduce((sum, order) => sum + order.total, 0) };
      }).sort((left, right) => right.revenue - left.revenue || right.clicks - left.clicks);
      return {
        from: start.toISOString(), to: end.toISOString(), totals: { orders: scopedOrders.length, grossSales, deliveryRevenue, paidOrders: scopedOrders.filter((order) => order.paymentStatus === 'paid').length, pendingPayments: scopedOrders.filter((order) => order.paymentStatus === 'pending' && order.paymentMethod === 'telebirr').length },
        payments: ['cash', 'telebirr'].map((method) => ({ method, orders: scopedOrders.filter((order) => order.paymentMethod === method).length, total: scopedOrders.filter((order) => order.paymentMethod === method).reduce((sum, order) => sum + order.total, 0) })),
        promotions,
        orders: structuredClone(scopedOrders)
      };
    },
    // ─── Banner/Promotion CRUD ───
    getAllBanners() { return structuredClone(banners); },
    createBanner(input) {
      const banner = { id: `banner-${banners.length + 1}-${Date.now().toString(36)}`, ...structuredClone(input) };
      banners.push(banner);
      return structuredClone(banner);
    },
    updateBanner(id, changes) {
      const banner = banners.find((item) => item.id === id);
      if (!banner) return null;
      Object.assign(banner, structuredClone(changes));
      return structuredClone(banner);
    },
    // ─── User Management ───
    listUsers() { return [...users.values()].map((user) => structuredClone(user)); },
    updateUserRole(telegramUserId, role) {
      const user = users.get(String(telegramUserId));
      if (!user) return null;
      user.role = role;
      user.updatedAt = new Date().toISOString();
      return structuredClone(user);
    }
  };
}

