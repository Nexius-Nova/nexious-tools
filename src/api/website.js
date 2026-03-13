import api from './index'

export const websiteApi = {
  getAll: () => api.get('/websites'),
  
  getById: (id) => api.get(`/websites/${id}`),
  
  create: (data) => api.post('/websites', data),
  
  update: (id, data) => api.put(`/websites/${id}`, data),
  
  delete: (id) => api.delete(`/websites/${id}`),
  
  search: (query) => api.get('/websites/search', { params: { q: query } }),
  
  generateDescription: (url) => api.post('/websites/generate-description', { url }),
  
  generateSearchUrl: (url) => api.post('/websites/generate-search-url', { url }),
  
  getFavicon: (url) => api.get('/websites/favicon', { params: { url, _t: Date.now() } }),
  
  filterApps: (apps) => api.post('/websites/filter-apps', { apps })
}
