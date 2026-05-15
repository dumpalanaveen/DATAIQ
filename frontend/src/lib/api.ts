import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/api/auth/refresh/`, { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login/', { email, password }),
  register: (data: any) => api.post('/auth/register/', data),
  logout: (refresh: string) => api.post('/auth/logout/', { refresh }),
  profile: () => api.get('/auth/profile/'),
  updateProfile: (data: any) => api.patch('/auth/profile/', data),
  dashboardStats: () => api.get('/auth/dashboard-stats/'),
  changePassword: (data: any) => api.post('/auth/change-password/', data),
};

export const datasetsApi = {
  list: (params?: any) => api.get('/datasets/', { params }),
  upload: (formData: FormData) => api.post('/datasets/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  detail: (id: string) => api.get(`/datasets/${id}/`),
  update: (id: string, data: any) => api.patch(`/datasets/${id}/`, data),
  delete: (id: string) => api.delete(`/datasets/${id}/`),
  status: (id: string) => api.get(`/datasets/${id}/status/`),
  reprocess: (id: string) => api.post(`/datasets/${id}/reprocess/`),
  columns: (id: string) => api.get(`/datasets/${id}/columns/`),
  query: (id: string, query: string) => api.post(`/datasets/${id}/query/`, { query }),
};

export const analysisApi = {
  profile: (datasetId: string) => api.get(`/analysis/${datasetId}/profile/`),
  visualizations: (datasetId: string) => api.get(`/analysis/${datasetId}/visualizations/`),
  jobs: (datasetId: string) => api.get(`/analysis/${datasetId}/jobs/`),
  nlQuery: (datasetId: string, question: string) => api.post(`/analysis/${datasetId}/nl-query/`, { question }),
  pinViz: (vizId: string) => api.post(`/analysis/viz/${vizId}/pin/`),
};

export const insightsApi = {
  list: (datasetId: string) => api.get(`/insights/${datasetId}/`),
  regenerate: (datasetId: string) => api.post(`/insights/${datasetId}/regenerate/`),
  dismiss: (insightId: string) => api.post(`/insights/dismiss/${insightId}/`),
  mlRecommendations: (datasetId: string) => api.get(`/insights/${datasetId}/ml/`),
};

export const reportsApi = {
  generate: (datasetId: string, options: any) => api.post(`/reports/${datasetId}/generate/`, options),
  status: (reportId: string) => api.get(`/reports/${reportId}/status/`),
  download: (reportId: string) => `${API_URL}/api/reports/${reportId}/download/`,
};
