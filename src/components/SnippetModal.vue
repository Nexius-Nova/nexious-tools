<template>
  <n-modal 
    v-model:show="internalShow" 
    preset="card" 
    :title="snippet?.id ? '编辑代码片段' : '添加代码片段'" 
    style="width: 800px;"
  >
    <n-form ref="formRef" :model="form" label-placement="left" label-width="80">
      <n-form-item label="标题" path="title" :rule="{ required: true, message: '请输入标题' }">
        <n-input v-model:value="form.title" placeholder="代码片段标题" />
      </n-form-item>

      <n-form-item label="编程语言" path="language">
        <n-select v-model:value="form.language" :options="languageOptions" placeholder="选择编程语言" />
      </n-form-item>

      <n-form-item label="标签" path="tags">
        <n-select 
          v-model:value="form.tags"
          multiple
          filterable
          tag
          :options="tagOptions"
          placeholder="输入标签后回车"
        />
      </n-form-item>

      <n-form-item label="描述" path="description">
        <n-input 
          v-model:value="form.description" 
          type="textarea"
          placeholder="代码片段描述"
          :autosize="{ minRows: 2, maxRows: 4 }"
        />
      </n-form-item>

      <n-form-item label="代码" path="code" :rule="{ required: true, message: '请输入代码' }">
        <div class="editor-wrapper">
          <MonacoEditor
            ref="editorRef"
            v-model="form.code"
            :language="form.language"
            theme="vs-dark"
            :min-height="250"
            :max-height="400"
          />
        </div>
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
  NSelect,
  NButton,
  NSpace,
  useMessage
} from 'naive-ui'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps({
  snippet: {
    type: Object,
    default: null
  },
  show: {
    type: Boolean,
    default: false
  },
  categories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'save'])

const message = useMessage()
const formRef = ref(null)
const editorRef = ref(null)
const internalShow = ref(false)

const form = reactive({
  title: '',
  language: 'javascript',
  category: '',
  description: '',
  code: '',
  tags: []
})

watch(() => props.show, (val) => {
  internalShow.value = val
}, { immediate: true })

watch(internalShow, (val) => {
  if (!val) {
    emit('close')
  }
})

const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C#', value: 'csharp' },
  { label: 'C++', value: 'cpp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'SQL', value: 'sql' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'Shell', value: 'shell' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: '其他', value: 'plaintext' }
]

const tagOptions = computed(() => {
  return form.tags.map(tag => ({
    label: tag,
    value: tag
  }))
})

watch(() => props.snippet, (newVal) => {
  if (newVal) {
    let parsedTags = []
    if (newVal.tags) {
      if (Array.isArray(newVal.tags)) {
        parsedTags = newVal.tags
      } else if (typeof newVal.tags === 'string') {
        try {
          const parsed = JSON.parse(newVal.tags)
          parsedTags = Array.isArray(parsed) ? parsed : []
        } catch (e) {
          parsedTags = newVal.tags.split(',').filter(t => t.trim())
        }
      }
    }
    Object.assign(form, {
      title: newVal.title || '',
      language: newVal.language || 'javascript',
      category: newVal.category || '',
      description: newVal.description || '',
      code: newVal.code || '',
      tags: parsedTags
    })
  }
}, { immediate: true })

watch(() => props.show, (newVal) => {
  if (newVal && !props.snippet) {
    Object.assign(form, {
      title: '',
      language: 'javascript',
      category: '',
      description: '',
      code: '',
      tags: []
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

<style scoped>
.editor-wrapper {
  width: 100%;
  border: 1px solid var(--border-color, #3c3c3c);
  border-radius: 6px;
  overflow: hidden;
}
</style>
