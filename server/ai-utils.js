import { queryOne } from './db.js'

export const getDefaultAiModel = async () => {
  const model = await queryOne('SELECT * FROM ai_models WHERE is_enabled = 1 AND is_default = 1')
  if (model) {
    return {
      provider: model.provider,
      api_key: model.api_key,
      base_url: model.base_url,
      model: model.model
    }
  }
  
  const enabledModel = await queryOne('SELECT * FROM ai_models WHERE is_enabled = 1 ORDER BY created_at ASC LIMIT 1')
  if (enabledModel) {
    return {
      provider: enabledModel.provider,
      api_key: enabledModel.api_key,
      base_url: enabledModel.base_url,
      model: enabledModel.model
    }
  }
  
  return null
}

export const getProviderConfig = (provider, base_url, model) => {
  const configs = {
    openai: {
      url: base_url ? `${base_url}/chat/completions` : 'https://api.openai.com/v1/chat/completions',
      model: model || 'gpt-4o-mini',
      type: 'openai'
    },
    deepseek: {
      url: base_url ? `${base_url}/chat/completions` : 'https://api.deepseek.com/chat/completions',
      model: model || 'deepseek-chat',
      type: 'openai'
    },
    zhipu: {
      url: base_url ? `${base_url}/chat/completions` : 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      model: model || 'glm-4-flash',
      type: 'openai'
    },
    moonshot: {
      url: base_url ? `${base_url}/chat/completions` : 'https://api.moonshot.cn/v1/chat/completions',
      model: model || 'moonshot-v1-8k',
      type: 'openai'
    },
    anthropic: {
      url: base_url ? `${base_url}/v1/messages` : 'https://api.anthropic.com/v1/messages',
      model: model || 'claude-3-5-sonnet-20241022',
      type: 'anthropic'
    },
    aliyun: {
      url: base_url ? `${base_url}/chat/completions` : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: model || 'qwen-turbo',
      type: 'openai'
    },
    baidu: {
      url: base_url || 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
      model: model || 'completions',
      type: 'baidu'
    },
    tencent: {
      url: base_url ? `${base_url}/chat/completions` : 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
      model: model || 'hunyuan-lite',
      type: 'openai'
    },
    siliconflow: {
      url: base_url ? `${base_url}/chat/completions` : 'https://api.siliconflow.cn/v1/chat/completions',
      model: model || 'Qwen/Qwen2.5-7B-Instruct',
      type: 'openai'
    },
    custom: {
      url: base_url,
      model: model || 'gpt-3.5-turbo',
      type: 'openai'
    }
  }
  
  return configs[provider] || configs.custom
}
