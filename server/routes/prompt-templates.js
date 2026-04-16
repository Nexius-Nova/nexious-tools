import express from 'express'
import { query, queryOne, execute } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const templates = await query('SELECT * FROM prompt_templates ORDER BY category, name')
    res.json({ data: templates })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/categories', async (req, res) => {
  try {
    const categories = await query('SELECT DISTINCT category FROM prompt_templates ORDER BY category')
    res.json({ data: categories.map(c => c.category) })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const template = await queryOne('SELECT * FROM prompt_templates WHERE id = ?', [req.params.id])
    if (!template) {
      return res.status(404).json({ error: '模板不存在' })
    }
    res.json({ data: template })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  const { name, category, content, description } = req.body
  
  if (!name || !content) {
    return res.status(400).json({ error: '名称和内容不能为空' })
  }
  
  try {
    const result = await execute(
      'INSERT INTO prompt_templates (name, category, content, description) VALUES (?, ?, ?, ?)',
      [name, category || 'general', content, description || '']
    )
    res.json({ data: { id: result.lastInsertRowid, name, category, content, description } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  const { name, category, content, description } = req.body
  
  try {
    await execute(
      'UPDATE prompt_templates SET name = ?, category = ?, content = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, category, content, description, req.params.id]
    )
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const template = await queryOne('SELECT is_default FROM prompt_templates WHERE id = ?', [req.params.id])
    if (template?.is_default) {
      return res.status(400).json({ error: '默认模板不能删除' })
    }
    await execute('DELETE FROM prompt_templates WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
