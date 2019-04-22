const http = require('http')
const path = require('path')
const { URL } = require('url')
const fs = require('fs')
const { parsePr1, parseNode } = require('./parse.js')

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

// 浏览器端所需文件
const client = fs.readFileSync(path.resolve(__dirname, './client.js')).toString()

module.exports = function server (port, config) {
  const server = http.createServer(async (req, res) => {
    let isPr1Module = false
    if (req.url.indexOf('pr1_module=1') > -1) {
      isPr1Module = true
    } else if (req.url.indexOf('node_module=1') > -1) {
      res.end(parseNode(req.url.slice(1).split('?')[0]))
      return
    }
    if (req.url === '/pr1-client.js') {
      res.end(client)
      return
    }

    const parseURL = new URL(req.url, 'http://localhost/')
    let pathname = parseURL.pathname
    if (/\/$/.test(pathname)) {
      pathname = pathname + 'index.html'
    }

    let ext = path.extname(pathname)
    ext = ext ? ext.slice(1) : 'unknown'

    const realPath = path.resolve(cwd, '.' + pathname)
    const contentType = mime[ext] || 'text/plain'
    let file = null

    if (fs.existsSync(realPath)) {
      try {
        file = fs.readFileSync(path.resolve(cwd, realPath))
      } catch (e) {
        // 500
        res.writeHead(500, { 'Content-Type': 'text/plain' })
        res.end(e.message)
      }
      // 200
      res.writeHead(200, { 'Content-Type': contentType })
      if (isPr1Module) {
        // 飘刃模块
        res.write(await parsePr1(file.toString(), pathname, config))
      } else if (contentType === 'text/html') {
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
  server.listen(port)
  console.log(`\nPR1 server run successfully!`.green)
  console.log(`Server run at:` + ` http://localhost:${port}\n`.cyan)
}
