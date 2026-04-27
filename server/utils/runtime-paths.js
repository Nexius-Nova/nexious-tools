import path from 'path'

export function getRuntimeBasePath(currentDir) {
  return process.env.RESOURCES_PATH || currentDir
}

export function getUploadsPath(currentDir) {
  if (process.env.APP_DATA_DIR) {
    return path.join(process.env.APP_DATA_DIR, 'uploads')
  }

  const runtimeBasePath = getRuntimeBasePath(currentDir)
  return path.join(runtimeBasePath, 'uploads')
}
