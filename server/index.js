import express from 'express'
import cors from 'cors'
import { initDb, closeDb } from './db.js'
import websitesRouter from './routes/websites.js'
import passwordsRouter from './routes/passwords.js'
import snippetsRouter from './routes/snippets.js'
import settingsRouter from './routes/settings.js'
import aiRouter from './routes/ai.js'
import aiMessagesRouter from './routes/ai-messages.js'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/websites', websitesRouter)
app.use('/api/passwords', passwordsRouter)
app.use('/api/snippets', snippetsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/ai-messages', aiMessagesRouter)

app.use((err, req, res, next) => {
  console.error('Error:', err)
  res.status(500).json({ error: err.message || '服务器内部错误' })
})

process.on('SIGINT', () => {
  closeDb()
  process.exit(0)
})

process.on('SIGTERM', () => {
  closeDb()
  process.exit(0)
})

async function startServer() {
  try {
    await initDb()
    app.listen(PORT, () => {
      console.log(`API服务已启动: http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('启动失败:', error)
    process.exit(1)
  }
}

startServer()
