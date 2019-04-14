const jtaroModule = require('rollup-plugin-jtaro-module')
// const vue = require('rollup-plugin-vue')
const pug = require('rollup-plugin-pug-html')

module.exports = {
  rollupConfig: {           // 打包时用到的 Rollup 配置，input 和 output 的 file 选项是无效的
    plugins: [
      jtaroModule(),
      pug()
    ]    // 配置 Rollup 的插件，飘刃也会用到
  }
}
