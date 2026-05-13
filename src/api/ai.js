import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

export const aiApi = {
  chat: (data) => api.post('/ai/chat', data),
  getContext: () => api.get('/ai/context'),
  formatDocument: (data) => api.post('/ai/format-document', data),
  importUrl: (data) => api.post('/ai/import-url', data),
  generateImage: (data) => api.post('/ai/generate-image', data),
  generateVideo: (data) => api.post('/ai/generate-video', data)
}
