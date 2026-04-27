<template>
  <div class="website-manager">
    <div class="page-header">
      <n-h2>搜索管理</n-h2>
      <n-space>
        <n-button-group>
          <n-button
            :type="viewMode === 'card' ? 'primary' : 'default'"
            @click="viewMode = 'card'"
          >
            <template #icon>
              <n-icon><GridOutline /></n-icon>
            </template>
            卡片
          </n-button>
          <n-button
            :type="viewMode === 'table' ? 'primary' : 'default'"
            @click="viewMode = 'table'"
          >
            <template #icon>
              <n-icon><ListOutline /></n-icon>
            </template>
            列表
          </n-button>
        </n-button-group>
        <n-button @click="scanApps" :loading="scanning">
          <template #icon>
            <n-icon><CloudDownloadOutline /></n-icon>
          </template>
          导入桌面应用
        </n-button>
        <n-button @click="importBookmarks" :loading="importingBookmarks">
          <template #icon>
            <n-icon><BookmarkOutline /></n-icon>
          </template>
          导入浏览器书签
        </n-button>
        <n-button type="primary" @click="openAddModal">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          添加
        </n-button>
      </n-space>
    </div>

    <n-input
      v-model:value="searchQuery"
      placeholder="搜索名称或别名..."
      clearable
      style="margin-bottom: 20px"
    >
      <template #prefix>
        <n-icon><SearchOutline /></n-icon>
      </template>
    </n-input>

    <n-tabs v-model:value="activeTab" type="line" style="margin-bottom: 16px">
      <n-tab-pane name="all" tab="全部" />
      <n-tab-pane name="website" tab="网站链接" />
      <n-tab-pane name="app" tab="桌面应用" />
      <n-tab-pane name="bookmark" tab="网页收藏" />
    </n-tabs>

    <!-- <div class="list-info" v-if="!loading && filteredItems.length > 0">
      <n-text depth="3" style="font-size: 12px">
        共 {{ filteredItems.length }} 条数据{{ filteredItems.length > pageSize ? `，当前显示前 ${pageSize} 条` : '' }}
      </n-text>
    </div> -->

    <SkeletonLoader v-if="loading" type="card" :count="6" />

    <div v-else-if="viewMode === 'card'" class="card-scroll-container" ref="cardContainerRef" @scroll="handleScroll">
      <div class="card-grid-container">
        <div
          v-for="(item, index) in displayedItems"
          :key="item.id"
          class="card-grid-item"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragover.prevent="handleDragOver($event, index)"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop($event, index)"
          @dragend="handleDragEnd"
          :class="{ 'dragging': dragIndex === index, 'drag-over': dragOverIndex === index }"
        >
          <n-card hoverable class="website-card">
          <template #header>
            <n-space align="center">
              <div class="card-icon-wrapper">
                <img
                  v-if="item?.favicon"
                  :src="item.favicon"
                  class="card-icon"
                  @error="handleCardIconError($event, item)"
                />
                <div
                  v-if="!item?.favicon || item._iconError"
                  class="card-icon-placeholder"
                  :style="{ background: getIconGradient(item.name) }"
                >
                  {{ getFirstWord(item.name) }}
                </div>
              </div>
              <n-space
                vertical
                :size="0"
                style="overflow: hidden; flex: 1; min-width: 0"
              >
                <n-text
                  strong
                  style="
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    display: block;
                  "
                  >{{ item.name }}</n-text
                >
                <n-text
                  v-if="item.alias"
                  depth="3"
                  style="
                    font-size: 12px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    display: block;
                  "
                >
                  {{ item.alias }}
                </n-text>
              </n-space>
            </n-space>
          </template>
          <template #header-extra>
            <n-space>
              <n-button
                v-if="item.type === 'app'"
                text
                @click="openApp(item)"
                title="打开应用"
              >
                <template #icon>
                  <n-icon><RocketOutline /></n-icon>
                </template>
              </n-button>
              <n-button
                v-if="item.type === 'website' || item.type === 'bookmark'"
                text
                @click="openWebsite(item)"
                title="打开网页"
              >
                <template #icon>
                  <n-icon><OpenOutline /></n-icon>
                </template>
              </n-button>
              <n-button text @click="editItem(item)" title="编辑">
                <template #icon>
                  <n-icon><CreateOutline /></n-icon>
                </template>
              </n-button>
              <n-button
                text
                type="error"
                @click="deleteItem(item)"
                title="删除"
              >
                <template #icon>
                  <n-icon><TrashOutline /></n-icon>
                </template>
              </n-button>
            </n-space>
          </template>
          <n-ellipsis :line-clamp="2" class="card-description">
            {{ item.description || "暂无描述" }}
          </n-ellipsis>
          <template #footer>
            <n-space justify="space-between" align="center">
              <n-text depth="3" style="font-size: 12px">
                {{
                  item.type === "app"
                    ? truncatePath(item.app_path)
                    : truncateUrl(item.url)
                }}
              </n-text>
              <n-tag
                :type="
                  item.type === 'app'
                    ? 'info'
                    : item.type === 'bookmark'
                      ? 'warning'
                      : 'success'
                "
                size="small"
              >
                {{
                  item.type === "app"
                    ? "应用"
                    : item.type === "bookmark"
                      ? "书签"
                      : "网站"
                }}
              </n-tag>
            </n-space>
          </template>
        </n-card>
        </div>
      </div>
      
      <!-- <div v-if="loadingMore" class="loading-indicator">
        <n-spin size="small" />
        <n-text depth="3" style="margin-left: 8px; font-size: 12px">加载中...</n-text>
      </div>
      <div v-else-if="displayedItems.length >= filteredItems.length && filteredItems.length > 0" class="loading-indicator">
        <n-text depth="3" style="font-size: 12px">已加载全部 {{ filteredItems.length }} 条数据</n-text>
      </div> -->
    </div>

    <n-data-table
      v-else
      :columns="columns"
      :data="displayedItems"
      :pagination="tablePagination"
      :row-key="(row) => row.id"
      :max-height="600"
    />

    <n-empty
      v-if="filteredItems.length === 0"
      description="暂无数据"
      style="margin-top: 60px"
    />

    <WebsiteModal
      :show="showModal"
      :website="editingItem"
      :existing-apps="existingAppPaths"
      @close="closeModal"
      @save="handleSave"
    />

    <n-modal
      v-model:show="showPreviewModal"
      preset="card"
      title="导入桌面应用"
      style="width: 960px"
      :segmented="{ content: true, footer: true }"
      size="huge"
    >
      <template #header-extra>
        <n-space :size="8">
          <n-button
            secondary
            size="small"
            @click="filterWithAI"
            :loading="filtering"
            :disabled="scannedApps.length === 0"
          >
            <template #icon>
              <n-icon><SparklesOutline /></n-icon>
            </template>
            AI筛选
          </n-button>
          <n-button secondary size="small" @click="selectAll">全选</n-button>
          <n-button secondary size="small" @click="deselectAll"
            >取消全选</n-button
          >
        </n-space>
      </template>

      <div class="import-modal-content">
        <div class="import-header">
          <div class="import-stats">
            <n-tag :bordered="false" type="info" size="medium">
              找到 {{ scannedApps.length }} 个应用
            </n-tag>
            <n-tag :bordered="false" type="success" size="medium">
              已选择 {{ selectedApps.length }} 个
            </n-tag>
          </div>
          <n-space :size="8" align="center">
            <n-select
              v-model:value="appSourceFilter"
              size="medium"
              style="width: 140px"
              :options="appSourceOptions"
              placeholder="筛选来源"
              clearable
            />
            <n-input
              v-model:value="appSearchQuery"
              placeholder="搜索应用名称..."
              clearable
              size="medium"
              style="width: 200px"
            >
              <template #prefix>
                <n-icon><SearchOutline /></n-icon>
              </template>
            </n-input>
          </n-space>
        </div>

        <n-divider style="margin: 12px 0" />

        <n-scrollbar style="max-height: 480px">
          <div class="app-grid">
            <div
              v-for="app in filteredScannedApps"
              :key="app.path || app.name"
              class="app-card"
              :class="{ selected: isAppSelected(app) }"
              @click="toggleAppSelection(app)"
            >
              <div class="app-card-checkbox">
                <n-checkbox
                  :checked="isAppSelected(app)"
                  @update:checked="toggleAppSelection(app)"
                  @click.stop
                />
              </div>
              <div class="app-card-icon">
                <img
                  v-if="app.icon && !app.iconError"
                  :src="app.icon"
                  class="app-icon-img"
                  @error="app.iconError = true"
                />
                <div v-else class="app-icon-fallback">
                  {{ getFirstWord(app.name) }}
                </div>
              </div>
              <div class="app-card-info">
                <n-ellipsis class="app-card-name" :line-clamp="1">
                  {{ app.name }}
                </n-ellipsis>
                <!-- <n-ellipsis class="app-card-path" :line-clamp="1">
                  {{ truncatePath(app.path) }}
                </n-ellipsis> -->
                <n-tag
                  size="tiny"
                  :bordered="false"
                  :type="getSourceTagType(app.source)"
                  class="app-source-tag"
                >
                  {{ getSourceLabel(app.source) }}
                </n-tag>
              </div>
              <div v-if="isAppSelected(app)" class="app-card-badge">
                <n-icon size="16"><CheckmarkCircleOutline /></n-icon>
              </div>
            </div>
          </div>
          <n-empty
            v-if="filteredScannedApps.length === 0"
            description="没有匹配的应用"
            style="padding: 40px 0"
          />
        </n-scrollbar>
      </div>

      <template #footer>
        <n-space justify="space-between" align="center">
          <n-text depth="3" style="font-size: 13px">
            <n-icon size="16" style="vertical-align: -2px; margin-right: 4px"
              ><InformationCircleOutline
            /></n-icon>
            点击应用卡片或复选框进行选择
          </n-text>
          <n-space :size="12">
            <n-button @click="showPreviewModal = false">取消</n-button>
            <n-button
              type="primary"
              @click="importSelectedApps"
              :loading="importing"
              :disabled="selectedApps.length === 0"
            >
              <template #icon>
                <n-icon><CloudDownloadOutline /></n-icon>
              </template>
              导入选中 ({{ selectedApps.length }})
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>

    <n-modal
      v-model:show="showBookmarkModal"
      preset="card"
      title="导入浏览器书签"
      style="width: 960px"
      :segmented="{ content: true, footer: true }"
      size="huge"
    >
      <template #header-extra>
        <n-space :size="8">
          <n-button secondary size="small" @click="selectAllBookmarks"
            >全选</n-button
          >
          <n-button secondary size="small" @click="deselectAllBookmarks"
            >取消全选</n-button
          >
        </n-space>
      </template>

      <div class="import-modal-content">
        <div class="import-header">
          <div class="import-stats">
            <n-tag :bordered="false" type="info" size="medium">
              找到 {{ scannedBookmarks.length }} 个书签
            </n-tag>
            <n-tag :bordered="false" type="success" size="medium">
              已选择 {{ selectedBookmarks.length }} 个
            </n-tag>
          </div>
          <n-input
            v-model:value="bookmarkSearchQuery"
            placeholder="搜索书签名称或URL..."
            clearable
            size="medium"
            style="width: 300px"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
        </div>

        <n-divider style="margin: 12px 0" />

        <n-scrollbar style="max-height: 480px">
          <div class="bookmark-grid">
            <div
              v-for="bookmark in filteredScannedBookmarks"
              :key="bookmark.url"
              class="bookmark-card"
              :class="{ selected: isBookmarkSelected(bookmark) }"
              @click="toggleBookmarkSelection(bookmark)"
            >
              <div class="bookmark-card-checkbox">
                <n-checkbox
                  :checked="isBookmarkSelected(bookmark)"
                  @update:checked="toggleBookmarkSelection(bookmark)"
                  @click.stop
                />
              </div>
              <div class="bookmark-card-icon">
                <img
                  v-if="bookmark.icon && !bookmark._iconError"
                  :src="bookmark.icon"
                  class="bookmark-icon-img"
                  @error="bookmark._iconError = true"
                />
                <div
                  v-else
                  class="bookmark-icon-placeholder"
                  :style="{ background: getIconGradient(bookmark.name) }"
                >
                  {{ getFirstWord(bookmark.name) }}
                </div>
              </div>
              <div class="bookmark-card-info">
                <n-ellipsis
                  class="bookmark-card-name"
                  :line-clamp="1"
                  :tooltip="{ width: 300 }"
                >
                  {{ bookmark.name }}
                </n-ellipsis>
                <n-ellipsis
                  class="bookmark-card-url"
                  :line-clamp="1"
                  :tooltip="{ width: 400 }"
                >
                  {{ truncateUrl(bookmark.url) }}
                </n-ellipsis>
              </div>
              <div
                v-if="isBookmarkSelected(bookmark)"
                class="bookmark-card-badge"
              >
                <n-icon size="16"><CheckmarkCircleOutline /></n-icon>
              </div>
            </div>
          </div>
          <n-empty
            v-if="filteredScannedBookmarks.length === 0"
            description="没有匹配的书签"
            style="padding: 40px 0"
          />
        </n-scrollbar>
      </div>

      <template #footer>
        <n-space justify="space-between" align="center">
          <n-text depth="3" style="font-size: 13px">
            <n-icon size="16" style="vertical-align: -2px; margin-right: 4px"
              ><InformationCircleOutline
            /></n-icon>
            点击书签卡片或复选框进行选择
          </n-text>
          <n-space :size="12">
            <n-button @click="showBookmarkModal = false">取消</n-button>
            <n-button
              type="primary"
              @click="importSelectedBookmarks"
              :loading="importingBookmarks"
              :disabled="selectedBookmarks.length === 0"
            >
              <template #icon>
                <n-icon><BookmarkOutline /></n-icon>
              </template>
              导入选中 ({{ selectedBookmarks.length }})
            </n-button>
          </n-space>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, watch } from "vue";
import {
  NButton,
  NSpace,
  NIcon,
  NAvatar,
  NText,
  NEllipsis,
  NDataTable,
  NGrid,
  NGridItem,
  NCard,
  NInput,
  NH2,
  NEmpty,
  NTag,
  NTabs,
  NTabPane,
  NModal,
  NCheckbox,
  NCheckboxGroup,
  NScrollbar,
  NSpin,
  NInput as NInputComponent,
  NDivider,
  useMessage,
  useDialog
} from "naive-ui";
import {
  AddOutline,
  SearchOutline,
  GridOutline,
  ListOutline,
  OpenOutline,
  CreateOutline,
  TrashOutline,
  CheckmarkOutline,
  CloseOutline,
  RocketOutline,
  CloudDownloadOutline,
  SparklesOutline,
  CheckmarkCircleOutline,
  InformationCircleOutline,
  BookmarkOutline
} from "@vicons/ionicons5";
import { websiteApi } from "../api/website";
import WebsiteModal from "../components/WebsiteModal.vue";
import SkeletonLoader from "../components/SkeletonLoader.vue";
import { useData } from "../store/data";

const message = useMessage();
const dialog = useDialog();
const { websites, reloadWebsites, addWebsite, updateWebsite, removeWebsite, loading } =
  useData();

const items = websites;
const existingAppPaths = computed(() => {
  const paths = new Set();
  const names = new Set();
  items.value.filter((i) => i.type === "app").forEach((i) => {
    if (i.app_path) paths.add(i.app_path.toLowerCase());
    if (i.name) names.add(i.name.toLowerCase());
  });
  return { paths, names };
});
const searchQuery = ref("");
const showModal = ref(false);
const editingItem = ref(null);
const viewMode = ref("card");
const activeTab = ref("website");
const editingRowKey = ref(null);
const editingData = ref({});
const scanning = ref(false);
const importing = ref(false);
const filtering = ref(false);
const showPreviewModal = ref(false);
const scannedApps = ref([]);
const selectedApps = ref([]);
const appSearchQuery = ref("");
const appSourceFilter = ref(null);
const appSourceOptions = [
  { label: "桌面快捷方式", value: "desktop" },
  { label: "开始菜单", value: "startmenu" },
  { label: "注册表", value: "registry" }
];
const importingBookmarks = ref(false);
const showBookmarkModal = ref(false);
const scannedBookmarks = ref([]);
const selectedBookmarks = ref([]);
const bookmarkSearchQuery = ref("");
const dragIndex = ref(-1);
const dragOverIndex = ref(-1);
const pageSize = ref(50);
const loadingMore = ref(false);
const cardContainerRef = ref(null);
const tablePageSize = ref(20);
const tableLoading = ref(false);

const tablePagination = computed(() => ({
  pageSize: tablePageSize.value,
  showSizePicker: true,
  pageSizes: [20, 50, 100],
  showQuickJumper: true,
  onUpdatePageSize: (size) => {
    tableLoading.value = true;
    tablePageSize.value = size;
    setTimeout(() => {
      tableLoading.value = false;
    }, 150);
  }
}));

const displayedItems = computed(() => {
  return filteredItems.value.slice(0, pageSize.value);
});

const loadMore = () => {
  if (loadingMore.value || displayedItems.value.length >= filteredItems.value.length) return;
  loadingMore.value = true;
  setTimeout(() => {
    pageSize.value += 30;
    loadingMore.value = false;
  }, 150);
};

const handleScroll = (e) => {
  const container = e.target;
  const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
  if (scrollBottom < 200) {
    loadMore();
  }
};

watch([activeTab, searchQuery], () => {
  pageSize.value = 50;
});

watch([appSourceFilter, appSearchQuery], () => {
  if (showPreviewModal.value) {
    loadAppIcons(filteredScannedApps.value);
  }
});

const filteredScannedApps = computed(() => {
  let result = scannedApps.value;
  if (appSourceFilter.value) {
    result = result.filter((app) => app.source === appSourceFilter.value);
  }
  if (appSearchQuery.value) {
    const query = appSearchQuery.value.toLowerCase();
    result = result.filter(
      (app) =>
        app.name?.toLowerCase().includes(query) ||
        app.publisher?.toLowerCase().includes(query)
    );
  }
  return result;
});

const loadAppIcons = async (apps, limit = 36) => {
  const appPaths = (apps || [])
    .map((app) => app.path)
    .filter(Boolean)
    .slice(0, limit);

  if (appPaths.length === 0 || !window.electronAPI?.getAppIcons) {
    return;
  }

  try {
    const iconMap = await window.electronAPI.getAppIcons(appPaths);
    scannedApps.value = scannedApps.value.map((app) => ({
      ...app,
      icon: app.icon || iconMap?.[app.path] || ""
    }));
  } catch (error) {
    console.error("加载应用图标失败:", error);
  }
};

const getSourceLabel = (source) => {
  const map = { desktop: "桌面", startmenu: "开始菜单", registry: "注册表" };
  return map[source] || source || "未知";
};

const getSourceTagType = (source) => {
  const map = { desktop: "info", startmenu: "success", registry: "warning" };
  return map[source] || "default";
};

const filteredScannedBookmarks = computed(() => {
  if (!bookmarkSearchQuery.value) return scannedBookmarks.value;
  const query = bookmarkSearchQuery.value.toLowerCase();
  return scannedBookmarks.value.filter(
    (bookmark) =>
      bookmark.name?.toLowerCase().includes(query) ||
      bookmark.url?.toLowerCase().includes(query)
  );
});

const isBookmarkSelected = (bookmark) => {
  return selectedBookmarks.value.includes(bookmark.url);
};

const toggleBookmarkSelection = (bookmark) => {
  const index = selectedBookmarks.value.indexOf(bookmark.url);
  if (index > -1) {
    selectedBookmarks.value.splice(index, 1);
  } else {
    selectedBookmarks.value.push(bookmark.url);
  }
};

const selectAllBookmarks = () => {
  selectedBookmarks.value = scannedBookmarks.value.map((b) => b.url);
};

const deselectAllBookmarks = () => {
  selectedBookmarks.value = [];
};

const isAppSelected = (app) => {
  const key = app.path || app.name;
  return selectedApps.value.includes(key);
};

const toggleAppSelection = (app) => {
  const key = app.path || app.name;
  const index = selectedApps.value.indexOf(key);
  if (index > -1) {
    selectedApps.value.splice(index, 1);
  } else {
    selectedApps.value.push(key);
  }
};

const filterWithAI = async () => {
  filtering.value = true;
  try {
    const response = await websiteApi.filterApps(scannedApps.value);
    scannedApps.value = response.data.data || [];
    selectedApps.value = scannedApps.value.map((app) => app.path || app.name);
    message.success(`AI筛选完成，保留 ${scannedApps.value.length} 个应用`);
  } catch (error) {
    console.error("AI筛选失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "AI筛选失败，请检查API配置";
    message.error(errorMsg);
  } finally {
    filtering.value = false;
  }
};

const filteredItems = computed(() => {
  let result = items.value;

  if (activeTab.value !== "all") {
    result = result.filter((item) => item.type === activeTab.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (item) =>
        item.name?.toLowerCase().includes(query) ||
        item.alias?.toLowerCase().includes(query)
    );
  }

  return result;
});

const windowWidth = ref(window.innerWidth);

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

onMounted(() => {
  window.addEventListener("resize", updateWindowWidth);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateWindowWidth);
});

const responsiveCols = computed(() => {
  const width = windowWidth.value;
  if (width < 480) return 1;
  if (width < 768) return 2;
  if (width < 1200) return 3;
  return 4;
});

const startEdit = (row) => {
  editingRowKey.value = row.id;
  editingData.value = { ...row };
};

const cancelEdit = () => {
  editingRowKey.value = null;
  editingData.value = {};
};

const saveEdit = async (row) => {
  try {
    const updateData = {
      name: editingData.value.name,
      url: editingData.value.url,
      alias: editingData.value.alias,
      favicon: editingData.value.favicon,
      description: editingData.value.description,
      app_path: editingData.value.app_path,
      type: editingData.value.type,
      search_url: editingData.value.search_url
    };
    await websiteApi.update(row.id, updateData);
    updateWebsite(row.id, updateData);
    message.success("更新成功");
    editingRowKey.value = null;
    editingData.value = {};
  } catch (error) {
    console.error("保存失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "保存失败，请重试";
    message.error(errorMsg);
  }
};

const columns = [
  {
    title: "图标",
    key: "favicon",
    width: 60,
    render(row) {
      if (row.favicon) {
        return h("img", {
          src: row.favicon,
          style: {
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            objectFit: "cover"
          },
          onError: (e) => {
            e.target.style.display = "none";
          }
        });
      }
      const name = row.name || "";
      const words = name.split(/[\s\-_\.]+/).filter((w) => w.length > 0);
      const displayText =
        words.length > 0
          ? words[0].charAt(0).toUpperCase() +
            (words[0].length > 1 ? words[0].charAt(1).toLowerCase() : "")
          : name.charAt(0).toUpperCase() || "W";
      return h(
        "div",
        {
          style: {
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "#eee",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            fontSize: "11px"
          }
        },
        displayText
      );
    }
  },
  {
    title: "类型",
    key: "type",
    width: 80,
    render(row) {
      const typeMap = {
        app: { text: "应用", type: "info" },
        bookmark: { text: "书签", type: "warning" },
        website: { text: "网站", type: "success" }
      };
      const config = typeMap[row.type] || typeMap.website;
      return h(
        NTag,
        {
          size: "small",
          type: config.type
        },
        {
          default: () => config.text
        }
      );
    }
  },
  {
    title: "名称",
    key: "name",
    ellipsis: { tooltip: true },
    render(row) {
      if (editingRowKey.value === row.id) {
        return h(NInputComponent, {
          value: editingData.value.name,
          onUpdateValue: (v) => {
            editingData.value.name = v;
          },
          size: "small",
          placeholder: "名称"
        });
      }
      return row.name;
    }
  },
  {
    title: "别名",
    key: "alias",
    ellipsis: { tooltip: true },
    render(row) {
      if (editingRowKey.value === row.id) {
        return h(NInputComponent, {
          value: editingData.value.alias,
          onUpdateValue: (v) => {
            editingData.value.alias = v;
          },
          size: "small",
          placeholder: "别名"
        });
      }
      return row.alias || "-";
    }
  },
  {
    title: "地址",
    key: "address",
    ellipsis: { tooltip: true },
    render(row) {
      if (editingRowKey.value === row.id) {
        if (editingData.value.type === "app") {
          return h(NInputComponent, {
            value: editingData.value.app_path,
            onUpdateValue: (v) => {
              editingData.value.app_path = v;
            },
            size: "small",
            placeholder: "应用路径"
          });
        }
        return h(NInputComponent, {
          value: editingData.value.url,
          onUpdateValue: (v) => {
            editingData.value.url = v;
          },
          size: "small",
          placeholder: "URL"
        });
      }
      return h(
        NText,
        { depth: 3, style: "font-size: 12px;" },
        {
          default: () =>
            row.type === "app"
              ? truncatePath(row.app_path)
              : truncateUrl(row.url)
        }
      );
    }
  },
  {
    title: "描述",
    key: "description",
    ellipsis: { tooltip: true },
    render(row) {
      if (editingRowKey.value === row.id) {
        return h(NInputComponent, {
          value: editingData.value.description,
          onUpdateValue: (v) => {
            editingData.value.description = v;
          },
          size: "small",
          placeholder: "描述"
        });
      }
      return row.description || "-";
    }
  },
  {
    title: "搜索URL",
    key: "search_url",
    width: 150,
    ellipsis: { tooltip: true },
    render(row) {
      if (editingRowKey.value === row.id) {
        return h(NInputComponent, {
          value: editingData.value.search_url,
          onUpdateValue: (v) => {
            editingData.value.search_url = v;
          },
          size: "small",
          placeholder: "搜索URL模板"
        });
      }
      return row.search_url || "-";
    }
  },
  // {
  //   title: "图标URL",
  //   key: "favicon_edit",
  //   width: 150,
  //   ellipsis: { tooltip: true },
  //   render(row) {
  //     if (editingRowKey.value === row.id) {
  //       return h(NInputComponent, {
  //         value: editingData.value.favicon,
  //         onUpdateValue: (v) => {
  //           editingData.value.favicon = v;
  //         },
  //         size: "small",
  //         placeholder: "图标URL"
  //       });
  //     }
  //     return h(
  //       NText,
  //       { depth: 3, style: "font-size: 12px;" },
  //       {
  //         default: () => (row.favicon ? "已设置" : "-")
  //       }
  //     );
  //   }
  // },
  {
    title: "操作",
    key: "actions",
    width: 140,
    render(row) {
      if (editingRowKey.value === row.id) {
        return h(
          NSpace,
          { size: 4 },
          {
            default: () => [
              h(
                NButton,
                {
                  text: true,
                  type: "primary",
                  onClick: () => saveEdit(row)
                },
                {
                  icon: () =>
                    h(NIcon, null, { default: () => h(CheckmarkOutline) })
                }
              ),
              h(
                NButton,
                {
                  text: true,
                  onClick: cancelEdit
                },
                {
                  icon: () => h(NIcon, null, { default: () => h(CloseOutline) })
                }
              )
            ]
          }
        );
      }
      return h(
        NSpace,
        { size: 4 },
        {
          default: () => [
            row.type === "app"
              ? h(
                  NButton,
                  {
                    text: true,
                    onClick: () => openApp(row),
                    title: "打开应用"
                  },
                  {
                    icon: () =>
                      h(NIcon, null, { default: () => h(RocketOutline) })
                  }
                )
              : h(
                  NButton,
                  {
                    text: true,
                    onClick: () => openWebsite(row),
                    title: "打开网站"
                  },
                  {
                    icon: () =>
                      h(NIcon, null, { default: () => h(OpenOutline) })
                  }
                ),
            h(
              NButton,
              {
                text: true,
                onClick: () => startEdit(row),
                title: "编辑"
              },
              {
                icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
              }
            ),
            h(
              NButton,
              {
                text: true,
                type: "error",
                onClick: () => deleteItem(row),
                title: "删除"
              },
              {
                icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
              }
            )
          ]
        }
      );
    }
  }
];

const loadItems = async () => {
  try {
    await reloadWebsites();
  } catch (error) {
    console.error("加载数据失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "加载数据失败";
    message.error(errorMsg);
  }
};

const openAddModal = () => {
  editingItem.value = null;
  showModal.value = true;
};

const editItem = (item) => {
  editingItem.value = { ...item };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingItem.value = null;
};

const handleSave = async (data) => {
  try {
    const editingId = editingItem.value?.id;
    if (editingId) {
      await websiteApi.update(editingId, data);
      updateWebsite(editingId, data);
      message.success("更新成功");
    } else {
      const response = await websiteApi.create(data);
      if (response.data.data) {
        addWebsite(response.data.data);
      }
      message.success("添加成功");
    }
    closeModal();
    await loadItems();
  } catch (error) {
    console.error("保存失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "保存失败，请重试";
    message.error(errorMsg);
  }
};

const deleteItem = (item) => {
  dialog.warning({
    title: "确认删除",
    content: `确定要删除 "${item.name}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await websiteApi.delete(item.id);
        removeWebsite(item.id);
        await loadItems();
        message.success("删除成功");
      } catch (error) {
        console.error("删除失败:", error);
        const errorMsg = error.response?.data?.error || error.message || "删除失败，请重试";
        message.error(errorMsg);
      }
    }
  });
};

const openWebsite = (item) => {
  if (item.url) {
    window.electronAPI?.openExternal(item.url);
  }
};

const openApp = (item) => {
  if (item.app_path) {
    window.electronAPI?.openApp(item.app_path);
  }
};

const scanApps = async () => {
  scanning.value = true;
  try {
    const result = await window.electronAPI?.autoImportApps();
    if (result && result.length > 0) {
      const { paths: existingPaths, names: existingNames } = existingAppPaths.value;
      scannedApps.value = result.filter((app) => {
        const appPath = app.path?.toLowerCase();
        const appName = app.name?.toLowerCase();
        return !existingPaths.has(appPath) && !existingNames.has(appName);
      });
      selectedApps.value = [];
      appSourceFilter.value = null;

      if (scannedApps.value.length === 0) {
        message.info("所有应用已导入过");
      } else {
        const desktopCount = scannedApps.value.filter(a => a.source === "desktop").length;
        const startMenuCount = scannedApps.value.filter(a => a.source === "startmenu").length;
        const registryCount = scannedApps.value.filter(a => a.source === "registry").length;
        const sourceInfo = [];
        if (desktopCount) sourceInfo.push(`桌面 ${desktopCount}`);
        if (startMenuCount) sourceInfo.push(`开始菜单 ${startMenuCount}`);
        if (registryCount) sourceInfo.push(`注册表 ${registryCount}`);
        message.info(`扫描完成：${sourceInfo.join("、")}`);
        showPreviewModal.value = true;
        loadAppIcons(scannedApps.value);
      }
    } else {
      message.info("未找到新的应用");
    }
  } catch (error) {
    console.error("扫描应用失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "扫描应用失败";
    message.error(errorMsg);
  } finally {
    scanning.value = false;
  }
};

const selectAll = () => {
  selectedApps.value = scannedApps.value.map((app) => app.path || app.name);
};

const deselectAll = () => {
  selectedApps.value = [];
};

const getFirstWord = (name) => {
  if (!name) return "A";
  return name.charAt(0).toUpperCase();
};

const handleIconError = (e) => {
  e.target.style.display = "none";
  const placeholder = document.createElement("div");
  placeholder.className = "app-icon-placeholder";
  placeholder.textContent = getFirstWord(e.target.alt);
  e.target.parentNode.insertBefore(placeholder, e.target);
};

const handleCardIconError = (e, item) => {
  e.target.style.display = "none";
  if (item) {
    item._iconError = true;
  }
};

const getIconGradient = (name) => {
  const colors = [
    "#667eea",
    "#f5576c",
    "#4facfe",
    "#43e97b",
    "#fa709a",
    "#a8edea",
    "#ff9a9e",
    "#fcb69f"
  ];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const importSelectedApps = async () => {
  importing.value = true;
  let imported = 0;
  let failedApps = [];
  try {
    for (const key of selectedApps.value) {
      const app = scannedApps.value.find((a) => (a.path || a.name) === key);
      if (app) {
        try {
          const response = await websiteApi.create({
            name: app.name,
            app_path: app.path || "",
            favicon: app.icon || "",
            type: "app"
          });
          if (response.data.data) {
            addWebsite(response.data.data);
          }
          imported++;
        } catch (e) {
          console.error("导入应用失败:", e);
          const errorMsg = e.response?.data?.error || e.message || "导入失败";
          failedApps.push(`${app.name}: ${errorMsg}`);
        }
      }
    }
    showPreviewModal.value = false;
    if (imported > 0) {
      message.success(`成功导入 ${imported} 个应用`);
    }
    if (failedApps.length > 0) {
      message.warning(`部分应用导入失败: ${failedApps.slice(0, 3).join(', ')}${failedApps.length > 3 ? '...' : ''}`);
    }
  } catch (error) {
    console.error("导入失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "导入失败";
    message.error(errorMsg);
  } finally {
    importing.value = false;
  }
};

const importBookmarks = async () => {
  importingBookmarks.value = true;
  try {
    const bookmarks = await window.electronAPI?.importBrowserBookmarks();
    if (bookmarks && bookmarks.length > 0) {
      const existingUrls = new Set(
        items.value
          .filter((i) => i.type === "bookmark" || i.type === "website")
          .map((i) => i.url)
      );
      scannedBookmarks.value = bookmarks.filter(
        (b) => !existingUrls.has(b.url)
      );
      selectedBookmarks.value = [];

      if (scannedBookmarks.value.length === 0) {
        message.info("所有书签已导入过");
      } else {
        showBookmarkModal.value = true;
      }
    } else if (bookmarks === null) {
      // 用户取消选择
    } else {
      message.info("未找到新的书签");
    }
  } catch (error) {
    console.error("导入书签失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "导入书签失败";
    message.error(errorMsg);
  } finally {
    importingBookmarks.value = false;
  }
};

const importSelectedBookmarks = async () => {
  importingBookmarks.value = true;
  let imported = 0;
  let failedBookmarks = [];
  try {
    for (const url of selectedBookmarks.value) {
      const bookmark = scannedBookmarks.value.find((b) => b.url === url);
      if (bookmark) {
        try {
          const favicon = bookmark.icon || getBookmarkFavicon(bookmark.url);
          const response = await websiteApi.create({
            name: bookmark.name,
            url: bookmark.url,
            favicon: favicon,
            type: "bookmark"
          });
          if (response.data.data) {
            addWebsite(response.data.data);
          }
          imported++;
        } catch (e) {
          console.error("导入书签失败:", e);
          const errorMsg = e.response?.data?.error || e.message || "导入失败";
          failedBookmarks.push(`${bookmark.name}: ${errorMsg}`);
        }
      }
    }
    showBookmarkModal.value = false;
    if (imported > 0) {
      message.success(`成功导入 ${imported} 个书签`);
    }
    if (failedBookmarks.length > 0) {
      message.warning(`部分书签导入失败: ${failedBookmarks.slice(0, 3).join(', ')}${failedBookmarks.length > 3 ? '...' : ''}`);
    }
  } catch (error) {
    console.error("导入失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "导入失败";
    message.error(errorMsg);
  } finally {
    importingBookmarks.value = false;
  }
};

const truncateUrl = (url) => {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url.length > 30 ? url.substring(0, 30) + "..." : url;
  }
};

const truncatePath = (path) => {
  if (!path) return "";
  const fileName = path.split(/[/\\]/).pop();
  return fileName || path;
};

const getBookmarkDomain = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const getBookmarkFavicon = (url) => {
  const domain = getBookmarkDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

const handleDragStart = (e, index) => {
  dragIndex.value = index;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', index.toString());
};

const handleDragOver = (e, index) => {
  if (dragIndex.value !== index) {
    dragOverIndex.value = index;
  }
};

const handleDragLeave = () => {
  dragOverIndex.value = -1;
};

const handleDrop = async (e, targetIndex) => {
  const sourceIndex = dragIndex.value;
  if (sourceIndex === targetIndex) {
    return;
  }
  
  const items = [...filteredItems.value];
  const [movedItem] = items.splice(sourceIndex, 1);
  items.splice(targetIndex, 0, movedItem);
  
  const orders = items.map((item, idx) => ({
    id: item.id,
    sort_order: idx
  }));
  
  try {
    await websiteApi.reorder(orders);
    await loadItems();
    message.success('排序已更新');
  } catch (error) {
    console.error('更新排序失败:', error);
    const errorMsg = error.response?.data?.error || error.message || '更新排序失败';
    message.error(errorMsg);
  }
  
  dragOverIndex.value = -1;
};

const handleDragEnd = () => {
  dragIndex.value = -1;
  dragOverIndex.value = -1;
};

onMounted(() => {
  loadItems();
});
</script>

<style scoped>
.website-manager {
  height: 100%;
}

.list-info {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: var(--card-bg, #f5f5f5);
  border-radius: 8px;
}

.card-scroll-container {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  padding-right: 4px;
}

.card-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.card-scroll-container::-webkit-scrollbar-thumb {
  background: var(--border-color, #ddd);
  border-radius: 3px;
}

.card-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary, #999);
}

.load-more-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
  border-top: 1px solid var(--border-color, #eee);
  margin-top: 16px;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
  margin-top: 8px;
}

.card-grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.card-grid-item {
  display: flex;
}

.website-card {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s, box-shadow 0.2s;
}

.website-card :deep(.n-card__content) {
  flex: 1;
  padding: 12px 16px;
}

.website-card :deep(.n-card-header) {
  padding: 12px 16px;
}

.website-card :deep(.n-card__footer) {
  padding: 8px 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dragging .website-card {
  opacity: 0.5;
  transform: scale(0.98);
}

.drag-over .website-card {
  border: 2px dashed var(--primary-color, #667eea);
  transform: scale(1.02);
}

.card-description {
  min-height: 44px;
}

.card-icon-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  object-fit: cover;
  display: block;
}

.card-icon-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.app-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  background: var(--card-bg, #fff);
}

.app-item:hover {
  background: rgba(102, 126, 234, 0.08);
  border-color: rgba(102, 126, 234, 0.2);
}

.app-item.selected {
  background: rgba(102, 126, 234, 0.12);
  border-color: var(--primary-color, #667eea);
}

.app-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  background: rgba(102, 126, 234, 0.05);
}

.app-icon-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
  flex-shrink: 0;
}

.app-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.app-name {
  font-size: 14px;
  font-weight: 500;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-path {
  font-size: 12px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-secondary, #666);
}

.import-modal-content {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: calc(90vh - 200px);
  overflow: hidden;
}

.import-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.import-stats {
  display: flex;
  gap: 8px;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 4px;
}

.app-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  background: var(--card-bg, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.app-card:hover {
  background: rgba(102, 126, 234, 0.04);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.app-card.selected {
  background: rgba(102, 126, 234, 0.08);
  border-color: var(--primary-color, #667eea);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.app-card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
}

.app-card-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-icon-img {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  background: rgba(102, 126, 234, 0.05);
}

.app-icon-fallback {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 18px;
  background: var(--primary-color, #667eea);
}

.app-card-info {
  width: 100%;
  text-align: center;
  min-width: 0;
  overflow: hidden;
}

.app-card-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color, #333);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.app-card-path {
  font-size: 11px;
  color: var(--text-secondary, #999);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.app-source-tag {
  margin-top: 2px;
  font-size: 10px;
  line-height: 1;
  padding: 0 4px;
  height: 16px;
}

.app-card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--primary-color, #667eea);
}

.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 4px;
}

.bookmark-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  background: var(--card-bg, #fff);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  min-width: 0;
}

.bookmark-card:hover {
  background: rgba(102, 126, 234, 0.04);
  border-color: rgba(102, 126, 234, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.bookmark-card.selected {
  background: rgba(102, 126, 234, 0.08);
  border-color: var(--primary-color, #667eea);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.bookmark-card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
}

.bookmark-card-icon {
  width: 32px;
  height: 32px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.bookmark-icon-img {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  object-fit: contain;
}

.bookmark-icon-placeholder {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.bookmark-card-info {
  flex: 1;
  min-width: 0;
  width: 0;
  overflow: hidden;
}

.bookmark-card-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color, #333);
  margin-bottom: 2px;
}

.bookmark-card-url {
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.bookmark-card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--primary-color, #667eea);
}

@media (max-width: 1400px) {
  .bookmark-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1200px) {
  .app-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .app-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bookmark-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .website-manager .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .app-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .website-card {
    height: 160px;
  }

  .card-icon-wrapper {
    width: 32px;
    height: 32px;
  }

  .card-icon {
    width: 32px;
    height: 32px;
  }

  .card-icon-placeholder {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }
}

@media (max-width: 512px) {
  .website-manager .page-header {
    padding: 0 4px;
  }

  .website-manager .n-button-group {
    flex-wrap: wrap;
  }

  .app-grid {
    grid-template-columns: 1fr;
  }

  .bookmark-grid {
    grid-template-columns: 1fr;
  }

  .app-card {
    padding: 12px 8px;
  }

  .app-card-icon {
    width: 40px;
    height: 40px;
  }

  .app-icon-img,
  .app-icon-fallback {
    width: 40px;
    height: 40px;
    font-size: 14px;
  }

  .bookmark-card {
    padding: 10px 8px;
  }

  .bookmark-card-icon {
    width: 28px;
    height: 28px;
    margin-right: 8px;
  }

  .bookmark-icon-img {
    width: 20px;
    height: 20px;
  }

  .bookmark-icon-placeholder {
    width: 20px;
    height: 20px;
    font-size: 10px;
  }
}

.table-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
