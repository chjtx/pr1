const fs = require('fs')
const path = require('path')
const { appRootPath } = require('./tools.js')
const vueComponent = require('./rollup-plugins/rollup-plugin-pr1.js')

const pr1Plugins = [vueComponent()]

function parseModule (txt, url) {
  let dealUrl = url
  if (url.indexOf('node_modules') > -1) {
    // 判断是文件夹则加上 index.js
    try {
      if (fs.lstatSync(path.resolve(appRootPath, url)).isDirectory()) {
        dealUrl = url + '/index.js'
      }
    } catch (e) { }
  }
  if (/\bimport\b|\bexport\b/.test(txt)) {
    txt = switchExport(switchImport(txt, dealUrl), dealUrl)
    txt = txt.replace(/\bmodule\.exports\s+=/, 'module.exports.default =')
  }
  if (/\brequire\(/.test(txt)) {
    txt = parseRequire(txt, dealUrl)
  }
  return wrap(txt, url)
}

function parseRequire (txt, url) {
  return txt.replace(/\brequire\(([^)]+)\)/g, (_, filePath) => {
    return `/* ${_} */await _import(${filePath}, '${url}')`
  })
}

// 对于 html 这类资源只解释一次 export
function parseOnceExport (txt, url) {
  txt = txt.replace('export default', 'exports.default =')
  return wrap(txt, url)
}

function wrap (txt, url) {
  return `(async function (_import, module, exports) {${txt};\nObject.freeze(exports)})(pr1.import,(pr1.modules['${url}']={id:'${url}',exports:{}}),pr1.modules['${url}'].exports)`
}

function type1 (variable, filePath, url) {
  return `const ${variable} = await _import(${filePath}, '${url}')`
}

function type2 (variable, filePath, url) {
  const vars = variable.replace(/\{|\}/g, '').split(',').map(v => v.split(/\bas\b/))
  return `const { ${vars.map(v => v[0].trim() + (v[1] ? ': ' + v[1].trim() : '')).join(', ')} } = await _import(${filePath}, '${url}')`
}

function type3 (variable, filePath, url) {
  return `const { default: ${variable} } = await _import(${filePath}, '${url}')`
}

function type5 (variable, filePath, url) {
  return `const ${variable.split(/\bas\b/)[1].trim()} = await _import(${filePath}, '${url}')`
}

function type6 (res, def) {
  return res.replace('const {', `const { default: ${def},`)
}

/* import 规则
 * 1) import { a, b, c } from './util.js'             => const { a, b, c } = await _import('./util.js')
 * 2) import { abc as a, efg as b } from './util.js'  => const { abc: a, efg: b } = await _import('./util.js')
 * 3) import a from './util.js'                       => const { default: a } = await _import('./util.js')
 * 4) import './util.js'                              => await _import('./util.js')
 * 5) import * as a from './util.js'                  => const a = await _import('./util.js')
 * 6) import a, { efg as b, c } from './util.js'      => const { default: a, efg: b, c } = await _import('./util.js')
 */
function parseImport (i, url) {
  let result = ''
  let [variable, filePath] = i.replace(/(\s+)?\bimport\b\s+/, '').split(/\bfrom\b/)
  if (!filePath) {
    filePath = variable.trim().replace(/;/g, '')
    // 4)
    return {
      expression: i,
      result: `await _import(${filePath}, '${url}')`
    }
  } else {
    variable = variable.trim()
    filePath = filePath.trim().replace(/;/g, '')
  }

  const leftIndex = variable.indexOf('{')
  if (/\bas\b/.test(variable)) {
    if (variable[0] === '{') {
      // 2)
      result = type2(variable, filePath, url)
    } else if (leftIndex > 0) {
      // 6
      const def = variable.slice(0, variable.indexOf(','))
      result = type6(type2(variable.slice(leftIndex), filePath, url), def)
    } else {
      // 5)
      result = type5(variable, filePath, url)
    }
  } else {
    if (variable[0] === '{') {
      // 1)
      result = type1(variable, filePath, url)
    } else if (leftIndex > 0) {
      // 6
      const def = variable.slice(0, variable.indexOf(','))
      result = type6(type1(variable.slice(leftIndex), filePath, url), def)
    } else {
      // 3)
      result = type3(variable, filePath, url)
    }
  }

  return {
    expression: i,
    result
  }
}

function switchImport (txt, url) {
  const imports = txt.match(/^( +)?\bimport\b[^'"]+('|")[^'"]+('|")/gm)
  if (!imports) {
    return txt
  }
  const results = imports.map(i => {
    return parseImport(i, url)
  })
  results.forEach(r => {
    txt = replaceText(txt, r.expression, `/* ${r.expression} */` + r.result)
  })
  return txt
}

function removeUnnecessary (rs) {
  return rs.slice(rs.indexOf('{'), rs.indexOf('}') + 1).replace(/( )?[^:{]+:/g, '')
}

/* export 规则
* 1) export var a = 'xxx'                     => var a = exports.a = 'xxx'
* 2) export { a, b, c }                       => Object.assign(exports, {a, b, c})
* 3) export function a () {}                  => exports.a = a; function a () {}
* 4) export default a                         => exports.default = a
* 5) export { abc as a }                      => Object.assign(exports, {a: abc} = { a })
* 6) export class e {}                        => exports.e = e; class e {}
* 7) export { default as d } from './util.js' => Object.assign(exports, await (async () => { const { default: d } = await _import('./util.js'); return { d }})())
*/
function parseExport (i, url) {
  let result = ''
  let notClosed = false
  let variable = i.replace(/(\s+)?\bexport\b\s+/, '')

  variable = variable.trim().replace(/;/g, '')

  // 7)
  if (/\bfrom\b/.test(variable)) {
    const rs = parseImport(variable, url)
    return {
      expression: i,
      result: `Object.assign(exports, await (async () => {${rs.result}; return ${removeUnnecessary(rs.result)}})())`
    }
  }
  // 1)
  const reg1 = /^(var|let|const)\s+/
  if (reg1.test(variable)) {
    result = `${variable.slice(0, variable.indexOf('='))}= exports.${variable.replace(reg1, '')}`
  }
  // 4)
  const reg2 = /^default\s+/
  if (reg2.test(variable)) {
    result = `exports.default = ${variable.replace(reg2, '')}`
  }
  // 3) 6)
  const reg3 = /^(function|class)\s+/
  if (reg3.test(variable)) {
    let vari = variable.replace(reg3, '')
    vari = vari.slice(0, vari.indexOf('('))
    result = `exports.${vari} = ${vari}; ${variable}`
  }
  // 2) 5)
  if (variable[0] === '{') {
    if (/\bas\b/.test(variable)) {
      const vars = variable.replace(/\{|\}/g, '').split(',').map(v => v.split(/\bas\b/))
      variable = vars.map(v => v[0].trim() + ': ' + v[1].trim()).join(', ')
    }
    result = `Object.assign(exports, ${variable}`
    if (variable[variable.length - 1] === '}') {
      result = result + ')'
    } else {
      notClosed = true
    }
  }
  return {
    expression: i,
    result,
    notClosed
  }
}

// 不使用 String 的 replace 原生方法避免 txt 出现 $& $$ $` $' 时出错
function replaceText (txt, a, b) {
  const i = txt.indexOf(a)
  return txt.slice(0, i) + b + txt.slice(i + a.length)
}

function switchExport (txt, url) {
  const exportx = txt.match(/^( +)?\bexport\b[^\n\r]+/gm)
  if (!exportx) {
    return txt
  }
  const results = exportx.map(i => {
    return parseExport(i, url)
  })
  results.forEach(r => {
    if (r.notClosed) {
      // 找到最近的一个 } 后面加 )
      let index = txt.indexOf(r.expression) + r.expression.length
      while (txt[index] && txt[index] !== '}') {
        index++
      }
      txt = txt.slice(0, index + 1) + ')' + txt.slice(index + 1)
    }
    txt = replaceText(txt, r.expression, `/* ${r.expression} */` + r.result)
  })
  return txt
}

async function parsePr1 (code, url, id, config) {
  // 执行rollup插件的transform
  if (config && config.rollupConfig && config.rollupConfig.plugins) {
    code = await [...pr1Plugins, ...config.rollupConfig.plugins].reduce(async (code, plugin) => {
      if (typeof plugin.transform === 'function') {
        const result = await plugin.transform(await code, id)
        if (result) {
          return result.code ? result.code : result
        }
      }
      return code
    }, code)
  }
  return /\.(html|htm|css)$/.test(url) ? parseOnceExport(code, url) : parseModule(code, url)
}

async function parseNode (url, config) {
  try {
    const p = path.resolve(appRootPath, 'node_modules', url)
    if (fs.existsSync(p)) {
      return parsePr1(fs.readFileSync(p).toString(), 'node_modules/' + url, p, config)
    }
  } catch (e) {
    return false
  }
  return false
}

module.exports = { parsePr1, parseNode }
