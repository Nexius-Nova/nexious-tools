import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'QuickSearch',
    component: () => import('../App.vue'),
    meta: { isQuickSearch: true }
  },
  {
    path: '/websites',
    name: 'Websites',
    component: () => import('../views/WebsiteManager.vue'),
    meta: { title: '网站管理' }
  },
  {
    path: '/passwords',
    name: 'Passwords',
    component: () => import('../views/PasswordManager.vue'),
    meta: { title: '密码管理' }
  },
  {
    path: '/snippets',
    name: 'Snippets',
    component: () => import('../views/CodeSnippetManager.vue'),
    meta: { title: '代码片段' }
  },
  {
    path: '/ai',
    name: 'AI',
    component: () => import('../views/AIChat.vue'),
    meta: { title: 'AI 助手' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: '应用设置' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - Nexious Tools`
  }
  next()
})

export default router
