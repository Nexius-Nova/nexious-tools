# Nexious Tools

一款基于 Electron + Vue 3 的桌面端工具集，提供网站链接管理、密码管理、代码片段管理、文档管理和 AI 智能助手功能。

![应用主界面截图](./test/image.png)

## 功能特性

### 网站管理

![网站管理卡片视图截图](./test/image-1.png)

- 网站链接的增删改查
- 自动获取网站图标
- 支持本地图片上传作为图标
- 桌面应用导入与管理
- 浏览器书签导入
- 卡片/列表视图切换
- 分类筛选与搜索
- 拖拽排序功能

### 密码管理

![密码管理界面截图](./test/image-2.png)

- 密码加密存储（AES-256）
- 密码生成器（可配置长度、字符类型）
- 一键复制密码
- 关联网站信息
- 安全的密码显示/隐藏
- 网站图标自动关联

### 代码片段

![代码片段管理截图](./test/image-3.png)

- 多语言代码高亮
- 分类管理（支持拖拽分类）
- 标签系统
- 快速搜索（支持正则表达式）
- 一键复制代码
- Monaco Editor 编辑器集成

### 文档管理

![文档管理界面截图](./test/image-4.png)
![文档编辑页面截图](./test/image-5.png)

- Markdown 文档编辑
- 实时预览
- 文件夹分类管理（支持多级嵌套）
- 导入 MD 文件
- 多种预览主题
- 代码高亮主题切换
- 收藏功能
- 拖拽移动文档

### AI 助手

![AI对话界面截图](./test/image-6.png)
![AI对话历史截图](./test/image-7.png)

- 流式对话响应
- 多轮对话记忆
- **图片支持（最多上传5张图片）**
- 引用数据上下文
- 支持 OpenAI / 自定义 API
- 对话历史管理
- 多模型配置管理
- 提示词模板
- 对话重命名与删除

### 快速搜索

![快速搜索界面截图](./test/image-8.png)
![快速搜索演示截图](./test/image-9.png)

- 全局快捷键 `Ctrl+k` 唤起
- 实时搜索网站、密码、代码片段、文档
- 支持名称、别名、描述、URL、备注、标签、代码内容等多字段搜索
- URL 直接访问功能
- 深色/浅色主题切换
- 失焦自动最小化

### 应用设置

![应用设置界面截图](./test/image-10.png)

- 全局快捷键自定义
- 多种颜色主题
- 深色模式支持
- AI 模型多配置管理

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Vue 3 + Composition API |
| UI 组件库 | Naive UI |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 构建工具 | Vite 5 |
| 桌面框架 | Electron 29 |
| 后端服务 | Express.js |
| 数据库 | SQLite (sql.js) |
| 加密 | CryptoJS (AES-256) |
| Markdown 编辑器 | md-editor-v3 |
| 代码编辑器 | Monaco Editor |

## 项目结构

```
nexious-tools/
├── electron/                 # Electron 主进程
│   ├── main.cjs              # 主进程入口
│   ├── preload.js            # 预加载脚本
│   └── assets/               # 应用资源
├── server/                   # 后端服务
│   ├── index.js              # 服务入口
│   ├── db.js                 # 数据库操作封装
│   ├── db-config.js          # 数据库配置
│   ├── db-sqlite.js          # SQLite 适配器
│   ├── ai-utils.js           # AI 工具函数
│   ├── uploads/              # 上传文件存储
│   └── routes/               # API 路由
│       ├── websites.js       # 网站 API
│       ├── passwords.js      # 密码 API
│       ├── snippets.js       # 代码片段 API
│       ├── ai.js             # AI 对话 API
│       ├── ai-models.js      # AI 模型配置 API
│       ├── ai-messages.js    # AI 消息 API
│       ├── documents.js      # 文档 API
│       ├── doc-folders.js    # 文档文件夹 API
│       ├── prompt-templates.js # 提示词模板 API
│       ├── uploads.js        # 文件上传 API
│       └── settings.js       # 设置 API
├── src/                      # 前端源码
│   ├── api/                  # API 封装
│   ├── components/           # 公共组件
│   │   ├── QuickSearch.vue   # 快速搜索组件
│   │   ├── Sidebar.vue       # 侧边栏
│   │   ├── TitleBar.vue      # 标题栏
│   │   ├── MonacoEditor.vue  # 代码编辑器
│   │   ├── CatalogSidebar.vue # 目录侧边栏
│   │   ├── CodeBlock.vue     # 代码块组件
│   │   ├── FolderTreeNode.vue # 文件夹树节点
│   │   ├── MessageContent.vue # AI消息内容
│   │   ├── PasswordModal.vue # 密码弹窗
│   │   ├── SnippetModal.vue  # 代码片段弹窗
│   │   ├── WebsiteModal.vue  # 网站弹窗
│   │   └── SkeletonLoader.vue # 骨架屏加载
│   ├── views/                # 页面组件
│   │   ├── WebsiteManager.vue    # 网站管理
│   │   ├── PasswordManager.vue   # 密码管理
│   │   ├── CodeSnippetManager.vue # 代码片段管理
│   │   ├── Documents.vue     # 文档管理
│   │   ├── AIChat.vue        # AI 对话
│   │   └── Settings.vue      # 应用设置
│   ├── router/               # 路由配置
│   ├── store/                # 状态管理
│   ├── App.vue               # 根组件
│   ├── main.js               # 入口文件
│   └── style.css             # 全局样式
├── data/                     # 数据存储目录
│   └── nexious_tools.db      # SQLite 数据库文件
├── package.json
└── vite.config.js
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm（推荐）或 npm

### 安装依赖

```bash
pnpm install
```

### 数据库配置

项目使用 SQLite，无需额外配置，开箱即用。

### 开发模式

```bash
pnpm dev
```

此命令会同时启动：
- Vite 开发服务器 (http://localhost:5173)
- Express 后端服务 (http://localhost:3000)
- Electron 应用

### 构建打包

```bash
# 构建前端
pnpm build

# 打包应用
pnpm package        # 生成未封装应用目录
pnpm package:exe    # 生成 Windows 安装包 exe
pnpm package:portable # 生成便携版 exe
pnpm package:all    # 生成安装包和便携版
```

打包产物位于 `release/` 目录。

## 配置说明

### AI 配置

在「应用设置」页面配置 AI 服务：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| AI Provider | AI 服务商 | OpenAI |
| API Key | API 密钥 | sk-xxx |
| Base URL | API 地址（可选） | https://api.openai.com/v1 |
| Model | 模型名称 | gpt-4o |

支持配置多个 AI 模型，可随时切换使用。

### 主题配置

支持多种主题：
- 默认蓝色
- 紫色
- 绿色
- 橙色
- 青色
- 粉色
- 深色模式

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + Shift + Space` | 唤出应用窗口（可自定义） |
| `Ctrl/Cmd + K` | 打开快速搜索 |
| `Escape` | 关闭搜索/返回 |
| `Enter` | 确认选择 |
| `↑/↓` | 导航结果 |

## API 接口

### 网站 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/websites | 获取所有网站 |
| GET | /api/websites/:id | 获取单个网站 |
| POST | /api/websites | 创建网站 |
| PUT | /api/websites/:id | 更新网站 |
| DELETE | /api/websites/:id | 删除网站 |
| GET | /api/websites/favicon | 获取网站图标 |
| POST | /api/websites/scan-apps | 扫描桌面应用 |
| POST | /api/websites/import-bookmarks | 导入浏览器书签 |

### 密码 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/passwords | 获取所有密码 |
| POST | /api/passwords | 创建密码 |
| PUT | /api/passwords/:id | 更新密码 |
| DELETE | /api/passwords/:id | 删除密码 |
| POST | /api/passwords/decrypt/:id | 解密密码 |
| POST | /api/passwords/generate | 生成随机密码 |

### 代码片段 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/snippets | 获取所有片段 |
| POST | /api/snippets | 创建片段 |
| PUT | /api/snippets/:id | 更新片段 |
| DELETE | /api/snippets/:id | 删除片段 |
| GET | /api/snippets/categories | 获取分类 |
| POST | /api/snippets/categories | 创建分类 |
| PUT | /api/snippets/categories/:id | 更新分类 |
| DELETE | /api/snippets/categories/:id | 删除分类 |

### 文档 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/documents | 获取所有文档 |
| GET | /api/documents/:id | 获取单个文档 |
| POST | /api/documents | 创建文档 |
| PUT | /api/documents/:id | 更新文档 |
| DELETE | /api/documents/:id | 删除文档 |
| PUT | /api/documents/:id/folder | 移动文档到文件夹 |

### 文档文件夹 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/doc-folders | 获取所有文件夹 |
| POST | /api/doc-folders | 创建文件夹 |
| PUT | /api/doc-folders/:id | 更新文件夹 |
| DELETE | /api/doc-folders/:id | 删除文件夹 |

### AI API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/chat | AI 对话（流式响应，支持图片） |
| GET | /api/ai-models | 获取所有模型配置 |
| POST | /api/ai-models | 创建模型配置 |
| PUT | /api/ai-models/:id | 更新模型配置 |
| DELETE | /api/ai-models/:id | 删除模型配置 |
| PUT | /api/ai-models/:id/default | 设置默认模型 |
| PUT | /api/ai-models/:id/toggle | 切换模型启用状态 |

### AI 对话 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/ai-messages/conversations | 获取所有对话 |
| GET | /api/ai-messages/conversations/:id | 获取单个对话 |
| DELETE | /api/ai-messages/conversations/:id | 删除对话 |
| PUT | /api/ai-messages/conversations/:id/title | 更新对话标题 |

### 提示词模板 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/prompt-templates | 获取所有模板 |
| POST | /api/prompt-templates | 创建模板 |
| PUT | /api/prompt-templates/:id | 更新模板 |
| DELETE | /api/prompt-templates/:id | 删除模板 |

### 文件上传 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/uploads/image | 上传图片 |
| GET | /api/uploads/:path | 获取上传的文件 |

## 开发指南

### 添加新页面

1. 在 `src/views/` 创建页面组件
2. 在 `src/router/index.js` 添加路由
3. 在 `src/components/Sidebar.vue` 添加菜单项

### 添加新 API

1. 在 `server/routes/` 创建路由文件
2. 在 `server/index.js` 注册路由
3. 在 `src/api/` 创建 API 封装

## 许可证

MIT License

## 作者

Nexious
