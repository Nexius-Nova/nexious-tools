import { defineStore } from 'pinia'
import { ref } from 'vue'
import { websiteApi } from '../api/website'
import { passwordApi } from '../api/password'
import { snippetApi } from '../api/snippet'
import { documentApi } from '../api/documents'

export const useDataStore = defineStore('data', () => {
  const websites = ref([])
  const passwords = ref([])
  const snippets = ref([])
  const documents = ref([])
  const loading = ref(false)
  const loaded = ref(false)

  const loadAllData = async (forceReload = false) => {
    if (loaded.value && !forceReload) return
    
    loading.value = true
    try {
      const [webRes, pwdRes, snpRes, docRes] = await Promise.all([
        websiteApi.getAll(),
        passwordApi.getAll(),
        snippetApi.getAll(),
        documentApi.getAll()
      ])
      websites.value = webRes.data.data || []
      passwords.value = pwdRes.data.data || []
      snippets.value = snpRes.data.data || []
      documents.value = docRes.data.data || []
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

  const reloadDocuments = async () => {
    try {
      const response = await documentApi.getAll()
      documents.value = response.data.data || []
    } catch (error) {
      console.error('重新加载文档数据失败:', error)
      throw error
    }
  }

  const addDocument = (doc) => {
    documents.value.push(doc)
  }

  const updateDocument = (id, data) => {
    const index = documents.value.findIndex(d => d.id === id)
    if (index !== -1) {
      documents.value[index] = { ...documents.value[index], ...data }
    }
  }

  const removeDocument = (id) => {
    const index = documents.value.findIndex(d => d.id === id)
    if (index !== -1) {
      documents.value.splice(index, 1)
    }
  }

  return {
    websites,
    passwords,
    snippets,
    documents,
    loading,
    loaded,
    loadAllData,
    reloadWebsites,
    reloadPasswords,
    reloadSnippets,
    reloadDocuments,
    addWebsite,
    updateWebsite,
    removeWebsite,
    addPassword,
    updatePassword,
    removePassword,
    addSnippet,
    updateSnippet,
    removeSnippet,
    addDocument,
    updateDocument,
    removeDocument
  }
})
