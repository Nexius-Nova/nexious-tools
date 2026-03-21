import api from './index'

export const aiModelsApi = {
  getAll: () => api.get('/ai-models'),
  
  getById: (id) => api.get(`/ai-models/${id}`),
  
  create: (data) => api.post('/ai-models', data),
  
  update: (id, data) => api.put(`/ai-models/${id}`, data),
  
  delete: (id) => api.delete(`/ai-models/${id}`),
  
  setDefault: (id) => api.post(`/ai-models/${id}/set-default`),
  
  toggle: (id) => api.post(`/ai-models/${id}/toggle`),
  
  test: (data) => api.post('/ai-models/test', data),
  
  clearAll: () => api.delete('/ai-models/clear/all')
}
