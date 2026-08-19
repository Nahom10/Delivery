import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryFee, haversineKm, pointInPolygon, zoneAvailability } from '../src/delivery-fee.js';

const rules = { baseFee: 30, includedKm: 2, perKmRate: 8, freeDeliveryThreshold: 500, freeDeliveryMaxKm: 5, maxServiceKm: 10, currency: 'ETB' };

test('uses the configured base fee, then charges only beyond included kilometers', () => {
  assert.equal(deliveryFee({ distanceKm: 1.8, subtotal: 100, rules }).fee, 30);
  assert.equal(deliveryFee({ distanceKm: 4.25, subtotal: 100, rules }).fee, 48);
});

test('applies free delivery only when both basket and distance conditions match', () => {
  assert.equal(deliveryFee({ distanceKm: 4.9, subtotal: 500, rules }).fee, 0);
  assert.equal(deliveryFee({ distanceKm: 5.1, subtotal: 500, rules }).fee, 55);
  assert.equal(deliveryFee({ distanceKm: 10.01, subtotal: 500, rules }).available, false);
});

test('calculates geographic distance and honors an exclusion polygon', () => {
  const distance = haversineKm({ lat: 9.03, lng: 38.74 }, { lat: 9.04, lng: 38.74 });
  assert.ok(distance > 1 && distance < 1.2);
  const polygon = [{ lat: 9, lng: 38 }, { lat: 10, lng: 38 }, { lat: 10, lng: 39 }, { lat: 9, lng: 39 }];
  assert.equal(pointInPolygon({ lat: 9.5, lng: 38.5 }, polygon), true);
  assert.equal(zoneAvailability({ lat: 9.5, lng: 38.5 }, [{ kind: 'exclusion', type: 'polygon', coordinates: polygon }]).available, false);
});
