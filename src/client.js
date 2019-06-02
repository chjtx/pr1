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
    } else if (currentPath[0] !== '.' && currentPath[0] !== '/') {
      isNodeModule = true
      return 'node_modules/' + currentPath

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
    arr.slice().forEach(instance => {
      const oldCtor = Object.getPrototypeOf(instance).constructor
      const newCtor = oldCtor.super.extend(options)
      if (instance.$vnode && instance.$vnode.context) {
        oldCtor.options = newCtor.options
        oldCtor.cid = newCtor.cid
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
    // modulesCache
    modulesTree: cache,
    // import
    import (path, parentPath, noCache) {
      // 因为有些路径需要加上 /index.js ，因此判断删掉 /index.js 是否已存在
      let realParentPath = null
      if (/\/index\.js$/.test(parentPath)) {
        const simpleParentPath = parentPath.replace(/\/index\.js$/, '')
        if (cache[simpleParentPath] && simpleParentPath !== parentPath) {
          realParentPath = simpleParentPath
        }
      }
      const uniquePath = resolvePath(path, parentPath)

      if (pr1.modules[uniquePath] && !noCache) {
        return pr1.modules[uniquePath].exports
      }
      if (!cache[realParentPath || parentPath]) {
        cache[realParentPath || parentPath] = {
          src: parentPath,
          depend: 0,
          children: []
        }
      }
      if (!cache[uniquePath]) {
        cache[uniquePath] = {
          src: uniquePath,
          depend: 0,
          parent: cache[realParentPath || parentPath],
          children: [],
          origin: path
        }
      }
      if (!noCache) {
        cache[realParentPath || parentPath].children.push(cache[uniquePath])
      }
      cache[realParentPath || parentPath].depend++

      // 检测是否存在循环引用
      let currentCheck = cache[realParentPath || parentPath]
      const loopQueue = [(realParentPath || parentPath), uniquePath]
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
          if (`{{configHot}}` &&
            (/\.vue$/.test(uniquePath) || (/\.js$/.test(uniquePath) && cache[uniquePath.replace(/\.js$/, '.html')]))) {
            let comName = ''
            if (rs.exports.default) {
              if (typeof rs.exports.default === 'function') {
                comName = rs.exports.default.options.name || formatComponentName(uniquePath)
                rs.exports.default.options.name = comName
              } else {
                comName = rs.exports.default.name || formatComponentName(uniquePath)
                rs.exports.default.name = comName
              }
            }

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
    pr1.import('vue', '/index.html').then(data => {
      const Vue = data.default
      Vue.mixin({
        beforeCreate () {
          if (this.$vnode) {
            const tag = this.$vnode.tag.replace(/vue-component-\d+-/, '')
            if (!vueMap[tag]) {
              vueMap[tag] = []
            }
            vueMap[tag].push(this)
          }
        },
        beforeDestroy () {
          const tag = this.$vnode.tag.replace(/vue-component-\d+-/, '')
          vueMap[tag].splice(vueMap[tag].indexOf(this), 1)
        }
      })
      pr1.import('./main.js?pr1_module=1', document.URL)
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
            pr1.import('.' + cache[evt.data].src, document.URL, true)
          }
        }
      }
    }
  } else {
    pr1.import('./main.js?pr1_module=1', document.URL)
  }

  win.pr1 = pr1
})(window)
