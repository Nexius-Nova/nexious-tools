import express from 'express'
import { query, queryOne, execute, insert, update, remove } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM code_snippets ORDER BY pinned DESC, category ASC, created_at DESC')
    const parsedRows = rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      pinned: !!row.pinned
    }))
    res.json({ data: parsedRows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/categories', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM snippet_categories ORDER BY name ASC')
    res.json({ data: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/categories', async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '分类名称不能为空' })
  }
  try {
    const result = await insert('snippet_categories', { name: name.trim() })
    res.json({ data: { id: result.id, name: name.trim() } })
  } catch (error) {
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: '该分类已存在' })
    }
    res.status(500).json({ error: error.message })
  }
})

router.delete('/categories/:id', async (req, res) => {
  try {
    const category = await queryOne('SELECT name FROM snippet_categories WHERE id = ?', [req.params.id])
    if (category) {
      const snippets = await query('SELECT COUNT(*) as count FROM code_snippets WHERE category = ?', [category.name])
      if (snippets[0]?.count > 0) {
        return res.status(400).json({ error: '该分类下有代码片段，无法删除' })
      }
    }
    await execute('DELETE FROM snippet_categories WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/categories/:id', async (req, res) => {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '分类名称不能为空' })
  }
  try {
    const category = await queryOne('SELECT name FROM snippet_categories WHERE id = ?', [req.params.id])
    if (!category) {
      return res.status(404).json({ error: '分类不存在' })
    }
    const oldName = category.name
    const newName = name.trim()
    if (oldName !== newName) {
      const existing = await queryOne('SELECT id FROM snippet_categories WHERE name = ? AND id != ?', [newName, req.params.id])
      if (existing) {
        return res.status(400).json({ error: '该分类名称已存在' })
      }
      await execute('UPDATE snippet_categories SET name = ? WHERE id = ?', [newName, req.params.id])
      await execute('UPDATE code_snippets SET category = ? WHERE category = ?', [newName, oldName])
    }
    res.json({ data: { id: parseInt(req.params.id), name: newName } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/search', async (req, res) => {
  const { q, regex } = req.query
  try {
    let rows
    if (regex === 'true' && q) {
      try {
        const regexPattern = new RegExp(q, 'gi')
        const allRows = await query('SELECT * FROM code_snippets')
        rows = allRows.filter(row => 
          regexPattern.test(row.title) || 
          regexPattern.test(row.description || '') || 
          regexPattern.test(row.code)
        )
      } catch (e) {
        return res.status(400).json({ error: '无效的正则表达式' })
      }
    } else {
      rows = await query(
        'SELECT * FROM code_snippets WHERE title LIKE ? OR description LIKE ? OR code LIKE ? ORDER BY pinned DESC, created_at DESC',
        [`%${q}%`, `%${q}%`, `%${q}%`]
      )
    }
    const parsedRows = rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : [],
      pinned: !!row.pinned
    }))
    res.json({ data: parsedRows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/category/:category', async (req, res) => {
  try {
    const rows = await query(
      'SELECT * FROM code_snippets WHERE category = ? ORDER BY created_at DESC',
      [req.params.category]
    )
    const parsedRows = rows.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    }))
    res.json({ data: parsedRows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM code_snippets WHERE id = ?', [req.params.id])
    if (row) {
      row.tags = row.tags ? JSON.parse(row.tags) : []
    }
    res.json({ data: row || null })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  const { title, language, category, description, code, tags, pinned } = req.body
  try {
    const tagsStr = tags ? JSON.stringify(tags) : null
    const result = await insert('code_snippets', {
      title,
      language: language || 'javascript',
      category: category || null,
      description: description || null,
      code,
      tags: tagsStr,
      pinned: pinned ? 1 : 0
    })
    res.json({ data: { id: result.id, title, language, category, description, code, tags, pinned: !!pinned } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  const { title, language, category, description, code, tags, pinned } = req.body
  try {
    const tagsStr = tags ? JSON.stringify(tags) : null
    await update('code_snippets', req.params.id, {
      title,
      language: language || 'javascript',
      category: category || null,
      description: description || null,
      code,
      tags: tagsStr,
      pinned: pinned ? 1 : 0
    })
    res.json({ data: { id: parseInt(req.params.id), title, language, category, description, code, tags, pinned: !!pinned } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await remove('code_snippets', req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
