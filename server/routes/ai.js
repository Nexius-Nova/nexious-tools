import express from 'express'
import { query, queryOne, execute } from '../db.js'
import { getDefaultAiModel, getProviderConfig } from '../ai-utils.js'

const router = express.Router()

const getContextData = async () => {
  const websites = await query('SELECT id, name, alias, url, description FROM websites ORDER BY created_at DESC')
  const passwords = await query(`
    SELECT id, title, username, website_url, website_name, notes 
    FROM passwords 
    ORDER BY created_at DESC
  `)
  const snippets = await query('SELECT id, title, language, description, tags FROM code_snippets ORDER BY created_at DESC')
  
  return { websites, passwords, snippets }
}

const buildSystemPrompt = (contextData, aiModelInfo) => {
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

## 当前 AI 模型：
- 提供商: ${aiModelInfo?.provider || '未设置'}
- 模型: ${aiModelInfo?.model || '未设置'}

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

const fetchWithTimeout = async (url, options, timeout = 120000) => {
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

const buildMessageContent = (text, images = []) => {
  if (!images || images.length === 0) {
    return text
  }
  
  const content = []
  
  if (text) {
    content.push({ type: 'text', text })
  }
  
  images.forEach(img => {
    content.push({
      type: 'image_url',
      image_url: {
        url: img.url || img
      }
    })
  })
  
  return content
}

router.post('/chat', async (req, res) => {
  const { message: userMessage, history = [], stream = true, systemPrompt: customSystemPrompt, continueFrom = null, temperature = 0.7, max_tokens = 4096, images = [] } = req.body
  
  if (!userMessage && !continueFrom && images.length === 0) {
    return res.status(400).json({ error: '消息不能为空' })
  }
  
  try {
    const aiModel = await getDefaultAiModel()
    
    if (!aiModel) {
      return res.status(400).json({ error: '请先在设置中配置 AI 模型' })
    }
    
    const { provider, api_key, base_url, model } = aiModel
    
    const contextData = await getContextData()
    const defaultSystemPrompt = buildSystemPrompt(contextData, aiModel)
    const systemPrompt = customSystemPrompt || defaultSystemPrompt
    const references = findReferences(contextData, userMessage || '')
    
    const config = getProviderConfig(provider, base_url, model)
    
    if (!config.url) {
      return res.status(400).json({ error: '请先在设置中配置 API Base URL' })
    }
    
    let messages
    if (continueFrom) {
      messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: `请继续输出以下内容的剩余部分（从上次中断的地方继续，不要重复已输出的内容）：

上次已输出的内容：
---
${continueFrom}
---

请继续输出剩余内容：` }
      ]
    } else {
      const userContent = buildMessageContent(userMessage, images)
      messages = [
        { role: 'system', content: systemPrompt },
        ...history.map(m => {
          if (m.images && m.images.length > 0) {
            return { role: m.role, content: buildMessageContent(m.content, m.images) }
          }
          return { role: m.role, content: m.content }
        }),
        { role: 'user', content: userContent }
      ]
    }
    
    if (stream && config.type !== 'anthropic') {
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      
      const openaiRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: max_tokens,
          temperature: temperature,
          stream: true
        })
      }, 300000)
      
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
                  if (parsed.choices?.[0]?.finish_reason === 'length') {
                    res.write(`data: ${JSON.stringify({ truncated: true })}\n\n`)
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
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: max_tokens,
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
          'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: max_tokens,
          temperature: temperature
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

router.post('/format-document', async (req, res) => {
  const { content, title, stream = true } = req.body
  
  if (!content) {
    return res.status(400).json({ error: '文档内容不能为空' })
  }
  
  try {
    const aiModel = await getDefaultAiModel()
    
    if (!aiModel) {
      return res.status(400).json({ error: '请先在设置中配置 AI 模型' })
    }
    
    const { provider, api_key, base_url, model } = aiModel
    
    const config = getProviderConfig(provider, base_url, model)
    
    if (!config.url) {
      return res.status(400).json({ error: '请先在设置中配置 API Base URL' })
    }
    
    const systemPrompt = `你是一个专业的文档格式整理助手。你的任务是整理和优化 Markdown 格式的文档内容。

请按照以下规则整理文档：

1. **标题结构**：
   - 确保文档有清晰的标题层级（# ## ### 等）
   - 标题前后要有适当的空行
   - 标题文字要简洁明了

2. **代码块处理**：
   - 识别所有代码片段，使用正确的代码块语法 \`\`\`语言名称 包裹
   - 自动检测代码语言并标注（如 javascript、python、java、sql、html、css、vue、react、shell、bash、json、yaml 等）
   - 代码块前后要有空行
   - 行内代码使用单个反引号包裹

3. **列表格式**：
   - 有序列表和无序列表格式要正确
   - 列表项之间保持一致的缩进
   - 嵌套列表要有正确的缩进层级

4. **段落和换行**：
   - 段落之间要有空行分隔
   - 删除多余的连续空行（最多保留一个）
   - 保持段落内容的连贯性

5. **强调和样式**：
   - 重要内容使用 **加粗** 或 *斜体*
   - 引用内容使用 > 引用语法
   - 链接使用 [文字](URL) 格式

6. **表格格式**：
   - 如果有表格数据，整理成标准 Markdown 表格格式

7. **图片保护（非常重要）**：
   - 绝对不要修改、删除或替换任何图片的URL地址
   - 图片格式 \`![](URL)\` 必须保持原样不变
   - 图片URL可能包含特殊字符、中文或长路径，都要完整保留
   - 对于形如 \`__BASE64_IMAGE_N__\` 的占位符，必须原样保留，不要修改

8. **其他**：
   - 保持原文的核心内容和语义不变
   - 只调整格式和布局，不改变内容含义
   - 输出纯 Markdown 格式，不要添加任何解释说明

请直接输出整理后的 Markdown 内容，不要添加任何额外的解释或说明文字。`

    const userMessage = `请整理以下文档内容的格式和布局(100%保留原文，只修改格式)${title ? `（文档标题：${title}）` : ''}：

${content}`

    const messages = [
      { role: 'system', content: systemPrompt },
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
          'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: 4096,
          stream: true
        })
      }, 300000)
      
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
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
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
    
    let formattedContent
    
    if (config.type === 'anthropic') {
      const anthropicRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 4096,
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt
        })
      })
      
      if (!anthropicRes.ok) {
        const errorData = await anthropicRes.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API 错误 (${anthropicRes.status})`)
      }
      
      const data = await anthropicRes.json()
      formattedContent = data.content?.[0]?.text || content
    } else {
      const openaiRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: 4096
        })
      })
      
      if (!openaiRes.ok) {
        const errorData = await openaiRes.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API 错误 (${openaiRes.status})`)
      }
      
      const data = await openaiRes.json()
      formattedContent = data.choices?.[0]?.message?.content || content
    }
    
    res.json({ data: { content: formattedContent } })
  } catch (error) {
    console.error('Format Document Error:', error)
    res.status(500).json({ error: error.message || '文档整理失败' })
  }
})

router.post('/import-url', async (req, res) => {
  const { url, stream = true, continueFrom = null } = req.body
  
  if (!url) {
    return res.status(400).json({ error: 'URL不能为空' })
  }
  
  try {
    const aiModel = await getDefaultAiModel()
    
    if (!aiModel) {
      return res.status(400).json({ error: '请先在设置中配置 AI 模型' })
    }
    
    const { provider, api_key, base_url, model } = aiModel
    
    const config = getProviderConfig(provider, base_url, model)
    
    if (!config.url) {
      return res.status(400).json({ error: '请先在设置中配置 API Base URL' })
    }
    
    let webpageContent = ''
    let webpageTitle = ''
    
    if (!continueFrom) {
      try {
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        let lastError = null
        
        for (let i = 0; i < userAgents.length; i++) {
          try {
            const headers = {
              'User-Agent': userAgents[i],
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
              'Connection': 'keep-alive'
            }
            
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
            
            const webpageRes = await fetchWithTimeout(url, {
              method: 'GET',
              headers,
              redirect: 'follow'
            }, 30000)
            
            if (webpageRes.ok) {
              const html = await webpageRes.text()
              
              const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
              webpageTitle = titleMatch ? titleMatch[1].trim() : ''
              
              const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)
              const images = []
              const baseUrl = url
              
              for (const match of imgMatches) {
                let imgUrl = match[1]
                if (imgUrl.startsWith('//')) {
                  imgUrl = 'https:' + imgUrl
                } else if (imgUrl.startsWith('/')) {
                  try {
                    const urlObj = new URL(baseUrl)
                    imgUrl = `${urlObj.protocol}//${urlObj.host}${imgUrl}`
                  } catch (e) {
                    continue
                  }
                } else if (!imgUrl.startsWith('http')) {
                  try {
                    imgUrl = new URL(imgUrl, baseUrl).href
                  } catch (e) {
                    continue
                  }
                }
                
                if (!images.includes(imgUrl)) {
                  images.push(imgUrl)
                }
              }
              
              let text = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
                .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
                .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
                .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
                .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '')
                .replace(/<!--[\s\S]*?-->/g, '')
              
              const imgReplacements = []
              let imgIndex = 0
              text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi, (match, src, alt) => {
                imgIndex++
                imgReplacements.push(`[图片${imgIndex}${alt ? `: ${alt}` : ''}]`)
                return ` [图片${imgIndex}${alt ? `: ${alt}` : ''}] `
              })
              text = text.replace(/<img[^>]+alt=["']([^"']*)["'][^>]+src=["']([^"']+)["'][^>]*>/gi, (match, alt, src) => {
                imgIndex++
                imgReplacements.push(`[图片${imgIndex}${alt ? `: ${alt}` : ''}]`)
                return ` [图片${imgIndex}${alt ? `: ${alt}` : ''}] `
              })
              text = text.replace(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi, (match, src) => {
                imgIndex++
                imgReplacements.push(`[图片${imgIndex}]`)
                return ` [图片${imgIndex}] `
              })
              
              text = text
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .trim()
              
              if (images.length > 0) {
                text += '\n\n--- 网页图片 ---\n'
                images.forEach((imgUrl, idx) => {
                  text += `图片${idx + 1}: ${imgUrl}\n`
                })
              }
              
              const maxLen = 30000
              if (text.length > maxLen) {
                text = text.substring(0, maxLen) + '...(内容过长已截断)'
              }
              
              webpageContent = text
              break
            } else {
              lastError = new Error(`HTTP ${webpageRes.status}`)
            }
          } catch (e) {
            lastError = e
          }
        }
        
        if (!webpageContent && lastError) {
          throw new Error(`无法访问网页，该网站可能有反爬虫保护。建议：1. 尝试其他网站 2. 手动复制网页内容`)
        }
      } catch (fetchError) {
        return res.status(400).json({ error: `无法获取网页内容: ${fetchError.message}` })
      }
      
      if (!webpageContent) {
        return res.status(400).json({ error: '网页内容为空' })
      }
    }
    
    const systemPrompt = `你是一个专业的内容整理助手。你的任务是将网页内容转换为格式规范的 Markdown 文档。

请按照以下规则处理：

1. **标题结构**：
   - 提取或生成合适的文档标题（使用 # 一级标题）
   - 根据内容层次使用二级、三级标题（## ###）

2. **内容保留（非常重要）**：
   - 100%保留原文内容，不添加、删除或修改任何实质性内容
   - 只调整格式和布局，不改变内容含义
   - 保持原文的段落结构和逻辑顺序

3. **代码块处理**：
   - 识别代码片段，使用正确的代码块语法 \`\`\`语言名称 包裹
   - 自动检测代码语言并标注

4. **列表格式**：
   - 将列表内容转换为 Markdown 列表格式
   - 保持列表的层级关系

5. **链接处理**：
   - 保留原文中的链接，使用 [文字](URL) 格式

6. **图片处理（非常重要）**：
   - 网页中的图片会在内容末尾列出，格式为"图片N: URL"
   - 请将图片插入到文档中合适的位置（根据上下文判断）
   - 使用 Markdown 图片语法：\`![](图片URL)\` 或 \`![图片描述](图片URL)\`
   - 如果有图片占位符如 [图片1]、[图片2]，请将其替换为实际的图片语法
   - 绝对不要修改图片URL

7. **表格格式**：
   - 如果有表格数据，整理成标准 Markdown 表格格式

8. **输出要求**：
   - 直接输出 Markdown 内容，不要添加任何解释说明
   - 确保格式规范、可读性强
   - 如果内容很长，请完整输出所有内容，不要中途截断`

    let userMessage
    if (continueFrom) {
      userMessage = `请继续输出以下内容的剩余部分（从上次中断的地方继续，不要重复已输出的内容）：

上次已输出的内容：
---
${continueFrom}
---

请继续输出剩余内容：`
    } else {
      userMessage = `请将以下网页内容转换为 Markdown 格式（100%保留原文内容，只修改格式）${webpageTitle ? `，网页标题：${webpageTitle}` : ''}：

来源URL: ${url}

${webpageContent}`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
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
          'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: 8192,
          stream: true
        })
      }, 600000)
      
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
                res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
              } else {
                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    res.write(`data: ${JSON.stringify({ content })}\n\n`)
                  }
                  if (parsed.choices?.[0]?.finish_reason === 'length') {
                    res.write(`data: ${JSON.stringify({ truncated: true })}\n\n`)
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
    
    let formattedContent
    
    if (config.type === 'anthropic') {
      const anthropicRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': api_key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 8192,
          messages: [{ role: 'user', content: userMessage }],
          system: systemPrompt
        })
      })
      
      if (!anthropicRes.ok) {
        const errorData = await anthropicRes.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API 错误 (${anthropicRes.status})`)
      }
      
      const data = await anthropicRes.json()
      formattedContent = data.content?.[0]?.text || ''
    } else {
      const openaiRes = await fetchWithTimeout(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: messages,
          max_tokens: 8192
        })
      })
      
      if (!openaiRes.ok) {
        const errorData = await openaiRes.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API 错误 (${openaiRes.status})`)
      }
      
      const data = await openaiRes.json()
      formattedContent = data.choices?.[0]?.message?.content || ''
    }
    
    res.json({ data: { content: formattedContent, title: webpageTitle } })
  } catch (error) {
    console.error('Import URL Error:', error)
    res.status(500).json({ error: error.message || '导入网页失败' })
  }
})

export default router
