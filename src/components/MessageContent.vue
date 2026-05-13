<template>
  <div class="message-content-renderer">
    <template v-for="(part, index) in parsedParts" :key="index">
      <CodeBlock
        v-if="part.type === 'code'"
        :code="part.content"
        :language="part.language"
        @copy="handleCopy"
      />
      <div v-else-if="part.type === 'table'" class="md-table-scroll">
        <table class="md-table">
          <thead>
            <tr>
              <th v-for="(cell, ci) in part.headers" :key="ci" v-html="parseInline(cell)"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in part.rows" :key="ri">
              <td v-for="(cell, ci) in row" :key="ci" v-html="parseInline(cell)"></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="part.type === 'image'" class="md-image-container">
        <div v-if="!loadedImages.has(part.url)" class="md-image-skeleton">
          <div class="skeleton-pulse"></div>
          <svg class="skeleton-icon" viewBox="0 0 24 24" width="28" height="28">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor" opacity="0.4"/>
          </svg>
        </div>
        <img
          :src="part.url"
          :alt="part.alt"
          :class="['md-image', { 'is-loaded': loadedImages.has(part.url) }]"
          @load="onImageLoaded(part.url)"
          @error="onImageError(part.url)"
          @click="emit('preview-image', part.url)"
        />
        <div class="md-image-actions">
          <button class="md-media-btn" title="下载图片" @click="downloadMedia(part.url, getImageFilename(part.url))">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
            </svg>
          </button>
          <button class="md-media-btn" title="放大预览" @click="emit('preview-image', part.url)">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>
      <div v-else-if="part.type === 'video'" class="md-video-container">
        <video
          :src="part.url"
          controls
          class="md-video"
          preload="metadata"
          @error="onVideoError(part.url)"
        >
          您的浏览器不支持视频播放
        </video>
        <div class="md-video-actions">
          <button class="md-media-btn" title="下载视频" @click="downloadMedia(part.url, getVideoFilename(part.url))">
            <svg viewBox="0 0 24 24" width="14" height="14">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <div v-if="videoErrors.has(part.url)" class="md-video-error">
          视频加载失败
        </div>
      </div>
      <div v-else class="text-part" v-html="part.content"></div>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue'
import CodeBlock from './CodeBlock.vue'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['copy', 'preview-image'])

const loadedImages = reactive(new Set())
const videoErrors = reactive(new Set())

const onImageLoaded = (url) => {
  loadedImages.add(url)
}

const onImageError = (url) => {
  loadedImages.add(url)
}

const onVideoError = (url) => {
  videoErrors.add(url)
}

const getImageFilename = (url) => {
  const match = url.match(/\/([^/?#]+)\.\w{3,4}(?:[?#]|$)/)
  return match ? `${match[1]}.png` : `image-${Date.now()}.png`
}

const getVideoFilename = (url) => {
  const match = url.match(/\/([^/?#]+\.\w{3,4})(?:[?#]|$)/)
  return match ? match[1] : `video-${Date.now()}.mp4`
}

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api"

const downloadMedia = async (url, filename) => {
  try {
    const isSameOrigin = url.startsWith('/') || url.startsWith(apiBase) || url.startsWith(location.origin)
    const downloadUrl = isSameOrigin
      ? url
      : `${apiBase}/ai/proxy-download?url=${encodeURIComponent(url)}`

    const response = await fetch(downloadUrl)
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || `服务器返回 ${response.status}`)
    }
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('Download failed:', error)
    window.open(url, '_blank')
  }
}

const parseInline = (text) => {
  if (!text) return ''
  let html = text
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-inline-img" />')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return html
}

const parseMarkdown = (text) => {
  if (!text) return ''
  let html = text

  html = html.replace(/<br\s*\/?>\s*\n/g, '\n')

  html = html.replace(/\n*#### (.+?)\n*/g, '\n<h4>$1</h4>\n')
  html = html.replace(/\n*### (.+?)\n*/g, '\n<h3>$1</h3>\n')
  html = html.replace(/\n*## (.+?)\n*/g, '\n<h2>$1</h2>\n')
  html = html.replace(/\n*# (.+?)\n*/g, '\n<h1>$1</h1>\n')

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>')

  html = html.replace(/^- \[x\] (.+)$/gim, '<li class="md-task-list-item checked"><input type="checkbox" checked disabled><span>$1</span></li>')
  html = html.replace(/^- \[ \] (.+)$/gim, '<li class="md-task-list-item"><input type="checkbox" disabled><span>$1</span></li>')
  html = html.replace(/(<li class="md-task-list-item.*<\/li>\n?)+/g, '<ul class="md-task-list">$&</ul>')

  html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>')
  html = html.replace(/(<oli>.*<\/oli>\n?)+/g, '<ol class="md-ol">$&</ol>')
  html = html.replace(/<\/?oli>/g, (m) => m === '<oli>' ? '<li>' : '</li>')

  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="md-ul">$&</ul>')

  html = html.replace(/^---$/gm, '<hr class="md-hr">')

  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  html = html.replace(/\n{3,}/g, '\n\n')
  html = html.replace(/\n/g, '<br>')
  html = html.replace(/<br><(h[1-4])>/g, '<$1>')
  html = html.replace(/<\/(h[1-4])><br>/g, '</$1>')
  html = html.replace(/<br><(blockquote)>/g, '<$1>')
  html = html.replace(/<\/(blockquote)><br>/g, '</$1>')
  html = html.replace(/<br><(ul|ol)/g, '<$1')
  html = html.replace(/<\/(ul|ol)><br>/g, '</$1>')
  html = html.replace(/<br><hr/g, '<hr')
  html = html.replace(/<hr[^>]*><br>/g, '<hr class="md-hr">')
  html = html.replace(/<br><(li)/g, '<$1')
  html = html.replace(/<\/(li)><br>/g, '</$1>')

  return html
}

const parseTable = (text) => {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return null

  const headerLine = lines[0]
  const separatorLine = lines[1]
  const dataLines = lines.slice(2)

  if (!separatorLine.includes('|') || !/^[|:\-\s]+$/.test(separatorLine.replace(/\|/g, ''))) {
    return null
  }

  const parseRow = (line) => {
    return line.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
  }

  const headers = parseRow(headerLine)
  const rows = dataLines.map(parseRow)

  return { headers, rows }
}

const parseTextWithMedia = (text) => {
  if (!text) return []
  const segments = []
  const regex = /!\[([^\]]*)\]\(([^)]+)\)|(https?:\/\/[^\s<>"')\]]+\.(mp4|webm|mov)(?:\?[^\s<>"')]*)?)/gi

  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const textContent = text.substring(lastIndex, match.index)
      if (textContent.trim()) {
        segments.push({ type: 'text', content: textContent })
      }
    }

    if (match[1] !== undefined) {
      segments.push({ type: 'image', url: match[2], alt: match[1] || '' })
    } else {
      segments.push({ type: 'video', url: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    const textContent = text.substring(lastIndex)
    if (textContent.trim()) {
      segments.push({ type: 'text', content: textContent })
    }
  }

  return segments
}

const parsedParts = computed(() => {
  if (!props.content) return []

  const parts = []
  let content = props.content

  const tableRegex = /(\|.+\|\n)+/g
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g

  const allMatches = []

  let match
  codeBlockRegex.lastIndex = 0
  while ((match = codeBlockRegex.exec(content)) !== null) {
    allMatches.push({
      type: 'code',
      start: match.index,
      end: match.index + match[0].length,
      language: match[1] || 'plaintext',
      content: match[2]
    })
  }

  tableRegex.lastIndex = 0
  while ((match = tableRegex.exec(content)) !== null) {
    if (allMatches.some(m => match.index >= m.start && match.index < m.end)) continue
    const tableData = parseTable(match[1])
    if (tableData) {
      allMatches.push({
        type: 'table',
        start: match.index,
        end: match.index + match[0].length,
        ...tableData
      })
    }
  }

  allMatches.sort((a, b) => a.start - b.start)

  let lastIndex = 0
  for (const m of allMatches) {
    if (m.start > lastIndex) {
      const textContent = content.substring(lastIndex, m.start)
      if (textContent.trim()) {
        const mediaParts = parseTextWithMedia(textContent)
        for (const p of mediaParts) {
          if (p.type === 'text') {
            parts.push({ type: 'text', content: parseMarkdown(p.content) })
          } else {
            parts.push(p)
          }
        }
      }
    }

    if (m.type === 'code') {
      parts.push({
        type: 'code',
        language: m.language,
        content: m.content
      })
    } else if (m.type === 'table') {
      parts.push({
        type: 'table',
        headers: m.headers,
        rows: m.rows
      })
    }

    lastIndex = m.end
  }

  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex)
    if (textContent.trim()) {
      const mediaParts = parseTextWithMedia(textContent)
      for (const p of mediaParts) {
        if (p.type === 'text') {
          parts.push({ type: 'text', content: parseMarkdown(p.content) })
        } else {
          parts.push(p)
        }
      }
    }
  }

  return parts
})

const handleCopy = (success) => {
  emit('copy', success)
}
</script>

<style scoped>
.message-content-renderer {
  line-height: 1.75;
  word-break: break-word;
  color: var(--text-primary);
  font-size: 14px;
}

/* ── Headings ── */
.text-part :deep(h1) {
  font-size: 22px;
  font-weight: 700;
  margin: 24px 0 12px 0;
  line-height: 1.3;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border-color);
}
.text-part :deep(h2) {
  font-size: 18px;
  font-weight: 600;
  margin: 20px 0 10px 0;
  line-height: 1.35;
  color: var(--text-primary);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-color);
}
.text-part :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
  line-height: 1.4;
  color: var(--text-primary);
}
.text-part :deep(h4) {
  font-size: 14px;
  font-weight: 600;
  margin: 14px 0 6px 0;
  line-height: 1.4;
  color: var(--text-primary);
}

/* ── Paragraphs ── */
.text-part :deep(p) {
  margin: 10px 0;
  line-height: 1.75;
}

/* ── Unordered lists ── */
.text-part :deep(.md-ul) {
  margin: 10px 0;
  padding-left: 24px;
  list-style-type: disc;
}
.text-part :deep(.md-ul .md-ul) {
  list-style-type: circle;
  margin: 4px 0;
}
.text-part :deep(.md-ul .md-ul .md-ul) {
  list-style-type: square;
}

/* ── Ordered lists ── */
.text-part :deep(.md-ol) {
  margin: 10px 0;
  padding-left: 24px;
  list-style-type: decimal;
}
.text-part :deep(.md-ol .md-ol) {
  list-style-type: lower-alpha;
  margin: 4px 0;
}

.text-part :deep(li) {
  margin: 4px 0;
  line-height: 1.65;
  padding-left: 4px;
}

/* ── Task lists ── */
.text-part :deep(.md-task-list) {
  list-style: none;
  padding-left: 4px;
  margin: 10px 0;
}
.text-part :deep(.md-task-list-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
  line-height: 1.65;
}
.text-part :deep(.md-task-list-item input[type="checkbox"]) {
  appearance: none;
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-radius: 3px;
  cursor: default;
  flex-shrink: 0;
  position: relative;
  transition: all 0.2s;
}
.text-part :deep(.md-task-list-item.checked input[type="checkbox"]) {
  background: var(--primary-color);
  border-color: var(--primary-color);
}
.text-part :deep(.md-task-list-item.checked input[type="checkbox"]::after) {
  content: '';
  position: absolute;
  left: 4px;
  top: 0px;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.text-part :deep(.md-task-list-item span) {
  flex: 1;
}
.text-part :deep(.md-task-list-item.checked span) {
  text-decoration: line-through;
  opacity: 0.65;
}

/* ── Blockquotes ── */
.text-part :deep(blockquote) {
  margin: 14px 0;
  padding: 12px 18px;
  border-left: 4px solid var(--primary-color);
  background: var(--bg-color);
  border-radius: 0 8px 8px 0;
  color: var(--text-secondary);
}
.text-part :deep(blockquote p) {
  margin: 4px 0;
}
.text-part :deep(blockquote blockquote) {
  margin: 8px 0;
  margin-left: 12px;
  opacity: 0.85;
}

/* ── Links ── */
.text-part :deep(a) {
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px dashed var(--primary-color);
  transition: all 0.2s;
}
.text-part :deep(a:hover) {
  border-bottom-style: solid;
  opacity: 0.85;
}

/* ── Horizontal rule ── */
.text-part :deep(.md-hr) {
  margin: 20px 0;
  border: none;
  border-top: 2px solid var(--border-color);
}

/* ── Inline code ── */
.text-part :deep(.md-inline-code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  color: #d63384;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.text-part :deep(.dark .md-inline-code),
.text-part :deep([data-theme="dark"] .md-inline-code) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f0a8c8;
}

/* ── Bold & Italic ── */
.text-part :deep(strong) {
  font-weight: 600;
  color: var(--text-primary);
}
.text-part :deep(em) {
  font-style: italic;
  color: var(--text-secondary);
}
.text-part :deep(del) {
  text-decoration: line-through;
  opacity: 0.6;
}

/* ── Table ── */
.md-table-scroll {
  overflow-x: auto;
  margin: 14px 0;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.md-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  overflow: hidden;
}

.md-table th {
  background: var(--bg-color);
  font-weight: 600;
  text-align: left;
  padding: 10px 14px;
  border-bottom: 2px solid var(--border-color);
  color: var(--text-primary);
  white-space: nowrap;
}

.md-table td {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.md-table tr:last-child td {
  border-bottom: none;
}

.md-table tr:hover td {
  background: rgba(0, 0, 0, 0.02);
}

.md-table tr:nth-child(even) td {
  background: rgba(0, 0, 0, 0.015);
}

/* ── Images from markdown ── */
.md-image-container {
  position: relative;
  max-width: 100%;
  margin: 14px 0;
  border-radius: 10px;
  overflow: hidden;
}

.md-image {
  display: block;
  width: 100%;
  max-width: 100%;
  max-height: 480px;
  object-fit: contain;
  object-position: left;
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: opacity 0.3s ease, transform 0.2s, box-shadow 0.2s;
  opacity: 0;
  background: var(--bg-color);
}

.md-image.is-loaded {
  opacity: 1;
}

.md-image:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* Image loading skeleton */
.md-image-skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
  border-radius: 10px;
  min-height: 120px;
  overflow: hidden;
}

.skeleton-pulse {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(128, 128, 128, 0.08) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.8s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton-icon {
  position: relative;
  opacity: 0.25;
}

/* Image hover actions */
.md-image-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.md-image-container:hover .md-image-actions {
  opacity: 1;
}

/* ── Video ── */
.md-video-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
  margin: 14px 0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.md-video {
  display: block;
  max-width: 100%;
  max-height: 500px;
  border-radius: 10px;
  background: #000;
}

.md-video-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.md-video-container:hover .md-video-actions {
  opacity: 1;
}

.md-video-error {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  text-align: center;
}

/* ── Media action buttons ── */
.md-media-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.15s;
}

.md-media-btn:hover {
  background: #fff;
  transform: scale(1.1);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
}

.md-media-btn:active {
  transform: scale(0.95);
}

/* ── Inline images (tables etc.) ── */
.text-part :deep(.md-inline-img) {
  max-width: 100%;
  max-height: 200px;
  border-radius: 6px;
  vertical-align: middle;
  margin: 0 4px;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .md-image {
    max-height: 320px;
  }
  .md-video {
    max-height: 320px;
  }
}
</style>
