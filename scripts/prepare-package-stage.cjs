const fs = require("fs")
const path = require("path")

const rootDir = path.resolve(__dirname, "..")
const stageDir = path.join(rootDir, ".packaging", "app")

function ensureExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} 不存在: ${targetPath}`)
  }
}

function resetDir(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true })
  fs.mkdirSync(targetPath, { recursive: true })
}

function copyDir(source, target) {
  fs.cpSync(source, target, { recursive: true })
}

function writeStagePackageJson() {
  const rootPackageJsonPath = path.join(rootDir, "package.json")
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, "utf8"))

  const stagePackageJson = {
    name: rootPackageJson.name,
    productName: "Nexious Tools",
    version: rootPackageJson.version,
    description: rootPackageJson.description,
    author: rootPackageJson.author,
    license: rootPackageJson.license,
    main: "electron/main.cjs"
  }

  fs.writeFileSync(
    path.join(stageDir, "package.json"),
    `${JSON.stringify(stagePackageJson, null, 2)}\n`,
    "utf8"
  )
}

function preparePackageStage() {
  const distDir = path.join(rootDir, "dist")
  const distServerDir = path.join(rootDir, "dist-server")
  const electronDir = path.join(rootDir, "electron")
  const iconExtractorDir = path.join(rootDir, "node_modules", "icon-extractor")

  ensureExists(distDir, "前端构建产物 dist")
  ensureExists(distServerDir, "后端构建产物 dist-server")
  ensureExists(electronDir, "Electron 目录")
  ensureExists(iconExtractorDir, "icon-extractor 运行时资源")

  resetDir(stageDir)
  copyDir(electronDir, path.join(stageDir, "electron"))
  copyDir(distDir, path.join(stageDir, "dist"))
  writeStagePackageJson()
}

preparePackageStage()
