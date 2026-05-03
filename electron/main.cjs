const {
  app,
  BrowserWindow,
  globalShortcut,
  screen
} = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const { registerAllIpcHandlers } = require("./ipc/index.cjs");
const { registerGlobalShortcut, getCurrentShortcut, setCurrentShortcut } = require("./ipc/shortcuts.cjs");

const DEFAULT_GLOBAL_SHORTCUT = "CommandOrControl+Shift+Space";
const SETTINGS_API_URL = "http://localhost:3000/api/settings/global_shortcut";
const SETTINGS_FETCH_RETRY_COUNT = 10;
const SETTINGS_FETCH_RETRY_DELAY = 500;

let mainWindow;
let serverProcess;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toggleMainWindowVisibility() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.focus();
    mainWindow.webContents.send("window-restored");
    return;
  }

  if (mainWindow.isVisible()) {
    mainWindow.minimize();
    return;
  }

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("window-restored");
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
  });

  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.on("blur", () => {
    const bounds = mainWindow.getBounds();
    if (bounds.width < 900) {
      mainWindow?.minimize();
    }
  });

  mainWindow.once("ready-to-show", () => {
    registerGlobalShortcut(getCurrentShortcut(), toggleMainWindowVisibility);
  });
}

function startServer() {
  if (!app.isPackaged) {
    return;
  }
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "dist-server/server.cjs")
    : path.join(__dirname, "../server/index.js");

  const nodePath = process.execPath;

  serverProcess = spawn(nodePath, [serverPath], {
    stdio: "pipe",
    windowsHide: true,
    env: {
      ...process.env,
      NODE_ENV: app.isPackaged ? "production" : "development",
      RESOURCES_PATH: app.isPackaged
        ? process.resourcesPath
        : path.join(__dirname, ".."),
      APP_DATA_DIR: app.getPath("userData"),
      ELECTRON_RUN_AS_NODE: "1"
    }
  });

  serverProcess.stdout.on("data", (data) => {
    console.log(`[Server] ${data}`);
  });
  serverProcess.stderr.on("data", (data) => {
    console.error(`[Server Error] ${data}`);
  });
}

async function loadSavedGlobalShortcut() {
  for (let attempt = 0; attempt < SETTINGS_FETCH_RETRY_COUNT; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(SETTINGS_API_URL, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      const savedShortcut = payload?.data;

      if (!savedShortcut || savedShortcut === getCurrentShortcut()) {
        return;
      }

      const result = registerGlobalShortcut(savedShortcut, toggleMainWindowVisibility);
      if (!result) {
        console.error("已保存的快捷键注册失败，保留当前快捷键:", savedShortcut);
      }
      return;
    } catch (error) {
      if (attempt === SETTINGS_FETCH_RETRY_COUNT - 1) {
        console.error("加载已保存快捷键失败:", error.message);
        return;
      }
      await delay(SETTINGS_FETCH_RETRY_DELAY);
    }
  }
}

app.whenReady().then(() => {
  startServer();
  createWindow();
  loadSavedGlobalShortcut();
  registerAllIpcHandlers(toggleMainWindowVisibility, () => mainWindow);
  app.focus();
});

app.on("browser-window-focus", () => {
  if (!globalShortcut.isRegistered(getCurrentShortcut())) {
    registerGlobalShortcut(getCurrentShortcut(), toggleMainWindowVisibility);
  }
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
