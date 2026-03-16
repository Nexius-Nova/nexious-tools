import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/clipboard'

export const clipboardApi = {
  getAll: (params = {}) => axios.get(API_BASE, { params }),
  
  getById: (id) => axios.get(`${API_BASE}/${id}`),
  
  create: (data) => axios.post(API_BASE, data),
  
  update: (id, data) => axios.put(`${API_BASE}/${id}`, data),
  
  delete: (id) => axios.delete(`${API_BASE}/${id}`),
  
  clearAll: () => axios.delete(API_BASE)
}
