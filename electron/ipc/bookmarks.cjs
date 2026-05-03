const { ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

function parseBookmarksHtml(htmlContent) {
  const bookmarks = [];
  const regex = /<DT><A\s+([^>]+)>([^<]+)<\/A>/gi;
  let match;

  while ((match = regex.exec(htmlContent)) !== null) {
    const attrs = match[1];
    const name = match[2].trim();

    const hrefMatch = attrs.match(/HREF="([^"]+)"/i);
    const iconMatch = attrs.match(/ICON="([^"]*)"/i);

    if (hrefMatch) {
      const url = hrefMatch[1];
      const icon = iconMatch ? iconMatch[1] : "";

      if (
        url &&
        name &&
        (url.startsWith("http://") || url.startsWith("https://"))
      ) {
        bookmarks.push({ name, url, icon });
      }
    }
  }

  return bookmarks;
}

function parseChromeBookmarks(jsonContent) {
  const bookmarks = [];

  function extractBookmarks(node) {
    if (node.type === "url" && node.url) {
      let icon = "";
      if (node.favicon) {
        icon = node.favicon;
      } else if (node.icon) {
        icon = node.icon;
      }
      
      bookmarks.push({
        name: node.name || node.url,
        url: node.url,
        icon: icon
      });
    }
    if (node.children) {
      for (const child of node.children) {
        extractBookmarks(child);
      }
    }
  }

  try {
    const data = JSON.parse(jsonContent);
    if (data.roots) {
      for (const root of Object.values(data.roots)) {
        extractBookmarks(root);
      }
    }
  } catch (e) {
    console.error("解析 Chrome 书签失败:", e.message);
  }

  return bookmarks;
}

function registerBookmarksIpc() {
  ipcMain.handle("import-browser-bookmarks", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "书签文件", extensions: ["html", "json"] },
        { name: "HTML 书签", extensions: ["html", "htm"] },
        { name: "JSON 书签", extensions: ["json"] },
        { name: "所有文件", extensions: ["*"] }
      ]
    });

    if (result.canceled || !result.filePaths[0]) {
      return null;
    }

    const filePath = result.filePaths[0];
    const ext = path.extname(filePath).toLowerCase();

    try {
      const content = fs.readFileSync(filePath, "utf-8");

      let bookmarks = [];
      if (ext === ".json") {
        bookmarks = parseChromeBookmarks(content);
      } else {
        bookmarks = parseBookmarksHtml(content);
      }

      return bookmarks;
    } catch (e) {
      console.error("读取书签文件失败:", e.message);
      return null;
    }
  });

  ipcMain.handle("get-browser-bookmarks-path", async () => {
    const paths = [];

    if (process.platform === "win32") {
      const chromePath = path.join(
        process.env.LOCALAPPDATA || "",
        "Google",
        "Chrome",
        "User Data",
        "Default",
        "Bookmarks"
      );
      const edgePath = path.join(
        process.env.LOCALAPPDATA || "",
        "Microsoft",
        "Edge",
        "User Data",
        "Default",
        "Bookmarks"
      );
      const bravePath = path.join(
        process.env.LOCALAPPDATA || "",
        "BraveSoftware",
        "Brave-Browser",
        "User Data",
        "Default",
        "Bookmarks"
      );

      if (fs.existsSync(chromePath)) {
        paths.push({ browser: "Chrome", path: chromePath });
      }
      if (fs.existsSync(edgePath)) {
        paths.push({ browser: "Edge", path: edgePath });
      }
      if (fs.existsSync(bravePath)) {
        paths.push({ browser: "Brave", path: bravePath });
      }
    }

    return paths;
  });

  ipcMain.handle("auto-read-browser-bookmarks", async (event, browser) => {
    let bookmarkPath = null;

    if (process.platform === "win32") {
      const browserPaths = {
        chrome: path.join(
          process.env.LOCALAPPDATA || "",
          "Google",
          "Chrome",
          "User Data",
          "Default",
          "Bookmarks"
        ),
        edge: path.join(
          process.env.LOCALAPPDATA || "",
          "Microsoft",
          "Edge",
          "User Data",
          "Default",
          "Bookmarks"
        ),
        brave: path.join(
          process.env.LOCALAPPDATA || "",
          "BraveSoftware",
          "Brave-Browser",
          "User Data",
          "Default",
          "Bookmarks"
        )
      };

      bookmarkPath = browserPaths[browser?.toLowerCase()];
    }

    if (!bookmarkPath || !fs.existsSync(bookmarkPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(bookmarkPath, "utf-8");
      const bookmarks = parseChromeBookmarks(content);
      return bookmarks;
    } catch (e) {
      console.error("读取浏览器书签失败:", e.message);
      return null;
    }
  });
}

module.exports = {
  registerBookmarksIpc,
  parseBookmarksHtml,
  parseChromeBookmarks
};
