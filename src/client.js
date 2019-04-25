(function (win) {
  const cache = {}
  let isNodeModule = false

  function dirname (p) {
    return p.slice(0, p.lastIndexOf('/'))
  }
  function resolvePath (currentPath, relativePath) {
    var dir = dirname(relativePath)
    var path = ''

    if (currentPath.indexOf('.') === 0 || currentPath.indexOf('/') === 0) {
      isNodeModule = false
    } else {
      isNodeModule = true
      return currentPath
    }

    // 支持http/https请求
    if (/^http/.test(currentPath)) {
      return currentPath

    // 相对路径请求
    } else {
      currentPath = currentPath.replace(/(\.\.\/)|(\.\/)/g, function (match, up) {
        if (up) {
          dir = dir.substr(0, dir.lastIndexOf('/'))
        }
        return ''
      })
      path = (dir + '/' + currentPath)
    }
    // return path.replace(window.location.origin, '')
    return path
  }

  // 加截javascript
  function loadScript (src, parentPath, uniquePath) {
    const script = document.createElement('script')
    script.src = src
    script.onload = function () {
      if (cache[uniquePath].depend === 0) {
        cache[uniquePath].resolve(pr1.modules[uniquePath])
      }
    }
    script.onerror = function () {
      console.error(`Has error on [${parentPath}]. Load [${uniquePath}] fail.`)
    }
    document.head.appendChild(script)
  }

  // pr1
  const pr1 = {
    // modules
    modules: {},
    // import
    import (path, parentPath, noCache) {
      const uniquePath = resolvePath(path, parentPath)

      if (pr1.modules[uniquePath] && !noCache) {
        return pr1.modules[uniquePath].exports
      }
      if (!cache[parentPath]) {
        cache[parentPath] = {
          src: parentPath,
          depend: 0,
          children: []
        }
      }
      if (!cache[uniquePath]) {
        cache[uniquePath] = {
          src: uniquePath,
          depend: 0,
          parent: cache[parentPath],
          children: [],
          origin: path
        }
      }
      if (!noCache) {
        cache[parentPath].children.push(cache[uniquePath])
      }
      cache[parentPath].depend++

      // 检测是否存在循环引用
      let currentCheck = cache[parentPath]
      const loopQueue = [parentPath, uniquePath]
      while (currentCheck.parent) {
        loopQueue.unshift(currentCheck.parent.src)
        if (currentCheck.parent.src === uniquePath) {
          throw new Error(`Infinite loop error occurred. [${loopQueue.join(' -> ')}]`)
        }
        currentCheck = currentCheck.parent
      }

      return new Promise(resolve => {
        let src = ''
        if (isNodeModule) {
          src = '/' + uniquePath + '?node_module=1'
        } else {
          src = uniquePath + (uniquePath.indexOf('?') === -1 ? '?' : '&') + 'pr1_module=1'
        }
        cache[uniquePath].resolve = (rs) => {
          resolve(rs && rs.exports)
          setTimeout(() => {
            cache[uniquePath].parent.depend--
            if (cache[uniquePath].parent.depend === 0 && cache[uniquePath].parent.resolve) {
              cache[uniquePath].parent.resolve(pr1.modules[cache[uniquePath].parent.src])
            }
          }, 0)
        }
        loadScript(src, parentPath, uniquePath)
      })
    },
    injectStyle (css, pathId) {
      const style = document.createElement('style')
      style.setAttribute('pr1-path', pathId)
      style.innerHTML = css
      document.head.appendChild(style)
    }
  }

  // hot
  if (`{{configHot}}`) {
    const ws = new win.WebSocket('ws://localhost:{{port}}')
    ws.onmessage = function (evt) {
      if (pr1.modules[evt.data]) {
        if (`{{hot}}` === 'style') {
          pr1.import(cache[evt.data].origin, cache[evt.data].parent.src, true)
        } else {
          win.document.location.reload()
        }
      }
    }
  }

  win.pr1 = pr1
})(window)
