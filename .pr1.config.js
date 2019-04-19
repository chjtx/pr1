// const jtaroModule = require('rollup-plugin-jtaro-module')
// const vue = require('rollup-plugin-vue') // 不支持
// const pug = require('rollup-plugin-pug-html')
// const less = require('rollup-plugin-less') // 落选
// const scss = require('rollup-plugin-scss')
const nodeResolve = require('rollup-plugin-node-resolve')
const pr1Plugin = require('./src/rollup-plugin-pr1.js')

module.exports = {
  static: ['./images'],
  rollupConfig: {           // 打包时用到的 Rollup 配置，input 和 output 的 file 选项是无效的
    plugins: [
      // jtaroModule(),
      // scss({
      //   output: false
      // }),
      // less(),
      // pug()
      nodeResolve(),
      pr1Plugin()
    ]    // 配置 Rollup 的插件，飘刃也会用到
  },
  babelConfig: {
    presets: [
      [
        '@babel/env', {
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
  afterBuild: async function (distDir) {
    console.log(distDir)
  }
}
