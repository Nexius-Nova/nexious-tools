import { ref, computed, watch } from 'vue'
import { settingsApi } from '../api/settings'

const themeColors = {
  default: { primary: '#0d74ea', hover: '#1c5ae1' },
  purple: { primary: '#722ed1', hover: '#531dab' },
  green: { primary: '#52c41a', hover: '#389e0d' },
  orange: { primary: '#fa8c16', hover: '#d46b08' },
  cyan: { primary: '#13c2c2', hover: '#08979c' },
  pink: { primary: '#eb2f96', hover: '#c41d7f' },
  red: { primary: '#f5222d', hover: '#cf1322' },
  gold: { primary: '#faad14', hover: '#d48806' },
  lime: { primary: '#a0d911', hover: '#7cb305' },
  blue: { primary: '#1890ff', hover: '#096dd9' },
  geekblue: { primary: '#2f54eb', hover: '#1d39c4' },
  magenta: { primary: '#eb2f96', hover: '#c41d7f' },
  volcano: { primary: '#fa541c', hover: '#d4380d' },
  dark: { primary: '#177ddc', hover: '#3c9ae8' }
}

const currentTheme = ref('default')

const isDarkMode = computed(() => currentTheme.value === 'dark')

const themeOverrides = computed(() => {
  const colors = themeColors[currentTheme.value] || themeColors.default
  return {
    common: {
      primaryColor: colors.primary,
      primaryColorHover: colors.hover,
      borderRadius: '8px'
    }
  }
})

const applyTheme = (theme) => {
  currentTheme.value = theme
  
  if (theme === 'default') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', theme)
  }
}

const setTheme = async (theme) => {
  applyTheme(theme)
  try {
    await settingsApi.set('theme', theme)
  } catch (error) {
    console.error('保存主题失败:', error)
  }
}

const loadTheme = async () => {
  try {
    const response = await settingsApi.getAll()
    if (response.data.data?.theme) {
      applyTheme(response.data.data.theme)
    }
  } catch (error) {
    console.error('加载主题失败:', error)
  }
}

watch(currentTheme, (newTheme) => {
  applyTheme(newTheme)
})

export function useTheme() {
  return {
    currentTheme,
    isDarkMode,
    themeOverrides,
    setTheme,
    loadTheme
  }
}
