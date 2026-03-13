import { ref, computed, watch } from 'vue'
import { settingsApi } from '../api/settings'

const themeColors = {
  default: { primary: '#0d74ea', hover: '#1c5ae1' },
  purple: { primary: '#722ed1', hover: '#531dab' },
  green: { primary: '#52c41a', hover: '#389e0d' },
  orange: { primary: '#fa8c16', hover: '#d46b08' },
  cyan: { primary: '#13c2c2', hover: '#08979c' },
  pink: { primary: '#eb2f96', hover: '#c41d7f' },
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
