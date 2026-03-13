<template>
  <div class="message-content-renderer">
    <template v-for="(part, index) in parsedParts" :key="index">
      <CodeBlock
        v-if="part.type === 'code'"
        :code="part.content"
        :language="part.language"
        @copy="handleCopy"
      />
      <div v-else class="text-part" v-html="part.content"></div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import CodeBlock from './CodeBlock.vue'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['copy'])

const parsedParts = computed(() => {
  if (!props.content) return []
  
  const parts = []
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match
  
  while ((match = codeBlockRegex.exec(props.content)) !== null) {
    if (match.index > lastIndex) {
      const textContent = props.content
        .substring(lastIndex, match.index)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
      
      if (textContent) {
        parts.push({ type: 'text', content: textContent })
      }
    }
    
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      content: match[2]
    })
    
    lastIndex = match.index + match[0].length
  }
  
  if (lastIndex < props.content.length) {
    const textContent = props.content
      .substring(lastIndex)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
    
    if (textContent) {
      parts.push({ type: 'text', content: textContent })
    }
  }
  
  return parts
})

const handleCopy = (success) => {
  emit('copy', success)
}
</script>

<style scoped>
.message-content-renderer {
  line-height: 1.7;
  word-break: break-word;
  color: var(--text-primary);
}

.text-part :deep(code:not(pre code)) {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
}

.text-part :deep(strong) {
  font-weight: 600;
}
</style>
