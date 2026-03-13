<template>
  <div class="monaco-editor-container" ref="containerRef"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as monaco from 'monaco-editor'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  },
  theme: {
    type: String,
    default: 'vs-dark'
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  minHeight: {
    type: Number,
    default: 300
  },
  maxHeight: {
    type: Number,
    default: 900
  }
})

const emit = defineEmits(['update:modelValue', 'change', 'save'])

const containerRef = ref(null)
let editor = null

const languageMap = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  csharp: 'csharp',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
  sql: 'sql',
  html: 'html',
  css: 'css',
  shell: 'shell',
  bash: 'shell',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  markdown: 'markdown',
  other: 'plaintext'
}

const getMonacoLanguage = (lang) => {
  return languageMap[lang?.toLowerCase()] || 'plaintext'
}

const initEditor = () => {
  if (!containerRef.value) return

  editor = monaco.editor.create(containerRef.value, {
    value: props.modelValue || '',
    language: getMonacoLanguage(props.language),
    theme: props.theme,
    readOnly: props.readOnly,
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 13,
    fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
    fontLigatures: true,
    lineNumbers: 'on',
    lineNumbersMinChars: 4,
    lineDecorationsWidth: 10,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    wrappingStrategy: 'advanced',
    tabSize: 2,
    insertSpaces: true,
    renderLineHighlight: 'all',
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    padding: { top: 12, bottom: 12 },
    scrollbar: {
      vertical: 'auto',
      horizontal: 'auto',
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    folding: true,
    foldingHighlight: true,
    showFoldingControls: 'mouseover',
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: true,
      indentation: true
    }
  })

  editor.onDidChangeModelContent(() => {
    const value = editor.getValue()
    emit('update:modelValue', value)
    emit('change', value)
  })

  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    emit('save', editor.getValue())
  })
}

const updateValue = (value) => {
  if (editor && editor.getValue() !== value) {
    editor.setValue(value || '')
  }
}

const updateLanguage = (lang) => {
  if (editor) {
    const model = editor.getModel()
    if (model) {
      monaco.editor.setModelLanguage(model, getMonacoLanguage(lang))
    }
  }
}

const updateTheme = (theme) => {
  if (editor) {
    monaco.editor.setTheme(theme)
  }
}

watch(() => props.modelValue, (newVal) => {
  updateValue(newVal)
})

watch(() => props.language, (newLang) => {
  updateLanguage(newLang)
})

watch(() => props.theme, (newTheme) => {
  updateTheme(newTheme)
})

onMounted(() => {
  nextTick(() => {
    initEditor()
  })
})

onUnmounted(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
})

defineExpose({
  getEditor: () => editor,
  getValue: () => editor?.getValue() || '',
  setValue: (value) => editor?.setValue(value || ''),
  focus: () => editor?.focus(),
  format: async () => {
    if (editor) {
      try {
        await editor.getAction('editor.action.formatDocument').run()
      } catch (e) {
        console.warn('Format action not available for this language')
      }
    }
  }
})
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  min-height: v-bind('minHeight + "px"');
  max-height: v-bind('maxHeight + "px"');
  border-radius: 6px;
  overflow: hidden;
}
</style>
