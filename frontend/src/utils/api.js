import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const jobsAPI = {
  getAll: () => api.get('/jobs'),
  getDiscoverJobs: () => api.get('/jobs?discover=true'),
  getById: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  requestAccess: (id) => api.post(`/jobs/${id}/request-access`),
  approveAccess: (id, targetUserId) => api.post(`/jobs/${id}/approve-access`, { targetUserId }),
  declineAccess: (id, targetUserId) => api.post(`/jobs/${id}/decline-access`, { targetUserId }),
  removeCollaborator: (id, targetUserId) => api.post(`/jobs/${id}/remove-collaborator`, { targetUserId }),
};

export const candidatesAPI = {
  getAll: (params) => api.get('/candidates', { params }),
  getById: (id) => api.get(`/candidates/${id}`),
  create: (data) => api.post('/candidates', data),
  update: (id, data) => api.put(`/candidates/${id}`, data),
  updateStatus: (id, status) => api.patch(`/candidates/${id}/status`, { status }),
  delete: (id) => api.delete(`/candidates/${id}`),
  parseResume: (formData) => api.post('/candidates/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getTimeline: (id) => api.get(`/candidates/${id}/timeline`),
  addComment: (id, text) => api.post(`/candidates/${id}/comments`, { text }),
  deleteComment: (id, commentId) => api.delete(`/candidates/${id}/comments/${commentId}`),
  getPortalApplications: () => api.get('/candidates/portal/applications'),
  portalApply: (jobId, formData) => api.post(`/candidates/portal/apply/${jobId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
};

export const publicAPI = {
  getJobs: () => api.get('/public/jobs'),
  getJobDetails: (id) => api.get(`/public/jobs/${id}`),
  apply: (jobId, formData) => api.post(`/public/jobs/${jobId}/apply`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export default api;
