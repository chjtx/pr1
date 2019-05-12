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

module.exports = function () {
  const filter = createFilter(['/**/*.html', '/**/*.js', '/**/*.vue'])
  let css = []
  let count = 0
  const cacheScope = {}

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
          if (process.env.PR1_CONFIG_HTML_2_VUE_RENDER && fs.existsSync(id.replace(/\.js$/, '.html'))) {
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
            data: style,
            includePaths: [path.dirname(id)]
          }).css.toString()
        }
        if (regResult[2]) {
          isScoped = true
        }
      } else {
        html = code
      }

      if (!html) {
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
            ? `${script.replace(/export default([^{]+){/, (_, a) => 'export default' + a + '{\n  template:`' + html + '`,')}`
            : `export default \`${html}\``
        ].join('\n')
      } else {
        // 生产环境
        // 查找 style 和 html 里的静态资源
        style = findStatic(style, 'url', id)
        html = findStatic(html, 'src', id)
        // 缓存css
        css.push(style)
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
