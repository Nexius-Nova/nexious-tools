import express from 'express'
import { query, queryOne, execute, insert, update, remove } from '../db.js'
import axios from 'axios'
import { getDefaultAiModel, getProviderConfig } from '../ai-utils.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM websites ORDER BY sort_order ASC, created_at DESC')
    res.json({ data: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM websites WHERE id = ?', [req.params.id])
    res.json({ data: row || null })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  const { name, url, alias, favicon, description, app_path, type, search_url } = req.body
  try {
    const recordType = type || 'website'
    
    // 检查同一类别下 name 是否重复
    const existingName = await queryOne(
      'SELECT id FROM websites WHERE type = ? AND name = ?',
      [recordType, name]
    )
    if (existingName) {
      return res.status(400).json({ error: `该类别下已存在名称为"${name}"的记录` })
    }
    
    // 检查同一类别下 url 是否重复（如果提供了 url）
    if (url && url.trim()) {
      const existingUrl = await queryOne(
        'SELECT id FROM websites WHERE type = ? AND url = ?',
        [recordType, url.trim()]
      )
      if (existingUrl) {
        return res.status(400).json({ error: `该类别下已存在URL为"${url}"的记录` })
      }
    }
    
    const result = await insert('websites', {
      name,
      url: url || null,
      alias: alias || null,
      favicon: favicon || null,
      description: description || null,
      app_path: app_path || null,
      type: recordType,
      search_url: search_url || null
    })
    res.json({ data: result })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  const { name, url, alias, favicon, description, app_path, type, search_url } = req.body
  try {
    const recordType = type || 'website'
    
    // 检查同一类别下 name 是否重复（排除当前记录）
    const existingName = await queryOne(
      'SELECT id FROM websites WHERE type = ? AND name = ? AND id != ?',
      [recordType, name, req.params.id]
    )
    if (existingName) {
      return res.status(400).json({ error: `该类别下已存在名称为"${name}"的记录` })
    }
    
    // 检查同一类别下 url 是否重复（排除当前记录，如果提供了 url）
    if (url && url.trim()) {
      const existingUrl = await queryOne(
        'SELECT id FROM websites WHERE type = ? AND url = ? AND id != ?',
        [recordType, url.trim(), req.params.id]
      )
      if (existingUrl) {
        return res.status(400).json({ error: `该类别下已存在URL为"${url}"的记录` })
      }
    }
    
    await update('websites', req.params.id, {
      name,
      url: url || null,
      alias: alias || null,
      favicon: favicon || null,
      description: description || null,
      app_path: app_path || null,
      type: recordType,
      search_url: search_url || null
    })
    res.json({ data: { id: req.params.id, name, url, alias, favicon, description, app_path, type: recordType, search_url } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await remove('websites', req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/search', async (req, res) => {
  const { q } = req.query
  try {
    const rows = await query(
      'SELECT * FROM websites WHERE name LIKE ? OR alias LIKE ? ORDER BY created_at DESC',
      [`%${q}%`, `%${q}%`]
    )
    res.json({ data: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/favicon', async (req, res) => {
  const { url } = req.query
  try {
    if (!url || !url.trim()) {
      return res.status(400).json({ error: '请输入网站域名或URL' })
    }
    
    let input = url.trim().toLowerCase()
    
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      input = 'https://' + input
    }
    
    let hostname
    try {
      const urlObj = new URL(input)
      hostname = urlObj.hostname
    } catch (e) {
      const domainMatch = input.match(/^(?:https?:\/\/)?([^\/\s]+)/)
      hostname = domainMatch ? domainMatch[1] : null
    }
    
    if (!hostname) {
      return res.status(400).json({ error: '请输入有效的网站域名或URL' })
    }
    
    const faviconApis = [
      `https://favicon.im/${hostname}?larger=true`,
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`,
      `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${encodeURIComponent(hostname)}&size=128`,
      `https://icons.duckduckgo.com/ip2/${encodeURIComponent(hostname)}.ico`
    ]
    
    for (const faviconUrl of faviconApis) {
      try {
        const response = await axios.get(faviconUrl, { 
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        
        if (response.data && response.data.byteLength > 0) {
          const base64 = `data:image/png;base64,${Buffer.from(response.data, 'binary').toString('base64')}`
          return res.json({ data: { favicon: base64, domain: hostname } })
        }
      } catch (e) {
        continue
      }
    }
    
    res.status(404).json({ error: '未找到图标' })
  } catch (error) {
    res.status(500).json({ error: '获取图标失败' })
  }
})

router.post('/generate-description', async (req, res) => {
  const { url } = req.body
  try {
    const aiModel = await getDefaultAiModel()
    
    if (!aiModel) {
      return res.status(400).json({ error: '请先在设置中配置 AI 模型' })
    }
    
    const { provider, api_key, base_url, model } = aiModel
    const config = getProviderConfig(provider, base_url, model)

    let websiteContent = ''
    try {
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      websiteContent = response.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000)
    } catch (e) {
      websiteContent = `网站URL: ${url}`
    }

    const aiResponse = await axios.post(
      config.url,
      {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个网站描述生成助手。请根据提供的网站内容，生成一段简洁的网站描述（50字以内）。只返回描述文本，不要其他内容。'
          },
          {
            role: 'user',
            content: `请为以下网站生成描述：\n${websiteContent}`
          }
        ],
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    const description = aiResponse.data.choices[0]?.message?.content?.trim() || '暂无描述'
    res.json({ data: { description } })
  } catch (error) {
    console.error('生成描述失败:', error.response?.data || error.message)
    res.status(500).json({ error: '生成描述失败，请检查API配置' })
  }
})

router.post('/generate-search-url', async (req, res) => {
  const { url } = req.body
  try {
    const aiModel = await getDefaultAiModel()
    
    if (!aiModel) {
      return res.status(400).json({ error: '请先在设置中配置 AI 模型' })
    }
    
    const { provider, api_key, base_url, model } = aiModel
    const config = getProviderConfig(provider, base_url, model)

    let hostname
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`)
      hostname = urlObj.hostname
    } catch (e) {
      return res.status(400).json({ error: '请输入有效的网站URL' })
    }

    const aiResponse = await axios.post(
      config.url,
      {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: `你是一个搜索URL生成助手。根据网站域名，生成该网站的搜索URL模板。

你需要根据网站域名推断该网站的搜索功能URL格式。常见规则：
- 大多数网站使用 q、query、keyword、wd、search_key 等参数名
- 搜索路径通常是 /search、/search_result、/s 等
- 使用 {query} 作为搜索词占位符

必须返回JSON格式，不要返回null：
{"search_url": "完整的搜索URL"}

示例：
taobao.com -> {"search_url": "https://s.taobao.com/search?q={query}"}
jd.com -> {"search_url": "https://search.jd.com/Search?keyword={query}"}
google.com -> {"search_url": "https://www.google.com/search?q={query}"}
github.com -> {"search_url": "https://github.com/search?q={query}"}
bilibili.com -> {"search_url": "https://search.bilibili.com/all?keyword={query}"}
zhihu.com -> {"search_url": "https://www.zhihu.com/search?type=content&q={query}"}
douyin.com -> {"search_url": "https://www.douyin.com/search/{query}"}
xiaohongshu.com -> {"search_url": "https://www.xiaohongshu.com/search_result?keyword={query}"}
stackoverflow.com -> {"search_url": "https://stackoverflow.com/search?q={query}"}
npmjs.com -> {"search_url": "https://www.npmjs.com/search?q={query}"}
unknown-site.com -> {"search_url": "https://unknown-site.com/search?q={query}"}`
          },
          {
            role: 'user',
            content: hostname
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    )

    const content = aiResponse.data.choices[0]?.message?.content?.trim() || ''
    console.log('AI生成搜索URL响应:', content)
    
    let searchUrl = null
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        searchUrl = parsed.search_url
      }
    } catch (e) {
      console.error('解析AI响应失败:', e, '原始内容:', content)
    }
    
    if (!searchUrl) {
      searchUrl = `https://${hostname}/search?q={query}`
    }
    
    res.json({ data: { search_url: searchUrl } })
  } catch (error) {
    console.error('生成搜索URL失败:', error.response?.data || error.message)
    res.status(500).json({ error: '生成搜索URL失败，请检查API配置' })
  }
})

router.post('/filter-apps', async (req, res) => {
  const { apps } = req.body
  try {
    const aiModel = await getDefaultAiModel()
    
    if (!aiModel) {
      return res.json({ data: apps })
    }
    
    const { provider, api_key, base_url, model } = aiModel
    const config = getProviderConfig(provider, base_url, model)

    const batchSize = 50
    const allFilteredApps = []
    
    for (let i = 0; i < apps.length; i += batchSize) {
      const batch = apps.slice(i, i + batchSize)
      const appNames = batch.map(a => a.name).join('\n')
      
      const aiResponse = await axios.post(
        config.url,
        {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: `你是一个应用筛选助手。从给定的应用列表中筛选出真正的桌面应用程序。

筛选规则：
1. 保留：浏览器、编辑器、IDE、聊天软件、游戏、办公软件、设计工具、音视频播放器、下载工具、压缩工具
2. 排除：系统组件、驱动程序、更新补丁、安全补丁、运行时库、开发工具包
3. 排除：辅助程序（crash handler、helper、assistant、service、daemon）
4. 排除：安装程序、卸载程序、修复工具、配置工具

返回格式：JSON数组，只包含应用名称，不要其他内容。
示例输出：["Google Chrome", "Visual Studio Code", "WeChat"]`
            },
            {
              role: 'user',
              content: `筛选以下应用，返回真正的桌面应用名称（JSON数组）：\n${appNames}`
            }
          ],
          max_tokens: 1000,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      )

      const content = aiResponse.data.choices[0]?.message?.content?.trim() || '[]'
      let validNames = []
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          validNames = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.error('解析AI响应失败:', e)
      }
      
      const filteredBatch = batch.filter(app => validNames.includes(app.name))
      allFilteredApps.push(...filteredBatch)
    }
    
    res.json({ data: allFilteredApps })
  } catch (error) {
    console.error('筛选应用失败:', error.response?.data || error.message)
    res.json({ data: apps })
  }
})

router.delete('/clear/all', async (req, res) => {
  try {
    await execute('DELETE FROM websites')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/reorder', async (req, res) => {
  const { orders } = req.body
  try {
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders 必须是数组' })
    }
    
    for (const item of orders) {
      await execute('UPDATE websites SET sort_order = ? WHERE id = ?', [item.sort_order, item.id])
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router