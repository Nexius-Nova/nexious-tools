const { registerAppsIpc } = require("./apps.cjs");
const { registerShortcutsIpc } = require("./shortcuts.cjs");
const { registerBookmarksIpc } = require("./bookmarks.cjs");
const { registerIconsIpc } = require("./icons.cjs");
const { registerAutoLaunchIpc } = require("./autolaunch.cjs");
const { registerWindowIpc } = require("./window.cjs");

function registerAllIpcHandlers(toggleMainWindowVisibility, getMainWindow) {
  registerWindowIpc(getMainWindow);
  registerShortcutsIpc(toggleMainWindowVisibility);
  registerAppsIpc();
  registerBookmarksIpc();
  registerIconsIpc();
  registerAutoLaunchIpc();
}

module.exports = {
  registerAllIpcHandlers,
  registerAppsIpc,
  registerShortcutsIpc,
  registerBookmarksIpc,
  registerIconsIpc,
  registerAutoLaunchIpc,
  registerWindowIpc
};
