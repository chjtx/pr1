# 飘刃 (Piao Ren)

基于 Rollup 的极简前端模块管理工具，默认零配置

内含支持含作用域的 style 和 html 插件 rollup-plugin-pr1-html

只为简单快速开发，不支持 .vue 等需要大量复杂解释的插件

## 进度

- [ ] 全局命令
- [ ] 全局打包命令
- [x] import和export语法解释
- [x] 配置文件 Rollup 插件的 transform 支持
- [ ] 配置文件的 beforeBuild 和 afterBuild 钩子
- [ ] ~~配置文件的文件监听~~ 意义不大，都习惯手动刷新
- [ ] 编写 Rollup 插件以支持 html 等文件 rollup-plugin-pr1-html
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
  watch: {
    include: ['/web/**'],  // 文件变化，自动刷新浏览器。 glob 模式文件路径
    exclude: ['/web/config.js'] // 排除监听
  },
  rollupConfig: {           // 打包时用到的 Rollup 配置，input 和 output 的 file 选项是无效的
    plugins: [ json() ],    // 配置 Rollup 的插件，飘刃也会用到
  },
  beforeBuild () {

  },
  afterBuild () {

  }
}
```

## 工作语法

只会替换 import 和 export ，如果 import('jroll') 导入的路径没有`./`、`../`等相对路径，将会从 node_modules 导入

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
