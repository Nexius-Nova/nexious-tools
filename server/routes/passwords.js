import express from 'express'
import { query, queryOne, execute, insert, update, remove } from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM passwords ORDER BY created_at DESC')
    res.json({ data: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM passwords WHERE id = ?', [req.params.id])
    res.json({ data: row || null })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  const { website_name, website_url, website_favicon, username, password, notes } = req.body
  try {
    if (website_name && username) {
      const existing = await queryOne(
        'SELECT id FROM passwords WHERE website_name = ? AND username = ?',
        [website_name, username]
      )
      if (existing) {
        return res.status(400).json({ error: `已存在网站"${website_name}"的用户名"${username}"记录` })
      }
    }
    
    const result = await insert('passwords', {
      website_name: website_name || null,
      website_url: website_url || null,
      website_favicon: website_favicon || null,
      username,
      password,
      notes: notes || null
    })
    res.json({ data: { id: result.id, website_name, website_url, username, notes } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  const { website_name, website_url, website_favicon, username, password, notes } = req.body
  try {
    if (website_name && username) {
      const existing = await queryOne(
        'SELECT id FROM passwords WHERE website_name = ? AND username = ? AND id != ?',
        [website_name, username, req.params.id]
      )
      if (existing) {
        return res.status(400).json({ error: `已存在网站"${website_name}"的用户名"${username}"记录` })
      }
    }
    
    await update('passwords', req.params.id, {
      website_name: website_name || null,
      website_url: website_url || null,
      website_favicon: website_favicon || null,
      username,
      password,
      notes: notes || null
    })
    res.json({ data: { id: req.params.id, website_name, website_url, username, notes } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await remove('passwords', req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/clear/all', async (req, res) => {
  try {
    await execute('DELETE FROM passwords')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
