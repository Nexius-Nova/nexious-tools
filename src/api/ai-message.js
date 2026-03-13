import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

export const aiMessageApi = {
  getConversations: () => api.get('/ai-messages/conversations'),
  getConversation: (conversationId) => api.get(`/ai-messages/conversations/${conversationId}`),
  saveMessage: (data) => api.post('/ai-messages/messages', data),
  deleteConversation: (conversationId) => api.delete(`/ai-messages/conversations/${conversationId}`)
}
