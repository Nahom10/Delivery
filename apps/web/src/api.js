const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  authenticateTelegram: (initData) => request('/api/auth/telegram', { method: 'POST', body: JSON.stringify({ initData }) }),
  authenticateDevelopment: () => request('/api/auth/development', { method: 'POST', body: '{}' }),
  checkout: (token, payload) => request('/api/orders', { token, method: 'POST', body: JSON.stringify(payload) })
};
