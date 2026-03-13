import api from './index'

export const settingsApi = {
  getAll: () => api.get('/settings'),
  
  get: (key) => api.get(`/settings/${key}`),
  
  set: (key, value) => api.put(`/settings/${key}`, { value }),
  
  delete: (key) => api.delete(`/settings/${key}`),
  
  testApiKey: (provider, apiKey) => api.post('/settings/test-api-key', { provider, apiKey })
}
