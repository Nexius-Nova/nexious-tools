const { ipcMain, app } = require("electron");

function registerAutoLaunchIpc() {
  ipcMain.handle("set-auto-launch", async (event, enable) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enable,
        openAsHidden: true,
        name: "Nexious Tools"
      });
      return true;
    } catch (error) {
      console.error("设置开机自启动失败:", error);
      return false;
    }
  });

  ipcMain.handle("get-auto-launch", () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });
}

module.exports = {
  registerAutoLaunchIpc
};
