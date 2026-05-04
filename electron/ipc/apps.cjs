const { ipcMain, app, shell, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

const UNINSTALLER_KEYWORDS = [
  "uninstall",
  "uninstaller",
  "unins",
  "remove",
  "remover",
  "卸载",
  "卸载程序",
  "卸载工具",
  "移除",
  "删除程序"
];

const UNINSTALLER_PATH_PATTERNS = [
  /unins\d{3}\.exe$/i,
  /uninstall\.exe$/i,
  /uninst\.exe$/i,
  /unins\d*\.exe$/i
];

function isUninstaller(app) {
  if (!app || !app.name) return false;

  const appName = app.name.toLowerCase();
  const appPath = (app.path || "").toLowerCase();
  const exeName = path.basename(appPath);

  for (const keyword of UNINSTALLER_KEYWORDS) {
    if (appName.includes(keyword.toLowerCase())) {
      return true;
    }
  }

  for (const pattern of UNINSTALLER_PATH_PATTERNS) {
    if (pattern.test(exeName)) {
      return true;
    }
  }

  if (appPath.includes("uninstall") || appPath.includes("unins")) {
    const pathParts = appPath.split(/[/\\]/);
    const secondLastPart =
      pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";
    if (
      secondLastPart.includes("uninstall") ||
      secondLastPart.includes("unins")
    ) {
      return true;
    }
  }

  return false;
}

const appScanCache = {
  expiresAt: 0,
  apps: []
};

const APP_SCAN_CACHE_TTL = 5 * 60 * 1000;

async function parseLnkDirectory(dirPath) {
  const shortcuts = [];
  if (!fs.existsSync(dirPath)) return shortcuts;

  let files;
  try {
    files = fs.readdirSync(dirPath);
  } catch (e) {
    return shortcuts;
  }

  const lnkFiles = [];
  for (const file of files) {
    const fullPath = path.join(dirPath, file);

    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue;
    }

    if (stat.isDirectory()) {
      const subShortcuts = await parseLnkDirectory(fullPath);
      shortcuts.push(...subShortcuts);
      continue;
    }

    if (file.endsWith(".lnk")) {
      lnkFiles.push({ file, fullPath });
    }
  }

  const lnkPromises = lnkFiles.map(async ({ file, fullPath }) => {
    try {
      const shortcutDetails = shell.readShortcutLink(fullPath);
      const realPath = shortcutDetails.target;

      if (!realPath || !fs.existsSync(realPath)) return null;
      if (!realPath.toLowerCase().endsWith(".exe")) return null;

      return {
        name: file.replace(".lnk", ""),
        path: realPath,
        icon: ""
      };
    } catch (e) {
      return null;
    }
  });

  const lnkResults = (await Promise.all(lnkPromises)).filter(Boolean);
  shortcuts.push(...lnkResults);

  return shortcuts.filter((app) => !isUninstaller(app));
}

async function getDesktopShortcuts() {
  const desktopDir = app.getPath("desktop");
  return parseLnkDirectory(desktopDir);
}

async function getStartMenuShortcuts() {
  const shortcuts = [];
  const startMenuDirs = [
    path.join(
      process.env.APPDATA || "",
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs"
    ),
    path.join(
      "C:",
      "ProgramData",
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs"
    )
  ];

  for (const dir of startMenuDirs) {
    const apps = await parseLnkDirectory(dir);
    shortcuts.push(...apps);
  }

  return shortcuts;
}

async function getRegistryApps() {
  const apps = [];
  const seenNames = new Set();

  const psScript = `
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $ErrorActionPreference = 'SilentlyContinue'
    $keys = @(
      'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',
      'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'
    )
    $results = @()
    foreach ($key in $keys) {
      Get-ItemProperty $key -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.DisplayName) {
          $results += [PSCustomObject]@{
            DisplayName = $_.DisplayName
            DisplayIcon = $_.DisplayIcon
            InstallLocation = $_.InstallLocation
            DisplayVersion = $_.DisplayVersion
            Publisher = $_.Publisher
            SystemComponent = $_.SystemComponent
            ReleaseType = $_.ReleaseType
            ParentDisplayName = $_.ParentDisplayName
          }
        }
      }
    }
    $results | ConvertTo-Json -Depth 2 -Compress
  `;

  const { spawn } = require("child_process");

  return new Promise((resolve) => {
    const proc = spawn(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", psScript],
      {
        stdio: "pipe",
        windowsHide: true,
        env: { ...process.env, POWERSHELL_TELEMETRY_OPTOUT: "1" }
      }
    );

    let stdout = "";
    let timeout = setTimeout(() => {
      proc.kill();
      resolve(apps);
    }, 15000);

    proc.stdout.on("data", (data) => {
      stdout += data.toString("utf8");
    });

    proc.on("close", () => {
      clearTimeout(timeout);
      try {
        let items = [];
        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          items = Array.isArray(parsed) ? parsed : [parsed];
        }

        for (const item of items) {
          try {
            const displayName = item.DisplayName;
            if (!displayName || seenNames.has(displayName.toLowerCase()))
              continue;

            const publisher = item.Publisher || "";
            const systemComponent = item.SystemComponent;
            const releaseType = item.ReleaseType;
            const parentDisplayName = item.ParentDisplayName;

            if (systemComponent === 1 || releaseType || parentDisplayName)
              continue;
            if (
              publisher &&
              /microsoft|windows|update|patch|security/i.test(publisher) &&
              /update|patch|security|framework|runtime/i.test(displayName)
            )
              continue;

            let exePath = "";
            const displayIcon = item.DisplayIcon;
            if (displayIcon) {
              const iconPath = displayIcon
                .split(",")[0]
                .trim()
                .replace(/^["']|["']$/g, "");
              if (iconPath && fs.existsSync(iconPath)) {
                exePath = iconPath;
              }
            }

            const installLocation = item.InstallLocation;
            if (!exePath && installLocation) {
              const cleanInstall = installLocation.replace(/^["']|["']$/g, "");
              if (fs.existsSync(cleanInstall)) {
                const exeFiles = findExeInDir(cleanInstall);
                if (exeFiles.length > 0) {
                  exePath = exeFiles[0];
                }
              }
            }

            if (
              !exePath ||
              !exePath.toLowerCase().endsWith(".exe") ||
              !fs.existsSync(exePath)
            )
              continue;

            seenNames.add(displayName.toLowerCase());

            const appData = {
              name: displayName,
              path: exePath,
              icon: "",
              version: item.DisplayVersion || "",
              publisher: publisher
            };

            if (!isUninstaller(appData)) {
              apps.push(appData);
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.error("解析注册表数据失败:", e.message);
      }
      resolve(apps);
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      resolve(apps);
    });
  });
}

function findExeInDir(dirPath, maxDepth = 1) {
  const results = [];
  try {
    _findExeRecursive(dirPath, results, 0, maxDepth);
  } catch (e) {
    // ignore
  }
  return results;
}

async function getMicrosoftStoreApps() {
  const apps = [];
  const seenAumids = new Set();

  const psScript = `
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    $ErrorActionPreference = 'SilentlyContinue'
    $installedapps = Get-AppxPackage
    $results = @()
    foreach ($app in $installedapps) {
      $manifest = Get-AppxPackageManifest $app
      if ($manifest -and $manifest.package -and $manifest.package.applications) {
        $applications = $manifest.package.applications.application
        if ($applications) {
          foreach ($appEntry in $applications) {
            $appId = $appEntry.Id
            if ($appId) {
              $aumid = $app.PackageFamilyName + "!" + $appId
              $displayName = $appEntry.VisualElements.DisplayName
              if ($displayName -and $displayName.StartsWith("ms-resource:")) {
                $displayName = $app.Name
              }
              if (-not $displayName) {
                $displayName = $app.Name
              }
              $logoPath = ""
              if ($appEntry.VisualElements.Square44x44Logo) {
                $logoPath = $appEntry.VisualElements.Square44x44Logo
              } elseif ($appEntry.VisualElements.Logo) {
                $logoPath = $appEntry.VisualElements.Logo
              }
              $results += [PSCustomObject]@{
                Name = $displayName
                PackageFamilyName = $app.PackageFamilyName
                ApplicationId = $appId
                AUMID = $aumid
                InstallLocation = $app.InstallLocation
                Logo = $logoPath
                Publisher = $app.PublisherDisplayName
                Version = "$($app.Version.Major).$($app.Version.Minor).$($app.Version.Build).$($app.Version.Revision)"
              }
            }
          }
        }
      }
    }
    $results | ConvertTo-Json -Depth 2 -Compress
  `;

  const { spawn } = require("child_process");

  return new Promise((resolve) => {
    const proc = spawn(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command", psScript],
      {
        stdio: "pipe",
        windowsHide: true,
        env: { ...process.env, POWERSHELL_TELEMETRY_OPTOUT: "1" }
      }
    );

    let stdout = "";
    let timeout = setTimeout(() => {
      proc.kill();
      resolve(apps);
    }, 30000);

    proc.stdout.on("data", (data) => {
      stdout += data.toString("utf8");
    });

    proc.on("close", () => {
      clearTimeout(timeout);
      try {
        let items = [];
        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          items = Array.isArray(parsed) ? parsed : [parsed];
        }

        const systemAppPatterns = [
          /Microsoft\.Windows\.(ShellExperienceHost|CloudExperienceHost|OOBENetwork)/i,
          /Microsoft\.AAD\.BrokerPlugin/i,
          /Microsoft\.BioEnrollment/i,
          /Microsoft\.Windows\.StartMenuExperienceHost/i,
          /windows\.immersivecontrolpanel/i,
          /Microsoft\.XboxGameOverlay/i,
          /Microsoft\.XboxSpeechToTextOverlay/i,
          /Microsoft\.Xbox\.TCUI/i,
          /Microsoft\.XboxIdentityProvider/i,
          /Microsoft\.WebMediaExtensions/i,
          /Microsoft\.WebpImageExtension/i,
          /Microsoft\.VCLibs/i,
          /Microsoft\.UI/i,
          /Microsoft\.NET/i,
          /Microsoft\.GetHelp/i,
          /Microsoft\.Windows\.ContentDeliveryManager/i,
          /Microsoft\.Windows\.Search/i,
          /Microsoft\.Windows\.Security/i,
          /Microsoft\.Windows\.Shell/i,
          /Microsoft\.Windows\.CBS/i,
          /Microsoft\.WindowsAlarms/i,
          /Microsoft\.WindowsCalculator/i,
          /Microsoft\.WindowsMaps/i,
          /Microsoft\.WindowsSoundRecorder/i,
          /Microsoft\.ZuneVideo/i,
          /Microsoft\.ZuneMusic/i,
          /Microsoft\.Windows.Photos/i,
          /Microsoft\.WindowsStore/i,
          /Microsoft\.WindowsNotepad/i,
          /Microsoft\.Paint/i,
          /Microsoft\.StickyNotes/i,
          /Microsoft\.MixedReality\.Portal/i,
          /Microsoft\.WindowsFeedbackHub/i,
          /Microsoft\.Getstarted/i,
          /Microsoft\.People/i,
          /Microsoft\.SkypeApp/i,
          /Microsoft\.Office\.OneNote/i,
          /Microsoft\.BingWeather/i,
          /Microsoft\.Microsoft3DViewer/i,
          /Microsoft\.WindowsCommunicationsApps/i,
          /Microsoft\.WindowsCamera/i,
          /Microsoft\.XboxApp/i,
          /Microsoft\.XboxGamingOverlay/i,
          /Microsoft\.YourPhone/i,
          /Microsoft\.WindowsTerminal/i,
          /Microsoft\.ScreenSketch/i,
          /Microsoft\.HEIFImageExtension/i,
          /Microsoft\.RawImageExtension/i,
          /Microsoft\.VP9VideoExtensions/i,
          /Microsoft\.WebMediaExtensions/i,
          /Microsoft\.AV1VideoExtension/i
        ];

        for (const item of items) {
          try {
            const aumid = item.AUMID;
            if (!aumid || seenAumids.has(aumid)) continue;

            let isSystemApp = false;
            for (const pattern of systemAppPatterns) {
              if (pattern.test(aumid)) {
                isSystemApp = true;
                break;
              }
            }
            if (isSystemApp) continue;

            let displayName = item.Name;
            if (!displayName || displayName.startsWith("ms-resource:")) {
              displayName = item.PackageFamilyName.split("_")[0];
            }

            seenAumids.add(aumid);

            apps.push({
              name: displayName,
              path: `shell:AppsFolder\\${aumid}`,
              icon: "",
              version: item.Version || "",
              publisher: item.Publisher || "",
              source: "microsoftstore",
              aumid: aumid,
              installLocation: item.InstallLocation || "",
              logo: item.Logo || ""
            });
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        console.error("解析 Microsoft Store Apps 数据失败:", e.message);
      }
      resolve(apps);
    });

    proc.on("error", () => {
      clearTimeout(timeout);
      resolve(apps);
    });
  });
}

function _findExeRecursive(dirPath, results, depth, maxDepth) {
  if (depth > maxDepth || results.length >= 1) return;
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    return;
  }
  for (const entry of entries) {
    if (results.length >= 1) return;
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".exe")) {
      const exeName = entry.name.toLowerCase();
      const dirName = path.basename(dirPath).toLowerCase();
      if (
        exeName.includes(dirName) ||
        dirName.includes(exeName.replace(".exe", ""))
      ) {
        results.push(path.join(dirPath, entry.name));
      }
    } else if (
      entry.isDirectory() &&
      !entry.name.startsWith(".") &&
      entry.name.toLowerCase() !== "uninstall"
    ) {
      _findExeRecursive(
        path.join(dirPath, entry.name),
        results,
        depth + 1,
        maxDepth
      );
    }
  }
}

function registerAppsIpc(getIconCache) {
  ipcMain.handle("auto-import-apps", async () => {
    const now = Date.now();
    if (appScanCache.expiresAt > now && appScanCache.apps.length > 0) {
      return appScanCache.apps;
    }

    const apps = [];
    const seenPaths = new Set();
    const seenNames = new Set();

    if (process.platform === "win32") {
      const [desktopApps, startMenuApps, registryApps, storeApps] = await Promise.all([
        getDesktopShortcuts(),
        getStartMenuShortcuts(),
        getRegistryApps(),
        getMicrosoftStoreApps()
      ]);

      for (const app of desktopApps) {
        const normalPath = app.path.toLowerCase();
        if (
          !seenPaths.has(normalPath) &&
          !seenNames.has(app.name.toLowerCase())
        ) {
          seenPaths.add(normalPath);
          seenNames.add(app.name.toLowerCase());
          apps.push({ ...app, source: "desktop" });
        }
      }

      for (const app of startMenuApps) {
        const normalPath = app.path.toLowerCase();
        if (
          !seenPaths.has(normalPath) &&
          !seenNames.has(app.name.toLowerCase())
        ) {
          seenPaths.add(normalPath);
          seenNames.add(app.name.toLowerCase());
          apps.push({ ...app, source: "startmenu" });
        }
      }

      for (const app of registryApps) {
        const normalPath = app.path.toLowerCase();
        if (
          !seenPaths.has(normalPath) &&
          !seenNames.has(app.name.toLowerCase())
        ) {
          seenPaths.add(normalPath);
          seenNames.add(app.name.toLowerCase());
          apps.push({ ...app, source: "registry" });
        }
      }

      for (const app of storeApps) {
        if (!seenNames.has(app.name.toLowerCase())) {
          seenNames.add(app.name.toLowerCase());
          apps.push(app);
        }
      }
    }

    const filteredApps = apps.filter((app) => !isUninstaller(app));

    appScanCache.apps = filteredApps;
    appScanCache.expiresAt = now + APP_SCAN_CACHE_TTL;
    return filteredApps;
  });

  ipcMain.on("open-app", (event, appPath) => {
    if (!appPath) return;

    if (appPath.startsWith("shell:AppsFolder\\")) {
      const { spawn } = require("child_process");
      spawn("explorer.exe", [appPath], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      }).unref();
      return;
    }

    if (fs.existsSync(appPath)) {
      shell.openPath(appPath);
    } else {
      shell.openExternal(appPath);
    }
  });

  ipcMain.handle("select-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "Applications", extensions: ["exe", "app", "lnk"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return result.filePaths[0] || null;
  });
}

module.exports = {
  registerAppsIpc,
  isUninstaller,
  getDesktopShortcuts,
  getStartMenuShortcuts,
  getRegistryApps,
  getMicrosoftStoreApps
};
