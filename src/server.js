const http = require('http')
const path = require('path')
const url = require('url')
const fs = require('fs')
const pr1 = require('./index.js')

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

module.exports = function server (port) {
  const server = http.createServer((req, res) => {
    const parseURL = url.parse(req.url)
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
      if (ext === 'js') {
        res.write(pr1.parse(file.toString(), false, req.url))
      } else if (ext === 'html') {
        res.write(pr1.parse(file.toString(), true))
      } else {
        res.write(file, 'binary')
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
  console.log('piaoren server run on port: ' + port)
}
