const fs = require('fs-extra')
const CleanCSS = require('clean-css')
const { createFilter } = require('rollup-pluginutils')
const compiler = require('vue-template-compiler')
const { compileTemplate } = require('@vue/component-compiler-utils')
const cwd = process.cwd()

function addStyleScope (str, scope) {
  const arr = str.split(/\s+/)
  return arr.map(i => {
    const s = i.split(':')
    return s[0].trim() + `[${scope}]` + (s[1] ? ':' + s[1].trim() : '')
  }).join(' ')
}

function addHTMLScope (match, start, scope) {
  if (/^<slot/.test(start) || /<\/[a-zA-Z_-]+>/.test(match)) {
    return match
  }
  if (start.lastIndexOf('/') === start.length - 1) {
    return start.slice(0, -1) + ' ' + scope + '/>'
  } else {
    return start.trimRight() + ' ' + scope + '>'
  }
}

module.exports = function (options) {
  const filter = createFilter(['/**/*.html', '/**/*.js', '/**/*.vue'])
  const css = []
  let count = 0

  return {
    name: 'pr1',
    transform (code, id) {
      if (!filter(id)) {
        return
      }
      if (/\.js$/.test(id)) {
        // 开发环境直接跳过
        if (process.env.NODE_ENV === 'development') {
          return
        } else if (fs.existsSync(id.replace(/\.js$/, '.html'))) {
          // 生产环境转为render函数
          return code.replace(/template: html/, 'render: html.render,\nstaticRenderFns: html.staticRenderFns')
        }
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
        html = html.replace(/(<[^>]+)(\/?)>/gm, (match, start) => addHTMLScope(match, start, scope))
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
        if (fs.existsSync(id.replace(/\.html$/, '.js'))) {
          // html转成render函数
          const compiled = compileTemplate({
            source: html,
            filename: '',
            compiler,
            transformAssetUrls: '',
            isFunctional: false,
            isProduction: true,
            optimizeSSR: false
          })
          return compiled.code + '\nexport default {render, staticRenderFns};'
        }
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
