# 飘刃 (Piao Ren)

基于 Rollup 的极简前端模块管理工具

内含支持含作用域的 style、 html 和 vue 插件 rollup-plugin-pr1

## 进度

- [ ] 全局命令
- [ ] 全局打包命令
- [x] import和export语法解释
- [x] 配置文件 Rollup 插件的 transform 支持
- [x] 配置文件的 beforeBuild 和 afterBuild 钩子
- [ ] ~~配置文件的文件监听~~ 意义不大，都习惯手动刷新
- [x] 编写 Rollup 插件以支持 html 等文件 rollup-plugin-pr1
- [x] 使 rollup-plugin-pr1 插件支持 .vue 文件
- [ ] 提取 node_modules 的文件到外部
- [ ] 异步加载

## 安装运行

```
npm i -D -g pr1
```

```
pr1 8686
pr1 --config="./config.js"
pr1 build index.html
pr1 build index.html --config="./config.js"
pr1 build index.html --config="./config.js" --out="./dist/"
```

## 配置

.pr1.config.js

```js
module.exports = {
  // watch: {
  //   include: ['/web/**'],  // 文件变化，自动刷新浏览器。 glob 模式文件路径
  //   exclude: ['/web/config.js'] // 排除监听
  // },
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
  beforeBuild: async function (originDir) {

  },
  afterBuild: async function (distDir) {

  }
}
```

## 工作语法

- 只会替换 import 和 export ，如果 import('jroll') 导入的路径没有`./`、`../`等相对路径，将会从 node_modules 导入
- 如果同目录存在同名的 html 和 js 文件，则视为 Vue 组件，打包时会自动关联转成 render 函数。js 文件只能用 template: html，不能用其它变量
- 如果要引用 node_modules 的文件，打包里必须加载 rollup-plugin-node-resolve 插件

## 异步加载

```js
pr1.require(`../xxx.js`, () => {

})
```

打包时，遇到 `pr1.require` ，rollup 会自动根据 require 的内容合并文件，所以异步加载必须使用 `pr1.require` 字眼

## 关于分包和公共文件

分包即异步加载模块，建议入口文件同步加载公共文件，业务代码分包加载

## ~~附加运行（删了，没必要实现）~~

可植入到 http.server、express 和 koa，方便开发同源后端接口

```js
const pr1 = require('pr1')
const body = readFileSync('./file.js')

// http.server
response.end(pr1.parse(body))

// express
app.get('/', (req, res) => res.send(pr1.parse(body)))

// koa
app.use(async ctx => {
  ctx.body = pr1.parse(body);
})
```
