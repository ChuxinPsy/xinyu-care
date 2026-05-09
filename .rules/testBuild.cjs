const { spawnSync } = require('child_process')
const args = ['vite', 'build', '--minify', 'false', '--logLevel', 'error', '--outDir', '.dist']
const res = spawnSync('npx', args, { encoding: 'utf-8' })
const output = (res.stdout || '') + (res.stderr || '')
if (res.status !== 0) {
  if (output) console.log(output)
  process.exit(res.status)
}
process.exit(0)
