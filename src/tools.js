const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const cwd = process.cwd()

// 查找app根目录
function findAppRootPath () {
  let currentPath = cwd
  while (currentPath !== '/' && !/^[a-zA-Z]:\\$/.test(currentPath)) {
    if (fs.existsSync(path.resolve(currentPath, 'package.json'))) {
      return currentPath
    }
    currentPath = path.resolve(currentPath, '..')
  }
  return null
}

exports.appRootPath = findAppRootPath()

exports.getShortMd5 = function (txt) {
  const hash = crypto.createHash('md5')
  hash.update(txt)
  const hex = hash.digest('hex').slice(0, 6)
  return hex
}
