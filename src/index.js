const fs = require('fs')
const path = require('path')

const client = fs.readFileSync(path.resolve(__dirname, './client.js')).toString()

function parseHTML (txt) {
  return txt.replace(/(<head>[\n\r]+)/, `$1  <script>\n${client.trim()}\n</script>\n`)
}

function parseModule (txt, url) {
  if (/\bimport\b|\bexport\b/.test(txt)) {
    txt = switchExport(switchImport(txt), url)
    txt = '(async function () {' + txt + '})()'
  }
  return txt
}

/* import 规则
 * 1) import { a, b, c } from './util.js'
 * 2) import { abc as a } from './util.js'
 * 3) import a from './util.js'
 * 4) import './util.js'
 * 5) import * as a from './util.js'
 */
function switchImport (txt) {
  return txt.replace(/import\s+(.+)\s+from\s+([^\n\r]+)/g, function (match, name, fromPath) {
    return `const ${name} = (await pr1.import(${fromPath})).default`
  })
}

/* export 规则
* 1) export var a = 'xxx'
* 2) export { a, b, c }
* 3) export function a () {}
* 4) export default a
* 5) export { abc as a }
* 6) export { default as d } from './util.js'
* 7) export class e {}
*/
function switchExport (txt, url) {
  // return txt.replace(/export\s+(var|let|const|class|function)?\s+?default a?/, (match, key, value) => {
  return txt.replace(/export default a/g, (match, key, value) => {
    // return `pr1.modules['${url}'].${key}` + (value ? ` = ${value}` : '')
    return `pr1.modules['${url}']={};pr1.modules['${url}'].default = a`
  })
}

module.exports = {
  parse (txt, isHTML, url) {
    return isHTML ? parseHTML(txt) : parseModule(txt, url)
  }
}
