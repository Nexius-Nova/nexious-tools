import express from 'express'
import { query, queryOne, execute } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const items = await query('SELECT * FROM doc_folders ORDER BY sort_order ASC, created_at ASC')
    
    const buildTree = (items, parentId = null) => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }))
    }
    
    const tree = buildTree(items)
    res.json({ data: tree })
  } catch (error) {
    console.error('获取文件夹列表失败:', error)
    res.status(500).json({ error: '获取失败' })
  }
})

router.get('/flat', async (req, res) => {
  try {
    const items = await query('SELECT * FROM doc_folders ORDER BY sort_order ASC, created_at ASC')
    res.json({ data: items })
  } catch (error) {
    console.error('获取文件夹列表失败:', error)
    res.status(500).json({ error: '获取失败' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const item = await queryOne('SELECT * FROM doc_folders WHERE id = ?', [req.params.id])
    if (!item) {
      return res.status(404).json({ error: '文件夹不存在' })
    }
    res.json({ data: item })
  } catch (error) {
    console.error('获取文件夹失败:', error)
    res.status(500).json({ error: '获取失败' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, parent_id, sort_order } = req.body
    
    if (!name) {
      return res.status(400).json({ error: '文件夹名称不能为空' })
    }
    
    const result = await execute(
      'INSERT INTO doc_folders (name, parent_id, sort_order) VALUES (?, ?, ?)',
      [name, parent_id || null, sort_order || 0]
    )
    
    const newItem = await queryOne('SELECT * FROM doc_folders WHERE id = ?', [result.lastInsertRowid])
    res.json({ data: newItem })
  } catch (error) {
    console.error('创建文件夹失败:', error)
    res.status(500).json({ error: '创建失败' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { name, parent_id, sort_order } = req.body
    
    const fields = []
    const values = []
    
    if (name !== undefined) {
      fields.push('name = ?')
      values.push(name)
    }
    if (parent_id !== undefined) {
      fields.push('parent_id = ?')
      values.push(parent_id || null)
    }
    if (sort_order !== undefined) {
      fields.push('sort_order = ?')
      values.push(sort_order)
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' })
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP')
    values.push(req.params.id)
    
    await execute(`UPDATE doc_folders SET ${fields.join(', ')} WHERE id = ?`, values)
    
    const item = await queryOne('SELECT * FROM doc_folders WHERE id = ?', [req.params.id])
    res.json({ data: item })
  } catch (error) {
    console.error('更新文件夹失败:', error)
    res.status(500).json({ error: '更新失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const children = await query('SELECT id FROM doc_folders WHERE parent_id = ?', [req.params.id])
    if (children.length > 0) {
      return res.status(400).json({ error: '该文件夹下有子文件夹，请先删除子文件夹' })
    }
    
    const docs = await query('SELECT id FROM documents WHERE folder_id = ?', [req.params.id])
    if (docs.length > 0) {
      await execute('UPDATE documents SET folder_id = NULL WHERE folder_id = ?', [req.params.id])
    }
    
    await execute('DELETE FROM doc_folders WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    console.error('删除文件夹失败:', error)
    res.status(500).json({ error: '删除失败' })
  }
})

export default router
