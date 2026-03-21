import fs from 'fs'
import path from 'path'

let dbType = 'sqlite'
let dbConfig = {
  sqlite: {
    path: './data/nexious_tools.db'
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
  if (process.env.NODE_ENV === 'production' || process.pkg || process.env.RESOURCES_PATH) {
    const resourcesPath = process.env.RESOURCES_PATH || process.resourcesPath || path.dirname(process.execPath)
    const dataPath = path.join(resourcesPath, 'data')
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true })
    }
    return dataPath
  }
  return path.join(process.cwd(), 'data')
}

export function ensureDataDir() {
  const dataPath = getDataPath()
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }
}
