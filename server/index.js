import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, closeDb } from './db.js'
import websitesRouter from './routes/websites.js'
import passwordsRouter from './routes/passwords.js'
import snippetsRouter from './routes/snippets.js'
import settingsRouter from './routes/settings.js'
import aiRouter from './routes/ai.js'
import aiModelsRouter from './routes/ai-models.js'
import aiMessagesRouter from './routes/ai-messages.js'
import documentsRouter from './routes/documents.js'
import docFoldersRouter from './routes/doc-folders.js'
import uploadsRouter from './routes/uploads.js'
import promptTemplatesRouter from './routes/prompt-templates.js'
import { getUploadsPath, getRuntimeBasePath } from './utils/runtime-paths.js'
import { errorHandler } from './middleware/errorHandler.js'

let __dirname
const metaUrl = import.meta.url
if (metaUrl && metaUrl !== '') {
  try {
    const __filename = fileURLToPath(metaUrl)
    __dirname = path.dirname(__filename)
  } catch (e) {
    __dirname = process.cwd()
  }
} else {
  __dirname = process.cwd()
}

__dirname = getRuntimeBasePath(__dirname)

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.use('/api/uploads', express.static(getUploadsPath(__dirname)))

app.use('/api/websites', websitesRouter)
app.use('/api/passwords', passwordsRouter)
app.use('/api/snippets', snippetsRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/ai-models', aiModelsRouter)
app.use('/api/ai-messages', aiMessagesRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/doc-folders', docFoldersRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/prompt-templates', promptTemplatesRouter)

app.use(errorHandler)

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
