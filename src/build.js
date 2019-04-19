const rollup = require('rollup')
const path = require('path')
const fs = require('fs-extra')
const { appRootPath } = require('./parse.js')
const cwd = process.cwd()

async function bundle (input, out, options) {
  const inputOptions = {
    input: input,
    plugins: options.plugins,
    context: 'window'
  }
  const outputOptions = {
    format: 'iife',
    file: out
  }
  const bundle = await rollup.rollup(inputOptions)
  await bundle.write(outputOptions)
}

module.exports = {
  build: async function (entry, config, configAbsolutePath) {
    const originIndexPath = path.resolve(cwd, entry)
    const originDir = path.dirname(originIndexPath)
    if (config.beforeBuild) {
      await config.beforeBuild(originDir)
    }

    // 清空/创建dist目录
    const dist = config.dist
      ? path.resolve(configAbsolutePath, config.dist)
      : path.resolve(appRootPath, './dist/')
    if (fs.existsSync(dist)) {
      fs.removeSync(dist)
    }
    fs.mkdirSync(dist)

    // 拷贝入口文件
    const distIndexPath = path.resolve(dist, entry)
    const distDir = path.dirname(distIndexPath)
    fs.copySync(originIndexPath, distIndexPath)

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
    await bundle(input, out, config.rollupConfig)

    // 如果存在如js同名css，加入到index的head里去
    const cssPath = out.replace(/\.js$/, '.css')
    if (fs.existsSync(cssPath)) {
      const relativeCssPath = cssPath.replace(distDir, '')
      let indexHtml = fs.readFileSync(distIndexPath).toString()
      indexHtml = indexHtml.replace(/<\/head>/, `  <link rel="stylesheet" href=".${relativeCssPath.replace(/\\/g, '/')}">\n</head>`)
      fs.writeFileSync(distIndexPath, indexHtml)
    }

    // 执行打包完的回调
    if (config.afterBuild) {
      await config.afterBuild(path.dirname(out))
    }
  }
}
