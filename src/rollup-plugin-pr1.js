const fs = require('fs-extra')
const CleanCSS = require('clean-css')
const { createFilter } = require('rollup-pluginutils')
const cwd = process.cwd()

function addStyleScope (str, scope) {
  const arr = str.split(/\s+/)
  return arr.map(i => {
    const s = i.split(':')
    return s[0].trim() + `[${scope}]` + (s[1] ? ':' + s[1].trim() : '')
  }).join(' ')
}

module.exports = function (options) {
  const filter = createFilter(['/**/*.html'])
  const css = []
  let count = 0

  return {
    name: 'pr1',
    transform (code, id) {
      if (!filter(id)) {
        return
      }
      const pathId = id.replace(cwd, '').replace(/\\/g, '/')

      // 分离style和html
      const regResult = /<style>([\s\S]+)?<\/style>/.exec(code)
      let style = ''
      let html = ''

      if (regResult) {
        style = regResult[1].trim()
        html = code.replace(regResult[0], '').trim()
      }

      if (html) {
        count++
      } else {
        return
      }

      // 给第一个dom注入pathId
      html = html.replace(/^(<[a-zA-Z]+ )/, (match, tag) => {
        return `${tag}pr1-path="${pathId}" `
      })

      const scope = 'x' + count
      style = style.replace(/([#a-zA-Z-_.@][^{}]+)\{/g, function (match, selector) {
        if (selector.trim() === 'from' || selector.trim() === 'to' || /^@/.test(selector)) {
          return match
        } else {
          return selector.trim().split(',').map(i => addStyleScope(i, scope)).join(', ') + ' {'
        }
      })

      // html添加作用域
      if (style) {
        html = html.replace(/(<[^>]+)(\/?)>/gm, function (match, start) {
          if (/^<slot/.test(start) || /<\/[a-zA-Z_-]+>/.test(match)) {
            return match
          }
          if (start.lastIndexOf('/') === start.length - 1) {
            return start.slice(0, -1) + ' ' + scope + '/>'
          } else {
            return start.trimRight() + ' ' + scope + '>'
          }
        })
      }

      if (process.env.NODE_ENV === 'development') {
        // 开发环境
        return [
          `pr1.injectStyle(${JSON.stringify(style)}, '${pathId}')`,
          `export default ${JSON.stringify(html)}`
        ].join('\n')
      } else {
        // 生产环境
        css.push(style)
        return `export default ${JSON.stringify(html)}`
      }
    },
    generateBundle (outputOptions) {
      const cssPath = outputOptions.file.replace(/\.js$/, '.css')
      const output = new CleanCSS(options).minify(css.join('\n'))
      fs.writeFileSync(cssPath, output.styles)
    }
  }
}
