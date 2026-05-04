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

export function getSqliteDb() {
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
  try {
    let lastId = null;
    
    if (params && params.length > 0) {
      const stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
      stmt.free();
    } else {
      db.run(sql);
    }
    
    const result = queryOne("SELECT last_insert_rowid() as id");
    lastId = result ? result.id : null;
    
    saveDatabase();
    
    return { lastInsertRowid: lastId, changes: 1 };
  } catch (e) {
    console.error("SQL执行错误:", e.message, sql);
    throw e;
  }
}

export function getLastInsertRowId() {
  const result = queryOne("SELECT last_insert_rowid() as id");
  return result ? result.id : null;
}

function getDbVersion() {
  try {
    const result = queryOne("SELECT value FROM db_version WHERE id = 1");
    return result ? parseInt(result.value, 10) : 0;
  } catch (e) {
    return 0;
  }
}

function setDbVersion(version) {
  db.run(`
    CREATE TABLE IF NOT EXISTS db_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      value TEXT NOT NULL
    )
  `);
  
  const existing = queryOne("SELECT id FROM db_version WHERE id = 1");
  if (existing) {
    db.run("UPDATE db_version SET value = ? WHERE id = 1", [String(version)]);
  } else {
    db.run("INSERT INTO db_version (id, value) VALUES (1, ?)", [String(version)]);
  }
  saveDatabase();
}

const migrations = [
  {
    version: 1,
    name: "createInitialTables",
    up: () => {
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_websites_type_name UNIQUE(type, name)
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_passwords_unique UNIQUE(website_name, username)
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_snippets_category_title UNIQUE(category, title)
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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_ai_models_name UNIQUE(name)
        )
      `);

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
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT idx_documents_folder_title UNIQUE(folder_id, title)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_websites_type_url ON websites(type, url) WHERE url IS NOT NULL`);
    }
  },
  {
    version: 2,
    name: "addDefaultData",
    up: () => {
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
        const existing = queryOne("SELECT id FROM settings WHERE key = ?", [setting.key]);
        if (!existing) {
          db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [setting.key, setting.value]);
        }
      }
    }
  }
];

async function runMigrations() {
  const currentVersion = getDbVersion();

  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      try {
        migration.up();
        setDbVersion(migration.version);
      } catch (error) {
        console.error(`迁移 v${migration.version} 失败:`, error);
        throw error;
      }
    }
  }
}

export async function initSqlite() {
  const wasmPath = getSqlJsWasmPath();
  const initSqlJs = (await import("sql.js")).default;
  
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

  await runMigrations();
  
  return db;
}
