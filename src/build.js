const rollup = require('rollup')
const path = require('path')
const babel = require('@babel/core')
const uglify = require('uglify-js')
const fs = require('fs-extra')
const crypto = require('crypto')
const { appRootPath } = require('./parse.js')
const pr1Plugin = require('./rollup-plugin-pr1.js')()
const cwd = process.cwd()

async function bundle (input, out, config) {
  const inputOptions = {
    input: input,
    external: (config.vendor || []).map(i => i[0]),
    plugins: [...config.rollupConfig.plugins, pr1Plugin],
    context: 'window'
  }
  const outputOptions = {
    format: 'iife',
    globals: config.rollupConfig.globals || {},
    file: out // 给 rollup-plugin-pr1 使用
  }
  // rollup
  const bundle = await rollup.rollup(inputOptions)
  const { output } = await bundle.generate(outputOptions)
  let code = output[0].code
  // babel
  if (config.babelConfig) {
    code = babel.transform(code, config.babelConfig).code
  }
  // uglify
  if (config.uglifyConfig) {
    code = uglify.minify(code, config.uglifyConfig).code
  }

  code = code.replace(/\bprocess\.env\.NODE_ENV\b/g, `'${process.env.NODE_ENV}'`)
  fs.writeFileSync(out, code)
  return code
}

function getShortMd5 (txt) {
  const hash = crypto.createHash('md5')
  hash.update(txt)
  const hex = hash.digest('hex').slice(0, 6)
  return hex
}

function addSrcHash (txt, distDir) {
  let html = txt
  const srcs = txt.match(/(href|src)=("|')?[^ "']+\2?/gm)
  const result = srcs.map(i => {
    const src = i.replace(/^(href|src)=("|')?/, '').replace(/("|')$/, '')
    const absoulteSrc = path.resolve(distDir, src.split('?')[0])
    if (src.indexOf('http') !== 0 && fs.existsSync(absoulteSrc)) {
      return {
        src: i,
        md5Src: i.replace(src, src + (~src.indexOf('?') ? '&' : '?') + `v=${getShortMd5(fs.readFileSync(absoulteSrc))}`)
      }
    }
    return null
  })
  result.forEach(r => {
    if (r) {
      html = html.replace(r.src, r.md5Src)
    }
  })
  return html
}

async function compile (entry, config, dist) {
  const originIndexPath = path.resolve(cwd, entry)
  const originDir = path.dirname(originIndexPath)
  if (config.beforeBuild) {
    await config.beforeBuild(originDir)
  }

  // 拷贝入口文件
  const distIndexPath = path.resolve(dist, entry)
  const distDir = path.dirname(distIndexPath)
  fs.copySync(originIndexPath, distIndexPath)

  // 拷贝第三方工具
  const vendors = []
  const preload = []
  ;(config.vendor || []).forEach(f => {
    const file = f[1] || f[0]
    const fileName = path.basename(file)
    vendors.push(`  <script src="./vendor/${fileName}"></script>`)
    preload.push(`  <link rel="preload" href="./vendor/${fileName}" as="script">`)
    fs.copySync(path.resolve(appRootPath, 'node_modules/', file), path.resolve(distDir, 'vendor/', fileName))
  })

  // 入口js
  const index = fs.readFileSync(originIndexPath)
  const main = /src="([^"]+)\?pr1_module=1"/.exec(index)[1]

  // 拷贝静态文件
  if (config.static) {
    config.static.forEach(f => {
      fs.copySync(path.resolve(originDir, f), path.resolve(distDir, f))
    })
  }

  // 打包rollup
  const input = path.resolve(originDir, main)
  const out = path.resolve(distDir, main)
  const code = await bundle(input, out, config)

  let indexHtml = fs.readFileSync(distIndexPath).toString()

  // 如果存在 bable 的 regeneratorRuntime，自动加入 profill
  if (/\bregeneratorRuntime\b/.test(code)) {
    fs.copySync(path.resolve(appRootPath, 'node_modules/@babel/polyfill/dist/polyfill.min.js'), path.resolve(distDir, 'vendor/polyfill.min.js'))
    vendors.push(`  <script src="./vendor/polyfill.min.js"></script>`)
    preload.push(`  <link rel="preload" href="./vendor/polyfill.min.js" as="script">`)
  }

  // 将 preload 插入 head
  indexHtml = indexHtml.replace(/<\/head>/, `${preload.join('\n')}\n</head>`)

  // 如果存在如js同名css，加入到index的head里去
  const cssPath = out.replace(/\.js$/, '.css')
  if (fs.existsSync(cssPath)) {
    const relativeCssPath = cssPath.replace(distDir, '').replace(/\\/g, '/')
    indexHtml = indexHtml.replace(/<\/head>/, `  <link rel="stylesheet" href=".${relativeCssPath}">\n</head>`)
  }

  // 将 vendors 插入 pr1_module 之前
  const pr1ModuleScript = /^.+pr1_module=1.+$/m.exec(indexHtml)
  indexHtml = indexHtml.replace(pr1ModuleScript[0], `${vendors.join('\n')}\n${pr1ModuleScript[0]}`)

  // 将index.html里的所有内部路径加上hash
  indexHtml = addSrcHash(indexHtml, distDir)

  fs.writeFileSync(distIndexPath, indexHtml)
  // 执行打包完的回调
  if (config.afterBuild) {
    await config.afterBuild(path.dirname(out))
  }
}

module.exports = {
  build: async function (entry, config, configAbsolutePath) {
    // 清空/创建dist目录
    const dist = config.dist
      ? path.resolve(configAbsolutePath, config.dist)
      : path.resolve(appRootPath, './dist/')
    if (fs.existsSync(dist)) {
      fs.removeSync(dist)
    }
    fs.mkdirSync(dist)

    for (let i = 0; i < entry.length; i++) {
      await compile(entry[i], config, dist)
    }
  }
}
