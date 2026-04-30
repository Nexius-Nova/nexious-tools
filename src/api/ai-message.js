import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
})

export const aiMessageApi = {
  getAll: () => api.get('/ai-messages/all'),
  getConversations: () => api.get('/ai-messages/conversations'),
  getConversation: (conversationId) => api.get(`/ai-messages/conversations/${conversationId}`),
  saveMessage: (data) => api.post('/ai-messages/messages', data),
  deleteConversation: (conversationId) => api.delete(`/ai-messages/conversations/${conversationId}`),
  updateConversationTitle: (conversationId, title) => api.put(`/ai-messages/conversations/${conversationId}/title`, { title }),
  clearAll: () => api.delete('/ai-messages/clear/all')
}
