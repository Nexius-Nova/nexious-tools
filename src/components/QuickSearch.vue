<template>
  <n-modal 
    v-model:show="showModal" 
    style="width: 600px;" 
    :mask-closable="true" 
    :trap-focus="false"
    :transform-origin="'center'"
    :block-scroll="false"
    :auto-focus="true"
    :close-on-esc="true"
    :display-directive="'show'"
  >
    <transition name="quick-search-fade" appear>
      <div class="quick-search-content" :class="{ 'dark-mode': isDarkMode }" v-if="showModal">
      <n-input 
        ref="searchInput"
        v-model:value="searchQuery"
        placeholder="搜索网站、密码、代码片段、文档..."
        size="large"
        clearable
        @keydown.esc="showModal = false"
        @keydown.enter="selectFirst"
        @keydown.up="navigateUp"
        @keydown.down="navigateDown"
      >
        <template #prefix>
          <n-icon size="20"><SearchOutline /></n-icon>
        </template>
      </n-input>

      <div class="search-results" v-if="filteredResults.length > 0">
        <div 
          v-for="(item, index) in filteredResults" 
          :key="item.type + '-' + item.id"
          :class="['result-item', { selected: index === selectedIndex }]"
          @click="selectItem(item)"
          @mouseenter="selectedIndex = index"
        >
          <div class="result-icon">
            <n-avatar
              v-if="item.type === 'website'"
              :src="item.favicon"
              :size="28"
              round
            />
            <n-avatar
              v-else-if="item.type === 'app'"
              :src="item.favicon"
              :size="28"
              round
            />
            <n-icon v-else-if="item.type === 'password'" size="20"><KeyOutline /></n-icon>
            <n-icon v-else-if="item.type === 'document'" size="20"><DocumentOutline /></n-icon>
            <n-icon v-else size="20"><CodeSlashOutline /></n-icon>
          </div>
          <div class="result-info">
            <div class="result-name">{{ item.name }}</div>
          </div>
          <div class="result-action">
            <span class="result-subtitle">{{ item.subtitle }}</span>
            <n-icon size="14"><EnterOutline /></n-icon>
          </div>
        </div>
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
            <n-text code>{{ showPassword ? decryptedPassword : '••••••••' }}</n-text>
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
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useRouter } from 'vue-router'
import { NModal, NInput, NIcon, NTag, NDescriptions, NDescriptionsItem, NText, NButton, NSpace, NCode, NAvatar, useMessage } from 'naive-ui'
import { SearchOutline, SettingsOutline, KeyOutline, CodeSlashOutline, EnterOutline, DocumentOutline } from '@vicons/ionicons5'
import { passwordApi } from '../api/password'
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

const showDetail = ref(false)
const detailItem = ref(null)
const decryptedPassword = ref('')
const showPassword = ref(false)

const detailTitle = computed(() => {
  if (!detailItem.value) return ''
  if (detailItem.value.type === 'password') return '密码详情'
  if (detailItem.value.type === 'snippet') return '代码片段详情'
  return ''
})

const filteredResults = computed(() => {
  const results = []
  const query = searchQuery.value.trim()
  
  if (!query) {
    results.push(...websites.value.slice(0, 5).map(w => ({
      ...w,
      type: w.type === 'app' ? 'app' : 'website',
      typeLabel: w.type === 'app' ? '应用' : '网站',
      name: w.name,
      subtitle: w.type === 'app' ? '应用程序' : (w.alias || w.url)
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
    if (w.name?.toLowerCase().includes(searchPrefix) || w.alias?.toLowerCase().includes(searchPrefix)) {
      results.push({
        ...w,
        type: w.type === 'app' ? 'app' : 'website',
        typeLabel: w.type === 'app' ? '应用' : '网站',
        name: w.name,
        subtitle: w.type === 'app' ? '本地应用' : (w.alias || w.url)
      })
    }
  })
  
  passwords.value.forEach(p => {
    const name = p.title || p.website_name || p.username
    if (name?.toLowerCase().includes(searchPrefix) || p.username?.toLowerCase().includes(searchPrefix)) {
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
    if (s.title?.toLowerCase().includes(searchPrefix) || s.language?.toLowerCase().includes(searchPrefix)) {
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
    if (d.title?.toLowerCase().includes(searchPrefix) || d.content?.toLowerCase().includes(searchPrefix)) {
      results.push({
        ...d,
        type: 'document',
        typeLabel: '文档',
        name: d.title || '无标题',
        subtitle: d.word_count ? `${d.word_count} 字` : '文档'
      })
    }
  })
  
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

const selectItem = async (item) => {
  if (item.isSearch && item.search_url && item.searchTerm) {
    const searchUrl = item.search_url.replace('{query}', encodeURIComponent(item.searchTerm))
    window.electronAPI?.openExternal(searchUrl)
    emit('close')
    showModal.value = false
  } else if (item.type === 'website') {
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
    emit('select', { type: 'password', data: item })
    emit('close')
    showModal.value = false
  } else if (item.type === 'snippet') {
    emit('select', { type: 'snippet', data: item })
    emit('close')
    showModal.value = false
  } else if (item.type === 'document') {
    router.push({ name: 'documents', query: { id: item.id } })
    emit('close')
    showModal.value = false
  }
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}

const copyPassword = async () => {
  try {
    await navigator.clipboard.writeText(decryptedPassword.value)
    message.success('密码已复制')
  } catch (error) {
    message.error('复制失败')
  }
}

const selectFirst = () => {
  if (filteredResults.value.length > 0) {
    selectItem(filteredResults.value[selectedIndex.value])
  }
}

const navigateUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

const navigateDown = () => {
  if (selectedIndex.value < filteredResults.value.length - 1) {
    selectedIndex.value++
  }
}

watch(searchQuery, () => {
  selectedIndex.value = 0
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
.quick-search-content {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 10px;
  padding: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transition: background 0.3s, box-shadow 0.3s;
}

.quick-search-content.dark-mode {
  background: rgba(30, 30, 30, 0.98);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.quick-search-content :deep(.n-input) {
  --n-height: 48px;
  --n-font-size: 15px;
}

.quick-search-content.dark-mode :deep(.n-input) {
  --n-color: transparent;
  --n-text-color: #ffffff;
  --n-placeholder-color: rgba(255, 255, 255, 0.5);
}

.quick-search-content :deep(.n-input .n-input__border),
.quick-search-content :deep(.n-input .n-input__state-border) {
  border: none;
  box-shadow: none;
}

.settings-icon {
  color: #999;
  transition: color 0.2s;
}

.quick-search-content.dark-mode .settings-icon {
  color: rgba(255, 255, 255, 0.6);
}

.settings-icon:hover {
  color: #667eea;
}

.quick-search-content.dark-mode .settings-icon:hover {
  color: #667eea;
}

.search-results {
  margin-top: 8px;
  border-radius: 8px;
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  cursor: pointer;
  transition: background-color 0.15s;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.quick-search-content.dark-mode .result-item {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.result-item:last-child {
  border-bottom: none;
}

.result-item.selected,
.result-item:hover {
  background-color: rgba(102, 126, 234, 0.1);
}

.quick-search-content.dark-mode .result-item.selected,
.quick-search-content.dark-mode .result-item:hover {
  background-color: rgba(102, 126, 234, 0.2);
}

.result-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.1);
  border-radius: 8px;
  margin-right: 12px;
  color: #667eea;
}

.quick-search-content.dark-mode .result-icon {
  background: rgba(102, 126, 234, 0.2);
  color: #8b9cf5;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-search-content.dark-mode .result-name {
  color: #ffffff;
}

.result-subtitle {
  font-size: 11px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-search-content.dark-mode .result-subtitle {
  color: rgba(255, 255, 255, 0.5);
}

.result-action {
  color: #ccc;
  margin-left: 8px;
  width: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-search-content.dark-mode .result-action {
  color: rgba(255, 255, 255, 0.3);
}

.result-item.selected .result-action {
  color: #0d74ea;
}

.quick-search-content.dark-mode .result-item.selected .result-action {
  color: #667eea;
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
