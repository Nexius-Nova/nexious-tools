import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

let dbType = 'sqlite'
let dbConfig = {
  sqlite: {
    path: './data/nexious_tools.db'
  },
  mysql: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Gmgz.513X',
    database: 'nexious_tools'
  }
}

export function getDbType() {
  return dbType
}

export function setDbType(type) {
  dbType = type
}

export function getDbConfig() {
  return dbConfig[dbType]
}

export function updateDbConfig(type, config) {
  if (dbConfig[type]) {
    dbConfig[type] = { ...dbConfig[type], ...config }
  }
}

export function getDataPath() {
  if (process.env.NODE_ENV === 'production' || process.pkg) {
    const resourcesPath = process.env.RESOURCES_PATH || process.resourcesPath || path.dirname(process.execPath)
    return path.join(resourcesPath, 'data')
  }
  return path.join(process.cwd(), 'data')
}

export function ensureDataDir() {
  const dataPath = getDataPath()
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
}
