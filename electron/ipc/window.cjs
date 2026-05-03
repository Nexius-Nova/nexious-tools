const { ipcMain, shell } = require("electron");
const fs = require("fs");

function registerWindowIpc(getMainWindow) {
  ipcMain.on("window-minimize", () => {
    const mainWindow = getMainWindow();
    mainWindow?.minimize();
  });

  ipcMain.on("window-maximize", () => {
    const mainWindow = getMainWindow();
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on("window-close", () => {
    const mainWindow = getMainWindow();
    mainWindow?.close();
  });

  ipcMain.on("open-external", (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.on("open-folder", (event, folderPath) => {
    if (folderPath && fs.existsSync(folderPath)) {
      shell.openPath(folderPath);
    }
  });

  ipcMain.on("expand-window", () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.setAlwaysOnTop(false);
      mainWindow.setResizable(true);
      mainWindow.setMinimumSize(900, 600);
      mainWindow.setMaximumSize(9999, 9999);
      mainWindow.setSize(1200, 800);
      mainWindow.center();
    }
  });

  ipcMain.on("shrink-window", () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      }
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setResizable(false);
      mainWindow.setMinimumSize(600, 60);
      mainWindow.setMaximumSize(600, 700);
      mainWindow.setSize(600, 60);
      mainWindow.center();
    }
  });

  ipcMain.on("resize-search-window", (event, height) => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      const newHeight = Math.min(Math.max(height, 60), 700);
      mainWindow.setContentSize(600, newHeight);
    }
  });
}

module.exports = {
  registerWindowIpc
};
