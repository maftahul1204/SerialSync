const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

async function api(path, { method = 'GET', body, headers = {} } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error(
      `Cannot reach the API at ${API_BASE}. Start the backend (cd backend && npm run dev) and ensure NEXT_PUBLIC_API_URL matches its port.`
    );
    err.status = 0;
    throw err;
  }

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

export const adminApi = {
  listDoctors: (status = 'pending') => api(`/api/admin/doctors?status=${encodeURIComponent(status)}`),
  setDoctorApproval: (id, status) =>
    api(`/api/admin/doctors/${id}/approval`, { method: 'PATCH', body: { status } }),
};

export const doctorsApi = {
  search: ({ search = '', area = 'all', specialty = 'all' } = {}) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (area && area !== 'all') params.set('area', area);
    if (specialty && specialty !== 'all') params.set('specialty', specialty);
    const qs = params.toString();
    return api(`/api/doctors${qs ? `?${qs}` : ''}`);
  },
};

export const scheduleApi = {
  listMySchedules: () => api('/api/schedules/me'),
  createSchedule: (payload) => api('/api/schedules', { method: 'POST', body: payload }),
  updateSchedule: (id, payload) => api(`/api/schedules/${id}`, { method: 'PATCH', body: payload }),
  deleteSchedule: (id) => api(`/api/schedules/${id}`, { method: 'DELETE' }),
  setScheduleStatus: (id, status) =>
    api(`/api/schedules/${id}/status`, { method: 'PATCH', body: { status } }),
  listChambers: () => api('/api/chambers'),
  createChamber: (payload) => api('/api/chambers', { method: 'POST', body: payload }),
  getDoctorSchedule: (doctorId) => api(`/api/schedules/doctors/${doctorId}`),
  getDoctorSlots: (doctorId, from, to) =>
    api(`/api/schedules/doctors/${doctorId}/slots?from=${from}&to=${to}`),
  bookSlot: (payload) => api('/api/schedules/slots/book', { method: 'POST', body: payload }),
};
