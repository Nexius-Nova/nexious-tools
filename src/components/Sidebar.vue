<template>
  <aside class="sidebar">
    <n-menu
      :value="activeTab"
      :options="menuOptions"
      @update:value="handleMenuChange"
    />
    <div class="sidebar-footer">
      <n-text depth="3" style="font-size: 11px;">v1.0.0</n-text>
    </div>
  </aside>
</template>

<script setup>
import { h } from 'vue'
import { NMenu, NText, NIcon } from 'naive-ui'
import { 
  GlobeOutline, 
  LockClosedOutline, 
  CodeSlashOutline, 
  SettingsOutline,
  ChatbubblesOutline
} from '@vicons/ionicons5'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'websites'
  }
})

const emit = defineEmits(['changeTab'])

const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = [
  {
    label: '网站管理',
    key: 'websites',
    icon: renderIcon(GlobeOutline)
  },
  {
    label: '密码管理',
    key: 'passwords',
    icon: renderIcon(LockClosedOutline)
  },
  {
    label: '代码片段',
    key: 'snippets',
    icon: renderIcon(CodeSlashOutline)
  },
  {
    label: 'AI 助手',
    key: 'ai',
    icon: renderIcon(ChatbubblesOutline)
  },
  {
    label: '应用设置',
    key: 'settings',
    icon: renderIcon(SettingsOutline)
  }
]

const handleMenuChange = (key) => {
  emit('changeTab', key)
}
</script>

<style scoped>
.sidebar {
  width: 150px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-footer {
  margin-top: auto;
  padding: 12px;
  text-align: center;
}
</style>
