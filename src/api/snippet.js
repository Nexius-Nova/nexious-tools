import api from './index'

export const snippetApi = {
  getAll: () => api.get('/snippets'),
  
  getCategories: () => api.get('/snippets/categories'),
  
  getTags: () => api.get('/snippets/tags'),
  
  createCategory: (name) => api.post('/snippets/categories', { name }),
  
  updateCategory: (id, name) => api.put(`/snippets/categories/${id}`, { name }),
  
  deleteCategory: (id) => api.delete(`/snippets/categories/${id}`),
  
  getByCategory: (category) => api.get(`/snippets/category/${category}`),
  
  getById: (id) => api.get(`/snippets/${id}`),
  
  create: (data) => api.post('/snippets', data),
  
  update: (id, data) => api.put(`/snippets/${id}`, data),
  
  delete: (id) => api.delete(`/snippets/${id}`),
  
  search: (query, useRegex = false) => api.get('/snippets/search', { params: { q: query, regex: useRegex } }),
  
  getByTag: (tag) => api.get(`/snippets/tag/${tag}`),
  
  togglePin: (id, pinned) => api.put(`/snippets/${id}`, { pinned }),
  
  clearAll: () => api.delete('/snippets/clear/all')
}
