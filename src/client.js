(function (win) {
  const cache = {}
  let currentScript = null

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

  // pr1
  const pr1 = {
    modules: {},
    import (path) {
      const uniquePath = resolvePath(path)

      if (pr1.modules[uniquePath]) {
        return pr1.modules[uniquePath]
      }

      currentScript = document.currentScript.src.replace(document.location.origin, '')
      if (!cache[currentScript]) {
        cache[currentScript] = {
          src: currentScript,
          depend: 0
        }
      }
      cache[currentScript].depend++

      return new Promise(resolve => {
        const script = document.createElement('script')
        script.src = uniquePath
        script.onload = (function (src, p) {
          return function () {
            cache[src].depend--
            if (!cache[p] || cache[p].depend === 0) {
              resolve(pr1.modules[p])
            }
          }
        })(currentScript, uniquePath)
        document.head.appendChild(script)
      })
    },
    require () {

    }
  }
  win.pr1 = pr1
})(window)
