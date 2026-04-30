import express from 'express'
import { query, queryOne, execute } from '../db.js'

const router = express.Router()

router.get('/all', async (req, res) => {
  try {
    const rows = await query('SELECT id, conversation_id, role, content, refs, images, title, created_at FROM ai_messages ORDER BY created_at ASC')
    const messages = rows.map(row => {
      let references = []
      let images = []
      if (row.refs) {
        try {
          references = typeof row.refs === 'string' ? JSON.parse(row.refs) : row.refs
        } catch (e) {
          references = []
        }
      }
      if (row.images) {
        try {
          images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images
        } catch (e) {
          images = []
        }
      }
      return {
        id: row.id,
        conversation_id: row.conversation_id,
        role: row.role,
        content: row.content,
        references,
        images,
        title: row.title,
        created_at: row.created_at
      }
    })
    res.json({ data: messages })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/conversations', async (req, res) => {
  try {
    const rows = await query(`
      SELECT DISTINCT conversation_id, MIN(created_at) as started_at, 
             (SELECT content FROM ai_messages m2 WHERE m2.conversation_id = m1.conversation_id AND m2.role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message,
             (SELECT title FROM ai_messages m3 WHERE m3.conversation_id = m1.conversation_id AND m3.title IS NOT NULL LIMIT 1) as title
      FROM ai_messages m1
      GROUP BY conversation_id
      ORDER BY started_at DESC
      LIMIT 50
    `)
    res.json({ data: rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, conversation_id, role, content, refs, images, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [req.params.conversationId]
    )
    const messages = rows.map(row => {
      let references = []
      let images = []
      if (row.refs) {
        try {
          references = typeof row.refs === 'string' ? JSON.parse(row.refs) : row.refs
        } catch (e) {
          console.error('解析references失败:', e)
          references = []
        }
      }
      if (row.images) {
        try {
          images = typeof row.images === 'string' ? JSON.parse(row.images) : row.images
        } catch (e) {
          console.error('解析images失败:', e)
          images = []
        }
      }
      return {
        id: row.id,
        conversation_id: row.conversation_id,
        role: row.role,
        content: row.content,
        references,
        images,
        created_at: row.created_at
      }
    })
    res.json({ data: messages })
  } catch (error) {
    console.error('加载对话失败:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/messages', async (req, res) => {
  const { conversation_id, role, content, references, images } = req.body
  try {
    const refsJson = references ? JSON.stringify(references) : null
    const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null
    const result = await execute(
      'INSERT INTO ai_messages (conversation_id, role, content, refs, images) VALUES (?, ?, ?, ?, ?)',
      [conversation_id, role, content, refsJson, imagesJson]
    )
    res.json({ data: { id: result.lastInsertRowid || result.insertId, conversation_id, role, content, references, images } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/conversations/:conversationId', async (req, res) => {
  try {
    await execute('DELETE FROM ai_messages WHERE conversation_id = ?', [req.params.conversationId])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/conversations/:conversationId/title', async (req, res) => {
  const { title } = req.body
  try {
    const existing = await queryOne(
      'SELECT id FROM ai_messages WHERE conversation_id = ? AND title IS NOT NULL',
      [req.params.conversationId]
    )
    
    if (existing) {
      await execute('UPDATE ai_messages SET title = ? WHERE conversation_id = ? AND title IS NOT NULL', [title, req.params.conversationId])
    } else {
      const firstMsg = await queryOne(
        'SELECT id FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 1',
        [req.params.conversationId]
      )
      if (firstMsg) {
        await execute('UPDATE ai_messages SET title = ? WHERE id = ?', [title, firstMsg.id])
      }
    }
    
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/clear/all', async (req, res) => {
  try {
    await execute('DELETE FROM ai_messages')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
