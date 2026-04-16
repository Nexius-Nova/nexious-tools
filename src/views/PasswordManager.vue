<template>
  <div class="password-manager">
    <div class="page-header">
      <n-h2>密码管理</n-h2>
      <n-space>
        <n-input 
          v-model:value="searchQuery" 
          placeholder="搜索账号或网站..."
          clearable
          style="width: 200px;"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-button type="primary" @click="openAddModal">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          添加密码
        </n-button>
      </n-space>
    </div>

    <div class="password-grid" v-if="filteredPasswords.length > 0">
      <div 
        v-for="item in filteredPasswords" 
        :key="item.id" 
        class="password-card"
      >
        <div class="card-header">
          <div class="card-icon">
            <img 
              v-if="item.website_favicon" 
              :src="item.website_favicon" 
              class="favicon"
              @error="handleImageError"
            />
            <n-icon v-else size="20"><KeyOutline /></n-icon>
          </div>
          <div class="card-title">
            <div class="title-text">{{ item.website_name || '未命名' }}</div>
            <div class="username">{{ item.username }}</div>
          </div>
        </div>
        
        <div class="card-body">
          <div class="info-row">
            <span class="label">密码</span>
            <n-space align="center" :size="8">
              <span class="password-dots">••••••••</span>
              <n-button text size="tiny" @click="copyPassword(item)">
                <template #icon>
                  <n-icon size="14"><CopyOutline /></n-icon>
                </template>
              </n-button>
              <n-button text size="tiny" @click="viewPassword(item)">
                <template #icon>
                  <n-icon size="14"><EyeOutline /></n-icon>
                </template>
              </n-button>
            </n-space>
          </div>
          <div class="info-row" v-if="item.website_url">
            <span class="label">网站</span>
            <n-a class="website-link" @click="openWebsite(item.website_url)">
              {{ truncateUrl(item.website_url) }}
            </n-a>
          </div>
        </div>
        
        <div class="card-actions">
          <n-button text size="small" @click="editPassword(item)">
            <template #icon>
              <n-icon><CreateOutline /></n-icon>
            </template>
            编辑
          </n-button>
          <n-button text size="small" type="error" @click="deletePassword(item)">
            <template #icon>
              <n-icon><TrashOutline /></n-icon>
            </template>
            删除
          </n-button>
        </div>
      </div>
    </div>

    <n-empty 
      v-else
      description="暂无密码数据"
      style="margin-top: 60px;"
    />

    <PasswordModal 
      :show="showModal"
      :password="editingPassword"
      :websites="websites"
      @close="closeModal"
      @save="handleSave"
    />

    <n-modal v-model:show="showPasswordViewer" preset="card" title="密码详情" style="width: 400px;">
      <n-descriptions :column="1" label-placement="left" bordered>
        <n-descriptions-item label="账号">
          {{ viewingPassword?.username }}
        </n-descriptions-item>
        <n-descriptions-item label="密码">
          <n-space align="center">
            <n-text code>{{ viewingPassword?.password }}</n-text>
            <n-button size="small" @click="copyToClipboard(viewingPassword?.password)">
              复制
            </n-button>
          </n-space>
        </n-descriptions-item>
      </n-descriptions>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { 
  NButton, 
  NSpace, 
  NIcon, 
  NH2, 
  NInput, 
  NDescriptions,
  NDescriptionsItem,
  NA,
  NText,
  NModal,
  NEmpty,
  useMessage,
  useDialog
} from 'naive-ui'
import { 
  AddOutline, 
  SearchOutline, 
  LockClosedOutline,
  CopyOutline,
  EyeOutline,
  CreateOutline,
  TrashOutline,
  KeyOutline
} from '@vicons/ionicons5'
import { passwordApi } from '../api/password'
import PasswordModal from '../components/PasswordModal.vue'
import { useData } from '../store/data'

const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const { passwords, websites, reloadPasswords, reloadWebsites, addPassword, updatePassword, removePassword } = useData()

const searchQuery = ref('')
const showModal = ref(false)
const editingPassword = ref(null)
const showPasswordViewer = ref(false)
const viewingPassword = ref(null)

const filteredPasswords = computed(() => {
  if (!searchQuery.value) return passwords.value
  const query = searchQuery.value.toLowerCase()
  return passwords.value.filter(p => 
    p.username?.toLowerCase().includes(query) ||
    p.website_name?.toLowerCase().includes(query)
  )
})

const loadData = async () => {
  try {
    await Promise.all([reloadPasswords(), reloadWebsites()])
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error('加载数据失败')
  }
}

const openAddModal = () => {
  editingPassword.value = null
  showModal.value = true
}

const editPassword = (item) => {
  editingPassword.value = { ...item }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingPassword.value = null
}

const handleSave = async (data) => {
  const editingId = editingPassword.value?.id
  try {
    if (editingId) {
      await passwordApi.update(editingId, data)
      updatePassword(editingId, data)
      message.success('更新成功')
    } else {
      const response = await passwordApi.create(data)
      if (response.data.data) {
        addPassword(response.data.data)
      }
      message.success('添加成功')
    }
    await loadData()
    closeModal()
  } catch (error) {
    console.error('保存密码失败:', error)
    message.error('保存失败，请重试')
  }
}

const deletePassword = (item) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除 "${item.website_name || item.username}" 吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await passwordApi.delete(item.id)
        removePassword(item.id)
        message.success('删除成功')
        await loadData()
      } catch (error) {
        console.error('删除密码失败:', error)
        message.error('删除失败，请重试')
      }
    }
  })
}

const viewPassword = (item) => {
  viewingPassword.value = item
  showPasswordViewer.value = true
}

const copyPassword = async (item) => {
  await copyToClipboard(item.password)
}

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success('已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    message.error('复制失败')
  }
}

const openWebsite = (url) => {
  window.electronAPI?.openExternal(url)
}

const truncateUrl = (url) => {
  if (!url) return ''
  return url.length > 30 ? url.substring(0, 30) + '...' : url
}

const handleImageError = (e) => {
  e.target.style.display = 'none'
}

onMounted(async () => {
  await loadData()
  if (route.query.id) {
    const password = passwords.value.find(p => p.id === Number(route.query.id))
    if (password) {
      editPassword(password)
    }
  }
})
</script>

<style scoped>
.password-manager {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.password-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.password-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.password-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-color);
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  margin-right: 12px;
  flex-shrink: 0;
}

.card-icon .favicon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  object-fit: cover;
}

.card-title {
  flex: 1;
  min-width: 0;
}

.title-text {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.username {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.card-body {
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
}

.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.info-row .label {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.password-dots {
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--text-secondary);
}

.website-link {
  font-size: 12px;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
}
</style>
