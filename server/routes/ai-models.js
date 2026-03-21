import express from 'express'
import { query, queryOne, execute } from '../db.js'
import axios from 'axios'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM ai_models ORDER BY is_default DESC, created_at DESC')
    res.json({ data: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM ai_models WHERE id = ?', [req.params.id])
    if (!row) {
      return res.status(404).json({ error: '模型配置不存在' })
    }
    res.json({ data: row })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  const { name, provider, api_key, base_url, model, is_enabled = 1, is_default = 0 } = req.body
  
  if (!name || !provider || !api_key || !model) {
    return res.status(400).json({ error: '名称、提供商、API Key 和模型名称为必填项' })
  }
  
  try {
    // 检查 name 是否重复
    const existing = await queryOne(
      'SELECT id FROM ai_models WHERE name = ?',
      [name]
    )
    if (existing) {
      return res.status(400).json({ error: `已存在名称为"${name}"的AI模型配置` })
    }
    
    if (is_default === 1) {
      await execute('UPDATE ai_models SET is_default = 0')
    }
    
    const result = await execute(
      'INSERT INTO ai_models (name, provider, api_key, base_url, model, is_enabled, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, provider, api_key, base_url || null, model, is_enabled, is_default]
    )
    
    const newModel = await queryOne('SELECT * FROM ai_models WHERE id = ?', [result.lastInsertRowid])
    res.json({ data: newModel })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  const { id } = req.params
  const { name, provider, api_key, base_url, model, is_enabled, is_default } = req.body
  
  try {
    const existing = await queryOne('SELECT * FROM ai_models WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: '模型配置不存在' })
    }
    
    // 检查 name 是否重复（排除当前记录）
    const checkName = name ?? existing.name
    const duplicateName = await queryOne(
      'SELECT id FROM ai_models WHERE name = ? AND id != ?',
      [checkName, id]
    )
    if (duplicateName) {
      return res.status(400).json({ error: `已存在名称为"${checkName}"的AI模型配置` })
    }
    
    if (is_default === 1) {
      await execute('UPDATE ai_models SET is_default = 0')
    }
    
    await execute(
      'UPDATE ai_models SET name = ?, provider = ?, api_key = ?, base_url = ?, model = ?, is_enabled = ?, is_default = ? WHERE id = ?',
      [
        name ?? existing.name,
        provider ?? existing.provider,
        api_key ?? existing.api_key,
        base_url !== undefined ? base_url : existing.base_url,
        model ?? existing.model,
        is_enabled !== undefined ? is_enabled : existing.is_enabled,
        is_default !== undefined ? is_default : existing.is_default,
        id
      ]
    )
    
    const updated = await queryOne('SELECT * FROM ai_models WHERE id = ?', [id])
    res.json({ data: updated })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  const { id } = req.params
  
  try {
    const existing = await queryOne('SELECT * FROM ai_models WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: '模型配置不存在' })
    }
    
    await execute('DELETE FROM ai_models WHERE id = ?', [id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/:id/set-default', async (req, res) => {
  const { id } = req.params
  
  try {
    const existing = await queryOne('SELECT * FROM ai_models WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: '模型配置不存在' })
    }
    
    await execute('UPDATE ai_models SET is_default = 0')
    await execute('UPDATE ai_models SET is_default = 1 WHERE id = ?', [id])
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/:id/toggle', async (req, res) => {
  const { id } = req.params
  
  try {
    const existing = await queryOne('SELECT * FROM ai_models WHERE id = ?', [id])
    if (!existing) {
      return res.status(404).json({ error: '模型配置不存在' })
    }
    
    const newStatus = existing.is_enabled ? 0 : 1
    await execute('UPDATE ai_models SET is_enabled = ? WHERE id = ?', [newStatus, id])
    
    res.json({ success: true, is_enabled: newStatus })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/test', async (req, res) => {
  const { provider, apiKey, baseUrl, model } = req.body
  
  try {
    const providerUrls = {
      openai: 'https://api.openai.com/v1',
      deepseek: 'https://api.deepseek.com',
      zhipu: 'https://open.bigmodel.cn/api/paas/v4',
      moonshot: 'https://api.moonshot.cn/v1',
      anthropic: 'https://api.anthropic.com/v1',
      aliyun: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
      tencent: 'https://api.hunyuan.cloud.tencent.com/v1',
      siliconflow: 'https://api.siliconflow.cn/v1'
    }
    
    let testUrl = baseUrl || providerUrls[provider]
    
    if (!testUrl) {
      return res.status(400).json({ success: false, message: '请提供 API Base URL' })
    }
    
    if (provider === 'anthropic') {
      try {
        await axios.post(`${testUrl}/messages`, {
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }]
        }, {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })
        res.json({ success: true, message: '连接成功' })
      } catch (error) {
        const message = error.response?.data?.error?.message || error.message || '连接失败'
        res.status(400).json({ success: false, message })
      }
      return
    }
    
    if (provider === 'baidu') {
      res.json({ success: true, message: '百度文心需要使用 Access Token，请直接保存配置后使用' })
      return
    }
    
    try {
      await axios.get(`${testUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000
      })
      
      res.json({ success: true, message: '连接成功' })
    } catch (error) {
      const message = error.response?.data?.error?.message || error.message || '连接失败'
      res.status(400).json({ success: false, message })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || '测试失败' })
  }
})

router.delete('/clear/all', async (req, res) => {
  try {
    await execute('DELETE FROM ai_models')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
