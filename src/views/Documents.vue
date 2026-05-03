<template>
  <div class="documents-page">
    <div class="page-header">
      <n-h2>文档管理</n-h2>
      <n-space align="center">
        <span class="theme-label">预览主题:</span>
        <n-select
          v-model:value="previewTheme"
          size="small"
          style="width: 110px"
          :options="previewThemeOptions"
        />
        <span class="theme-label">代码主题:</span>
        <n-select
          v-model:value="codeTheme"
          size="small"
          style="width: 110px"
          :options="codeThemeOptions"
        />
        <n-button @click="triggerFileUpload" :loading="uploading" :disabled="isAiWorking">
          <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
          导入文档
        </n-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".pdf,.docx,.xlsx,.xls,.html,.htm,.csv,.json,.xml,.md,.markdown"
          multiple
          style="display: none"
          @change="handleFileUpload"
        />
        <n-button @click="openFolderModal(currentFolderId)" :disabled="isAiWorking">
          <template #icon><n-icon><FolderOutline /></n-icon></template>
          新建文件夹
        </n-button>
        <n-button type="primary" @click="createNewDoc" :disabled="isAiWorking">
          <template #icon><n-icon><DocumentOutline /></n-icon></template>
          {{ currentFolderId ? '在当前文件夹新建' : '新建文档' }}
        </n-button>
      </n-space>
    </div>

    <div class="two-column-layout">
      <div class="sidebar-panel">
        <div class="panel-section folder-section">
          <div class="section-header" @click="folderExpanded = !folderExpanded">
            <n-icon><FolderOutline /></n-icon>
            <span>文件夹</span>
            <n-icon class="expand-icon" :class="{ expanded: folderExpanded }">
              <ChevronDownOutline />
            </n-icon>
          </div>
          <div class="section-content folder-tree" v-show="folderExpanded">
            <div 
              class="tree-item root-item"
              :class="{ active: currentFolderId === null, 'drag-over': isRootDragOver, disabled: isAiWorking }"
              @click="isAiWorking ? null : selectFolder(null)"
              @dragover.prevent="handleRootDragOver"
              @dragleave="handleRootDragLeave"
              @drop.prevent="handleRootDrop"
            >
              <n-icon size="16"><FolderOutline /></n-icon>
              <span class="folder-name">全部文档</span>
              <div class="folder-actions" @click.stop>
                <n-button text size="tiny" @click.stop="openFolderModal(null)" :disabled="isAiWorking">
                  <template #icon><n-icon size="14"><AddCircleOutline /></n-icon></template>
                </n-button>
              </div>
            </div>
            <folder-tree-node
              v-for="folder in folderTree"
              :key="folder.id"
              :folder="folder"
              :level="0"
              :current-folder-id="currentFolderId"
              :expanded-folders="expandedFolders"
              :disabled="isAiWorking"
              @select="handleFolderSelect"
              @edit="editFolder"
              @delete="deleteFolder"
              @toggle-expand="toggleFolderExpand"
              @add-sub="openFolderModal"
              @move-doc="moveDocToFolder"
            />
          </div>
        </div>

        <div class="panel-section doc-list-section">
          <div class="section-header">
            <n-icon><DocumentOutline /></n-icon>
            <span>文档列表</span>
            <n-text depth="3" style="font-size: 12px">{{ filteredDocs.length }} 个</n-text>
            <n-button 
              quaternary 
              size="tiny" 
              :type="showFavoritesOnly ? 'warning' : 'default'"
              @click="showFavoritesOnly = !showFavoritesOnly"
              style="margin-left: auto"
            >
              <template #icon><n-icon><Star /></n-icon></template>
            </n-button>
          </div>
          <div class="section-content">
            <n-input
              v-model:value="searchQuery"
              placeholder="搜索文档..."
              clearable
              size="small"
              style="margin-bottom: 8px"
            >
              <template #prefix><n-icon><SearchOutline /></n-icon></template>
            </n-input>

            <n-empty v-if="filteredDocs.length === 0" description="暂无文档" size="small" />

            <div class="doc-list">
              <div
                v-for="doc in filteredDocs"
                :key="doc.id"
                class="doc-item"
                :class="{ active: currentDoc?.id === doc.id, disabled: isAiWorking }"
                draggable="true"
                @click="isAiWorking ? null : selectDoc(doc)"
                @dragstart="handleDragStart($event, doc)"
                @dragend="handleDragEnd"
              >
                <div class="doc-title">
                  <n-icon v-if="doc.is_favorite" color="#faad14" size="14"><Star /></n-icon>
                  <span>{{ doc.title || '无标题' }}</span>
                </div>
                <div class="doc-meta">
                  <span>{{ formatDate(doc.updated_at) }}</span>
                  <span v-if="doc.word_count">{{ doc.word_count }} 字</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-panel" v-if="currentDoc">
        <template v-if="!isEditMode">
          <div class="preview-header">
            <div class="preview-title-row">
              <h1 class="preview-title">{{ currentDoc.title || '无标题' }}</h1>
              <n-space :size="8">
                <n-button quaternary circle :type="showCatalog ? 'primary' : 'default'" @click="showCatalog = !showCatalog" :disabled="isAiWorking">
                  <template #icon><n-icon size="18"><ListOutline /></n-icon></template>
                </n-button>
                <n-button quaternary circle @click="toggleFavorite" :disabled="isAiWorking">
                  <template #icon>
                    <n-icon :color="currentDoc.is_favorite ? '#faad14' : undefined" size="18">
                      <Star v-if="currentDoc.is_favorite" />
                      <StarOutline v-else />
                    </n-icon>
                  </template>
                </n-button>
                <n-button quaternary circle type="primary" @click="enterEditMode" :disabled="isAiWorking">
                  <template #icon><n-icon size="18"><CreateOutline /></n-icon></template>
                </n-button>
                <n-button quaternary circle type="error" @click="deleteDoc" :disabled="isAiWorking">
                  <template #icon><n-icon size="18"><TrashOutline /></n-icon></template>
                </n-button>
              </n-space>
            </div>
            <div class="preview-meta">
              <div class="meta-item" v-if="currentDoc.source_url">
                <n-icon size="14"><LinkOutline /></n-icon>
                <a :href="currentDoc.source_url" target="_blank" class="source-link">
                  {{ currentDoc.source_url }}
                </a>
              </div>
              <div class="meta-item">
                <n-icon size="14"><TimeOutline /></n-icon>
                <span>{{ formatFullDate(currentDoc.updated_at) }}</span>
              </div>
              <div class="meta-item" v-if="currentDoc.word_count">
                <n-icon size="14"><TextOutline /></n-icon>
                <span>{{ currentDoc.word_count }} 字</span>
              </div>
              <div class="meta-item" v-if="getFolderPath(currentDoc.folder_id)">
                <n-icon size="14"><FolderOutline /></n-icon>
                <span>{{ getFolderPath(currentDoc.folder_id) }}</span>
              </div>
            </div>
          </div>
          <div class="preview-body">
            <CatalogSidebar
              :content="currentDoc.content"
              :scroll-container="previewScrollEl"
              :editor-id="previewId"
              :heading-id-generator="mdHeadingId"
              v-show="showCatalog"
            />
            <div class="preview-main">
              <div class="preview-content" ref="previewScrollEl">
                <MdPreview
                  :id="previewId"
                  :modelValue="currentDoc.content"
                  :theme="editorTheme"
                  :previewTheme="previewTheme"
                  :codeTheme="codeTheme"
                  :mdHeadingId="mdHeadingId"
                  :sanitize="sanitizeHtml"
                  class="md-preview"
                />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="edit-header">
            <div class="edit-title-row">
              <n-input
                v-model:value="currentDoc.title"
                placeholder="输入文档标题..."
                size="large"
                class="title-input"
                :disabled="isAiWorking"
              />
              <n-space :size="8">
                <n-button quaternary circle :type="showCatalog ? 'primary' : 'default'" @click="showCatalog = !showCatalog" :disabled="isAiWorking">
                  <template #icon><n-icon size="18"><ListOutline /></n-icon></template>
                </n-button>
                <n-button @click="formatDocument" :loading="formattingDoc" type="info" :disabled="importingUrl">
                  <template #icon><n-icon><SparklesOutline /></n-icon></template>
                  AI整理
                </n-button>
                <n-button @click="cancelEdit" :disabled="isAiWorking">取消</n-button>
                <n-button type="primary" @click="saveDoc" :loading="saving" :disabled="isAiWorking">
                  <template #icon><n-icon><SaveOutline /></n-icon></template>
                  保存
                </n-button>
              </n-space>
            </div>
            <div class="edit-meta-row">
              <div class="meta-item">
                <n-icon size="14"><LinkOutline /></n-icon>
                <n-input
                  v-model:value="currentDoc.source_url"
                  placeholder="原文链接（可选）"
                  size="small"
                  style="flex: 1"
                  :disabled="isAiWorking"
                />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-checkbox 
                      v-model:checked="usePuppeteerMode"
                      :disabled="importingUrl"
                      style="margin-left: 8px;"
                    >
                      反爬模式
                    </n-checkbox>
                  </template>
                  启用浏览器模式，可处理有反爬保护的网站（需要安装Chrome）
                </n-tooltip>
                <n-button 
                  type="primary" 
                  size="small" 
                  @click="importFromUrl" 
                  :loading="importingUrl"
                  :disabled="!currentDoc.source_url || formattingDoc"
                >
                  <template #icon><n-icon><CloudDownloadOutline /></n-icon></template>
                  AI导入
                </n-button>
              </div>
            </div>
          </div>
          <div class="editor-body">
            <div class="editor-main">
              <MdEditor
                ref="editorRef"
                v-model="currentDoc.content"
                :theme="editorTheme"
                :previewTheme="previewTheme"
                :codeTheme="codeTheme"
                :toolbars="editorToolbars"
                :mdHeadingId="mdHeadingId"
                :sanitize="sanitizeHtml"
                class="md-editor"
                @change="onContentChange"
                @save="saveDoc"
                @uploadImg="handleUploadImg"
              />
            </div>
          </div>
        </template>
      </div>

      <div class="empty-content" v-else>
        <div class="empty-icon">
          <n-icon size="64" :depth="3"><DocumentOutline /></n-icon>
        </div>
        <n-text depth="3" style="font-size: 16px">选择或新建一个文档开始编辑</n-text>
        <n-button type="primary" size="large" @click="createNewDoc" style="margin-top: 16px">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          新建文档
        </n-button>
      </div>
    </div>

    <n-modal v-model:show="showFolderModal" preset="dialog" :title="editingFolder ? '编辑文件夹' : '新建文件夹'">
      <n-form :model="folderForm">
        <n-form-item label="文件夹名称">
          <n-input v-model:value="folderForm.name" placeholder="输入文件夹名称" />
        </n-form-item>
        <n-form-item label="父文件夹" v-if="!editingFolder">
          <n-select
            v-model:value="folderForm.parent_id"
            :options="folderTreeOptions"
            placeholder="选择父文件夹（可选）"
            clearable
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-button @click="closeFolderModal">取消</n-button>
        <n-button type="primary" @click="saveFolder" :loading="savingFolder">确定</n-button>
      </template>
    </n-modal>

    <n-modal v-model:show="showImportPreview" preset="card" title="预览导入文档" style="width: 800px; max-width: 90vw;">
      <div class="import-preview-content">
        <n-input
          v-model:value="importPreviewData.title"
          placeholder="文档标题"
          size="large"
          style="margin-bottom: 16px"
        />
        <div class="preview-label">内容预览：</div>
        <div class="preview-scroll">
          <MdPreview
            :modelValue="importPreviewData.content"
            :theme="editorTheme"
            :previewTheme="previewTheme"
            :codeTheme="codeTheme"
            :sanitize="sanitizeHtml"
            class="md-preview"
          />
        </div>
        <div class="preview-meta-info">
          <n-text depth="3">字数：{{ importPreviewData.content?.replace(/\s/g, '').length || 0 }} 字</n-text>
        </div>
      </div>
      <template #footer>
        <n-space justify="end">
          <n-button @click="cancelImportPreview">取消</n-button>
          <n-button type="primary" @click="confirmImportPreview" :loading="importingPreview">
            确认导入
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import {
  NH2, NSpace, NButton, NIcon, NInput, NText, NEmpty, NModal, NForm, NFormItem,
  NSelect, NBadge, useMessage, useDialog
} from 'naive-ui'
import {
  FolderOutline, DocumentOutline, SearchOutline, Star, StarOutline,
  CreateOutline, TrashOutline, LinkOutline, ChevronDownOutline,
  SaveOutline, TextOutline, AddOutline, TimeOutline, AddCircleOutline,
  ColorPaletteOutline, CodeSlashOutline, ListOutline, SparklesOutline, CloudDownloadOutline,
  ArrowUpOutline, CloudUploadOutline
} from '@vicons/ionicons5'
import { MdEditor, MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { documentApi } from '../api/documents'
import { docFolderApi } from '../api/doc-folders'
import { aiApi } from '../api/ai'
import FolderTreeNode from '../components/FolderTreeNode.vue'
import CatalogSidebar from '../components/CatalogSidebar.vue'

const message = useMessage()
const dialog = useDialog()
const route = useRoute()

const documents = ref([])
const folderTree = ref([])
const flatFolders = ref([])
const currentDoc = ref(null)
const currentFolderId = ref(null)
const searchQuery = ref('')
const showFavoritesOnly = ref(false)
const saving = ref(false)
const uploading = ref(false)
const fileInputRef = ref(null)
const showFolderModal = ref(false)
const savingFolder = ref(false)
const editingFolder = ref(null)
const folderForm = ref({ name: '', parent_id: null })
const folderExpanded = ref(true)
const expandedFolders = ref(new Set())
const isEditMode = ref(false)
const originalDoc = ref(null)
const draggedDoc = ref(null)
const isRootDragOver = ref(false)

const editorTheme = ref('light')
const previewTheme = ref(localStorage.getItem('md-preview-theme') || 'github')
const codeTheme = ref(localStorage.getItem('md-code-theme') || 'github')
const showImportPreview = ref(false)
const importPreviewData = ref({ title: '', content: '' })
const importingPreview = ref(false)
const pendingImportFiles = ref([])
const showCatalog = ref(true)
const previewId = 'doc-preview'
const formattingDoc = ref(false)
const importingUrl = ref(false)
const usePuppeteerMode = ref(false)
const previewScrollEl = ref(null)
const editorRef = ref(null)
const aiAbortController = ref(null)

const isAiWorking = computed(() => formattingDoc.value || importingUrl.value)

const mdHeadingId = ({ text, level, index }) => {
  return `heading-${index}-${level}-${text.replace(/\s+/g, '-').substring(0, 20)}`
}

const sanitizeHtml = (html) => {
  return html.replace(/<img([^>]*)>/gi, (match, attrs) => {
    if (attrs.includes('referrerpolicy=')) {
      return match
    }
    return `<img${attrs} referrerpolicy="no-referrer">`
  })
}

const scrollToEditorBottom = (() => {
  let lastScrollTime = 0
  let lastContentLength = 0
  const throttleMs = 200
  
  return () => {
    const now = Date.now()
    if (now - lastScrollTime < throttleMs) {
      return
    }
    
    const currentLength = currentDoc.value?.content?.length || 0
    if (currentLength - lastContentLength < 50) {
      return
    }
    
    lastScrollTime = now
    lastContentLength = currentLength
    
    nextTick(() => {
      requestAnimationFrame(() => {
        const editorEl = document.querySelector('.md-editor')
        if (!editorEl) return
        
        const textarea = editorEl.querySelector('textarea')
        if (textarea) {
          const scrollHeight = textarea.scrollHeight
          const clientHeight = textarea.clientHeight
          const currentScroll = textarea.scrollTop
          const distanceToBottom = scrollHeight - currentScroll - clientHeight
          
          if (distanceToBottom < clientHeight * 0.3) {
            textarea.scrollTop = scrollHeight
          }
        }
        
        const previewEl = editorEl.querySelector('.md-editor-preview-wrapper')
        if (previewEl) {
          const scrollHeight = previewEl.scrollHeight
          const clientHeight = previewEl.clientHeight
          const currentScroll = previewEl.scrollTop
          const distanceToBottom = scrollHeight - currentScroll - clientHeight
          
          if (distanceToBottom < clientHeight * 0.3) {
            previewEl.scrollTop = scrollHeight
          }
        }
      })
    })
  }
})()

const editorToolbars = [
  'bold', 'underline', 'italic', 'strikeThrough',
  '-',
  'title', 'sub', 'sup', 'quote',
  '-',
  'unorderedList', 'orderedList', 'task',
  '-',
  'codeRow', 'code',
  '-',
  'link', 'image', 'table',
  '-',
  'revoke', 'next',
  '=',
  'pageFullscreen', 'fullscreen', 'preview', 'previewOnly'
]

const previewThemeOptions = [
  { label: 'Default', value: 'default' },
  { label: 'GitHub', value: 'github' },
  { label: 'VuePress', value: 'vuepress' },
  { label: 'Cute', value: 'mk-cute' },
  { label: 'Smart Blue', value: 'smart-blue' },
  { label: 'Cyanosis', value: 'cyanosis' }
]

const codeThemeOptions = [
  { label: 'Atom', value: 'atom' },
  { label: 'GitHub', value: 'github' },
  { label: 'A11y', value: 'a11y' },
  { label: 'Gradient', value: 'gradient' },
  { label: 'Kimbie', value: 'kimbie' },
  { label: 'Paraiso', value: 'paraiso' },
  { label: 'QtCreator', value: 'qtcreator' },
  { label: 'StackOverflow', value: 'stackoverflow' }
]

const buildTreeOptions = (folders, level = 0) => {
  const options = []
  for (const folder of folders) {
    const option = {
      label: '　'.repeat(level) + folder.name,
      value: folder.id
    }
    options.push(option)
    if (folder.children && folder.children.length > 0) {
      options.push(...buildTreeOptions(folder.children, level + 1))
    }
  }
  return options
}

const folderTreeOptions = computed(() => [
  { label: '无文件夹', value: null },
  ...buildTreeOptions(folderTree.value)
])

const filteredDocs = computed(() => {
  let result = documents.value
  
  if (showFavoritesOnly.value) {
    result = result.filter(d => d.is_favorite)
  }
  
  if (currentFolderId.value !== null) {
    const folderIds = getAllSubFolderIds(currentFolderId.value)
    folderIds.push(currentFolderId.value)
    result = result.filter(d => folderIds.includes(d.folder_id))
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(d => 
      d.title?.toLowerCase().includes(q) || 
      d.content?.toLowerCase().includes(q)
    )
  }
  
  return result.sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) {
      return b.is_favorite - a.is_favorite
    }
    return new Date(b.updated_at) - new Date(a.updated_at)
  })
})

const getAllSubFolderIds = (folderId) => {
  const ids = []
  const findChildren = (folders) => {
    for (const folder of folders) {
      if (folder.id === folderId && folder.children) {
        const getChildIds = (children) => {
          for (const child of children) {
            ids.push(child.id)
            if (child.children) {
              getChildIds(child.children)
            }
          }
        }
        getChildIds(folder.children)
      } else if (folder.children) {
        findChildren(folder.children)
      }
    }
  }
  findChildren(folderTree.value)
  return ids
}

const loadDocuments = async () => {
  try {
    const res = await documentApi.getAll()
    documents.value = res.data.data || []
    
    if (route.query.id) {
      const doc = documents.value.find(d => String(d.id) === String(route.query.id))
      if (doc) {
        selectDoc(doc)
      }
    }
  } catch (e) {
    console.error('加载文档失败:', e)
  }
}

const loadFolders = async () => {
  try {
    const [treeRes, flatRes] = await Promise.all([
      docFolderApi.getTree(),
      docFolderApi.getFlat()
    ])
    folderTree.value = treeRes.data.data || []
    flatFolders.value = flatRes.data.data || []
  } catch (e) {
    console.error('加载文件夹失败:', e)
  }
}

const selectFolder = (id) => {
  currentFolderId.value = id ? Number(id) : id
}

const handleFolderSelect = (id) => {
  if (isAiWorking.value) return
  selectFolder(id)
}

const toggleFolderExpand = (id) => {
  const folderId = Number(id)
  if (expandedFolders.value.has(folderId)) {
    expandedFolders.value.delete(folderId)
  } else {
    expandedFolders.value.add(folderId)
  }
}

const openFolderModal = (parentId) => {
  editingFolder.value = null
  folderForm.value = { 
    name: '', 
    parent_id: parentId || null 
  }
  showFolderModal.value = true
}

const editFolder = (folder) => {
  editingFolder.value = folder
  folderForm.value = { 
    name: folder.name, 
    parent_id: folder.parent_id || null 
  }
  showFolderModal.value = true
}

const deleteFolder = async (folder) => {
  const hasChildren = folder.children && folder.children.length > 0
  
  dialog.warning({
    title: '确认删除',
    content: hasChildren 
      ? `文件夹"${folder.name}"下有子文件夹，请先删除子文件夹。`
      : `确定要删除文件夹"${folder.name}"吗？文件夹内的文档将移至根目录。`,
    positiveText: hasChildren ? '知道了' : '删除',
    negativeText: hasChildren ? undefined : '取消',
    onPositiveClick: async () => {
      if (hasChildren) return
      
      try {
        await docFolderApi.delete(folder.id)
        message.success('删除成功')
        if (currentFolderId.value === folder.id) {
          currentFolderId.value = null
        }
        loadFolders()
        loadDocuments()
      } catch (e) {
        message.error(e.response?.data?.error || '删除失败')
      }
    }
  })
}

const closeFolderModal = () => {
  showFolderModal.value = false
  editingFolder.value = null
  folderForm.value = { name: '', parent_id: null }
}

const selectDoc = (doc) => {
  isEditMode.value = false
  currentDoc.value = { ...doc }
  originalDoc.value = { ...doc }
}

const createNewDoc = () => {
  isEditMode.value = true
  currentDoc.value = {
    title: '',
    content: '',
    content_type: 'markdown',
    folder_id: currentFolderId.value,
    source_url: '',
    is_favorite: 0
  }
  originalDoc.value = null
}

const triggerFileUpload = () => {
  fileInputRef.value?.click()
}

const handleFileUpload = async (e) => {
  const files = e.target.files
  if (!files || files.length === 0) return

  const convertedFiles = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file) continue
    
    try {
      uploading.value = true
      const ext = file.name.split('.').pop().toLowerCase()
      const isMarkdown = ['md', 'markdown'].includes(ext)
      
      let content, title
      
      if (isMarkdown) {
        content = await readFileContent(file)
        title = extractTitle(content) || file.name.replace(/\.(md|markdown)$/i, '')
      } else {
        const res = await documentApi.convert(file)
        content = res.data.data.content
        title = res.data.data.title || file.name.replace(/\.[^.]+$/, '')
      }
      
      convertedFiles.push({
        title,
        content,
        originalName: file.name
      })
    } catch (error) {
      console.error(`转换 ${file.name} 失败:`, error)
      const errorMsg = error.response?.data?.error || error.message || '未知错误'
      message.error(`${file.name} 转换失败: ${errorMsg}`)
    } finally {
      uploading.value = false
    }
  }

  e.target.value = ''
  
  if (convertedFiles.length === 0) return

  pendingImportFiles.value = convertedFiles
  importPreviewData.value = {
    title: convertedFiles[0].title,
    content: convertedFiles[0].content,
    index: 0
  }
  showImportPreview.value = true
}

const cancelImportPreview = () => {
  showImportPreview.value = false
  pendingImportFiles.value = []
  importPreviewData.value = { title: '', content: '' }
}

const confirmImportPreview = async () => {
  if (!importPreviewData.value.title) {
    message.warning('请输入标题')
    return
  }

  importingPreview.value = true
  try {
    const wordCount = importPreviewData.value.content?.replace(/\s/g, '').length || 0
    
    const docData = {
      title: importPreviewData.value.title,
      content: importPreviewData.value.content,
      content_type: 'markdown',
      folder_id: currentFolderId.value,
      source_url: '',
      is_favorite: 0,
      word_count: wordCount
    }

    await documentApi.create(docData)
    
    const currentIndex = importPreviewData.value.index || 0
    const remainingFiles = pendingImportFiles.value.slice(currentIndex + 1)
    
    if (remainingFiles.length > 0) {
      pendingImportFiles.value = remainingFiles
      importPreviewData.value = {
        title: remainingFiles[0].title,
        content: remainingFiles[0].content,
        index: 0
      }
      message.success(`已导入，还剩 ${remainingFiles.length} 个文档待确认`)
    } else {
      showImportPreview.value = false
      pendingImportFiles.value = []
      importPreviewData.value = { title: '', content: '' }
      message.success('文档导入成功')
    }
    
    loadDocuments()
  } catch (error) {
    console.error('导入文档失败:', error)
    message.error('导入文档失败')
  } finally {
    importingPreview.value = false
  }
}

const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file, 'UTF-8')
  })
}

const extractTitle = (content) => {
  const lines = content.split('\n')
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)$/)
    if (match) {
      return match[1].trim()
    }
  }
  return null
}

const enterEditMode = () => {
  originalDoc.value = { ...currentDoc.value }
  isEditMode.value = true
}

const cancelEdit = () => {
  if (originalDoc.value) {
    currentDoc.value = { ...originalDoc.value }
  }
  isEditMode.value = false
}

const saveDoc = async () => {
  if (!currentDoc.value?.title) {
    message.warning('请输入标题')
    return
  }
  
  saving.value = true
  try {
    const docData = {
      title: currentDoc.value.title,
      content: currentDoc.value.content,
      content_type: currentDoc.value.content_type || 'markdown',
      folder_id: currentDoc.value.folder_id,
      source_url: currentDoc.value.source_url || '',
      is_favorite: currentDoc.value.is_favorite || 0,
      word_count: currentDoc.value.content?.length || 0
    }
    
    if (currentDoc.value.id) {
      await documentApi.update(currentDoc.value.id, docData)
    } else {
      const res = await documentApi.create(docData)
      const newId = res.data?.data?.id
      if (newId) {
        currentDoc.value.id = newId
      }
    }
    
    message.success('保存成功')
    isEditMode.value = false
    originalDoc.value = { ...currentDoc.value }
    
    await loadDocuments()
    
    if (currentDoc.value?.id) {
      const savedDoc = documents.value.find(d => d.id === currentDoc.value.id)
      if (savedDoc) {
        currentDoc.value = { ...savedDoc }
        originalDoc.value = { ...savedDoc }
      }
    }
  } catch (e) {
    console.error('保存文档失败:', e)
    message.error(e.response?.data?.error || '保存失败')
  } finally {
    saving.value = false
  }
}

const deleteDoc = () => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个文档吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await documentApi.delete(currentDoc.value.id)
        documents.value = documents.value.filter(d => d.id !== currentDoc.value.id)
        currentDoc.value = null
        isEditMode.value = false
        message.success('删除成功')
      } catch (e) {
        message.error('删除失败')
      }
    }
  })
}

const toggleFavorite = async () => {
  currentDoc.value.is_favorite = currentDoc.value.is_favorite ? 0 : 1
  if (currentDoc.value.id) {
    await documentApi.update(currentDoc.value.id, { is_favorite: currentDoc.value.is_favorite })
    loadDocuments()
  }
}

const onContentChange = () => {
  currentDoc.value.word_count = currentDoc.value.content?.length || 0
}

const formatDocument = async () => {
  if (!currentDoc.value?.content) {
    message.warning('文档内容为空')
    return
  }
  
  formattingDoc.value = true
  const originalContent = currentDoc.value.content
  currentDoc.value.content = '正在整理中...\n'
  
  const base64Images = []
  const base64Regex = /!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+)\)/g
  let match
  while ((match = base64Regex.exec(originalContent)) !== null) {
    base64Images.push({
      placeholder: `__BASE64_IMAGE_${base64Images.length}__`,
      original: match[0],
      alt: match[1],
      data: match[2]
    })
  }
  
  let processedContent = originalContent
  base64Images.forEach((item) => {
    processedContent = processedContent.replace(item.original, `![${item.alt}](${item.placeholder})`)
  })
  
  aiAbortController.value = new AbortController()
  
  try {
    const response = await fetch('http://localhost:3000/api/ai/format-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: processedContent,
        title: currentDoc.value.title,
        stream: true
      }),
      signal: aiAbortController.value.signal
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || '请求失败')
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = ''
    
    const restoreBase64Images = (text) => {
      let restored = text
      base64Images.forEach((item) => {
        const escapedPlaceholder = item.placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedPlaceholder}\\)`, 'g')
        restored = restored.replace(pattern, `![$1](${item.data})`)
        restored = restored.replace(new RegExp(escapedPlaceholder, 'g'), item.data)
      })
      return restored
    }
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter(line => line.trim() !== '')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.error) {
              throw new Error(data.error)
            }
            if (data.content) {
              result += data.content
              currentDoc.value.content = restoreBase64Images(result)
              scrollToEditorBottom()
            }
            if (data.done) {
              currentDoc.value.content = restoreBase64Images(result)
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }
    }
    
    result = restoreBase64Images(result)
    currentDoc.value.content = result
    
    if (result) {
      message.success('文档整理完成')
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      message.info('已取消AI整理')
      currentDoc.value.content = originalContent
    } else {
      console.error('文档整理失败:', e)
      currentDoc.value.content = originalContent
      message.error(e.message || '文档整理失败')
    }
  } finally {
    formattingDoc.value = false
    aiAbortController.value = null
  }
}

const importFromUrl = async () => {
  if (!currentDoc.value?.source_url) {
    message.warning('请先输入网页URL')
    return
  }
  
  importingUrl.value = true
  const originalContent = currentDoc.value.content || ''
  currentDoc.value.content = '正在读取网页内容...\n'
  
  aiAbortController.value = new AbortController()
  
  try {
    let result = ''
    let isTruncated = false
    let continueFrom = null
    
    do {
      const response = await fetch('http://localhost:3000/api/ai/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: currentDoc.value.source_url,
          stream: true,
          continueFrom: continueFrom,
          usePuppeteer: usePuppeteerMode.value
        }),
        signal: aiAbortController.value.signal
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '请求失败')
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim() !== '')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.error) {
                throw new Error(data.error)
              }
              if (data.content) {
                result += data.content
                currentDoc.value.content = result
                scrollToEditorBottom()
              }
              if (data.truncated) {
                isTruncated = true
              }
              if (data.done) {
                isTruncated = false
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
      
      if (isTruncated && result.length > 0) {
        continueFrom = result.slice(-2000)
        currentDoc.value.content = result + '\n\n**正在继续生成...**\n'
      }
    } while (isTruncated)
    
    if (result) {
      if (!currentDoc.value.title) {
        const titleMatch = result.match(/^#\s+(.+)$/m)
        if (titleMatch) {
          currentDoc.value.title = titleMatch[1].trim()
        }
      }
      message.success('网页内容导入完成')
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      message.info('已取消AI导入')
      currentDoc.value.content = originalContent
    } else {
      console.error('导入网页失败:', e)
      currentDoc.value.content = originalContent
      message.error(e.message || '导入网页失败')
    }
  } finally {
    importingUrl.value = false
    aiAbortController.value = null
  }
}

const handleDragStart = (e, doc) => {
  draggedDoc.value = doc
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(doc.id))
}

const handleDragEnd = () => {
  draggedDoc.value = null
}

const handleRootDragOver = (e) => {
  if (e.dataTransfer.types.includes('text/plain')) {
    isRootDragOver.value = true
  }
}

const handleRootDragLeave = () => {
  isRootDragOver.value = false
}

const handleRootDrop = (e) => {
  isRootDragOver.value = false
  const docId = e.dataTransfer.getData('text/plain')
  if (docId) {
    moveDocToFolder({ docId: Number(docId), folderId: null })
  }
}

const moveDocToFolder = async ({ docId, folderId }) => {
  try {
    await documentApi.update(docId, { folder_id: folderId })
    message.success('移动成功')
    await loadDocuments()
    
    if (currentDoc.value?.id === docId) {
      const updatedDoc = documents.value.find(d => d.id === docId)
      if (updatedDoc) {
        currentDoc.value = { ...updatedDoc }
        originalDoc.value = { ...updatedDoc }
      }
    }
  } catch (e) {
    message.error('移动失败')
  }
}

const detectLanguage = (code) => {
  const patterns = [
    { lang: 'javascript', patterns: [/^\s*(const|let|var|function|class|import|export|async|await)\s/m, /=>\s*[{(]/m, /console\.(log|error|warn)/m] },
    { lang: 'typescript', patterns: [/:\s*(string|number|boolean|any|void|never)\b/m, /interface\s+\w+/m, /<\w+>/m, /^\s*(private|public|protected)\s/m] },
    { lang: 'python', patterns: [/^\s*(def|class|import|from)\s/m, /^\s*if\s+__name__\s*==\s*['"]__main__['"]/m, /:\s*$/m, /^\s*@\w+/m] },
    { lang: 'java', patterns: [/^\s*(public|private|protected)\s+class/m, /System\.(out|err)\.print/m, /public\s+static\s+void\s+main/m] },
    { lang: 'c', patterns: [/#include\s*<\w+\.h>/m, /int\s+main\s*\(/m, /printf\s*\(/m] },
    { lang: 'cpp', patterns: [/#include\s*<\w+>/m, /std::/m, /cout\s*<</m, /namespace\s+/m] },
    { lang: 'csharp', patterns: [/using\s+System/m, /namespace\s+\w+/m, /Console\.(Write|Read)/m, /public\s+class/m] },
    { lang: 'go', patterns: [/^\s*package\s+\w+/m, /func\s+\w+\s*\(/m, /import\s*\(/m, /fmt\.(Print|Sprintf)/m] },
    { lang: 'rust', patterns: [/^\s*(fn|let|mut|impl|struct|enum)\s/m, /println!\(/m, /use\s+std::/m] },
    { lang: 'php', patterns: [/<\?php/m, /\$\w+\s*=/m, /function\s+\w+\s*\(/m] },
    { lang: 'ruby', patterns: [/^\s*(def|class|module|require|end)\s/m, /@\w+\s*=/m, /puts\s+/m] },
    { lang: 'swift', patterns: [/^\s*(func|var|let|class|struct|enum)\s/m, /import\s+Foundation/m, /print\s*\(/m] },
    { lang: 'kotlin', patterns: [/^\s*(fun|val|var|class|object|data)\s/m, /println\s*\(/m] },
    { lang: 'sql', patterns: [/^\s*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\s/mi, /FROM\s+\w+/mi, /WHERE\s+/mi] },
    { lang: 'html', patterns: [/<!DOCTYPE\s+html>/i, /<html[\s>]/i, /<\/\w+>/m] },
    { lang: 'css', patterns: [/^\s*[\w.#][\w-]*\s*\{/m, /@media\s+/m, /:\s*\d+px/m] },
    { lang: 'scss', patterns: [/^\s*\$\w+\s*:/m, /@import\s+/m, /@mixin\s+/m] },
    { lang: 'less', patterns: [/@\w+\s*:/m, /@import\s+/m] },
    { lang: 'json', patterns: [/^\s*\{[\s\S]*\}\s*$/m, /"[\w]+"\s*:/m] },
    { lang: 'yaml', patterns: [/^\s*[\w-]+:\s*$/m, /^\s*-\s+\w+/m] },
    { lang: 'xml', patterns: [/^\s*<\?xml/m, /<\/[\w-]+>/m] },
    { lang: 'markdown', patterns: [/^\s*#+\s/m, /\[.+\]\(.+\)/m, /^\s*[-*+]\s/m] },
    { lang: 'shell', patterns: [/^\s*#!/m, /^\s*(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk)\s/m] },
    { lang: 'bash', patterns: [/^\s*#!/m, /^\s*(if|then|fi|for|do|done|case|esac)\s/m] },
    { lang: 'powershell', patterns: [/^\s*\$\w+\s*=/m, /-\w+\s+/m, /Write-Host/m] },
    { lang: 'dockerfile', patterns: [/^\s*(FROM|RUN|CMD|COPY|ADD|EXPOSE|ENV|WORKDIR)\s/mi] },
    { lang: 'vue', patterns: [/<template[\s>]/m, /<script[\s>]/m, /<style[\s>]/m] },
    { lang: 'react', patterns: [/import\s+React/m, /React\./m, /jsx/m] }
  ]
  
  for (const { lang, patterns: langPatterns } of patterns) {
    const matchCount = langPatterns.filter(p => p.test(code)).length
    if (matchCount >= 2) {
      return lang
    }
  }
  
  for (const { lang, patterns: langPatterns } of patterns) {
    if (langPatterns.some(p => p.test(code))) {
      return lang
    }
  }
  
  return ''
}

const handlePaste = (text) => {
  if (!text || typeof text !== 'string') return text
  
  const lines = text.split('\n')
  if (lines.length < 2) return text
  
  const looksLikeCode = (
    /[{}\[\]();]/.test(text) ||
    /^\s*(const|let|var|function|class|def|import|export|if|else|for|while|return|public|private|protected|package|func|fn)\s/m.test(text) ||
    /^\s{2,}/m.test(text) ||
    /[<>]=?|===|!==|&&|\|\||->|=>/.test(text) ||
    /['"`].*['"`]/.test(text) ||
    /^\s*#/.test(text)
  )
  
  if (!looksLikeCode) return text
  
  const language = detectLanguage(text)
  const codeBlock = `\`\`\`${language}\n${text}\n\`\`\``
  
  return codeBlock
}

const handleUploadImg = async (files, callback) => {
  const formData = new FormData()
  formData.append('file', files[0])
  
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
    const res = await fetch(`${apiBase}/uploads/image`, {
      method: 'POST',
      body: formData
    })
    
    const data = await res.json()
    
    if (data.data?.url) {
      const uploadUrl = data.data.url.startsWith('http')
        ? data.data.url
        : `${apiBase.replace(/\/api$/, '')}${data.data.url}`
      callback([uploadUrl])
    } else {
      message.error('上传失败')
    }
  } catch (e) {
    console.error('上传图片失败:', e)
    message.error('上传图片失败')
  }
}

const saveFolder = async () => {
  if (!folderForm.value.name) {
    message.warning('请输入文件夹名称')
    return
  }
  
  savingFolder.value = true
  try {
    if (editingFolder.value) {
      await docFolderApi.update(editingFolder.value.id, { name: folderForm.value.name })
    } else {
      await docFolderApi.create({ 
        name: folderForm.value.name,
        parent_id: folderForm.value.parent_id
      })
    }
    message.success('保存成功')
    closeFolderModal()
    loadFolders()
  } catch (e) {
    message.error('保存失败')
  } finally {
    savingFolder.value = false
  }
}

const getFolderPath = (folderId) => {
  if (!folderId) return ''
  
  const findPath = (folders, path = []) => {
    for (const folder of folders) {
      if (folder.id === folderId) {
        return [...path, folder.name].join(' / ')
      }
      if (folder.children) {
        const result = findPath(folder.children, [...path, folder.name])
        if (result) return result
      }
    }
    return null
  }
  
  return findPath(folderTree.value) || ''
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const formatFullDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

watch(showFolderModal, (val) => {
  if (!val) {
    editingFolder.value = null
    folderForm.value = { name: '', parent_id: null }
  }
})

watch(previewTheme, (val) => {
  localStorage.setItem('md-preview-theme', val)
})

watch(codeTheme, (val) => {
  localStorage.setItem('md-code-theme', val)
})

onMounted(() => {
  loadDocuments()
  loadFolders()
})

onUnmounted(() => {
  if (aiAbortController.value) {
    aiAbortController.value.abort()
    aiAbortController.value = null
  }
})
</script>

<style scoped>
.documents-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.theme-label {
  font-size: 13px;
  color: var(--text-color-3);
}

.two-column-layout {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.sidebar-panel {
  width: 280px;
  flex-shrink: 0;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.folder-section {
  flex: 0 0 auto;
  max-height: 45%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.doc-list-section {
  flex: 1;
  min-height: 0;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  flex-shrink: 0;
}

.section-header:hover {
  background: var(--bg-color);
}

.section-header .expand-icon {
  margin-left: auto;
  transition: transform 0.2s;
}

.section-header .expand-icon.expanded {
  transform: rotate(180deg);
}

.section-content {
  padding: 0 8px 8px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.folder-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
  max-height: 100%;
}

.root-item {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  flex-wrap: nowrap;
}

.root-item:hover {
  background: var(--bg-color);
}

.root-item.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.root-item .folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.root-item .folder-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: auto;
}

.root-item:hover .folder-actions {
  opacity: 1;
}

.root-item.drag-over {
  background: var(--primary-light);
  border: 2px dashed var(--primary-color);
}

.root-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.root-item.disabled:hover {
  background: transparent;
}

.root-item .n-badge {
  margin-left: 4px;
}

.doc-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.doc-item {
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  border-left: 3px solid transparent;
}

.doc-item:hover {
  background: var(--bg-color);
}

.doc-item.active {
  background: var(--primary-light);
  border-left-color: var(--primary-color);
}

.doc-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.doc-item.disabled:hover {
  background: transparent;
}

.doc-item .doc-title {
  font-weight: 500;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-item .doc-meta {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-color-3);
  display: flex;
  gap: 8px;
}

.content-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.preview-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.preview-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.preview-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
  color: var(--text-color);
}

.preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 12px;
}

.preview-meta .meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-color-3);
}

.source-link {
  color: var(--primary-color);
  text-decoration: none;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-link:hover {
  text-decoration: underline;
}

.preview-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.preview-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.preview-main .preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  position: relative;
}

.md-preview {
  background: transparent;
}

.edit-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.edit-title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-input {
  flex: 1;
}

.title-input :deep(.n-input__input-el) {
  font-size: 20px;
  font-weight: 600;
}

.edit-meta-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.edit-meta-row .meta-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-color-3);
  min-width: 0;
}

.edit-meta-row .meta-item .n-input {
  flex: 1;
  min-width: 200px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-color-3);
}

.editor-wrapper {
  flex: 1;
  overflow: hidden;
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.md-editor {
  height: 100%;
  border: none;
  border-radius: 0;
}

.md-editor :deep(.md-editor-toolbar-wrapper) {
  border-bottom: 1px solid var(--border-color);
}

.md-editor :deep(.md-editor-content) {
  height: calc(100% - 42px);
}

.md-editor :deep(.md-editor-input-wrapper) {
  background: var(--card-bg);
}

.md-editor :deep(.md-editor-preview-wrapper) {
  background: var(--card-bg);
}

.empty-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.empty-icon {
  margin-bottom: 16px;
}

.back-to-top-btn {
  position: absolute;
  right: 24px;
  bottom: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s;
  z-index: 10;
}

.back-to-top-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .sidebar-panel {
    width: 240px;
  }
  
  .edit-meta-row {
    flex-direction: column;
    align-items: flex-start;
  }
}

.import-preview-content {
  display: flex;
  flex-direction: column;
}

.preview-label {
  font-size: 13px;
  color: var(--text-color-3);
  margin-bottom: 8px;
}

.preview-scroll {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 12px;
  background: var(--bg-color);
}

.preview-meta-info {
  margin-top: 12px;
  text-align: right;
}
</style>