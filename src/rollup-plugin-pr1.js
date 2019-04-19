const { createFilter } = require('rollup-pluginutils')
const cwd = process.cwd()

module.exports = function (options) {
  const filter = createFilter(['/**/*.html'])
  let count = 0

  return {
    name: 'pr1',
    transform: async function (code, id) {
      if (!filter(id)) {
        return
      }
      const pathId = id.replace(cwd, '').replace(/\\/g, '/')

      // 分离style和html
      const regResult = /<style>([\s\S]+)?<\/style>/.exec(code)
      let style = ''
      let html = ''
      const scope = []

      if (regResult) {
        style = regResult[1].trim()
        html = code.replace(regResult[0], '').trim()
      }

      if (!style && !html) {
        return
      } else {
        count++
      }

      // 给第一个dom注入pathId
      html = html.replace(/^(<[a-zA-Z]+ )/, (match, tag) => {
        return `${tag}pr1-path="${pathId}" `
      })

      // 将style所有class变成唯一，模块化
      style = style.replace(/([:#a-zA-Z-_.@][^{}]+)\{/g, function (match, selector) {
        if (selector.trim() === 'from' || selector.trim() === 'to' || /^@/.test(selector)) {
          return match
        } else if (match.indexOf(':global ') === 0) {
          return match.replace(':global ', '')
        } else {
          return selector.replace(/(\.[a-zA-Z0-9_-]+)/g, (match, klass) => {
            const name = klass + '-' + count
            scope.push(name)
            return name
          })
        }
      })

      // 修改html与style一致的class
      

      return {
        style: style,
        html: html
      }
    }
  }
}
