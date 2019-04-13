const jtaroModule = require('rollup-plugin-jtaro-module')

module.exports = {
  rollupConfig: {           // 打包时用到的 Rollup 配置，input 和 output 的 file 选项是无效的
    plugins: [ jtaroModule() ]    // 配置 Rollup 的插件，飘刃也会用到
  }
}
