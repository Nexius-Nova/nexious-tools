<template>
  <div class="folder-node">
    <div
      class="tree-item"
      :class="{ active: isActive, 'drag-over': isDragOver, disabled: disabled }"
      :style="{ paddingLeft: `${level * 16 + 8}px` }"
      @click="handleClick"
      @dragover.prevent="handleDragOver"
      @dragleave="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <span
        class="expand-trigger"
        :class="{ 'has-children': hasChildren }"
        @click.stop="handleToggleExpand"
      >
        <n-icon v-if="hasChildren" :size="14">
          <ChevronDownOutline v-if="isExpanded" />
          <ChevronForwardOutline v-else />
        </n-icon>
        <span v-else class="expand-placeholder"></span>
      </span>
      <n-icon :size="16"><FolderOutline /></n-icon>
      <span class="folder-name">{{ folder.name }}</span>
      <div class="folder-actions" @click.stop>
        <n-button text size="tiny" @click.stop="$emit('addSub', folder.id)" :disabled="disabled">
          <template #icon><n-icon :size="14"><AddCircleOutline /></n-icon></template>
        </n-button>
        <n-button text size="tiny" @click.stop="$emit('edit', folder)" :disabled="disabled">
          <template #icon><n-icon :size="14"><CreateOutline /></n-icon></template>
        </n-button>
        <n-button text size="tiny" @click.stop="$emit('delete', folder)" :disabled="disabled">
          <template #icon><n-icon :size="14"><TrashOutline /></n-icon></template>
        </n-button>
      </div>
    </div>
    <div v-if="hasChildren && isExpanded" class="folder-children">
      <FolderTreeNode
        v-for="child in folder.children"
        :key="child.id"
        :folder="child"
        :level="level + 1"
        :current-folder-id="currentFolderId"
        :expanded-folders="expandedFolders"
        :disabled="disabled"
        @select="(id) => $emit('select', id)"
        @edit="(f) => $emit('edit', f)"
        @delete="(f) => $emit('delete', f)"
        @toggle-expand="(id) => $emit('toggleExpand', id)"
        @add-sub="(pid) => $emit('addSub', pid)"
        @move-doc="(data) => $emit('moveDoc', data)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { NIcon, NButton } from 'naive-ui'
import {
  FolderOutline, ChevronDownOutline, ChevronForwardOutline,
  AddCircleOutline, CreateOutline, TrashOutline
} from '@vicons/ionicons5'

const props = defineProps({
  folder: { type: Object, required: true },
  level: { type: Number, default: 0 },
  currentFolderId: { type: [Number, null], default: null },
  expandedFolders: { type: Set, default: () => new Set() },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['select', 'edit', 'delete', 'toggleExpand', 'addSub', 'moveDoc'])

const isDragOver = ref(false)

const hasChildren = computed(() => props.folder.children && props.folder.children.length > 0)
const isExpanded = computed(() => props.expandedFolders.has(Number(props.folder.id)))
const isActive = computed(() => props.currentFolderId === props.folder.id || String(props.currentFolderId) === String(props.folder.id))

const handleSelect = () => {
  emit('select', props.folder.id)
}

const handleClick = () => {
  if (props.disabled) return
  handleSelect()
}

const handleToggleExpand = () => {
  if (hasChildren.value) {
    emit('toggleExpand', props.folder.id)
  }
}

const handleDragOver = (e) => {
  if (e.dataTransfer.types.includes('text/plain')) {
    isDragOver.value = true
  }
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (e) => {
  isDragOver.value = false
  const docId = e.dataTransfer.getData('text/plain')
  if (docId) {
    emit('moveDoc', { docId: Number(docId), folderId: props.folder.id })
  }
}
</script>

<style scoped>
.folder-node {
  display: flex;
  flex-direction: column;
}

.folder-children {
  display: flex;
  flex-direction: column;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  flex-wrap: nowrap;
}

.tree-item:hover {
  background: var(--bg-color);
}

.tree-item.active {
  background: var(--primary-light);
  color: var(--primary-color);
}

.tree-item.drag-over {
  background: var(--primary-light);
  border: 2px dashed var(--primary-color);
}

.tree-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tree-item.disabled:hover {
  background: transparent;
}

.expand-trigger {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.expand-trigger.has-children:hover {
  background: var(--bg-color);
  border-radius: 4px;
}

.expand-placeholder {
  width: 14px;
}

.folder-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
  margin-left: auto;
}

.tree-item:hover .folder-actions {
  opacity: 1;
}
</style>