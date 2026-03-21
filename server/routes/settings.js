import express from 'express'
import { query, queryOne, execute } from '../db.js'
import axios from 'axios'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT key, value FROM settings')
    const settings = {}
    rows.forEach(row => {
      settings[row.key] = row.value
    })
    res.json({ data: settings })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:key', async (req, res) => {
  try {
    const row = await queryOne('SELECT value FROM settings WHERE key = ?', [req.params.key])
    res.json({ data: row?.value || null })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:key', async (req, res) => {
  const { value } = req.body
  try {
    const existing = await queryOne('SELECT id FROM settings WHERE key = ?', [req.params.key])
    if (existing) {
      await execute('UPDATE settings SET value = ? WHERE key = ?', [value, req.params.key])
    } else {
      await execute('INSERT INTO settings (key, value) VALUES (?, ?)', [req.params.key, value])
    }
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:key', async (req, res) => {
  try {
    await execute('DELETE FROM settings WHERE key = ?', [req.params.key])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/test-api-key', async (req, res) => {
  const { provider, apiKey } = req.body
  try {
    let baseUrl = 'https://api.openai.com/v1'
    
    switch (provider) {
      case 'deepseek':
        baseUrl = 'https://api.deepseek.com/v1'
        break
      case 'zhipu':
        baseUrl = 'https://open.bigmodel.cn/api/paas/v4'
        break
      case 'moonshot':
        baseUrl = 'https://api.moonshot.cn/v1'
        break
    }

    await axios.get(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      timeout: 10000
    })

    res.json({ success: true, message: 'API Key 有效' })
  } catch (error) {
    res.status(400).json({ success: false, message: 'API Key 无效或网络错误' })
  }
})

export default router
