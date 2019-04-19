// const jtaroModule = require('rollup-plugin-jtaro-module')
// const vue = require('rollup-plugin-vue') // 不支持
// const pug = require('rollup-plugin-pug-html')
// const less = require('rollup-plugin-less') // 落选
// const scss = require('rollup-plugin-scss')
const pr1Plugin = require('./src/rollup-plugin-pr1.js')

module.exports = {
  rollupConfig: {           // 打包时用到的 Rollup 配置，input 和 output 的 file 选项是无效的
    plugins: [
      // jtaroModule(),
      // scss({
      //   output: false
      // }),
      // less(),
      // pug()
      pr1Plugin()
    ]    // 配置 Rollup 的插件，飘刃也会用到
  }
}
