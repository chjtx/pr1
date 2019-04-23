# 飘刃 (Piao Ren)

Vue 项目前端工程构建工具，使用 Rollup 打包

内含支持含作用域的 style、 html 和 vue 插件 rollup-plugin-pr1

## 进度

- [x] 全局命令
- [x] import和export语法解释
- [x] 配置文件 Rollup 插件的 transform 支持
- [x] 配置文件的 beforeBuild 和 afterBuild 钩子
- [x] 编写 Rollup 插件以支持 html 等文件 rollup-plugin-pr1
- [x] 使 rollup-plugin-pr1 插件支持 .vue 文件
- [x] 提取 node_modules 的文件到外部
- [ ] 异步加载

## 安装运行

```
npm i -g piaoren
```

```
pr1 start 8686
pr1 start --config="./config.js"
pr1 build index.html
pr1 build index.html --config="./config.js"
pr1 build index.html --config="./config.js" --out="./dist/"
pr1 build index.html detail.html tools.js
```

## 配置

.pr1.config.js

```js
module.exports = {
  vendor: [ // [0]是开发环境用的，[1]是生产环境用的，如果没有[1]生产环境也用[0]
    ['vue.js', 'vue.min.js']
  ],
  dist: '', // 相对于配置文件的打包路径
  static: ['./images'], // 相对于入口html文件，保持目录结构拷贝到打包目标文件夹
  rollupConfig: {           // 打包时用到的 Rollup 配置，input 和 output 的 file 选项是无效的
    globals: {
      'vue.js': 'Vue'
    }
    plugins: [ plugin() ],    // 配置 Rollup 的插件，飘刃也会用到
  },
  babelConfig: {},
  beforeBuild: async function (originFile) {

  },
  afterBuild: async function (targetFile) {

  }
}
```

## 支持 .vue

默认支持 .vue 文件，并且支持 scoped sass pug

## 注释代码不上生产

```js
// pr1 ignore++
console.info(`调试信息`)
// pr1 ignore--
```

`// pr1 ignore++`到`// pr1 ignore--`的代码在生产环境会被删除

## 注意事项

- 只会替换 import 和 export ，如果 import('jroll') 导入的路径没有`./`、`../`等相对路径，将会从 node_modules 导入
- 如果同目录存在同名的 html 和 js 文件，则视为 Vue 组件，打包时会自动关联转成 render 函数。js 文件只能用 template: html，不能用其它变量
- 如果要引用 node_modules 的文件，打包里必须加载 rollup-plugin-node-resolve 插件
- 所有静态资源路径都应该相对于入口 html 文件

## 异步加载（未实现）

```js
pr1.require(`../xxx.js`, () => {

})
```

打包时，遇到 `pr1.require` ，rollup 会自动根据 require 的内容合并文件，所以异步加载必须使用 `pr1.require` 字眼

## 关于分包和公共文件

分包即异步加载模块，建议入口文件同步加载公共文件，业务代码分包加载
