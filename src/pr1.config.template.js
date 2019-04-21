const nodeResolve = require('rollup-plugin-node-resolve')

module.exports = {
  vendor: [ // [0]是开发环境用的，[1]是生产环境用的，如果没有[1]生产环境也用[0]
    ['vue/dist/vue.esm.browser.js', 'vue/dist/vue.min.js']
  ],
  static: [],
  rollupConfig: {
    globals: {
      'vue/dist/vue.esm.browser.js': 'Vue'
    },
    plugins: [
      nodeResolve()
    ]
  },
  babelConfig: {
    presets: [
      [
        '@babel/env', {
          modules: false,
          targets: {
            ie: '9',
            chrome: '49'
          }
        }
      ]
    ]
  },
  uglifyConfig: {
    toplevel: true
  },
  beforeBuild: async function (originDir) {
    console.log(`开始打包：${originDir}`)
  },
  afterBuild: async function (distDir) {
    console.log(`完成打包：${distDir}`)
  }
}
