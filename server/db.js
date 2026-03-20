import { getDbType } from './db-config.js'
import { initSqlite, query as sqliteQuery, queryOne as sqliteQueryOne, run as sqliteRun, closeSqlite } from './db-sqlite.js'

let dbInitialized = false
export async function initDb() {
  if (dbInitialized) return
  
  const dbType = getDbType()
  
  if (dbType === 'sqlite') {
    await initSqlite()
  } else {
  }
  
  dbInitialized = true
}

export async function query(sql, params = []) {
  const dbType = getDbType()
  if (dbType === 'sqlite') {
    return sqliteQuery(sql, params)
  }
}

export async function queryOne(sql, params = []) {
  const dbType = getDbType()
  if (dbType === 'sqlite') {
    return sqliteQueryOne(sql, params)
  }
}

export async function execute(sql, params = []) {
  const dbType = getDbType()
  if (dbType === 'sqlite') {
    return sqliteRun(sql, params)
  }
}

export async function insert(table, data) {
  const dbType = getDbType()
  if (dbType === 'sqlite') {
    const columns = Object.keys(data)
    const placeholders = columns.map(() => '?').join(', ')
    const result = sqliteRun(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, Object.values(data))
    return {
      id: result.lastInsertRowid,
      ...data
    }
  }
}

export async function update(table, id, data) {
  const dbType = getDbType()
  const filteredData = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      filteredData[key] = value
    }
  }
  if (dbType === 'sqlite') {
    const columns = Object.keys(filteredData)
    if (columns.length === 0) return
    const setClause = columns.map(col => `${col} = ?`).join(', ')
    sqliteRun(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...Object.values(filteredData), id])
    return
  }
}

export async function remove(table, id) {
  const dbType = getDbType()
  if (dbType === 'sqlite') {
    sqliteRun(`DELETE FROM ${table} WHERE id = ?`, [id])
    return
  }
}

export function closeDb() {
  const dbType = getDbType()
  if (dbType === 'sqlite') {
    closeSqlite()
  }
  dbInitialized = false
}
