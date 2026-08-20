// Empty means same-origin: Vercel serves the Mini App and /api functions from one deployment.
// Set NEXT_PUBLIC_API_URL only when deliberately deploying the backend to a different origin.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...options.headers },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
  return data;
}

export const api = {
  storefront: () => request('/api/storefront'),
  promotionEvent: (promotionId, type, anonymousId) => request(`/api/promotions/${promotionId}/events`, { method: 'POST', body: JSON.stringify({ type, anonymousId }) }),
  authenticateTelegram: (initData) => request('/api/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }),
  authenticateDevelopment: (role = '') => request(`/api/auth/development${role ? `/${role}` : ''}`, { method: 'POST', body: '{}' }),
  checkout: (token, payload) => request('/api/orders', { token, method: 'POST', body: JSON.stringify(payload) }),
  paymentStatus: (token, orderId) => request(`/api/orders/${orderId}/payment`, { token }),
  completeSandboxPayment: (token, paymentId) => request(`/api/payments/telebirr/sandbox/${paymentId}/complete`, { token, method: 'POST', body: '{}' }),
  deliveryConfig: () => request('/api/delivery/config'),
  deliveryQuote: (payload) => request('/api/delivery/quote', { method: 'POST', body: JSON.stringify(payload) }),
  reverseGeocode: (lat, lng) => request('/api/geocode/reverse', { method: 'POST', body: JSON.stringify({ lat, lng }) }),
  addresses: (token) => request('/api/addresses', { token }),
  saveAddress: (token, address) => request('/api/addresses', { token, method: 'POST', body: JSON.stringify(address) }),
  myOrders: (token) => request('/api/orders/me', { token }),
  tracking: (token, orderId) => request(`/api/orders/${orderId}/tracking`, { token }),
  staffOrders: (token) => request('/api/staff/orders', { token }),
  staffRiders: (token) => request('/api/staff/riders', { token }),
  assignRider: (token, orderId, riderId) => request(`/api/staff/orders/${orderId}/assign-rider`, { token, method: 'POST', body: JSON.stringify({ riderId }) }),
  changeOrderStatus: (token, orderId, status) => request(`/api/orders/${orderId}/status`, { token, method: 'PATCH', body: JSON.stringify({ status }) }),
  riderOrders: (token) => request('/api/rider/orders', { token }),
  publishRiderLocation: (token, location) => request('/api/rider/location', { token, method: 'PATCH', body: JSON.stringify(location) }),
  deliveryProof: (token, orderId, proof) => request(`/api/rider/orders/${orderId}/proof`, { token, method: 'POST', body: JSON.stringify(proof) }),
  adminReport: (token, period) => request(`/api/admin/reports?period=${encodeURIComponent(period)}`, { token }),
  adminReportCsvUrl: (period) => `/api/admin/reports.csv?period=${encodeURIComponent(period)}`
};
