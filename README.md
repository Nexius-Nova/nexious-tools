# Nexious Tools

一款基于 Electron + Vue 3 的桌面端工具集，提供网站链接管理、密码管理、代码片段管理、文档管理和 AI 智能助手功能。

## 功能特性

### 网站管理
- 网站链接的增删改查
- 自动获取网站图标
- 支持本地图片上传作为图标
- 桌面应用导入与管理
- 卡片/列表视图切换
- 分类筛选与搜索

### 密码管理
- 密码加密存储（AES-256）
- 密码生成器
- 一键复制密码
- 关联网站信息
- 安全的密码显示/隐藏

### 代码片段
- 多语言代码高亮
- 分类管理
- 标签系统
- 快速搜索
- 一键复制

### 文档管理
- Markdown 编辑器
- 文档目录导航
- 文件夹分类管理
- 拖拽移动文档
- 主题切换

### AI 助手
- 流式对话响应
- 多轮对话记忆
- 引用数据上下文
- 支持 OpenAI / 自定义 API
- 对话历史管理

### 快速搜索
- 全局快捷键 `Ctrl+K` 唤起
- 实时搜索网站、密码、代码片段、文档
- 深色/浅色主题切换
- 失焦自动最小化

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
| 数据库 | SQLite |
| 加密 | CryptoJS (AES-256) |

## 项目结构

```
nexious-tools/
├── electron/                 # Electron 主进程
│   ├── main.cjs              # 主进程入口
│   └── preload.js            # 预加载脚本
├── server/                   # 后端服务
│   ├── index.js              # 服务入口
│   ├── db.js                 # 数据库操作封装
│   ├── db-config.js          # 数据库配置
│   ├── db-sqlite.js          # SQLite 适配器
│   ├── db-adapters/          # 数据库适配器
│   │   └── sqlite-adapter.js
│   └── routes/               # API 路由
│       ├── websites.js       # 网站 API
│       ├── passwords.js      # 密码 API
│       ├── snippets.js       # 代码片段 API
│       ├── documents.js      # 文档 API
│       ├── doc-folders.js    # 文档文件夹 API
│       ├── ai.js             # AI 对话 API
│       ├── ai-messages.js    # AI 消息 API
│       └── settings.js       # 设置 API
├── src/                      # 前端源码
│   ├── api/                  # API 封装
│   ├── components/           # 公共组件
│   ├── views/                # 页面组件
│   ├── router/               # 路由配置
│   ├── App.vue               # 根组件
│   ├── main.js               # 入口文件
│   └── style.css             # 全局样式
├── database/                 # 数据库脚本
│   └── init.sql              # 初始化脚本
├── data/                     # 数据存储目录
│   └── nexious_tools.db      # SQLite 数据库文件
├── package.json
└── vite.config.js
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装依赖

```bash
pnpm install
```

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
pnpm package   # 生成 out/ 目录
pnpm make      # 生成安装包
```

打包产物位于 `out/` 目录。

## 配置说明

### AI 配置

在「应用设置」页面配置 AI 服务：

| 配置项 | 说明 | 示例 |
|--------|------|------|
| AI Provider | AI 服务商 | OpenAI |
| API Key | API 密钥 | sk-xxx |
| Base URL | API 地址（可选） | https://api.openai.com/v1 |
| Model | 模型名称 | gpt-4 |

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

### 密码 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/passwords | 获取所有密码 |
| POST | /api/passwords | 创建密码 |
| PUT | /api/passwords/:id | 更新密码 |
| DELETE | /api/passwords/:id | 删除密码 |
| POST | /api/passwords/decrypt/:id | 解密密码 |

### 代码片段 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/snippets | 获取所有片段 |
| POST | /api/snippets | 创建片段 |
| PUT | /api/snippets/:id | 更新片段 |
| DELETE | /api/snippets/:id | 删除片段 |
| GET | /api/snippets/categories | 获取分类 |

### 文档 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/documents | 获取所有文档 |
| POST | /api/documents | 创建文档 |
| PUT | /api/documents/:id | 更新文档 |
| DELETE | /api/documents/:id | 删除文档 |

### AI API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/ai/chat | AI 对话（流式响应） |

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
