<template>
  <n-modal 
    v-model:show="internalShow" 
    preset="card" 
    :title="password?.id ? '编辑密码' : '添加密码'" 
    style="width: 500px;"
  >
    <n-form ref="formRef" :model="form" label-placement="left" label-width="80">
      <n-form-item label="标题" path="title">
        <n-input v-model:value="form.title" placeholder="密码条目标题" />
      </n-form-item>

      <n-form-item label="网站名称" path="website_name">
        <n-input v-model:value="form.website_name" placeholder="关联网站名称" />
      </n-form-item>

      <n-form-item label="账号/用户名" path="username" :rule="{ required: true, message: '请输入账号' }">
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
        </n-input-group>
      </n-form-item>

      <n-form-item label="网站URL" path="website_url">
        <n-input v-model:value="form.website_url" placeholder="网站URL" />
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
import { ref, reactive, watch } from 'vue'
import { 
  NModal, 
  NForm, 
  NFormItem, 
  NInput, 
  NInputGroup,
  NButton,
  NSpace,
  NIcon,
  useMessage
} from 'naive-ui'
import { 
  EyeOutline, 
  EyeOffOutline 
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
  title: '',
  website_name: '',
  username: '',
  password: '',
  website_url: '',
  notes: ''
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
    Object.assign(form, {
      title: newVal.title || '',
      website_name: newVal.website_name || '',
      username: newVal.username || '',
      password: newVal.password || '',
      website_url: newVal.website_url || '',
      notes: newVal.notes || ''
    })
  }
}, { immediate: true })

watch(() => props.show, (newVal) => {
  if (newVal && !props.password) {
    Object.assign(form, {
      title: '',
      website_name: '',
      username: '',
      password: '',
      website_url: '',
      notes: ''
    })
  }
})

const handleClose = () => {
  internalShow.value = false
}

const handleSubmit = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      emit('save', { ...form })
      internalShow.value = false
    }
  })
}
</script>
