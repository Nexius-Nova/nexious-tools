<template>
  <n-layout-sider
    bordered
    collapse-mode="width"
    :collapsed-width="48"
    :width="150"
    :collapsed="collapsed"
    show-trigger
    @collapse="$emit('collapse')"
    @expand="$emit('expand')"
    class="sidebar-sider"
  >
    <n-menu
      :value="activeTab"
      :collapsed="collapsed"
      :collapsed-width="48"
      :collapsed-icon-size="20"
      :options="menuOptions"
      @update:value="handleMenuChange"
    />
    <div class="sidebar-footer" v-show="!collapsed">
      <n-text depth="3" style="font-size: 11px;">v1.0.0</n-text>
    </div>
  </n-layout-sider>
</template>

<script setup>
import { h } from 'vue'
import { NMenu, NText, NIcon, NLayoutSider } from 'naive-ui'
import { 
  GlobeOutline, 
  LockClosedOutline, 
  CodeSlashOutline, 
  SettingsOutline,
  ChatbubblesOutline,
  DocumentTextOutline
} from '@vicons/ionicons5'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'websites'
  },
  collapsed: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['changeTab', 'collapse', 'expand'])

const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions = [
  {
    label: '搜索管理',
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
    label: '文档管理',
    key: 'documents',
    icon: renderIcon(DocumentTextOutline)
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
.sidebar-sider {
  background: var(--sidebar-bg);
}

.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  text-align: center;
  pointer-events: none;
}
</style>
