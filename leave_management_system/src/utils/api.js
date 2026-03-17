import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  getAll: () => api.get('/users'),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getBalances: (id, year) => api.get(`/users/${id}/balances`, { params: { year } }),
};

export const leavesApi = {
  getAll: (params) => api.get('/leaves', { params }),
  getOne: (id) => api.get(`/leaves/${id}`),
  create: (data) => api.post('/leaves', data),
  review: (id, data) => api.post(`/leaves/${id}/review`, data),
  cancel: (id) => api.delete(`/leaves/${id}`),
};

export const dashboardApi = {
  get: () => api.get('/dashboard'),
};

export default api;