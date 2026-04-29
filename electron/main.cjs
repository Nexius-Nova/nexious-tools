const { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut, screen } = require("electron")
const path = require("path")
const { spawn, exec } = require("child_process")
const fs = require("fs")
const os = require("os")

const DEFAULT_GLOBAL_SHORTCUT = "CommandOrControl+Shift+Space"
const SETTINGS_API_URL = "http://localhost:3000/api/settings/global_shortcut"
const SETTINGS_FETCH_RETRY_COUNT = 10
const SETTINGS_FETCH_RETRY_DELAY = 500

const UNINSTALLER_KEYWORDS = [
  'uninstall', 'uninstaller', 'unins', 'remove', 'remover',
  '卸载', '卸载程序', '卸载工具', '移除', '删除程序'
]

const UNINSTALLER_PATH_PATTERNS = [
  /unins\d{3}\.exe$/i,
  /uninstall\.exe$/i,
  /uninst\.exe$/i,
  /unins\d*\.exe$/i
]

function isUninstaller(app) {
  if (!app || !app.name) return false
  
  const appName = app.name.toLowerCase()
  const appPath = (app.path || '').toLowerCase()
  const exeName = path.basename(appPath)
  
  for (const keyword of UNINSTALLER_KEYWORDS) {
    if (appName.includes(keyword.toLowerCase())) {
      return true
    }
  }
  
  for (const pattern of UNINSTALLER_PATH_PATTERNS) {
    if (pattern.test(exeName)) {
      return true
    }
  }
  
  if (appPath.includes('uninstall') || appPath.includes('unins')) {
    const pathParts = appPath.split(/[/\\]/)
    const secondLastPart = pathParts.length > 1 ? pathParts[pathParts.length - 2] : ''
    if (secondLastPart.includes('uninstall') || secondLastPart.includes('unins')) {
      return true
    }
  }
  
  return false
}

let iconExtractor
try {
  let iconExtractorPath
  if (app.isPackaged) {
    iconExtractorPath = path.join(process.resourcesPath, 'icon-extractor')
  } else {
    iconExtractorPath = 'icon-extractor'
  }
  iconExtractor = require(iconExtractorPath)
} catch (e) {
  console.error('Failed to load icon-extractor:', e.message)
  iconExtractor = null
}

let mainWindow
let serverProcess
let currentShortcut = DEFAULT_GLOBAL_SHORTCUT
const appScanCache = {
  expiresAt: 0,
  apps: []
}
const iconCache = new Map()
const APP_SCAN_CACHE_TTL = 5 * 60 * 1000
const ICON_BATCH_SIZE = 30

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toggleMainWindowVisibility() {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
    mainWindow.focus()
    mainWindow.webContents.send("window-restored")
    return
  }

  if (mainWindow.isVisible()) {
    mainWindow.minimize()
    return
  }

  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send("window-restored")
}

function createWindow() {
  mainWindow = new BrowserWindow({
    height: 60,
    width: 600,
    frame: false,
    useContentSize: true,
    resizable: false,
    icon: path.join(__dirname, "assets/logo.svg"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    }
  })

  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })

  mainWindow.on("blur", () => {
    const bounds = mainWindow.getBounds()
    if (bounds.width < 900) {
      mainWindow?.minimize()
    }
  })
  
  mainWindow.once("ready-to-show", () => {
    registerGlobalShortcut(currentShortcut)
  })
}

function registerGlobalShortcut(accelerator) {
  if (!accelerator) {
    return false
  }

  const nextShortcut = accelerator.trim()
  const previousShortcut = currentShortcut
  const hadPreviousShortcut =
    Boolean(previousShortcut) && globalShortcut.isRegistered(previousShortcut)

  try {
    if (hadPreviousShortcut && previousShortcut === nextShortcut) {
      currentShortcut = nextShortcut
      return true
    }

    if (hadPreviousShortcut) {
      globalShortcut.unregister(previousShortcut)
    }

    const result = globalShortcut.register(nextShortcut, toggleMainWindowVisibility)

    if (result) {
      currentShortcut = nextShortcut
      return true
    }

    if (hadPreviousShortcut) {
      globalShortcut.register(previousShortcut, toggleMainWindowVisibility)
    }
    return false
  } catch (e) {
    if (
      hadPreviousShortcut &&
      previousShortcut !== nextShortcut &&
      !globalShortcut.isRegistered(previousShortcut)
    ) {
      try {
        globalShortcut.register(previousShortcut, toggleMainWindowVisibility)
      } catch (restoreError) {
        console.error("恢复旧快捷键失败:", restoreError)
      }
    }
    console.error("注册快捷键失败:", e)
    return false
  }
}

async function loadSavedGlobalShortcut() {
  for (let attempt = 0; attempt < SETTINGS_FETCH_RETRY_COUNT; attempt += 1) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 2000)
      const response = await fetch(SETTINGS_API_URL, {
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = await response.json()
      const savedShortcut = payload?.data

      if (!savedShortcut || savedShortcut === currentShortcut) {
        return
      }

      const result = registerGlobalShortcut(savedShortcut)
      if (!result) {
        console.error("已保存的快捷键注册失败，保留当前快捷键:", savedShortcut)
      }
      return
    } catch (error) {
      if (attempt === SETTINGS_FETCH_RETRY_COUNT - 1) {
        console.error("加载已保存快捷键失败:", error.message)
        return
      }
      await delay(SETTINGS_FETCH_RETRY_DELAY)
    }
  }
}

function startServer() {
  if (!app.isPackaged) {
    return
  }
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "dist-server/server.cjs")
    : path.join(__dirname, "../server/index.js")

  const nodePath = process.execPath
  
  serverProcess = spawn(nodePath, [serverPath], {
    stdio: "pipe",
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: app.isPackaged ? "production" : "development",
      RESOURCES_PATH: app.isPackaged ? process.resourcesPath : path.join(__dirname, ".."),
      APP_DATA_DIR: app.getPath("userData"),
      ELECTRON_RUN_AS_NODE: "1"
    }
  })
  
  serverProcess.stdout.on('data', (data) => {
    console.log(`[Server] ${data}`)
  })
  serverProcess.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data}`)
  })
}

app.whenReady().then(() => {
  startServer()
  createWindow()
  loadSavedGlobalShortcut()
  
  app.focus()
})

app.on("browser-window-focus", () => {
  if (!globalShortcut.isRegistered(currentShortcut)) {
    registerGlobalShortcut(currentShortcut)
  }
})

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill()
  }
  globalShortcut.unregisterAll()
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on("window-minimize", () => {
  mainWindow?.minimize()
})

ipcMain.on("window-maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on("window-close", () => {
  mainWindow?.close()
})

ipcMain.on("open-external", (event, url) => {
  shell.openExternal(url)
})

ipcMain.on("expand-window", () => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(false)
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(900, 600)
    mainWindow.setMaximumSize(9999, 9999)
    mainWindow.setSize(1200, 800)
    mainWindow.center()
  }
})

ipcMain.on("shrink-window", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    }
    mainWindow.setAlwaysOnTop(true)
    mainWindow.setResizable(false)
    mainWindow.setMinimumSize(600, 60)
    mainWindow.setMaximumSize(600, 700)
    mainWindow.setSize(600, 60)
    mainWindow.center()
  }
})

ipcMain.on("resize-search-window", (event, height) => {
  if (mainWindow) {
    const newHeight = Math.min(Math.max(height, 60), 700)
    mainWindow.setContentSize(600, newHeight)
  }
})

ipcMain.on("open-app", (event, appPath) => {
  if (appPath && fs.existsSync(appPath)) {
    shell.openPath(appPath)
  } else {
    shell.openExternal(appPath)
  }
})

ipcMain.handle("select-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Applications", extensions: ["exe", "app", "lnk"] },
      { name: "All Files", extensions: ["*"] }
    ]
  })
  return result.filePaths[0] || null
})

ipcMain.handle("get-exe-icon", async (event, iconPath) => {
  try {
    if (!iconPath) {
      return null
    }
    
    if (process.platform !== "win32") {
      return null
    }
    
    const iconBase64 = await getCachedIcon(iconPath)
    return iconBase64
  } catch (error) {
    console.error("提取图标失败:", error)
    return null
  }
})

ipcMain.handle("get-app-icons", async (event, appPaths = []) => {
  try {
    if (process.platform !== "win32" || !Array.isArray(appPaths) || appPaths.length === 0) {
      return {}
    }

    const uniquePaths = [...new Set(appPaths.filter(Boolean))]
    const icons = await mapWithConcurrency(uniquePaths, ICON_BATCH_SIZE, async (appPath) => {
      const icon = await getCachedIcon(appPath)
      return [appPath, icon || ""]
    })

    return Object.fromEntries(icons)
  } catch (error) {
    console.error("鎵归噺鎻愬彇鍥炬爣澶辫触:", error)
    return {}
  }
})

async function extractIcon(iconPath) {
  return new Promise((resolve) => {
    if (!iconPath || typeof iconPath !== "string") {
      resolve(null)
      return
    }
    
    let cleanPath = iconPath.trim()
    if (cleanPath.includes(",")) {
      cleanPath = cleanPath.split(",")[0].trim()
    }
    cleanPath = cleanPath.replace(/^["']|["']$/g, "")
    
    if (!cleanPath || !fs.existsSync(cleanPath)) {
      resolve(null)
      return
    }
    
    const ext = path.extname(cleanPath).toLowerCase()
    
    if (ext === ".ico" || ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".bmp") {
      try {
        const imageBuffer = fs.readFileSync(cleanPath)
        const base64 = `data:image/${ext === ".jpg" ? "jpeg" : ext.slice(1)};base64,${imageBuffer.toString("base64")}`
        resolve(base64)
        return
      } catch (e) {
        resolve(null)
        return
      }
    }
    
    const tempDir = os.tmpdir()
    const iconName = `icon_${Date.now()}_${Math.random().toString(36).slice(2)}.png`
    const tempIconPath = path.join(tempDir, iconName)
    
    const psScript = `
      Add-Type -AssemblyName System.Drawing
      try {
        $icon = [System.Drawing.Icon]::ExtractAssociatedIcon("${cleanPath.replace(/\\/g, "\\\\")}")
        if ($icon) {
          $bitmap = $icon.ToBitmap()
          $bitmap.Save("${tempIconPath.replace(/\\/g, "\\\\")}", [System.Drawing.Imaging.ImageFormat]::Png)
          $icon.Dispose()
          $bitmap.Dispose()
          Write-Output "success"
        }
      } catch {
        Write-Output "error"
      }
    `
    
    const child = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
      stdio: "pipe",
      windowsHide: true
    })
    
    let output = ""
    child.stdout.on("data", (data) => {
      output += data.toString()
    })
    
    const timeout = setTimeout(() => {
      child.kill()
      resolve(null)
    }, 2000)
    
    child.on("close", (code) => {
      clearTimeout(timeout)
      if (output.includes("success") && fs.existsSync(tempIconPath)) {
        try {
          const imageBuffer = fs.readFileSync(tempIconPath)
          const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`
          fs.unlinkSync(tempIconPath)
          resolve(base64)
        } catch (e) {
          resolve(null)
        }
      } else {
        resolve(null)
      }
    })
    
    child.on("error", () => {
      clearTimeout(timeout)
      resolve(null)
    })
  })
}

async function getCachedIcon(iconPath) {
  if (!iconPath || typeof iconPath !== "string") {
    return null
  }

  let cleanPath = iconPath.trim()
  if (cleanPath.includes(",")) {
    cleanPath = cleanPath.split(",")[0].trim()
  }
  cleanPath = cleanPath.replace(/^["']|["']$/g, "")

  if (!cleanPath) {
    return null
  }

  if (iconCache.has(cleanPath)) {
    return iconCache.get(cleanPath)
  }

  const iconBase64 = await extractIconWithExtractor(cleanPath) || await extractIcon(cleanPath) || null
  iconCache.set(cleanPath, iconBase64)
  return iconBase64
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let currentIndex = 0

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++
      results[index] = await mapper(items[index], index)
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

async function extractIconsBatch(apps) {
  const appsWithIcons = []
  const iconCache = new Map()
  
  for (const app of apps) {
    let iconBase64 = ""
    
    if (app.iconPath) {
      if (iconCache.has(app.iconPath)) {
        iconBase64 = iconCache.get(app.iconPath)
      } else {
        iconBase64 = await extractIcon(app.iconPath)
        if (iconBase64) {
          iconCache.set(app.iconPath, iconBase64)
        }
      }
    }
    
    if (!iconBase64 && app.path) {
      const exePath = app.path.endsWith(".exe") ? app.path : null
      if (exePath && fs.existsSync(exePath)) {
        if (iconCache.has(exePath)) {
          iconBase64 = iconCache.get(exePath)
        } else {
          iconBase64 = await extractIcon(exePath)
          if (iconBase64) {
            iconCache.set(exePath, iconBase64)
          }
        }
      }
    }
    
    appsWithIcons.push({
      ...app,
      icon: iconBase64 || app.icon || ""
    })
  }
  
  return appsWithIcons
}

function extractIconWithExtractor(iconPath) {
  return new Promise((resolve) => {
    if (!iconExtractor) {
      resolve(null)
      return
    }
    
    if (!iconPath || typeof iconPath !== "string") {
      resolve(null)
      return
    }
    
    let cleanPath = iconPath.trim()
    if (cleanPath.includes(",")) {
      cleanPath = cleanPath.split(",")[0].trim()
    }
    cleanPath = cleanPath.replace(/^["']|["']$/g, "")
    
    if (!cleanPath || !fs.existsSync(cleanPath)) {
      resolve(null)
      return
    }
    
    const timeout = setTimeout(() => {
      iconExtractor.emitter.removeListener("icon", handler)
      iconExtractor.emitter.removeListener("error", errorHandler)
      resolve(null)
    }, 1000)
    
    const handler = (data) => {
      if (data.Context === cleanPath) {
        clearTimeout(timeout)
        iconExtractor.emitter.removeListener("icon", handler)
        iconExtractor.emitter.removeListener("error", errorHandler)
        if (data.Base64ImageData) {
          resolve(`data:image/png;base64,${data.Base64ImageData}`)
        } else {
          resolve(null)
        }
      }
    }
    
    const errorHandler = (err) => {
      clearTimeout(timeout)
      iconExtractor.emitter.removeListener("icon", handler)
      iconExtractor.emitter.removeListener("error", errorHandler)
      resolve(null)
    }
    
    iconExtractor.emitter.on("icon", handler)
    iconExtractor.emitter.on("error", errorHandler)
    iconExtractor.getIcon(cleanPath, cleanPath)
  })
}

ipcMain.handle("auto-import-apps", async () => {
  const now = Date.now()
  if (appScanCache.expiresAt > now && appScanCache.apps.length > 0) {
    return appScanCache.apps
  }

  const apps = []
  const seenPaths = new Set()
  const seenNames = new Set()
  
  if (process.platform === "win32") {
    const [desktopApps, startMenuApps, registryApps] = await Promise.all([
      getDesktopShortcuts(),
      getStartMenuShortcuts(),
      getRegistryApps()
    ])

    for (const app of desktopApps) {
      const normalPath = app.path.toLowerCase()
      if (!seenPaths.has(normalPath) && !seenNames.has(app.name.toLowerCase())) {
        seenPaths.add(normalPath)
        seenNames.add(app.name.toLowerCase())
        apps.push({ ...app, source: "desktop" })
      }
    }

    for (const app of startMenuApps) {
      const normalPath = app.path.toLowerCase()
      if (!seenPaths.has(normalPath) && !seenNames.has(app.name.toLowerCase())) {
        seenPaths.add(normalPath)
        seenNames.add(app.name.toLowerCase())
        apps.push({ ...app, source: "startmenu" })
      }
    }

    for (const app of registryApps) {
      const normalPath = app.path.toLowerCase()
      if (!seenPaths.has(normalPath) && !seenNames.has(app.name.toLowerCase())) {
        seenPaths.add(normalPath)
        seenNames.add(app.name.toLowerCase())
        apps.push({ ...app, source: "registry" })
      }
    }
  }

  const filteredApps = apps.filter(app => !isUninstaller(app))
  
  appScanCache.apps = filteredApps
  appScanCache.expiresAt = now + APP_SCAN_CACHE_TTL
  return filteredApps
})

async function parseLnkDirectory(dirPath) {
  const shortcuts = []
  if (!fs.existsSync(dirPath)) return shortcuts

  let files
  try {
    files = fs.readdirSync(dirPath)
  } catch (e) {
    return shortcuts
  }

  const lnkFiles = []
  for (const file of files) {
    const fullPath = path.join(dirPath, file)

    let stat
    try {
      stat = fs.statSync(fullPath)
    } catch (e) {
      continue
    }

    if (stat.isDirectory()) {
      const subShortcuts = await parseLnkDirectory(fullPath)
      shortcuts.push(...subShortcuts)
      continue
    }

    if (file.endsWith(".lnk")) {
      lnkFiles.push({ file, fullPath })
    }
  }

  const lnkPromises = lnkFiles.map(async ({ file, fullPath }) => {
    try {
      const shortcutDetails = shell.readShortcutLink(fullPath)
      const realPath = shortcutDetails.target

      if (!realPath || !fs.existsSync(realPath)) return null
      if (!realPath.toLowerCase().endsWith(".exe")) return null

      return {
        name: file.replace(".lnk", ""),
        path: realPath,
        icon: ""
      }
    } catch (e) {
      return null
    }
  })

  const lnkResults = (await Promise.all(lnkPromises)).filter(Boolean)
  shortcuts.push(...lnkResults)

  return shortcuts.filter(app => !isUninstaller(app))
}

async function getDesktopShortcuts() {
  const desktopDir = app.getPath("desktop")
  return parseLnkDirectory(desktopDir)
}

async function getStartMenuShortcuts() {
  const shortcuts = []
  const startMenuDirs = [
    path.join(process.env.APPDATA || "", "Microsoft", "Windows", "Start Menu", "Programs"),
    path.join("C:", "ProgramData", "Microsoft", "Windows", "Start Menu", "Programs")
  ]

  for (const dir of startMenuDirs) {
    const apps = await parseLnkDirectory(dir)
    shortcuts.push(...apps)
  }

  return shortcuts
}

async function getRegistryApps() {
  const apps = []
  const seenNames = new Set()
  
  const psScript = `
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $ErrorActionPreference = 'SilentlyContinue'
    $keys = @(
      'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )
    $results = @()
    foreach ($key in $keys) {
      Get-ItemProperty $key -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.DisplayName) {
          $results += [PSCustomObject]@{
            DisplayName = $_.DisplayName
            DisplayIcon = $_.DisplayIcon
            InstallLocation = $_.InstallLocation
            DisplayVersion = $_.DisplayVersion
            Publisher = $_.Publisher
            SystemComponent = $_.SystemComponent
            ReleaseType = $_.ReleaseType
            ParentDisplayName = $_.ParentDisplayName
          }
        }
      }
    }
    $results | ConvertTo-Json -Depth 2 -Compress
  `
  
  return new Promise((resolve) => {
    const proc = spawn("powershell", ["-NoProfile", "-NonInteractive", "-Command", psScript], {
      stdio: "pipe",
      windowsHide: true,
      env: { ...process.env, POWERSHELL_TELEMETRY_OPTOUT: "1" }
    })
    
    let stdout = ""
    let timeout = setTimeout(() => {
      proc.kill()
      resolve(apps)
    }, 15000)
    
    proc.stdout.on("data", (data) => {
      stdout += data.toString("utf8")
    })
    
    proc.on("close", () => {
      clearTimeout(timeout)
      try {
        let items = []
        if (stdout.trim()) {
          const parsed = JSON.parse(stdout)
          items = Array.isArray(parsed) ? parsed : [parsed]
        }
        
        for (const item of items) {
          try {
            const displayName = item.DisplayName
            if (!displayName || seenNames.has(displayName.toLowerCase())) continue
            
            const publisher = item.Publisher || ""
            const systemComponent = item.SystemComponent
            const releaseType = item.ReleaseType
            const parentDisplayName = item.ParentDisplayName
            
            if (systemComponent === 1 || releaseType || parentDisplayName) continue
            if (publisher && /microsoft|windows|update|patch|security/i.test(publisher) && /update|patch|security|framework|runtime/i.test(displayName)) continue
            
            let exePath = ""
            const displayIcon = item.DisplayIcon
            if (displayIcon) {
              const iconPath = displayIcon.split(",")[0].trim().replace(/^["']|["']$/g, "")
              if (iconPath && fs.existsSync(iconPath)) {
                exePath = iconPath
              }
            }
            
            const installLocation = item.InstallLocation
            if (!exePath && installLocation) {
              const cleanInstall = installLocation.replace(/^["']|["']$/g, "")
              if (fs.existsSync(cleanInstall)) {
                const exeFiles = findExeInDir(cleanInstall)
                if (exeFiles.length > 0) {
                  exePath = exeFiles[0]
                }
              }
            }
            
            if (!exePath || !exePath.toLowerCase().endsWith(".exe") || !fs.existsSync(exePath)) continue
            
            seenNames.add(displayName.toLowerCase())
            
            const appData = {
              name: displayName,
              path: exePath,
              icon: "",
              version: item.DisplayVersion || "",
              publisher: publisher
            }
            
            if (!isUninstaller(appData)) {
              apps.push(appData)
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.error("解析注册表数据失败:", e.message)
      }
      resolve(apps)
    })
    
    proc.on("error", () => {
      clearTimeout(timeout)
      resolve(apps)
    })
  })
}

function findExeInDir(dirPath, maxDepth = 1) {
  const results = []
  try {
    _findExeRecursive(dirPath, results, 0, maxDepth)
  } catch (e) {
    // ignore
  }
  return results
}

function _findExeRecursive(dirPath, results, depth, maxDepth) {
  if (depth > maxDepth || results.length >= 1) return
  let entries
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch (e) {
    return
  }
  for (const entry of entries) {
    if (results.length >= 1) return
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) {
      const exeName = entry.name.toLowerCase()
      const dirName = path.basename(dirPath).toLowerCase()
      if (exeName.includes(dirName) || dirName.includes(exeName.replace(".exe", ""))) {
        results.push(path.join(dirPath, entry.name))
      }
    } else if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name.toLowerCase() !== "uninstall") {
      _findExeRecursive(path.join(dirPath, entry.name), results, depth + 1, maxDepth)
    }
  }
}

ipcMain.handle("set-global-shortcut", (event, accelerator) => {
  return registerGlobalShortcut(accelerator)
})

ipcMain.handle("get-global-shortcut", () => {
  return currentShortcut
})

ipcMain.handle("set-auto-launch", async (event, enable) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true,
      name: "Nexious Tools"
    })
    return true
  } catch (error) {
    console.error("设置开机自启动失败:", error)
    return false
  }
})

ipcMain.handle("get-auto-launch", () => {
  const settings = app.getLoginItemSettings()
  return settings.openAtLogin
})

function parseBookmarksHtml(htmlContent) {
  const bookmarks = []
  const regex = /<DT><A\s+([^>]+)>([^<]+)<\/A>/gi
  let match
  
  while ((match = regex.exec(htmlContent)) !== null) {
    const attrs = match[1]
    const name = match[2].trim()
    
    const hrefMatch = attrs.match(/HREF="([^"]+)"/i)
    const iconMatch = attrs.match(/ICON="([^"]*)"/i)
    
    if (hrefMatch) {
      const url = hrefMatch[1]
      const icon = iconMatch ? iconMatch[1] : ''
      
      if (url && name && (url.startsWith('http://') || url.startsWith('https://'))) {
        bookmarks.push({ name, url, icon })
      }
    }
  }
  
  return bookmarks
}

function parseChromeBookmarks(jsonContent) {
  const bookmarks = []
  
  function extractBookmarks(node) {
    if (node.type === 'url' && node.url) {
      bookmarks.push({
        name: node.name || node.url,
        url: node.url
      })
    }
    if (node.children) {
      for (const child of node.children) {
        extractBookmarks(child)
      }
    }
  }
  
  try {
    const data = JSON.parse(jsonContent)
    if (data.roots) {
      for (const root of Object.values(data.roots)) {
        extractBookmarks(root)
      }
    }
  } catch (e) {
    console.error('解析 Chrome 书签失败:', e.message)
  }
  
  return bookmarks
}

ipcMain.handle("import-browser-bookmarks", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "书签文件", extensions: ["html", "json"] },
      { name: "HTML 书签", extensions: ["html", "htm"] },
      { name: "JSON 书签", extensions: ["json"] },
      { name: "所有文件", extensions: ["*"] }
    ]
  })
  
  if (result.canceled || !result.filePaths[0]) {
    return null
  }
  
  const filePath = result.filePaths[0]
  const ext = path.extname(filePath).toLowerCase()
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    
    let bookmarks = []
    if (ext === '.json') {
      bookmarks = parseChromeBookmarks(content)
    } else {
      bookmarks = parseBookmarksHtml(content)
    }
    
    return bookmarks
  } catch (e) {
    console.error('读取书签文件失败:', e.message)
    return null
  }
})

ipcMain.handle("get-browser-bookmarks-path", async () => {
  const paths = []
  
  if (process.platform === 'win32') {
    const chromePath = path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks')
    const edgePath = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'User Data', 'Default', 'Bookmarks')
    
    if (fs.existsSync(chromePath)) {
      paths.push({ browser: 'Chrome', path: chromePath })
    }
    if (fs.existsSync(edgePath)) {
      paths.push({ browser: 'Edge', path: edgePath })
    }
  }
})