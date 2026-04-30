import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
})

export const promptTemplateApi = {
  getAll: () => api.get('/prompt-templates'),
  getCategories: () => api.get('/prompt-templates/categories'),
  getById: (id) => api.get(`/prompt-templates/${id}`),
  create: (data) => api.post('/prompt-templates', data),
  update: (id, data) => api.put(`/prompt-templates/${id}`, data),
  delete: (id) => api.delete(`/prompt-templates/${id}`),
  clearAll: () => api.delete('/prompt-templates/clear/all')
}
