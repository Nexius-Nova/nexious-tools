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
    </n-tabs>

    <n-grid
      v-if="viewMode === 'card'"
      :cols="responsiveCols"
      :x-gap="16"
      :y-gap="16"
      responsive="screen"
    >
      <n-grid-item v-for="item in filteredItems" :key="item.id">
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
              <n-space vertical :size="0">
                <n-text strong>{{ item.name }}</n-text>
                <n-text v-if="item.alias" depth="3" style="font-size: 12px">
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
                v-if="item.type === 'website'"
                text
                @click="openWebsite(item)"
                title="打开网站"
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
                :type="item.type === 'app' ? 'info' : 'success'"
                size="small"
              >
                {{ item.type === "app" ? "应用" : "网站" }}
              </n-tag>
            </n-space>
          </template>
        </n-card>
      </n-grid-item>
    </n-grid>

    <n-data-table
      v-else
      :columns="columns"
      :data="filteredItems"
      :pagination="false"
      :row-key="(row) => row.id"
    />

    <n-empty
      v-if="filteredItems.length === 0"
      description="暂无数据"
      style="margin-top: 60px"
    />

    <WebsiteModal
      :show="showModal"
      :website="editingItem"
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
          <n-button secondary size="small" @click="deselectAll">取消全选</n-button>
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
          <n-input
            v-model:value="appSearchQuery"
            placeholder="搜索应用名称..."
            clearable
            size="medium"
            style="width: 240px"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
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
                <n-ellipsis class="app-card-path" :line-clamp="1">
                  {{ app.path ? truncatePath(app.path) : app.type === "running" ? "运行中" : "已安装" }}
                </n-ellipsis>
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
            <n-icon size="16" style="vertical-align: -2px; margin-right: 4px"><InformationCircleOutline /></n-icon>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h } from "vue";
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
  NInput as NInputComponent,
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
  InformationCircleOutline
} from "@vicons/ionicons5";
import { websiteApi } from "../api/website";
import WebsiteModal from "../components/WebsiteModal.vue";
import { useData } from "../store/data";

const message = useMessage();
const dialog = useDialog();
const { websites, reloadWebsites, addWebsite, updateWebsite, removeWebsite } = useData();

const items = websites;
const searchQuery = ref("");
const showModal = ref(false);
const editingItem = ref(null);
const viewMode = ref("card");
const activeTab = ref("all");
const editingRowKey = ref(null);
const editingData = ref({});
const scanning = ref(false);
const importing = ref(false);
const filtering = ref(false);
const showPreviewModal = ref(false);
const scannedApps = ref([]);
const selectedApps = ref([]);
const appSearchQuery = ref("");

const filteredScannedApps = computed(() => {
  if (!appSearchQuery.value) return scannedApps.value;
  const query = appSearchQuery.value.toLowerCase();
  return scannedApps.value.filter((app) =>
    app.name?.toLowerCase().includes(query)
  );
});

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
    message.error("AI筛选失败，请检查API配置");
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

const windowWidth = ref(window.innerWidth)

const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWindowWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWindowWidth)
})

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
    message.error("保存失败，请重试");
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
      const words = name.split(/[\s\-_\.]+/).filter(w => w.length > 0);
      const displayText = words.length > 0 
        ? words[0].charAt(0).toUpperCase() + (words[0].length > 1 ? words[0].charAt(1).toLowerCase() : "")
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
      return h(
        NTag,
        {
          size: "small",
          type: row.type === "app" ? "info" : "success"
        },
        {
          default: () => (row.type === "app" ? "应用" : "网站")
        }
      );
    }
  },
  {
    title: "名称",
    key: "name",
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
  {
    title: "图标URL",
    key: "favicon_edit",
    width: 150,
    ellipsis: { tooltip: true },
    render(row) {
      if (editingRowKey.value === row.id) {
        return h(NInputComponent, {
          value: editingData.value.favicon,
          onUpdateValue: (v) => {
            editingData.value.favicon = v;
          },
          size: "small",
          placeholder: "图标URL"
        });
      }
      return h(NText, { depth: 3, style: "font-size: 12px;" }, {
        default: () => row.favicon ? "已设置" : "-"
      });
    }
  },
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
    message.error("加载数据失败");
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
    const editingId = editingItem.value?.id
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
    message.error("保存失败，请重试");
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
        message.error("删除失败，请重试");
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
      const existingPaths = new Set(
        items.value.filter((i) => i.type === "app").map((i) => i.app_path)
      );
      scannedApps.value = result.filter((app) => !existingPaths.has(app.path));
      selectedApps.value = [];

      if (scannedApps.value.length === 0) {
        message.info("所有应用已导入过");
      } else {
        showPreviewModal.value = true;
      }
    } else {
      message.info("未找到新的应用");
    }
  } catch (error) {
    console.error("扫描应用失败:", error);
    message.error("扫描应用失败");
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
  e.target.style.display = 'none';
  if (item) {
    item._iconError = true;
  }
};

const getIconGradient = (name) => {
  const colors = [
    '#667eea',
    '#f5576c',
    '#4facfe',
    '#43e97b',
    '#fa709a',
    '#a8edea',
    '#ff9a9e',
    '#fcb69f'
  ];
  const index = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[index];
};

const importSelectedApps = async () => {
  importing.value = true;
  let imported = 0;
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
        }
      }
    }
    showPreviewModal.value = false;
    message.success(`成功导入 ${imported} 个应用`);
  } catch (error) {
    console.error("导入失败:", error);
    message.error("导入失败");
  } finally {
    importing.value = false;
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

onMounted(() => {
  loadItems();
});
</script>

<style scoped>
.website-manager {
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.website-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.website-card :deep(.n-card__content) {
  flex: 1;
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
  max-height: calc(90vh - 180px);
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
}

.app-card-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-color, #333);
  margin-bottom: 2px;
}

.app-card-path {
  font-size: 11px;
  color: var(--text-secondary, #999);
}

.app-card-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  color: var(--primary-color, #667eea);
}

@media (max-width: 1200px) {
  .app-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .website-manager .n-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  
  .app-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .website-manager .page-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .website-manager .n-grid {
    grid-template-columns: 1fr !important;
  }
  
  .app-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .website-card {
    padding: 12px;
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

@media (max-width: 480px) {
  .website-manager .page-header {
    padding: 0 4px;
  }
  
  .website-manager .n-button-group {
    flex-wrap: wrap;
  }
  
  .app-grid {
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
}
</style>
