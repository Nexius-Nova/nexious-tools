import api from './index'

export const passwordApi = {
  getAll: () => api.get('/passwords'),
  
  getByWebsite: (websiteId) => api.get(`/passwords/website/${websiteId}`),
  
  create: (data) => api.post('/passwords', data),
  
  update: (id, data) => api.put(`/passwords/${id}`, data),
  
  delete: (id) => api.delete(`/passwords/${id}`),
  
  clearAll: () => api.delete('/passwords/clear/all')
}
