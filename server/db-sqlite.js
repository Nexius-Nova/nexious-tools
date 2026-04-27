import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { getDataPath, ensureDataDir } from "./db-config.js";

let db = null;
let SQL = null;

function getSqlJsWasmPath() {
  const resourcesPath =
    process.env.RESOURCES_PATH || process.resourcesPath || "";

  const possiblePaths = [
    path.join(resourcesPath, "dist-server", "sql.js-dist", "sql-wasm.wasm"),
    path.join(resourcesPath, "sql.js-dist", "sql-wasm.wasm"),
    path.join(process.cwd(), "node_modules", "sql.js", "dist", "sql-wasm.wasm")
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  return undefined;
}

export async function initSqlite() {
  const wasmPath = getSqlJsWasmPath();
  SQL = await initSqlJs({
    locateFile: wasmPath ? () => wasmPath : undefined
  });

  const dataPath = getDataPath();
  ensureDataDir();
  const dbPath = path.join(dataPath, "nexious_tools.db");

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS websites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) NOT NULL,
      url VARCHAR(500),
      alias VARCHAR(100),
      favicon TEXT,
      description TEXT,
      app_path VARCHAR(500),
      type VARCHAR(20) DEFAULT 'website',
      search_url VARCHAR(500),
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS passwords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255),
      website_name VARCHAR(255),
      website_url VARCHAR(500),
      website_favicon TEXT,
      username VARCHAR(255) NOT NULL,
      password TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS code_snippets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      code TEXT NOT NULL,
      language VARCHAR(50),
      theme VARCHAR(50) DEFAULT 'vs-dark',
      category VARCHAR(100),
      tags TEXT,
      pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS snippet_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id VARCHAR(36),
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      refs TEXT,
      images TEXT,
      title VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    const columns = db.exec("PRAGMA table_info(ai_messages)");
    if (columns.length > 0) {
      const hasImagesColumn = columns[0].values.some(col => col[1] === 'images');
      if (!hasImagesColumn) {
        db.run(`ALTER TABLE ai_messages ADD COLUMN images TEXT`);
      }
    }
  } catch (err) {
    console.error('添加images列失败:', err.message);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) NOT NULL UNIQUE,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      api_key TEXT NOT NULL,
      base_url VARCHAR(500),
      model VARCHAR(100) NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 4096,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) DEFAULT 'general',
      content TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS doc_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      content_type VARCHAR(20) DEFAULT 'markdown',
      folder_id INTEGER DEFAULT NULL,
      source_url VARCHAR(500),
      tags TEXT,
      word_count INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    const stmt = db.prepare("PRAGMA table_info(code_snippets)");
    const columns = [];
    while (stmt.step()) {
      columns.push(stmt.getAsObject());
    }
    stmt.free();
    const hasPinned = columns.some((col) => col.name === "pinned");
    if (!hasPinned) {
      db.run("ALTER TABLE code_snippets ADD COLUMN pinned INTEGER DEFAULT 0");
    }
  } catch (e) {
    console.log("添加 pinned 字段时出错:", e.message);
  }

  try {
    const stmt = db.prepare("PRAGMA table_info(websites)");
    const columns = [];
    while (stmt.step()) {
      columns.push(stmt.getAsObject());
    }
    stmt.free();
    const hasSearchUrl = columns.some((col) => col.name === "search_url");
    if (!hasSearchUrl) {
      db.run("ALTER TABLE websites ADD COLUMN search_url VARCHAR(500)");
    }
    const hasSortOrder = columns.some((col) => col.name === "sort_order");
    if (!hasSortOrder) {
      db.run("ALTER TABLE websites ADD COLUMN sort_order INTEGER DEFAULT 0");
    }
  } catch (e) {
    console.log("添加 websites 字段时出错:", e.message);
  }

  try {
    const stmt = db.prepare("PRAGMA table_info(ai_messages)");
    const columns = [];
    while (stmt.step()) {
      columns.push(stmt.getAsObject());
    }
    stmt.free();
    const hasTitle = columns.some((col) => col.name === "title");
    if (!hasTitle) {
      db.run("ALTER TABLE ai_messages ADD COLUMN title VARCHAR(255)");
    }
  } catch (e) {
    console.log("添加 ai_messages title 字段时出错:", e.message);
  }

  // ========== 添加唯一性约束迁移 ==========

  // 检查并修复 websites 表约束（移除有问题的 type+url 唯一约束）
  try {
    const tableInfo = query("PRAGMA table_info(websites)");
    const websitesIndexes = query("PRAGMA index_list(websites)");
    
    const hasTypeNameConstraint = websitesIndexes.some(
      (idx) => idx.name === "idx_websites_type_name" && idx.unique === 1
    );
    const hasTypeUrlConstraint = websitesIndexes.some(
      (idx) => idx.name === "idx_websites_type_url" && idx.unique === 1
    );

    if (hasTypeUrlConstraint || !hasTypeNameConstraint) {
      db.run(`
        CREATE TABLE IF NOT EXISTS websites_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(255) NOT NULL,
          url VARCHAR(500),
          alias VARCHAR(100),
          favicon TEXT,
          description TEXT,
          app_path VARCHAR(500),
          type VARCHAR(20) DEFAULT 'website',
          search_url VARCHAR(500),
          sort_order INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_websites_type_name UNIQUE(type, name)
        )
      `);

      db.run(`
        INSERT INTO websites_new (id, name, url, alias, favicon, description, app_path, type, search_url, sort_order, created_at, updated_at)
        SELECT id, name, url, alias, favicon, description, app_path, type, search_url, sort_order, created_at, updated_at
        FROM websites 
        WHERE id IN (
          SELECT MIN(id) FROM websites GROUP BY type, name
        )
      `);

      db.run("DROP TABLE websites");
      db.run("ALTER TABLE websites_new RENAME TO websites");
      
      db.run(`CREATE INDEX IF NOT EXISTS idx_websites_type_url ON websites(type, url) WHERE url IS NOT NULL`);
    }
  } catch (e) {
    console.log("修复 websites 表约束时出错:", e.message);
  }

  // 检查并添加 passwords 表唯一约束
  try {
    const passwordsIndexes = query("PRAGMA index_list(passwords)");
    const hasUniqueConstraint = passwordsIndexes.some(
      (idx) => idx.name === "idx_passwords_unique"
    );

    if (!hasUniqueConstraint) {
      db.run(`
        CREATE TABLE IF NOT EXISTS passwords_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255),
          website_name VARCHAR(255),
          website_url VARCHAR(500),
          website_favicon TEXT,
          username VARCHAR(255) NOT NULL,
          password TEXT NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_passwords_unique UNIQUE(website_name, username)
        )
      `);

      db.run(`
        INSERT INTO passwords_new (id, title, website_name, website_url, website_favicon, username, password, notes, created_at, updated_at)
        SELECT id, title, website_name, website_url, website_favicon, username, password, notes, created_at, updated_at
        FROM passwords 
        WHERE id IN (
          SELECT MIN(id) FROM passwords GROUP BY website_name, username
        )
      `);

      db.run("DROP TABLE passwords");
      db.run("ALTER TABLE passwords_new RENAME TO passwords");
    }
  } catch (e) {
    console.log("添加 passwords 唯一约束时出错:", e.message);
  }

  // 检查并添加 code_snippets 表唯一约束
  try {
    const snippetsIndexes = query("PRAGMA index_list(code_snippets)");
    const hasUniqueConstraint = snippetsIndexes.some(
      (idx) => idx.name === "idx_snippets_category_title"
    );

    if (!hasUniqueConstraint) {
      db.run(`
        CREATE TABLE IF NOT EXISTS code_snippets_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          code TEXT NOT NULL,
          language VARCHAR(50),
          theme VARCHAR(50) DEFAULT 'vs-dark',
          category VARCHAR(100),
          tags TEXT,
          pinned INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_snippets_category_title UNIQUE(category, title)
        )
      `);

      const stmt = db.prepare("PRAGMA table_info(code_snippets)");
      const columns = [];
      while (stmt.step()) {
        columns.push(stmt.getAsObject());
      }
      stmt.free();
      const columnNames = columns.map((col) => col.name);
      const hasPinned = columnNames.includes("pinned");
      const hasTheme = columnNames.includes("theme");

      if (hasPinned && hasTheme) {
        db.run(`
          INSERT INTO code_snippets_new (id, title, description, code, language, theme, category, tags, pinned, created_at, updated_at)
          SELECT id, title, description, code, language, theme, category, tags, pinned, created_at, updated_at
          FROM code_snippets 
          WHERE id IN (
            SELECT MIN(id) FROM code_snippets GROUP BY category, title
          )
        `);
      } else if (hasTheme) {
        db.run(`
          INSERT INTO code_snippets_new (id, title, description, code, language, theme, category, tags, pinned, created_at, updated_at)
          SELECT id, title, description, code, language, theme, category, tags, 0, created_at, updated_at
          FROM code_snippets 
          WHERE id IN (
            SELECT MIN(id) FROM code_snippets GROUP BY category, title
          )
        `);
      } else if (hasPinned) {
        db.run(`
          INSERT INTO code_snippets_new (id, title, description, code, language, theme, category, tags, pinned, created_at, updated_at)
          SELECT id, title, description, code, language, 'vs-dark', category, tags, pinned, created_at, updated_at
          FROM code_snippets 
          WHERE id IN (
            SELECT MIN(id) FROM code_snippets GROUP BY category, title
          )
        `);
      } else {
        db.run(`
          INSERT INTO code_snippets_new (id, title, description, code, language, theme, category, tags, pinned, created_at, updated_at)
          SELECT id, title, description, code, language, 'vs-dark', category, tags, 0, created_at, updated_at
          FROM code_snippets 
          WHERE id IN (
            SELECT MIN(id) FROM code_snippets GROUP BY category, title
          )
        `);
      }

      db.run("DROP TABLE code_snippets");
      db.run("ALTER TABLE code_snippets_new RENAME TO code_snippets");
    }
  } catch (e) {
    console.log("添加 code_snippets 唯一约束时出错:", e.message);
  }

  // 检查并添加 documents 表唯一约束
  try {
    const documentsIndexes = query("PRAGMA index_list(documents)");
    const hasUniqueConstraint = documentsIndexes.some(
      (idx) => idx.name === "idx_documents_folder_title"
    );

    if (!hasUniqueConstraint) {
      db.run(`
        CREATE TABLE IF NOT EXISTS documents_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title VARCHAR(255) NOT NULL,
          content TEXT,
          content_type VARCHAR(20) DEFAULT 'markdown',
          folder_id INTEGER DEFAULT NULL,
          source_url VARCHAR(500),
          tags TEXT,
          word_count INTEGER DEFAULT 0,
          is_favorite INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_documents_folder_title UNIQUE(folder_id, title)
        )
      `);

      db.run(`
        INSERT INTO documents_new (id, title, content, content_type, folder_id, source_url, tags, word_count, is_favorite, created_at, updated_at)
        SELECT id, title, content, content_type, folder_id, source_url, tags, word_count, is_favorite, created_at, updated_at
        FROM documents 
        WHERE id IN (
          SELECT MIN(id) FROM documents GROUP BY folder_id, title
        )
      `);

      db.run("DROP TABLE documents");
      db.run("ALTER TABLE documents_new RENAME TO documents");
    }
  } catch (e) {
    console.log("添加 documents 唯一约束时出错:", e.message);
  }

  // 检查并添加 ai_models 表唯一约束
  try {
    const aiModelsIndexes = query("PRAGMA index_list(ai_models)");
    const hasUniqueConstraint = aiModelsIndexes.some(
      (idx) => idx.name === "idx_ai_models_name"
    );

    if (!hasUniqueConstraint) {
      db.run(`
        CREATE TABLE IF NOT EXISTS ai_models_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name VARCHAR(100) NOT NULL,
          provider VARCHAR(50) NOT NULL,
          api_key TEXT NOT NULL,
          base_url VARCHAR(500),
          model VARCHAR(100) NOT NULL,
          is_enabled INTEGER DEFAULT 1,
          is_default INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_ai_models_name UNIQUE(name)
        )
      `);

      db.run(`
        INSERT INTO ai_models_new (id, name, provider, api_key, base_url, model, is_enabled, is_default, created_at, updated_at)
        SELECT id, name, provider, api_key, base_url, model, is_enabled, is_default, created_at, updated_at
        FROM ai_models 
        WHERE id IN (
          SELECT MIN(id) FROM ai_models GROUP BY name
        )
      `);

      db.run("DROP TABLE ai_models");
      db.run("ALTER TABLE ai_models_new RENAME TO ai_models");
    }
  } catch (e) {
    console.log("添加 ai_models 唯一约束时出错:", e.message);
  }

  try {
    const stmt = db.prepare("PRAGMA table_info(ai_models)");
    const columns = [];
    while (stmt.step()) {
      columns.push(stmt.getAsObject());
    }
    stmt.free();
    const hasTemperature = columns.some((col) => col.name === "temperature");
    if (!hasTemperature) {
      db.run("ALTER TABLE ai_models ADD COLUMN temperature REAL DEFAULT 0.7");
    }
    const hasMaxTokens = columns.some((col) => col.name === "max_tokens");
    if (!hasMaxTokens) {
      db.run("ALTER TABLE ai_models ADD COLUMN max_tokens INTEGER DEFAULT 4096");
    }
  } catch (e) {
    console.log("添加 ai_models 字段时出错:", e.message);
  }

  const defaultTemplates = [
    { name: "通用助手", category: "general", content: "你是一个智能助手，可以帮助用户解答问题、提供建议和完成各种任务。请用中文回答问题，回答要简洁、准确、有帮助。", description: "适用于一般性问答和任务", is_default: 1 },
    { name: "代码专家", category: "coding", content: "你是一个资深的编程专家，精通多种编程语言和框架。请用中文回答编程相关的问题，提供清晰的代码示例和详细的解释。代码要遵循最佳实践，包含必要的注释。", description: "适用于编程问题和技术咨询", is_default: 0 },
    { name: "文档写作", category: "writing", content: "你是一个专业的文档写作助手，擅长撰写各类技术文档、教程和说明。请用中文撰写内容，确保结构清晰、语言流畅、格式规范。使用Markdown格式输出。", description: "适用于文档撰写和内容创作", is_default: 0 },
    { name: "翻译助手", category: "translation", content: "你是一个专业的翻译助手，精通中文、英文、日文等多种语言。请准确翻译用户提供的内容，保持原文的语气和风格。如无特别说明，默认翻译为中文。", description: "适用于文本翻译", is_default: 0 },
    { name: "数据分析", category: "analysis", content: "你是一个数据分析专家，擅长数据处理、统计分析和可视化。请用中文回答数据分析相关的问题，提供清晰的分析思路和具体的操作步骤。", description: "适用于数据分析和处理", is_default: 0 },
    { name: "SQL专家", category: "coding", content: "你是一个SQL数据库专家，精通各种数据库系统。请用中文回答SQL相关的问题，提供优化的SQL语句和详细的解释。注意SQL注入防护和性能优化。", description: "适用于SQL查询和数据库问题", is_default: 0 }
  ];

  for (const template of defaultTemplates) {
    const existing = queryOne("SELECT id FROM prompt_templates WHERE name = ?", [template.name]);
    if (!existing) {
      db.run("INSERT INTO prompt_templates (name, category, content, description, is_default) VALUES (?, ?, ?, ?, ?)", [
        template.name, template.category, template.content, template.description, template.is_default
      ]);
    }
  }

  const defaultSettings = [
    { key: "theme", value: "default" },
    { key: "ai_provider", value: "openai" },
    { key: "ai_model", value: "gpt-3.5-turbo" },
    { key: "auto_lock", value: "false" },
    { key: "db_type", value: "sqlite" }
  ];

  for (const setting of defaultSettings) {
    const existing = queryOne("SELECT id FROM settings WHERE key = ?", [
      setting.key
    ]);
    if (!existing) {
      db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [
        setting.key,
        setting.value
      ]);
    }
  }
  saveDatabase();
  return db;
}

export function saveDatabase() {
  if (db) {
    const dataPath = getDataPath();
    const dbPath = path.join(dataPath, "nexious_tools.db");
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

export function getSqliteDb() {
  return db;
}

export function closeSqlite() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

export function query(sql, params = []) {
  if (!db) throw new Error("数据库未初始化");
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(row);
  }
  stmt.free();
  return results;
}

export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function run(sql, params = []) {
  if (!db) throw new Error("数据库未初始化");
  db.run(sql, params);
  saveDatabase();
  return { lastInsertRowid: getLastInsertRowId() };
}

export function getLastInsertRowId() {
  const result = queryOne("SELECT last_insert_rowid() as id");
  return result ? result.id : null;
}
