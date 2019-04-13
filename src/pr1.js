const server = require('./server.js')

// 获取运行参数
let entry = ''
let port = '8686'
let isBuild = false

process.argv.forEach(p => {
  // 入口
  if (/\.html$/.test(p)) {
    entry = p
  }
  // build
  if (p === 'build') {
    isBuild = true
  }
  // 端口
  if (/^\d+$/.test(p)) {
    port = p
  }
})

if (isBuild) {
  runBuild(entry)
} else {
  server(port)
}

function runBuild () {

}
