import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { getDataPath, ensureDataDir } from './db-config.js'

let db = null
let SQL = null

export async function initSqlite() {
  SQL = await initSqlJs()
  
  const dataPath = getDataPath()
  ensureDataDir()
  const dbPath = path.join(dataPath, 'nexious_tools.db')
  
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
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
  `)
  
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
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS snippet_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id VARCHAR(36),
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      refs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key VARCHAR(100) NOT NULL UNIQUE,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  try {
    const stmt = db.prepare("PRAGMA table_info(code_snippets)")
    const columns = []
    while (stmt.step()) {
      columns.push(stmt.getAsObject())
    }
    stmt.free()
    const hasPinned = columns.some(col => col.name === 'pinned')
    if (!hasPinned) {
      db.run('ALTER TABLE code_snippets ADD COLUMN pinned INTEGER DEFAULT 0')
      console.log('✅ 已添加 pinned 字段到 code_snippets 表')
    }
  } catch (e) {
    console.log('添加 pinned 字段时出错:', e.message)
  }
  
  try {
    const stmt = db.prepare("PRAGMA table_info(websites)")
    const columns = []
    while (stmt.step()) {
      columns.push(stmt.getAsObject())
    }
    stmt.free()
    const hasSearchUrl = columns.some(col => col.name === 'search_url')
    if (!hasSearchUrl) {
      db.run('ALTER TABLE websites ADD COLUMN search_url VARCHAR(500)')
      console.log('✅ 已添加 search_url 字段到 websites 表')
    }
  } catch (e) {
    console.log('添加 search_url 字段时出错:', e.message)
  }
  
  const defaultSettings = [
    { key: 'theme', value: 'default' },
    { key: 'ai_provider', value: 'openai' },
    { key: 'ai_model', value: 'gpt-3.5-turbo' },
    { key: 'auto_lock', value: 'false' },
    { key: 'db_type', value: 'sqlite' }
  ]
  
  for (const setting of defaultSettings) {
    const existing = queryOne('SELECT id FROM settings WHERE key = ?', [setting.key])
    if (!existing) {
      db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [setting.key, setting.value])
    }
  }
  
  saveDatabase()
  
  console.log('✅ SQLite 数据库初始化完成:', dbPath)
  
  return db
}

export function saveDatabase() {
  if (db) {
    const dataPath = getDataPath()
    const dbPath = path.join(dataPath, 'nexious_tools.db')
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

export function getSqliteDb() {
  return db
}

export function closeSqlite() {
  if (db) {
    saveDatabase()
    db.close()
    db = null
  }
}

export function query(sql, params = []) {
  if (!db) throw new Error('数据库未初始化')
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row)
  }
  stmt.free()
  return results
}

export function queryOne(sql, params = []) {
  const results = query(sql, params)
  return results.length > 0 ? results[0] : null
}

export function run(sql, params = []) {
  if (!db) throw new Error('数据库未初始化')
  db.run(sql, params)
  saveDatabase()
  return { lastInsertRowid: getLastInsertRowId() }
}

export function getLastInsertRowId() {
  const result = queryOne('SELECT last_insert_rowid() as id')
  return result ? result.id : null
}
