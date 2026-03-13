<template>
  <div class="ai-chat-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <n-button type="primary" block @click="startNewConversation">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          新对话
        </n-button>
      </div>
      <div class="sidebar-content">
        <n-scrollbar>
          <div class="conversation-list">
            <div
              v-for="conv in conversations"
              :key="conv.conversation_id"
              :class="['conversation-item', { active: currentConversationId === conv.conversation_id }]"
              @click="loadConversation(conv.conversation_id)"
            >
              <div class="conversation-icon">
                <n-icon size="16"><ChatbubblesOutline /></n-icon>
              </div>
              <div class="conversation-info">
                <div class="conversation-title">
                  {{ conv.first_message?.substring(0, 20) || '新对话' }}{{ conv.first_message?.length > 20 ? '...' : '' }}
                </div>
                <div class="conversation-date">{{ formatDateShort(conv.started_at) }}</div>
              </div>
              <n-button
                text
                size="tiny"
                class="delete-btn"
                @click.stop="deleteConversation(conv.conversation_id)"
              >
                <template #icon>
                  <n-icon size="14"><TrashOutline /></n-icon>
                </template>
              </n-button>
            </div>
            <n-empty v-if="conversations.length === 0" description="暂无历史对话" size="small" />
          </div>
        </n-scrollbar>
      </div>
    </div>

    <div class="chat-main">
      <div class="chat-header">
        <div class="header-title">
          <div class="ai-icon">
            <n-icon size="20"><SparklesOutline /></n-icon>
          </div>
          <n-h2>AI 对话</n-h2>
        </div>
        <n-button @click="showReferenceModal = true">
          <template #icon>
            <n-icon><LinkOutline /></n-icon>
          </template>
          引用数据
        </n-button>
      </div>

      <div class="chat-container" ref="chatContainer">
        <div class="messages-wrapper">
          <div v-if="messages.length === 0" class="empty-chat">
            <div class="empty-icon">
              <n-icon size="64"><SparklesOutline /></n-icon>
            </div>
            <n-text depth="2" style="font-size: 18px; font-weight: 500;">开始与 AI 对话</n-text>
            <n-text depth="3" style="font-size: 13px;">
              AI 可以访问您的网站、密码、代码片段和设置数据
            </n-text>
          </div>

          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.role]"
          >
            <div class="message-avatar">
              <n-avatar v-if="msg.role === 'user'" round :size="36" style="background: var(--primary-color);">
                <n-icon><PersonOutline /></n-icon>
              </n-avatar>
              <n-avatar v-else round :size="36" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <n-icon><SparklesOutline /></n-icon>
              </n-avatar>
            </div>
            <div class="message-content">
              <div v-if="msg.references && msg.references.length > 0" class="user-references">
                <n-tag v-for="ref in msg.references" :key="ref.id" size="small" round :type="getRefTagType(ref.type)">
                  {{ ref.type }}: {{ ref.name }}
                </n-tag>
              </div>
              <MessageContent :content="msg.content" />
              <div v-if="msg.role === 'assistant' && msg.aiReferences && msg.aiReferences.length > 0" class="message-references">
                <n-text depth="3" style="font-size: 11px;">引用数据：</n-text>
                <n-space size="small">
                  <n-tag v-for="ref in msg.aiReferences" :key="ref.id" size="small" round>
                    {{ ref.type }}: {{ ref.name }}
                  </n-tag>
                </n-space>
              </div>
              <div class="message-actions">
                <n-button text size="small" @click="quoteMessage(msg)">
                  <template #icon>
                    <n-icon><ChatboxOutline /></n-icon>
                  </template>
                  引用
                </n-button>
                <n-button text size="small" @click="copyMessage(msg.content)">
                  <template #icon>
                    <n-icon><CopyOutline /></n-icon>
                  </template>
                  复制
                </n-button>
              </div>
            </div>
          </div>

          <div v-if="loading" class="message assistant">
            <div class="message-avatar">
              <n-avatar round :size="36" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                <n-icon><SparklesOutline /></n-icon>
              </n-avatar>
            </div>
            <div class="message-content">
              <MessageContent :content="streamingContent" />
              <n-text v-if="!streamingContent" depth="3">
                <n-spin size="small" />
                <span style="margin-left: 8px;">思考中...</span>
              </n-text>
            </div>
          </div>
        </div>
      </div>

      <div class="input-area">
        <div v-if="selectedReferences.length > 0" class="selected-references">
          <n-tag
            v-for="ref in selectedReferences"
            :key="ref.id"
            closable
            size="small"
            round
            :type="getRefTagType(ref.type)"
            @close="removeReference(ref)"
          >
            {{ ref.type }}: {{ ref.name }}
          </n-tag>
        </div>
        <div class="input-row">
          <n-input
            v-model:value="inputMessage"
            type="textarea"
            placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
            :autosize="{ minRows: 1, maxRows: 4 }"
            @keydown="handleKeydown"
            :disabled="loading"
            clearable
          />
          <n-button
            type="primary"
            circle
            size="large"
            @click="sendMessage"
            :disabled="!inputMessage.trim() || loading"
            :loading="loading"
          >
            <template #icon>
              <n-icon><SendOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </div>

      <n-modal v-model:show="showReferenceModal" preset="card" title="引用数据" style="width: 700px;">
        <div class="reference-modal-content">
          <n-tabs v-model:value="activeTab" type="line" animated>
            <n-tab-pane name="websites" tab="网站">
              <n-input v-model:value="websiteSearch" placeholder="搜索网站..." clearable style="margin-bottom: 12px;">
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-scrollbar style="max-height: 320px;">
                <div class="reference-grid">
                  <div 
                    v-for="site in filteredWebsites" 
                    :key="site.id" 
                    class="reference-item"
                    @click="addReference({ type: '网站', id: site.id, name: site.name, data: site })"
                  >
                    <div class="reference-icon website">
                      <img 
                        v-if="site.favicon" 
                        :src="site.favicon" 
                        class="favicon-img"
                        @error="handleFaviconError"
                      />
                      <n-icon v-else size="20"><GlobeOutline /></n-icon>
                    </div>
                    <div class="reference-info">
                      <div class="reference-name">{{ site.name }}</div>
                      <div class="reference-desc">{{ truncateText(site.url, 35) }}</div>
                    </div>
                  </div>
                </div>
                <n-empty v-if="filteredWebsites.length === 0" description="暂无网站数据" size="small" />
              </n-scrollbar>
            </n-tab-pane>
            <n-tab-pane name="passwords" tab="密码">
              <n-input v-model:value="passwordSearch" placeholder="搜索密码..." clearable style="margin-bottom: 12px;">
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-scrollbar style="max-height: 320px;">
                <div class="reference-grid">
                  <div 
                    v-for="pwd in filteredPasswords" 
                    :key="pwd.id" 
                    class="reference-item"
                    @click="addReference({ type: '密码', id: pwd.id, name: pwd.title || pwd.website_name || pwd.username, data: pwd })"
                  >
                    <div class="reference-icon password">
                      <n-icon size="20"><KeyOutline /></n-icon>
                    </div>
                    <div class="reference-info">
                      <div class="reference-name">{{ pwd.title || pwd.website_name || '未命名' }}</div>
                      <div class="reference-desc">{{ pwd.username }}</div>
                    </div>
                  </div>
                </div>
                <n-empty v-if="filteredPasswords.length === 0" description="暂无密码数据" size="small" />
              </n-scrollbar>
            </n-tab-pane>
            <n-tab-pane name="snippets" tab="代码片段">
              <n-input v-model:value="snippetSearch" placeholder="搜索代码片段..." clearable style="margin-bottom: 12px;">
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-scrollbar style="max-height: 320px;">
                <div class="reference-grid">
                  <div 
                    v-for="snip in filteredSnippets" 
                    :key="snip.id" 
                    class="reference-item"
                    @click="addReference({ type: '代码', id: snip.id, name: snip.title, data: snip })"
                  >
                    <div class="reference-icon snippet">
                      <n-icon size="20"><CodeSlashOutline /></n-icon>
                    </div>
                    <div class="reference-info">
                      <div class="reference-name">{{ snip.title }}</div>
                      <div class="reference-desc">
                        <n-tag size="tiny" :bordered="false">{{ snip.language }}</n-tag>
                      </div>
                    </div>
                  </div>
                </div>
                <n-empty v-if="filteredSnippets.length === 0" description="暂无代码片段" size="small" />
              </n-scrollbar>
            </n-tab-pane>
          </n-tabs>
        </div>
      </n-modal>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import {
  NH2,
  NButton,
  NSpace,
  NIcon,
  NAvatar,
  NInput,
  NText,
  NTag,
  NSpin,
  NModal,
  NTabs,
  NTabPane,
  NList,
  NListItem,
  NThing,
  NEmpty,
  NScrollbar,
  useMessage
} from 'naive-ui'
import {
  TimeOutline,
  AddOutline,
  TrashOutline,
  ChatbubblesOutline,
  PersonOutline,
  SparklesOutline,
  SendOutline,
  LinkOutline,
  ChatboxOutline,
  CopyOutline,
  SearchOutline,
  KeyOutline,
  GlobeOutline,
  CodeSlashOutline
} from '@vicons/ionicons5'
import { aiMessageApi } from '../api/ai-message'
import { websiteApi } from '../api/website'
import { passwordApi } from '../api/password'
import { snippetApi } from '../api/snippet'
import MessageContent from '../components/MessageContent.vue'

const message = useMessage()
const messages = ref([])
const inputMessage = ref('')
const loading = ref(false)
const chatContainer = ref(null)
const streamingContent = ref('')

const showReferenceModal = ref(false)
const activeTab = ref('websites')
const selectedReferences = ref([])
const conversations = ref([])
const currentConversationId = ref(null)

const websites = ref([])
const passwords = ref([])
const snippets = ref([])

const websiteSearch = ref('')
const passwordSearch = ref('')
const snippetSearch = ref('')

const filteredWebsites = computed(() => {
  if (!websiteSearch.value) return websites.value
  const query = websiteSearch.value.toLowerCase()
  return websites.value.filter(w =>
    w.name?.toLowerCase().includes(query) ||
    w.url?.toLowerCase().includes(query)
  )
})

const filteredPasswords = computed(() => {
  if (!passwordSearch.value) return passwords.value
  const query = passwordSearch.value.toLowerCase()
  return passwords.value.filter(p =>
    p.title?.toLowerCase().includes(query) ||
    p.username?.toLowerCase().includes(query) ||
    p.website_name?.toLowerCase().includes(query)
  )
})

const filteredSnippets = computed(() => {
  if (!snippetSearch.value) return snippets.value
  const query = snippetSearch.value.toLowerCase()
  return snippets.value.filter(s =>
    s.title?.toLowerCase().includes(query) ||
    s.language?.toLowerCase().includes(query)
  )
})

const getRefTagType = (type) => {
  const types = {
    '网站': 'info',
    '密码': 'warning',
    '代码': 'success'
  }
  return types[type] || 'default'
}

const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

const handleFaviconError = (e) => {
  e.target.style.display = 'none'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const formatDateShort = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } else if (days === 1) {
    return '昨天'
  } else if (days < 7) {
    return `${days}天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

const loadData = async () => {
  try {
    const [webRes, pwdRes, snpRes] = await Promise.all([
      websiteApi.getAll(),
      passwordApi.getAll(),
      snippetApi.getAll()
    ])
    websites.value = webRes.data.data || []
    passwords.value = pwdRes.data.data || []
    snippets.value = snpRes.data.data || []
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const loadConversations = async () => {
  try {
    const response = await aiMessageApi.getConversations()
    conversations.value = response.data.data || []
  } catch (error) {
    console.error('加载对话列表失败:', error)
  }
}

const loadConversation = async (conversationId) => {
  try {
    const response = await aiMessageApi.getConversation(conversationId)
    const msgs = response.data.data || []
    messages.value = msgs.map(m => ({
      role: m.role,
      content: m.content,
      references: m.references || [],
      aiReferences: m.role === 'assistant' ? (m.references || []) : []
    }))
    currentConversationId.value = conversationId
    scrollToBottom()
  } catch (error) {
    console.error('加载对话失败:', error)
    message.error('加载对话失败')
  }
}

const deleteConversation = async (conversationId) => {
  try {
    await aiMessageApi.deleteConversation(conversationId)
    message.success('删除成功')
    await loadConversations()
    if (currentConversationId.value === conversationId) {
      startNewConversation()
    }
  } catch (error) {
    console.error('删除对话失败:', error)
    message.error('删除失败')
  }
}

const startNewConversation = () => {
  messages.value = []
  currentConversationId.value = null
  selectedReferences.value = []
}

const addReference = (ref) => {
  if (!selectedReferences.value.find(r => r.id === ref.id && r.type === ref.type)) {
    selectedReferences.value.push(ref)
  }
  showReferenceModal.value = false
}

const removeReference = (ref) => {
  selectedReferences.value = selectedReferences.value.filter(r => !(r.id === ref.id && r.type === ref.type))
}

const quoteMessage = (msg) => {
  const quotedContent = msg.content.substring(0, 200)
  inputMessage.value = `> ${quotedContent}${msg.content.length > 200 ? '...' : ''}\n\n`
}

const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    message.success('已复制到剪贴板')
  } catch (error) {
    message.error('复制失败')
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const buildReferenceContext = () => {
  if (selectedReferences.value.length === 0) return ''
  
  let context = '\n\n[用户引用的数据]\n'
  selectedReferences.value.forEach(ref => {
    if (ref.type === '网站') {
      context += `网站: ${ref.data.name}\nURL: ${ref.data.url}\n描述: ${ref.data.description || '无'}\n\n`
    } else if (ref.type === '密码') {
      context += `密码条目: ${ref.data.title || ref.data.website_name}\n账号: ${ref.data.username}\n网站: ${ref.data.website_url || '无'}\n\n`
    } else if (ref.type === '代码') {
      context += `代码片段: ${ref.data.title}\n语言: ${ref.data.language}\n代码:\n${ref.data.code}\n\n`
    }
  })
  return context
}

const saveMessage = async (role, content, references) => {
  try {
    if (!currentConversationId.value) {
      currentConversationId.value = crypto.randomUUID()
    }
    await aiMessageApi.saveMessage({
      conversation_id: currentConversationId.value,
      role,
      content,
      references
    })
    await loadConversations()
  } catch (error) {
    console.error('保存消息失败:', error)
  }
}

const sendMessage = async () => {
  const content = inputMessage.value.trim()
  if (!content || loading.value) return

  const references = [...selectedReferences.value]
  const contextContent = content + buildReferenceContext()
  
  messages.value.push({
    role: 'user',
    content,
    references
  })
  
  await saveMessage('user', content, references)
  
  inputMessage.value = ''
  selectedReferences.value = []
  scrollToBottom()

  loading.value = true
  streamingContent.value = ''
  
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const response = await fetch(`${apiBase}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: contextContent,
        history: messages.value.slice(0, -1).map(m => ({
          role: m.role,
          content: m.role === 'user' ? m.content + (m.references?.length ? buildReferenceContextFromRefs(m.references) : '') : m.content
        })),
        stream: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `请求失败 (${response.status})`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let aiContent = ''
    let aiReferences = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              aiContent += parsed.content
              streamingContent.value = aiContent
              scrollToBottom()
            }
            if (parsed.done) {
              aiReferences = parsed.references || []
            }
            if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) {
              throw e
            }
          }
        }
      }
    }

    if (!aiContent) {
      aiContent = '抱歉，我无法处理您的请求。'
    }

    messages.value.push({
      role: 'assistant',
      content: aiContent,
      aiReferences
    })

    await saveMessage('assistant', aiContent, aiReferences)
  } catch (error) {
    console.error('AI 对话失败:', error)
    message.error(error.message || 'AI 对话失败，请检查设置')
    const errorContent = '抱歉，发生了错误。请检查 AI 设置是否正确配置。'
    messages.value.push({
      role: 'assistant',
      content: errorContent
    })
    await saveMessage('assistant', errorContent, [])
  } finally {
    loading.value = false
    streamingContent.value = ''
    scrollToBottom()
  }
}

const buildReferenceContextFromRefs = (refs) => {
  if (!refs || refs.length === 0) return ''
  let context = '\n\n[用户引用的数据]\n'
  refs.forEach(ref => {
    if (ref.data) {
      if (ref.type === '网站') {
        context += `网站: ${ref.data.name}\nURL: ${ref.data.url}\n描述: ${ref.data.description || '无'}\n\n`
      } else if (ref.type === '密码') {
        context += `密码条目: ${ref.data.title || ref.data.website_name}\n账号: ${ref.data.username}\n网站: ${ref.data.website_url || '无'}\n\n`
      } else if (ref.type === '代码') {
        context += `代码片段: ${ref.data.title}\n语言: ${ref.data.language}\n代码:\n${ref.data.code}\n\n`
      }
    }
  })
  return context
}

const handleKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  loadData()
  loadConversations()
  scrollToBottom()
})
</script>

<style scoped>
.ai-chat-layout {
  height: 100%;
  display: flex;
  background: var(--bg-color);
  border-radius: 12px;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

.conversation-list {
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  position: relative;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: var(--primary-light);
}

.conversation-item.active {
  background: var(--primary-light);
}

.conversation-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  margin-right: 10px;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-date {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.conversation-item .delete-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.2s;
}

.conversation-item:hover .delete-btn {
  opacity: 1;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--card-bg);
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-bg);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.chat-header .n-h2 {
  margin: 0;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 16px;
}

.empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
}

.message {
  display: flex;
  gap: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  padding: 14px 18px;
  border-radius: 16px;
  background: var(--bg-color);
}

.message.user .message-content {
  background: var(--primary-light);
}

.user-references {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}

.message-text {
  line-height: 1.7;
  word-break: break-word;
  color: var(--text-primary);
}

.message-text :deep(pre) {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-text :deep(code) {
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
}

.message-text :deep(code:not(pre code)) {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
}

.message-references {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.message-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--card-bg);
}

.selected-references {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-color);
  border-radius: 10px;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-row .n-input {
  flex: 1;
}

.reference-modal-content {
  min-height: 400px;
}

.reference-grid {
  margin-top: 4px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.reference-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.reference-item:hover {
  background: var(--primary-light);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.reference-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.reference-icon.website {
  background: linear-gradient(135deg, rgba(13, 116, 234, 0.15) 0%, rgba(13, 116, 234, 0.05) 100%);
  color: var(--primary-color);
}

.reference-icon.password {
  background: linear-gradient(135deg, rgba(250, 140, 22, 0.15) 0%, rgba(250, 140, 22, 0.05) 100%);
  color: #fa8c16;
}

.reference-icon.snippet {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.15) 0%, rgba(82, 196, 26, 0.05) 100%);
  color: #52c41a;
}

.favicon-img {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  object-fit: cover;
}

.reference-info {
  flex: 1;
  min-width: 0;
}

.reference-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

</style>
