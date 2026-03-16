import express from 'express'
import { query, queryOne, execute } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { search, type, favorite, limit = 100 } = req.query
    
    let sql = 'SELECT * FROM clipboard_history WHERE 1=1'
    const params = []
    
    if (search) {
      sql += ' AND content LIKE ?'
      params.push(`%${search}%`)
    }
    
    if (type) {
      sql += ' AND content_type = ?'
      params.push(type)
    }
    
    if (favorite === 'true') {
      sql += ' AND is_favorite = 1'
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(parseInt(limit))
    
    const items = await query(sql, params)
    res.json({ data: items })
  } catch (error) {
    console.error('获取剪贴板历史失败:', error)
    res.status(500).json({ error: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM clipboard_history WHERE id = ?', [req.params.id])
    if (!item) {
      return res.status(404).json({ error: '记录不存在' })
    }
    res.json({ data: item })
  } catch (error) {
    console.error('获取剪贴板记录失败:', error)
    res.status(500).json({ error: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { content, content_type = 'text', source_app } = req.body
    
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' })
    }
    
    const existing = await queryOne(
      'SELECT * FROM clipboard_history WHERE content = ? ORDER BY created_at DESC LIMIT 1',
      [content]
    )
    
    if (existing) {
      await execute(
        'UPDATE clipboard_history SET copy_count = copy_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [existing.id]
      )
      res.json({ data: { ...existing, copy_count: existing.copy_count + 1 } })
    } else {
      const result = await execute(
        'INSERT INTO clipboard_history (content, content_type, source_app) VALUES (?, ?, ?)',
        [content, content_type, source_app || null]
      )
      const newItem = await queryOne('SELECT * FROM clipboard_history WHERE id = ?', [result.lastInsertRowid])
      res.json({ data: newItem })
    }
  } catch (error) {
    console.error('添加剪贴板记录失败:', error)
    res.status(500).json({ error: '添加失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { is_favorite } = req.body
    const fields = []
    const values = []
    
    if (is_favorite !== undefined) {
      fields.push('is_favorite = ?')
      values.push(is_favorite ? 1 : 0)
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' })
    }
    
    values.push(req.params.id)
    await execute(`UPDATE clipboard_history SET ${fields.join(', ')} WHERE id = ?`, values)
    
    const item = await queryOne('SELECT * FROM clipboard_history WHERE id = ?', [req.params.id])
    res.json({ data: item })
  } catch (error) {
    console.error('更新剪贴板记录失败:', error)
    res.status(500).json({ error: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM clipboard_history WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除剪贴板记录失败:', error)
    res.status(500).json({ error: '删除失败' })
  }
})

router.delete('/', async (req, res) => {
  try {
    await execute('DELETE FROM clipboard_history')
    res.json({ success: true })
  } catch (error) {
    console.error('清空剪贴板历史失败:', error)
    res.status(500).json({ error: '清空失败' })
  }
})

export default router
