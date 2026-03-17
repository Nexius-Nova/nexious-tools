import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

import { initSqlite, query as sqliteQuery, queryOne as sqliteQueryOne, run as sqliteRun, closeSqlite } from './db-sqlite.js'

let dbInitialized = false

let dbPath = null

let dataDir = null

let isDev = null

let dbName = null

let db = null

let dbConfig = null

export function getDataDir() {
  if (!dataDir) {
    const appPath = process.env.APPPath || process.cwd
    const resourcesPath = process.resourcesPath || path.join(process.cwd, 'resources')
    dataDir = resourcesPath
    dbName = path.join(dataDir, 'nexious_tools.db')
  }
  return dataDir
}

export function getDbPath() {
  return dbPath
}

export function getDbName() {
  return dbName
}

export function getDbType() {
  return 'sqlite'
}

export function getDbConfig() {
  return dbConfig
}

export async function initDb() {
  if (dbInitialized) return
  
  if (!dbPath) {
    dbPath = path.join(getDataDir(), 'nexious_tools.db')
    db = await initSqlite(dbPath)
  }
  
  dbInitialized = true
}

export async function query(sql, params = []) {
  return sqliteQuery(sql, params)
}

export async function queryOne(sql, params = []) {
  return sqliteQueryOne(sql, params)
}

export async function execute(sql, params = []) {
  return sqliteRun(sql, params)
}

export async function insert(table, data) {
  const columns = Object.keys(data)
  const placeholders = columns.map(() => '?').join(', ')
  const result = await sqliteRun(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(data))
  return {
    id: result.lastInsertRowid,
    ...data
  }
}

export async function update(table, id, data) {
  const filteredData = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      filteredData[key] = value
    }
  }
  const columns = Object.keys(filteredData)
  if (columns.length === 0) return
  const setClause = columns.map(col => `${col} = ?`).join(', ')
  await sqliteRun(`UPDATE ${table} set ${setClause} where id = ?`, [...Object.values(filteredData), id])
}

export async function remove(table, id) {
  await sqliteRun(`DELETE from ${table} where id = ?`, [id])
}

export function closeDb() {
  closeSqlite()
  dbInitialized = false
}
