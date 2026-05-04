const { ipcMain, app } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");

let iconExtractor = null;
try {
  let iconExtractorPath;
  if (app.isPackaged) {
    iconExtractorPath = path.join(process.resourcesPath, "icon-extractor");
  } else {
    iconExtractorPath = "icon-extractor";
  }
  iconExtractor = require(iconExtractorPath);
} catch (e) {
  console.error("Failed to load icon-extractor:", e.message);
  iconExtractor = null;
}

const iconCache = new Map();
const ICON_CONCURRENCY = 5;

let iconCachePath = null;

function initIconCachePath() {
  if (!iconCachePath) {
    iconCachePath = path.join(app.getPath("userData"), "icon-cache.json");
  }
}

function loadIconCache() {
  initIconCachePath();
  try {
    if (fs.existsSync(iconCachePath)) {
      const data = fs.readFileSync(iconCachePath, "utf-8");
      const entries = JSON.parse(data);
      entries.forEach(([key, value]) => {
        iconCache.set(key, value);
      });
      console.log(`已加载 ${iconCache.size} 个图标缓存`);
    }
  } catch (e) {
    console.error("加载图标缓存失败:", e.message);
  }
}

function saveIconCache() {
  initIconCachePath();
  try {
    const data = JSON.stringify([...iconCache.entries()]);
    fs.writeFileSync(iconCachePath, data, "utf-8");
  } catch (e) {
    console.error("保存图标缓存失败:", e.message);
  }
}

function extractIcon(iconPath) {
  return new Promise((resolve) => {
    if (!iconPath || typeof iconPath !== "string") {
      resolve(null);
      return;
    }

    let cleanPath = iconPath.trim();
    if (cleanPath.includes(",")) {
      cleanPath = cleanPath.split(",")[0].trim();
    }
    cleanPath = cleanPath.replace(/^["']|["']$/g, "");

    if (!cleanPath || !fs.existsSync(cleanPath)) {
      resolve(null);
      return;
    }

    const ext = path.extname(cleanPath).toLowerCase();

    if (
      ext === ".ico" ||
      ext === ".png" ||
      ext === ".jpg" ||
      ext === ".jpeg" ||
      ext === ".bmp"
    ) {
      try {
        const imageBuffer = fs.readFileSync(cleanPath);
        const base64 = `data:image/${ext === ".jpg" ? "jpeg" : ext.slice(1)};base64,${imageBuffer.toString("base64")}`;
        resolve(base64);
        return;
      } catch (e) {
        resolve(null);
        return;
      }
    }

    const tempDir = os.tmpdir();
    const iconName = `icon_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
    const tempIconPath = path.join(tempDir, iconName);

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
    `;

    const child = spawn(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", psScript],
      {
        stdio: "pipe",
        windowsHide: true
      }
    );

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill();
      resolve(null);
    }, 5000);

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (output.includes("success") && fs.existsSync(tempIconPath)) {
        try {
          const imageBuffer = fs.readFileSync(tempIconPath);
          const base64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;
          fs.unlinkSync(tempIconPath);
          resolve(base64);
        } catch (e) {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });

    child.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

function extractIconWithExtractor(iconPath) {
  return new Promise((resolve) => {
    if (!iconExtractor) {
      resolve(null);
      return;
    }

    if (!iconPath || typeof iconPath !== "string") {
      resolve(null);
      return;
    }

    let cleanPath = iconPath.trim();
    if (cleanPath.includes(",")) {
      cleanPath = cleanPath.split(",")[0].trim();
    }
    cleanPath = cleanPath.replace(/^["']|["']$/g, "");

    if (!cleanPath || !fs.existsSync(cleanPath)) {
      resolve(null);
      return;
    }

    const timeout = setTimeout(() => {
      iconExtractor.emitter.removeListener("icon", handler);
      iconExtractor.emitter.removeListener("error", errorHandler);
      resolve(null);
    }, 5000);

    const handler = (data) => {
      if (data.Context === cleanPath) {
        clearTimeout(timeout);
        iconExtractor.emitter.removeListener("icon", handler);
        iconExtractor.emitter.removeListener("error", errorHandler);
        if (data.Base64ImageData) {
          resolve(`data:image/png;base64,${data.Base64ImageData}`);
        } else {
          resolve(null);
        }
      }
    };

    const errorHandler = (err) => {
      clearTimeout(timeout);
      iconExtractor.emitter.removeListener("icon", handler);
      iconExtractor.emitter.removeListener("error", errorHandler);
      resolve(null);
    };

    iconExtractor.emitter.on("icon", handler);
    iconExtractor.emitter.on("error", errorHandler);
    iconExtractor.getIcon(cleanPath, cleanPath);
  });
}

async function getCachedIcon(iconPath, storeAppInfo = null) {
  if (!iconPath || typeof iconPath !== "string") {
    return null;
  }

  let cleanPath = iconPath.trim();
  if (cleanPath.includes(",")) {
    cleanPath = cleanPath.split(",")[0].trim();
  }
  cleanPath = cleanPath.replace(/^["']|["']$/g, "");

  if (!cleanPath) {
    return null;
  }

  if (cleanPath.startsWith("shell:AppsFolder\\")) {
    if (storeAppInfo && storeAppInfo.installLocation) {
      const installLocation = storeAppInfo.installLocation;
      const logoRelative = storeAppInfo.logo || "";
      
      const possibleLogoPaths = [];
      
      if (logoRelative) {
        possibleLogoPaths.push(
          path.join(installLocation, logoRelative),
          path.join(installLocation, logoRelative.replace(/\.png$/i, ".scale-100.png")),
          path.join(installLocation, logoRelative.replace(/\.png$/i, ".scale-125.png")),
          path.join(installLocation, logoRelative.replace(/\.png$/i, ".scale-150.png")),
          path.join(installLocation, logoRelative.replace(/\.png$/i, ".scale-200.png")),
          path.join(installLocation, logoRelative.replace(/\.png$/i, ".scale-400.png"))
        );
      }
      
      possibleLogoPaths.push(
        path.join(installLocation, "Assets", "Square44x44Logo.png"),
        path.join(installLocation, "Assets", "Square44x44Logo.targetsize-44.png"),
        path.join(installLocation, "Assets", "Square150x150Logo.png"),
        path.join(installLocation, "Assets", "Logo.png"),
        path.join(installLocation, "Assets", "StoreLogo.png"),
        path.join(installLocation, "icon.png"),
        path.join(installLocation, "Icon.png")
      );
      
      for (const logoPath of possibleLogoPaths) {
        if (fs.existsSync(logoPath)) {
          try {
            const imageBuffer = fs.readFileSync(logoPath);
            const ext = path.extname(logoPath).toLowerCase();
            const mimeType = ext === ".jpg" ? "jpeg" : ext.slice(1);
            const base64 = `data:image/${mimeType};base64,${imageBuffer.toString("base64")}`;
            return base64;
          } catch (e) {
            continue;
          }
        }
      }
    }
    return null;
  }

  if (iconCache.has(cleanPath)) {
    return iconCache.get(cleanPath);
  }

  const iconBase64 =
    (await extractIconWithExtractor(cleanPath)) ||
    (await extractIcon(cleanPath)) ||
    null;

  if (iconBase64) {
    iconCache.set(cleanPath, iconBase64);
    saveIconCache();
  }
  return iconBase64;
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await mapper(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function registerIconsIpc() {
  loadIconCache();

  ipcMain.handle("get-exe-icon", async (event, iconPath) => {
    try {
      if (!iconPath) {
        return null;
      }

      if (process.platform !== "win32") {
        return null;
      }

      const iconBase64 = await getCachedIcon(iconPath);
      return iconBase64;
    } catch (error) {
      console.error("提取图标失败:", error);
      return null;
    }
  });

  ipcMain.handle("get-app-icons", async (event, apps = []) => {
    try {
      if (
        process.platform !== "win32" ||
        !Array.isArray(apps) ||
        apps.length === 0
      ) {
        return {};
      }

      const isPathArray = typeof apps[0] === "string";
      const appList = isPathArray
        ? apps.filter(Boolean).map((p) => ({ path: p }))
        : apps.filter((a) => a && a.path);

      const icons = await mapWithConcurrency(
        appList,
        ICON_CONCURRENCY,
        async (app) => {
          const appPath = app.path;
          const storeAppInfo =
            app.source === "microsoftstore"
              ? { installLocation: app.installLocation, logo: app.logo }
              : null;
          const icon = await getCachedIcon(appPath, storeAppInfo);
          return [appPath, icon || ""];
        }
      );

      return Object.fromEntries(icons);
    } catch (error) {
      console.error("获取应用图标失败:", error);
      return {};
    }
  });
}

module.exports = {
  registerIconsIpc,
  getCachedIcon,
  extractIcon,
  extractIconWithExtractor,
  loadIconCache,
  saveIconCache
};
