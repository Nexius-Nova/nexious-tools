<template>
  <n-modal 
    v-model:show="internalShow" 
    preset="card" 
    :title="website?.id ? '编辑' + typeLabel : '添加' + typeLabel" 
    style="width: 600px;"
  >
    <n-form ref="formRef" :model="form" label-placement="left" label-width="80">
      <n-form-item label="类型" path="type">
        <n-space vertical style="width: 100%">
          <n-radio-group v-model:value="form.type">
            <n-radio-button value="website">网站链接</n-radio-button>
            <n-radio-button value="bookmark">网页收藏</n-radio-button>
            <n-radio-button value="app">桌面应用</n-radio-button>
          </n-radio-group>
          <n-text depth="3" style="font-size: 12px; margin-top: 4px">
            <template v-if="form.type === 'website'">
              网站链接：支持快速搜索功能，输入别名+关键词可直接跳转搜索结果页
            </template>
            <template v-else-if="form.type === 'bookmark'">
              网页收藏：保存常用网页链接，方便快速访问和管理
            </template>
            <template v-else-if="form.type === 'app'">
              桌面应用：添加本地应用程序，支持一键启动桌面软件
            </template>
          </n-text>
        </n-space>
      </n-form-item>

      <n-form-item v-if="form.type === 'website' || form.type === 'bookmark'" label="URL" path="url" :rule="urlRule">
        <n-input v-model:value="form.url" :placeholder="form.type === 'bookmark' ? 'https://example.com' : 'https://example.com'" @blur="autoFetchFavicon" />
      </n-form-item>

      <n-form-item v-if="form.type === 'app'" label="应用路径" path="app_path" :rule="appPathRule">
        <n-space vertical style="width: 100%">
          <n-input-group>
            <n-input v-model:value="form.app_path" placeholder="选择桌面应用路径" style="flex: 1" />
            <n-button @click="selectAppPath">选择应用</n-button>
            <n-button type="primary" @click="loadInstalledApps" :loading="loadingApps">
              自动导入
            </n-button>
          </n-input-group>
          <n-text depth="3" style="font-size: 12px">
            点击"自动导入"可扫描已安装的桌面应用
          </n-text>
        </n-space>
      </n-form-item>

      <n-modal v-model:show="showAppSelector" preset="card" title="选择应用" style="width: 700px; max-height: 80vh;">
        <n-space vertical style="width: 100%">
          <n-space :size="8" align="center">
            <n-select
              v-model:value="appSourceFilter"
              size="small"
              style="width: 130px"
              :options="appSourceOptions"
              placeholder="筛选来源"
              clearable
            />
            <n-input v-model:value="appSearchKeyword" placeholder="搜索应用..." clearable style="flex: 1">
              <template #prefix>
                <n-icon><SearchOutline /></n-icon>
              </template>
            </n-input>
          </n-space>
          <n-scrollbar style="max-height: 400px;">
            <div class="app-grid">
              <div 
                v-for="app in filteredInstalledApps" 
                :key="app.path || app.name"
                class="app-item"
                @click="selectInstalledApp(app)"
              >
                <div class="app-icon">
                  <img v-if="app.icon" :src="app.icon" @error="(e) => e.target.style.display = 'none'" />
                  <span v-else>{{ getFirstWord(app.name) }}</span>
                </div>
                <div class="app-info">
                  <div class="app-name">{{ app.name }}</div>
                  <!-- <div class="app-path" :title="app.path">{{ truncatePath(app.path) }}</div> -->
                  <n-tag
                    size="tiny"
                    :bordered="false"
                    :type="getSourceTagType(app.source)"
                    style="margin-top: 2px; font-size: 10px; height: 16px; padding: 0 4px;"
                  >
                    {{ getSourceLabel(app.source) }}
                  </n-tag>
                </div>
              </div>
            </div>
          </n-scrollbar>
        </n-space>
      </n-modal>

      <n-form-item label="名称" path="name" :rule="{ required: true, message: '请输入名称' }">
        <n-input v-model:value="form.name" placeholder="名称" />
      </n-form-item>

      <n-form-item label="别名" path="alias">
        <n-input v-model:value="form.alias" placeholder="自定义别名（用于快速搜索）" />
      </n-form-item>

      <n-form-item v-if="form.type === 'website'" label="搜索URL" path="search_url">
        <n-space vertical style="width: 100%">
          <n-input-group>
            <n-input v-model:value="form.search_url" placeholder="搜索URL模板，使用 {query} 作为搜索词占位符" style="flex: 1" />
            <n-button @click="generateSearchUrl" :loading="generatingSearchUrl">
              AI生成
            </n-button>
          </n-input-group>
          <n-collapse>
            <n-collapse-item title="常用搜索URL模板" name="templates">
              <div class="template-grid">
                <div 
                  v-for="tpl in searchTemplates" 
                  :key="tpl.name"
                  class="template-item"
                  @click="applyTemplate(tpl)"
                >
                  <div class="template-name">{{ tpl.name }}</div>
                  <div class="template-alias">别名: {{ tpl.alias }}</div>
                </div>
              </div>
            </n-collapse-item>
          </n-collapse>
          <n-text depth="3" style="font-size: 12px">
            示例：https://s.taobao.com/search?q={query} — 输入"tb iPhone"即可跳转到淘宝搜索iPhone
          </n-text>
        </n-space>
      </n-form-item>

      <n-form-item label="图标" path="favicon">
        <n-space vertical style="width: 100%">
          <n-space align="center">
            <div v-if="form.favicon" class="icon-preview">
              <img :src="form.favicon" @error="handleIconError" />
            </div>
            <div v-else class="icon-preview icon-empty">
              <span>{{ getFirstWord(form.name) }}</span>
            </div>
            <n-input-group style="flex: 1">
              <n-input v-model:value="form.favicon" placeholder="图标URL或上传本地图片" />
              <n-button @click="triggerIconUpload">
                <template #icon>
                  <n-icon><ImageOutline /></n-icon>
                </template>
                上传
              </n-button>
              <n-button v-if="form.type === 'website' || form.type === 'bookmark'" @click="fetchFavicon" :loading="fetchingFavicon">自动获取</n-button>
            </n-input-group>
          </n-space>
          <input
            ref="iconInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleIconUpload"
          />
        </n-space>
      </n-form-item>

      <n-form-item label="描述" path="description">
        <n-space vertical style="width: 100%">
          <n-input-group>
            <n-input 
              v-model:value="form.description" 
              type="textarea"
              placeholder="描述信息"
              :autosize="{ minRows: 3, maxRows: 5 }"
            />
            <n-button v-if="form.type === 'website'" @click="generateDescription" :loading="generating">
              AI生成
            </n-button>
          </n-input-group>
          <n-text depth="3" style="font-size: 12px" v-if="form.type === 'bookmark'">
            添加描述方便日后查找和管理
          </n-text>
          <n-text depth="3" style="font-size: 12px" v-else-if="form.type === 'app'">
            添加应用描述，如用途、快捷方式等
          </n-text>
        </n-space>
      </n-form-item>
    </n-form>

    <template #footer>
      <n-space justify="end">
        <n-button @click="handleClose">取消</n-button>
        <n-button type="primary" @click="handleSubmit">保存</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { 
  NModal, 
  NForm, 
  NFormItem, 
  NInput, 
  NInputGroup,
  NButton, 
  NSpace,
  NRadioGroup,
  NRadioButton,
  NIcon,
  NCollapse,
  NCollapseItem,
  NText,
  NScrollbar,
  useMessage
} from 'naive-ui'
import { ImageOutline, SearchOutline } from '@vicons/ionicons5'
import { websiteApi } from '../api/website'

const props = defineProps({
  website: {
    type: Object,
    default: null
  },
  show: {
    type: Boolean,
    default: false
  },
  existingApps: {
    type: Object,
    default: () => ({ paths: new Set(), names: new Set() })
  }
})

const emit = defineEmits(['close', 'save'])

const message = useMessage()
const formRef = ref(null)
const internalShow = ref(false)
const generating = ref(false)
const generatingSearchUrl = ref(false)
const iconInputRef = ref(null)
const fetchingFavicon = ref(false)
const showAppSelector = ref(false)
const loadingApps = ref(false)
const installedApps = ref([])
const appSearchKeyword = ref('')
const appSourceFilter = ref(null)
const appSourceOptions = [
  { label: '桌面快捷方式', value: 'desktop' },
  { label: '开始菜单', value: 'startmenu' },
  { label: '注册表', value: 'registry' }
]

const getSourceLabel = (source) => {
  const map = { desktop: '桌面', startmenu: '开始菜单', registry: '注册表' }
  return map[source] || source || '未知'
}

const getSourceTagType = (source) => {
  const map = { desktop: 'info', startmenu: 'success', registry: 'warning' }
  return map[source] || 'default'
}

const searchTemplates = [
  { name: '淘宝', alias: 'tb', url: 'https://s.taobao.com/search?q={query}' },
  { name: '京东', alias: 'jd', url: 'https://search.jd.com/Search?keyword={query}' },
  { name: '百度', alias: 'bd', url: 'https://www.baidu.com/s?wd={query}' },
  { name: 'Google', alias: 'g', url: 'https://www.google.com/search?q={query}' },
  { name: 'Bing', alias: 'bing', url: 'https://www.bing.com/search?q={query}' },
  { name: 'GitHub', alias: 'gh', url: 'https://github.com/search?q={query}' },
  { name: 'B站', alias: 'bili', url: 'https://search.bilibili.com/all?keyword={query}' },
  { name: '知乎', alias: 'zh', url: 'https://www.zhihu.com/search?type=content&q={query}' },
  { name: '微博', alias: 'wb', url: 'https://s.weibo.com/weibo/{query}' },
  { name: '抖音', alias: 'dy', url: 'https://www.douyin.com/search/{query}' },
  { name: '小红书', alias: 'xhs', url: 'https://www.xiaohongshu.com/search_result?keyword={query}' },
  { name: '豆瓣', alias: 'db', url: 'https://www.douban.com/search?q={query}' },
  { name: '微信文章', alias: 'wx', url: 'https://weixin.sogou.com/weixin?type=2&query={query}' },
  { name: 'Stack Overflow', alias: 'so', url: 'https://stackoverflow.com/search?q={query}' },
  { name: 'MDN', alias: 'mdn', url: 'https://developer.mozilla.org/zh-CN/search?q={query}' },
  { name: 'npm', alias: 'npm', url: 'https://www.npmjs.com/search?q={query}' },
  { name: '拼多多', alias: 'pdd', url: 'https://mobile.yangkeduo.com/search_result.html?search_key={query}' },
  { name: '亚马逊', alias: 'az', url: 'https://www.amazon.com/s?k={query}' },
  { name: 'YouTube', alias: 'yt', url: 'https://www.youtube.com/results?search_query={query}' },
  { name: 'Twitter/X', alias: 'tw', url: 'https://twitter.com/search?q={query}' }
]

const form = reactive({
  type: 'website',
  url: '',
  name: '',
  alias: '',
  favicon: '',
  description: '',
  app_path: '',
  search_url: ''
})

watch(() => props.show, (val) => {
  internalShow.value = val
}, { immediate: true })

watch(internalShow, (val) => {
  if (!val) {
    emit('close')
  }
})

const getFirstWord = (name) => {
  if (!name) return "W"
  const words = name.split(/[\s\-_\.]+/).filter(w => w.length > 0)
  return name.charAt(0).toUpperCase()
}

const urlRule = computed(() => ({
  required: form.type === 'website' || form.type === 'bookmark',
  message: '请输入URL'
}))

const appPathRule = computed(() => ({
  required: form.type === 'app',
  message: '请选择应用路径'
}))

const filteredInstalledApps = computed(() => {
  let result = installedApps.value
  if (appSourceFilter.value) {
    result = result.filter(app => app.source === appSourceFilter.value)
  }
  if (appSearchKeyword.value) {
    const keyword = appSearchKeyword.value.toLowerCase()
    result = result.filter(app => 
      app.name?.toLowerCase().includes(keyword) ||
      app.path?.toLowerCase().includes(keyword) ||
      app.publisher?.toLowerCase().includes(keyword)
    )
  }
  return result
})

const typeLabel = computed(() => {
  const labels = {
    website: '网站',
    bookmark: '书签',
    app: '应用'
  }
  return labels[form.type] || '网站'
})

watch(() => props.website, (newVal) => {
  if (newVal) {
    Object.assign(form, {
      type: newVal.type || 'website',
      url: newVal.url || '',
      name: newVal.name || '',
      alias: newVal.alias || '',
      favicon: newVal.favicon || '',
      description: newVal.description || '',
      app_path: newVal.app_path || '',
      search_url: newVal.search_url || ''
    })
  }
}, { immediate: true })

watch(() => props.show, (newVal) => {
  if (newVal && !props.website) {
    Object.assign(form, {
      type: 'website',
      url: '',
      name: '',
      alias: '',
      favicon: '',
      description: '',
      app_path: '',
      search_url: ''
    })
  }
})

const extractDomain = (input) => {
  if (!input) return null
  input = input.trim().toLowerCase()
  
  if (!input.startsWith('http://') && !input.startsWith('https://')) {
    input = 'https://' + input
  }
  
  try {
    const urlObj = new URL(input)
    return urlObj.hostname
  } catch (e) {
    const domainMatch = input.match(/^(?:https?:\/\/)?([^\/\s]+)/)
    return domainMatch ? domainMatch[1] : null
  }
}

const fetchFavicon = async () => {
  if (!form.url) {
    message.warning('请先输入网站URL')
    return
  }
  
  const domain = extractDomain(form.url)
  if (!domain) {
    message.warning('请输入有效的网站域名或URL')
    return
  }
  
  form.favicon = `https://favicon.im/${domain}?larger=true`
  message.success('图标已获取')
}

const autoFetchFavicon = async () => {
  if (!form.url || form.favicon) return
  fetchFavicon()
}

const generateDescription = async () => {
  if (!form.url) {
    message.warning('请先输入网站URL')
    return
  }
  generating.value = true
  try {
    const response = await websiteApi.generateDescription(form.url)
    if (response.data.data?.description) {
      form.description = response.data.data.description
      message.success('描述已生成')
    }
  } catch (error) {
    console.error('生成描述失败:', error)
    message.error('生成描述失败，请检查API设置')
  } finally {
    generating.value = false
  }
}

const applyTemplate = (tpl) => {
  form.search_url = tpl.url
  if (!form.alias) {
    form.alias = tpl.alias
  }
  message.success(`已应用 ${tpl.name} 模板`)
}

const generateSearchUrl = async () => {
  if (!form.url) {
    message.warning('请先输入网站URL')
    return
  }
  
  generatingSearchUrl.value = true
  try {
    const response = await websiteApi.generateSearchUrl(form.url)
    if (response.data.data?.search_url) {
      form.search_url = response.data.data.search_url
      message.success('搜索URL已生成')
    }
  } catch (error) {
    console.error('生成搜索URL失败:', error)
    message.error('生成搜索URL失败，请检查API设置')
  } finally {
    generatingSearchUrl.value = false
  }
}

const selectAppPath = async () => {
  const result = await window.electronAPI?.selectFile()
  if (result) {
    form.app_path = result
    if (!form.name) {
      const fileName = result.split(/[/\\]/).pop()
      form.name = fileName.replace(/\.[^.]+$/, '')
    }
    try {
      const iconBase64 = await window.electronAPI?.getExeIcon(result)
      if (iconBase64) {
        form.favicon = iconBase64
      }
    } catch (e) {
      console.error('获取图标失败:', e)
    }
  }
}

const loadInstalledApps = async () => {
  loadingApps.value = true
  try {
    const apps = await window.electronAPI?.autoImportApps()
    if (apps && apps.length > 0) {
      const { paths, names } = props.existingApps
      installedApps.value = apps.filter(app => {
        const appPath = app.path?.toLowerCase()
        const appName = app.name?.toLowerCase()
        return !paths.has(appPath) && !names.has(appName)
      })
      if (installedApps.value.length > 0) {
        showAppSelector.value = true
      } else {
        message.info('所有应用已导入过')
      }
    } else {
      message.warning('未找到已安装的应用')
    }
  } catch (e) {
    console.error('加载应用列表失败:', e)
    message.error('加载应用列表失败')
  } finally {
    loadingApps.value = false
  }
}

const selectInstalledApp = (app) => {
  form.name = app.name
  form.app_path = app.path
  form.favicon = app.icon || ''
  showAppSelector.value = false
  message.success(`已选择 ${app.name}`)
}

const truncatePath = (path) => {
  if (!path) return ''
  if (path.length <= 50) return path
  const fileName = path.split(/[/\\]/).pop()
  if (fileName.length >= 45) return `...${fileName.slice(-45)}`
  const parts = path.split(/[/\\]/)
  if (parts.length > 3) {
    return `${parts[0]}\\...\\${parts.slice(-2).join('\\')}`
  }
  return path
}

const triggerIconUpload = () => {
  iconInputRef.value?.click()
}

const handleIconUpload = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    message.error('请选择图片文件')
    return
  }
  
  if (file.size > 2 * 1024 * 1024) {
    message.error('图片大小不能超过2MB')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    form.favicon = e.target.result
    message.success('图标上传成功')
  }
  reader.onerror = () => {
    message.error('读取图片失败')
  }
  reader.readAsDataURL(file)
  
  event.target.value = ''
}

const handleIconError = () => {
  form.favicon = ''
}

const handleClose = () => {
  internalShow.value = false
}

const handleSubmit = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      const data = { ...form }
      if (data.type === 'app') {
        data.url = ''
      }
      emit('save', data)
      internalShow.value = false
    }
  })
}
</script>

<style scoped>
.icon-preview {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
}

.icon-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.icon-preview.icon-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: var(--primary-color, #667eea);
  font-weight: 600;
  font-size: 14px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.template-item {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-color);
}

.template-item:hover {
  border-color: var(--primary-color, #667eea);
  background: rgba(102, 126, 234, 0.08);
}

.template-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-alias {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.app-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-color);
}

.app-item:hover {
  border-color: var(--primary-color, #667eea);
  background: rgba(102, 126, 234, 0.08);
}

.app-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-color, #667eea);
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.app-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  max-width: 200px;
}

.app-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.app-path {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  margin-top: 2px;
}
</style>
