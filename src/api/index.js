import axios from 'axios'

const isDev = import.meta.env.DEV

const api = axios.create({
  baseURL: isDev ? '/api' : 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export default api
