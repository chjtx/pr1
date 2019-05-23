(function (win) {
  const cache = Object.create(null)
  const vueMap = Object.create(null)
  let isNodeModule = false

  function dirname (p) {
    return p.slice(0, p.lastIndexOf('/'))
  }
  function resolvePath (currentPath, relativePath) {
    var dir = dirname(relativePath)
    var path = ''

    // 支持http/https请求
    if (/^http/.test(currentPath)) {
      isNodeModule = false
      return currentPath

    // node_modules 路径
    } else if (currentPath.indexOf('.') !== 0) {
      isNodeModule = true
      return currentPath

    // 相对路径请求
    } else {
      isNodeModule = false
      currentPath = currentPath.replace(/(\.\.\/)|(\.\/)/g, function (match, up) {
        if (up) {
          dir = dir.substr(0, dir.lastIndexOf('/'))
        }
        return ''
      })
      path = (dir + '/' + currentPath)
    }
    return path
  }

  // 加截javascript
  function loadScript (src, parentPath, uniquePath) {
    const oldScript = document.querySelector(`[src="${src}"]`)
    const script = document.createElement('script')
    script.src = src + (isNodeModule ? '?pr1_node=1' : '')
    script.onload = function () {
      if (cache[uniquePath].depend === 0) {
        cache[uniquePath].resolve(pr1.modules[uniquePath])
      }
    }
    script.onerror = function () {
      console.error(`Has error on [${parentPath}]. Load [${uniquePath}] fail.`)
    }
    if (oldScript) {
      document.head.replaceChild(script, oldScript)
    } else {
      document.head.appendChild(script)
    }
  }

  // 格式 Vue 组件名称
  function formatComponentName (name) {
    return 'PR1' + name.replace(/\//g, '-').replace(/\./g, '_')
  }

  // 强制刷新 Vue 组件
  function forceUpdate (arr, options) {
    const oldCtor = arr[0].constructor
    const newCtor = oldCtor.super.extend(options)

    oldCtor.options = newCtor.options
    oldCtor.cid = newCtor.cid
    oldCtor.prototype = newCtor.prototype

    arr.slice().forEach(instance => {
      if (instance.$vnode && instance.$vnode.context) {
        instance.$vnode.context.$forceUpdate()
      } else {
        window.location.reload()
      }
    })
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
        const src = uniquePath
        document.cookie = `pr1_module=1&importee=${path}&importer=${parentPath}`
        cache[uniquePath].resolve = async (rs) => {
          // vue 组件添加名称
          if (rs && rs.exports && rs.exports.default && rs.exports.default.template) {
            const comName = formatComponentName(uniquePath)
            rs.exports.default.name = comName

            if (noCache) {
              // 热加载，替换 vue 组件
              if (vueMap[comName]) {
                forceUpdate(vueMap[comName], rs.exports.default)
              }
            }
          }

          resolve(rs && rs.exports)
          setTimeout(() => {
            if (cache[uniquePath].parent) {
              cache[uniquePath].parent.depend--
              if (cache[uniquePath].parent.depend === 0 && cache[uniquePath].parent.resolve) {
                cache[uniquePath].parent.resolve(pr1.modules[cache[uniquePath].parent.src])
              }
            }
          }, 0)
        }
        loadScript(src, parentPath, uniquePath)
      })
    },
    injectStyle (css, pathId) {
      let style = document.querySelector(`[pr1-path='${pathId}']`)
      if (!style) {
        style = document.createElement('style')
        style.setAttribute('pr1-path', pathId)
        document.head.appendChild(style)
      }
      style.innerHTML = css
    }
  }

  // hot
  if (`{{configHot}}`) {
    // vue beforeCreate
    pr1.import('vue/dist/vue.esm.browser.js', '/').then(data => {
      const Vue = data.default
      Vue.mixin({
        beforeCreate () {
          if (this.$vnode) {
            const tag = this.$vnode.tag.slice(this.$vnode.tag.indexOf('PR1'))
            if (!vueMap[tag]) {
              vueMap[tag] = []
            }
            vueMap[tag].push(this)
          }
        }
      })
    })

    // ws
    const ws = new win.WebSocket('ws://localhost:{{port}}')
    ws.onmessage = function (evt) {
      if (pr1.modules[evt.data]) {
        if (`{{hot}}` === 'reload') {
          win.document.location.reload()
        } else {
          if (cache[evt.data].origin) {
            pr1.import(cache[evt.data].origin, cache[evt.data].parent.src, true)
          } else {
            pr1.import('.' + cache[evt.data].src, '/index.html', true)
          }
        }
      }
    }
  }

  win.pr1 = pr1
})(window)
