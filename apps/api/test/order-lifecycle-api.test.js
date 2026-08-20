import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { createDevelopmentRepository } from '../src/repository.js';

async function withServer(run) {
  const repository = createDevelopmentRepository();
  const config = { webOrigin: 'http://localhost:3000', jwtSecret: 'test-secret', botToken: '', miniAppUrl: '', telegramWebhookSecret: '', isProduction: false, openRouteServiceKey: '' };
  const server = createApp({ repository, config }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

async function developmentSession(baseUrl, role = '') {
  const response = await fetch(`${baseUrl}/api/auth/development${role ? `/${role}` : ''}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 200);
  return response.json();
}

async function request(baseUrl, path, token, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...options.headers }
  });
}

test('enforces staff/rider lifecycle permissions and proof before delivery completion', async () => {
  await withServer(async (baseUrl) => {
    const customer = await developmentSession(baseUrl);
    const staff = await developmentSession(baseUrl, 'staff');
    const rider = await developmentSession(baseUrl, 'rider');
    const addressResponse = await request(baseUrl, '/api/addresses', customer.token, { method: 'POST', body: JSON.stringify({ label: 'Home', lat: 9.03, lng: 38.74, street: 'Market Street', area: 'Addis Ababa' }) });
    const address = (await addressResponse.json()).address;
    const checkoutResponse = await request(baseUrl, '/api/orders', customer.token, { method: 'POST', body: JSON.stringify({ orderType: 'delivery', paymentMethod: 'cash', addressId: address.id, lines: [{ productId: 'tomatoes', quantity: 1 }] }) });
    const order = (await checkoutResponse.json()).order;

    const assignment = await request(baseUrl, `/api/staff/orders/${order.id}/assign-rider`, staff.token, { method: 'POST', body: JSON.stringify({ riderId: rider.user.telegramUserId }) });
    assert.equal(assignment.status, 200);
    for (const status of ['confirmed', 'preparing']) {
      const update = await request(baseUrl, `/api/orders/${order.id}/status`, staff.token, { method: 'PATCH', body: JSON.stringify({ status }) });
      assert.equal(update.status, 200);
    }
    const staffCannotDispatch = await request(baseUrl, `/api/orders/${order.id}/status`, staff.token, { method: 'PATCH', body: JSON.stringify({ status: 'out_for_delivery' }) });
    assert.equal(staffCannotDispatch.status, 403);
    const riderLocation = await request(baseUrl, '/api/rider/location', rider.token, { method: 'PATCH', body: JSON.stringify({ lat: 9.035, lng: 38.745 }) });
    assert.equal(riderLocation.status, 200);
    const dispatched = await request(baseUrl, `/api/orders/${order.id}/status`, rider.token, { method: 'PATCH', body: JSON.stringify({ status: 'out_for_delivery' }) });
    assert.equal(dispatched.status, 200);
    const noProof = await request(baseUrl, `/api/orders/${order.id}/status`, rider.token, { method: 'PATCH', body: JSON.stringify({ status: 'delivered' }) });
    assert.equal(noProof.status, 422);
    const proof = await request(baseUrl, `/api/rider/orders/${order.id}/proof`, rider.token, { method: 'POST', body: JSON.stringify({ customerName: 'Mekdes A.' }) });
    assert.equal(proof.status, 200);
    const delivered = await request(baseUrl, `/api/orders/${order.id}/status`, rider.token, { method: 'PATCH', body: JSON.stringify({ status: 'delivered' }) });
    const completedOrder = (await delivered.json()).order;
    assert.equal(completedOrder.fulfillmentStatus, 'delivered');
    assert.equal(completedOrder.proofOfDelivery.customerName, 'Mekdes A.');
    const tracking = await request(baseUrl, `/api/orders/${order.id}/tracking`, customer.token);
    const trackingData = await tracking.json();
    assert.equal(trackingData.riderLocation.lat, 9.035);
    assert.deepEqual(completedOrder.statusHistory.filter((event) => event.eventType !== 'rider_assigned').map((event) => event.to).filter(Boolean), ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered']);
  });
});
