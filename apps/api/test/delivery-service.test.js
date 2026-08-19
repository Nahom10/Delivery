import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeliveryService } from '../src/delivery-service.js';

const rules = { baseFee: 30, includedKm: 2, perKmRate: 8, freeDeliveryThreshold: 500, freeDeliveryMaxKm: 5, maxServiceKm: 12, currency: 'ETB' };
const origin = { lat: 9.03, lng: 38.74 };
const destination = { lat: 9.04, lng: 38.75 };

test('prefers a configured OpenRouteService distance over the fallback', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({ routes: [{ summary: { distance: 4250 } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  const service = createDeliveryService({ openRouteServiceKey: 'test-key', fetchImpl });
  const quote = await service.quote({ origin, destination, subtotal: 100, rules, zones: [] });
  assert.equal(quote.source, 'openrouteservice');
  assert.equal(quote.distanceKm, 4.25);
  assert.equal(quote.fee, 48);
});

test('uses the padded Haversine estimate when no routing key exists', async () => {
  const service = createDeliveryService();
  const quote = await service.quote({ origin, destination, subtotal: 100, rules, zones: [] });
  assert.equal(quote.source, 'haversine_x_1.3');
  assert.ok(quote.distanceKm > 1);
});
