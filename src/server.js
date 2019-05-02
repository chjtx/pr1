const http = require('http')
const path = require('path')
const { URL } = require('url')
const fs = require('fs')
const WebSocket = require('ws')
const { parsePr1 } = require('./parse.js')

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

// 监听文件变化
function watchFiles (dir, ws) {
  const w = fs.watch(dir, (event, filename) => {
    const p = path.resolve(dir, filename)
    if (event === 'rename') {
      fs.stat(p, (err, state) => {
        if (!err) {
          if (state.isDirectory()) {
            w.close()
            watchFiles(p, ws)
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
          if (ws && ws.readyState === 1) {
            ws.send(p.replace(cwd, '').replace(/\\/g, '/'))
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
        watchFiles(p, ws)
      }
    })
  })
}

// 浏览器端所需文件
const client = fs.readFileSync(path.resolve(__dirname, './client.js')).toString()

module.exports = function server (port, config) {
  const server = http.createServer(async (req, res) => {
    // pr1-client.js
    if (req.url === '/pr1-client.js') {
      res.end(client.replace('{{port}}', port)
        .replace('`{{configHot}}`', !!config.hot)
        .replace('`{{hot}}`', `'${config.hot}'`))
      return
    }

    const parseURL = new URL(req.url, 'http://localhost/')
    let pathname = parseURL.pathname
    if (/\/$/.test(pathname)) {
      pathname = pathname + 'index.html'
    }
    const realPath = path.resolve(cwd, '.' + pathname)

    // 飘刃模块
    if (req.url.indexOf('pr1_module=1') > -1) {
      const importee = parseURL.searchParams.get('importee')
      let importer = parseURL.searchParams.get('importer')
      let filePath = ''
      let file = ''
      filePath = importer ? path.resolve(cwd, path.dirname(importer), importee) : realPath
      // 若文件不存在，尝试使用 rollup 插件的 resolveId 解决
      if (!fs.existsSync(filePath)) {
        importer = path.resolve(cwd, '.' + importer)
        filePath = await config.rollupConfig.plugins.reduce(async (id, plugin) => {
          if (typeof plugin.resolveId === 'function') {
            const result = await plugin.resolveId(importee, importer)
            return result || id
          }
          return id
        }, filePath)
      }
      try {
        file = fs.readFileSync(filePath)
        res.writeHead(200)
        res.end(await parsePr1(file.toString(), pathname, config))
      } catch (e) {
        res.writeHead(500)
        res.end(e.message)
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
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end(e.message)
        return
      }
      // 200
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
    WS.on('connection', function connection (ws) {
      watchFiles(cwd, ws)
    })
  }

  server.listen(port)

  console.log(`\nPR1 server run successfully!`.green)
  console.log(`Server run at:` + ` http://localhost:${port}\n`.cyan)
}
