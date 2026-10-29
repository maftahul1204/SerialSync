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

async function apiUpload(path, formData) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'POST', credentials: 'include', body: formData });
  } catch {
    const err = new Error(`Cannot reach the API at ${API_BASE}.`);
    err.status = 0;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Upload failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

function qs(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, v);
  });
  const text = q.toString();
  return text ? `?${text}` : '';
}

export const authApi = {
  register: (payload) => api('/api/auth/register', { method: 'POST', body: payload }),
  registerDoctor: (formData) => apiUpload('/api/auth/register', formData),
  login: (payload) => api('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  me: () => api('/api/auth/me'),
  forgotPassword: (email) => api('/api/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (payload) => api('/api/auth/reset-password', { method: 'POST', body: payload }),
};

export const userApi = {
  getProfile: () => api('/api/users/me'),
  updateProfile: (payload) => api('/api/users/me', { method: 'PATCH', body: payload }),
  uploadDocuments: (formData) => apiUpload('/api/users/me/documents', formData),
  documentUrl: (docId) => `${API_BASE}/api/users/me/documents/${docId}`,
};

export const adminApi = {
  getDoctor: (id) => api(`/api/admin/doctors/${id}`),
  documentUrl: (path) => `${API_BASE}${path}`,
  audit: (params) => api(`/api/admin/audit${qs(params)}`),
  listDoctors: (status = 'pending') => api(`/api/admin/doctors?status=${encodeURIComponent(status)}`),
  setDoctorApproval: (id, status, note) =>
    api(`/api/admin/doctors/${id}/approval`, { method: 'PATCH', body: note ? { status, note } : { status } }),
};

export const appointmentsApi = {
  listMine: (status) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return api(`/api/appointments/me${qs}`);
  },
  get: (id) => api(`/api/appointments/${id}`),
  getQr: (id) => api(`/api/appointments/${id}/qr`),
  cancel: (id, reason) => api(`/api/appointments/${id}/cancel`, { method: 'POST', body: reason ? { reason } : undefined }),
  setStatus: (id, status, reason) =>
    api(`/api/appointments/${id}/status`, { method: 'PATCH', body: reason ? { status, reason } : { status } }),
  doctorDay: (date) => api(`/api/appointments/doctor/day${qs({ date })}`),
  doctorSummary: (date) => api(`/api/appointments/doctor/summary${qs({ date })}`),
};

export const queueApi = {
  myToday: () => api('/api/queue/me/today'),
  getSession: (id) => api(`/api/queue/sessions/${id}`),
  openSession: (payload) => api('/api/queue/sessions', { method: 'POST', body: payload }),
  advance: (id) => api(`/api/queue/sessions/${id}/advance`, { method: 'POST' }),
  walkIn: (id, payload) => api(`/api/queue/sessions/${id}/walk-in`, { method: 'POST', body: payload }),
  noShow: (id, bookingId) =>
    api(`/api/queue/sessions/${id}/no-show`, { method: 'POST', body: { bookingId } }),
  undo: (id) => api(`/api/queue/sessions/${id}/undo`, { method: 'POST' }),
  delay: (id, payload) => api(`/api/queue/sessions/${id}/delay`, { method: 'POST', body: payload }),
  pause: (id, payload) => api(`/api/queue/sessions/${id}/pause`, { method: 'POST', body: payload }),
};

export const diagnosticsApi = {
  listTests: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.category) qs.set('category', params.category);
    const q = qs.toString();
    return api(`/api/diagnostics/tests${q ? `?${q}` : ''}`);
  },
  listPackages: () => api('/api/diagnostics/packages'),
  listCenters: (params) => api(`/api/diagnostics/centers${qs(params)}`),
  getCenter: (id) => api(`/api/diagnostics/centers/${id}`),
  createCenter: (payload) => api('/api/diagnostics/centers', { method: 'POST', body: payload }),
  updateCenter: (id, payload) => api(`/api/diagnostics/centers/${id}`, { method: 'PATCH', body: payload }),
  trends: (code) => api(`/api/diagnostics/trends${qs({ code })}`),
  listAllOrders: (params) => api(`/api/diagnostics/orders${qs(params)}`),
  createTest: (payload) => api('/api/diagnostics/tests', { method: 'POST', body: payload }),
  updateTest: (id, payload) => api(`/api/diagnostics/tests/${id}`, { method: 'PATCH', body: payload }),
  uploadReport: (id, file, results) => {
    const form = new FormData();
    form.append('report', file);
    if (results?.length) form.append('results', JSON.stringify(results));
    return apiUpload(`/api/diagnostics/orders/${id}/report`, form);
  },
  createOrder: (payload) => api('/api/diagnostics/orders', { method: 'POST', body: payload }),
  listMyOrders: () => api('/api/diagnostics/orders/me'),
  assignedOrders: () => api('/api/diagnostics/orders/assigned'),
  getOrder: (id) => api(`/api/diagnostics/orders/${id}`),
  updateStatus: (id, payload) =>
    api(`/api/diagnostics/orders/${id}/status`, { method: 'PATCH', body: payload }),
  shareDoctor: (id, doctorId) =>
    api(`/api/diagnostics/orders/${id}/share-doctor`, { method: 'POST', body: { doctorId } }),
  downloadUrl: (id, token) => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';
    return `${base}/api/diagnostics/orders/${id}/download?token=${encodeURIComponent(token)}`;
  },
};

export const doctorsApi = {
  getProfile: (doctorId) => api(`/api/doctors/${doctorId}`),
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
  cancelDay: (id, payload) => api(`/api/schedules/${id}/cancel-day`, { method: 'POST', body: payload }),
  reopenDay: (id, date) => api(`/api/schedules/${id}/closed-dates/${date}`, { method: 'DELETE' }),
  setScheduleStatus: (id, status) =>
    api(`/api/schedules/${id}/status`, { method: 'PATCH', body: { status } }),
  listChambers: () => api('/api/chambers'),
  listChamberDirectory: () => api('/api/chambers/directory'),
  createChamber: (payload) => api('/api/chambers', { method: 'POST', body: payload }),
  getDoctorSchedule: (doctorId) => api(`/api/schedules/doctors/${doctorId}`),
  getDoctorSlots: (doctorId, from, to) =>
    api(`/api/schedules/doctors/${doctorId}/slots?from=${from}&to=${to}`),
  bookSlot: (payload) => api('/api/schedules/slots/book', { method: 'POST', body: payload }),
};

export const notificationsApi = {
  list: (params) => api(`/api/notifications${qs(params)}`),
  markRead: (id) => api(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => api('/api/notifications/read-all', { method: 'POST' }),
};

export const familyApi = {
  list: () => api('/api/family'),
  create: (payload) => api('/api/family', { method: 'POST', body: payload }),
  update: (id, payload) => api(`/api/family/${id}`, { method: 'PATCH', body: payload }),
  remove: (id) => api(`/api/family/${id}`, { method: 'DELETE' }),
};
