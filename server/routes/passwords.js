import express from 'express'
import { query, queryOne, execute, insert, update, remove } from '../db.js'
import CryptoJS from 'crypto-js'

const router = express.Router()

const getEncryptionKey = async () => {
  const setting = await queryOne("SELECT value FROM settings WHERE key = 'encryption_key'")
  return setting?.value || 'default-encryption-key-32chars'
}

const encryptPassword = (password, key) => {
  return CryptoJS.AES.encrypt(password, key).toString()
}

const decryptPassword = (encrypted, key) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, key)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    if (decrypted) {
      return decrypted
    }
    return encrypted
  } catch (error) {
    return encrypted
  }
}

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
    const key = await getEncryptionKey()
    const encryptedPassword = encryptPassword(password, key)
    
    const result = await insert('passwords', {
      website_name: website_name || null,
      website_url: website_url || null,
      website_favicon: website_favicon || null,
      username,
      password: encryptedPassword,
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
    const key = await getEncryptionKey()
    const encryptedPassword = encryptPassword(password, key)
    
    await update('passwords', req.params.id, {
      website_name: website_name || null,
      website_url: website_url || null,
      website_favicon: website_favicon || null,
      username,
      password: encryptedPassword,
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

router.get('/:id/decrypt', async (req, res) => {
  try {
    const row = await queryOne('SELECT password FROM passwords WHERE id = ?', [req.params.id])
    if (!row) {
      return res.status(404).json({ error: '密码不存在' })
    }
    
    const key = await getEncryptionKey()
    const decryptedPassword = decryptPassword(row.password, key)
    res.json({ data: { password: decryptedPassword } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
