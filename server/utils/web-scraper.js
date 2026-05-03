import axios from 'axios'
import * as cheerio from 'cheerio'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const getUploadsDir = () => {
  if (process.env.APP_DATA_DIR) {
    const baseDir = path.join(process.env.APP_DATA_DIR, 'uploads')
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true })
    }
    return baseDir
  }
  
  const baseDir = process.env.RESOURCES_PATH 
    ? path.join(process.env.RESOURCES_PATH, 'uploads')
    : path.resolve(process.cwd(), 'server', 'uploads')
  
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true })
  }
  
  return baseDir
}

const generateFileName = (url, ext = '.jpg') => {
  const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8)
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  return `img_${timestamp}_${hash}_${randomStr}${ext}`
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const downloadImage = async (imgUrl, uploadsDir, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      if (!imgUrl || imgUrl.startsWith('data:')) {
        return null
      }
      
      const decodedUrl = decodeURIComponent(imgUrl)
      
      const response = await axios({
        method: 'GET',
        url: decodedUrl,
        responseType: 'arraybuffer',
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Referer': decodedUrl,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Empty response')
      }
      
      const contentType = response.headers['content-type'] || 'image/jpeg'
      
      if (!contentType.startsWith('image/')) {
        throw new Error(`Invalid content type: ${contentType}`)
      }
      
      const extMap = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
        'image/bmp': '.bmp',
        'image/tiff': '.tiff'
      }
      
      const ext = extMap[contentType] || '.jpg'
      const fileName = generateFileName(decodedUrl, ext)
      const dateDir = path.join(uploadsDir, new Date().toISOString().slice(0, 7))
      
      if (!fs.existsSync(dateDir)) {
        fs.mkdirSync(dateDir, { recursive: true })
      }
      
      const filePath = path.join(dateDir, fileName)
      fs.writeFileSync(filePath, Buffer.from(response.data, 'binary'))
      
      const relativePath = path.relative(uploadsDir, filePath)
      const localUrl = `/api/uploads/${relativePath.replace(/\\/g, '/')}`
      
      return localUrl
    } catch (error) {
      console.error(`图片下载失败 (尝试 ${i + 1}/${retries}):`, imgUrl, error.message)
      if (i < retries - 1) {
        await sleep(1000 * (i + 1))
      }
    }
  }
  return null
}

const resolveUrl = (relativeUrl, baseUrl) => {
  try {
    if (relativeUrl.startsWith('//')) {
      return 'https:' + relativeUrl
    } else if (relativeUrl.startsWith('/')) {
      const urlObj = new URL(baseUrl)
      return `${urlObj.protocol}//${urlObj.host}${relativeUrl}`
    } else if (!relativeUrl.startsWith('http')) {
      return new URL(relativeUrl, baseUrl).href
    }
    return relativeUrl
  } catch (e) {
    return null
  }
}

export const scrapeWebpage = async (url, options = {}) => {
  const {
    timeout = 30000,
    downloadImages = true,
    maxImages = 20
  } = options
  
  const uploadsDir = getUploadsDir()
  let lastError = null
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        timeout: timeout,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1'
        }
      })
      
      const html = response.data
      const $ = cheerio.load(html)
      
      const title = $('title').text().trim() || ''
      
      $('script, style, noscript, iframe').remove()
      $('nav, footer, header, aside, form').remove()
      $('.sidebar, .advertisement, .ad, .ads, .comment, .comments, .share, .social').remove()
      $('.author, .author-info, .post-author, .article-author, .writer').remove()
      $('.copyright, .license, .disclaimer').remove()
      $('.breadcrumb, .pagination, .pager').remove()
      $('.related, .recommend, .tags, .tag-list').remove()
      $('.footer, .footer-info, .footer-copyright, .icp, .beian').remove()
      $('[class*="footer"], [class*="bottom"], [id*="footer"], [id*="bottom"]').remove()
      $('[class*="author"], [id*="author"]').remove()
      $('[class*="copyright"], [id*="copyright"]').remove()
      $('[class*="beian"], [id*="beian"], [class*="icp"], [id*="icp"]').remove()
      
      let $article = $('article').first()
      if ($article.length === 0) {
        $article = $('main').first()
      }
      if ($article.length === 0) {
        $article = $('.content, .post, .article, .entry-content, .post-content, .article-content').first()
      }
      if ($article.length === 0) {
        $article = $('body')
      }
      
      $article.find('script, style, noscript, iframe').remove()
      $article.find('.author, .author-info, .post-author, .article-author').remove()
      $article.find('.copyright, .license, .disclaimer').remove()
      $article.find('.share, .social, .related, .recommend').remove()
      $article.find('[class*="footer"], [class*="author"], [class*="copyright"]').remove()
      $article.find('[id*="footer"], [id*="author"], [id*="copyright"]').remove()
      
      const images = []
      const imageUrls = new Set()
      
      if (downloadImages) {
        const imgPromises = []
        let imgCount = 0
        
        $article.find('img').each((i, elem) => {
          if (imgCount >= maxImages) return false
          
          let src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-original')
          
          if (src && !imageUrls.has(src)) {
            if (src.startsWith('//')) {
              src = 'https:' + src
            }
            
            const imgUrl = resolveUrl(src, url)
            if (imgUrl && !imageUrls.has(imgUrl)) {
              imageUrls.add(src)
              imageUrls.add(imgUrl)
              
              imgPromises.push(
                downloadImage(imgUrl, uploadsDir).then(localUrl => {
                  if (localUrl) {
                    images.push({
                      originalUrl: imgUrl,
                      localUrl,
                      alt: $(elem).attr('alt') || ''
                    })
                  }
                }).catch(err => {
                  console.error('图片下载错误:', imgUrl, err.message)
                })
              )
              imgCount++
            }
          }
        })
        
        const results = await Promise.allSettled(imgPromises)
        
        const failedCount = results.filter(r => r.status === 'rejected').length
        if (failedCount > 0) {
          console.log(`图片下载完成: 成功 ${images.length} 张, 失败 ${failedCount} 张`)
        }
      }
      
      const processNode = (node, $) => {
        const result = []
        
        $(node).contents().each((i, child) => {
          if (child.type === 'text') {
            const text = $(child).text().trim()
            if (text) {
              result.push({ type: 'text', text })
            }
          } else if (child.type === 'tag') {
            const tagName = child.tagName?.toLowerCase()
            
            if (['script', 'style', 'noscript', 'iframe'].includes(tagName)) {
              return
            }
            
            if (tagName === 'img') {
              const src = $(child).attr('src') || $(child).attr('data-src')
              const alt = $(child).attr('alt') || ''
              if (src) {
                const imgUrl = resolveUrl(src, url)
                if (imgUrl) {
                  result.push({ type: 'img', src: imgUrl, alt })
                }
              }
            } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
              const text = $(child).text().trim()
              if (text) {
                result.push({ type: tagName, text })
              }
            } else if (tagName === 'p') {
              const children = processNode(child, $)
              if (children.length > 0) {
                result.push({ type: 'p', children })
              }
            } else if (tagName === 'pre') {
              const code = $(child).find('code').text() || $(child).text()
              if (code.trim()) {
                result.push({ type: 'pre', text: code.trim() })
              }
            } else if (tagName === 'code') {
              const text = $(child).text().trim()
              if (text) {
                result.push({ type: 'code', text })
              }
            } else if (tagName === 'ul' || tagName === 'ol') {
              const items = []
              $(child).find('> li').each((j, li) => {
                const liChildren = processNode(li, $)
                if (liChildren.length > 0) {
                  items.push(liChildren)
                }
              })
              if (items.length > 0) {
                result.push({ type: tagName, items })
              }
            } else if (tagName === 'blockquote') {
              const children = processNode(child, $)
              if (children.length > 0) {
                result.push({ type: 'blockquote', children })
              }
            } else if (tagName === 'a') {
              const text = $(child).text().trim()
              const href = $(child).attr('href')
              if (text && href && !href.startsWith('javascript:')) {
                const resolvedHref = resolveUrl(href, url)
                if (resolvedHref) {
                  result.push({ type: 'a', text, href: resolvedHref })
                }
              }
            } else if (tagName === 'strong' || tagName === 'b') {
              const text = $(child).text().trim()
              if (text) {
                result.push({ type: 'strong', text })
              }
            } else if (tagName === 'em' || tagName === 'i') {
              const text = $(child).text().trim()
              if (text) {
                result.push({ type: 'em', text })
              }
            } else if (tagName === 'br') {
              result.push({ type: 'br' })
            } else if (tagName === 'hr') {
              result.push({ type: 'hr' })
            } else if (tagName === 'table') {
              const rows = []
              $(child).find('tr').each((j, tr) => {
                const cells = []
                $(tr).find('th, td').each((k, cell) => {
                  cells.push($(cell).text().trim())
                })
                if (cells.length > 0) {
                  rows.push(cells)
                }
              })
              if (rows.length > 0) {
                result.push({ type: 'table', rows })
              }
            } else {
              const children = processNode(child, $)
              result.push(...children)
            }
          }
        })
        
        return result
      }
      
      const content = processNode($article[0], $)
      
      return {
        title,
        content,
        images,
        url
      }
    } catch (error) {
      lastError = error
      if (attempt < 2) {
        await sleep(1000 * (attempt + 1))
      }
    }
  }
  
  throw new Error(`无法访问网页: ${lastError?.message || '未知错误'}`)
}

export const convertToMarkdown = (scrapedData) => {
  const { title, content, images } = scrapedData
  
  const imageMap = new Map()
  images.forEach(img => {
    imageMap.set(img.originalUrl, img.localUrl)
  })
  
  const processContent = (items) => {
    let markdown = ''
    
    for (const item of items) {
      switch (item.type) {
        case 'text':
          markdown += item.text
          break
          
        case 'h1':
          markdown += `# ${item.text}\n\n`
          break
          
        case 'h2':
          markdown += `## ${item.text}\n\n`
          break
          
        case 'h3':
          markdown += `### ${item.text}\n\n`
          break
          
        case 'h4':
          markdown += `#### ${item.text}\n\n`
          break
          
        case 'h5':
          markdown += `##### ${item.text}\n\n`
          break
          
        case 'h6':
          markdown += `###### ${item.text}\n\n`
          break
          
        case 'p':
          if (item.children && item.children.length > 0) {
            markdown += processContent(item.children) + '\n\n'
          }
          break
          
        case 'img':
          const localUrl = imageMap.get(item.src)
          if (localUrl) {
            markdown += `![${item.alt || '图片'}](${localUrl})`
          }
          break
          
        case 'pre':
          markdown += `\`\`\`\n${item.text}\n\`\`\`\n\n`
          break
          
        case 'code':
          markdown += `\`${item.text}\``
          break
          
        case 'ul':
          if (item.items && item.items.length > 0) {
            item.items.forEach(liChildren => {
              markdown += `- ${processContent(liChildren)}\n`
            })
            markdown += '\n'
          }
          break
          
        case 'ol':
          if (item.items && item.items.length > 0) {
            item.items.forEach((liChildren, idx) => {
              markdown += `${idx + 1}. ${processContent(liChildren)}\n`
            })
            markdown += '\n'
          }
          break
          
        case 'blockquote':
          if (item.children && item.children.length > 0) {
            const quoteContent = processContent(item.children)
            const lines = quoteContent.split('\n')
            lines.forEach(line => {
              markdown += `> ${line}\n`
            })
            markdown += '\n'
          }
          break
          
        case 'a':
          markdown += `[${item.text}](${item.href})`
          break
          
        case 'strong':
          markdown += `**${item.text}**`
          break
          
        case 'em':
          markdown += `*${item.text}*`
          break
          
        case 'br':
          markdown += '\n'
          break
          
        case 'hr':
          markdown += '\n---\n\n'
          break
          
        case 'table':
          if (item.rows && item.rows.length > 0) {
            const header = item.rows[0]
            markdown += '| ' + header.join(' | ') + ' |\n'
            markdown += '| ' + header.map(() => '---').join(' | ') + ' |\n'
            
            for (let i = 1; i < item.rows.length; i++) {
              markdown += '| ' + item.rows[i].join(' | ') + ' |\n'
            }
            markdown += '\n'
          }
          break
      }
    }
    
    return markdown
  }
  
  let markdown = `# ${title}\n\n`
  markdown += processContent(content)
  
  return markdown.trim()
}