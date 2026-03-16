<template>
  <div class="settings-page">
    <n-h2>应用设置</n-h2>

    <n-space vertical :size="20">
      <n-card title="快捷键设置">
        <template #header-extra>
          <n-icon><KeypadOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-text depth="3" style="margin-bottom: 16px;">
            设置全局快捷键，按下快捷键可以快速唤出应用窗口
          </n-text>
          
          <n-form :model="settings" label-placement="left" label-width="100">
            <n-form-item label="唤出窗口">
              <n-input-group>
                <n-input 
                  v-model:value="settings.global_shortcut"
                  placeholder="按下快捷键组合..."
                  style="width: 200px;"
                  @keydown="handleShortcutKeydown"
                  readonly
                />
                <n-button @click="resetShortcut">
                  重置
                </n-button>
              </n-input-group>
            </n-form-item>
            <n-text depth="3" style="font-size: 12px;">
              当前快捷键: {{ settings.global_shortcut || '未设置' }} (默认: Ctrl+Shift+Space)
            </n-text>
          </n-form>

          <n-space>
            <n-button type="primary" @click="saveShortcut">
              保存快捷键
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-card title="外观设置">
        <template #header-extra>
          <n-icon><ColorPaletteOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-form :model="settings" label-placement="left" label-width="100">
            <n-form-item label="颜色主题">
              <n-space>
                <div 
                  v-for="theme in themeOptions" 
                  :key="theme.value"
                  :class="['theme-item', { active: currentTheme === theme.value }]"
                  :style="{ backgroundColor: theme.color }"
                  @click="setTheme(theme.value)"
                >
                  <n-icon v-if="currentTheme === theme.value" color="#fff" size="16">
                    <CheckmarkOutline />
                  </n-icon>
                </div>
              </n-space>
            </n-form-item>
            <n-text depth="3" style="font-size: 12px;">
              选择您喜欢的颜色主题，深色主题可保护眼睛
            </n-text>
          </n-form>
        </n-space>
      </n-card>

      <n-card title="AI 模型配置">
        <template #header-extra>
          <n-icon><ChatbubbleEllipsesOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-text depth="3" style="margin-bottom: 16px;">
            配置大模型API用于自动生成网站描述
          </n-text>
          
          <n-form :model="settings" label-placement="left" label-width="100">
            <n-form-item label="模型提供商">
              <n-select 
                v-model:value="settings.ai_provider"
                :options="providerOptions"
                style="width: 200px;"
              />
            </n-form-item>

            <n-form-item label="API Key">
              <n-input-group>
                <n-input 
                  v-model:value="settings.ai_api_key"
                  :type="showApiKey ? 'text' : 'password'"
                  placeholder="输入您的API Key"
                  style="width: 300px;"
                />
                <n-button @click="showApiKey = !showApiKey">
                  <template #icon>
                    <n-icon>
                      <EyeOutline v-if="!showApiKey" />
                      <EyeOffOutline v-else />
                    </n-icon>
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item>

            <n-form-item label="API Base URL">
              <n-input 
                v-model:value="settings.ai_base_url"
                placeholder="https://api.openai.com/v1"
                style="width: 300px;"
              />
            </n-form-item>

            <n-form-item label="模型名称">
              <n-input 
                v-model:value="settings.ai_model"
                placeholder="gpt-3.5-turbo"
                style="width: 300px;"
              />
            </n-form-item>
          </n-form>

          <n-space>
            <n-button @click="testConnection" :loading="testing">
              测试连接
            </n-button>
            <n-button type="primary" @click="saveSettings">
              保存设置
            </n-button>
          </n-space>
        </n-space>
      </n-card>

      <n-card title="安全设置">
        <template #header-extra>
          <n-icon><LockClosedOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-text depth="3" style="margin-bottom: 16px;">
            密码加密和安全相关设置
          </n-text>

          <n-form :model="settings" label-placement="left" label-width="100">
            <n-form-item label="加密密钥">
              <n-input-group>
                <n-input 
                  v-model:value="settings.encryption_key"
                  type="password"
                  placeholder="用于加密密码的密钥"
                  style="width: 300px;"
                />
                <n-button @click="generateEncryptionKey">
                  生成
                </n-button>
              </n-input-group>
            </n-form-item>
            <n-text depth="3" style="font-size: 12px;">
              请妥善保管此密钥，丢失将无法解密已保存的密码
            </n-text>

            <n-form-item label="自动锁定">
              <n-switch v-model:value="settings.auto_lock">
                <template #checked>
                  开启
                </template>
                <template #unchecked>
                  关闭
                </template>
              </n-switch>
              <n-text depth="3" style="margin-left: 8px; font-size: 12px;">
                5分钟无操作自动锁定
              </n-text>
            </n-form-item>
          </n-form>

          <n-button type="primary" @click="saveSettings">
            保存设置
          </n-button>
        </n-space>
      </n-card>

      <n-card title="系统设置">
        <template #header-extra>
          <n-icon><SettingsOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-form :model="settings" label-placement="left" label-width="120">
            <n-form-item label="开机自启动">
              <n-switch v-model:value="settings.auto_launch" @update:value="handleAutoLaunchChange">
                <template #checked>开启</template>
                <template #unchecked>关闭</template>
              </n-switch>
              <n-text depth="3" style="margin-left: 8px; font-size: 12px;">
                开机时自动启动应用
              </n-text>
            </n-form-item>
          </n-form>
        </n-space>
      </n-card>

      <n-card title="数据管理">
        <template #header-extra>
          <n-icon><CloudDownloadOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-text depth="3" style="margin-bottom: 16px;">
            导出或导入应用数据，包含网站、密码、代码片段等所有数据
          </n-text>
          
          <n-space>
            <n-button @click="exportData" :loading="exporting">
              <template #icon>
                <n-icon><DownloadOutline /></n-icon>
              </template>
              导出数据
            </n-button>
            <n-button @click="triggerImport" :loading="importing">
              <template #icon>
                <n-icon><CloudUploadOutline /></n-icon>
              </template>
              导入数据
            </n-button>
            <input 
              ref="fileInput" 
              type="file" 
              accept=".json" 
              style="display: none" 
              @change="handleFileSelect"
            />
          </n-space>
          
          <n-alert type="warning" style="margin-top: 12px;">
            导入数据将覆盖现有数据，请先备份
          </n-alert>
        </n-space>
      </n-card>

      <n-card title="关于">
        <template #header-extra>
          <n-icon><InformationCircleOutline /></n-icon>
        </template>
        <n-descriptions :column="2" label-placement="left" bordered>
          <n-descriptions-item label="应用名称">
            Nexious Tools
          </n-descriptions-item>
          <n-descriptions-item label="版本号">
            v1.0.0
          </n-descriptions-item>
          <n-descriptions-item label="技术栈">
            Electron + Vue3
          </n-descriptions-item>
          <n-descriptions-item label="数据库">
            SQLite
          </n-descriptions-item>
        </n-descriptions>
      </n-card>
    </n-space>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { 
  NH2, 
  NCard, 
  NSpace, 
  NText, 
  NForm, 
  NFormItem, 
  NInput, 
  NInputGroup,
  NButton, 
  NSelect, 
  NSwitch,
  NIcon,
  NDescriptions,
  NDescriptionsItem,
  NAlert,
  useMessage,
  useDialog
} from 'naive-ui'
import { 
  ChatbubbleEllipsesOutline, 
  LockClosedOutline,
  InformationCircleOutline,
  EyeOutline,
  EyeOffOutline,
  ColorPaletteOutline,
  CheckmarkOutline,
  KeypadOutline,
  SettingsOutline,
  CloudDownloadOutline,
  DownloadOutline,
  CloudUploadOutline
} from '@vicons/ionicons5'
import { settingsApi } from '../api/settings'
import { useTheme } from '../store/theme'
import { websiteApi } from '../api/website'
import { passwordApi } from '../api/password'
import { snippetApi } from '../api/snippet'

const message = useMessage()
const dialog = useDialog()
const { currentTheme, setTheme } = useTheme()

const settings = reactive({
  ai_provider: 'openai',
  ai_api_key: '',
  ai_base_url: '',
  ai_model: 'gpt-3.5-turbo',
  encryption_key: '',
  auto_lock: false,
  auto_launch: false,
  global_shortcut: 'CommandOrControl+Shift+Space'
})

const showApiKey = ref(false)
const testing = ref(false)
const exporting = ref(false)
const importing = ref(false)
const fileInput = ref(null)

const providerOptions = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: '智谱AI', value: 'zhipu' },
  { label: 'Moonshot', value: 'moonshot' },
  { label: '自定义', value: 'custom' }
]

const themeOptions = [
  { label: '默认蓝', value: 'default', color: '#0d74ea' },
  { label: '优雅紫', value: 'purple', color: '#722ed1' },
  { label: '清新绿', value: 'green', color: '#52c41a' },
  { label: '活力橙', value: 'orange', color: '#fa8c16' },
  { label: '青色', value: 'cyan', color: '#13c2c2' },
  { label: '粉红', value: 'pink', color: '#eb2f96' },
  { label: '深色', value: 'dark', color: '#141414' }
]

const handleShortcutKeydown = (e) => {
  e.preventDefault()
  
  const modifiers = []
  if (e.ctrlKey) modifiers.push('CommandOrControl')
  if (e.metaKey) modifiers.push('CommandOrControl')
  if (e.altKey) modifiers.push('Alt')
  if (e.shiftKey) modifiers.push('Shift')
  
  let key = e.key
  if (key === ' ') key = 'Space'
  if (key === 'Control' || key === 'Meta' || key === 'Alt' || key === 'Shift') {
    return
  }
  
  if (key.length === 1) {
    key = key.toUpperCase()
  }
  
  if (modifiers.length > 0) {
    settings.global_shortcut = [...modifiers, key].join('+')
  }
}

const resetShortcut = () => {
  settings.global_shortcut = 'CommandOrControl+Shift+Space'
}

const saveShortcut = async () => {
  try {
    if (window.electronAPI?.setGlobalShortcut) {
      const result = await window.electronAPI.setGlobalShortcut(settings.global_shortcut)
      if (result) {
        await settingsApi.set('global_shortcut', settings.global_shortcut)
        message.success('快捷键已保存')
      } else {
        message.error('快捷键注册失败，请尝试其他组合')
      }
    } else {
      await settingsApi.set('global_shortcut', settings.global_shortcut)
      message.success('快捷键已保存（开发模式下不生效）')
    }
  } catch (error) {
    console.error('保存快捷键失败:', error)
    message.error('保存失败')
  }
}

const loadSettings = async () => {
  try {
    const response = await settingsApi.getAll()
    if (response.data.data) {
      Object.keys(response.data.data).forEach(key => {
        if (settings.hasOwnProperty(key)) {
          settings[key] = response.data.data[key]
        }
      })
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    message.error('加载设置失败')
  }
}

const saveSettings = async () => {
  try {
    await settingsApi.set('ai_provider', settings.ai_provider)
    await settingsApi.set('ai_api_key', settings.ai_api_key)
    await settingsApi.set('ai_base_url', settings.ai_base_url)
    await settingsApi.set('ai_model', settings.ai_model)
    await settingsApi.set('encryption_key', settings.encryption_key)
    await settingsApi.set('auto_lock', settings.auto_lock)
    message.success('设置已保存')
  } catch (error) {
    console.error('保存设置失败:', error)
    message.error('保存失败，请重试')
  }
}

const testConnection = async () => {
  if (!settings.ai_api_key) {
    message.warning('请先输入API Key')
    return
  }
  testing.value = true
  try {
    await settingsApi.testApiKey(settings.ai_provider, settings.ai_api_key)
    message.success('连接成功')
  } catch (error) {
    console.error('测试连接失败:', error)
    message.error('连接失败，请检查API Key')
  } finally {
    testing.value = false
  }
}

const generateEncryptionKey = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let key = ''
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  settings.encryption_key = key
  message.success('密钥已生成')
}

const handleAutoLaunchChange = async (value) => {
  try {
    if (window.electronAPI?.setAutoLaunch) {
      await window.electronAPI.setAutoLaunch(value)
    }
    await settingsApi.set('auto_launch', value)
    message.success(value ? '已开启开机自启动' : '已关闭开机自启动')
  } catch (error) {
    console.error('设置开机自启动失败:', error)
    message.error('设置失败')
    settings.auto_launch = !value
  }
}

const exportData = async () => {
  exporting.value = true
  try {
    const [websites, passwords, snippets, appSettings] = await Promise.all([
      websiteApi.getAll(),
      passwordApi.getAll(),
      snippetApi.getAll(),
      settingsApi.getAll()
    ])
    
    const exportData = {
      version: '1.0.0',
      exportTime: new Date().toISOString(),
      data: {
        websites: websites.data.data || [],
        passwords: passwords.data.data || [],
        snippets: snippets.data.data || [],
        settings: appSettings.data.data || {}
      }
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nexious-tools-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    
    message.success('数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    message.error('导出失败')
  } finally {
    exporting.value = false
  }
}

const triggerImport = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  importing.value = true
  try {
    const text = await file.text()
    const importData = JSON.parse(text)
    
    if (!importData.version || !importData.data) {
      message.error('无效的备份文件格式')
      return
    }
    
    dialog.warning({
      title: '确认导入',
      content: '导入数据将覆盖现有数据，是否继续？',
      positiveText: '导入',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          const { websites, passwords, snippets, settings: importedSettings } = importData.data
          
          if (websites?.length) {
            for (const item of websites) {
              await websiteApi.create(item)
            }
          }
          
          if (passwords?.length) {
            for (const item of passwords) {
              await passwordApi.create(item)
            }
          }
          
          if (snippets?.length) {
            for (const item of snippets) {
              await snippetApi.create(item)
            }
          }
          
          if (importedSettings) {
            for (const [key, value] of Object.entries(importedSettings)) {
              await settingsApi.set(key, value)
            }
          }
          
          message.success('数据导入成功')
          loadSettings()
        } catch (error) {
          console.error('导入数据失败:', error)
          message.error('导入失败')
        }
      }
    })
  } catch (error) {
    console.error('读取文件失败:', error)
    message.error('读取文件失败')
  } finally {
    importing.value = false
    event.target.value = ''
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-page {
  max-width: 800px;
}

.theme-item {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}

.theme-item:hover {
  transform: scale(1.1);
}

.theme-item.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}
</style>
