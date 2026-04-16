<template>
  <div 
    class="catalog-sidebar"
    :class="{ collapsed: isCollapsed }"
    :style="{ width: isCollapsed ? '48px' : `${width}px` }"
  >
    <div class="catalog-header">
      <template v-if="!isCollapsed">
        <div class="header-left">
          <n-icon size="16"><ListOutline /></n-icon>
          <span class="header-title">目录</span>
        </div>
        <div class="header-actions">
          <n-button 
            quaternary 
            circle 
            size="tiny"
            @click="toggleCollapse"
            title="折叠目录"
          >
            <template #icon>
              <n-icon size="14"><ChevronBackOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </template>
      <template v-else>
        <n-button 
          quaternary 
          circle 
          size="small"
          @click="toggleCollapse"
          title="展开目录"
        >
          <template #icon>
            <n-icon size="16"><ListOutline /></n-icon>
          </template>
        </n-button>
      </template>
    </div>

    <div class="catalog-body" v-show="!isCollapsed">
      <div v-if="headings.length === 0" class="catalog-empty">
        <n-icon size="24" :depth="3"><DocumentTextOutline /></n-icon>
        <span>暂无目录</span>
      </div>

      <div v-else class="catalog-list" ref="catalogListRef">
        <div
          v-for="(heading, index) in headings"
          :key="index"
          class="catalog-item"
          :class="[
            `level-${heading.level}`,
            { active: activeIndex === index }
          ]"
          :title="heading.text"
          @click="scrollToHeading(heading, index)"
        >
          <div class="item-indicator">
            <span class="dot"></span>
          </div>
          <div class="item-content">
            <span class="item-text">{{ heading.text }}</span>
          </div>
        </div>

        <div 
          class="scroll-progress" 
          :style="{ top: `${progressTop}px` }"
          v-show="activeIndex >= 0"
        ></div>
      </div>
    </div>

    <div 
      v-show="!isCollapsed"
      class="resize-handle"
      @mousedown="startResize"
    ></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { NIcon, NButton, NBadge } from 'naive-ui'
import { ListOutline, ChevronBackOutline, DocumentTextOutline } from '@vicons/ionicons5'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  scrollContainer: {
    type: [Object, null],
    default: null
  },
  editorId: {
    type: String,
    default: 'doc-preview'
  },
  headingIdGenerator: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['navigate'])

const isCollapsed = ref(false)
const width = ref(240)
const activeIndex = ref(-1)
const progressTop = ref(0)
const catalogListRef = ref(null)
const isResizing = ref(false)

const headings = computed(() => {
  if (!props.content) return []
  
  let content = props.content
  
  content = content.replace(/```[\s\S]*?```/g, '')
  content = content.replace(/~~~[\s\S]*?~~~/g, '')
  content = content.replace(/`[^`]+`/g, '')
  
  const regex = /^(#{1,6})\s+(.+)$/gm
  const result = []
  let match
  
  while ((match = regex.exec(content)) !== null) {
    result.push({
      level: match[1].length,
      text: match[2].trim(),
      line: match.index
    })
  }
  
  return result
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const getScrollElement = () => {
  if (props.scrollContainer) {
    if (props.scrollContainer.value !== undefined) {
      return props.scrollContainer.value
    }
    return props.scrollContainer
  }
  return document.querySelector('.preview-content')
}

const scrollToHeading = (heading, index) => {
  activeIndex.value = index
  
  const scrollEl = getScrollElement()
  if (!scrollEl) return
  
  const headingEls = scrollEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
  const targetEl = headingEls[index]
  
  if (targetEl) {
    targetEl.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
  emit('navigate', { heading, index })
}

const generateHeadingId = (heading, index) => {
  if (props.headingIdGenerator) {
    return props.headingIdGenerator({
      text: heading.text,
      level: heading.level,
      index
    })
  }
  return `heading-${index}-${heading.level}-${heading.text.replace(/\s+/g, '-').substring(0, 20)}`
}

const updateActiveHeading = () => {
  const scrollEl = getScrollElement()
  if (!scrollEl || headings.value.length === 0) return
  
  const containerRect = scrollEl.getBoundingClientRect()
  const headingEls = scrollEl.querySelectorAll('h1, h2, h3, h4, h5, h6')
  
  let foundIndex = -1
  
  for (let i = headingEls.length - 1; i >= 0; i--) {
    const el = headingEls[i]
    const rect = el.getBoundingClientRect()
    const relativeTop = rect.top - containerRect.top
    
    if (relativeTop <= 40) {
      foundIndex = i
      break
    }
  }
  
  if (foundIndex !== activeIndex.value) {
    activeIndex.value = foundIndex
    updateProgressPosition()
  }
}

const updateProgressPosition = () => {
  if (!catalogListRef.value || activeIndex.value < 0) {
    progressTop.value = 0
    return
  }
  
  const items = catalogListRef.value.querySelectorAll('.catalog-item')
  if (items[activeIndex.value]) {
    const item = items[activeIndex.value]
    progressTop.value = item.offsetTop + item.offsetHeight / 2
  }
}

const startResize = (e) => {
  isResizing.value = true
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (e) => {
  if (!isResizing.value) return
  
  const container = e.target.closest('.catalog-sidebar')
  if (!container) return
  
  const rect = container.getBoundingClientRect()
  const newWidth = e.clientX - rect.left
  
  if (newWidth >= 180 && newWidth <= 400) {
    width.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

let scrollElement = null

const bindScrollEvent = () => {
  const newScrollElement = getScrollElement()
  
  if (newScrollElement === scrollElement) {
    return
  }
  
  if (scrollElement) {
    scrollElement.onscroll = null
    scrollElement.onwheel = null
  }
  
  scrollElement = newScrollElement
  
  if (scrollElement) {
    scrollElement.onscroll = () => {
      requestAnimationFrame(updateActiveHeading)
    }
    scrollElement.onwheel = () => {
      requestAnimationFrame(updateActiveHeading)
    }
  }
}

onMounted(() => {
  setTimeout(() => {
    bindScrollEvent()
  }, 200)
})

onUnmounted(() => {
  if (scrollElement) {
    scrollElement.onscroll = null
    scrollElement.onwheel = null
  }
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
})

watch(() => props.content, () => {
  nextTick(() => {
    activeIndex.value = -1
    updateProgressPosition()
  })
  setTimeout(() => {
    bindScrollEvent()
  }, 200)
})
</script>

<style scoped>
.catalog-sidebar {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border-right: 1px solid var(--border-color);
  position: relative;
  flex-shrink: 0;
  transition: width 0.2s ease;
  min-width: 48px;
  max-width: 400px;
}

.catalog-sidebar.collapsed {
  align-items: center;
  padding-top: 8px;
}

.catalog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.collapsed .catalog-header {
  padding: 8px;
  border-bottom: none;
  justify-content: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 4px;
}

.catalog-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.catalog-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-color-3);
  font-size: 13px;
  padding: 24px;
}

.catalog-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
  position: relative;
}

.catalog-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.catalog-item:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
}

.catalog-item.active {
  background: var(--primary-light);
}

.catalog-item.active .item-indicator .dot {
  background: var(--primary-color);
  transform: scale(1.2);
}

.catalog-item.active .item-text {
  color: var(--primary-color);
  font-weight: 500;
}

.item-indicator {
  width: 16px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-indicator .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-color-3);
  transition: all 0.2s ease;
}

.catalog-item:hover .item-indicator .dot {
  background: var(--primary-color);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-text {
  font-size: 13px;
  color: var(--text-color-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.catalog-item.level-1 .item-text {
  font-weight: 600;
  font-size: 14px;
}

.catalog-item.level-2 {
  padding-left: 24px;
}

.catalog-item.level-3 {
  padding-left: 36px;
}

.catalog-item.level-4 {
  padding-left: 48px;
}

.catalog-item.level-5 {
  padding-left: 60px;
}

.catalog-item.level-6 {
  padding-left: 72px;
}

.scroll-progress {
  position: absolute;
  left: 0;
  width: 3px;
  height: 20px;
  background: var(--primary-color);
  border-radius: 0 2px 2px 0;
  transform: translateY(-50%);
  transition: top 0.2s ease;
  pointer-events: none;
}

.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.2s ease;
}

.resize-handle:hover {
  background: var(--primary-color);
}

.catalog-list::-webkit-scrollbar {
  width: 4px;
}

.catalog-list::-webkit-scrollbar-track {
  background: transparent;
}

.catalog-list::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 2px;
}

.catalog-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-color-3);
}
</style>
