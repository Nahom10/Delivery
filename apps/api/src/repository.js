import { priceFor, cartSummary } from '@allfreshmart/core/src/pricing.js';

const seedProducts = [
  { id: 'tomatoes', categoryId: 'vegetables', name: 'Vine Tomatoes', nameAm: 'ቲማቲም', description: 'Sweet, ripe tomatoes picked for today.', price: 90, unit: 'kg', stock: 40, active: true, imageUrl: 'https://images.unsplash.com/photo-1546470427-227c1f6ef8e1?auto=format&fit=crop&w=600&q=75', discount: { active: true, kind: 'percentage', value: 20, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'avocados', categoryId: 'fruits', name: 'Hass Avocados', nameAm: 'አቮካዶ', description: 'Creamy, ready-to-ripen Hass avocados.', price: 55, unit: 'piece', stock: 26, active: true, imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&q=75', discount: null },
  { id: 'bananas', categoryId: 'fruits', name: 'Sweet Bananas', nameAm: 'ሙዝ', description: 'Naturally sweet bananas by the bunch.', price: 65, unit: 'bunch', stock: 30, active: true, imageUrl: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=75', discount: { active: true, kind: 'fixed', value: 10, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' } },
  { id: 'carrots', categoryId: 'vegetables', name: 'Crunchy Carrots', nameAm: 'ካሮት', description: 'Washed carrots, excellent for soups and juices.', price: 48, unit: 'kg', stock: 18, active: true, imageUrl: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?auto=format&fit=crop&w=600&q=75', discount: null },
  { id: 'basil', categoryId: 'herbs', name: 'Fresh Basil', nameAm: 'ባሲል', description: 'Aromatic basil bundled fresh.', price: 25, unit: 'bunch', stock: 12, active: true, imageUrl: 'https://images.unsplash.com/photo-1618375569909-3c8616cf7733?auto=format&fit=crop&w=600&q=75', discount: null },
  { id: 'potatoes', categoryId: 'vegetables', name: 'Red Potatoes', nameAm: 'ድንች', description: 'Everyday red potatoes for your pantry.', price: 58, unit: 'kg', stock: 50, active: true, imageUrl: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=75', discount: null }
];

const seedCategories = [
  { id: 'vegetables', name: 'Vegetables' }, { id: 'fruits', name: 'Fruits' }, { id: 'herbs', name: 'Herbs' }, { id: 'pantry', name: 'Packaged Goods' }
];

const seedBanners = [
  { id: 'today-tomatoes', active: true, title: 'Today’s harvest', subtitle: '20% off vine tomatoes', imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=1200&q=75', targetType: 'product', targetId: 'tomatoes', priority: 1, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' },
  { id: 'weekend-fruit', active: true, title: 'Fruit, ready for the weekend', subtitle: 'Freshness for every table', imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1200&q=75', targetType: 'category', targetId: 'fruits', priority: 2, startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2027-01-01T00:00:00.000Z' }
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
  let nextProduct = 100;

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

  return {
    upsertTelegramUser,
    getUser(telegramUserId) { return users.get(String(telegramUserId)) || null; },
    getStorefront(at = new Date()) {
      const catalog = products.filter((product) => product.active).map((product) => exposedProduct(product, at));
      return {
        categories: seedCategories,
        banners: banners.filter((banner) => isActive(banner, at)).sort((a, b) => a.priority - b.priority),
        deals: catalog.filter((product) => product.price.discountPercent > 0),
        products: catalog
      };
    },
    getProducts(at = new Date()) { return products.map((product) => exposedProduct(product, at)); },
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
    createPickupOrder({ telegramUserId, lines, note }) {
      const summary = cartSummary(lines, products);
      for (const item of summary.items) products.find((product) => product.id === item.productId).stock -= item.quantity;
      const order = {
        id: `AFM-${String(orders.length + 1).padStart(5, '0')}`,
        telegramUserId: String(telegramUserId),
        type: 'pickup', fulfillmentStatus: 'placed', paymentStatus: 'pending', paymentMethod: 'cash',
        items: summary.items, subtotal: summary.subtotal, deliveryFee: 0, total: summary.subtotal,
        note: note?.trim() || null, createdAt: new Date().toISOString()
      };
      orders.unshift(order);
      return order;
    },
    listOrdersFor(telegramUserId) { return orders.filter((order) => order.telegramUserId === String(telegramUserId)); },
    listAllOrders() { return orders; }
  };
}
