const fs = require('fs')
const path = require('path')
const { appRootPath } = require('./tools.js')
const vueComponent = require('./rollup-plugins/rollup-plugin-pr1.js')
const cwd = process.cwd()

const pr1Plugins = [vueComponent()]

function parseModule (txt, url) {
  if (/\bimport\b|\bexport\b/.test(txt)) {
    txt = switchExport(switchImport(txt, url), url)
    txt = txt.replace(/\bmodule\.exports\s+=/, 'module.exports.default =')
  }
  return wrap(txt, url)
}

// 对于 html 这类资源只解释一次 export
function parseOnceExport (txt, url) {
  txt = txt.replace('export default', 'exports.default =')
  return wrap(txt, url)
}

function wrap (txt, url) {
  return `(async function (_import, module, exports) {${txt};Object.freeze(exports)})(pr1.import,(pr1.modules['${url}']={id:'${url}',exports:{}}),pr1.modules['${url}'].exports)`
}

function type1 (variable, filePath, url) {
  return `const ${variable} = await _import(${filePath}, '${url}')`
}

function type2 (variable, filePath, url) {
  const vars = variable.replace(/\{|\}/g, '').split(',').map(v => v.split(/\bas\b/))
  return `const { ${vars.map(v => v[0].trim() + ': ' + v[1].trim()).join(', ')} } = await _import(${filePath}, '${url}')`
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
  const imports = txt.match(/^( +)?\bimport\b[^\n\r]+/gm)
  if (!imports) {
    return txt
  }
  const results = imports.map(i => {
    return parseImport(i, url)
  })
  results.forEach(r => {
    txt = txt.replace(r.expression, `/* ${r.expression} */` + r.result)
  })
  return txt
}

function removeUnnecessary (rs) {
  return rs.slice(rs.indexOf('{'), rs.indexOf('}') + 1).replace(/( )?[^:{]+:/g, '')
}

/* export 规则
* 1) export var a = 'xxx'                     => exports.a = 'xxx'
* 2) export { a, b, c }                       => Object.assign(exports, {a, b, c})
* 3) export function a () {}                  => exports.a = a; function a () {}
* 4) export default a                         => exports.default = a
* 5) export { abc as a }                      => Object.assign(exports, {a: abc} = { a })
* 6) export class e {}                        => exports.e = e; class e {}
* 7) export { default as d } from './util.js' => Object.assign(exports, await (async () => { const { default: d } = await _import('./util.js'); return { d }})())
*/
function parseExport (i, url) {
  let result = ''
  let variable = i.replace(/(\s+)?\bexport\b\s+/, '')

  variable = variable.trim()

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
    result = `exports.${variable.replace(reg1, '')}`
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
    vari = vari.slice(0, vari.indexOf(' '))
    result = `exports.${variable.replace(reg3, '').split(' ')[0]} = ${vari}; ${variable}`
  }
  // 2) 5)
  if (variable[0] === '{') {
    if (/\bas\b/.test(variable)) {
      const vars = variable.replace(/\{|\}/g, '').split(',').map(v => v.split(/\bas\b/))
      variable = vars.map(v => v[0].trim() + ': ' + v[1].trim()).join(', ')
    }
    result = `Object.assign(exports, ${variable})`
  }
  return {
    expression: i,
    result
  }
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
    txt = txt.replace(r.expression, `/* ${r.expression} */` + r.result)
  })
  return txt
}

module.exports = {
  parsePr1: async function (code, url, config) {
    const id = path.resolve(cwd, '.' + url)
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
    return /\.(vue|js)$/.test(url) ? parseModule(code, url) : parseOnceExport(code, url)
  },
  parseNode (url) {
    const p = path.resolve(appRootPath, 'node_modules', url)
    if (fs.existsSync(p)) {
      return parseModule(fs.readFileSync(p).toString(), url)
    }
    return false
  }
}
