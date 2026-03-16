const { app, BrowserWindow, ipcMain, shell, dialog, desktopCapturer, nativeImage, globalShortcut, clipboard } = require("electron")
const path = require("path")
const { spawn, exec } = require("child_process")
const fs = require("fs")
const os = require("os")
const axios = require("axios")

let mainWindow
let serverProcess
let currentShortcut = "CommandOrControl+Shift+Space"
let lastClipboardContent = ""
let lastClipboardImage = ""
let clipboardWatcher = null

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

ipcMain.handle("auto-import-apps", async () => {
  const apps = []
  const seenNames = new Set()
  
  try {
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      fetchWindowIcons: true,
      thumbnailSize: { width: 64, height: 64 }
    })
    
    for (const source of sources) {
      const name = source.name
      if (!name || name === "Electron" || name === "nexious-tools") continue
      if (seenNames.has(name)) continue
      seenNames.add(name)
      
      apps.push({
        name: name,
        path: "",
        icon: source.appIcon ? source.appIcon.toDataURL() : "",
        type: "running"
      })
    }
  } catch (e) {
    console.error("获取运行中应用失败:", e.message)
  }
  
  if (process.platform === "win32") {
    const installedApps = await getInstalledApps()
    const appsWithIcons = await extractIconsBatch(installedApps)
    
    for (const app of appsWithIcons) {
      if (!seenNames.has(app.name)) {
        seenNames.add(app.name)
        apps.push({
          name: app.name,
          path: app.path,
          icon: app.icon,
          type: "installed"
        })
      }
    }
  }
  
  return apps.slice(0, 100)
})

function getInstalledApps() {
  return new Promise((resolve) => {
    const apps = []
    const seenApps = new Set()
    
    const cmd = `reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s & reg query "HKLM\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s & reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall" /s`
    
    exec(cmd, { maxBuffer: 1024 * 1024 * 10, windowsHide: true }, (err, stdout) => {
      if (!err && stdout) {
        const lines = stdout.split(/\r?\n/)
        let currentApp = {}
        
        for (const line of lines) {
          const trimmed = line.trim()
          
          if (trimmed.match(/^DisplayName\s+REG_[A-Z]+\s+(.+)$/i)) {
            currentApp.name = trimmed.replace(/^DisplayName\s+REG_[A-Z]+\s+/i, "").trim()
          }
          
          if (trimmed.match(/^DisplayIcon\s+REG_[A-Z]+\s+(.+)$/i)) {
            currentApp.iconPath = trimmed.replace(/^DisplayIcon\s+REG_[A-Z]+\s+/i, "").trim()
          }
          
          if (trimmed.match(/^InstallLocation\s+REG_[A-Z]+\s+(.+)$/i)) {
            currentApp.path = trimmed.replace(/^InstallLocation\s+REG_[A-Z]+\s+/i, "").trim()
          }
          
          if (trimmed.match(/^UninstallString\s+REG_[A-Z]+\s+(.+)$/i)) {
            const uninstallStr = trimmed.replace(/^UninstallString\s+REG_[A-Z]+\s+/i, "").trim()
            if (!currentApp.path && uninstallStr) {
              const exeMatch = uninstallStr.match(/"([^"]+\.exe)"/i) || uninstallStr.match(/([A-Z]:\\[^\s]+\.exe)/i)
              if (exeMatch) {
                currentApp.path = exeMatch[1]
              }
            }
          }
          
          if (trimmed.startsWith("HKEY_") && currentApp.name) {
            if (!seenApps.has(currentApp.name) && 
                currentApp.name.length > 0 && 
                !currentApp.name.includes("Update") &&
                !currentApp.name.includes("Hotfix") &&
                !currentApp.name.includes("Security") &&
                !currentApp.name.includes("Microsoft Visual C++") &&
                !currentApp.name.includes("Microsoft .NET")) {
              seenApps.add(currentApp.name)
              apps.push({
                name: currentApp.name,
                path: currentApp.path || "",
                iconPath: currentApp.iconPath || "",
                icon: ""
              })
            }
            currentApp = {}
          }
        }
        
        if (currentApp.name && !seenApps.has(currentApp.name)) {
          apps.push({
            name: currentApp.name,
            path: currentApp.path || "",
            iconPath: currentApp.iconPath || "",
            icon: ""
          })
        }
      }
      
      resolve(apps)
    })
  })
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

function startClipboardWatcher() {
  if (clipboardWatcher) return
  
  lastClipboardContent = clipboard.readText() || ""
  lastClipboardImage = clipboard.readImage().toDataURL()
  
  clipboardWatcher = setInterval(() => {
    const currentText = clipboard.readText()
    const currentImage = clipboard.readImage()
    const currentImageData = currentImage.isEmpty() ? null : currentImage.toDataURL()
    
    if (currentImage && !currentImage.isEmpty() && currentImageData !== lastClipboardImage) {
      lastClipboardImage = currentImageData
      lastClipboardContent = currentText || ""
      
      axios.post("http://localhost:3000/api/clipboard", {
        content: currentImageData,
        content_type: "image"
      }).catch(err => {
        console.error("保存剪贴板图片失败:", err.message)
      })
    } else if (currentText && currentText !== lastClipboardContent) {
      lastClipboardContent = currentText
      
      const contentType = detectContentType(currentText)
      
      axios.post("http://localhost:3000/api/clipboard", {
        content: currentText,
        content_type: contentType
      }).catch(err => {
        console.error("保存剪贴板内容失败:", err.message)
      })
    }
  }, 1000)
}

function stopClipboardWatcher() {
  if (clipboardWatcher) {
    clearInterval(clipboardWatcher)
    clipboardWatcher = null
  }
}

function detectContentType(content) {
  if (/^https?:\/\//.test(content)) return "url"
  if (/^mailto:|^[\w.-]+@[\w.-]+\.\w+$/.test(content)) return "email"
  if (/^tel:|^[\d\s\-+()]{7,}$/.test(content)) return "phone"
  if (/^[({\[][\s\S]*[)}\]]$/.test(content) || /^(function|const|let|var|import|export|class)/.test(content)) return "code"
  return "text"
}

ipcMain.handle("start-clipboard-watcher", () => {
  startClipboardWatcher()
  return true
})

ipcMain.handle("stop-clipboard-watcher", () => {
  stopClipboardWatcher()
  return true
})
