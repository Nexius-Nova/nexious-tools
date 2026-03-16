import express from 'express'
import { query, queryOne, execute } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { folder_id, search, favorite, limit = 100 } = req.query
    
    let sql = 'SELECT * FROM documents WHERE 1=1'
    const params = []
    
    if (folder_id) {
      sql += ' AND folder_id = ?'
      params.push(folder_id)
    }
    
    if (favorite === 'true') {
      sql += ' AND is_favorite = 1'
    }
    
    if (search) {
      sql += ' AND (title LIKE ? OR content LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
    sql += ' ORDER BY updated_at DESC LIMIT ?'
    params.push(parseInt(limit))
    
    const items = await query(sql, params)
    res.json({ data: items })
  } catch (error) {
    console.error('获取文档列表失败:', error)
    res.status(500).json({ error: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id])
    if (!item) {
      return res.status(404).json({ error: '文档不存在' })
    }
    res.json({ data: item })
  } catch (error) {
    console.error('获取文档失败:', error)
    res.status(500).json({ error: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { title, content = '', content_type = 'markdown', folder_id, source_url, tags } = req.body
    
    if (!title) {
      return res.status(400).json({ error: '标题不能为空' })
    }
    
    const wordCount = content ? content.length : 0
    const tagsJson = tags ? JSON.stringify(tags) : null
    
    const result = await execute(
      'INSERT INTO documents (title, content, content_type, folder_id, source_url, tags, word_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, content_type, folder_id || null, source_url || null, tagsJson, wordCount]
    )
    
    const newItem = await queryOne('SELECT * FROM documents WHERE id = ?', [result.lastInsertRowid])
    res.json({ data: newItem })
  } catch (error) {
    console.error('创建文档失败:', error)
    res.status(500).json({ error: '创建失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { title, content, content_type, folder_id, source_url, tags, is_favorite } = req.body
    
    const fields = []
    const values = []
    
    if (title !== undefined) {
      fields.push('title = ?')
      values.push(title)
    }
    if (content !== undefined) {
      fields.push('content = ?')
      fields.push('word_count = ?')
      values.push(content, content ? content.length : 0)
    }
    if (content_type !== undefined) {
      fields.push('content_type = ?')
      values.push(content_type)
    }
    if (folder_id !== undefined) {
      fields.push('folder_id = ?')
      values.push(folder_id || null)
    }
    if (source_url !== undefined) {
      fields.push('source_url = ?')
      values.push(source_url || null)
    }
    if (tags !== undefined) {
      fields.push('tags = ?')
      values.push(tags ? JSON.stringify(tags) : null)
    }
    if (is_favorite !== undefined) {
      fields.push('is_favorite = ?')
      values.push(is_favorite ? 1 : 0)
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' })
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)
    
    await execute(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`, values)
    
    const item = await queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id])
    res.json({ data: item })
  } catch (error) {
    console.error('更新文档失败:', error)
    res.status(500).json({ error: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM documents WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除文档失败:', error)
    res.status(500).json({ error: '删除失败' })
  }
})

export default router
