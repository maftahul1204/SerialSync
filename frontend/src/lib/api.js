const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const authApi = {
  register: (payload) => api('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => api('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  me: () => api('/api/auth/me'),
  forgotPassword: (email) => api('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => api('/api/auth/reset-password', { method: 'POST', body: payload }),
};

export const userApi = {
  getProfile: () => api('/api/users/me'),
  updateProfile: (payload) => api('/api/users/me', { method: 'PATCH', body: payload }),
};
