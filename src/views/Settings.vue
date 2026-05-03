<template>
  <div class="settings-page">
    <n-h2>应用设置</n-h2>

    <n-space vertical :size="20">
      <n-card title="快捷键设置">
        <template #header-extra>
          <n-icon><KeypadOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-text depth="3" style="margin-bottom: 16px">
            设置全局快捷键，按下快捷键可以快速唤出应用窗口
          </n-text>

          <n-form :model="settings" label-placement="left" label-width="100">
            <n-form-item label="唤出窗口">
              <n-input-group>
                <n-input
                  v-model:value="settings.global_shortcut"
                  placeholder="按下快捷键组合..."
                  style="width: 200px"
                  @keydown="handleShortcutKeydown"
                  readonly
                />
                <n-button @click="resetShortcut"> 重置 </n-button>
              </n-input-group>
            </n-form-item>
            <n-text depth="3" style="font-size: 12px">
              当前快捷键: {{ settings.global_shortcut || "未设置" }} (默认:
              Ctrl+Shift+Space)
            </n-text>
          </n-form>
        </n-space>
      </n-card>

      <n-card title="外观设置">
        <template #header-extra>
          <n-icon><ColorPaletteOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-form :model="settings" label-placement="left" label-width="100">
            <n-form-item label="颜色主题">
              <div class="theme-grid">
                <div
                  v-for="theme in themeOptions"
                  :key="theme.value"
                  :class="[
                    'theme-item',
                    { active: currentTheme === theme.value }
                  ]"
                  @click="setTheme(theme.value)"
                >
                  <div class="theme-color" :style="{ backgroundColor: theme.color }">
                    <n-icon
                      v-if="currentTheme === theme.value"
                      color="#fff"
                      size="16"
                    >
                      <CheckmarkOutline />
                    </n-icon>
                  </div>
                  <span class="theme-label">{{ theme.label }}</span>
                </div>
              </div>
            </n-form-item>
            <n-text depth="3" style="font-size: 12px">
              选择您喜欢的颜色主题，深色主题可保护眼睛
            </n-text>
          </n-form>
        </n-space>
      </n-card>

      <n-card title="AI 模型配置">
        <template #header-extra>
          <n-icon><ChatbubbleEllipsesOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-space justify="space-between" align="center">
            <n-text depth="3">
              配置多个大模型API，启用哪个模型系统就使用哪个模型
            </n-text>
            <n-button type="primary" size="small" @click="openAddModel">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
              添加模型
            </n-button>
          </n-space>

          <n-data-table
            :columns="modelColumns"
            :data="aiModels"
            :bordered="false"
            size="small"
          />

          <n-empty
            v-if="aiModels.length === 0"
            description="暂无模型配置，请添加"
          />
        </n-space>
      </n-card>

      <n-modal
        v-model:show="showModelModal"
        preset="card"
        :title="editingModel ? '编辑模型配置' : '添加模型配置'"
        style="width: 500px"
      >
        <n-form :model="modelForm" label-placement="left" label-width="100">
          <n-form-item label="配置名称" required>
            <n-input
              v-model:value="modelForm.name"
              placeholder="如：我的 GPT-4"
            />
          </n-form-item>

          <n-form-item label="模型提供商" required>
            <n-select
              v-model:value="modelForm.provider"
              :options="providerOptions"
              @update:value="onProviderChange"
            />
          </n-form-item>

          <n-form-item label="API Key" required>
            <n-input-group>
              <n-input
                v-model:value="modelForm.api_key"
                :type="showApiKey ? 'text' : 'password'"
                placeholder="输入您的API Key"
              />
              <n-button @click="showApiKey = !showApiKey">
                <template #icon>
                  <n-icon>
                    <EyeOutline v-if="!showApiKey" />
                    <EyeOffOutline v-else />
                  </n-icon>
                </template>
              </n-button>
            </n-input-group>
          </n-form-item>

          <n-form-item label="API Base URL">
            <div style="display: flex; align-items: center; flex-direction: column; width: 100%;">
              <n-input
                v-model:value="modelForm.base_url"
                :placeholder="
                  providerPresets[modelForm.provider]?.base_url ||
                  '输入API Base URL'
                "
              />
              <div style="width: 100%;">
                <n-text
                  depth="3"
                  style="font-size: 12px; margin-top: 4px"
                  v-if="providerPresets[modelForm.provider]?.base_url"
                >
                  默认: {{ providerPresets[modelForm.provider].base_url }}
                </n-text>
              </div>
            </div>
          </n-form-item>

          <n-form-item label="模型名称" required>
            <n-space vertical style="width: 100%">
              <n-select
                v-if="!isCustomModel && currentModelOptions.length > 0"
                v-model:value="modelForm.model"
                :options="currentModelOptions"
                placeholder="选择模型"
              />
              <n-input
                v-else
                v-model:value="modelForm.model"
                placeholder="输入模型名称"
              />
              <n-checkbox
                v-model:checked="isCustomModel"
                v-if="currentModelOptions.length > 0"
              >
                自定义模型名称
              </n-checkbox>
            </n-space>
          </n-form-item>
        </n-form>

        <template #footer>
          <n-space justify="end">
            <n-button @click="testModel" :loading="modelTesting">
              测试连接
            </n-button>
            <n-button @click="showModelModal = false">取消</n-button>
            <n-button type="primary" @click="saveModel">保存</n-button>
          </n-space>
        </template>
      </n-modal>

      <n-card title="系统设置">
        <template #header-extra>
          <n-icon><SettingsOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-form :model="settings" label-placement="left" label-width="120">
            <n-form-item label="开机自启动">
              <n-switch
                v-model:value="settings.auto_launch"
                @update:value="handleAutoLaunchChange"
              >
                <template #checked>开启</template>
                <template #unchecked>关闭</template>
              </n-switch>
              <n-text depth="3" style="margin-left: 8px; font-size: 12px">
                开机时自动启动应用
              </n-text>
            </n-form-item>
          </n-form>
        </n-space>
      </n-card>

      <n-card title="数据管理">
        <template #header-extra>
          <n-icon><CloudDownloadOutline /></n-icon>
        </template>
        <n-space vertical>
          <n-text depth="3" style="margin-bottom: 16px">
            导出或导入应用数据，包含网站、密码、代码片段、文档、AI模型配置、AI对话记录、提示词模板等所有数据
          </n-text>

          <n-space>
            <n-button @click="exportData" :loading="exporting">
              <template #icon>
                <n-icon><DownloadOutline /></n-icon>
              </template>
              导出数据
            </n-button>
            <n-button @click="triggerImport" :loading="importing">
              <template #icon>
                <n-icon><CloudUploadOutline /></n-icon>
              </template>
              导入数据
            </n-button>
            <input
              ref="fileInput"
              type="file"
              accept=".json"
              style="display: none"
              @change="handleFileSelect"
            />
          </n-space>

          <n-alert type="warning" style="margin-top: 12px">
            导入数据将覆盖现有数据，请先备份
          </n-alert>
        </n-space>
      </n-card>

      <n-card title="关于">
        <template #header-extra>
          <n-icon><InformationCircleOutline /></n-icon>
        </template>
        <n-descriptions :column="2" label-placement="left" bordered>
          <n-descriptions-item label="应用名称">
            Nexious Tools
          </n-descriptions-item>
          <n-descriptions-item label="版本号"> v1.0.3 </n-descriptions-item>
          <n-descriptions-item label="技术栈">
            Electron + Vue3
          </n-descriptions-item>
          <n-descriptions-item label="数据库"> SQLite </n-descriptions-item>
        </n-descriptions>
      </n-card>
    </n-space>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from "vue";
import {
  NH2,
  NCard,
  NSpace,
  NText,
  NForm,
  NFormItem,
  NInput,
  NInputGroup,
  NButton,
  NSelect,
  NSwitch,
  NIcon,
  NDescriptions,
  NDescriptionsItem,
  NAlert,
  NDataTable,
  NModal,
  NEmpty,
  NTag,
  NCheckbox,
  useMessage,
  useDialog
} from "naive-ui";
import {
  ChatbubbleEllipsesOutline,
  InformationCircleOutline,
  EyeOutline,
  EyeOffOutline,
  ColorPaletteOutline,
  CheckmarkOutline,
  KeypadOutline,
  SettingsOutline,
  CloudDownloadOutline,
  DownloadOutline,
  CloudUploadOutline,
  AddOutline,
  CreateOutline,
  TrashOutline,
  StarOutline,
  Star
} from "@vicons/ionicons5";
import { settingsApi } from "../api/settings";
import { useTheme } from "../store/theme";
import { websiteApi } from "../api/website";
import { passwordApi } from "../api/password";
import { snippetApi } from "../api/snippet";
import { documentApi } from "../api/documents";
import { docFolderApi } from "../api/doc-folders";
import { aiModelsApi } from "../api/ai-models";
import { aiMessageApi } from "../api/ai-message";
import { promptTemplateApi } from "../api/prompt-templates";

const message = useMessage();
const dialog = useDialog();
const { currentTheme, setTheme } = useTheme();
const DEFAULT_GLOBAL_SHORTCUT = "CommandOrControl+Shift+Space";

const settings = reactive({
  auto_launch: false,
  global_shortcut: DEFAULT_GLOBAL_SHORTCUT
});

const exporting = ref(false);
const importing = ref(false);
const fileInput = ref(null);

const aiModels = ref([]);
const showModelModal = ref(false);
const editingModel = ref(null);
const modelForm = reactive({
  name: "",
  provider: "openai",
  api_key: "",
  base_url: "",
  model: ""
});
const modelTesting = ref(false);
const showApiKey = ref(false);

const providerOptions = [
  { label: "OpenAI", value: "openai" },
  { label: "DeepSeek", value: "deepseek" },
  { label: "智谱AI", value: "zhipu" },
  { label: "Moonshot", value: "moonshot" },
  { label: "Anthropic", value: "anthropic" },
  { label: "阿里云通义", value: "aliyun" },
  { label: "百度文心", value: "baidu" },
  { label: "腾讯混元", value: "tencent" },
  { label: "硅基流动", value: "siliconflow" },
  { label: "OpenRouter", value: "openrouter" },
  { label: "自定义", value: "custom" }
];

const providerLabels = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  zhipu: "智谱AI",
  moonshot: "Moonshot",
  anthropic: "Anthropic",
  aliyun: "阿里云通义",
  baidu: "百度文心",
  tencent: "腾讯混元",
  siliconflow: "硅基流动",
  custom: "自定义"
};

const providerPresets = {
  openai: {
    base_url: "https://api.openai.com/v1",
    models: [
      { label: "GPT-4o", value: "gpt-4o" },
      { label: "GPT-4o Mini", value: "gpt-4o-mini" },
      { label: "GPT-4.1", value: "gpt-4.1" },
      { label: "GPT-4.1 Mini", value: "gpt-4.1-mini" },
      { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
      { label: "GPT-4", value: "gpt-4" },
      { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
      { label: "GPT-3.5 Turbo 16K", value: "gpt-3.5-turbo-16k" }
    ],
    default_model: "gpt-4o-mini"
  },
  deepseek: {
    base_url: "https://api.deepseek.com",
    models: [
      { label: "DeepSeek Chat", value: "deepseek-chat" },
      { label: "DeepSeek Coder", value: "deepseek-coder" },
      { label: "DeepSeek Reasoner", value: "deepseek-reasoner" }
    ],
    default_model: "deepseek-chat"
  },
  zhipu: {
    base_url: "https://open.bigmodel.cn/api/paas/v4",
    models: [
      { label: "GLM-4", value: "glm-4" },
      { label: "GLM-4 Air", value: "glm-4-air" },
      { label: "GLM-4 AirX", value: "glm-4-airx" },
      { label: "GLM-4 Flash", value: "glm-4-flash" },
      { label: "GLM-4V", value: "glm-4v" },
      { label: "GLM-3 Turbo", value: "glm-3-turbo" }
    ],
    default_model: "glm-4-flash"
  },
  moonshot: {
    base_url: "https://api.moonshot.cn/v1",
    models: [
      { label: "Kimi K2.5", value: "kimi-k2.5" },
      { label: "Moonshot Vision Preview 32K", value: "moonshot-v1-32k-vision-preview" },
      { label: "Moonshot Vision Preview 128K", value: "moonshot-v1-128k-vision-preview" },
      { label: "Moonshot V1 8K", value: "moonshot-v1-8k" },
      { label: "Moonshot V1 32K", value: "moonshot-v1-32k" },
      { label: "Moonshot V1 128K", value: "moonshot-v1-128k" }
    ],
    default_model: "kimi-k2.5"
  },
  anthropic: {
    base_url: "https://api.anthropic.com",
    models: [
      { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-20241022" },
      { label: "Claude 3 Opus", value: "claude-3-opus-20240229" },
      { label: "Claude 3 Sonnet", value: "claude-3-sonnet-20240229" },
      { label: "Claude 3 Haiku", value: "claude-3-haiku-20240307" }
    ],
    default_model: "claude-3-5-sonnet-20241022"
  },
  aliyun: {
    base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    models: [
      { label: "Qwen-Turbo", value: "qwen-turbo" },
      { label: "Qwen-Plus", value: "qwen-plus" },
      { label: "Qwen-Max", value: "qwen-max" },
      { label: "Qwen-Max-Longcontext", value: "qwen-max-longcontext" },
      { label: "Qwen-Long", value: "qwen-long" }
    ],
    default_model: "qwen-turbo"
  },
  baidu: {
    base_url:
      "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat",
    models: [
      { label: "ERNIE-4.0-8K", value: "completions_pro" },
      { label: "ERNIE-3.5-8K", value: "completions" },
      { label: "ERNIE-Speed-8K", value: "ernie_speed" },
      { label: "ERNIE-Speed-128K", value: "ernie-speed-128k" },
      { label: "ERNIE-Lite-8K", value: "eb-instant" }
    ],
    default_model: "completions"
  },
  tencent: {
    base_url: "https://api.hunyuan.cloud.tencent.com/v1",
    models: [
      { label: "HunYuan-Lite", value: "hunyuan-lite" },
      { label: "HunYuan-Standard", value: "hunyuan-standard" },
      { label: "HunYuan-Pro", value: "hunyuan-pro" },
      { label: "HunYuan-Turbo", value: "hunyuan-turbo" }
    ],
    default_model: "hunyuan-lite"
  },
  siliconflow: {
    base_url: "https://api.siliconflow.cn/v1",
    models: [
      { label: "Kimi K2.5", value: "Pro/moonshotai/Kimi-K2.5" },
      { label: "Qwen2.5 VL 72B", value: "Qwen/Qwen2.5-VL-72B-Instruct" },
      { label: "Qwen2.5 VL 32B", value: "Qwen/Qwen2.5-VL-32B-Instruct" },
      { label: "Qwen2.5-72B-Instruct", value: "Qwen/Qwen2.5-72B-Instruct" },
      { label: "Qwen2.5-32B-Instruct", value: "Qwen/Qwen2.5-32B-Instruct" },
      { label: "Qwen2.5-7B-Instruct", value: "Qwen/Qwen2.5-7B-Instruct" },
      { label: "DeepSeek-V2.5", value: "deepseek-ai/DeepSeek-V2.5" },
      {
        label: "Llama-3.3-70B-Instruct",
        value: "meta-llama/Llama-3.3-70B-Instruct"
      },
      { label: "GLM-4-9B-Chat", value: "THUDM/glm-4-9b-chat" },
      { label: "GLM-4V-9B", value: "THUDM/glm-4v-9b" }
    ],
    default_model: "Pro/moonshotai/Kimi-K2.5"
  },
  openrouter: {
    base_url: "https://openrouter.ai/api/v1",
    models: [
      { label: "GPT-4o Mini", value: "openai/gpt-4o-mini" },
      { label: "Claude 3.5 Sonnet", value: "anthropic/claude-3.5-sonnet" },
      { label: "Gemini 2.0 Flash", value: "google/gemini-2.0-flash-001" },
      { label: "Qwen2.5 VL 72B", value: "qwen/qwen2.5-vl-72b-instruct" }
    ],
    default_model: "openai/gpt-4o-mini"
  },
  custom: {
    base_url: "",
    models: [],
    default_model: ""
  }
};

const currentModelOptions = ref([]);
const isCustomModel = ref(false);

const modelColumns = [
  {
    title: "名称",
    key: "name",
    render: (row) =>
      h("span", {}, [
        row.name,
        row.is_default
          ? h(
              NTag,
              { type: "success", size: "small", style: "margin-left: 8px" },
              { default: () => "默认" }
            )
          : null
      ])
  },
  {
    title: "提供商",
    key: "provider",
    render: (row) => providerLabels[row.provider] || row.provider
  },
  {
    title: "模型",
    key: "model"
  },
  {
    title: "状态",
    key: "is_enabled",
    width: 80,
    render: (row) =>
      h(
        NTag,
        {
          type: row.is_enabled ? "success" : "default",
          size: "small"
        },
        { default: () => (row.is_enabled ? "已启用" : "已禁用") }
      )
  },
  {
    title: "操作",
    key: "actions",
    width: 200,
    render: (row) =>
      h(
        NSpace,
        { size: "small" },
        {
          default: () => [
            h(
              NButton,
              {
                size: "small",
                quaternary: true,
                onClick: () => toggleModel(row)
              },
              { default: () => (row.is_enabled ? "禁用" : "启用") }
            ),
            h(
              NButton,
              {
                size: "small",
                quaternary: true,
                disabled: Boolean(row.is_default),
                onClick: () => setDefaultModel(row)
              },
              {
                default: () =>
                  h(
                    NIcon,
                    {},
                    { default: () => h(row.is_default ? Star : StarOutline) }
                  )
              }
            ),
            h(
              NButton,
              {
                size: "small",
                quaternary: true,
                onClick: () => openEditModel(row)
              },
              {
                default: () => h(NIcon, {}, { default: () => h(CreateOutline) })
              }
            ),
            h(
              NButton,
              {
                size: "small",
                quaternary: true,
                type: "error",
                onClick: () => deleteModel(row)
              },
              {
                default: () => h(NIcon, {}, { default: () => h(TrashOutline) })
              }
            )
          ]
        }
      )
  }
];

const themeOptions = [
  { label: "默认蓝", value: "default", color: "#0d74ea" },
  { label: "天空蓝", value: "blue", color: "#1890ff" },
  { label: "极客蓝", value: "geekblue", color: "#2f54eb" },
  { label: "优雅紫", value: "purple", color: "#722ed1" },
  { label: "洋红", value: "magenta", color: "#eb2f96" },
  { label: "粉红", value: "pink", color: "#eb2f96" },
  { label: "清新绿", value: "green", color: "#52c41a" },
  { label: "青柠", value: "lime", color: "#a0d911" },
  { label: "青色", value: "cyan", color: "#13c2c2" },
  { label: "活力橙", value: "orange", color: "#fa8c16" },
  { label: "金色", value: "gold", color: "#faad14" },
  { label: "火山红", value: "volcano", color: "#fa541c" },
  { label: "红色", value: "red", color: "#f5222d" },
  { label: "深色", value: "dark", color: "#141414" }
];

const handleShortcutKeydown = (e) => {
  e.preventDefault();

  const modifiers = [];
  if (e.ctrlKey) modifiers.push("CommandOrControl");
  if (e.metaKey) modifiers.push("CommandOrControl");
  if (e.altKey) modifiers.push("Alt");
  if (e.shiftKey) modifiers.push("Shift");

  let key = e.key;
  if (key === " ") key = "Space";
  if (key === "Control" || key === "Meta" || key === "Alt" || key === "Shift") {
    return;
  }

  if (key.length === 1) {
    key = key.toUpperCase();
  }

  if (modifiers.length > 0) {
    settings.global_shortcut = [...modifiers, key].join("+");
    saveShortcut();
  }
};

const syncNativeSettings = async () => {
  if (window.electronAPI?.getGlobalShortcut) {
    const activeShortcut = await window.electronAPI.getGlobalShortcut();
    if (activeShortcut) {
      settings.global_shortcut = activeShortcut;
    }
  }

  if (window.electronAPI?.getAutoLaunch) {
    const autoLaunch = await window.electronAPI.getAutoLaunch();
    if (typeof autoLaunch === "boolean") {
      settings.auto_launch = autoLaunch;
    }
  }
};

const resetShortcut = async () => {
  settings.global_shortcut = DEFAULT_GLOBAL_SHORTCUT;
  await saveShortcut();
};

const saveShortcut = async () => {
  try {
    if (window.electronAPI?.setGlobalShortcut) {
      const result = await window.electronAPI.setGlobalShortcut(
        settings.global_shortcut
      );
      if (result) {
        await settingsApi.set("global_shortcut", settings.global_shortcut);
        message.success("快捷键已保存");
      } else {
        await syncNativeSettings();
        message.error("快捷键注册失败，请尝试其他组合");
      }
    } else {
      await settingsApi.set("global_shortcut", settings.global_shortcut);
      message.success("快捷键已保存（开发模式下不生效）");
    }
  } catch (error) {
    console.error("保存快捷键失败:", error);
    message.error("保存失败");
  }
};

const loadSettings = async () => {
  try {
    const response = await settingsApi.getAll();
    if (response.data.data) {
      Object.keys(response.data.data).forEach((key) => {
        if (settings.hasOwnProperty(key)) {
          settings[key] = response.data.data[key];
        }
      });
    }

    await syncNativeSettings();
  } catch (error) {
    console.error("加载设置失败:", error);
    message.error("加载设置失败");
  }
};

const applyImportedRuntimeSettings = async (importedSettings = {}) => {
  if (
    Object.prototype.hasOwnProperty.call(importedSettings, "global_shortcut") &&
    window.electronAPI?.setGlobalShortcut
  ) {
    const shortcutRegistered = await window.electronAPI.setGlobalShortcut(
      importedSettings.global_shortcut
    );

    if (!shortcutRegistered) {
      message.warning("导入的快捷键未能注册，已保留当前生效快捷键");
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(importedSettings, "auto_launch") &&
    window.electronAPI?.setAutoLaunch
  ) {
    await window.electronAPI.setAutoLaunch(Boolean(importedSettings.auto_launch));
  }
};

const loadAiModels = async () => {
  try {
    const response = await aiModelsApi.getAll();
    aiModels.value = response.data.data || [];
  } catch (error) {
    console.error("加载AI模型列表失败:", error);
  }
};

const openAddModel = () => {
  editingModel.value = null;
  Object.assign(modelForm, {
    name: "",
    provider: "openai",
    api_key: "",
    base_url: providerPresets.openai.base_url,
    model: providerPresets.openai.default_model
  });
  currentModelOptions.value = providerPresets.openai.models;
  isCustomModel.value = false;
  showModelModal.value = true;
};

const openEditModel = (model) => {
  editingModel.value = model;
  Object.assign(modelForm, {
    name: model.name,
    provider: model.provider,
    api_key: model.api_key,
    base_url: model.base_url || "",
    model: model.model
  });
  const preset = providerPresets[model.provider];
  if (preset) {
    currentModelOptions.value = preset.models;
    const modelInPreset = preset.models.some(m => m.value === model.model);
    isCustomModel.value = model.provider === "custom" || !modelInPreset;
  } else {
    currentModelOptions.value = [];
    isCustomModel.value = true;
  }
  showModelModal.value = true;
};

const saveModel = async () => {
  if (!modelForm.name || !modelForm.api_key || !modelForm.model) {
    message.warning("请填写名称、API Key 和模型名称");
    return;
  }

  try {
    if (editingModel.value) {
      await aiModelsApi.update(editingModel.value.id, modelForm);
      message.success("模型配置已更新");
    } else {
      await aiModelsApi.create(modelForm);
      message.success("模型配置已添加");
    }
    showModelModal.value = false;
    await loadAiModels();
  } catch (error) {
    console.error("保存模型配置失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "保存失败";
    message.error(errorMsg);
  }
};

const deleteModel = async (model) => {
  dialog.warning({
    title: "确认删除",
    content: `确定要删除模型配置 "${model.name}" 吗？`,
    positiveText: "删除",
    negativeText: "取消",
    onPositiveClick: async () => {
      try {
        await aiModelsApi.delete(model.id);
        message.success("已删除");
        await loadAiModels();
      } catch (error) {
        console.error("删除失败:", error);
        const errorMsg = error.response?.data?.error || error.message || "删除失败";
        message.error(errorMsg);
      }
    }
  });
};

const setDefaultModel = async (model) => {
  try {
    await aiModelsApi.setDefault(model.id);
    message.success(`已将 "${model.name}" 设为默认模型`);
    await loadAiModels();
  } catch (error) {
    console.error("设置默认模型失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "设置失败";
    message.error(errorMsg);
  }
};

const toggleModel = async (model) => {
  try {
    await aiModelsApi.toggle(model.id);
    message.success(model.is_enabled ? "已禁用模型" : "已启用模型");
    await loadAiModels();
  } catch (error) {
    console.error("切换状态失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "操作失败";
    message.error(errorMsg);
  }
};

const testModel = async () => {
  if (!modelForm.api_key) {
    message.warning("请先输入API Key");
    return;
  }

  modelTesting.value = true;
  try {
    await aiModelsApi.test({
      provider: modelForm.provider,
      apiKey: modelForm.api_key,
      baseUrl: modelForm.base_url,
      model: modelForm.model,
      name: modelForm.name
    });
    message.success("连接成功");
  } catch (error) {
    console.error("测试连接失败:", error);
    message.error(error.response?.data?.message || "连接失败");
  } finally {
    modelTesting.value = false;
  }
};

const getDefaultModelName = (provider) => {
  const preset = providerPresets[provider];
  return preset?.default_model || "gpt-3.5-turbo";
};

const onProviderChange = (provider) => {
  const preset = providerPresets[provider];
  if (preset) {
    modelForm.base_url = preset.base_url;
    modelForm.model = preset.default_model;
    currentModelOptions.value = preset.models;
    isCustomModel.value = provider === "custom";
  } else {
    modelForm.base_url = "";
    modelForm.model = "";
    currentModelOptions.value = [];
    isCustomModel.value = true;
  }
};

const handleAutoLaunchChange = async (value) => {
  try {
    if (window.electronAPI?.setAutoLaunch) {
      await window.electronAPI.setAutoLaunch(value);
    }
    await settingsApi.set("auto_launch", value);
    message.success(value ? "已开启开机自启动" : "已关闭开机自启动");
  } catch (error) {
    console.error("设置开机自启动失败:", error);
    message.error("设置失败");
    settings.auto_launch = !value;
  }
};

const exportData = async () => {
  exporting.value = true;
  try {
    const [
      websites,
      passwords,
      snippets,
      documents,
      docFolders,
      aiModelsData,
      aiMessages,
      promptTemplates,
      appSettings
    ] = await Promise.all([
      websiteApi.getAll(),
      passwordApi.getAll(),
      snippetApi.getAll(),
      documentApi.getAll(),
      docFolderApi.getFlat(),
      aiModelsApi.getAll(),
      aiMessageApi.getAll(),
      promptTemplateApi.getAll(),
      settingsApi.getAll()
    ]);

    const exportPayload = {
      version: "1.0.0",
      exportTime: new Date().toISOString(),
      data: {
        websites: websites.data.data || [],
        passwords: passwords.data.data || [],
        snippets: snippets.data.data || [],
        documents: documents.data.data || [],
        docFolders: docFolders.data.data || [],
        aiModels: aiModelsData.data.data || [],
        aiMessages: aiMessages.data.data || [],
        promptTemplates: promptTemplates.data.data || [],
        settings: appSettings.data.data || {}
      }
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexious-tools-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    message.success("数据导出成功");
  } catch (error) {
    console.error("导出失败:", error);
    message.error("导出失败");
  } finally {
    exporting.value = false;
  }
};

const triggerImport = () => {
  fileInput.value?.click();
};

const importMode = ref("merge");

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const importPayload = JSON.parse(text);

    if (!importPayload.version || !importPayload.data) {
      message.error("无效的备份文件格式");
      event.target.value = "";
      return;
    }

    const data = importPayload.data;
    const stats = {
      websites: data.websites?.length || 0,
      passwords: data.passwords?.length || 0,
      snippets: data.snippets?.length || 0,
      documents: data.documents?.length || 0,
      aiModels: data.aiModels?.length || 0,
      aiMessages: data.aiMessages?.length || 0,
      promptTemplates: data.promptTemplates?.length || 0
    };

    dialog.info({
      title: "选择导入方式",
      content: `检测到备份文件包含：网站 ${stats.websites} 个、密码 ${stats.passwords} 个、代码片段 ${stats.snippets} 个、文档 ${stats.documents} 个、AI模型 ${stats.aiModels} 个、AI对话 ${stats.aiMessages} 个、提示词模板 ${stats.promptTemplates} 个`,
      positiveText: "覆盖导入",
      negativeText: "增量导入",
      onPositiveClick: async () => {
        await doImport(data, "overwrite");
      },
      onNegativeClick: async () => {
        await doImport(data, "merge");
      }
    });
  } catch (error) {
    console.error("读取文件失败:", error);
    message.error("读取文件失败");
  } finally {
    event.target.value = "";
  }
};

const doImport = async (data, mode) => {
  importing.value = true;
  try {
    if (mode === "overwrite") {
      await Promise.all([
        websiteApi.clearAll(),
        passwordApi.clearAll(),
        snippetApi.clearAll(),
        documentApi.clearAll(),
        aiModelsApi.clearAll(),
        aiMessageApi.clearAll(),
        promptTemplateApi.clearAll()
      ]);
    }

    if (data.websites?.length) {
      for (const item of data.websites) {
        if (mode === "merge") {
          const existing = await websiteApi.getById(item.id).catch(() => null);
          if (existing?.data?.data) {
            await websiteApi.update(item.id, item);
          } else {
            await websiteApi.create(item);
          }
        } else {
          await websiteApi.create(item);
        }
      }
    }

    if (data.passwords?.length) {
      for (const item of data.passwords) {
        if (mode === "merge") {
          const existing = await passwordApi.getById(item.id).catch(() => null);
          if (existing?.data?.data) {
            await passwordApi.update(item.id, item);
          } else {
            await passwordApi.create(item);
          }
        } else {
          await passwordApi.create(item);
        }
      }
    }

    if (data.snippets?.length) {
      for (const item of data.snippets) {
        if (mode === "merge") {
          const existing = await snippetApi.getById(item.id).catch(() => null);
          if (existing?.data?.data) {
            await snippetApi.update(item.id, item);
          } else {
            await snippetApi.create(item);
          }
        } else {
          await snippetApi.create(item);
        }
      }
    }

    if (data.documents?.length) {
      for (const item of data.documents) {
        if (mode === "merge") {
          const existing = await documentApi.getById(item.id).catch(() => null);
          if (existing?.data?.data) {
            await documentApi.update(item.id, item);
          } else {
            await documentApi.create(item);
          }
        } else {
          await documentApi.create(item);
        }
      }
    }

    if (data.docFolders?.length) {
      for (const item of data.docFolders) {
        await docFolderApi.create(item);
      }
    }

    if (data.aiModels?.length) {
      for (const item of data.aiModels) {
        if (mode === "merge") {
          try {
            await aiModelsApi.update(item.id, item);
          } catch {
            await aiModelsApi.create(item);
          }
        } else {
          await aiModelsApi.create(item);
        }
      }
    }

    if (data.aiMessages?.length) {
      for (const item of data.aiMessages) {
        await aiMessageApi.saveMessage({
          conversation_id: item.conversation_id,
          role: item.role,
          content: item.content,
          references: item.references || item.refs,
          images: item.images
        });
      }
    }

    if (data.promptTemplates?.length) {
      for (const item of data.promptTemplates) {
        if (mode === "merge") {
          const existing = await promptTemplateApi.getById(item.id).catch(() => null);
          if (existing?.data?.data) {
            await promptTemplateApi.update(item.id, item);
          } else {
            await promptTemplateApi.create(item);
          }
        } else {
          await promptTemplateApi.create(item);
        }
      }
    }

    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        await settingsApi.set(key, value);
      }

      await applyImportedRuntimeSettings(data.settings);
    }

    message.success(mode === "overwrite" ? "数据覆盖导入成功" : "数据增量导入成功");
    loadSettings();
    await loadAiModels();
  } catch (error) {
    console.error("导入数据失败:", error);
    const errorMsg = error.response?.data?.error || error.message || "导入失败";
    message.error(errorMsg);
  } finally {
    importing.value = false;
  }
};

onMounted(() => {
  loadSettings();
  loadAiModels();
});
</script>

<style scoped>
.settings-page {
  max-width: 800px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}

.theme-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.theme-item:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
}

.theme-item.active {
  background: var(--active-bg, rgba(0, 0, 0, 0.08));
}

.theme-color {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 2px solid transparent;
}

.theme-item:hover .theme-color {
  transform: scale(1.1);
}

.theme-item.active .theme-color {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.theme-label {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .theme-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 480px) {
  .theme-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
