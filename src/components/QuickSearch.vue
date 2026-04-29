<template>
  <n-modal 
    v-model:show="showModal" 
    style="width: 560px;" 
    :mask-closable="true" 
    :trap-focus="false"
    :transform-origin="'center'"
    :block-scroll="false"
    :auto-focus="true"
    :close-on-esc="true"
    :display-directive="'show'"
  >
    <transition name="quick-search-fade" appear>
      <div class="command-palette" :class="{ 'dark-mode': isDarkMode }" v-if="showModal">
        <div class="command-input-wrapper">
          <n-icon size="20" class="search-icon"><SearchOutline /></n-icon>
          <input
            ref="searchInput"
            v-model="searchQuery"
            type="text"
            class="command-input"
            placeholder="搜索网站、密码、代码片段、文档..."
            @keydown="handleKeydown"
          />
        </div>

        <div class="command-list" v-if="filteredResults.length > 0" ref="commandListRef">
          <div 
            v-for="(item, index) in filteredResults" 
            :key="item.type + '-' + item.id"
            :ref="el => itemRefs[index] = el"
            :class="['command-item', { selected: index === selectedIndex }]"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = index"
          >
            <div class="command-icon">
              <n-avatar
                v-if="item.type === 'website' || item.type === 'bookmark'"
                :src="item.favicon"
                :size="18"
                round
              />
              <n-avatar
                v-else-if="item.type === 'app'"
                :src="item.favicon"
                :size="18"
                round
              />
              <n-icon v-else-if="item.type === 'password'" size="18"><KeyOutline /></n-icon>
              <n-icon v-else-if="item.type === 'document'" size="18"><DocumentOutline /></n-icon>
              <n-icon v-else-if="item.type === 'default-search'" size="18"><SearchOutline /></n-icon>
              <n-icon v-else-if="item.type === 'direct-url'" size="18"><GlobeOutline /></n-icon>
              <n-icon v-else size="18"><CodeSlashOutline /></n-icon>
            </div>
            <div class="command-content">
              <div class="command-name">{{ item.name }}</div>
              <div class="command-desc" v-if="item.subtitle">{{ item.subtitle }}</div>
            </div>
            <div class="command-shortcut" v-if="item.typeLabel">
              {{ item.typeLabel }}
            </div>
          </div>
        </div>

        <div class="command-empty" v-else-if="searchQuery">
          <n-text depth="3">未找到匹配的结果</n-text>
        </div>

        <div class="command-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> 导航</span>
          <span><kbd>Enter</kbd> 打开</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </transition>
  </n-modal>

  <n-modal v-model:show="showDetail" preset="card" :title="detailTitle" style="width: 500px;">
    <template v-if="detailItem?.type === 'password'">
      <n-descriptions :column="1" label-placement="left" bordered>
        <n-descriptions-item label="标题">
          {{ detailItem.title || detailItem.website_name || '未命名' }}
        </n-descriptions-item>
        <n-descriptions-item label="账号">
          {{ detailItem.username }}
        </n-descriptions-item>
        <n-descriptions-item label="密码">
          <n-space align="center">
            <n-text code>{{ showPassword ? detailItem.password : '••••••••' }}</n-text>
            <n-button size="small" @click="togglePassword">
              {{ showPassword ? '隐藏' : '显示' }}
            </n-button>
            <n-button size="small" @click="copyPassword">复制</n-button>
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item v-if="detailItem.website_url" label="网站">
          {{ detailItem.website_url }}
        </n-descriptions-item>
        <n-descriptions-item v-if="detailItem.notes" label="备注">
          {{ detailItem.notes }}
        </n-descriptions-item>
      </n-descriptions>
    </template>
    <template v-else-if="detailItem?.type === 'snippet'">
      <n-descriptions :column="1" label-placement="left" bordered>
        <n-descriptions-item label="标题">
          {{ detailItem.title }}
        </n-descriptions-item>
        <n-descriptions-item label="语言">
          {{ detailItem.language }}
        </n-descriptions-item>
        <n-descriptions-item v-if="detailItem.description" label="描述">
          {{ detailItem.description }}
        </n-descriptions-item>
        <n-descriptions-item v-if="detailItem.tags?.length" label="标签">
          <n-space>
            <n-tag v-for="tag in detailItem.tags" :key="tag" size="small">{{ tag }}</n-tag>
          </n-space>
        </n-descriptions-item>
        <n-descriptions-item label="代码">
          <n-code :code="detailItem.code" :language="detailItem.language?.toLowerCase()" />
        </n-descriptions-item>
      </n-descriptions>
    </template>
    <template #footer>
      <n-space justify="end">
        <n-button @click="showDetail = false">关闭</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { NModal, NIcon, NTag, NDescriptions, NDescriptionsItem, NText, NButton, NSpace, NCode, NAvatar, useMessage } from 'naive-ui'
import { SearchOutline, KeyOutline, CodeSlashOutline, DocumentOutline, GlobeOutline } from '@vicons/ionicons5'
import { useTheme } from '../store/theme'
import { useData } from '../store/data'

const router = useRouter()
const emit = defineEmits(['close', 'select'])
const { isDarkMode } = useTheme()
const { websites, passwords, snippets, documents, loadAllData } = useData()

const message = useMessage()
const showModal = ref(true)
const searchQuery = ref('')
const searchInput = ref(null)
const selectedIndex = ref(0)
const loading = ref(false)
const itemRefs = ref([])
const commandListRef = ref(null)

const showDetail = ref(false)
const detailItem = ref(null)
const showPassword = ref(false)

const truncateUrl = (url, maxLength = 40) => {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    const display = urlObj.hostname + urlObj.pathname
    if (display.length <= maxLength) return display
    return display.substring(0, maxLength) + '...'
  } catch {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }
}

const detailTitle = computed(() => {
  if (!detailItem.value) return ''
  if (detailItem.value.type === 'password') return '密码详情'
  if (detailItem.value.type === 'snippet') return '代码片段详情'
  return ''
})

const isValidUrl = (str) => {
  try {
    if (str.startsWith('http://') || str.startsWith('https://')) {
      new URL(str)
      return true
    }
    const urlWithProtocol = 'https://' + str
    const url = new URL(urlWithProtocol)
    const hostname = url.hostname
    if (hostname.includes('.') && hostname.split('.').pop().length >= 2) {
      return true
    }
    return false
  } catch {
    return false
  }
}

const normalizeUrl = (str) => {
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str
  }
  return 'https://' + str
}

const filteredResults = computed(() => {
  const results = []
  const query = searchQuery.value.trim()
  
  if (!query) {
    const sortedWebsites = [...websites.value]
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return (a.sort_order || 0) - (b.sort_order || 0)
        }
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      })
    
    results.push(...sortedWebsites.slice(0, 8).map(w => ({
      ...w,
      type: w.type === 'app' ? 'app' : (w.type === 'bookmark' ? 'bookmark' : 'website'),
      typeLabel: w.type === 'app' ? '应用' : (w.type === 'bookmark' ? '书签' : '网站'),
      name: w.name,
      subtitle: w.type === 'app' ? '本地应用' : (w.type === 'bookmark' ? truncateUrl(w.url) : (w.alias || truncateUrl(w.url)))
    })))
    return results.slice(0, 8)
  }
  
  const spaceIndex = query.indexOf(' ')
  if (spaceIndex > 0) {
    const prefix = query.substring(0, spaceIndex).toLowerCase()
    const searchTerm = query.substring(spaceIndex + 1)
    
    const matchedWebsites = websites.value.filter(w => 
      w.type !== 'app' && 
      w.search_url && 
      (w.name?.toLowerCase().includes(prefix) || w.alias?.toLowerCase().includes(prefix))
    )
    
    if (matchedWebsites.length > 0 && searchTerm) {
      const firstMatch = matchedWebsites[0]
      return [{
        ...firstMatch,
        type: 'website',
        typeLabel: '搜索',
        name: `${firstMatch.name} 搜索: ${searchTerm}`,
        subtitle: `在 ${firstMatch.name} 中搜索`,
        isSearch: true,
        searchTerm: searchTerm
      }]
    }
  }
  
  const searchPrefix = spaceIndex > 0 ? query.substring(0, spaceIndex).toLowerCase() : query
  
  websites.value.forEach(w => {
    if (w.type === 'bookmark') {
      if (
        w.name?.toLowerCase().includes(searchPrefix) || 
        w.alias?.toLowerCase().includes(searchPrefix)

      ) {
        results.push({
          ...w,
          type: 'bookmark',
          typeLabel: '书签',
          name: w.name,
          subtitle: truncateUrl(w.url)
        })
      }
    } else if (
      w.name?.toLowerCase().includes(searchPrefix) || 
      w.alias?.toLowerCase().includes(searchPrefix) 
    ) {
      results.push({
        ...w,
        type: w.type === 'app' ? 'app' : 'website',
        typeLabel: w.type === 'app' ? '应用' : '网站',
        name: w.name,
        subtitle: w.type === 'app' ? '本地应用' : (w.alias || truncateUrl(w.url))
      })
    }
  })
  
  passwords.value.forEach(p => {
    const name = p.title || p.website_name || p.username
    if (
      name?.toLowerCase().includes(searchPrefix) || 
      p.username?.toLowerCase().includes(searchPrefix) ||
      p.website_url?.toLowerCase().includes(searchPrefix)
    ) {
      results.push({
        ...p,
        type: 'password',
        typeLabel: '密码',
        name: name,
        subtitle: p.username
      })
    }
  })
  
  snippets.value.forEach(s => {
    const tagsStr = s.tags?.join(' ').toLowerCase() || ''
    if (
      s.title?.toLowerCase().includes(searchPrefix)
    ) {
      results.push({
        ...s,
        type: 'snippet',
        typeLabel: '代码',
        name: s.title,
        subtitle: s.language
      })
    }
  })
  
  documents.value.forEach(d => {
    if (
      d.title?.toLowerCase().includes(searchPrefix)
    ) {
      results.push({
        ...d,
        type: 'document',
        typeLabel: '文档',
        name: d.title || '无标题',
        subtitle: d.word_count ? `${d.word_count} 字` : '文档'
      })
    }
  })
  
  if (results.length === 0 && query) {
    if (isValidUrl(query)) {
      results.push({
        id: 'direct-url',
        type: 'direct-url',
        typeLabel: '访问',
        name: `访问: ${query}`,
        subtitle: normalizeUrl(query),
        url: normalizeUrl(query)
      })
    } else {
      results.push({
        id: 'default-search',
        type: 'default-search',
        typeLabel: '搜索',
        name: `在浏览器中搜索: ${query}`,
        subtitle: '必应搜索',
        searchTerm: query
      })
    }
  }
  
  return results.slice(0, 8)
})

const loadData = async () => {
  loading.value = true
  try {
    await loadAllData()
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleKeydown = (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedIndex.value < filteredResults.value.length - 1) {
      selectedIndex.value++
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (filteredResults.value.length > 0) {
      selectItem(filteredResults.value[selectedIndex.value])
    }
  } else if (e.key === 'Escape') {
    showModal.value = false
  }
}

const selectItem = async (item) => {
  searchQuery.value = ''
  if (item.type === 'direct-url' && item.url) {
    window.electronAPI?.openExternal(item.url)
    emit('close')
    showModal.value = false
  } else if (item.type === 'default-search' && item.searchTerm) {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(item.searchTerm)}`
    window.electronAPI?.openExternal(searchUrl)
    emit('close')
    showModal.value = false
  } else if (item.isSearch && item.search_url && item.searchTerm) {
    const searchUrl = item.search_url.replace('{query}', encodeURIComponent(item.searchTerm))
    window.electronAPI?.openExternal(searchUrl)
    emit('close')
    showModal.value = false
  } else if (item.type === 'website') {
    window.electronAPI?.openExternal(item.url)
    emit('close')
    showModal.value = false
  } else if (item.type === 'bookmark') {
    window.electronAPI?.openExternal(item.url)
    emit('close')
    showModal.value = false
  } else if (item.type === 'app') {
    if (item.app_path) {
      window.electronAPI?.openApp(item.app_path)
    }
    emit('close')
    showModal.value = false
  } else if (item.type === 'password') {
    router.push({ path: '/passwords', query: { id: item.id } })
    emit('close')
    showModal.value = false
  } else if (item.type === 'snippet') {
    router.push({ path: '/snippets', query: { id: item.id } })
    emit('close')
    showModal.value = false
  } else if (item.type === 'document') {
    router.push({ name: 'Documents', query: { id: item.id } })
    emit('close')
    showModal.value = false
  }
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const copyPassword = async () => {
  try {
    await navigator.clipboard.writeText(detailItem.value?.password || '')
    message.success('密码已复制')
  } catch (error) {
    message.error('复制失败')
  }
}

watch(searchQuery, () => {
  selectedIndex.value = 0
  itemRefs.value = []
})

const scrollToSelected = () => {
  nextTick(() => {
    const selectedItem = itemRefs.value[selectedIndex.value]
    if (selectedItem && commandListRef.value) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  })
}

watch(selectedIndex, () => {
  scrollToSelected()
})

watch(showModal, (newVal) => {
  if (!newVal) {
    emit('close')
  }
})

onMounted(() => {
  loadData()
  searchInput.value?.focus()
})
</script>

<style scoped>
.command-palette {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.command-input-wrapper {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.search-icon {
  color: var(--text-color-3);
  margin-right: 12px;
}

.command-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
  color: var(--text-color);
}

.command-input::placeholder {
  color: var(--text-color-4);
}

.command-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.command-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.command-item:hover,
.command-item.selected {
  background: var(--primary-light);
}

.command-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--bg-color);
  margin-right: 12px;
  color: var(--primary-color);
}

.command-content {
  flex: 1;
  min-width: 0;
}

.command-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-desc {
  font-size: 12px;
  color: var(--text-color-3);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.command-shortcut {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-color);
  border-radius: 4px;
  color: var(--text-color-3);
}

.command-empty {
  padding: 32px;
  text-align: center;
}

.command-footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  border-top: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-color-4);
}

.command-footer kbd {
  display: inline-block;
  padding: 2px 6px;
  background: var(--bg-color);
  border-radius: 4px;
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 11px;
  margin-right: 4px;
}

.quick-search-fade-enter-active {
  animation: quick-search-in 0.2s ease-out;
}

.quick-search-fade-leave-active {
  animation: quick-search-in 0.15s ease-in reverse;
}

@keyframes quick-search-in {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
