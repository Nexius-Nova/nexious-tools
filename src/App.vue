<template>
  <n-config-provider
    :theme="isDarkMode ? darkTheme : null"
    :theme-overrides="themeOverrides"
  >
    <n-message-provider>
      <n-dialog-provider>
        <div class="app-container" :class="{ 'full-app': showFullApp }">
          <template v-if="showFullApp">
            <TitleBar :showBackButton="showBackButton" @back="backToQuickSearch" />
            <n-layout has-sider class="main-layout">
              <Sidebar 
                :activeTab="currentTab" 
                :collapsed="sidebarCollapsed"
                @changeTab="changeTab"
                @collapse="sidebarCollapsed = true"
                @expand="sidebarCollapsed = false"
              />
              <n-layout>
                <n-layout-content class="content-area">
                  <router-view v-slot="{ Component }">
                    <transition name="page-fade" mode="out-in">
                      <suspense>
                        <template #default>
                          <component :is="Component" />
                        </template>
                        <template #fallback>
                          <div class="page-loading">
                            <n-spin size="medium" />
                          </div>
                        </template>
                      </suspense>
                    </transition>
                  </router-view>
                </n-layout-content>
              </n-layout>
            </n-layout>
          </template>

          <template v-else>
            <QuickSearchView
              ref="quickSearchRef"
              :isDarkMode="isDarkMode"
              @openSettings="openSettingsFromQuickSearch"
              @navigateTo="handleNavigateTo"
              @updateSize="handleUpdateSize"
            />
          </template>

          <QuickSearch
            v-if="showQuickSearch && showFullApp"
            @close="showQuickSearch = false"
            @select="handleQuickSelect"
          />

          <n-modal v-model:show="showShortcutHelp" preset="card" title="快捷键帮助" style="width: 500px;">
            <div class="shortcut-help-content">
              <div class="shortcut-section">
                <h4>全局快捷键</h4>
                <div class="shortcut-item">
                  <span class="shortcut-desc">显示/隐藏快速搜索窗口</span>
                  <span class="shortcut-key">{{ globalShortcut }}</span>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-desc">打开快捷键帮助</span>
                  <span class="shortcut-key">Ctrl+Shift+?</span>
                </div>
              </div>
              <div class="shortcut-section">
                <h4>快速搜索窗口</h4>
                <div class="shortcut-item">
                  <span class="shortcut-desc">选择上一个结果</span>
                  <span class="shortcut-key">↑</span>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-desc">选择下一个结果</span>
                  <span class="shortcut-key">↓</span>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-desc">确认选择</span>
                  <span class="shortcut-key">Enter</span>
                </div>
                <div class="shortcut-item">
                  <span class="shortcut-desc">关闭搜索窗口</span>
                  <span class="shortcut-key">Esc</span>
                </div>
              </div>
              <div class="shortcut-section">
                <h4>页面导航</h4>
                <div class="shortcut-item">
                  <span class="shortcut-desc">返回快速搜索窗口</span>
                  <span class="shortcut-key">Esc</span>
                </div>
              </div>
            </div>
          </n-modal>
        </div>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { storeToRefs } from "pinia";
import { useRouter, useRoute } from "vue-router";
import {
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
  NSpin,
  NModal,
  NLayout,
  NLayoutContent,
  darkTheme
} from "naive-ui";
import TitleBar from "./components/TitleBar.vue";
import Sidebar from "./components/Sidebar.vue";
import QuickSearch from "./components/QuickSearch.vue";
import QuickSearchView from "./views/QuickSearchView.vue";
import { settingsApi } from "./api/settings";
import { useTheme } from "./store/theme";
import { useDataStore } from "./store/data";

const router = useRouter();
const route = useRoute();
const { currentTheme, isDarkMode, themeOverrides, loadTheme } = useTheme();
const dataStore = useDataStore();
const { loadAllData } = dataStore;

const currentTab = ref("websites");
const showQuickSearch = ref(false);
const showFullApp = ref(false);
const showBackButton = ref(false);
const sidebarCollapsed = ref(true);
const quickSearchRef = ref(null);
const showShortcutHelp = ref(false);
const globalShortcut = ref("Ctrl+Shift+Space");

const formatShortcutLabel = (shortcut) => {
  if (!shortcut) return "Ctrl+Shift+Space";

  return shortcut
    .replaceAll("CommandOrControl", "Ctrl")
    .replaceAll("Plus", "+");
};

const loadGlobalShortcut = async () => {
  try {
    if (window.electronAPI?.getGlobalShortcut) {
      const shortcut = await window.electronAPI.getGlobalShortcut();
      globalShortcut.value = formatShortcutLabel(shortcut);
      return;
    }

    const response = await settingsApi.get("global_shortcut");
    globalShortcut.value = formatShortcutLabel(response.data.data);
  } catch (error) {
    console.error("加载快捷键失败:", error);
  }
};

const handleUpdateSize = (height) => {
  window.electronAPI?.resizeSearchWindow(height);
};

const handleNavigateTo = (item) => {
  showFullApp.value = true;
  if (item.type === "password") {
    router.push({ path: "/passwords", query: { id: item.id } });
  } else if (item.type === "snippet") {
    router.push({ path: "/snippets", query: { id: item.id } });
  } else if (item.type === "document") {
    router.push({ name: "Documents", query: { id: item.id } });
  }
  showBackButton.value = true;
};

const openSettingsFromQuickSearch = () => {
  showFullApp.value = true;
  router.push("/websites");
  showBackButton.value = true;
};

const backToQuickSearch = () => {
  showFullApp.value = false;
  showBackButton.value = false;
  router.push("/");
  setTimeout(() => {
    nextTick(() => {
      quickSearchRef.value?.focusInput();
      quickSearchRef.value?.updateWindowSize();
    });
  }, 100);
};

watch(showFullApp, (val) => {
  if (val) {
    quickSearchRef.value?.clearSearch();
    window.electronAPI?.expandWindow();
  } else {
    window.electronAPI?.shrinkWindow();
    setTimeout(() => {
      nextTick(() => {
        quickSearchRef.value?.focusInput();
        quickSearchRef.value?.updateWindowSize();
      });
    }, 100);
  }
});

watch(showShortcutHelp, (visible) => {
  if (visible) {
    loadGlobalShortcut();
  }
});

const changeTab = (tab) => {
  currentTab.value = tab;
  router.push(`/${tab}`);
};

const handleQuickSelect = (result) => {
  if (result.type === "website" && result.data?.url) {
    window.electronAPI?.openExternal(result.data.url);
  } else if (result.type === "app" && result.data?.app_path) {
    window.electronAPI?.openApp(result.data.app_path);
  } else if (result.type === "password") {
    showFullApp.value = true;
    router.push({ path: "/passwords", query: { id: result.data?.id } });
    showBackButton.value = true;
  } else if (result.type === "snippet") {
    showFullApp.value = true;
    router.push({ path: "/snippets", query: { id: result.data?.id } });
    showBackButton.value = true;
  } else if (result.type === "settings") {
    showFullApp.value = true;
    router.push("/settings");
    showBackButton.value = true;
  } else if (result.type === "document") {
    showFullApp.value = true;
    router.push({ name: "Documents", query: { id: result.data?.id } });
    showBackButton.value = true;
  }
  showQuickSearch.value = false;
};

const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    if (showFullApp.value) {
      showQuickSearch.value = true;
    }
  }
  if (e.key === "Escape") {
    if (showShortcutHelp.value) {
      showShortcutHelp.value = false;
      return;
    }
    if (showQuickSearch.value) {
      showQuickSearch.value = false;
      return;
    }
    if (showFullApp.value && showBackButton.value) {
      backToQuickSearch();
      return;
    }
    if (!showFullApp.value) {
      quickSearchRef.value?.clearSearch();
    }
  }
  if (e.shiftKey && e.key === "?") {
    e.preventDefault();
    showShortcutHelp.value = true;
  }
};

watch(
  () => route.path,
  (path) => {
    if (path && path !== "/") {
      showFullApp.value = true;
      showBackButton.value = true;
      const tab = path.replace("/", "");
      if (
        ["websites", "passwords", "snippets", "ai", "settings"].includes(tab)
      ) {
        currentTab.value = tab;
      }
    } else {
      showFullApp.value = false;
      showBackButton.value = false;
    }
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown, true);
  loadTheme();
  loadAllData();
  loadGlobalShortcut();
  nextTick(() => {
    quickSearchRef.value?.focusInput();
    quickSearchRef.value?.updateWindowSize();
  });
  
  window.electronAPI?.onWindowRestored(() => {
    nextTick(() => {
      quickSearchRef.value?.focusInput();
      quickSearchRef.value?.selectInput();
    });
  });
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown, true);
});
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  height: 100%;
}

.app-container.full-app {
  background-color: var(--bg-color);
}

.main-layout {
  flex: 1;
  overflow: hidden;
}

.content-area {
  padding: 24px;
  overflow-y: auto;
  background-color: var(--bg-color);
  height: calc(100vh - var(--title-bar-height));
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .content-area {
    padding: 16px;
  }
}

@media (max-width: 768px) {
  .content-area {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .content-area {
    padding: 8px;
  }
}

.shortcut-help-content {
  padding: 8px 0;
}

.shortcut-section {
  margin-bottom: 20px;
}

.shortcut-section:last-child {
  margin-bottom: 0;
}

.shortcut-section h4 {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color-2);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.shortcut-desc {
  font-size: 14px;
  color: var(--text-color-1);
}

.shortcut-key {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 12px;
  padding: 4px 10px;
  background: var(--hover-color);
  border-radius: 6px;
  color: var(--text-color-2);
  border: 1px solid var(--border-color);
}
</style>
