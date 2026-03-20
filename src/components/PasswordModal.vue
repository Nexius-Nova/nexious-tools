<template>
  <n-modal 
    v-model:show="internalShow" 
    preset="card" 
    :title="password?.id ? '编辑密码' : '添加密码'" 
    style="width: 500px;"
  >
    <n-form ref="formRef" :model="form" label-placement="left" label-width="80">
      <n-form-item label="关联网站" path="website_id">
        <n-select
          v-model:value="form.website_id"
          :options="websiteOptions"
          placeholder="选择已有网站（可选）"
          clearable
          @update:value="handleWebsiteChange"
        />
      </n-form-item>

      <n-form-item label="网站名称" path="website_name" :rule="{ required: true, message: '请输入网站名称' }">
        <n-input 
          v-model:value="form.website_name" 
          placeholder="网站名称"
          :disabled="!!form.website_id"
        />
      </n-form-item>

      <n-form-item label="账号" path="username" :rule="{ required: true, message: '请输入账号' }">
        <n-input v-model:value="form.username" placeholder="账号或用户名" />
      </n-form-item>

      <n-form-item label="密码" path="password" :rule="{ required: true, message: '请输入密码' }">
        <n-input-group>
          <n-input 
            v-model:value="form.password" 
            :type="showPassword ? 'text' : 'password'" 
            placeholder="密码"
          />
          <n-button @click="showPassword = !showPassword">
            <template #icon>
              <n-icon>
                <EyeOutline v-if="!showPassword" />
                <EyeOffOutline v-else />
              </n-icon>
            </template>
          </n-button>
          <n-button @click="generatePassword" title="生成随机密码">
            <template #icon>
              <n-icon>
                <RefreshOutline />
              </n-icon>
            </template>
          </n-button>
        </n-input-group>
      </n-form-item>

      <n-form-item label="网站URL" path="website_url">
        <n-input 
          v-model:value="form.website_url" 
          placeholder="网站URL"
          :disabled="!!form.website_id"
        />
      </n-form-item>

      <n-form-item label="备注" path="notes">
        <n-input 
          v-model:value="form.notes" 
          type="textarea"
          placeholder="备注信息"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
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
  NIcon,
  NSelect,
  useMessage
} from 'naive-ui'
import { 
  EyeOutline, 
  EyeOffOutline,
  RefreshOutline
} from '@vicons/ionicons5'

const props = defineProps({
  password: {
    type: Object,
    default: null
  },
  show: {
    type: Boolean,
    default: false
  },
  websites: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const message = useMessage()
const formRef = ref(null)
const internalShow = ref(false)
const showPassword = ref(false)

const form = reactive({
  website_id: null,
  website_name: '',
  website_url: '',
  website_favicon: '',
  username: '',
  password: '',
  notes: ''
})

const websiteOptions = computed(() => {
  return props.websites.map(site => ({
    label: site.name,
    value: site.id,
    ...site
  }))
})

watch(() => props.show, (val) => {
  internalShow.value = val
}, { immediate: true })

watch(internalShow, (val) => {
  if (!val) {
    emit('close')
  }
})

watch(() => props.password, (newVal) => {
  if (newVal) {
    const matchedWebsite = props.websites.find(w => w.name === newVal.website_name)
    Object.assign(form, {
      website_id: matchedWebsite?.id || null,
      website_name: newVal.website_name || '',
      website_url: newVal.website_url || '',
      website_favicon: newVal.website_favicon || '',
      username: newVal.username || '',
      password: newVal.password || '',
      notes: newVal.notes || ''
    })
  }
}, { immediate: true })

watch(() => props.show, (newVal) => {
  if (newVal && !props.password) {
    Object.assign(form, {
      website_id: null,
      website_name: '',
      website_url: '',
      website_favicon: '',
      username: '',
      password: '',
      notes: ''
    })
  }
})

const handleWebsiteChange = (id) => {
  if (id) {
    const website = props.websites.find(w => w.id === id)
    if (website) {
      form.website_name = website.name || ''
      form.website_url = website.url || ''
      form.website_favicon = website.favicon || ''
    }
  } else {
    form.website_name = ''
    form.website_url = ''
    form.website_favicon = ''
  }
}

const generatePassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  form.password = result
  showPassword.value = true
  message.success('已生成随机密码')
}

const handleClose = () => {
  internalShow.value = false
}

const handleSubmit = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      const saveData = {
        website_name: form.website_name,
        website_url: form.website_url,
        website_favicon: form.website_favicon,
        username: form.username,
        password: form.password,
        notes: form.notes
      }
      emit('save', saveData)
      internalShow.value = false
    }
  })
}
</script>
