import test from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, canTransition, displayStatus, orderStatuses } from '../src/order-lifecycle.js';

test('allows each delivery lifecycle step but not skipped statuses', () => {
  assert.equal(canTransition('delivery', 'placed', 'confirmed'), true);
  assert.equal(canTransition('delivery', 'preparing', 'out_for_delivery'), true);
  assert.equal(canTransition('delivery', 'out_for_delivery', 'delivered'), true);
  assert.equal(canTransition('delivery', 'placed', 'delivered'), false);
});

test('keeps pickup and delivery fulfillment paths distinct', () => {
  assert.equal(canTransition('pickup', 'preparing', 'ready_for_pickup'), true);
  assert.equal(canTransition('pickup', 'preparing', 'out_for_delivery'), false);
  assert.equal(canTransition('delivery', 'preparing', 'ready_for_pickup'), false);
});

test('allows cancellation/refund before fulfillment only', () => {
  assert.equal(canTransition('delivery', 'preparing', 'cancelled'), true);
  assert.equal(canTransition('pickup', 'ready_for_pickup', 'refunded'), true);
  assert.equal(canTransition('delivery', 'delivered', 'refunded'), false);
  assert.throws(() => assertTransition('pickup', 'placed', 'collected'), /Cannot move/);
  assert.deepEqual(orderStatuses('pickup').slice(-2), ['cancelled', 'refunded']);
  assert.equal(displayStatus('out_for_delivery'), 'Out For Delivery');
});
