import express from 'express'
import { query, queryOne, execute } from '../db.js'
import { generateFavicon, generateAppIcon } from '../utils/favicon.js'
import { getProviderConfig, getDefaultAiModel } from '../ai-utils.js'
import axios from 'axios'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const websites = await query('SELECT * FROM websites ORDER BY created_at DESC, sort_order ASC')
    res.json({ data: websites })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/', async (req, res) => {
  const { name, url, favicon, description, type, app_path, alias } = req.body
  try {
    const existingSite = await queryOne(
      'SELECT * FROM websites WHERE type = ? AND name = ?',
      [type || 'website', name]
    )
    if (existingSite) {
      return res.json({ data: existingSite, exists: true })
    }

    const maxOrder = await queryOne('SELECT MAX(sort_order) as max_order FROM websites')
    const sort_order = (maxOrder?.max_order || 0) + 1

    let finalFavicon = favicon
    if (!finalFavicon) {
      if (type === 'app' && app_path) {
        finalFavicon = await generateAppIcon(name)
      } else if (url) {
        finalFavicon = await generateFavicon(url)
      }
    }

    const result = await execute(
      `INSERT INTO websites (name, url, favicon, description, type, app_path, alias, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, url || '', finalFavicon || '', description || '', type || 'website', app_path || '', alias || '', sort_order]
    )
    const website = await queryOne('SELECT * FROM websites WHERE id = ?', [result.lastInsertRowid])
    res.json({ data: website })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.put('/:id', async (req, res) => {
  const { name, url, favicon, description, type, app_path, alias } = req.body
  try {
    await execute(
      `UPDATE websites SET name = ?, url = ?, favicon = ?, description = ?, type = ?, app_path = ?, alias = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, url || '', favicon || '', description || '', type || 'website', app_path || '', alias || '', req.params.id]
    )
    const website = await queryOne('SELECT * FROM websites WHERE id = ?', [req.params.id])
    res.json({ data: website })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await execute('DELETE FROM websites WHERE id = ?', [req.params.id])
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/batch', async (req, res) => {
  const { websites } = req.body
  try {
    const maxOrder = await queryOne('SELECT MAX(sort_order) as max_order FROM websites')
    let currentOrder = (maxOrder?.max_order || 0) + 1

    const results = []
    for (const site of websites) {
      let finalFavicon = site.favicon
      if (!finalFavicon) {
        if (site.type === 'app' && site.app_path) {
          finalFavicon = await generateAppIcon(site.name)
        } else if (site.url) {
          finalFavicon = await generateFavicon(site.url)
        }
      }

      const result = await execute(
        `INSERT INTO websites (name, url, favicon, description, type, app_path, alias, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [site.name, site.url || '', finalFavicon || '', site.description || '', site.type || 'website', site.app_path || '', site.alias || '', currentOrder++]
      )
      const website = await queryOne('SELECT * FROM websites WHERE id = ?', [result.lastInsertRowid])
      results.push(website)
    }
    res.json({ data: results })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/search-url', async (req, res) => {
  const { name } = req.body
  try {
    const aiModel = await getDefaultAiModel()

    if (!aiModel) {
      const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(name)}`
      return res.json({ data: { url: fallbackUrl } })
    }

    const { provider, api_key, base_url, model } = aiModel
    const config = getProviderConfig(provider, base_url, model)

    const aiResponse = await axios.post(
      config.url,
      {
        model: config.model,
        messages: [
          {
            role: 'system',
            content: '你是一个URL查找助手。根据用户输入的名称，返回最可能的官方网站URL。只返回URL，不要其他内容。'
          },
          {
            role: 'user',
            content: `请返回"${name}"的官方网站URL，只返回URL:`
          }
        ],
        max_tokens: 100,
        temperature: 0.1
      },
      {
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    )

    const content = aiResponse.data.choices[0]?.message?.content?.trim() || ''
    const urlMatch = content.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/)
    const url = urlMatch ? urlMatch[0] : `https://www.google.com/search?q=${encodeURIComponent(name)}`

    res.json({ data: { url } })
  } catch (error) {
    console.error('生成搜索URL失败:', error.response?.data || error.message)
    res.status(500).json({ error: '生成搜索URL失败，请检查API配置' })
  }
})

router.post('/filter-apps', async (req, res) => {
  const { apps } = req.body
  try {
    const aiModel = await getDefaultAiModel()

    if (!aiModel) {
      return res.json({ data: apps })
    }

    const { provider, api_key, base_url, model } = aiModel
    const config = getProviderConfig(provider, base_url, model)

    const batchSize = 50
    const allFilteredApps = []

    for (let i = 0; i < apps.length; i += batchSize) {
      const batch = apps.slice(i, i + batchSize)
      const appNames = batch.map(a => a.name).join('\n')

      const aiResponse = await axios.post(
        config.url,
        {
          model: config.model,
          messages: [
            {
              role: 'system',
              content: `你是一个Windows桌面应用筛选专家。你的任务是从应用列表中精准筛选出用户真正会主动使用的桌面应用程序。

【必须保留的应用类型】
- 浏览器：Chrome、Edge、Firefox等
- 开发工具：VS Code、IDEA、Cursor、GitHub Desktop等
- 聊天通讯：微信、QQ、钉钉、飞书、Teams、Discord、Slack等
- 办公软件：Word、Excel、PowerPoint、WPS、Notion、Obsidian等
- 设计创意：Photoshop、Figma、Sketch、Premiere、Blender等
- 音视频：PotPlayer、VLC、网易云音乐、QQ音乐、Spotify等
- 下载工具：迅雷、IDM、qBittorrent等
- 压缩工具：Bandizip、7-Zip、WinRAR等
- 游戏平台：Steam、Epic、WeGame等
- 实用工具：Everything、Snipaste、Listary、PowerToys等
- 阅读学习：PDF阅读器、Zotero、Calibre等
- 安全工具：火绒、360安全卫士（用户主动安装的安全软件）等

【必须排除的应用类型】
1. 系统组件和工具：
   - 远程桌面连接、命令提示符、PowerShell、Windows终端
   - 任务管理器、资源监视器、事件查看器、注册表编辑器
   - 磁盘清理、字符映射表、步骤记录器
   - 画图、记事本、写字板、截图工具、便笺
   - Windows传真和扫描、Windows媒体播放器

2. 系统辅助程序：
   - 更新程序（Update、Updater）
   - 崩溃报告程序（Crash Reporter、Error Reporting）
   - 辅助进程（Helper、Assistant、Agent、Service、Daemon）
   - 运行时库（Runtime、Redistributable、Framework）
   - 安装/卸载程序（Setup、Installer、Uninstall、Bootstrap）

3. 驱动和底层组件：
   - 显卡驱动、声卡驱动、网卡驱动
   - 编解码器（Codec）
   - SDK、开发工具包、合并模块

4. 文档和许可证：
   - 说明书、帮助文档、Readme、License、EULA
   - 快速入门指南（Getting Started）

5. 微软内置应用（非用户主动安装）：
   - OneNote for Windows（注意区分OneNote桌面版）
   - 发送至OneNote、打印到OneNote
   - Office语言首选项、输入法编辑器
   - 关于Windows、关于Office、关于Java
   - 邮件、日历、照片、计算器（系统内置版本）

6. 其他排除：
   - 新机手册、恢复工具、备份工具
   - 诊断工具、同步工具、云存储后台服务
   - 试用版（Trial）、演示版（Demo）、示例程序

【判断原则】
- 用户是否会主动点击打开这个应用进行工作或娱乐？
- 这个应用是否有独立的、完整的功能界面？
- 排除所有后台运行、系统维护、辅助支撑类程序

【返回格式】
只返回JSON数组，包含保留的应用名称，不要任何解释文字。
示例：["Google Chrome", "Visual Studio Code", "微信"]`
            },
            {
              role: 'user',
              content: `请从以下Windows应用列表中筛选出真正的桌面应用程序，返回JSON数组：\n${appNames}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.05
        },
        {
          headers: {
            'Authorization': `Bearer ${api_key}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      const content = aiResponse.data.choices[0]?.message?.content?.trim() || '[]'
      let validNames = []
      try {
        const jsonMatch = content.match(/\[[\s\S]*?\]/)
        if (jsonMatch) {
          validNames = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.error('解析AI响应失败:', e)
      }

      const filteredBatch = batch.filter(app => validNames.includes(app.name))
      allFilteredApps.push(...filteredBatch)
    }

    res.json({ data: allFilteredApps })
  } catch (error) {
    console.error('筛选应用失败:', error.response?.data || error.message)
    res.json({ data: apps })
  }
})

router.delete('/clear/all', async (req, res) => {
  try {
    await execute('DELETE FROM websites')
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/reorder', async (req, res) => {
  const { orders } = req.body
  try {
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders 必须是数组' })
    }

    for (const item of orders) {
      await execute('UPDATE websites SET sort_order = ? WHERE id = ?', [item.sort_order, item.id])
    }

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
