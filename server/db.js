import { initSqlite, query as sqliteQuery, queryOne as sqliteQueryOne, run as sqliteRun, closeSqlite } from './db-sqlite.js'

let dbInitialized = false

export async function initDb() {
  if (dbInitialized) return
  await initSqlite()
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
  await sqliteRun(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...Object.values(filteredData), id])
}

export async function remove(table, id) {
  await sqliteRun(`DELETE FROM ${table} WHERE id = ?`, [id])
}

export function closeDb() {
  closeSqlite()
  dbInitialized = false
}
