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
          <div class="ai-icon">
            <n-icon size="20"><SparklesOutline /></n-icon>
          </div>
          <n-h2>AI 对话</n-h2>
        </div>
        <n-space>
          <n-dropdown :options="templateOptions" @select="handleTemplateSelect">
            <n-button>
              <template #icon>
                <n-icon><DocumentTextOutline /></n-icon>
              </template>
              {{ currentTemplate ? currentTemplate.name : "提示词模板" }}
              <n-icon size="14" style="margin-left: 4px"
                ><ChevronDownOutline
              /></n-icon>
            </n-button>
          </n-dropdown>
          <n-dropdown :options="agentOptions" @select="handleAgentSelect">
            <n-button>
              <template #icon>
                <n-icon><RocketOutline /></n-icon>
              </template>
              {{ currentAgent ? currentAgent.label : "选择智能体" }}
              <n-icon size="14" style="margin-left: 4px"
                ><ChevronDownOutline
              /></n-icon>
            </n-button>
          </n-dropdown>
          <n-button @click="showParamsModal = true">
            <template #icon>
              <n-icon><SettingsOutline /></n-icon>
            </template>
            参数
          </n-button>
          <n-button @click="showReferenceModal = true">
            <template #icon>
              <n-icon><LinkOutline /></n-icon>
            </template>
            引用数据
          </n-button>
        </n-space>
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

          <div v-if="currentAgent && messages.length > 0" class="current-agent-badge">
            <n-icon size="14"><RocketOutline /></n-icon>
            <span>{{ currentAgent.label }}</span>
          </div>

          <div
            v-for="(msg, index) in messages"
            :key="index"
            :class="['message', msg.role]"
          >
            <div class="message-avatar">
              <n-avatar
                v-if="msg.role === 'user'"
                round
                :size="36"
                style="background: var(--primary-color)"
              >
                <n-icon><PersonOutline /></n-icon>
              </n-avatar>
              <n-avatar
                v-else
                round
                :size="36"
                style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                "
              >
                <n-icon><SparklesOutline /></n-icon>
              </n-avatar>
            </div>
            <div class="message-content">
              <div
                v-if="msg.references && msg.references.length > 0"
                class="user-references"
              >
                <n-tag
                  v-for="ref in msg.references"
                  :key="ref.id"
                  size="small"
                  round
                  :type="getRefTagType(ref.type)"
                >
                  {{ ref.type }}: {{ ref.name }}
                </n-tag>
              </div>
              <MessageContent :content="msg.content" />
              <div
                v-if="
                  msg.role === 'assistant' &&
                  msg.aiReferences &&
                  msg.aiReferences.length > 0
                "
                class="message-references"
              >
                <n-text depth="3" style="font-size: 11px">引用数据：</n-text>
                <n-space size="small">
                  <n-tag
                    v-for="ref in msg.aiReferences"
                    :key="ref.id"
                    size="small"
                    round
                  >
                    {{ ref.type }}: {{ ref.name }}
                  </n-tag>
                </n-space>
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

          <div v-if="loading" class="message assistant">
            <div class="message-avatar">
              <n-avatar
                round
                :size="36"
                style="
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                "
              >
                <n-icon><SparklesOutline /></n-icon>
              </n-avatar>
            </div>
            <div class="message-content">
              <MessageContent :content="streamingContent" />
              <n-text v-if="!streamingContent" depth="3">
                <n-spin size="small" />
                <span style="margin-left: 8px">思考中...</span>
              </n-text>
            </div>
          </div>

          <div v-if="pendingData.type && !loading" class="inline-review">
            <div class="inline-review-header">
              <n-icon size="18"><RocketOutline /></n-icon>
              <span class="inline-review-title"
                >{{ currentAgent?.label || "智能体" }} 已生成数据</span
              >
              <span class="inline-review-subtitle">请审核以下内容</span>
            </div>

            <div
              v-if="pendingData.type === 'snippet'"
              class="inline-review-content"
            >
              <div class="review-field">
                <span class="review-label">标题：</span>
                <n-input v-model:value="pendingData.data.title" size="small" />
              </div>
              <div class="review-field">
                <span class="review-label">语言：</span>
                <n-select
                  v-model:value="pendingData.data.language"
                  :options="languageOptions"
                  size="small"
                  style="width: 150px"
                />
              </div>
              <div class="review-field">
                <span class="review-label">分类：</span>
                <n-select
                  v-model:value="pendingData.data.category"
                  :options="categoryOptions"
                  size="small"
                  style="width: 150px"
                  placeholder="选择分类"
                />
              </div>
              <div class="review-field">
                <span class="review-label">描述：</span>
                <n-input
                  v-model:value="pendingData.data.description"
                  size="small"
                />
              </div>
              <div class="review-field">
                <span class="review-label">代码：</span>
                <n-input
                  v-model:value="pendingData.data.code"
                  type="textarea"
                  :rows="6"
                  size="small"
                />
              </div>
              <div class="review-actions">
                <n-button
                  size="small"
                  @click="pendingData = { type: '', data: {} }"
                  >取消</n-button
                >
                <n-button
                  type="primary"
                  size="small"
                  @click="confirmAddData"
                  :loading="addingData"
                  >确认添加</n-button
                >
              </div>
            </div>

            <div
              v-else-if="pendingData.type === 'document'"
              class="inline-review-content"
            >
              <div class="review-field">
                <span class="review-label">标题：</span>
                <n-input v-model:value="pendingData.data.title" size="small" />
              </div>
              <div class="review-field">
                <span class="review-label">内容：</span>
                <n-input
                  v-model:value="pendingData.data.content"
                  type="textarea"
                  :rows="8"
                  size="small"
                />
              </div>
              <div class="review-actions">
                <n-button
                  size="small"
                  @click="pendingData = { type: '', data: {} }"
                  >取消</n-button
                >
                <n-button
                  type="primary"
                  size="small"
                  @click="confirmAddData"
                  :loading="addingData"
                  >确认添加</n-button
                >
              </div>
            </div>

            <div
              v-else-if="pendingData.type === 'website'"
              class="inline-review-content"
            >
              <div class="review-field">
                <span class="review-label">名称：</span>
                <n-input v-model:value="pendingData.data.name" size="small" />
              </div>
              <div class="review-field">
                <span class="review-label">URL：</span>
                <n-input v-model:value="pendingData.data.url" size="small" />
              </div>
              <div class="review-field">
                <span class="review-label">别名：</span>
                <n-input v-model:value="pendingData.data.alias" size="small" />
              </div>
              <div class="review-field">
                <span class="review-label">描述：</span>
                <n-input
                  v-model:value="pendingData.data.description"
                  type="textarea"
                  :rows="2"
                  size="small"
                />
              </div>
              <div class="review-actions">
                <n-button
                  size="small"
                  @click="pendingData = { type: '', data: {} }"
                  >取消</n-button
                >
                <n-button
                  type="primary"
                  size="small"
                  @click="confirmAddData"
                  :loading="addingData"
                  >确认添加</n-button
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="input-area">
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
        <div class="input-row">
          <n-input
            v-model:value="inputMessage"
            type="textarea"
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
            :disabled="!inputMessage.trim()"
          >
            <template #icon>
              <n-icon><SendOutline /></n-icon>
            </template>
          </n-button>
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
        v-model:show="showParamsModal"
        preset="card"
        title="模型参数设置"
        style="width: 500px"
      >
        <div class="params-modal-content">
          <n-form :model="modelParams" label-placement="left" label-width="120px">
            <n-form-item label="Temperature">
              <n-slider
                v-model:value="modelParams.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                :tooltip="true"
                style="flex: 1"
              />
              <n-input-number
                v-model:value="modelParams.temperature"
                :min="0"
                :max="2"
                :step="0.1"
                size="small"
                style="width: 80px; margin-left: 12px"
              />
            </n-form-item>
            <n-form-item label="Max Tokens">
              <n-slider
                v-model:value="modelParams.max_tokens"
                :min="256"
                :max="8192"
                :step="256"
                :tooltip="true"
                style="flex: 1"
              />
              <n-input-number
                v-model:value="modelParams.max_tokens"
                :min="256"
                :max="8192"
                :step="256"
                size="small"
                style="width: 100px; margin-left: 12px"
              />
            </n-form-item>
          </n-form>
          <div class="params-tips">
            <n-text depth="3" style="font-size: 12px">
              Temperature 控制回复的随机性，值越低越确定，值越高越随机。<br/>
              Max Tokens 控制回复的最大长度。
            </n-text>
          </div>
        </div>
      </n-modal>

      <n-modal
        v-model:show="showTemplateModal"
        preset="card"
        title="提示词模板管理"
        style="width: 700px"
      >
        <div class="template-modal-content">
          <n-space vertical size="large">
            <div class="template-list">
              <div
                v-for="template in templates"
                :key="template.id"
                class="template-item"
                :class="{ active: currentTemplate?.id === template.id }"
                @click="selectTemplate(template)"
              >
                <div class="template-info">
                  <div class="template-name">{{ template.name }}</div>
                  <div class="template-desc">{{ template.description }}</div>
                </div>
                <n-button
                  v-if="!template.is_default"
                  text
                  type="error"
                  size="small"
                  @click.stop="deleteTemplate(template.id)"
                >
                  删除
                </n-button>
              </div>
            </div>
            <n-divider />
            <n-form :model="newTemplate" label-placement="left">
              <n-form-item label="名称">
                <n-input v-model:value="newTemplate.name" placeholder="模板名称" />
              </n-form-item>
              <n-form-item label="分类">
                <n-select
                  v-model:value="newTemplate.category"
                  :options="templateCategoryOptions"
                  placeholder="选择分类"
                />
              </n-form-item>
              <n-form-item label="描述">
                <n-input v-model:value="newTemplate.description" placeholder="模板描述" />
              </n-form-item>
              <n-form-item label="内容">
                <n-input
                  v-model:value="newTemplate.content"
                  type="textarea"
                  :rows="4"
                  placeholder="提示词内容"
                />
              </n-form-item>
              <n-button type="primary" @click="createTemplate" :disabled="!newTemplate.name || !newTemplate.content">
                添加模板
              </n-button>
            </n-form>
          </n-space>
        </div>
      </n-modal>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, h } from "vue";
import {
  NH2,
  NButton,
  NSpace,
  NIcon,
  NAvatar,
  NInput,
  NText,
  NTag,
  NSpin,
  NModal,
  NTabs,
  NTabPane,
  NList,
  NListItem,
  NThing,
  NEmpty,
  NScrollbar,
  NDropdown,
  NAlert,
  NForm,
  NFormItem,
  NSelect,
  NDynamicTags,
  NSlider,
  NInputNumber,
  NDivider,
  useMessage
} from "naive-ui";
import {
  TimeOutline,
  AddOutline,
  TrashOutline,
  ChatbubblesOutline,
  PersonOutline,
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
  RocketOutline,
  ChevronDownOutline,
  CheckmarkOutline,
  CreateOutline,
  DownloadOutline,
  StopOutline,
  EllipsisVertical,
  SettingsOutline,
  DocumentTextOutline
} from "@vicons/ionicons5";
import { aiMessageApi } from "../api/ai-message";
import { websiteApi } from "../api/website";
import { passwordApi } from "../api/password";
import { snippetApi } from "../api/snippet";
import { documentApi } from "../api/documents";
import { promptTemplateApi } from "../api/prompt-templates";
import MessageContent from "../components/MessageContent.vue";
import { useData } from "../store/data";

const {
  addSnippet,
  addDocument,
  addWebsite,
  reloadSnippets,
  reloadDocuments,
  reloadWebsites
} = useData();

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

const websites = ref([]);
const passwords = ref([]);
const snippets = ref([]);
const documents = ref([]);

const websiteSearch = ref("");
const passwordSearch = ref("");
const snippetSearch = ref("");
const documentSearch = ref("");

const currentAgent = ref(null);
const pendingData = ref({ type: "", data: {} });
const addingData = ref(false);

const templates = ref([]);
const currentTemplate = ref(null);
const showParamsModal = ref(false);
const showTemplateModal = ref(false);
const modelParams = ref({
  temperature: 0.7,
  max_tokens: 4096
});
const newTemplate = ref({
  name: "",
  category: "general",
  content: "",
  description: ""
});

const categories = ref([]);
const folders = ref([]);

const languageOptions = [
  { label: "JavaScript", value: "javascript" },
  { label: "TypeScript", value: "typescript" },
  { label: "Python", value: "python" },
  { label: "Java", value: "java" },
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "C#", value: "csharp" },
  { label: "Go", value: "go" },
  { label: "Rust", value: "rust" },
  { label: "PHP", value: "php" },
  { label: "Ruby", value: "ruby" },
  { label: "Swift", value: "swift" },
  { label: "Kotlin", value: "kotlin" },
  { label: "SQL", value: "sql" },
  { label: "HTML", value: "html" },
  { label: "CSS", value: "css" },
  { label: "Shell", value: "shell" },
  { label: "Other", value: "other" }
];

const categoryOptions = computed(() => {
  return categories.value.map((c) => ({ label: c.name, value: c.name }));
});

const folderOptions = computed(() => {
  return folders.value.map((f) => ({ label: f.name, value: f.id }));
});

const templateOptions = computed(() => {
  const options = templates.value.map((t) => ({
    label: t.name,
    key: t.id,
    icon: () => h("span", t.category === "coding" ? "💻" : t.category === "writing" ? "📝" : t.category === "translation" ? "🌐" : "🤖")
  }));
  options.push({ type: "divider" });
  options.push({
    label: "管理模板",
    key: "manage",
    icon: () => h(NIcon, null, { default: () => h(SettingsOutline) })
  });
  return options;
});

const templateCategoryOptions = computed(() => {
  const cats = ["general", "coding", "writing", "translation", "analysis"];
  return cats.map((c) => ({
    label: c === "general" ? "通用" : c === "coding" ? "编程" : c === "writing" ? "写作" : c === "translation" ? "翻译" : "分析",
    value: c
  }));
});

const agentOptions = [
  {
    label: "代码片段生成",
    key: "snippet",
    icon: () => h("span", "💻")
  },
  {
    label: "文档生成",
    key: "document",
    icon: () => h("span", "📄")
  },
  {
    label: "网站生成",
    key: "website",
    icon: () => h("span", "🌐")
  }
];

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
    const [webRes, pwdRes, snpRes, docRes, catRes, folderRes] =
      await Promise.all([
        websiteApi.getAll(),
        passwordApi.getAll(),
        snippetApi.getAll(),
        documentApi.getAll(),
        snippetApi.getCategories(),
        documentApi.getAll({ folders: true })
      ]);
    websites.value = webRes.data.data || [];
    passwords.value = pwdRes.data.data || [];
    snippets.value = snpRes.data.data || [];
    documents.value = docRes.data.data || [];
    categories.value = catRes.data.data || [];
    if (folderRes.data.folders) {
      folders.value = folderRes.data.folders;
    }
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
      aiReferences: m.role === "assistant" ? m.references || [] : []
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

const quoteMessage = (msg) => {
  const quotedContent = msg.content.substring(0, 200);
  inputMessage.value = `> ${quotedContent}${msg.content.length > 200 ? "..." : ""}\n\n`;
};

const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content);
    message.success("已复制到剪贴板");
  } catch (error) {
    message.error("复制失败");
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

const saveMessage = async (role, content, references) => {
  try {
    if (!currentConversationId.value) {
      currentConversationId.value = crypto.randomUUID();
    }
    await aiMessageApi.saveMessage({
      conversation_id: currentConversationId.value,
      role,
      content,
      references
    });
    await loadConversations();
  } catch (error) {
    console.error("保存消息失败:", error);
  }
};

const sendMessage = async () => {
  const content = inputMessage.value.trim();
  if (!content || loading.value) return;

  const references = [...selectedReferences.value];
  const contextContent = content + buildReferenceContext();

  messages.value.push({
    role: "user",
    content,
    references
  });

  await saveMessage("user", content, references);

  inputMessage.value = "";
  selectedReferences.value = [];
  scrollToBottom();

  loading.value = true;
  streamingContent.value = "";
  abortController.value = new AbortController();

  try {
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
    const systemPrompt = getAgentSystemPrompt() || currentTemplate.value?.content || "";

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
                : m.content
          })),
          stream: true,
          systemPrompt: systemPrompt || undefined,
          continueFrom: continueFrom,
          temperature: modelParams.value.temperature,
          max_tokens: modelParams.value.max_tokens
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

    if (currentAgent.value) {
      const parsedData = parseAgentResponse(aiContent);
      if (parsedData) {
        pendingData.value = parsedData;
        const displayContent = formatAgentDisplayContent(
          parsedData.data,
          parsedData.type
        );
        if (displayContent) {
          aiContent = displayContent;
        }
      }
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
    message.error(error.message || "AI对话失败，请检查设置");
    const errorContent = "抱歉，发生了错误。请检查AI设置是否正确配置。";
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

const handleAgentSelect = (key) => {
  const agents = {
    snippet: { key: "snippet", label: "代码片段生成" },
    document: { key: "document", label: "文档生成" },
    website: { key: "website", label: "网站生成" }
  };
  currentAgent.value = agents[key];
  message.info(`已切换到「${agents[key].label}」智能体`);
};

const handleTemplateSelect = (key) => {
  if (key === "manage") {
    showTemplateModal.value = true;
    return;
  }
  const template = templates.value.find((t) => t.id === key);
  if (template) {
    currentTemplate.value = template;
    message.info(`已选择「${template.name}」模板`);
  }
};

const selectTemplate = (template) => {
  currentTemplate.value = template;
  showTemplateModal.value = false;
};

const loadTemplates = async () => {
  try {
    const response = await promptTemplateApi.getAll();
    templates.value = response.data.data || [];
    const defaultTemplate = templates.value.find((t) => t.is_default);
    if (defaultTemplate && !currentTemplate.value) {
      currentTemplate.value = defaultTemplate;
    }
  } catch (error) {
    console.error("加载模板失败:", error);
  }
};

const createTemplate = async () => {
  if (!newTemplate.value.name || !newTemplate.value.content) {
    message.warning("请填写模板名称和内容");
    return;
  }
  try {
    await promptTemplateApi.create(newTemplate.value);
    message.success("模板创建成功");
    newTemplate.value = { name: "", category: "general", content: "", description: "" };
    loadTemplates();
  } catch (error) {
    message.error("创建失败");
  }
};

const deleteTemplate = async (id) => {
  try {
    await promptTemplateApi.delete(id);
    message.success("删除成功");
    if (currentTemplate.value?.id === id) {
      currentTemplate.value = templates.value.find((t) => t.is_default) || null;
    }
    loadTemplates();
  } catch (error) {
    message.error(error.response?.data?.error || "删除失败");
  }
};

const getAgentSystemPrompt = () => {
  if (!currentAgent.value) return "";

  const prompts = {
    snippet: `你是一个代码片段生成智能体。当用户请求生成代码时，你需要返回一个 JSON 格式的代码片段数据。
返回格式必须是纯 JSON，不要包含任何其他文字说明：
{
  "title": "代码片段标题",
  "language": "编程语言（如 javascript, python, typescript 等）",
  "category": "分类名称",
  "description": "代码片段描述",
  "code": "代码内容",
  "tags": ["标签1", "标签2"]
}`,
    document: `你是一个文档生成智能体。当用户请求生成文档时，你需要返回一个 JSON 格式的文档数据。
返回格式必须是纯 JSON，不要包含任何其他文字说明：
{
  "title": "文档标题",
  "content": "文档内容（支持 Markdown 格式）",
  "tags": ["标签1", "标签2"]
}`,
    website: `你是一个网站生成智能体。当用户请求生成网站信息时，你需要返回一个 JSON 格式的网站数据。
返回格式必须是纯 JSON，不要包含任何其他文字说明：
{
  "name": "网站名称",
  "url": "网站地址",
  "alias": "网站别名（可选）",
  "description": "网站描述"
}`
  };
  return prompts[currentAgent.value.key] || "";
};

const parseAgentResponse = (content) => {
  if (!currentAgent.value) return null;

  try {
    let jsonStr = "";
    let braceCount = 0;
    let startIndex = -1;
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
      }

      if (!inString) {
        if (char === "{") {
          if (braceCount === 0) {
            startIndex = i;
          }
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0 && startIndex >= 0) {
            jsonStr = content.substring(startIndex, i + 1);
            break;
          }
        }
      }
    }

    if (!jsonStr) return null;

    try {
      const data = JSON.parse(jsonStr);

      const cleanedData = { ...data };
      for (const key in cleanedData) {
        if (typeof cleanedData[key] === "string") {
          cleanedData[key] = cleanedData[key].trim();
        }
      }

      return {
        type: currentAgent.value.key,
        data: {
          ...cleanedData,
          tags: cleanedData.tags || []
        }
      };
    } catch (parseError) {
      jsonStr = jsonStr
        .replace(
          /"(\w+)"\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}])/g,
          '"$1": "$2"$3'
        )
        .replace(
          /"(\w+)"\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}])/g,
          '"$1": "$2"$3'
        );

      const data = JSON.parse(jsonStr);

      const cleanedData = { ...data };
      for (const key in cleanedData) {
        if (typeof cleanedData[key] === "string") {
          cleanedData[key] = cleanedData[key].trim();
        }
      }

      return {
        type: currentAgent.value.key,
        data: {
          ...cleanedData,
          tags: cleanedData.tags || []
        }
      };
    }
  } catch (e) {
    console.error("解析智能体响应失败:", e);
    return null;
  }
};

const formatAgentDisplayContent = (data, type) => {
  let lines = [];

  if (type === "snippet") {
    lines.push("**代码片段已生成**");
    if (data.title) lines.push(`**标题：** ${data.title}`);
    if (data.language) lines.push(`**语言：** ${data.language}`);
    if (data.category) lines.push(`**分类：** ${data.category}`);
    if (data.description) lines.push(`**描述：** ${data.description}`);
    if (data.code) {
      lines.push(`**代码：**`);
      lines.push("```" + (data.language || "javascript"));
      lines.push(data.code);
      lines.push("```");
    }
    if (data.tags && data.tags.length > 0) {
      lines.push(`**标签：** ${data.tags.join(", ")}`);
    }
  } else if (type === "document") {
    lines.push("**文档已生成**");
    if (data.title) lines.push(`**标题：** ${data.title}`);
    if (data.content) {
      lines.push(`**内容：**`);
      lines.push(data.content);
    }
    if (data.tags && data.tags.length > 0) {
      lines.push(`**标签：** ${data.tags.join(", ")}`);
    }
  } else if (type === "website") {
    lines.push("**网站信息已生成**");
    if (data.name) lines.push(`**名称：** ${data.name}`);
    if (data.url) lines.push(`**URL：** ${data.url}`);
    if (data.alias) lines.push(`**别名：** ${data.alias}`);
    if (data.description) lines.push(`**描述：** ${data.description}`);
  }

  return lines.join("\n");
};

const confirmAddData = async () => {
  addingData.value = true;
  try {
    const { type, data } = pendingData.value;

    if (type === "snippet") {
      const res = await snippetApi.create({
        title: data.title,
        language: data.language,
        category: data.category,
        description: data.description,
        code: data.code,
        tags: data.tags
      });
      if (res.data?.data) {
        addSnippet(res.data.data);
      } else {
        await reloadSnippets();
      }
      message.success("代码片段添加成功");
    } else if (type === "document") {
      const res = await documentApi.create({
        title: data.title,
        content: data.content,
        folder_id: data.folder_id || null,
        tags: data.tags
      });
      if (res.data?.data) {
        addDocument(res.data.data);
      } else {
        await reloadDocuments();
      }
      message.success("文档添加成功");
    } else if (type === "website") {
      const res = await websiteApi.create({
        name: data.name,
        url: data.url,
        alias: data.alias || null,
        description: data.description
      });
      if (res.data?.data) {
        addWebsite(res.data.data);
      } else {
        await reloadWebsites();
      }
      message.success("网站添加成功");
    }

    pendingData.value = { type: "", data: {} };
    await loadData();
  } catch (error) {
    console.error("添加数据失败:", error);
    message.error("添加数据失败");
  } finally {
    addingData.value = false;
  }
};

onMounted(() => {
  loadData();
  loadConversations();
  loadTemplates();
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
  justify-content: space-between;
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

.ai-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.chat-header .n-h2 {
  margin: 0;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.messages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 16px;
}

.empty-icon {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(102, 126, 234, 0.1) 0%,
    rgba(118, 75, 162, 0.1) 100%
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: #667eea;
}

.message {
  display: flex;
  gap: 12px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  padding: 14px 18px;
  border-radius: 16px;
  background: var(--bg-color);
}

.message.user .message-content {
  background: var(--primary-light);
}

.user-references {
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
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
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.current-agent-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(82, 196, 26, 0.1);
  border: 1px solid rgba(82, 196, 26, 0.2);
  border-radius: 16px;
  font-size: 12px;
  color: #52c41a;
  margin-bottom: 12px;
}

.message-actions {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
}

.input-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
  background: var(--card-bg);
}

.selected-references {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  background: var(--bg-color);
  border-radius: 10px;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
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

.review-modal-content {
  min-height: 300px;
}

.review-section {
  margin-top: 8px;
}

.inline-review {
  background: var(--card-bg);
  border: 1px solid var(--primary-color);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
}

.inline-review-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--primary-color);
}

.inline-review-title {
  font-weight: 600;
  font-size: 14px;
}

.inline-review-subtitle {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: auto;
}

.inline-review-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-field {
  display: flex;
  align-items: center;
  gap: 12px;
}

.review-label {
  font-size: 13px;
  color: var(--text-secondary);
  min-width: 50px;
  flex-shrink: 0;
}

.review-field .n-input,
.review-field .n-select {
  flex: 1;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.params-modal-content {
  padding: 8px 0;
}

.params-tips {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 8px;
}

.template-modal-content {
  padding: 8px 0;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.template-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}

.template-item:hover {
  background: var(--primary-light);
  border-color: var(--primary-color);
}

.template-item.active {
  background: var(--primary-light);
  border-color: var(--primary-color);
}

.template-info {
  flex: 1;
}

.template-name {
  font-weight: 500;
  font-size: 14px;
}

.template-desc {
  font-size: 12px;
  color: var(--text-color-3);
  margin-top: 4px;
}
</style>
