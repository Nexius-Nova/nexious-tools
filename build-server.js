import esbuild from 'esbuild'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const outDir = path.join(__dirname, 'dist-server')

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true })
}
fs.mkdirSync(outDir, { recursive: true })

await esbuild.build({
  entryPoints: [path.join(__dirname, 'server/index.js')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(outDir, 'server.cjs'),
  external: [],
  define: {
    'import.meta.url': '""'
  },
  inject: []
})

const sqlJsDist = path.join(__dirname, 'node_modules/sql.js/dist')
const targetSqlJs = path.join(outDir, 'sql.js-dist')
if (fs.existsSync(sqlJsDist)) {
  fs.cpSync(sqlJsDist, targetSqlJs, { recursive: true })
}

console.log('Server bundled successfully!')
