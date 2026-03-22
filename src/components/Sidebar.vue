<template>
  <n-layout-sider
    bordered
    collapse-mode="width"
    :collapsed-width="64"
    :width="180"
    :collapsed="collapsed"
    show-trigger
    @collapse="collapsed = true"
    @expand="collapsed = false"
    class="sidebar-sider"
  >
    <n-menu
      :collapsed="collapsed"
      :collapsed-width="64"
      :collapsed-icon-size="22"
      :value="activeTab"
      :options="menuOptions"
      @update:value="handleMenuChange"
    />
    <div class="sidebar-footer" v-if="!collapsed">
      <n-text depth="3" style="font-size: 11px">v1.0.0</n-text>
    </div>
  </n-layout-sider>
</template>

<script setup>
import { h, ref } from "vue";
import { NMenu, NText, NIcon } from "naive-ui";
import {
  GlobeOutline,
  LockClosedOutline,
  CodeSlashOutline,
  SettingsOutline,
  ChatbubblesOutline,
  ClipboardOutline,
  DocumentTextOutline
} from "@vicons/ionicons5";

const props = defineProps({
  activeTab: {
    type: String,
    default: "websites"
  }
});

const emit = defineEmits(["changeTab"]);

const collapsed = ref(false);

const renderIcon = (icon) => {
  return () => h(NIcon, null, { default: () => h(icon) });
};

const menuOptions = [
  {
    label: "搜索管理",
    key: "websites",
    icon: renderIcon(GlobeOutline)
  },
  {
    label: "密码管理",
    key: "passwords",
    icon: renderIcon(LockClosedOutline)
  },
  {
    label: "代码片段",
    key: "snippets",
    icon: renderIcon(CodeSlashOutline)
  },
  {
    label: "剪贴板",
    key: "clipboard",
    icon: renderIcon(ClipboardOutline)
  },
  {
    label: "文档管理",
    key: "documents",
    icon: renderIcon(DocumentTextOutline)
  },
  {
    label: "AI 助手",
    key: "ai",
    icon: renderIcon(ChatbubblesOutline)
  },
  {
    label: "应用设置",
    key: "settings",
    icon: renderIcon(SettingsOutline)
  }
];

const handleMenuChange = (key) => {
  emit("changeTab", key);
};
</script>

<style scoped>
.sidebar-sider {
  background: var(--sidebar-bg) !important;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-sider :deep(.n-layout-sider-scroll-container) {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
}

.sidebar-sider :deep(.n-menu) {
  flex: 1;
  min-height: 0;
  background: var(--sidebar-bg) !important;
}

.sidebar-footer {
  padding: 12px;
  text-align: center;
  border-top: 1px solid var(--border-color);
  background: var(--sidebar-bg);
  flex-shrink: 0;
  margin-top: auto;
}
</style>
