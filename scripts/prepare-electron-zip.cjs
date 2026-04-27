const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const rootDir = path.resolve(__dirname, '..')
const electronPkgPath = path.join(rootDir, 'node_modules', 'electron', 'package.json')
const electronDistDir = path.join(rootDir, 'node_modules', 'electron', 'dist')
const zipOutputDir = path.join(rootDir, '.electron-zips')

if (!fs.existsSync(electronPkgPath)) {
  throw new Error('未找到本地 electron 依赖，无法准备离线打包资源')
}

if (!fs.existsSync(electronDistDir)) {
  throw new Error('未找到 node_modules/electron/dist，无法准备离线打包资源')
}

const electronPkg = JSON.parse(fs.readFileSync(electronPkgPath, 'utf8'))
const electronVersion = electronPkg.version
const zipName = `electron-v${electronVersion}-win32-x64.zip`
const zipPath = path.join(zipOutputDir, zipName)

fs.mkdirSync(zipOutputDir, { recursive: true })

if (fs.existsSync(zipPath)) {
  console.log(`Electron zip already exists: ${zipPath}`)
  process.exit(0)
}

const sourcePattern = path.join(electronDistDir, '*')
const command = `Compress-Archive -Path "${sourcePattern}" -DestinationPath "${zipPath}" -Force`
const result = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', command], {
  cwd: rootDir,
  stdio: 'inherit'
})

if (result.status !== 0) {
  throw new Error(`创建 Electron 离线 zip 失败，退出码: ${result.status}`)
}

console.log(`Electron offline zip prepared: ${zipPath}`)
