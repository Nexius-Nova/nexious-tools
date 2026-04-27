const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")

const rootDir = path.resolve(__dirname, "..")
const cliPath = path.join(
  rootDir,
  "node_modules",
  "electron-builder",
  "out",
  "cli",
  "cli.js"
)

if (!fs.existsSync(cliPath)) {
  console.error("未找到 electron-builder。")
  console.error("请先执行: pnpm install")
  console.error("如果依赖还未安装，请执行: pnpm add -D electron-builder")
  process.exit(1)
}

const args = [
  cliPath,
  "--config",
  path.join(rootDir, "electron-builder.json"),
  ...process.argv.slice(2)
]

const result = spawnSync(process.execPath, args, {
  cwd: rootDir,
  stdio: "inherit"
})

process.exit(result.status ?? 1)
