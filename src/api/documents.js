import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/documents'

export const documentApi = {
  getAll: (params = {}) => axios.get(API_BASE, { params }),
  
  getById: (id) => axios.get(`${API_BASE}/${id}`),
  
  create: (data) => axios.post(API_BASE, data),
  
  update: (id, data) => axios.put(`${API_BASE}/${id}`, data),
  
  delete: (id) => axios.delete(`${API_BASE}/${id}`),
  
  search: (query) => axios.get(API_BASE, { params: { search: query } })
}
