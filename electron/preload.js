const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  expandWindow: () => ipcRenderer.send('expand-window'),
  shrinkWindow: () => ipcRenderer.send('shrink-window'),
  resizeSearchWindow: (height) => ipcRenderer.send('resize-search-window', height),
  openApp: (appPath) => ipcRenderer.send('open-app', appPath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  autoImportApps: () => ipcRenderer.invoke('auto-import-apps'),
  getExeIcon: (exePath) => ipcRenderer.invoke('get-exe-icon', exePath),
  setGlobalShortcut: (accelerator) => ipcRenderer.invoke('set-global-shortcut', accelerator),
  getGlobalShortcut: () => ipcRenderer.invoke('get-global-shortcut'),
  onWindowRestored: (callback) => {
    ipcRenderer.on('window-restored', callback)
    return () => ipcRenderer.removeListener('window-restored', callback)
  }
})
