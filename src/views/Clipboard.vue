<template>
  <div class="clipboard-page">
    <div class="page-header">
      <n-h2>剪贴板历史</n-h2>
      <n-space>
        <n-button @click="clearAll" type="error" :disabled="items.length === 0">
          <template #icon>
            <n-icon><TrashOutline /></n-icon>
          </template>
          清空历史
        </n-button>
      </n-space>
    </div>

    <n-input
      v-model:value="searchQuery"
      placeholder="搜索剪贴板内容..."
      clearable
      style="margin-bottom: 16px"
    >
      <template #prefix>
        <n-icon><SearchOutline /></n-icon>
      </template>
    </n-input>

    <n-tabs v-model:value="activeTab" type="line" style="margin-bottom: 16px">
      <n-tab-pane name="all" tab="全部" />
      <n-tab-pane name="text" tab="文本" />
      <n-tab-pane name="image" tab="图片" />
      <n-tab-pane name="favorite" tab="收藏" />
    </n-tabs>

    <n-empty
      v-if="filteredItems.length === 0"
      :description="activeTab === 'favorite' ? '暂无收藏内容' : '暂无剪贴板历史'"
      style="margin-top: 60px"
    />

    <div class="clipboard-list">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="clipboard-item"
        :class="{ favorite: item.is_favorite }"
      >
        <div class="item-main">
          <div class="item-content" v-if="item.content_type === 'image'">
            <img :src="item.content" class="clipboard-image" @click="previewImage(item.content)" />
          </div>
          <div class="item-content text-content" v-else>
            <n-ellipsis :line-clamp="2" :tooltip="{ width: 400 }">
              {{ item.content }}
            </n-ellipsis>
          </div>
          <div class="item-actions">
            <n-button quaternary size="small" @click="copyToClipboard(item)" title="复制">
              <template #icon>
                <n-icon><CopyOutline /></n-icon>
              </template>
            </n-button>
            <n-button 
              quaternary 
              size="small" 
              @click="toggleFavorite(item)"
              :title="item.is_favorite ? '取消收藏' : '收藏'"
            >
              <template #icon>
                <n-icon :color="item.is_favorite ? '#faad14' : undefined">
                  <Star v-if="item.is_favorite" />
                  <StarOutline v-else />
                </n-icon>
              </template>
            </n-button>
            <n-button quaternary size="small" @click="deleteItem(item)" title="删除">
              <template #icon>
                <n-icon color="#ff4d4f"><TrashOutline /></n-icon>
              </template>
            </n-button>
          </div>
        </div>
        <div class="item-footer">
          <n-text depth="3" style="font-size: 11px;">
            {{ formatDate(item.created_at) }}
          </n-text>
          <n-text depth="3" style="font-size: 11px;" v-if="item.copy_count > 1">
            · 复制 {{ item.copy_count }} 次
          </n-text>
        </div>
      </div>
    </div>
    
    <n-modal v-model:show="showImagePreview" preset="card" style="max-width: 90vw; max-height: 90vh;">
      <img :src="previewImageUrl" style="max-width: 100%; max-height: 80vh; object-fit: contain;" />
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  NH2,
  NSpace,
  NInput,
  NButton,
  NIcon,
  NEmpty,
  NEllipsis,
  NText,
  NTabs,
  NTabPane,
  NModal,
  useMessage,
  useDialog
} from 'naive-ui'
import {
  SearchOutline,
  CopyOutline,
  TrashOutline,
  StarOutline,
  Star
} from '@vicons/ionicons5'
import { clipboardApi } from '../api/clipboard'

const message = useMessage()
const dialog = useDialog()

const items = ref([])
const searchQuery = ref('')
const activeTab = ref('all')
const showImagePreview = ref(false)
const previewImageUrl = ref('')

const filteredItems = computed(() => {
  let result = items.value
  
  if (activeTab.value === 'favorite') {
    result = result.filter(item => item.is_favorite)
  } else if (activeTab.value !== 'all') {
    result = result.filter(item => item.content_type === activeTab.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item => 
      item.content_type !== 'image' && item.content?.toLowerCase().includes(query)
    )
  }
  
  return result
})

const loadItems = async () => {
  try {
    const response = await clipboardApi.getAll({ limit: 200 })
    items.value = response.data.data || []
  } catch (error) {
    console.error('加载剪贴板历史失败:', error)
  }
}

const copyToClipboard = async (item) => {
  try {
    if (item.content_type === 'image') {
      const response = await fetch(item.content)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])
    } else {
      await navigator.clipboard.writeText(item.content)
    }
    message.success('已复制')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败')
  }
}

const previewImage = (url) => {
  previewImageUrl.value = url
  showImagePreview.value = true
}

const toggleFavorite = async (item) => {
  try {
    await clipboardApi.update(item.id, { is_favorite: !item.is_favorite })
    item.is_favorite = !item.is_favorite
    message.success(item.is_favorite ? '已收藏' : '已取消收藏')
  } catch (error) {
    message.error('操作失败')
  }
}

const deleteItem = (item) => {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await clipboardApi.delete(item.id)
        items.value = items.value.filter(i => i.id !== item.id)
        message.success('删除成功')
      } catch (error) {
        message.error('删除失败')
      }
    }
  })
}

const clearAll = () => {
  dialog.warning({
    title: '确认清空',
    content: '确定要清空所有剪贴板历史吗？此操作不可恢复。',
    positiveText: '清空',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await clipboardApi.clearAll()
        items.value = []
        message.success('已清空')
      } catch (error) {
        message.error('清空失败')
      }
    }
  })
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  
  let date
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    date = new Date(dateStr)
  } else if (typeof dateStr === 'string') {
    date = new Date(dateStr + ' GMT+0000')
  } else {
    date = new Date(dateStr)
  }
  
  if (isNaN(date.getTime())) return dateStr
  
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 0) return '刚刚'
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return date.toLocaleDateString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

let refreshInterval

onMounted(() => {
  loadItems()
  refreshInterval = setInterval(loadItems, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.clipboard-page {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.clipboard-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.clipboard-item {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  transition: all 0.2s;
}

.clipboard-item:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.clipboard-item.favorite {
  border-left: 3px solid #faad14;
}

.item-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.text-content {
  word-break: break-all;
  line-height: 1.5;
}

.clipboard-image {
  max-width: 120px;
  max-height: 80px;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}

.clipboard-image:hover {
  transform: scale(1.05);
}

.item-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.item-footer {
  margin-top: 6px;
  padding-left: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}

@media (max-width: 768px) {
  .clipboard-image {
    max-width: 80px;
    max-height: 60px;
  }
}
</style>