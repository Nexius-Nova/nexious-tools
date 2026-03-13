import express from 'express'
import { query, queryOne, execute } from '../db.js'

const router = express.Router()

const getSettings = async () => {
  const rows = await query('SELECT key, value FROM settings')
  const settings = {}
  rows.forEach(row => {
    settings[row.key] = row.value
  })
  return settings
}

const getContextData = async () => {
  const websites = await query('SELECT id, name, alias, url, description FROM websites ORDER BY created_at DESC')
  const passwords = await query(`
    SELECT id, title, username, website_url, website_name, notes 
    FROM passwords 
    ORDER BY created_at DESC
  `)
  const snippets = await query('SELECT id, title, language, description, tags FROM code_snippets ORDER BY created_at DESC')
  const settings = await getSettings()
  
  return { websites, passwords, snippets, settings }
}

const buildSystemPrompt = (contextData) => {
  let prompt = `你是一个智能助手，可以访问用户的数据。以下是用户的数据上下文：

## 网站管理数据：
${contextData.websites.length > 0 
  ? contextData.websites.map(w => `- ${w.name}${w.alias ? ` (${w.alias})` : ''}: ${w.url}${w.description ? ` - ${w.description}` : ''}`).join('\n')
  : '暂无网站数据'}

## 密码管理数据：
${contextData.passwords.length > 0 
  ? contextData.passwords.map(p => `- ${p.title || p.website_name || '未命名'}: 账号 ${p.username}${p.website_url ? `, URL: ${p.website_url}` : ''}`).join('\n')
  : '暂无密码数据'}
注意：出于安全考虑，不要在回复中显示实际密码内容。

## 代码片段数据：
${contextData.snippets.length > 0 
  ? contextData.snippets.map(s => `- ${s.title} (${s.language})${s.description ? `: ${s.description}` : ''}${s.tags ? ` [${Array.isArray(s.tags) ? s.tags.join(', ') : s.tags}]` : ''}`).join('\n')
  : '暂无代码片段数据'}

## 应用设置：
- AI 提供商: ${contextData.settings.ai_provider || '未设置'}
- AI 模型: ${contextData.settings.ai_model || '未设置'}

请根据这些数据回答用户的问题。如果用户询问相关内容，你可以引用具体的数据项。回复时请使用中文。`

  return prompt
}

const findReferences = (contextData, queryText) => {
  const references = []
  const lowerQuery = queryText.toLowerCase()
  
  contextData.websites.forEach(w => {
    if (lowerQuery.includes(w.name?.toLowerCase()) || 
        (w.alias && lowerQuery.includes(w.alias.toLowerCase())) ||
        lowerQuery.includes(w.url?.toLowerCase())) {
      references.push({ type: '网站', id: w.id, name: w.name })
    }
  })
  
  contextData.passwords.forEach(p => {
    const name = p.title || p.website_name
    if (name && lowerQuery.includes(name.toLowerCase()) ||
        lowerQuery.includes(p.username?.toLowerCase())) {
      references.push({ type: '密码', id: p.id, name: name || p.username })
    }
  })
  
  contextData.snippets.forEach(s => {
    if (lowerQuery.includes(s.title?.toLowerCase()) ||
        lowerQuery.includes(s.language?.toLowerCase())) {
      references.push({ type: '代码', id: s.id, name: s.title })
    }
  })
  
  return references.slice(0, 5)
}

const fetchWithTimeout = async (url, options, timeout = 60000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请检查网络连接或尝试使用其他 AI 服务')
    }
    throw error
  }
}

const getProviderConfig = (provider, base_url, model) => {
  const configs = {
    openai: {
      url: base_url || 'https://api.openai.com/v1/chat/completions',
      model: model || 'gpt-3.5-turbo',
      type: 'openai'
    },
    deepseek: {
      url: 'https://api.deepseek.com/v1/chat/completions',
      model: model || 'deepseek-chat',
      type: 'openai'
    },
    zhipu: {
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: model || 'glm-4',
      type: 'openai'
    },
    moonshot: {
      url: 'https://api.moonshot.cn/v1/chat/completions',
      model: model || 'moonshot-v1-8k',
      type: 'openai'
    },
    anthropic: {
      url: 'https://api.anthropic.com/v1/messages',
      model: model || 'claude-3-sonnet-20240229',
      type: 'anthropic'
    },
    custom: {
      url: base_url,
      model: model || 'gpt-3.5-turbo',
      type: 'openai'
    }
  }
  
  return configs[provider] || configs.openai
}

router.post('/chat', async (req, res) => {
  const { message: userMessage, history = [], stream = false } = req.body
  
  if (!userMessage) {
    return res.status(400).json({ error: '消息不能为空' })
  }
  
  try {
    const settings = await getSettings()
    const { ai_provider, ai_api_key, ai_model, ai_base_url } = settings
    
    if (!ai_api_key) {
      return res.status(400).json({ error: '请先在设置中配置 AI API Key' })
    }
    
    if (!ai_provider) {
      return res.status(400).json({ error: '请先在设置中选择 AI 提供商' })
    }
    
    const contextData = await getContextData()
    const systemPrompt = buildSystemPrompt(contextData)
    const references = findReferences(contextData, userMessage)
    
    const config = getProviderConfig(ai_provider, ai_base_url, ai_model)
    
    if (!config.url) {
      return res.status(400).json({ error: '请先在设置中配置 API Base URL' })
    }
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ]
    
    if (stream && config.type !== 'anthropic') {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      
      const openaiRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ai_api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: 2048,
          stream: true
        })
      }, 120000)
      
      if (!openaiRes.ok) {
        const errorData = await openaiRes.json().catch(() => ({}))
        res.write(`data: ${JSON.stringify({ error: errorData.error?.message || `API 错误 (${openaiRes.status})` })}\n\n`)
        res.end()
        return
      }
      
      const reader = openaiRes.body.getReader()
      const decoder = new TextDecoder()
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n').filter(line => line.trim() !== '')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                res.write(`data: ${JSON.stringify({ done: true, references })}\n\n`)
              } else {
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`)
                  }
                } catch (e) {
                  // ignore parse errors
                }
              }
            }
          }
        }
      } catch (readError) {
        console.error('Stream read error:', readError)
      }
      
      res.end()
      return
    }
    
    let response
    
    if (config.type === 'anthropic') {
      const anthropicRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ai_api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 2048,
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content
          })),
          system: systemPrompt
        })
      })
      
      if (!anthropicRes.ok) {
        const errorData = await anthropicRes.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API 错误 (${anthropicRes.status}): 请检查 API Key 和配置`)
      }
      
      const data = await anthropicRes.json()
      response = {
        content: data.content?.[0]?.text || '抱歉，无法获取回复。',
        references
      }
    } else {
      const openaiRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ai_api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: 2048
        })
      })
      
      if (!openaiRes.ok) {
        const errorData = await openaiRes.json().catch(() => ({}))
        const errorMsg = errorData.error?.message || `API 错误 (${openaiRes.status})`
        if (openaiRes.status === 404) {
          throw new Error('API 地址不正确或模型不存在，请检查设置中的 API Base URL 和模型名称')
        }
        throw new Error(errorMsg)
      }
      
      const data = await openaiRes.json()
      response = {
        content: data.choices?.[0]?.message?.content || '抱歉，无法获取回复。',
        references
      }
    }
    
    res.json({ data: response })
  } catch (error) {
    console.error('AI Chat Error:', error)
    let errorMessage = error.message || 'AI 对话失败'
    if (error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
      errorMessage = '连接超时，请检查网络或尝试使用国内代理地址'
    }
    res.status(500).json({ error: errorMessage })
  }
})

router.get('/context', async (req, res) => {
  try {
    const contextData = await getContextData()
    res.json({ data: contextData })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
