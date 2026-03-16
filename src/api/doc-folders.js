import axios from 'axios'

const API_BASE = 'http://localhost:3000/api/doc-folders'

export const docFolderApi = {
  getTree: () => axios.get(API_BASE),
  
  getFlat: () => axios.get(`${API_BASE}/flat`),
  
  getById: (id) => axios.get(`${API_BASE}/${id}`),
  
  create: (data) => axios.post(API_BASE, data),
  
  update: (id, data) => axios.put(`${API_BASE}/${id}`, data),
  
  delete: (id) => axios.delete(`${API_BASE}/${id}`)
}
