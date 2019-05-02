// const jtaroModule = require('rollup-plugin-jtaro-module')
// const vue = require('rollup-plugin-vue') // 不支持
// const pug = require('rollup-plugin-pug-html')
// const less = require('rollup-plugin-less') // 落选
// const scss = require('rollup-plugin-scss')
const nodeResolve = require('rollup-plugin-node-resolve')
// const pr1Plugin = require('./src/rollup-plugin-pr1.js')

module.exports = {
  vendor: [ // [0]是开发环境用的，[1]是生产环境用的，如果没有[1]生产环境也用[0]
    ['vue/dist/vue.esm.browser.js', 'vue/dist/vue.min.js'],
    ['jroll/src/jroll.js', 'jroll/build/jroll.min.js']
  ],
  html2VueRender: true,
  // 热更新
  hot: 'style',
  // static: ['./images'],
  rollupConfig: { // 打包时用到的 Rollup 配置，input 和 output 的 file 选项是无效的
    globals: {
      'vue/dist/vue.esm.browser.js': 'Vue',
      'jroll/src/jroll.js': 'JRoll'
    },
    plugins: [
      // jtaroModule(),
      // scss({
      //   output: false
      // }),
      // less(),
      // pug()
      nodeResolve()
      // pr1Plugin()
    ] // 配置 Rollup 的插件，飘刃也会用到
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
    console.log(`打包完成：${distDir}`)
  }
}
