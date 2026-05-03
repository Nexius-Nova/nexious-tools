import express from 'express'
import multer from 'multer'
import { query, queryOne, execute } from '../db.js'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

let require
let __dirname
const metaUrl = import.meta.url
if (metaUrl && metaUrl !== '') {
  try {
    require = createRequire(metaUrl)
    const __filename = fileURLToPath(metaUrl)
    __dirname = path.dirname(__filename)
  } catch (e) {
    require = createRequire(process.cwd() + '/')
    __dirname = process.cwd()
  }
} else {
  require = createRequire(process.cwd() + '/')
  __dirname = process.cwd()
}

const router = express.Router()

const tempDir = process.env.RESOURCES_PATH 
  ? path.join(process.env.RESOURCES_PATH, 'temp')
  : path.resolve(__dirname, '..', 'temp')

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true })
}

const docUpload = multer({
  dest: tempDir,
  limits: {
    fileSize: 50 * 1024 * 1024
  }
})

const supportedExtensions = [
  '.pdf', '.docx', '.xlsx', '.xls',
  '.html', '.htm', '.csv', '.json', '.xml',
  '.md', '.markdown'
]

const convertPdfToMarkdown = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath)
  const { PDFParse } = require('pdf-parse')
  const parser = new PDFParse({ data: dataBuffer })
  const result = await parser.getText()
  return result.text
}

const convertDocxToMarkdown = async (filePath) => {
  const result = await mammoth.convertToMarkdown({ path: filePath })
  return result.value
}

const convertExcelToMarkdown = async (filePath) => {
  const workbook = XLSX.readFile(filePath)
  let markdown = ''
  
  workbook.SheetNames.forEach((sheetName, index) => {
    if (index > 0) markdown += '\n\n'
    markdown += `## ${sheetName}\n\n`
    
    const sheet = workbook.Sheets[sheetName]
    const csv = XLSX.utils.sheet_to_csv(sheet)
    
    const lines = csv.split('\n').filter(line => line.trim())
    if (lines.length > 0) {
      const headerLine = lines[0]
      const headers = headerLine.split(',')
      markdown += '| ' + headers.join(' | ') + ' |\n'
      markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
      
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',')
        markdown += '| ' + cells.join(' | ') + ' |\n'
      }
    }
  })
  
  return markdown
}

const convertHtmlToMarkdown = async (filePath) => {
  const html = fs.readFileSync(filePath, 'utf-8')
  
  let markdown = html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
  
  markdown = markdown
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gi, '$1\n')
    .replace(/<ol[^>]*>(.*?)<\/ol>/gi, '$1\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    .replace(/<hr\s*\/?>/gi, '\n---\n\n')
    .replace(/<[^>]+>/g, '')
  
  markdown = markdown
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  return markdown
}

const convertCsvToMarkdown = async (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())
  
  if (lines.length === 0) return ''
  
  const headers = lines[0].split(',')
  let markdown = '| ' + headers.join(' | ') + ' |\n'
  markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n'
  
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',')
    markdown += '| ' + cells.join(' | ') + ' |\n'
  }
  
  return markdown
}

const convertJsonToMarkdown = async (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const json = JSON.parse(content)
  
  const formatValue = (value, indent = 0) => {
    const spaces = '  '.repeat(indent)
    
    if (value === null) return 'null'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'string') return value
    
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]'
      if (typeof value[0] !== 'object') {
        return value.map(v => `- ${v}`).join('\n' + spaces)
      }
      return value.map((item, i) => {
        return `### Item ${i + 1}\n\n` + formatObject(item, indent + 1)
      }).join('\n\n')
    }
    
    if (typeof value === 'object') {
      return formatObject(value, indent)
    }
    
    return String(value)
  }
  
  const formatObject = (obj, indent = 0) => {
    const spaces = '  '.repeat(indent)
    let result = ''
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result += `${spaces}### ${key}\n\n`
        result += formatObject(value, indent + 1) + '\n'
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        result += `${spaces}### ${key}\n\n`
        value.forEach((item, i) => {
          result += `${spaces}#### Item ${i + 1}\n\n`
          result += formatObject(item, indent + 2) + '\n'
        })
      } else {
        result += `${spaces}- **${key}**: ${formatValue(value, indent)}\n`
      }
    }
    
    return result
  }
  
  if (Array.isArray(json)) {
    return formatValue(json)
  }
  
  return formatObject(json)
}

const convertXmlToMarkdown = async (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  
  let markdown = content
    .replace(/<\?xml[^>]*\?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
  
  const convertElement = (match, tagName, attributes, innerContent) => {
    const indent = '  '.repeat((match.search(/\S/) / 2) || 0)
    
    if (!innerContent || innerContent.trim() === '') {
      return `${indent}- **${tagName}**: ${attributes || ''}\n`
    }
    
    if (!/<[^>]+>/.test(innerContent)) {
      return `${indent}- **${tagName}**: ${innerContent.trim()}\n`
    }
    
    return `${indent}### ${tagName}\n\n${innerContent}\n`
  }
  
  markdown = markdown
    .replace(/<(\w+)([^>]*)>([^<]*)<\/\1>/g, (match, tag, attrs, content) => {
      return `- **${tag}**: ${content.trim()}\n`
    })
    .replace(/<(\w+)([^>]*)\/>/g, (match, tag, attrs) => {
      return `- **${tag}**\n`
    })
    .replace(/<[^>]+>/g, '')
  
  markdown = markdown
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  
  return markdown
}

router.post('/convert', docUpload.single('file'), async (req, res) => {
  const tempFilePath = req.file?.path
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' })
    }

    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
    const ext = path.extname(originalName).toLowerCase()
    
    if (!supportedExtensions.includes(ext)) {
      fs.unlinkSync(tempFilePath)
      return res.status(400).json({ 
        error: `不支持的文件格式: ${ext}。支持的格式: ${supportedExtensions.join(', ')}` 
      })
    }

    let content = ''
    
    switch (ext) {
      case '.pdf':
        content = await convertPdfToMarkdown(tempFilePath)
        break
      case '.docx':
        content = await convertDocxToMarkdown(tempFilePath)
        break
      case '.xlsx':
      case '.xls':
        content = await convertExcelToMarkdown(tempFilePath)
        break
      case '.html':
      case '.htm':
        content = await convertHtmlToMarkdown(tempFilePath)
        break
      case '.csv':
        content = await convertCsvToMarkdown(tempFilePath)
        break
      case '.json':
        content = await convertJsonToMarkdown(tempFilePath)
        break
      case '.xml':
        content = await convertXmlToMarkdown(tempFilePath)
        break
      case '.md':
      case '.markdown':
        content = fs.readFileSync(tempFilePath, 'utf-8')
        break
      default:
        content = fs.readFileSync(tempFilePath, 'utf-8')
    }

    let title = path.basename(originalName, ext)
    const titleMatch = content.match(/^#\s+(.+)$/m)
    if (titleMatch) {
      title = titleMatch[1].trim()
    }

    res.json({
      data: {
        content: content,
        title: title,
        originalName: originalName
      }
    })
  } catch (error) {
    console.error('文档转换失败:', error)
    res.status(500).json({ error: error.message || '文档转换失败' })
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath)
      } catch (e) {
        console.error('删除临时文件失败:', e)
      }
    }
  }
})

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
    
    // 检查同一文件夹下 title 是否重复
    const recordFolderId = folder_id || null
    const existing = await queryOne(
      'SELECT id FROM documents WHERE folder_id IS ? AND title = ?',
      [recordFolderId, title]
    )
    if (existing) {
      const folderText = recordFolderId ? `文件夹ID ${recordFolderId}` : '根目录'
      return res.status(400).json({ error: `${folderText}下已存在标题为"${title}"的文档` })
    }
    
    const wordCount = content ? content.length : 0
    const tagsJson = tags ? JSON.stringify(tags) : null
    
    const result = await execute(
      'INSERT INTO documents (title, content, content_type, folder_id, source_url, tags, word_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, content_type, recordFolderId, source_url || null, tagsJson, wordCount]
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
    
    // 如果更新了 title 或 folder_id，检查唯一性
    if (title !== undefined || folder_id !== undefined) {
      // 获取当前记录
      const current = await queryOne('SELECT title, folder_id FROM documents WHERE id = ?', [req.params.id])
      if (!current) {
        return res.status(404).json({ error: '文档不存在' })
      }
      
      const checkTitle = title !== undefined ? title : current.title
      const checkFolderId = folder_id !== undefined ? (folder_id || null) : current.folder_id
      
      const existing = await queryOne(
        'SELECT id FROM documents WHERE folder_id IS ? AND title = ? AND id != ?',
        [checkFolderId, checkTitle, req.params.id]
      )
      if (existing) {
        const folderText = checkFolderId ? `文件夹ID ${checkFolderId}` : '根目录'
        return res.status(400).json({ error: `${folderText}下已存在标题为"${checkTitle}"的文档` })
      }
    }
    
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

router.delete('/clear/all', async (req, res) => {
  try {
    await execute('DELETE FROM documents')
    await execute('DELETE FROM doc_folders')
    res.json({ success: true })
  } catch (error) {
    console.error('清空文档失败:', error)
    res.status(500).json({ error: '清空失败' })
  }
})

export default router
