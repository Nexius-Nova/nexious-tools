const { app, BrowserWindow, ipcMain, shell, dialog, globalShortcut, screen } = require("electron")
const path = require("path")
const { spawn, exec } = require("child_process")
const fs = require("fs")
const os = require("os")
const axios = require("axios")

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
let currentShortcut = "CommandOrControl+Shift+Space"

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
  globalShortcut.unregisterAll()
  
  if (!accelerator) {
    return false
  }
  
  try {
    const result = globalShortcut.register(accelerator, () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore()
          mainWindow.focus()
          mainWindow.webContents.send('window-restored')
        } else if (mainWindow.isVisible()) {
          mainWindow.minimize()
        } else {
          mainWindow.show()
          mainWindow.focus()
          mainWindow.webContents.send('window-restored')
        }
      }
    })
    
    if (result) {
      currentShortcut = accelerator
      return true
    }
    return false
  } catch (e) {
    console.error("注册快捷键失败:", e)
    return false
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
    
    const iconBase64 = await extractIcon(iconPath)
    return iconBase64
  } catch (error) {
    console.error("提取图标失败:", error)
    return null
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
    }, 3000)
    
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
    }, 1500)
    
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
  
  return apps
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

  const iconPromises = shortcuts.slice(0, 50).map(async (shortcut) => {
    try {
      shortcut.icon = await extractIconWithExtractor(shortcut.path) || ""
    } catch (e) {
      // ignore
    }
  })
  await Promise.all(iconPromises)

  return shortcuts
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
  const regKeys = [
    "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
    "HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
  ]

  const seenNames = new Set()
  const subkeyPromises = regKeys.map(key => queryRegSubkeys(key))
  const allSubkeys = await Promise.all(subkeyPromises)
  const subkeys = allSubkeys.flat()

  const batchSize = 50
  for (let i = 0; i < subkeys.length; i += batchSize) {
    const batch = subkeys.slice(i, i + batchSize)
    const valuePromises = batch.map(subkey => 
      queryRegValues(subkey).then(values => ({ subkey, values }))
    )
    const results = await Promise.all(valuePromises)
    
    for (const { values } of results) {
      try {
        const displayName = values["DisplayName"]
        if (!displayName || seenNames.has(displayName.toLowerCase())) continue

        const displayIcon = values["DisplayIcon"]
        const installLocation = values["InstallLocation"]
        const displayVersion = values["DisplayVersion"]
        const publisher = values["Publisher"]
        const systemComponent = values["SystemComponent"]
        const releaseType = values["ReleaseType"]
        const parentDisplayName = values["ParentDisplayName"]

        if (systemComponent === "0x1" || releaseType || parentDisplayName) continue
        if (publisher && /microsoft|windows|update|patch|security/i.test(publisher) && /update|patch|security|framework|runtime/i.test(displayName)) continue

        let exePath = ""
        if (displayIcon) {
          const iconPath = displayIcon.split(",")[0].trim().replace(/^["']|["']$/g, "")
          if (iconPath && fs.existsSync(iconPath)) {
            exePath = iconPath
          }
        }

        if (!exePath && installLocation) {
          const cleanInstall = installLocation.replace(/^["']|["']$/g, "")
          if (fs.existsSync(cleanInstall)) {
            const exeFiles = findExeInDir(cleanInstall)
            if (exeFiles.length > 0) {
              exePath = exeFiles[0]
            }
          }
        }

        if (!exePath) continue
        if (!exePath.toLowerCase().endsWith(".exe")) continue
        if (!fs.existsSync(exePath)) continue

        seenNames.add(displayName.toLowerCase())

        apps.push({
          name: displayName,
          path: exePath,
          icon: "",
          version: displayVersion || "",
          publisher: publisher || ""
        })
      } catch (e) {
        // ignore
      }
    }
  }

  const iconPromises = apps.slice(0, 100).map(async (app) => {
    try {
      app.icon = await extractIconWithExtractor(app.path) || ""
    } catch (e) {
      // ignore
    }
  })
  await Promise.all(iconPromises)

  return apps
}

function queryRegSubkeys(key) {
  return new Promise((resolve) => {
    const proc = spawn("cmd", ["/c", "chcp", "65001", ">", "nul", "&&", "reg", "query", key], {
      shell: false,
      windowsHide: true
    })
    let stdout = ""
    proc.stdout.on("data", (data) => {
      stdout += data.toString("utf8")
    })
    proc.on("close", () => {
      const lines = stdout.split("\n").map(l => l.trim()).filter(l => l && l !== key)
      resolve(lines)
    })
    proc.on("error", () => {
      resolve([])
    })
  })
}

function queryRegValues(key) {
  return new Promise((resolve) => {
    const proc = spawn("cmd", ["/c", "chcp", "65001", ">", "nul", "&&", "reg", "query", key], {
      shell: false,
      windowsHide: true
    })
    let stdout = ""
    proc.stdout.on("data", (data) => {
      stdout += data.toString("utf8")
    })
    proc.on("close", () => {
      const values = {}
      const lines = stdout.split("\n").map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        const match = line.match(/^\s*(\S+)\s+REG_\S+\s+(.+)$/i)
        if (match) {
          values[match[1]] = match[2].trim()
        }
      }
      resolve(values)
    })
    proc.on("error", () => {
      resolve({})
    })
  })
}

function findExeInDir(dirPath, maxDepth = 2) {
  const results = []
  try {
    _findExeRecursive(dirPath, results, 0, maxDepth)
  } catch (e) {
    // ignore
  }
  return results
}

function _findExeRecursive(dirPath, results, depth, maxDepth) {
  if (depth > maxDepth || results.length >= 3) return
  let entries
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch (e) {
    return
  }
  for (const entry of entries) {
    if (results.length >= 3) return
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
  
  return paths
})
