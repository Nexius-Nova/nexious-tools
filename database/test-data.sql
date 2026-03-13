USE nexious_tools;

-- 插入网站测试数据
INSERT INTO websites (name, url, alias, favicon, description, type) VALUES
('GitHub', 'https://github.com', 'gh', 'https://github.com/favicon.ico', '全球最大的代码托管平台，开发者社区', 'website'),
('Google', 'https://www.google.com', 'gg', 'https://www.google.com/favicon.ico', '全球最大的搜索引擎', 'website'),
('Stack Overflow', 'https://stackoverflow.com', 'so', 'https://stackoverflow.com/favicon.ico', '程序员问答社区', 'website'),
('掘金', 'https://juejin.cn', 'jj', 'https://juejin.cn/favicon.ico', '中文技术社区，分享技术文章', 'website'),
('Vue.js', 'https://vuejs.org', 'vue', 'https://vuejs.org/logo.svg', '渐进式JavaScript框架', 'website'),
('MDN Web Docs', 'https://developer.mozilla.org', 'mdn', 'https://developer.mozilla.org/favicon.ico', 'Web开发文档和教程', 'website'),
('ChatGPT', 'https://chat.openai.com', 'ai', 'https://chat.openai.com/favicon.ico', 'OpenAI开发的AI对话助手', 'website'),
('Figma', 'https://www.figma.com', 'figma', 'https://www.figma.com/favicon.ico', '在线协作设计工具', 'website'),
('Visual Studio Code', NULL, 'vscode', NULL, '微软开发的代码编辑器', 'app'),
('Google Chrome', NULL, 'chrome', NULL, '谷歌浏览器', 'app');

-- 插入密码测试数据
INSERT INTO passwords (title, website_id, username, password, website_url, notes) VALUES
('GitHub账号', 1, 'developer@example.com', 'U2FsdGVkX1+test123github', 'https://github.com/login', '个人开发账号'),
('Google账号', 2, 'user@gmail.com', 'U2FsdGVkX1+test456google', 'https://accounts.google.com', '主邮箱账号'),
('掘金账号', 4, '13800138000', 'U2FsdGVkX1+test789juejin', 'https://juejin.cn/login', '手机号登录');

-- 插入代码片段分类
INSERT INTO snippet_categories (name) VALUES
('工具函数'),
('性能优化'),
('数据结构'),
('日期处理'),
('CSS布局'),
('数据库');

-- 插入代码片段测试数据
INSERT INTO code_snippets (title, language, category, description, code, tags) VALUES
('防抖函数', 'javascript', '工具函数', '防止函数频繁调用，优化性能', 
'function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}', '["工具函数", "性能优化"]'),

('节流函数', 'javascript', '工具函数', '限制函数调用频率',
'function throttle(fn, delay = 300) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}', '["工具函数", "性能优化"]'),

('深拷贝', 'javascript', '数据结构', '递归实现对象的深拷贝',
'function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  const clone = Array.isArray(obj) ? [] : {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  return clone;
}', '["工具函数", "数据结构"]'),

('格式化日期', 'javascript', '日期处理', '将日期格式化为指定字符串',
'function formatDate(date, pattern = "YYYY-MM-DD HH:mm:ss") {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  
  return pattern
    .replace("YYYY", year)
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hours)
    .replace("mm", minutes)
    .replace("ss", seconds);
}', '["日期处理", "格式化"]'),

('Python列表推导式', 'python', '数据结构', 'Python列表推导式示例',
'# 基本语法
squares = [x**2 for x in range(10)]

# 带条件过滤
evens = [x for x in range(20) if x % 2 == 0]

# 嵌套推导
matrix = [[i*j for j in range(5)] for i in range(5)]', '["Python", "列表", "推导式"]'),

('SQL查询优化', 'sql', '数据库', '常用SQL查询优化技巧',
'-- 使用索引
CREATE INDEX idx_user_email ON users(email);

-- 避免SELECT *
SELECT id, name, email FROM users WHERE status = 1;

-- 使用EXPLAIN分析
EXPLAIN SELECT * FROM orders WHERE user_id = 100;

-- 分页优化
SELECT * FROM orders 
WHERE id > 1000 
ORDER BY id 
LIMIT 20;', '["SQL", "优化", "数据库"]'),

('CSS Flex布局', 'css', 'CSS布局', 'Flex布局常用属性',
'.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.item {
  flex: 1;
  min-width: 200px;
}

/* 居中 */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}', '["CSS", "Flex", "布局"]'),

('CSS Grid布局', 'css', 'CSS布局', 'Grid布局常用属性',
'.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 20px;
}

.grid-item {
  grid-column: span 2;
}

/* 响应式 */
@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
  }
}', '["CSS", "Grid", "布局"]');
