import { queryOne, query } from './db.js'

const PROVIDER_CONFIGS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    type: 'openai'
  },
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    type: 'openai'
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    model: 'glm-4-flash',
    type: 'openai'
  },
  moonshot: {
    url: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    type: 'openai'
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-20241022',
    type: 'anthropic'
  },
  aliyun: {
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo',
    type: 'openai'
  },
  baidu: {
    url: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
    model: 'completions',
    type: 'baidu'
  },
  tencent: {
    url: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
    model: 'hunyuan-lite',
    type: 'openai'
  },
  siliconflow: {
    url: 'https://api.siliconflow.cn/v1/chat/completions',
    model: 'Qwen/Qwen2.5-7B-Instruct',
    type: 'openai'
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'openai/gpt-4o-mini',
    type: 'openai'
  },
  custom: {
    url: '',
    model: 'gpt-3.5-turbo',
    type: 'openai'
  }
}

const IMAGE_GEN_CONFIGS = {
  openai: {
    url: 'https://api.openai.com/v1/images/generations',
    size: '1024x1024',
    quality: 'standard'
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/images/generations'
  },
  siliconflow: {
    url: 'https://api.siliconflow.cn/v1/images/generations'
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/images/generations'
  },
  custom: {
    url: ''
  }
}

const IMAGE_GEN_FALLBACK = {
  url: '/images/generations',
  size: '1024x1024'
}

const VIDEO_GEN_CONFIGS = {
  openai: {
    url: 'https://api.openai.com/v1/video/generations'
  },
  zhipu: {
    url: 'https://open.bigmodel.cn/api/paas/v4/videos/generations'
  },
  siliconflow: {
    url: 'https://api.siliconflow.cn/v1/video/generations'
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/video/generations'
  },
  custom: {
    url: ''
  }
}

const VIDEO_GEN_FALLBACK = {
  url: '/video/generations'
}

const MODEL_CATEGORIES = ['text', 'vision', 'video', 'audio']

const CATEGORY_LABELS = {
  text: '文本模型',
  vision: '视觉模型',
  video: '视频模型',
  audio: '音频模型'
}

const GENERIC_VISION_MODEL_HINTS = [
  'vl',
  'vision',
  'omni',
  'ocr',
  'qvq',
  'step3',
  '4v',
  '4.1v',
  '4.5v',
  'gpt-4o',
  'gpt-4.1',
  'kimi-k2.5',
  'kimi-k2-5',
  'gemini-2.5-flash-image',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'minicpm-v',
  'internvl',
  'llava',
  'pixtral',
  'cogview',
  'dall-e',
  'sora',
  'kling',
  'pika',
  'runway',
  'stable-diffusion',
  'midjourney'
]

const PROVIDER_VISION_PATTERNS = {
  moonshot: ['kimi-k2.5', 'kimi-k2-5', 'vision-preview'],
  siliconflow: [
    'moonshotai/kimi-k2.5',
    'moonshotai/kimi-k2-5',
    'qwen/qvq',
    'qwen/qwen2.5-vl',
    'pro/qwen/qwen2.5-vl',
    'thudm/glm-4v',
    'thudm/glm-4.1v',
    'thudm/glm-4.5v',
    'pro/zai-org/glm-4.1v',
    'pro/zai-org/glm-4.5v',
    'internvl',
    'minicpm-v'
  ],
  zhipu: ['glm-4v', 'glm-4.1v', 'glm-4.5v', 'cogview'],
  aliyun: ['qwen-vl', 'qvq', 'qwen2.5-vl', 'qwen-vl-max', 'qwen-vl-plus'],
  openai: ['gpt-4o', 'gpt-4.1', 'dall-e'],
  openrouter: [
    'gpt-4o',
    'gpt-4.1',
    'claude-3.5-sonnet',
    'claude-3.7-sonnet',
    'gemini-2.0-flash',
    'gemini-2.5',
    'qwen2.5-vl',
    'minicpm-v',
    'llava',
    'pixtral'
  ],
  anthropic: ['claude-3', 'claude-3.5', 'claude-3.7', 'claude-sonnet-4', 'claude-opus-4']
}

const normalizeModelId = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/\s+/g, '')

export const getDefaultAiModel = async () => {
  const model = await queryOne('SELECT * FROM ai_models WHERE is_enabled = 1 AND is_default = 1')
  if (model) {
    return {
      id: model.id,
      provider: model.provider,
      api_key: model.api_key,
      base_url: model.base_url,
      model: model.model,
      category: model.category || 'text'
    }
  }

  const enabledModel = await queryOne('SELECT * FROM ai_models WHERE is_enabled = 1 ORDER BY created_at ASC LIMIT 1')
  if (enabledModel) {
    return {
      id: enabledModel.id,
      provider: enabledModel.provider,
      api_key: enabledModel.api_key,
      base_url: enabledModel.base_url,
      model: enabledModel.model,
      category: enabledModel.category || 'text'
    }
  }

  return null
}

export const getEnabledAiModels = async (category = null) => {
  let sql = 'SELECT * FROM ai_models WHERE is_enabled = 1 ORDER BY is_default DESC, created_at DESC'
  const rows = await query(sql)
  if (category) {
    return rows.filter(r => (r.category || 'text') === category)
  }
  return rows
}

export const getAiModelById = async (id) => {
  const model = await queryOne('SELECT * FROM ai_models WHERE id = ?', [id])
  if (model) {
    return {
      id: model.id,
      provider: model.provider,
      api_key: model.api_key,
      base_url: model.base_url,
      model: model.model,
      category: model.category || 'text'
    }
  }
  return null
}

export const getModelCategories = () => [...MODEL_CATEGORIES]

export const getCategoryLabel = (category) => CATEGORY_LABELS[category] || category

export const getProviderConfig = (provider, base_url, model) => {
  const preset = PROVIDER_CONFIGS[provider] || PROVIDER_CONFIGS.custom
  const resolvedUrl = base_url
    ? provider === 'anthropic'
      ? `${base_url}/v1/messages`
      : provider === 'baidu'
        ? base_url
        : `${base_url}/chat/completions`
    : preset.url

  return {
    url: resolvedUrl,
    model: model || preset.model,
    type: preset.type
  }
}

export const getImageGenConfig = (provider, base_url) => {
  const preset = IMAGE_GEN_CONFIGS[provider]

  if (preset && preset.url) {
    return {
      url: preset.url,
      size: preset.size || IMAGE_GEN_FALLBACK.size,
      quality: preset.quality
    }
  }

  if (base_url) {
    return {
      url: `${base_url}${IMAGE_GEN_FALLBACK.url}`,
      size: IMAGE_GEN_FALLBACK.size
    }
  }

  return null
}

export const getVideoGenConfig = (provider, base_url) => {
  const preset = VIDEO_GEN_CONFIGS[provider]

  if (preset && preset.url) {
    return { url: preset.url }
  }

  if (base_url) {
    return { url: `${base_url}${VIDEO_GEN_FALLBACK.url}` }
  }

  return null
}

export const supportsVisionInput = (provider, model = '') => {
  const normalizedProvider = String(provider || '').toLowerCase()
  const normalizedModel = normalizeModelId(model)

  if (!normalizedModel) return false

  if (GENERIC_VISION_MODEL_HINTS.some((hint) => normalizedModel.includes(hint))) {
    return true
  }

  const providerPatterns = PROVIDER_VISION_PATTERNS[normalizedProvider] || []
  if (providerPatterns.some((pattern) => normalizedModel.includes(pattern))) {
    return true
  }

  return false
}
