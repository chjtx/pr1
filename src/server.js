const http = require('http')
const path = require('path')
const { URL } = require('url')
const fs = require('fs')
const WebSocket = require('ws')
const { parsePr1, parseNode } = require('./parse.js')
const { appRootPath } = require('./tools.js')

require('colors')

const cwd = process.cwd()
const mime = {
  'css': 'text/css',
  'gif': 'image/gif',
  'html': 'text/html',
  'ico': 'image/x-icon',
  'jpeg': 'image/jpeg',
  'jpg': 'image/jpeg',
  'js': 'text/javascript',
  'json': 'application/json',
  'pdf': 'application/pdf',
  'png': 'image/png',
  'svg': 'image/svg+xml',
  'swf': 'application/x-shockwave-flash',
  'tiff': 'image/tiff',
  'txt': 'text/plain',
  'wav': 'audio/x-wav',
  'wma': 'audio/x-ms-wma',
  'wmv': 'video/x-ms-wmv',
  'xml': 'text/xml'
}
let fileChangeTime = 0
let websocket = null

// 监听文件变化
function watchFiles (dir) {
  const w = fs.watch(dir, (event, filename) => {
    const p = path.resolve(dir, filename)
    if (event === 'rename') {
      fs.stat(p, (err, state) => {
        if (!err) {
          if (state.isDirectory()) {
            w.close()
            watchFiles(p)
          }
        } else {
          w.close()
        }
      })
    } else {
      // event === change
      fs.stat(p, (err, state) => {
        const now = Date.now()
        if (!err && state.isFile() && (now - fileChangeTime > 100)) {
          fileChangeTime = now
          if (websocket) {
            websocket.send(p.replace(cwd, '').replace(/\\/g, '/'))
          }
        }
      })
    }
  })
  w.on('error', (e) => {
    console.error(e)
  })
  // 递归监听
  fs.readdirSync(dir).forEach(f => {
    const p = path.resolve(dir, f)
    fs.stat(p, (err, state) => {
      if (err) throw err
      if (state.isDirectory()) {
        watchFiles(p)
      }
    })
  })
}

// 两路径相对表示是 pr1Module
function checkPr1Module (params, url) {
  return params.pr1_module === '1' && path.resolve(cwd, '.' + url) === path.resolve(path.dirname(path.resolve(cwd, '.' + (params.importer || ''))), (params.importee || ''))
}

// 浏览器端所需文件
const client = fs.readFileSync(path.resolve(__dirname, './client.js')).toString()

module.exports = function server (port, config) {
  const server = http.createServer(async (req, res) => {
    // pr1-client.js
    if (req.url === '/pr1-client.js') {
      res.end(client.replace('{{port}}', port)
        .replace(/`\{\{configHot\}\}`/g, !!config.hot)
        .replace('`{{hot}}`', `'${config.hot}'`))
      return
    }

    const parseURL = new URL(req.url, 'http://localhost/')
    let pathname = parseURL.pathname
    if (/\/$/.test(pathname)) {
      pathname = pathname + 'index.html'
    }
    const realPath = path.resolve(cwd, '.' + pathname)

    // 通过 cookie 获取来源去处
    const cookie = req.headers.cookie
    const cookieParams = {}
    if (cookie && cookie.indexOf('pr1_module=1') > -1) {
      cookie.split(';').forEach(i => {
        const importee = /importee=([^&]+)/.exec(i)
        if (importee && req.url.indexOf(importee[1].slice(2)) > -1) {
          i.split('&').forEach(b => {
            const c = b.split('=')
            cookieParams[(c[0] || '').trim()] = (c[1] || '').trim()
          })
        }
      })
    }

    let isPr1Module = cookie && checkPr1Module(cookieParams, req.url)
    let isNodeModule = false
    // node_modules 模块
    if (req.url.indexOf('pr1_node=1') > -1 || (cookieParams.importer && cookieParams.importer.indexOf('node_modules') > -1)) {
      const txt = await parseNode(cookieParams.importee, config)
      if (txt) {
        res.writeHead(200)
        res.end(txt)
        return
      }
      isNodeModule = true
    }

    // 飘刃模块
    if (req.url.indexOf('pr1_module=1') > -1 || isPr1Module || isNodeModule) {
      const importee = (isPr1Module || isNodeModule) ? cookieParams['importee'] : null
      let importer = (isPr1Module || isNodeModule) ? cookieParams['importer'] : null
      let filePath = ''
      let file = ''
      let resolveId = false
      if (isNodeModule && importer.indexOf('node_modules') > -1) {
        filePath = path.resolve(appRootPath, path.dirname(importer), importee)
      } else {
        filePath = importer ? path.resolve(cwd, path.dirname('.' + importer), importee) : realPath
      }

      // 若文件不存在，尝试使用 rollup 插件的 resolveId 解决
      if (!fs.existsSync(filePath)) {
        resolveId = true
        importer = path.resolve(cwd, '.' + importer)

        // options
        const options = {
          input: path.resolve(cwd, 'index.js')
        }
        await config.rollupConfig.plugins.reduce(async (opts, plugin) => {
          if (typeof plugin.options === 'function') {
            const opt = await plugin.options(Object.assign((await opts || {}), config.rollupConfig))
            return opt || opts
          }
        }, options)

        // resolveId
        filePath = await config.rollupConfig.plugins.reduce(async (id, plugin) => {
          if (typeof plugin.resolveId === 'function') {
            const result = await plugin.resolveId(importee, importer)
            return result || id
          }
          return id
        }, filePath)
      }

      try {
        if (path.extname(filePath) === '') {
          filePath = filePath + '.js'
        }
        file = fs.readFileSync(filePath)
        res.writeHead(200)
        let uniquePath
        if (resolveId) {
          if (importee.indexOf('.') > -1) {
            const pp = path.resolve(appRootPath, path.dirname(importer), importee)
            uniquePath = pp.slice(pp.indexOf('node_modules')).replace(/\\/g, '/')
          } else {
            uniquePath = 'node_modules/' + importee
          }
        } else if (isNodeModule) {
          uniquePath = importer.indexOf('node_modules') > -1 ? filePath.replace(/\\/g, '/').slice(filePath.indexOf('node_modules')) : 'node_modules/' + importee
        } else {
          uniquePath = pathname
        }
        res.end(await parsePr1(file.toString(), uniquePath, filePath, config))
      } catch (e) {
        console.error(e.message)
        res.writeHead(500, e.message, { 'Content-Type': 'text/plain' })
        res.end()
      }
      return
    }

    let ext = path.extname(pathname)
    ext = ext ? ext.slice(1) : 'unknown'

    const contentType = mime[ext] || 'text/plain'
    let file = null

    if (fs.existsSync(realPath)) {
      try {
        file = fs.readFileSync(realPath)
      } catch (e) {
        // 500
        console.error(e.message)
        res.writeHead(500, e.message, { 'Content-Type': 'text/plain' })
        res.end()
        return
      }
      // 200
      res.setHeader('Set-Cookie', ['pr1_module=1'])
      res.writeHead(200, { 'Content-Type': contentType })
      if (contentType === 'text/html') {
        // 普通html文件
        res.write(file.toString().replace(/(<head>[\n\r]+)/, `$1  <script src="/pr1-client.js"></script>\n`))
      } else {
        // 其它文件
        res.write(file)
      }
      res.end()
    } else {
      // 404
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.write('This request URL ' + pathname + ' was not found on this server.')
      res.end()
    }
  })

  // websocket hot
  if (config.hot) {
    const WS = new WebSocket.Server({ server })
    watchFiles(cwd)
    WS.on('connection', function connection (ws) {
      websocket = ws
    })
  }

  server.listen(port)

  console.log(`\nPR1 server run successfully!`.green)
  console.log(`Server run at:` + ` http://localhost:${port}\n`.cyan)
}
