const fs = require('fs-extra')
const path = require('path')
const CleanCSS = require('clean-css')
const { createFilter } = require('rollup-pluginutils')
const compiler = require('vue-template-compiler')
const { compileTemplate } = require('@vue/component-compiler-utils')
const pug = require('pug')
const sass = require('node-sass')
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

function releaseVueTemplate (html) {
  let template = ''
  let script = ''
  const tpl = /<template( lang="pug")?>([\s\S]+)?<\/template>/.exec(html)
  if (tpl) {
    // if (tpl[1]) pug === true
    template = (tpl[1] ? pug.compile(tpl[2])() : tpl[1]) || html
  }
  const spt = /<script( lang="ts")?>([\s\S]+)?<\/script>/.exec(html)
  if (spt) {
    script = spt[2]
  }
  return [template, script]
}

module.exports = function () {
  const filter = createFilter(['/**/*.html', '/**/*.js', '/**/*.vue'])
  let css = []
  let count = 0

  return {
    name: 'pr1',
    transform (code, id) {
      if (!filter(id)) {
        return
      }
      if (/\.js$/.test(id)) {
        // 替换 process.env.NODE_ENV
        code = code.replace(/\bprocess\.env\.NODE_ENV\b/g, `'${process.env.NODE_ENV}'`)
        // 生产环境
        if (process.env.NODE_ENV === 'production') {
          // 删除 pr1 ignore
          code = code.replace(/\/\/ pr1 ignore\+\+([\s\S]+)?\/\/ pr1 ignore--/g, '')
          // 转为render函数
          if (fs.existsSync(id.replace(/\.js$/, '.html'))) {
            code = code.replace(/template: html/, 'render: html.render,\nstaticRenderFns: html.staticRenderFns')
          }
        }
        return code
      }

      const isVue = /\.vue$/.test(id) // .vue文件
      let isScoped = false
      let script = ''
      const pathId = id.replace(cwd, '').replace(/\\/g, '/')

      // 分离style和html
      const regResult = /<style( lang="sass")?( scoped)?>([\s\S]+)?<\/style>/.exec(code)
      let style = ''
      let html = ''

      if (regResult) {
        style = regResult[3].trim()
        html = code.replace(regResult[0], '').trim()
        if (regResult[1]) {
          // sass
          style = sass.renderSync({
            data: style
          }).css.toString()
        }
        if (regResult[2]) {
          isScoped = true
        }
      } else {
        html = code
      }

      if (html) {
        count++
        if (isVue) {
          [html, script] = releaseVueTemplate(html)
        }
      } else {
        return
      }

      // style作用域
      const scope = 'x' + count
      if (isScoped) {
        style = style.replace(/([#a-zA-Z-_.@][^{}]+)\{/g, function (match, selector) {
          if (selector.trim() === 'from' || selector.trim() === 'to' || /^@/.test(selector)) {
            return match
          } else {
            return selector.trim().split(',').map(i => addStyleScope(i, scope)).join(', ') + ' {'
          }
        })
      }

      // html添加作用域
      if (isScoped && style) {
        html = html.replace(/(<[^>]+)(\/?)>/gm, (match, start) => addHTMLScope(match, start, scope))
      }

      if (process.env.NODE_ENV === 'development') {
        // 开发环境
        // 给第一个dom注入pathId
        html = html.replace(/^(<[a-zA-Z]+ )/, (match, tag) => {
          return `${tag}pr1-path="${pathId}" `
        })
        return [
          `pr1.injectStyle(${JSON.stringify(style)}, '${pathId}')`,
          isVue
            ? `${script.replace('export default {', 'export default {\n  template:' + JSON.stringify(html) + ',')}`
            : `export default ${JSON.stringify(html)}`
        ].join('\n')
      } else {
        // 生产环境
        // 缓存css
        css.push(style)
        // html转成render函数
        if ((fs.existsSync(id.replace(/\.html$/, '.js'))) || isVue) {
          const compiled = compileTemplate({
            source: html,
            filename: '',
            compiler,
            transformAssetUrls: '',
            isFunctional: false,
            isProduction: true,
            optimizeSSR: false
          })
          return isVue
            ? compiled.code + `\n${script.replace('export default {', 'export default {\n  render: render,\n  staticRenderFns: staticRenderFns,\n')}`
            : compiled.code + '\nexport default {render, staticRenderFns};'
        }
        return `export default ${JSON.stringify(html)}`
      }
    },
    generateBundle (outputOptions) {
      const cssPath = outputOptions.file.replace(/\.js$/, '.css')
      if (css.length) {
        const output = new CleanCSS().minify(css.join('\n'))
        fs.ensureDirSync(path.dirname(cssPath))
        fs.writeFileSync(cssPath, output.styles)
        css = []
      }
    }
  }
}
