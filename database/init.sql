-- 创建数据库
CREATE DATABASE IF NOT EXISTS nexious_tools DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nexious_tools;

-- 网站表
CREATE TABLE IF NOT EXISTS websites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL COMMENT '网站名称',
    url VARCHAR(500) DEFAULT NULL COMMENT '网站URL',
    alias VARCHAR(100) DEFAULT NULL COMMENT '别名',
    favicon VARCHAR(1000) DEFAULT NULL COMMENT '网站图标URL或Base64',
    description TEXT DEFAULT NULL COMMENT '网站描述',
    app_path VARCHAR(500) DEFAULT NULL COMMENT '应用路径',
    type VARCHAR(20) DEFAULT 'website' COMMENT '类型: website/app',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (name),
    INDEX idx_alias (alias),
    INDEX idx_url (url(255)),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站管理表';

-- 密码表
CREATE TABLE IF NOT EXISTS passwords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) DEFAULT NULL COMMENT '标题',
    website_id INT DEFAULT NULL COMMENT '关联网站ID',
    username VARCHAR(255) NOT NULL COMMENT '用户名/账号',
    password TEXT NOT NULL COMMENT '加密后的密码',
    website_url VARCHAR(500) DEFAULT NULL COMMENT '网站URL',
    website_name VARCHAR(255) DEFAULT NULL COMMENT '网站名称(冗余字段)',
    notes TEXT DEFAULT NULL COMMENT '备注',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (website_id) REFERENCES websites(id) ON DELETE SET NULL,
    INDEX idx_title (title),
    INDEX idx_username (username),
    INDEX idx_website_id (website_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='密码管理表';

-- 代码片段分类表
CREATE TABLE IF NOT EXISTS snippet_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE COMMENT '分类名称',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码片段分类表';

-- 代码片段表
CREATE TABLE IF NOT EXISTS code_snippets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT '标题',
    language VARCHAR(50) DEFAULT 'javascript' COMMENT '编程语言',
    category VARCHAR(100) DEFAULT NULL COMMENT '分类',
    description TEXT DEFAULT NULL COMMENT '描述',
    code LONGTEXT NOT NULL COMMENT '代码内容',
    tags JSON DEFAULT NULL COMMENT '标签',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_title (title),
    INDEX idx_language (language),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代码片段表';

-- 应用设置表
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE COMMENT '设置键',
    setting_value TEXT DEFAULT NULL COMMENT '设置值',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='应用设置表';

-- AI 消息表
CREATE TABLE IF NOT EXISTS ai_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL COMMENT '会话ID',
    role ENUM('user', 'assistant') NOT NULL COMMENT '角色',
    content TEXT NOT NULL COMMENT '消息内容',
    refs JSON DEFAULT NULL COMMENT '引用数据',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI对话消息表';

-- 插入默认设置
INSERT INTO settings (setting_key, setting_value) VALUES
('ai_provider', 'openai'),
('ai_model', 'gpt-3.5-turbo'),
('ai_base_url', 'https://api.openai.com/v1'),
('ai_api_key', ''),
('encryption_key', ''),
('theme', 'default')
ON DUPLICATE KEY UPDATE setting_key = setting_key;
