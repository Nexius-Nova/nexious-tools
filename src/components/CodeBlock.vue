<template>
  <div class="code-block" :class="themeClass">
    <div class="code-header">
      <n-select
        v-model:value="selectedLanguage"
        :options="languageOptions"
        size="tiny"
        style="width: 120px"
        @update:value="handleLanguageChange"
      />
      <n-select
        v-model:value="selectedTheme"
        :options="themeOptions"
        size="tiny"
        style="width: 100px"
        @update:value="handleThemeChange"
      />
      <n-button text size="tiny" @click="copyCode">
        <template #icon>
          <n-icon><CopyOutline /></n-icon>
        </template>
        复制
      </n-button>
    </div>
    <div class="code-editor-wrapper" :style="{ height: editorHeight + 'px' }">
      <MonacoEditor
        ref="editorRef"
        v-model="codeContent"
        :language="selectedLanguage"
        :theme="selectedTheme"
        :read-only="true"
        :min-height="100"
        :max-height="500"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { NButton, NIcon, NSelect } from 'naive-ui'
import { CopyOutline } from '@vicons/ionicons5'
import MonacoEditor from './MonacoEditor.vue'

const props = defineProps({
  code: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'plaintext'
  },
  theme: {
    type: String,
    default: 'vs-dark'
  }
})

const emit = defineEmits(['copy', 'update:language', 'update:theme'])

const editorRef = ref(null)
const codeContent = ref(props.code)
const selectedLanguage = ref(props.language || 'plaintext')
const selectedTheme = ref(props.theme || 'vs-dark')

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

const themeOptions = [
  { label: '暗色', value: 'vs-dark' },
  { label: '亮色', value: 'vs' },
  { label: '高对比', value: 'hc-black' }
]

const lineCount = computed(() => {
  return (props.code || '').split('\n').length
})

const editorHeight = computed(() => {
  const lineHeight = 20
  const padding = 24
  const minLines = 3
  const maxLines = 20
  
  const lines = Math.max(minLines, Math.min(maxLines, lineCount.value))
  return lines * lineHeight + padding
})

const themeClass = computed(() => {
  return selectedTheme.value === 'vs' ? 'theme-light' : 'theme-dark'
})

watch(() => props.code, (newVal) => {
  codeContent.value = newVal
})

watch(() => props.language, (newVal) => {
  selectedLanguage.value = newVal || 'plaintext'
})

watch(() => props.theme, (newVal) => {
  selectedTheme.value = newVal || 'vs-dark'
})

const handleLanguageChange = (val) => {
  emit('update:language', val)
}

const handleThemeChange = (val) => {
  emit('update:theme', val)
}

const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    emit('copy', true)
  } catch (error) {
    emit('copy', false)
  }
}
</script>

<style scoped>
.code-block {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
}

.code-block.theme-dark {
  background: #1e1e1e;
}

.code-block.theme-light {
  background: #ffffff;
  border: 1px solid #e0e0e0;
}

.code-header {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #3c3c3c;
}

.theme-light .code-header {
  border-bottom-color: #e0e0e0;
  background: #f5f5f5;
}

.theme-dark .code-header {
  background: #2d2d2d;
}

.code-editor-wrapper {
  width: 100%;
  overflow: hidden;
}

.code-editor-wrapper :deep(.monaco-editor-container) {
  min-height: 100%;
  max-height: none;
}
</style>
