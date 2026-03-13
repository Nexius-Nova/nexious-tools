import { getSqliteDb } from './db-sqlite.js'

class SqliteAdapter {
  constructor() {
    this.db = getSqliteDb()
  }

  async query(sql, params = []) {
    const stmt = this.db.prepare(sql)
    if (params.length > 0) {
      return stmt.all(...params)
    }
    return stmt.all()
  }

  async queryOne(sql, params = []) {
    const stmt = this.db.prepare(sql)
    if (params.length > 0) {
      return stmt.get(...params)
    }
    return stmt.get()
  }

  async execute(sql, params = []) {
    const stmt = this.db.prepare(sql)
    if (params.length > 0) {
      return stmt.run(...params)
    }
    return stmt.run()
  }

  async insert(table, data) {
    const columns = Object.keys(data)
    const placeholders = columns.map(() => '?').join(', ')
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
    
    const stmt = this.db.prepare(sql)
    const values = Object.values(data)
    stmt.run(...values)
    
    return { lastInsertRowid: this.db.prepare('SELECT last_insert_rowid()').get() }
  }

  async update(table, id, data) {
    const columns = Object.keys(data)
    const setClause = columns.map(col => `${col} = ?`).join(', ')
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`
    
    const stmt = this.db.prepare(sql)
    const values = [...Object.values(data), id]
    stmt.run(...values)
    
    return { changes: stmt.run(...values).changes }
  }

  async delete(table, id) {
    const sql = `DELETE FROM ${table} WHERE id = ?`
    const stmt = this.db.prepare(sql)
    stmt.run(id)
    return { changes: stmt.run(id).changes }
  }

  async getAll(table) {
    const sql = `SELECT * FROM ${table} ORDER BY id DESC`
    return this.db.prepare(sql).all()
  }

  async getById(table, id) {
    const sql = `SELECT * FROM ${table} WHERE id = ?`
    return this.db.prepare(sql).get(id)
  }
}

export default SqliteAdapter
