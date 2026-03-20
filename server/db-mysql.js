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
  
  return pool.getConnection()
    .then(conn => {
      console.log('✅ MySQL 数据库连接成功')
      conn.release()
      return pool
    })
    .catch(err => {
      console.error('❌ MySQL 数据库连接失败:', err.message)
      throw err
    })
}

export function getMySQLPool() {
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

export async function mysqlExecute(sql, params = []) {
  if (!pool) {
    throw new Error('MySQL 连接池未初始化')
  }
  const [result] = await pool.execute(sql, params)
  return result
}
