import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

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

const router = express.Router()

const uploadsDir = process.env.RESOURCES_PATH 
  ? path.join(process.env.RESOURCES_PATH, 'uploads')
  : path.resolve(__dirname, '..', 'uploads')

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dateDir = path.join(uploadsDir, new Date().toISOString().slice(0, 7))
    if (!fs.existsSync(dateDir)) {
      fs.mkdirSync(dateDir, { recursive: true })
    }
    cb(null, dateDir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const basename = path.basename(file.originalname, ext)
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    cb(null, `${basename}_${timestamp}_${randomStr}${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件类型'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
})

router.post('/image', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const relativePath = path.relative(uploadsDir, req.file.path)
    const url = `/api/uploads/${relativePath.replace(/\\/g, '/')}`

    res.json({
      data: {
        url,
        name: req.file.originalname,
        size: req.file.size
      }
    })
  } catch (error) {
    console.error('上传失败:', error)
    res.status(500).json({ error: '上传失败' })
  }
})

export default router
