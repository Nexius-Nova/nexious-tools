const { ipcMain, globalShortcut } = require("electron");

let currentShortcut = "CommandOrControl+Shift+Space";

function registerGlobalShortcut(accelerator, toggleMainWindowVisibility) {
  if (!accelerator) {
    return false;
  }

  const nextShortcut = accelerator.trim();
  const previousShortcut = currentShortcut;
  const hadPreviousShortcut =
    Boolean(previousShortcut) && globalShortcut.isRegistered(previousShortcut);

  try {
    if (hadPreviousShortcut && previousShortcut === nextShortcut) {
      currentShortcut = nextShortcut;
      return true;
    }

    if (hadPreviousShortcut) {
      globalShortcut.unregister(previousShortcut);
    }

    const result = globalShortcut.register(
      nextShortcut,
      toggleMainWindowVisibility
    );

    if (result) {
      currentShortcut = nextShortcut;
      return true;
    }

    if (hadPreviousShortcut) {
      globalShortcut.register(previousShortcut, toggleMainWindowVisibility);
    }
    return false;
  } catch (e) {
    if (
      hadPreviousShortcut &&
      previousShortcut !== nextShortcut &&
      !globalShortcut.isRegistered(previousShortcut)
    ) {
      try {
        globalShortcut.register(previousShortcut, toggleMainWindowVisibility);
      } catch (restoreError) {
        console.error("恢复旧快捷键失败:", restoreError);
      }
    }
    console.error("注册快捷键失败:", e);
    return false;
  }
}

function registerShortcutsIpc(toggleMainWindowVisibility) {
  ipcMain.handle("set-global-shortcut", (event, accelerator) => {
    return registerGlobalShortcut(accelerator, toggleMainWindowVisibility);
  });

  ipcMain.handle("get-global-shortcut", () => {
    return currentShortcut;
  });
}

function getCurrentShortcut() {
  return currentShortcut;
}

function setCurrentShortcut(shortcut) {
  currentShortcut = shortcut;
}

module.exports = {
  registerShortcutsIpc,
  registerGlobalShortcut,
  getCurrentShortcut,
  setCurrentShortcut
};
