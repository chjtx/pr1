const fs = require('fs-extra')
const path = require('path')
const CleanCSS = require('clean-css')
const { createFilter } = require('rollup-pluginutils')
const compiler = require('vue-template-compiler')
const { compileTemplate } = require('@vue/component-compiler-utils')
const { getShortMd5 } = require('../tools.js')
const pug = require('pug')
const sass = require('node-sass')
const cwd = process.cwd()

function addStyleScope (str, scope) {
  const arr = str.split(/\s+/)
  return arr.map(i => {
    const colon = i.indexOf('::') > -1 ? '::' : ':'
    const s = i.split(colon)
    return s[0].trim() + `[${scope}]` + (s[1] ? colon + s[1].trim() : '')
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
  const tpl = /<template( lang="pug")?>([\s\S]+)<\/template>/.exec(html)
  if (tpl) {
    // if (tpl[1]) 即 pug === true
    template = tpl[1] ? pug.compile(tpl[2])() : tpl[2]
  }
  const spt = /<script( lang="ts")?( type="[^"]*")?>([\s\S]*?)<\/script>/.exec(html)
  if (spt) {
    script = spt[3]
  }
  return [template, script]
}

function findStatic (assets, type, id) {
  let content = assets
  let matches = []
  let urls = []
  if (type === 'url') {
    content = content.replace(/\/\*([\s\S]+)?\*\//g, '')
    matches = content.match(/url([^)]+)/g)
    if (!matches) {
      return assets
    }
    urls = matches.map(i => {
      return i.replace(/^url\(("|')?/, '').replace(/("|')?\)$/, '')
    })
  } else {
    content = content.replace(/<!--([\s\S]+)?-->/g, '')
    // src="abc def/g.img"
    matches = content.match(/src=("|')([^"']+)\1/g) || []
    // src=g.img 没引号
    matches = matches.concat(content.match(/src=([^"' ]+)/g) || [])
    if (matches.length === 0) {
      return assets
    }
    urls = matches.map(i => {
      return i.replace(/^src=("|')?/, '').replace(/("|')$/, '')
    })
  }
  const replaceArray = resolveStatic(urls, id)
  replaceArray.forEach(i => {
    content = content.replace(i[0], i[1])
  })
  return content
}

function resolveStatic (urls, id) {
  const replaceArray = []
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].split('?')[0]
    let originPath = url.indexOf('/') === 0
      // 使用绝对路径相对于入口 index.html
      ? path.resolve(cwd, '.' + url)
      // 使用相对路径相对于当前文件
      : path.resolve(path.dirname(id), url)
    if (fs.existsSync(originPath)) {
      const ext = path.extname(url)
      const file = fs.readFileSync(originPath)
      const targetPath = url.indexOf('/') === 0
        ? path.resolve(process.env.PR1_CONFIG_TARGET, '.' + url)
        : path.resolve(process.env.PR1_CONFIG_TARGET +
          (originPath.replace(cwd, '').replace(/\\/g, '/')
            .replace(url.slice(url.indexOf('/')), '')
          ), url)
      if (/\.(png|jpg|jpeg|gif)/.test(ext) && fs.lstatSync(originPath).size < 4096) {
        const image = file.toString('base64')
        let data = `data:image/${ext.slice(1)};base64,${image}`
        replaceArray.push([urls[i], data])
      } else {
        replaceArray.push([urls[i], urls[i] + (urls[i].indexOf('?') > -1 ? '&' : '?') + getShortMd5(file)])
        fs.copySync(originPath, targetPath)
      }
    }
  }
  return replaceArray
}

function returnJS (code, id) {
  // 替换 process.env.NODE_ENV
  code = code.replace(/\bprocess\.env\.NODE_ENV\b/g, `'${process.env.NODE_ENV}'`)
  // 生产环境
  if (process.env.NODE_ENV === 'production') {
    // 删除 pr1 ignore
    code = code.replace(/\/\/ pr1 ignore\+\+([\s\S]+)?\/\/ pr1 ignore--/g, '')
    // 转为render函数
    if (process.env.PR1_CONFIG_HTML_2_VUE_RENDER && fs.existsSync(id.replace(/\.js$/, '.html'))) {
      code = code.replace(/template: html/, 'render: html.render,\nstaticRenderFns: html.staticRenderFns')
    }
  }
  return code
}

module.exports = function () {
  const filter = createFilter(['/**/*.html', '/**/*.js', '/**/*.ts', '/**/*.vue', '/**/*.sass', '/**/*.css'])
  let css = []
  let count = 0
  const cacheScope = {}

  return {
    name: 'pr1',
    transform (code, id) {
      if (!filter(id)) {
        return
      }

      const isJs = /(\.js|\.ts)$/.test(id) // .js 文件
      const isVue = /\.vue$/.test(id) // .vue 文件
      const isHtml = /\.html$/.test(id) // .vue 文件
      const isCss = /\.css$/.test(id) // .css 文件
      const isSass = /\.sass$/.test(id) // .sass 文件
      const pathId = (id.indexOf('node_modules') > -1
        ? id.slice(id.indexOf('node_modules'))
        : id.replace(cwd, '')).replace(/\\/g, '/')
      const style = []
      let script = ''

      if (isJs) {
        return returnJS(code, id)
      }

      if (isCss) {
        if (process.env.NODE_ENV === 'development') {
          return `pr1.injectStyle(${JSON.stringify(code)}, '${pathId}')`
        } else {
          style.push({
            css: code,
            scoped: false
          })
        }
      }

      if (isSass) {
        const _css = sass.renderSync({
          data: code,
          includePaths: [path.dirname(id)]
        }).css.toString()
        if (process.env.NODE_ENV === 'development') {
          return `pr1.injectStyle(${JSON.stringify(_css)}, '${pathId}')`
        } else {
          style.push({
            css: _css,
            scoped: false
          })
        }
      }

      // 分离style和html
      const reg = /<style( lang="sass")?( scoped)?>([\s\S]*?)<\/style>/g
      let regResult = null
      let html = code
      while ((regResult = reg.exec(code))) {
        let singleCss = regResult[3].trim()
        html = html.replace(regResult[0], '').trim()
        if (regResult[1]) {
          // sass
          singleCss = sass.renderSync({
            data: singleCss,
            includePaths: [path.dirname(id)]
          }).css.toString()
        }
        style.push({
          css: singleCss,
          scoped: regResult[2]
        })
      }

      if (isVue && !html) {
        return
      }
      if (isVue) {
        [html, script] = releaseVueTemplate(html)
      }

      // style作用域
      let scope = ''
      if (cacheScope[pathId]) {
        scope = cacheScope[pathId]
      } else {
        count++
        scope = 'x' + count
        cacheScope[pathId] = scope
      }

      style.forEach(s => {
        s.css = s.css.trim()
          // 去掉注释
          .replace(/\/\*[\s\S]+?\*\//g, '')
          // 删除空行
          .replace(/[\n\r]+/g, '\n')

        if (s.scoped) {
          // scoped
          s.css = s.css.replace(/([#a-zA-Z-_.@][^{}]+)\{/g, function (match, selector) {
            if (selector.trim() === 'from' || selector.trim() === 'to' || /^@/.test(selector)) {
              return match
            } else {
              return selector.trim().split(',').map(i => addStyleScope(i, scope)).join(', ') + ' {'
            }
          })

          // html添加作用域
          html = html.replace(/(<[^>]+)(\/?)>/gm, (match, start) => addHTMLScope(match, start, scope))
        } else if (isHtml || isVue) {
          // noscoped
          const tag = scope.replace('x', 'y')
          s.css = s.css
            // 以.#[*和字母开头的选择器前面加上 scope 标识
            .replace(/(^|{|})\s*([.#a-zA-Z[*][^{}]+)?{/g, function (match, m1, m2) {
              var selector = (m2 || '').trim()
              // from和to是@keyframes的关键词，不能替换
              if (selector === 'from' || selector === 'to') {
                return match
              }
              return (m1 || '') + '\n[' + tag + '] ' + selector + ' {'
            })
            // 将属性的逗号用<mark>保存，避免下一步误操作，例：background: rgba(0, 0, 0, .3);
            .replace(/:[^;}]+(;|\})/g, function (match) {
              return match.replace(/,/g, '<mark>')
            })
            // 拆分用逗号分隔的选择符并加上jtaro标识，例：h1, h2, h3 {}
            .split(/,\s+(?=[.#a-zA-Z[*])/).join(',\n[' + tag + '] ')
            // 还原<mark>
            .replace(/<mark>/g, ',')
            // 去掉this
            .replace(/\s+this(?=\s+)?/g, '') + '\n'

          // html添加作用域
          html = html.replace(/^<\w+(?= |>)/, function (match) {
            return match + ' ' + tag + ' '
          })
        }
      })

      if (process.env.NODE_ENV === 'development') {
        // 开发环境
        // 给第一个dom注入pathId
        html = html.replace(/^(<[a-zA-Z]+ )/, (match, tag) => {
          return `${tag}pr1-path="${pathId}" `
        })
        return [
          `pr1.injectStyle(${JSON.stringify(style.map(i => i.css).join('\n'))}, '${pathId}')`,
          isVue
            ? `${script.replace(/export default([^{]+){/, (_, a) => 'export default' + a + '{\n  template:' + JSON.stringify(html) + ',')}`
            : `export default ${JSON.stringify(html)}`
        ].join('\n')
      } else {
        // 生产环境
        // 查找 style 和 html 里的静态资源
        style.forEach(s => {
          s.css = findStatic(s.css, 'url', id)
        })
        html = findStatic(html, 'src', id)
        // 缓存css
        css = css.concat(style.map(i => i.css))
        // html转成render函数
        if ((process.env.PR1_CONFIG_HTML_2_VUE_RENDER && fs.existsSync(id.replace(/\.html$/, '.js'))) || isVue) {
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
            ? compiled.code + `\n${script.replace(/export default([^{]+){/, (_, a) => 'export default' + a + '{\n  render: render,\n  staticRenderFns: staticRenderFns,\n')}`
            : compiled.code + '\nexport default {render, staticRenderFns};'
        }
        return `export default ${JSON.stringify(html)}`
      }
    },
    generateBundle: async function (outputOptions) {
      const cssPath = outputOptions.file.replace(/\.js$/, '.css')
      if (css.length) {
        // 打包 css 文件
        const output = new CleanCSS().minify(css.join('\n'))
        fs.ensureDirSync(path.dirname(cssPath))
        fs.writeFileSync(cssPath, output.styles)
        css = []
      }
    }
  }
}
