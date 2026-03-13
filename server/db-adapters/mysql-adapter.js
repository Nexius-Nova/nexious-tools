import mysql from 'mysql2/promise'

let pool = null

export function initMySQL(config) {
  pool = mysql.createPool({
    host: config.host || 'localhost',
    user: config.user || 'root',
    password: config.password || '',
    database: config.database || 'nexious_tools',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  })

  return new Promise((resolve, reject) => {
    pool.getConnection()
      .then(conn => {
        console.log('✅ MySQL 数据库连接成功')
        conn.release()
        resolve()
      })
      .catch(err => {
        console.error('❌ MySQL 数据库连接失败:', err.message)
        reject(err)
      })
  })
}

export function getMySQLDb() {
  return pool
}

export function closeMySQL() {
  if (pool) {
    pool.end()
    pool = null
  }
}

export async function mysqlQuery(sql, params = []) {
  if (!pool) {
    throw new Error('MySQL 连接池未初始化')
  }
  const [rows] = await pool.execute(sql, params)
  return rows
}

export async function mysqlQueryOne(sql, params = []) {
  if (!pool) {
    throw new Error('MySQL 连接池未初始化')
  }
  const [rows] = await pool.execute(sql, params)
  return rows[0] || null
}

export async function mysqlInsert(table, data) {
  const columns = Object.keys(data)
  const placeholders = columns.map(() => '?').join(', ')
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`
  
  const [result] = await pool.execute(sql, params)
  return {
    insertId: result.insertId,
    ...data
  }
}

export async function mysqlUpdate(table, id, data) {
  const columns = Object.keys(data)
  const setClause = columns.map(col => `${col} = ?`).join(', ')
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`
  const values = [...Object.values(data), id]
  await pool.execute(sql, values)
}

export async function mysqlDelete(table, id) {
  await pool.execute(`DELETE FROM ${table} WHERE id = ?`, [id])
}
