<template>
  <div class="ai-chat-layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <n-button type="primary" block @click="startNewConversation">
          <template #icon>
            <n-icon><AddOutline /></n-icon>
          </template>
          新对话
        </n-button>
      </div>
      <div class="sidebar-content">
        <n-scrollbar>
          <div class="conversation-list">
            <div
              v-for="conv in conversations"
              :key="conv.conversation_id"
              :class="[
                'conversation-item',
                { active: currentConversationId === conv.conversation_id }
              ]"
              @click="loadConversation(conv.conversation_id)"
            >
              <div class="conversation-icon">
                <n-icon size="16"><ChatbubblesOutline /></n-icon>
              </div>
              <div class="conversation-info">
                <div
                  class="conversation-title"
                  v-if="editingConversationId === conv.conversation_id"
                >
                  <n-input
                    v-model:value="editingTitle"
                    size="tiny"
                    placeholder="输入标题"
                    @click.stop
                    @keydown.enter="saveConversationTitle(conv.conversation_id)"
                    @keydown.esc="cancelEditTitle"
                  />
                </div>
                <div class="conversation-title" v-else>
                  {{
                    conv.title ||
                    conv.first_message?.substring(0, 20) ||
                    "新对话"
                  }}{{
                    (conv.title || conv.first_message)?.length > 20 ? "..." : ""
                  }}
                </div>
                <div class="conversation-date">
                  {{ formatDateShort(conv.started_at) }}
                </div>
              </div>
              <n-dropdown
                :options="getConversationActions(conv)"
                @select="(key) => handleConversationAction(key, conv)"
                trigger="click"
                placement="bottom-end"
              >
                <n-button
                  text
                  size="tiny"
                  class="conversation-menu-btn"
                  @click.stop
                >
                  <template #icon>
                    <n-icon size="16"><EllipsisVertical /></n-icon>
                  </template>
                </n-button>
              </n-dropdown>
            </div>
            <n-empty
              v-if="conversations.length === 0"
              description="暂无历史对话"
              size="small"
            />
          </div>
        </n-scrollbar>
      </div>
    </div>

    <div class="chat-main">
      <div class="chat-header">
        <div class="header-title">
          <n-h2>AI 对话</n-h2>
        </div>
      </div>

      <div class="chat-container" ref="chatContainer">
        <div class="messages-wrapper">
          <div v-if="messages.length === 0" class="empty-chat">
            <div class="empty-icon">
              <n-icon size="64"><SparklesOutline /></n-icon>
            </div>
            <n-text depth="2" style="font-size: 18px; font-weight: 500"
              >开始与 AI 对话</n-text
            >
            <n-text depth="3" style="font-size: 13px">
              AI 可以访问您的网站、密码、代码片段和设置数据
            </n-text>
          </div>

          <div class="messages-center">
            <div
              v-for="(msg, index) in messages"
              :key="index"
              :class="['message-item', msg.role]"
            >
              <div class="message-body">
                <div
                  v-if="msg.quoted"
                  class="message-quoted-preview"
                >
                  <div class="quoted-preview-line"></div>
                  <div class="quoted-preview-content">
                    <n-text depth="3" style="font-size: 12px">引用{{ msg.quoted.role === 'user' ? '你的' : 'AI' }}消息</n-text>
                    <div class="quoted-preview-text">{{ msg.quoted.content }}</div>
                  </div>
                </div>
                <div
                  v-if="msg.images && msg.images.length > 0"
                  class="message-images"
                >
                  <div
                    v-for="(img, imgIndex) in msg.images"
                    :key="imgIndex"
                    class="message-image-wrapper"
                  >
                    <img
                      :src="getImagePreviewSrc(img)"
                      class="message-image"
                      @click="previewImage(getImagePreviewSrc(img))"
                    />
                    <n-button
                      circle
                      size="tiny"
                      class="image-download-btn"
                      @click="downloadMedia(getImagePreviewSrc(img), `image-${Date.now()}.png`)"
                    >
                      <template #icon>
                        <n-icon><DownloadOutline /></n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>
                <div class="message-content-wrapper">
                  <MessageContent :content="msg.content" @preview-image="handlePreviewImageFromContent" />
                </div>
                <div class="message-actions">
                  <n-button text size="small" @click="quoteMessage(msg)">
                    <template #icon>
                      <n-icon><ChatboxOutline /></n-icon>
                    </template>
                    引用
                  </n-button>
                  <n-button text size="small" @click="copyMessage(msg.content)">
                    <template #icon>
                      <n-icon><CopyOutline /></n-icon>
                    </template>
                    复制
                  </n-button>
                </div>
              </div>
            </div>

            <div v-if="loading" class="message-item assistant">
              <div class="message-body">
                <div class="message-content-wrapper">
                  <MessageContent v-if="streamingContent" :content="streamingContent" />
                  <div v-else class="thinking-indicator">
                    <div class="thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span class="thinking-text">AI 正在思考</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="generatingMedia" class="message-item assistant">
              <div class="message-body">
                <div class="message-content-wrapper">
                  <div class="media-generating-indicator">
                    <div class="media-generating-spinner"></div>
                    <div class="media-generating-info">
                      <span class="media-generating-title">
                        {{ mediaType === 'image' ? '正在生成图片' : '正在生成视频' }}
                      </span>
                      <span class="media-generating-desc">{{ mediaPrompt }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>

      <div class="input-area">
        <div class="input-area-center">
          <div class="input-toolbar">
            <n-dropdown :options="modelOptions" @select="handleModelSelect" v-if="enabledModels.length > 0">
              <n-button size="small" quaternary class="model-select-btn">
                <template #icon>
                  <n-icon><HardwareChipOutline /></n-icon>
                </template>
                <span class="model-select-label">{{ selectedModel ? selectedModel.name : "选择模型" }}</span>
                <n-icon size="12" style="margin-left: 4px"><ChevronDownOutline /></n-icon>
              </n-button>
            </n-dropdown>
            <n-button size="small" quaternary @click="showReferenceModal = true">
              <template #icon>
                <n-icon><LinkOutline /></n-icon>
              </template>
              引用数据
            </n-button>
            <n-divider vertical style="height: 20px; margin: 0 4px" />
            <n-button size="small" quaternary @click="startGenerateMedia('image')" :disabled="generatingMedia">
              <template #icon>
                <n-icon><ImageOutline /></n-icon>
              </template>
              生成图片
            </n-button>
            <n-button size="small" quaternary @click="startGenerateMedia('video')" :disabled="generatingMedia">
              <template #icon>
                <n-icon><VideocamOutline /></n-icon>
              </template>
              生成视频
            </n-button>
          </div>
          <div v-if="selectedReferences.length > 0" class="selected-references">
            <n-tag
              v-for="ref in selectedReferences"
              :key="ref.id"
              closable
              size="small"
              round
              :type="getRefTagType(ref.type)"
              @close="removeReference(ref)"
            >
              {{ ref.type }}: {{ ref.name }}
            </n-tag>
          </div>
          <div v-if="quotedMessage" class="quoted-message-card">
            <div class="quoted-message-header">
              <n-icon size="14"><ChatboxOutline /></n-icon>
              <span>引用{{ quotedMessage.role === 'user' ? '你的' : 'AI' }}消息</span>
              <n-button text size="tiny" @click="quotedMessage = null">
                <template #icon>
                  <n-icon size="14"><CloseOutline /></n-icon>
                </template>
              </n-button>
            </div>
            <div class="quoted-message-content">
              {{ quotedMessage.content }}{{ quotedMessage.fullContent.length > 200 ? '...' : '' }}
            </div>
          </div>
          <div v-if="selectedImages.length > 0" class="selected-images">
            <div
              v-for="(img, index) in selectedImages"
              :key="index"
              class="image-preview-item"
            >
              <img :src="getImagePreviewSrc(img)" :alt="img.name" />
              <n-button
                circle
                size="tiny"
                class="remove-image-btn"
                @click="removeImage(index)"
              >
                <template #icon>
                  <n-icon><CloseOutline /></n-icon>
                </template>
              </n-button>
            </div>
          </div>
          <!-- Chat input mode -->
          <div v-if="!mediaMode" class="input-row">
            <n-button
              v-if="selectedModel && selectedModel.category === 'vision'"
              circle
              size="large"
              quaternary
              :loading="uploadingImage"
              @click="triggerImageUpload"
              :disabled="loading || selectedImages.length >= 5"
            >
              <template #icon>
                <n-icon><ImageOutline /></n-icon>
              </template>
            </n-button>
            <n-input
              class="input-textarea"
              v-model:value="inputMessage"
              type="textarea"
              size="large"
              placeholder="输入消息... (Shift+Enter 换行，Enter 发送)"
              :autosize="{ minRows: 1, maxRows: 4 }"
              @keydown="handleKeydown"
              :disabled="loading"
              clearable
            />
            <n-button
              v-if="loading"
              type="error"
              circle
              size="large"
              @click="stopGeneration"
            >
              <template #icon>
                <n-icon><StopOutline /></n-icon>
              </template>
            </n-button>
            <n-button
              v-else
              type="primary"
              circle
              size="large"
              @click="sendMessage"
              :disabled="!inputMessage.trim() && selectedImages.length === 0"
            >
              <template #icon>
                <n-icon><SendOutline /></n-icon>
              </template>
            </n-button>
          </div>
          <!-- Media generation mode -->
          <div v-else class="media-input-row">
            <n-input
              class="input-textarea"
              v-model:value="mediaPrompt"
              type="textarea"
              size="large"
              :placeholder="mediaType === 'image' ? '请输入图片描述，如：一只可爱的橘猫在阳光下打盹' : '请输入视频描述'"
              :autosize="{ minRows: 1, maxRows: 4 }"
              clearable
            />
            <n-button
              type="primary"
              circle
              size="large"
              :loading="generatingMedia"
              :disabled="!mediaPrompt.trim()"
              @click="confirmGenerateMedia"
            >
              <template #icon>
                <n-icon size="20"><SparklesOutline /></n-icon>
              </template>
            </n-button>
            <n-button
              circle
              size="large"
              @click="cancelMediaMode"
              :disabled="generatingMedia"
            >
              <template #icon>
                <n-icon><CloseOutline /></n-icon>
              </template>
            </n-button>
          </div>
        </div>
      </div>

      <n-modal
        v-model:show="showReferenceModal"
        preset="card"
        title="引用数据"
        style="width: 700px"
      >
        <div class="reference-modal-content">
          <n-tabs v-model:value="activeTab" type="line" animated>
            <n-tab-pane name="websites" tab="网站/应用">
              <n-input
                v-model:value="websiteSearch"
                placeholder="搜索网站..."
                clearable
                style="margin-bottom: 12px"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-scrollbar style="max-height: 320px">
                <div class="reference-grid">
                  <div
                    v-for="site in filteredWebsites"
                    :key="site.id"
                    class="reference-item"
                    @click="
                      addReference({
                        type: '网站',
                        id: site.id,
                        name: site.name,
                        data: site
                      })
                    "
                  >
                    <div class="reference-icon website">
                      <img
                        v-if="site.favicon"
                        :src="site.favicon"
                        class="favicon-img"
                        @error="handleFaviconError"
                      />
                      <n-icon v-else size="20"><GlobeOutline /></n-icon>
                    </div>
                    <div class="reference-info">
                      <div class="reference-name">{{ site.name }}</div>
                      <div class="reference-desc">
                        {{ truncateText(site.url, 35) }}
                      </div>
                    </div>
                  </div>
                </div>
                <n-empty
                  v-if="filteredWebsites.length === 0"
                  description="暂无网站数据"
                  size="small"
                />
              </n-scrollbar>
            </n-tab-pane>
            <n-tab-pane name="passwords" tab="密码">
              <n-input
                v-model:value="passwordSearch"
                placeholder="搜索密码..."
                clearable
                style="margin-bottom: 12px"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-scrollbar style="max-height: 320px">
                <div class="reference-grid">
                  <div
                    v-for="pwd in filteredPasswords"
                    :key="pwd.id"
                    class="reference-item"
                    @click="
                      addReference({
                        type: '密码',
                        id: pwd.id,
                        name: pwd.title || pwd.website_name || pwd.username,
                        data: pwd
                      })
                    "
                  >
                    <div class="reference-icon password">
                      <n-icon size="20"><KeyOutline /></n-icon>
                    </div>
                    <div class="reference-info">
                      <div class="reference-name">
                        {{ pwd.title || pwd.website_name || "未命名" }}
                      </div>
                      <div class="reference-desc">{{ pwd.username }}</div>
                    </div>
                  </div>
                </div>
                <n-empty
                  v-if="filteredPasswords.length === 0"
                  description="暂无密码数据"
                  size="small"
                />
              </n-scrollbar>
            </n-tab-pane>
            <n-tab-pane name="snippets" tab="代码片段">
              <n-input
                v-model:value="snippetSearch"
                placeholder="搜索代码片段..."
                clearable
                style="margin-bottom: 12px"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-scrollbar style="max-height: 320px">
                <div class="reference-grid">
                  <div
                    v-for="snip in filteredSnippets"
                    :key="snip.id"
                    class="reference-item"
                    @click="
                      addReference({
                        type: '代码',
                        id: snip.id,
                        name: snip.title,
                        data: snip
                      })
                    "
                  >
                    <div class="reference-icon snippet">
                      <n-icon size="20"><CodeSlashOutline /></n-icon>
                    </div>
                    <div class="reference-info">
                      <div class="reference-name">{{ snip.title }}</div>
                      <div class="reference-desc">
                        <n-tag size="tiny" :bordered="false">{{
                          snip.language
                        }}</n-tag>
                      </div>
                    </div>
                  </div>
                </div>
                <n-empty
                  v-if="filteredSnippets.length === 0"
                  description="暂无代码片段"
                  size="small"
                />
              </n-scrollbar>
            </n-tab-pane>
            <n-tab-pane name="documents" tab="文档">
              <n-input
                v-model:value="documentSearch"
                placeholder="搜索文档..."
                clearable
                style="margin-bottom: 12px"
              >
                <template #prefix>
                  <n-icon><SearchOutline /></n-icon>
                </template>
              </n-input>
              <n-scrollbar style="max-height: 320px">
                <div class="reference-grid">
                  <div
                    v-for="doc in filteredDocuments"
                    :key="doc.id"
                    class="reference-item"
                    @click="
                      addReference({
                        type: '文档',
                        id: doc.id,
                        name: doc.title || '无标题',
                        data: doc
                      })
                    "
                  >
                    <div class="reference-icon document">
                      <n-icon size="20"><DocumentOutline /></n-icon>
                    </div>
                    <div class="reference-info">
                      <div class="reference-name">
                        {{ doc.title || "无标题" }}
                      </div>
                      <div class="reference-desc">
                        {{ doc.word_count ? `${doc.word_count} 字` : "文档" }}
                      </div>
                    </div>
                  </div>
                </div>
                <n-empty
                  v-if="filteredDocuments.length === 0"
                  description="暂无文档"
                  size="small"
                />
              </n-scrollbar>
            </n-tab-pane>
          </n-tabs>
        </div>
      </n-modal>


    <n-modal
      v-model:show="showImagePreview"
      preset="card"
      style="width: auto; max-width: 90vw; max-height: 90vh"
      :bordered="false"
    >
      <img
        :src="previewImageUrl"
        style="max-width: 100%; max-height: 80vh; object-fit: contain"
      />
    </n-modal>
  </div>
</div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, h } from "vue";
import { storeToRefs } from "pinia";
import {
  NH2,
  NButton,
  NSpace,
  NIcon,
  NInput,
  NText,
  NTag,
  NModal,
  NTabs,
  NTabPane,
  NEmpty,
  NScrollbar,
  NDropdown,
  NDivider,
  useMessage
} from "naive-ui";
import {
  AddOutline,
  TrashOutline,
  ChatbubblesOutline,
  SparklesOutline,
  SendOutline,
  LinkOutline,
  ChatboxOutline,
  CopyOutline,
  SearchOutline,
  KeyOutline,
  GlobeOutline,
  CodeSlashOutline,
  DocumentOutline,
  ChevronDownOutline,
  CreateOutline,
  DownloadOutline,
  StopOutline,
  EllipsisVertical,
  ImageOutline,
  CloseOutline,
  HardwareChipOutline,
  VideocamOutline,
} from "@vicons/ionicons5";
import { aiMessageApi } from "../api/ai-message";
import { aiModelsApi } from "../api/ai-models";
import { aiApi } from "../api/ai";
import { websiteApi } from "../api/website";
import { passwordApi } from "../api/password";
import { snippetApi } from "../api/snippet";
import { documentApi } from "../api/documents";
import MessageContent from "../components/MessageContent.vue";

const message = useMessage();
const messages = ref([]);
const inputMessage = ref("");
const loading = ref(false);
const chatContainer = ref(null);
const streamingContent = ref("");
const abortController = ref(null);
const editingConversationId = ref(null);
const editingTitle = ref("");

const showReferenceModal = ref(false);
const activeTab = ref("websites");
const selectedReferences = ref([]);
const conversations = ref([]);
const currentConversationId = ref(null);
const selectedImages = ref([]);
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
const apiOrigin = apiBase.replace(/\/api$/, "");

const resolveUploadUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  if (url.startsWith("/")) return `${apiOrigin}${url}`;
  return `${apiOrigin}/${url}`;
};
const getImagePreviewSrc = (image) => {
  if (!image) return "";
  if (typeof image === "string") return resolveUploadUrl(image);
  return resolveUploadUrl(image.url || image.base64 || "");
};
const uploadingImage = ref(false);

const enabledModels = ref([]);
const MODEL_STORAGE_KEY = 'nexious_selected_model_id'

const selectedModel = ref(null);

const websites = ref([]);
const passwords = ref([]);
const snippets = ref([]);
const documents = ref([]);

const websiteSearch = ref("");
const passwordSearch = ref("");
const snippetSearch = ref("");
const documentSearch = ref("");

const quotedMessage = ref(null);


const mediaMode = ref(null);
const mediaPrompt = ref('');
const mediaType = ref('image');
const generatingMedia = ref(false);


const modelOptions = computed(() => {
  const filtered = enabledModels.value.filter((m) => {
    if (mediaMode.value === 'image') return m.category === 'vision'
    if (mediaMode.value === 'video') return m.category === 'video'
    return m.category === 'text' || m.category === 'vision'
  })
  const options = filtered.map((m) => ({
    label: m.name,
    key: m.id
  }))
  if (options.length === 0) {
    return [{ label: "暂无可用模型", key: "", disabled: true }]
  }
  return options
});

const categoryLabels = {
  text: "文本模型",
  vision: "视觉模型",
  video: "视频模型",
  audio: "音频模型"
};

const filteredWebsites = computed(() => {
  if (!websiteSearch.value) return websites.value;
  const query = websiteSearch.value.toLowerCase();
  return websites.value.filter(
    (w) =>
      w.name?.toLowerCase().includes(query) ||
      w.url?.toLowerCase().includes(query)
  );
});

const filteredPasswords = computed(() => {
  if (!passwordSearch.value) return passwords.value;
  const query = passwordSearch.value.toLowerCase();
  return passwords.value.filter(
    (p) =>
      p.title?.toLowerCase().includes(query) ||
      p.username?.toLowerCase().includes(query) ||
      p.website_name?.toLowerCase().includes(query)
  );
});

const filteredSnippets = computed(() => {
  if (!snippetSearch.value) return snippets.value;
  const query = snippetSearch.value.toLowerCase();
  return snippets.value.filter(
    (s) =>
      s.title?.toLowerCase().includes(query) ||
      s.language?.toLowerCase().includes(query)
  );
});

const filteredDocuments = computed(() => {
  if (!documentSearch.value) return documents.value;
  const query = documentSearch.value.toLowerCase();
  return documents.value.filter(
    (d) =>
      d.title?.toLowerCase().includes(query) ||
      d.content?.toLowerCase().includes(query)
  );
});

const getRefTagType = (type) => {
  const types = {
    网站: "info",
    密码: "warning",
    代码: "success",
    文档: "error"
  };
  return types[type] || "default";
};

const truncateText = (text, maxLength) => {
  if (!text) return "";
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

const handleFaviconError = (e) => {
  e.target.style.display = "none";
};

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("zh-CN");
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  } else if (days === 1) {
    return "昨天";
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  }
};

const loadData = async () => {
  try {
    const [webRes, pwdRes, snpRes, docRes] =
      await Promise.all([
        websiteApi.getAll(),
        passwordApi.getAll(),
        snippetApi.getAll(),
        documentApi.getAll()
      ]);
    websites.value = webRes.data.data || [];
    passwords.value = pwdRes.data.data || [];
    snippets.value = snpRes.data.data || [];
    documents.value = docRes.data.data || [];
  } catch (error) {
    console.error("加载数据失败:", error);
  }
};

const loadConversations = async () => {
  try {
    const response = await aiMessageApi.getConversations();
    conversations.value = response.data.data || [];
  } catch (error) {
    console.error("加载对话列表失败:", error);
  }
};

const loadConversation = async (conversationId) => {
  try {
    const response = await aiMessageApi.getConversation(conversationId);
    const msgs = response.data.data || [];
    messages.value = msgs.map((m) => ({
      role: m.role,
      content: m.content,
      references: m.references || [],
      images: m.images || [],
      aiReferences: m.role === "assistant" ? m.references || [] : [],
      quoted: m.quoted || null
    }));
    currentConversationId.value = conversationId;
    scrollToBottom();
  } catch (error) {
    console.error("加载对话失败:", error);
    message.error("加载对话失败");
  }
};

const deleteConversation = async (conversationId) => {
  try {
    await aiMessageApi.deleteConversation(conversationId);
    message.success("删除成功");
    await loadConversations();
    if (currentConversationId.value === conversationId) {
      startNewConversation();
    }
  } catch (error) {
    console.error("删除对话失败:", error);
    message.error("删除失败");
  }
};

const startEditTitle = (conv) => {
  editingConversationId.value = conv.conversation_id;
  editingTitle.value = conv.title || conv.first_message?.substring(0, 50) || "";
};

const cancelEditTitle = () => {
  editingConversationId.value = null;
  editingTitle.value = "";
};

const getConversationActions = (conv) => {
  return [
    {
      label: "重命名",
      key: "rename",
      icon: () => h(NIcon, null, { default: () => h(CreateOutline) })
    },
    {
      label: "导出",
      key: "export",
      icon: () => h(NIcon, null, { default: () => h(DownloadOutline) })
    },
    {
      type: "divider"
    },
    {
      label: "删除",
      key: "delete",
      icon: () =>
        h(NIcon, { color: "#d32f2f" }, { default: () => h(TrashOutline) })
    }
  ];
};

const handleConversationAction = (key, conv) => {
  if (key === "rename") {
    startEditTitle(conv);
  } else if (key === "export") {
    exportConversation(conv.conversation_id);
  } else if (key === "delete") {
    deleteConversation(conv.conversation_id);
  }
};

const saveConversationTitle = async (conversationId) => {
  if (!editingTitle.value.trim()) {
    message.warning("标题不能为空");
    return;
  }
  try {
    await aiMessageApi.updateConversationTitle(
      conversationId,
      editingTitle.value.trim()
    );
    message.success("标题已更新");
    await loadConversations();
    editingConversationId.value = null;
    editingTitle.value = "";
  } catch (error) {
    console.error("更新标题失败:", error);
    message.error("更新失败");
  }
};

const exportConversation = async (conversationId) => {
  try {
    const response = await aiMessageApi.getConversation(conversationId);
    const msgs = response.data.data || [];
    const conv = conversations.value.find(
      (c) => c.conversation_id === conversationId
    );

    let markdown = `# ${conv?.title || conv?.first_message?.substring(0, 30) || "AI 对话"}\n\n`;
    markdown += `> 导出时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
    markdown += `---\n\n`;

    for (const msg of msgs) {
      if (msg.role === "user") {
        markdown += `## 👤 用户\n\n${msg.content}\n\n`;
      } else {
        markdown += `## 🤖 AI\n\n${msg.content}\n\n`;
      }
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AI对话_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    message.success("导出成功");
  } catch (error) {
    console.error("导出对话失败:", error);
    message.error("导出失败");
  }
};

const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort();
    abortController.value = null;
    loading.value = false;
    if (streamingContent.value) {
      messages.value.push({
        role: "assistant",
        content: streamingContent.value + "\n\n*[已停止生成]*"
      });
      saveMessage(
        "assistant",
        streamingContent.value + "\n\n*[已停止生成]*",
        []
      );
    }
    streamingContent.value = "";
    message.info("已停止生成");
  }
};

const startNewConversation = () => {
  messages.value = [];
  currentConversationId.value = null;
  selectedReferences.value = [];
  quotedMessage.value = null;
};

const addReference = (ref) => {
  if (
    !selectedReferences.value.find(
      (r) => r.id === ref.id && r.type === ref.type
    )
  ) {
    selectedReferences.value.push(ref);
  }
  showReferenceModal.value = false;
};

const removeReference = (ref) => {
  selectedReferences.value = selectedReferences.value.filter(
    (r) => !(r.id === ref.id && r.type === ref.type)
  );
};

const triggerImageUpload = () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = handleImageSelect;
  input.click();
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });

const handleImageSelect = async (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  uploadingImage.value = true;
  try {
    for (const file of files) {
      if (selectedImages.value.length >= 5) {
        message.warning('最多只能上传5张图片');
        break;
      }
      
      const formData = new FormData();
      formData.append('file', file);

      const [base64, response] = await Promise.all([
        readFileAsDataUrl(file),
        fetch(`${apiBase}/uploads/image`, {
          method: 'POST',
          body: formData
        })
      ]);
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
      
      const result = await response.json();
      if (result.data?.url) {
        selectedImages.value.push({
          url: result.data.url,
          name: result.data.name || file.name,
          base64
        });
      }
    }
  } catch (error) {
    console.error('图片上传失败:', error);
    message.error('图片上传失败');
  } finally {
    uploadingImage.value = false;
  }
};

const removeImage = (index) => {
  selectedImages.value.splice(index, 1);
};

const previewImageUrl = ref('');
const showImagePreview = ref(false);

const previewImage = (url) => {
  previewImageUrl.value = getImagePreviewSrc(url);
  showImagePreview.value = true;
};

const handlePreviewImageFromContent = (url) => {
  previewImageUrl.value = url;
  showImagePreview.value = true;
};

const downloadMedia = async (url, filename) => {
  try {
    const isSameOrigin = url.startsWith('/') || url.startsWith(apiBase) || url.startsWith(location.origin)
    const downloadUrl = isSameOrigin
      ? url
      : `${apiBase}/ai/proxy-download?url=${encodeURIComponent(url)}`

    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('下载失败');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    message.success('下载成功');
  } catch (error) {
    console.error('下载失败:', error);
    message.error('下载失败');
    window.open(url, '_blank');
  }
};

const quoteMessage = (msg) => {
  quotedMessage.value = {
    content: msg.content.substring(0, 200),
    fullContent: msg.content,
    role: msg.role
  };
};

const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content);
    message.success("已复制到剪贴板");
  } catch (error) {
    message.error("复制失败");
  }
};

let previousModelId = null

const startGenerateMedia = (type) => {
  mediaType.value = type;
  mediaPrompt.value = inputMessage.value || '';
  mediaMode.value = type;

  const requiredCategory = type === 'image' ? 'vision' : 'video'
  if (selectedModel.value?.category !== requiredCategory) {
    previousModelId = selectedModel.value?.id || null
    const match = enabledModels.value.find((m) => m.category === requiredCategory)
    if (match) {
      selectedModel.value = match
      localStorage.setItem(MODEL_STORAGE_KEY, match.id)
    }
  }
};

const cancelMediaMode = () => {
  mediaMode.value = null;
  mediaPrompt.value = '';
  if (previousModelId) {
    const prev = enabledModels.value.find((m) => m.id === previousModelId)
    if (prev) {
      selectedModel.value = prev
      localStorage.setItem(MODEL_STORAGE_KEY, prev.id)
    }
    previousModelId = null
  }
};

const confirmGenerateMedia = async () => {
  const prompt = mediaPrompt.value.trim();
  if (!prompt) {
    message.warning('请输入描述内容');
    return;
  }

  const requiredCategory = mediaType.value === 'image' ? 'vision' : 'video'
  if (!selectedModel.value || selectedModel.value.category !== requiredCategory) {
    message.warning(`请先选择${mediaType.value === 'image' ? '视觉' : '视频'}模型`)
    return
  }

  mediaMode.value = null;
  inputMessage.value = '';

  messages.value.push({
    role: 'user',
    content: prompt,
    references: [],
    images: []
  });
  await saveMessage('user', prompt, []);

  generatingMedia.value = true;

  try {
    if (mediaType.value === 'image') {
      const res = await aiApi.generateImage({
        prompt,
        model_id: selectedModel.value?.id || undefined
      });
      const images = res.data?.data?.images || [];
      if (images.length === 0) throw new Error('图片生成失败');
      const imageContent = images.map((img, i) =>
        `![${i === 0 ? '生成的图片' : `生成的图片 ${i + 1}`}](${img.url})`
      ).join('\n\n');

      messages.value.push({
        role: 'assistant',
        content: imageContent || '图片生成失败',
        aiReferences: []
      });
      await saveMessage('assistant', imageContent || '图片生成失败', []);
    } else {
      const res = await aiApi.generateVideo({
        prompt,
        model_id: selectedModel.value?.id || undefined
      });
      const videos = res.data?.data?.videos || [];
      if (videos.length === 0) throw new Error('视频生成失败');
      const videoContent = videos.map((v, i) =>
        v.url
      ).join('\n\n');

      messages.value.push({
        role: 'assistant',
        content: `视频已生成：\n\n${videoContent}`,
        aiReferences: []
      });
      await saveMessage('assistant', `视频已生成：\n\n${videoContent}`, []);
    }
  } catch (error) {
    console.error('生成失败:', error);
    message.error(error.message || '生成失败');
    messages.value.push({
      role: 'assistant',
      content: `生成失败：${error.message || '请检查 API 配置'}`
    });
    await saveMessage('assistant', `生成失败：${error.message || '请检查 API 配置'}`, []);
  } finally {
    generatingMedia.value = false;
    if (previousModelId) {
      const prev = enabledModels.value.find((m) => m.id === previousModelId)
      if (prev) {
        selectedModel.value = prev
        localStorage.setItem(MODEL_STORAGE_KEY, prev.id)
      }
      previousModelId = null
    }
    scrollToBottom();
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
};

const buildReferenceContext = () => {
  if (selectedReferences.value.length === 0) return "";

  let context = "\n\n[用户引用的数据]\n";
  selectedReferences.value.forEach((ref) => {
    if (ref.type === "网站") {
      context += `网站: ${ref.data.name}\nURL: ${ref.data.url}\n描述: ${ref.data.description || "无"}\n\n`;
    } else if (ref.type === "密码") {
      context += `密码条目: ${ref.data.title || ref.data.website_name}\n账号: ${ref.data.username}\n网站: ${ref.data.website_url || "无"}\n\n`;
    } else if (ref.type === "代码") {
      context += `代码片段: ${ref.data.title}\n语言: ${ref.data.language}\n代码:\n${ref.data.code}\n\n`;
    } else if (ref.type === "文档") {
      context += `文档: ${ref.data.title || "无标题"}\n内容:\n${ref.data.content || "无内容"}\n\n`;
    }
  });
  return context;
};

const saveMessage = async (role, content, references, images = [], quoted = null) => {
  try {
    if (!currentConversationId.value) {
      currentConversationId.value = crypto.randomUUID();
    }
    await aiMessageApi.saveMessage({
      conversation_id: currentConversationId.value,
      role,
      content,
      references,
      images,
      quoted
    });
    await loadConversations();
  } catch (error) {
    console.error("保存消息失败:", error);
  }
};

const sendMessage = async () => {
  const content = inputMessage.value.trim();
  const hasImages = selectedImages.value.length > 0;
  if ((!content && !hasImages) || loading.value) return;

  const references = [...selectedReferences.value];
  const images = [...selectedImages.value];
  const quoted = quotedMessage.value ? { ...quotedMessage.value } : null;
  
  let contextContent = content + buildReferenceContext();
  if (quoted) {
    contextContent = `引用消息：\n${quoted.fullContent}\n\n---\n\n${contextContent}`;
  }

  messages.value.push({
    role: "user",
    content,
    references,
    images,
    quoted
  });

  await saveMessage("user", content, references, images, quoted);

  inputMessage.value = "";
  selectedReferences.value = [];
  selectedImages.value = [];
  quotedMessage.value = null;
  scrollToBottom();

  loading.value = true;
  streamingContent.value = "";
  abortController.value = new AbortController();

  try {

    let aiContent = "";
    let aiReferences = [];
    let isTruncated = false;
    let continueFrom = null;

    do {
      const response = await fetch(`${apiBase}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: contextContent,
          history: messages.value.slice(0, -1).map((m) => ({
            role: m.role,
            content:
              m.role === "user"
                ? m.content +
                  (m.references?.length
                    ? buildReferenceContextFromRefs(m.references)
                    : "")
                : m.content,
            images: m.images || []
          })),
          stream: true,
          continueFrom: continueFrom,
          images,
          model_id: selectedModel.value?.id || undefined
        }),
        signal: abortController.value.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `请求失败 (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      isTruncated = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                aiContent += parsed.content;
                streamingContent.value = aiContent;
                scrollToBottom();
              }
              if (parsed.done) {
                aiReferences = parsed.references || [];
              }
              if (parsed.truncated) {
                isTruncated = true;
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              if (e.message && !e.message.includes("JSON")) {
                throw e;
              }
            }
          }
        }
      }

      if (isTruncated && aiContent.length > 0) {
        continueFrom = aiContent.slice(-2000);
        streamingContent.value = aiContent + "\n\n**正在继续生成...**\n";
      }
    } while (isTruncated);

    if (!aiContent) {
      aiContent = "抱歉，我无法处理您的请求。";
    }

    messages.value.push({
      role: "assistant",
      content: aiContent,
      aiReferences
    });

    await saveMessage("assistant", aiContent, aiReferences);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    console.error("AI 对话失败:", error);
    message.error(error.message || "AI 对话失败，请检查设置");
    const errorContent =
      error.message || "抱歉，发生了错误。请检查 AI 设置是否正确配置。";
    messages.value.push({
      role: "assistant",
      content: errorContent
    });
    await saveMessage("assistant", errorContent, []);
  } finally {
    loading.value = false;
    streamingContent.value = "";
    abortController.value = null;
    scrollToBottom();
  }
};

const buildReferenceContextFromRefs = (refs) => {
  if (!refs || refs.length === 0) return "";
  let context = "\n\n[用户引用的数据]\n";
  refs.forEach((ref) => {
    if (ref.data) {
      if (ref.type === "网站") {
        context += `网站: ${ref.data.name}\nURL: ${ref.data.url}\n描述: ${ref.data.description || "无"}\n\n`;
      } else if (ref.type === "密码") {
        context += `密码条目: ${ref.data.title || ref.data.website_name}\n账号: ${ref.data.username}\n网站: ${ref.data.website_url || "无"}\n\n`;
      } else if (ref.type === "代码") {
        context += `代码片段: ${ref.data.title}\n语言: ${ref.data.language}\n代码:\n${ref.data.code}\n\n`;
      } else if (ref.type === "文档") {
        context += `文档: ${ref.data.title || "无标题"}\n内容: ${ref.data.content || "无内容"}\n\n`;
      }
    }
  });
  return context;
};

const handleKeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};


const loadEnabledModels = async () => {
  try {
    const response = await aiModelsApi.getEnabled();
    enabledModels.value = response.data.data || [];

    const savedId = localStorage.getItem(MODEL_STORAGE_KEY)
    if (savedId) {
      const saved = enabledModels.value.find((m) => m.id === savedId)
      if (saved) {
        selectedModel.value = saved
        return
      }
    }

    if (!selectedModel.value && enabledModels.value.length > 0) {
      const chatModels = enabledModels.value.filter((m) => m.category === 'text' || m.category === 'vision')
      const defaultModel = chatModels.find((m) => m.is_default);
      selectedModel.value = defaultModel || chatModels[0];
    }
  } catch (error) {
    console.error("加载模型列表失败:", error);
  }
};

const handleModelSelect = (key) => {
  const model = enabledModels.value.find((m) => m.id === key);
  if (model) {
    selectedModel.value = model;
    localStorage.setItem(MODEL_STORAGE_KEY, model.id)
    message.info(`已切换到「${model.name}」`);
  }
};





onMounted(() => {
  loadData();
  loadConversations();
  loadEnabledModels();
  scrollToBottom();
});
</script>

<style scoped>
.ai-chat-layout {
  height: 100%;
  display: flex;
  background: var(--bg-color);
  border-radius: 12px;
  overflow: hidden;
}

.sidebar {
  width: 220px;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

.conversation-list {
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  position: relative;
  transition: background 0.2s;
}

.conversation-item:hover {
  background: var(--primary-light);
}

.conversation-item.active {
  background: var(--primary-light);
}

.conversation-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
  margin-right: 10px;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-date {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.conversation-menu-btn {
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: auto;
  flex-shrink: 0;
}

.conversation-item:hover .conversation-menu-btn {
  opacity: 1;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--card-bg);
}

.chat-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--card-bg);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-header .n-h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.messages-center {
  width: 80%;
  min-width: 600px;
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  gap: 16px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.message-item {
  display: flex;
  margin-bottom: 20px;
}

.message-item.assistant {
  justify-content: flex-start;
}

.message-item.user {
  justify-content: flex-end;
}

.message-body {
  max-width: 65%;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-content-wrapper {
  border-radius: 12px;
  line-height: 1.6;
  font-size: 14px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-item.user .message-content-wrapper {
  background: var(--bg-color);
  padding: 12px 16px;
  color: var(--text-primary);
}

.message-text {
  line-height: 1.7;
  word-break: break-word;
  color: var(--text-primary);
}

.message-text :deep(pre) {
  background: #1e1e1e;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-text :deep(code) {
  font-family: "Fira Code", "Consolas", monospace;
  font-size: 13px;
}

.message-text :deep(code:not(pre code)) {
  background: rgba(0, 0, 0, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
}

.message-references {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 8px 12px;
  background: var(--hover-color);
  border-radius: 8px;
  font-size: 12px;
}

.message-quoted-preview {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  padding: 10px 12px;
  background: var(--hover-color);
  border-radius: 8px;
}

.quoted-preview-line {
  width: 3px;
  background: var(--primary-color);
  border-radius: 2px;
  flex-shrink: 0;
}

.quoted-preview-content {
  flex: 1;
  min-width: 0;
}

.quoted-preview-text {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quoted-message-card {
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--hover-color);
}

.quoted-message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.quoted-message-header .n-button {
  margin-left: auto;
}

.quoted-message-content {
  font-size: 13px;
  color: var(--text-primary);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.message-actions {
  display: flex;
  gap: 12px;
  padding-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.message-actions .n-button {
  font-size: 13px;
  padding: 0;
  min-width: auto;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: 80%;
  min-width: 600px;
  max-width: 900px;
  margin: 10px auto;
  box-sizing: border-box;
  box-shadow: 0 4px 8px rgba(102, 126, 234, 0.15);
}

.input-area-center {
  width: 80%;
  min-width: 600px;
  max-width: 900px;
  margin: 0 auto;
}

.input-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  min-height: 32px;
}

.input-toolbar .n-button {
  font-size: 12px;
  flex-shrink: 0;
}

.model-select-btn {
  min-width: 100px;
}

.model-select-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
  display: inline-block;
  vertical-align: middle;
}

.selected-references {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 10px;
  /* background: var(--bg-color); */
  border-radius: 10px;
  /* border: 1px solid var(--border-color); */
  margin-bottom: 10px;
}

.input-row,
.media-input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  border-radius: 8px;
  transition: border-color 0.2s;
}

.input-row:focus-within {
  border-color: var(--primary-color);
}

.input-row .n-input {
  flex: 1;
}

.reference-modal-content {
  min-height: 400px;
}

.reference-grid {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reference-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
}

.reference-item:hover {
  background: var(--primary-light);
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.reference-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.reference-icon.website {
  background: linear-gradient(
    135deg,
    rgba(13, 116, 234, 0.15) 0%,
    rgba(13, 116, 234, 0.05) 100%
  );
  color: var(--primary-color);
}

.reference-icon.password {
  background: linear-gradient(
    135deg,
    rgba(250, 140, 22, 0.15) 0%,
    rgba(250, 140, 22, 0.05) 100%
  );
  color: #fa8c16;
}

.reference-icon.snippet {
  background: linear-gradient(
    135deg,
    rgba(82, 196, 26, 0.15) 0%,
    rgba(82, 196, 26, 0.05) 100%
  );
  color: #52c41a;
}

.reference-icon.document {
  background: linear-gradient(
    135deg,
    rgba(114, 46, 209, 0.15) 0%,
    rgba(114, 46, 209, 0.05) 100%
  );
  color: #722ed1;
}

.favicon-img {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  object-fit: cover;
}

.reference-info {
  flex: 1;
  min-width: 0;
}

.reference-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.selected-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 10px;
  margin-bottom: 10px;
  border-radius: 10px;
}

.image-preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 0px;
  right: 0px;
  background: var(--bg-color) !important;
  color: var(--text-color-3) !important;
  width: 18px !important;
  height: 18px !important;
  border: 1px solid var(--border-color);
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}

.message-image-wrapper {
  position: relative;
  display: inline-block;
}

.message-image {
  max-width: 280px;
  max-height: 280px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-image:hover {
  transform: scale(1.02);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.image-download-btn {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.2s;
}

.message-image-wrapper:hover .image-download-btn {
  opacity: 1;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-color);
  border-radius: 12px;
}

.thinking-dots {
  display: flex;
  gap: 4px;
}

.thinking-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary-color);
  animation: thinking-bounce 1.4s ease-in-out infinite both;
}

.thinking-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.thinking-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.thinking-dots span:nth-child(3) {
  animation-delay: 0s;
}

@keyframes thinking-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.thinking-text {
  color: var(--text-secondary);
  font-size: 13px;
}

/* ── Media generation indicator ── */
.media-generating-indicator {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  background: var(--bg-color);
  border-radius: 12px;
  min-width: 240px;
}

.media-generating-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: media-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes media-spin {
  to { transform: rotate(360deg); }
}

.media-generating-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.media-generating-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.media-generating-desc {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
}

@media (max-width: 1024px) {
  .messages-center,
  .input-area,
  .input-area-center {
    width: 90%;
    min-width: unset;
  }
  
  .chat-container {
    padding: 16px 12px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 180px;
  }
  
  .message-body {
    max-width: 75%;
  }
  
  .message-content-wrapper {
    padding: 10px 12px;
  }
  
  .input-area {
    padding: 12px;
  }
  
  .input-row,
  .media-input-row {
    padding: 6px 10px;
  }
}

@media (max-width: 640px) {
  .sidebar {
    display: none;
  }
  
  .messages-center,
  .input-area,
  .input-area-center {
    width: 100%;
    min-width: unset;
    max-width: 100%;
  }
  
  .chat-header {
    padding: 12px 16px;
  }
  
  .header-title .n-h2 {
    font-size: 16px;
  }
  
  .chat-container {
    padding: 12px 8px;
  }
  
  .messages-center {
    gap: 16px;
  }
  
  .empty-chat {
    height: 300px;
  }
  
  .empty-icon {
    width: 60px;
    height: 60px;
  }
  
  .message-body {
    max-width: 85%;
  }
  
  .message-content-wrapper {
    padding: 10px 12px;
  }
  
  .input-area {
    padding: 8px;
  }
  
  .input-toolbar {
    gap: 6px;
  }
  
  .input-toolbar .n-button {
    font-size: 11px;
  }
  
  .input-row,
  .media-input-row {
    padding: 6px 8px;
    gap: 8px;
  }
}
</style>
