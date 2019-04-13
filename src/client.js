(function (win) {
  const cache = {}

  function dirname (p) {
    return p.substr(0, p.lastIndexOf('/'))
  }
  function resolvePath (p) {
    var d = dirname(document.baseURI)
    var path

    // 支持http/https请求
    if (/^http/.test(p)) {
      return p

    // 相对路径请求
    } else {
      p = p.replace(/(\.\.\/)|(\.\/)/g, function (match, up) {
        if (up) {
          d = d.substr(0, d.lastIndexOf('/'))
        }
        return ''
      })
      path = (d + '/' + p)
    }
    return path.replace(window.location.origin, '')
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
    import (path, parentPath) {
      const uniquePath = resolvePath(path)

      if (pr1.modules[uniquePath]) {
        return pr1.modules[uniquePath]
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
          children: []
        }
      }
      cache[parentPath].children.push(cache[uniquePath])
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
        const src = uniquePath + (uniquePath.indexOf('?') === -1 ? '?' : '&') + 'pr1_module=1'
        cache[uniquePath].resolve = (rs) => {
          resolve(rs)
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
    // require
    require () {

    }
  }
  win.pr1 = pr1
})(window)
