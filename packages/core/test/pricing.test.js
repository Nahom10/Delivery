import test from 'node:test';
import assert from 'node:assert/strict';
import { activeDiscount, cartSummary, priceFor } from '../src/pricing.js';

const product = {
  id: 'tomatoes', name: 'Tomatoes', price: 100, stock: 8, active: true, unit: 'kg',
  discount: { active: true, kind: 'percentage', value: 20, startsAt: '2026-08-19T00:00:00.000Z', endsAt: '2026-08-20T00:00:00.000Z' }
};

test('only returns a scheduled discount while it is active', () => {
  assert.equal(activeDiscount(product, new Date('2026-08-18T23:59:59Z')), null);
  assert.equal(priceFor(product, new Date('2026-08-19T12:00:00Z')).current, 80);
  assert.equal(activeDiscount(product, new Date('2026-08-20T00:00:00Z')), null);
});

test('calculates a cart with discounted server-side prices', () => {
  const summary = cartSummary([{ productId: 'tomatoes', quantity: 2 }], [product], new Date('2026-08-19T12:00:00Z'));
  assert.equal(summary.subtotal, 160);
  assert.deepEqual(summary.items[0], { productId: 'tomatoes', name: 'Tomatoes', quantity: 2, unit: 'kg', unitPrice: 80, lineTotal: 160 });
});

test('rejects a quantity above stock', () => {
  assert.throws(() => cartSummary([{ productId: 'tomatoes', quantity: 9 }], [product]), /insufficient stock/);
});
