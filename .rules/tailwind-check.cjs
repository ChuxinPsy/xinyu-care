const { spawnSync } = require('child_process')
const outTarget = process.platform === 'win32' ? 'NUL' : '/dev/null'
const res = spawnSync('npx', ['tailwindcss', '-i', './src/index.css', '-o', outTarget], { encoding: 'utf-8' })
const output = (res.stdout || '') + (res.stderr || '')
const lines = output.split(/\r?\n/)
const re = /^(CssSyntaxError|Error):.*/
const matches = lines.filter(l => re.test(l))
if (matches.length) {
  console.log(matches.join('\n'))
}
process.exit(0)
