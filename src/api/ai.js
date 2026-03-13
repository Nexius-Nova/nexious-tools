import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

export const aiApi = {
  chat: (data) => api.post('/ai/chat', data),
  getContext: () => api.get('/ai/context')
}
