const fs = require('fs')
const path = require('path')
const server = require('./server.js')
const { appRootPath } = require('./parse.js')
const { build } = require('./build.js')
const cwd = process.cwd()

// 获取运行参数
let entry = []
let port = '8686'
let isBuild = false
let configPath = ''
let configAbsolutePath = ''
let config = null

process.argv.forEach(p => {
  if (/\.html$/.test(p)) {
    // 入口
    entry.push(p)
  } else if (p === 'build') {
    // build
    isBuild = true
  } else if (/^\d+$/.test(p)) {
    // 端口
    port = p
  } else if (p.indexOf('--config=') === 0) {
    // 配置
    configPath = p.split('=')[1].replace(/^('|")|\1$/g, '')
  }
})

// 如果指定配置文件则用指定的，否则在package.json同级目录查找默认
if (configPath) {
  configAbsolutePath = path.resolve(cwd, configPath)
  config = require(configAbsolutePath)
} else if (appRootPath) {
  configAbsolutePath = path.resolve(appRootPath, '.pr1.config.js')
  if (fs.existsSync(configAbsolutePath)) {
    config = require(configAbsolutePath)
  }
}

if (isBuild) {
  process.env.NODE_ENV = 'production'
  build(entry, config, configAbsolutePath)
} else {
  process.env.NODE_ENV = 'development'
  server(port, config)
}
