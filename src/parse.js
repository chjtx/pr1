const fs = require('fs')
const path = require('path')
const cwd = process.cwd()

function parseModule (txt, url) {
  if (/\bimport\b|\bexport\b/.test(txt)) {
    txt = switchExport(switchImport(txt, url), url)
    txt = txt.replace(/\bmodule\.exports\s+=/, 'module.exports.default =')
    txt = `(async function (_import, module, exports) {${txt}})(pr1.import,(pr1.modules['${url}']={id:'${url}',exports:{}}),pr1.modules['${url}'].exports)`
  }
  return txt
}

/* import 规则
 * 1) import { a, b, c } from './util.js'             => const { a, b, c } = await pr1.import('./util.js')
 * 2) import { abc as a, efg as b } from './util.js'  => const { abc: a, efg: b } = await pr1.import('./util.js')
 * 3) import a from './util.js'                       => const { default: a } = await pr1.import('./util.js')
 * 4) import './util.js'                              => await pr1.import('./util.js')
 * 5) import * as a from './util.js'                  => const a = await pr1.import('./util.js')
 * 以下未实现
 * 6) import a, { b, c } from './util.js'             => const { default: a, b, c } = await pr1.import('./util.js')
 */
function switchImport (txt, url) {
  const imports = txt.match(/^(\s+)?\bimport\b[^\n\r]+/gm)
  if (!imports) {
    return txt
  }
  const results = imports.map(i => {
    let result = ''
    let [variable, filePath] = i.replace(/(\s+)?\bimport\b\s+/, '').split(/\bfrom\b/)
    if (!filePath) {
      filePath = variable.trim()
      // 4)
      result = `await _import(${filePath}, '${url}')`
    } else {
      variable = variable.trim()
      filePath = filePath.trim()
    }

    if (/\bas\b/.test(variable)) {
      if (variable[0] === '{') {
        // 2)
        const vars = variable.replace(/\{|\}/g, '').split(',').map(v => v.split(/\bas\b/))
        result = `const { ${vars.map(v => v[0].trim() + ': ' + v[1].trim()).join(', ')} } = await _import(${filePath}, '${url}')`
      } else {
        // 5)
        result = `const ${variable.split(/\bas\b/)[1].trim()} = await _import(${filePath}, '${url}')`
      }
    } else {
      if (variable[0] === '{') {
        // 1)
        result = `const ${variable} = await _import(${filePath}, '${url}')`
      } else {
        // 3)
        result = `const { default: ${variable} } = await _import(${filePath}, '${url}')`
      }
    }

    return {
      expression: i,
      result
    }
  })
  results.forEach(r => {
    txt = txt.replace(r.expression, r.result)
  })
  return txt
}

/* export 规则
* 1) export var a = 'xxx'                     => pr1.modules['/xx.js'].a = 'xxx'
* 2) export { a, b, c }                       => Object.assign(pr1.modules['/xx.js'], {a, b, c})
* 3) export function a () {}                  => pr1.modules['/xx.js'].a = function a () {}
* 4) export default a                         => pr1.modules['/xx.js'].default = a
* 5) export { abc as a }                      => Object.assign(pr1.modules['/xx.js'], {a: abc} = { a })
* 6) export class e {}                        => pr1.modules['/xx.js'].e = class e {}
* 以下未实现
* 7) export { default as d } from './util.js' => Object.assign(pr1.modules['/xx.js'], {default: d} = await _import('./util.js'))
*/
function switchExport (txt, url) {
  const exportx = txt.match(/^(\s+)?\bexport\b[^\n\r]+/gm)
  if (!exportx) {
    return txt
  }
  const results = exportx.map(i => {
    let result = ''
    let variable = i.replace(/(\s+)?\bexport\b\s+/, '')

    variable = variable.trim()

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
      result = `exports.${variable.replace(reg3, '').split(' ')[0]} = ${variable}`
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
  })
  // results[0].result = `pr1.modules['${url}']={};` + results[0].result
  results.forEach(r => {
    txt = txt.replace(r.expression, r.result)
  })
  return txt
}

// 查找app根目录
function findAppRootPath () {
  let currentPath = cwd
  while (currentPath !== '/' && !/^[a-zA-Z]:\\$/.test(currentPath)) {
    if (fs.existsSync(path.resolve(currentPath, 'package.json'))) {
      return currentPath
    }
    currentPath = path.resolve(currentPath, '..')
  }
  return null
}

const appRootPath = findAppRootPath()

module.exports = {
  parsePr1: async function (code, url, config) {
    const id = path.resolve(cwd, '.' + url)
    // 执行rollup插件的transform
    if (config && config.rollupConfig && config.rollupConfig.plugins) {
      code = await config.rollupConfig.plugins.reduce(async (code, plugin) => {
        if (typeof plugin.transform === 'function') {
          const result = await plugin.transform(await code, id)
          if (result) {
            return result.code ? result.code : result
          }
        }
        return code
      }, code)
    }
    return parseModule(code, url)
  },
  parseNode (url) {
    const p = path.resolve(appRootPath, 'node_modules', url)
    if (fs.existsSync(p)) {
      return parseModule(fs.readFileSync(p).toString(), url)
    }
  },
  appRootPath
}
