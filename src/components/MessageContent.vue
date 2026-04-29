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

const parseMarkdown = (text) => {
  let html = text
  
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  
  html = html.replace(/^[-*] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
  
  html = html.replace(/^---$/gm, '<hr>')
  
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  
  html = html.replace(/\n/g, '<br>')
  
  return html
}

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
      
      if (textContent) {
        parts.push({ type: 'text', content: parseMarkdown(textContent) })
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
    
    if (textContent) {
      parts.push({ type: 'text', content: parseMarkdown(textContent) })
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
  line-height: 1.75;
  word-break: break-word;
  color: var(--text-primary);
  font-size: 14px;
}

.text-part :deep(h1) {
  font-size: 24px;
  font-weight: 600;
  margin: 16px 0 12px 0;
  line-height: 1.4;
  color: var(--text-primary);
}

.text-part :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 14px 0 10px 0;
  line-height: 1.4;
  color: var(--text-primary);
}

.text-part :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 8px 0;
  line-height: 1.4;
  color: var(--text-primary);
}

.text-part :deep(p) {
  margin: 8px 0;
  line-height: 1.75;
}

.text-part :deep(ul) {
  margin: 8px 0;
  padding-left: 24px;
  list-style-type: disc;
}

.text-part :deep(li) {
  margin: 4px 0;
  line-height: 1.6;
}

.text-part :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 3px solid var(--primary-color);
  background: var(--bg-color);
  color: var(--text-secondary);
  font-style: italic;
}

.text-part :deep(a) {
  color: var(--primary-color);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}

.text-part :deep(a:hover) {
  border-bottom-color: var(--primary-color);
}

.text-part :deep(hr) {
  margin: 16px 0;
  border: none;
  border-top: 1px solid var(--border-color);
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

.text-part :deep(em) {
  font-style: italic;
}
</style>
