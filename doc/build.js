const fs = require('fs')
const path = require('path')
const hljs = require('highlight.js')
const md = require('markdown-it')({
  html: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(lang, str, true).value +
               '</code></pre>'
      } catch (__) {}
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
  }
})

const content = fs.readFileSync(path.resolve(__dirname, '../README.md')).toString()
const index = fs.readFileSync(path.resolve(__dirname, './index.template.html')).toString()
const result = md.render(content)

fs.writeFileSync(path.resolve(__dirname, './index.html'), index.replace('{{content}}', result))
