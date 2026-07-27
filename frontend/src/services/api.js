import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/** Pulls the useful sentence out of an axios error, whatever shape it arrived in. */
export function errorMessage(error, fallback = 'Something went wrong.') {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.msg ||
    error?.message ||
    fallback
  );
}

/**
 * Endpoint wrappers so pages never hand-write URLs — one place to look when
 * something moves.
 */
export const monitorApi = {
  list: (params) => api.get('/monitor', { params }).then((r) => r.data),
  get: (id) => api.get(`/monitor/${id}`).then((r) => r.data),
  create: (body) => api.post('/monitor', body).then((r) => r.data),
  update: (id, body) => api.patch(`/monitor/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`/monitor/${id}`).then((r) => r.data),
  checkNow: (id) => api.post(`/monitor/${id}/check`).then((r) => r.data),
  opsSummary: () => api.get('/monitor/ops/summary').then((r) => r.data),
  policy: () => api.get('/monitor/policy').then((r) => r.data),
};

export const incidentApi = {
  list: (params) => api.get('/incidents', { params }).then((r) => r.data),
  get: (id) => api.get(`/incidents/${id}`).then((r) => r.data),
  acknowledge: (id, note) => api.post(`/incidents/${id}/acknowledge`, { note }).then((r) => r.data),
  resolve: (id, resolution) => api.post(`/incidents/${id}/resolve`, { resolution }).then((r) => r.data),
  renotify: (id) => api.post(`/incidents/${id}/renotify`).then((r) => r.data),
};

export const settingsApi = {
  get: () => api.get('/settings/alerts').then((r) => r.data),
  update: (body) => api.put('/settings/alerts', body).then((r) => r.data),
  test: (severity) => api.post('/settings/alerts/test', { severity }).then((r) => r.data),
};

export const predictApi = {
  run: (flightData) => api.post('/predict', flightData).then((r) => r.data),
  history: () => api.get('/predict/history').then((r) => r.data),
};

export default api;
