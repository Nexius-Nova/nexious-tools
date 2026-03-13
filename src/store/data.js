import { ref } from 'vue'
import { websiteApi } from '../api/website'
import { passwordApi } from '../api/password'
import { snippetApi } from '../api/snippet'

const websites = ref([])
const passwords = ref([])
const snippets = ref([])
const loading = ref(false)
const loaded = ref(false)

const loadAllData = async (forceReload = false) => {
  if (loaded.value && !forceReload) return
  
  loading.value = true
  try {
    const [webRes, pwdRes, snpRes] = await Promise.all([
      websiteApi.getAll(),
      passwordApi.getAll(),
      snippetApi.getAll()
    ])
    websites.value = webRes.data.data || []
    passwords.value = pwdRes.data.data || []
    snippets.value = snpRes.data.data || []
    loaded.value = true
  } catch (error) {
    console.error('加载数据失败:', error)
    throw error
  } finally {
    loading.value = false
  }
}

const reloadWebsites = async () => {
  try {
    const response = await websiteApi.getAll()
    websites.value = response.data.data || []
  } catch (error) {
    console.error('重新加载网站数据失败:', error)
    throw error
  }
}

const reloadPasswords = async () => {
  try {
    const response = await passwordApi.getAll()
    passwords.value = response.data.data || []
  } catch (error) {
    console.error('重新加载密码数据失败:', error)
    throw error
  }
}

const reloadSnippets = async () => {
  try {
    const response = await snippetApi.getAll()
    snippets.value = response.data.data || []
  } catch (error) {
    console.error('重新加载代码片段数据失败:', error)
    throw error
  }
}

const addWebsite = (website) => {
  websites.value.push(website)
}

const updateWebsite = (id, data) => {
  const index = websites.value.findIndex(w => w.id === id)
  if (index !== -1) {
    websites.value[index] = { ...websites.value[index], ...data }
  }
}

const removeWebsite = (id) => {
  const index = websites.value.findIndex(w => w.id === id)
  if (index !== -1) {
    websites.value.splice(index, 1)
  }
}

const addPassword = (password) => {
  passwords.value.push(password)
}

const updatePassword = (id, data) => {
  const index = passwords.value.findIndex(p => p.id === id)
  if (index !== -1) {
    passwords.value[index] = { ...passwords.value[index], ...data }
  }
}

const removePassword = (id) => {
  const index = passwords.value.findIndex(p => p.id === id)
  if (index !== -1) {
    passwords.value.splice(index, 1)
  }
}

const addSnippet = (snippet) => {
  snippets.value.push(snippet)
}

const updateSnippet = (id, data) => {
  const index = snippets.value.findIndex(s => s.id === id)
  if (index !== -1) {
    snippets.value[index] = { ...snippets.value[index], ...data }
  }
}

const removeSnippet = (id) => {
  const index = snippets.value.findIndex(s => s.id === id)
  if (index !== -1) {
    snippets.value.splice(index, 1)
  }
}

export function useData() {
  return {
    websites,
    passwords,
    snippets,
    loading,
    loaded,
    loadAllData,
    reloadWebsites,
    reloadPasswords,
    reloadSnippets,
    addWebsite,
    updateWebsite,
    removeWebsite,
    addPassword,
    updatePassword,
    removePassword,
    addSnippet,
    updateSnippet,
    removeSnippet
  }
}
