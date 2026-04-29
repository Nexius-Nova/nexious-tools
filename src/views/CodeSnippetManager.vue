<template>
  <div class="snippet-manager">
    <div class="page-header">
      <n-h2>代码片段</n-h2>
      <n-space>
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索代码片段..."
          clearable
          style="width: 200px"
          @update:value="handleSearchChange"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        <n-tooltip trigger="hover">
          <template #trigger>
            <n-button 
              :type="useRegexSearch ? 'primary' : 'default'" 
              @click="useRegexSearch = !useRegexSearch"
            >
              <template #icon>
                <n-icon><CodeWorkingOutline /></n-icon>
              </template>
            </n-button>
          </template>
          {{ useRegexSearch ? '正则搜索已开启' : '开启正则搜索' }}
        </n-tooltip>
        <n-button type="primary" @click="openAddModal">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          添加片段
        </n-button>
      </n-space>
    </div>

    <div class="three-column-layout">
      <div class="column sidebar-column">
        <div class="column category-column">
          <div class="column-header">
            <n-text strong>分类</n-text>
            <n-button
              text
              size="small"
              @click="showAddCategoryInput = true"
              v-if="!showAddCategoryInput"
            >
              <template #icon>
                <n-icon size="16"><AddOutline /></n-icon>
              </template>
            </n-button>
          </div>
          <div class="column-content">
            <div
              :class="['category-item', { active: selectedCategory === null, 'drag-over': dragOverCategory === 'all' }]"
              @click="selectedCategory = null"
              @dragover.prevent="dragOverCategory = 'all'"
              @dragleave="dragOverCategory = null"
              @drop.prevent="handleDropToCategory($event, null)"
            >
              <n-icon size="16"><AppsOutline /></n-icon>
              <span>全部</span>
            </div>
            <div
              v-for="category in categories"
              :key="category.id"
              :class="[
                'category-item',
                { active: selectedCategory === category.name, 'drag-over': dragOverCategory === category.name, 'editing': editingCategoryId === category.id }
              ]"
              @click="selectedCategory = category.name"
              @dragover.prevent="dragOverCategory = category.name"
              @dragleave="dragOverCategory = null"
              @drop.prevent="handleDropToCategory($event, category.name)"
              @dblclick="startEditCategory(category)"
            >
              <n-icon size="16"><FolderOutline /></n-icon>
              <template v-if="editingCategoryId === category.id">
                <n-input
                  v-model:value="editingCategoryName"
                  size="small"
                  style="flex: 1"
                  @keydown.enter="saveCategoryName(category)"
                  @keydown.escape="cancelEditCategory"
                  @blur="handleCategoryInputBlur(category)"
                  ref="categoryInputRef"
                  autofocus
                />
              </template>
              <template v-else>
                <span>{{ category.name }}</span>
              </template>
              <n-button
                v-if="editingCategoryId !== category.id"
                text
                size="tiny"
                class="edit-category-btn"
                @click.stop="startEditCategory(category)"
              >
                <template #icon>
                  <n-icon size="12"><CreateOutline /></n-icon>
                </template>
              </n-button>
              <n-button
                text
                size="tiny"
                class="delete-category-btn"
                @click.stop="deleteCategory(category)"
              >
                <template #icon>
                  <n-icon size="12"><CloseOutline /></n-icon>
                </template>
              </n-button>
            </div>
            <div v-if="showAddCategoryInput" class="add-category-input">
              <n-input
                v-model:value="newCategoryName"
                placeholder="输入分类名称"
                size="small"
                @keydown.enter="addCategory"
                @keydown.escape="cancelAddCategory"
              />
              <n-space :size="4" style="margin-top: 8px">
                <n-button size="small" type="primary" @click="addCategory">确定</n-button>
                <n-button size="small" @click="cancelAddCategory">取消</n-button>
              </n-space>
            </div>
          </div>
        </div>

        <div class="column tag-column" v-if="tags.length > 0">
          <div class="column-header">
            <n-text strong>标签</n-text>
            <n-button
              v-if="selectedTag"
              text
              size="small"
              @click="selectedTag = null"
            >
              清除
            </n-button>
          </div>
          <div class="column-content">
            <div class="tag-list">
              <n-tag
                v-for="tag in tags"
                :key="tag"
                :type="selectedTag === tag ? 'primary' : 'default'"
                :bordered="selectedTag === tag"
                size="small"
                round
                class="tag-item"
                @click="selectedTag = selectedTag === tag ? null : tag"
              >
                {{ tag }}
              </n-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="column snippet-list-column">
        <div class="column-header">
          <n-text strong>{{ selectedCategory || "全部片段" }}</n-text>
          <n-text depth="3" style="font-size: 12px"
            >{{ filteredSnippets.length }} 个</n-text
          >
        </div>
        <div class="column-content">
          <template v-if="filteredSnippets.length > 0">
            <div
              v-for="snippet in filteredSnippets"
              :key="snippet.id"
              :class="[
                'snippet-item',
                { active: selectedSnippet?.id === snippet.id, dragging: draggingSnippetId === snippet.id, pinned: snippet.pinned }
              ]"
              draggable="true"
              @click="selectSnippet(snippet)"
              @dragstart="handleDragStart($event, snippet)"
              @dragend="handleDragEnd"
            >
              <div class="snippet-item-header">
                <div class="snippet-title-wrapper">
                  <n-icon v-if="snippet.pinned" size="14" color="#faad14" style="margin-right: 4px;"><PinOutline /></n-icon>
                  <n-text strong class="snippet-title" v-html="highlightText(snippet.title)"></n-text>
                </div>
                <n-tag :bordered="false" type="info" size="small">
                  {{ snippet.language }}
                </n-tag>
              </div>
              <n-text depth="3" class="snippet-desc" v-html="highlightText(snippet.description || '暂无描述')">
              </n-text>
              <div class="snippet-item-footer">
                <n-text depth="3" style="font-size: 11px">
                  {{ formatDate(snippet.created_at) }}
                </n-text>
                <n-space :size="4">
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button text size="tiny" @click.stop="togglePin(snippet)">
                        <template #icon>
                          <n-icon size="14" :color="snippet.pinned ? '#faad14' : undefined"><PinOutline /></n-icon>
                        </template>
                      </n-button>
                    </template>
                    {{ snippet.pinned ? '取消置顶' : '置顶' }}
                  </n-tooltip>
                  <n-button text size="tiny" @click.stop="editSnippet(snippet)">
                    <template #icon>
                      <n-icon size="14"><CreateOutline /></n-icon>
                    </template>
                  </n-button>
                  <n-button
                    text
                    size="tiny"
                    type="error"
                    @click.stop="deleteSnippet(snippet)"
                  >
                    <template #icon>
                      <n-icon size="14"><TrashOutline /></n-icon>
                    </template>
                  </n-button>
                </n-space>
              </div>
            </div>
          </template>
          <div v-else class="empty-state">
            <div class="empty-icon">
              <n-icon size="64"><CodeSlashOutline /></n-icon>
            </div>
            <n-text depth="2" style="font-size: 16px; font-weight: 500;">暂无代码片段</n-text>
            <n-text depth="3" style="font-size: 13px;">
              点击右上角「添加片段」按钮创建你的第一个代码片段
            </n-text>
            <n-button type="primary" style="margin-top: 16px;" @click="openAddModal">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              添加第一个片段
            </n-button>
          </div>
        </div>
      </div>

      <div class="column snippet-content-column">
        <div class="column-header">
          <n-text strong>{{ isEditMode ? (editingSnippet?.id ? '编辑片段' : '添加片段') : '代码内容' }}</n-text>
          <n-space v-if="isEditMode" :size="8">
            <n-button size="small" @click="cancelEdit">取消</n-button>
            <n-button size="small" type="primary" @click="saveSnippet" :loading="saving">保存</n-button>
          </n-space>
          <n-space v-else-if="selectedSnippet" :size="8">
            <n-button size="small" @click="formatCode">
              <template #icon>
                <n-icon><CodeOutline /></n-icon>
              </template>
              格式化
            </n-button>
            <n-button size="small" @click="copyCode(selectedSnippet)">
              <template #icon>
                <n-icon><CopyOutline /></n-icon>
              </template>
              复制
            </n-button>
            <n-button size="small" @click="editSnippet(selectedSnippet)">
              <template #icon>
                <n-icon><CreateOutline /></n-icon>
              </template>
              编辑
            </n-button>
          </n-space>
        </div>
        <div class="column-content">
          <template v-if="isEditMode">
            <div class="edit-form">
              <n-form :model="editForm" label-placement="left" label-width="80">
                <n-form-item label="标题" required>
                  <n-input v-model:value="editForm.title" placeholder="输入代码片段标题" />
                </n-form-item>
                <n-form-item label="语言">
                  <n-select
                    v-model:value="editForm.language"
                    :options="languageOptions"
                    placeholder="选择编程语言"
                    filterable
                    tag
                  />
                </n-form-item>
                <n-form-item label="分类">
                  <n-select
                    v-model:value="editForm.category"
                    :options="categoryOptions"
                    placeholder="选择分类"
                    clearable
                    filterable
                    tag
                  />
                </n-form-item>
                <n-form-item label="描述">
                  <n-input
                    v-model:value="editForm.description"
                    type="textarea"
                    placeholder="输入代码片段描述"
                    :rows="2"
                  />
                </n-form-item>
                <n-form-item label="标签">
                  <n-dynamic-tags v-model:value="editForm.tags" />
                </n-form-item>
                <n-form-item label="代码" required>
                  <div class="code-editor-wrapper">
                    <div class="code-viewer-header">
                      <n-select
                        v-model:value="viewerTheme"
                        :options="themeOptions"
                        size="small"
                        style="width: 120px"
                      />
                    </div>
                    <MonacoEditor
                      ref="editorRef"
                      v-model="editForm.code"
                      :language="editForm.language || 'javascript'"
                      :theme="viewerTheme"
                      :min-height="500"
                      :max-height="800"
                    />
                  </div>
                </n-form-item>
              </n-form>
            </div>
          </template>
          <template v-else-if="selectedSnippet">
            <div class="snippet-detail">
              <div class="detail-header">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <n-icon v-if="selectedSnippet.pinned" size="18" color="#faad14"><PinOutline /></n-icon>
                  <n-text strong style="font-size: 16px">{{
                    selectedSnippet.title
                  }}</n-text>
                </div>
                <n-space :size="8">
                  <n-tag :bordered="false" type="info">{{
                    selectedSnippet.language
                  }}</n-tag>
                  <n-tag
                    v-if="selectedSnippet.category"
                    :bordered="false"
                    type="warning"
                  >
                    {{ selectedSnippet.category }}
                  </n-tag>
                </n-space>
              </div>
              <n-text depth="2" style="margin-bottom: 12px; display: block">
                {{ selectedSnippet.description || "暂无描述" }}
              </n-text>
              <n-space
                v-if="selectedSnippet.tags?.length"
                style="margin-bottom: 12px"
              >
                <n-tag
                  v-for="tag in selectedSnippet.tags"
                  :key="tag"
                  size="small"
                  round
                >
                  {{ tag }}
                </n-tag>
              </n-space>
              <div class="code-viewer-header">
                <n-select
                  v-model:value="viewerTheme"
                  :options="themeOptions"
                  size="small"
                  style="width: 120px"
                />
              </div>
              <n-card embedded class="code-card">
                <MonacoEditor
                  ref="viewerEditorRef"
                  v-model="selectedSnippet.code"
                  :language="selectedSnippet.language"
                  :theme="viewerTheme"
                  :read-only="true"
                  :min-height="500"
                  :max-height="800"
                />
              </n-card>
            </div>
          </template>
          <div v-else class="empty-state">
            <div class="empty-icon">
              <n-icon size="64"><DocumentTextOutline /></n-icon>
            </div>
            <n-text depth="2" style="font-size: 16px; font-weight: 500;">选择一个代码片段</n-text>
            <n-text depth="3" style="font-size: 13px;">
              从左侧列表中选择一个代码片段查看详情
            </n-text>
          </div>
        </div>
      </div>
    </div>

    <SnippetModal
      v-if="false"
      :show="showModal"
      :snippet="editingSnippet"
      :categories="categoryNames"
      @close="closeModal"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute } from "vue-router";
import {
  NButton,
  NSpace,
  NIcon,
  NH2,
  NInput,
  NTag,
  NText,
  NCard,
  NEmpty,
  NBadge,
  NSelect,
  NTooltip,
  NForm,
  NFormItem,
  NDynamicTags,
  useMessage,
  useDialog
} from "naive-ui";
import {
  AddOutline,
  SearchOutline,
  CopyOutline,
  CreateOutline,
  TrashOutline,
  AppsOutline,
  FolderOutline,
  CloseOutline,
  PinOutline,
  CodeSlashOutline,
  DocumentTextOutline,
  CodeWorkingOutline,
  CodeOutline
} from "@vicons/ionicons5";
import { snippetApi } from "../api/snippet";
import SnippetModal from "../components/SnippetModal.vue";
import MonacoEditor from "../components/MonacoEditor.vue";
import { useData } from "../store/data";

const route = useRoute();
const message = useMessage();
const dialog = useDialog();
const { snippets, reloadSnippets, addSnippet, updateSnippet, removeSnippet } = useData();

const categories = ref([]);
const tags = ref([]);
const searchQuery = ref("");
const useRegexSearch = ref(false);
const selectedCategory = ref(null);
const selectedTag = ref(null);
const selectedSnippet = ref(null);
const showModal = ref(false);
const editingSnippet = ref(null);
const showAddCategoryInput = ref(false);
const newCategoryName = ref("");
const viewerTheme = ref(localStorage.getItem('snippet-viewer-theme') || "vs-dark");
const draggingSnippetId = ref(null);
const dragOverCategory = ref(null);
const editingCategoryId = ref(null);
const editingCategoryName = ref("");
const viewerEditorRef = ref(null);
const editorRef = ref(null);
const isEditMode = ref(false);
const saving = ref(false);
const editForm = ref({
  title: '',
  language: 'javascript',
  category: '',
  description: '',
  tags: [],
  code: ''
});

watch(viewerTheme, (newTheme) => {
  localStorage.setItem('snippet-viewer-theme', newTheme);
});

const themeOptions = [
  { label: "VSCode 暗色", value: "vs-dark" },
  { label: "VSCode 亮色", value: "vs" },
  { label: "高对比度", value: "hc-black" }
];

const languageOptions = [
  { label: 'JavaScript', value: 'javascript' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'Python', value: 'python' },
  { label: 'Java', value: 'java' },
  { label: 'C++', value: 'cpp' },
  { label: 'C#', value: 'csharp' },
  { label: 'Go', value: 'go' },
  { label: 'Rust', value: 'rust' },
  { label: 'PHP', value: 'php' },
  { label: 'Ruby', value: 'ruby' },
  { label: 'Swift', value: 'swift' },
  { label: 'Kotlin', value: 'kotlin' },
  { label: 'SQL', value: 'sql' },
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
  { label: 'SCSS', value: 'scss' },
  { label: 'Less', value: 'less' },
  { label: 'JSON', value: 'json' },
  { label: 'XML', value: 'xml' },
  { label: 'YAML', value: 'yaml' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Shell', value: 'shell' },
  { label: 'PowerShell', value: 'powershell' },
  { label: 'Dockerfile', value: 'dockerfile' },
  { label: 'Vue', value: 'vue' },
  { label: 'React', value: 'jsx' }
];

const categoryOptions = computed(() => 
  categories.value.map(c => ({ label: c.name, value: c.name }))
);

const categoryNames = computed(() => categories.value.map((c) => c.name));

const highlightText = (text) => {
  if (!searchQuery.value || !text) return text;
  try {
    if (useRegexSearch.value) {
      const regex = new RegExp(`(${searchQuery.value})`, "gi");
      return text.replace(regex, '<mark style="background: #ffe066; padding: 0 2px; border-radius: 2px;">$1</mark>');
    } else {
      const query = searchQuery.value.toLowerCase();
      const lowerText = text.toLowerCase();
      let result = "";
      let lastIndex = 0;
      let index = lowerText.indexOf(query);
      while (index !== -1) {
        result += text.slice(lastIndex, index);
        result += `<mark style="background: #ffe066; padding: 0 2px; border-radius: 2px;">${text.slice(index, index + query.length)}</mark>`;
        lastIndex = index + query.length;
        index = lowerText.indexOf(query, lastIndex);
      }
      result += text.slice(lastIndex);
      return result;
    }
  } catch (e) {
    return text;
  }
};

const handleSearchChange = () => {
};

const handleDragStart = (event, snippet) => {
  draggingSnippetId.value = snippet.id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(snippet));
};

const handleDragEnd = () => {
  draggingSnippetId.value = null;
  dragOverCategory.value = null;
};

const handleDropToCategory = async (event, targetCategory) => {
  dragOverCategory.value = null;
  
  try {
    const snippetData = JSON.parse(event.dataTransfer.getData("text/plain"));
    
    if (snippetData.category === targetCategory) {
      return;
    }
    
    await snippetApi.update(snippetData.id, { 
      ...snippetData, 
      category: targetCategory || null 
    });
    
    updateSnippet(snippetData.id, { category: targetCategory || null });
    message.success(`已移动到「${targetCategory || "无分类"}」`);
    await loadSnippets();
  } catch (error) {
    console.error("移动失败:", error);
    message.error("移动失败");
  }
};

const getCategoryCount = (categoryName) => {
  return snippets.value.filter((s) => s.category === categoryName).length;
};

const filteredSnippets = computed(() => {
  let result = snippets.value;

  if (selectedCategory.value) {
    result = result.filter((s) => s.category === selectedCategory.value);
  }

  if (selectedTag.value) {
    result = result.filter((s) => s.tags && s.tags.includes(selectedTag.value));
  }

  if (searchQuery.value) {
    try {
      if (useRegexSearch.value) {
        const regex = new RegExp(searchQuery.value, "gi");
        result = result.filter(
          (s) =>
            regex.test(s.title) ||
            regex.test(s.description || "") ||
            regex.test(s.code) ||
            regex.test(s.category || "")
        );
      } else {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
          (s) =>
            s.title?.toLowerCase().includes(query) ||
            s.description?.toLowerCase().includes(query) ||
            s.code?.toLowerCase().includes(query) ||
            s.category?.toLowerCase().includes(query)
        );
      }
    } catch (e) {
      message.error("无效的正则表达式");
    }
  }

  return result;
});

const selectSnippet = (snippet) => {
  selectedSnippet.value = snippet;
};

const loadData = async () => {
  await Promise.all([loadSnippets(), loadCategories(), loadTags()]);
};

const loadSnippets = async (skipAutoSelect = false) => {
  try {
    await reloadSnippets();
    if (snippets.value.length > 0 && !selectedSnippet.value && !skipAutoSelect) {
      selectedSnippet.value = snippets.value[0];
    }
  } catch (error) {
    console.error("加载代码片段失败:", error);
    message.error("加载代码片段失败");
  }
};

const loadCategories = async () => {
  try {
    const response = await snippetApi.getCategories();
    categories.value = response.data.data || [];
  } catch (error) {
    console.error("加载分类失败:", error);
  }
};

const loadTags = async () => {
  try {
    const response = await snippetApi.getTags();
    tags.value = response.data.data || [];
  } catch (error) {
    console.error("加载标签失败:", error);
  }
};

const openAddModal = () => {
  isEditMode.value = true;
  editingSnippet.value = null;
  editForm.value = {
    title: '',
    language: 'javascript',
    category: selectedCategory.value || '',
    description: '',
    tags: [],
    code: ''
  };
  selectedSnippet.value = null;
};

const editSnippet = (snippet) => {
  isEditMode.value = true;
  editingSnippet.value = snippet;
  editForm.value = {
    title: snippet.title,
    language: snippet.language,
    category: snippet.category || '',
    description: snippet.description || '',
    tags: snippet.tags || [],
    code: snippet.code
  };
};

const cancelEdit = () => {
  isEditMode.value = false;
  editingSnippet.value = null;
  editForm.value = {
    title: '',
    language: 'javascript',
    category: '',
    description: '',
    tags: [],
    code: ''
  };
};

const saveSnippet = async () => {
  if (!editForm.value.title || !editForm.value.code) {
    message.warning('请填写标题和代码内容');
    return;
  }
  
  saving.value = true;
  
  try {
    if (editingSnippet.value?.id) {
      const response = await fetch(
        `http://localhost:3000/api/snippets/${editingSnippet.value.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editForm.value)
        }
      );
      
      if (!response.ok) throw new Error("更新失败");
      
      message.success("更新成功");
      await loadSnippets();
      const updated = snippets.value.find(s => s.id === editingSnippet.value.id);
      if (updated) {
        selectedSnippet.value = updated;
      }
    } else {
      const response = await fetch("http://localhost:3000/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm.value)
      });
      
      if (!response.ok) throw new Error("创建失败");
      
      const newSnippet = await response.json();
      message.success("创建成功");
      await loadSnippets();
      selectedSnippet.value = newSnippet;
    }
    
    isEditMode.value = false;
    editingSnippet.value = null;
    editForm.value = {
      title: '',
      language: 'javascript',
      category: '',
      description: '',
      tags: [],
      code: ''
    };
  } catch (error) {
    message.error(editingSnippet.value?.id ? "更新失败" : "创建失败");
  } finally {
    saving.value = false;
  }
};

const closeModal = () => {
  showModal.value = false;
  editingSnippet.value = null;
};

const handleSave = async (snippetData) => {
  // 不再使用弹窗保存
};

const togglePin = async (snippet) => {
  try {
    const newPinned = !snippet.pinned;
    await snippetApi.togglePin(snippet.id, newPinned);
    updateSnippet(snippet.id, { pinned: newPinned });
    message.success(newPinned ? "已置顶" : "已取消置顶");
    await loadSnippets();
  } catch (error) {
    console.error("置顶操作失败:", error);
    message.error("操作失败");
  }
};

const deleteSnippet = (snippet) => {
  dialog.warning({
    title: "确认删除",
    content: `确定要删除 "${snippet.title}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await snippetApi.delete(snippet.id);
        removeSnippet(snippet.id);
        message.success("删除成功");
        await loadCategories();
        await loadSnippets();
        if (selectedSnippet.value?.id === snippet.id) {
          selectedSnippet.value = filteredSnippets.value[0] || null;
        }
      } catch (error) {
        console.error("删除代码片段失败:", error);
        message.error("删除失败，请重试");
      }
    }
  });
};

const startEditCategory = (category) => {
  editingCategoryId.value = category.id;
  editingCategoryName.value = category.name;
};

const handleCategoryInputBlur = (category) => {
  setTimeout(() => {
    if (editingCategoryId.value === category.id) {
      saveCategoryName(category);
    }
  }, 100);
};

const saveCategoryName = async (category) => {
  if (!editingCategoryName.value.trim()) {
    message.warning("分类名称不能为空");
    cancelEditCategory();
    return;
  }
  if (editingCategoryName.value.trim() === category.name) {
    cancelEditCategory();
    return;
  }
  try {
    await snippetApi.updateCategory(category.id, editingCategoryName.value.trim());
    message.success("分类名称已更新");
    await loadCategories();
    await loadSnippets();
  } catch (error) {
    if (error.response?.data?.error) {
      message.error(error.response.data.error);
    } else {
      message.error("更新失败");
    }
  }
  editingCategoryId.value = null;
  editingCategoryName.value = "";
};

const cancelEditCategory = () => {
  editingCategoryId.value = null;
  editingCategoryName.value = "";
};

const addCategory = async () => {
  if (!newCategoryName.value.trim()) {
    message.warning("请输入分类名称");
    return;
  }
  try {
    await snippetApi.createCategory(newCategoryName.value.trim());
    message.success("分类添加成功");
    newCategoryName.value = "";
    showAddCategoryInput.value = false;
    await loadCategories();
  } catch (error) {
    if (error.response?.data?.error) {
      message.error(error.response.data.error);
    } else {
      message.error("添加分类失败");
    }
  }
};

const deleteCategory = async (category) => {
  const count = getCategoryCount(category.name);
  if (count > 0) {
    dialog.warning({
      title: "无法删除",
      content: `该分类下有 ${count} 个代码片段，请先移除或更改这些片段的分类`,
      positiveText: "确定"
    });
    return;
  }
  dialog.warning({
    title: "确认删除",
    content: `确定要删除分类 "${category.name}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await snippetApi.deleteCategory(category.id);
        message.success("分类删除成功");
        if (selectedCategory.value === category.name) {
          selectedCategory.value = null;
        }
        await loadCategories();
      } catch (error) {
        message.error("删除分类失败");
      }
    }
  });
};

const cancelAddCategory = () => {
  newCategoryName.value = "";
  showAddCategoryInput.value = false;
};

const copyCode = async (snippet) => {
  try {
    await navigator.clipboard.writeText(snippet.code);
    message.success("代码已复制到剪贴板");
  } catch (error) {
    console.error("复制失败:", error);
    message.error("复制失败");
  }
};

const formatCode = () => {
  if (viewerEditorRef.value && viewerEditorRef.value.format) {
    viewerEditorRef.value.format();
    message.success("代码已格式化");
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN");
};

watch(filteredSnippets, (newVal) => {
  if (newVal.length > 0 && !selectedSnippet.value) {
    selectedSnippet.value = newVal[0];
  } else if (newVal.length === 0) {
    selectedSnippet.value = null;
  }
});

onMounted(async () => {
  const hasQueryId = !!route.query.id;
  await loadData(hasQueryId);
  if (route.query.id) {
    const snippet = snippets.value.find(s => s.id === Number(route.query.id));
    if (snippet) {
      selectSnippet(snippet);
    }
  }
});
</script>

<style scoped>
.snippet-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.three-column-layout {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 0;
}

.column {
  display: flex;
  flex-direction: column;
  background: var(--bg-color, #fff);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
  overflow: hidden;
}

.column-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-color, #fafafa);
}

.column-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.category-column {
  flex-shrink: 0;
}

.sidebar-column {
  width: 180px;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.sidebar-column .category-column {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.sidebar-column .tag-column {
  flex: 1;
  min-height: 0;
  border-top: none;
}

.tag-column {
  flex-shrink: 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px;
}

.tag-item {
  cursor: pointer;
  transition: all 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}

.snippet-list-column {
  width: 280px;
  min-width: 280px;
}

.snippet-content-column {
  flex: 1;
  min-width: 400px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.category-item:hover {
  background: rgba(102, 126, 234, 0.08);
}

.category-item.active {
  background: rgba(102, 126, 234, 0.15);
  color: #667eea;
}

.category-item.drag-over {
  background: rgba(102, 126, 234, 0.25);
  border: 2px dashed #667eea;
  border-radius: 6px;
}

.category-item span {
  flex: 1;
  font-size: 13px;
}

.category-item .n-badge {
  margin-left: auto;
}

.edit-category-btn,
.delete-category-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.category-item:hover .edit-category-btn,
.category-item:hover .delete-category-btn {
  opacity: 1;
}

.category-item.editing {
  background: rgba(102, 126, 234, 0.1);
}

.add-category-input {
  border-top: 1px dashed var(--border-color, #e0e0e0);
  margin-top: 8px;
}

.snippet-item {
  padding: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.snippet-item:hover {
  background: rgba(102, 126, 234, 0.08);
}

.snippet-item.active {
  background: rgba(102, 126, 234, 0.12);
  border-color: rgba(102, 126, 234, 0.3);
}

.snippet-item.dragging {
  opacity: 0.5;
  background: rgba(102, 126, 234, 0.2);
  border: 2px dashed #667eea;
}

.snippet-item.pinned {
  background: rgba(250, 173, 20, 0.08);
  border-color: rgba(250, 173, 20, 0.3);
}

.snippet-item.pinned.active {
  background: rgba(250, 173, 20, 0.15);
}

.snippet-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.snippet-title-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.snippet-title {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.snippet-desc {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  margin-bottom: 8px;
}

.snippet-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  color: #667eea;
}

.snippet-detail {
  padding: 8px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.code-viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 0;
}

.code-card {
  overflow: hidden;
  padding: 0;
  border-radius: 8px;
}

.code-card :deep(.n-card__content) {
  padding: 0 !important;
}

.edit-form {
  padding: 5px 0;
  height: 100%;
  overflow-y: auto;
}

.code-editor-wrapper {
  width: 100%;
  border-radius: 4px;
  overflow: hidden;
}

.code-editor-wrapper .code-viewer-header {
  padding: 0px;
  display: flex;
}
</style>
