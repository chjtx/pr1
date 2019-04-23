# 飘刃 (Piao Ren)

Vue 项目前端工程构建工具，使用 Rollup 打包

## 特点优势

- 源码少，除去第三方工具，飘刃所有核心代码共8个文件不到1000行，看源码不头疼
- 速度快，开发过程中无需 babel 转译，飘刃只转 import/export ，其余直接输出到浏览器 
- 效率高，使用谷歌浏览器 99% 源码调试，无需 source map ，告别组件 this 乱指 window
- 够直观，开发环境可在浏览器 Elements 调试板块直接从 dom 属性找到组件对应的文件位置
- 体积小，生产代码使用 rollup 打包，摇树优化，没用代码全靠边，再上 uglify 高效压缩

## 快速上手

```sh
npm i -g piaoren
```

把飘刃安装到全局，任意目录都可以运行飘刃的命令 `pr1 `

```sh
pr1 init

? Project name:           # 项目名称至少两个字符，由大小写字母、中划
                          # 线、下划线，及数字组成，数字不能为首字符
? Project description:    # 可不填
```

将会自动生成项目名称命名的文件夹，包含若干工程文件

进入工程目录，执行以下命令开启开发模式

```sh
npm run dev
```



开发完成后，使用以下命令打包

```sh
npm run build
```

## 命令说明

```sh
# 创建项目，初始化工程文件

pr1 init
```

```sh
# 开启飘刃服务，在哪个目录开启，哪个目录就是根站点
# 可在浏览器访问该站点文件，相当于微型静态服务器
# 将会拦截所有带 pr1_module=1 参数的 url 进行文件处理
# 用于开发环境

pr1 start [port] [config]

# 示例

pr1 start     # 默认 8686 端口，工程根目录的 pr1.config.js 配置文件
pr1 start 8080  # 指定 8080 端口
pr1 start --config="./config.js" # 指定 ./config.js 配置文件
pr1 start 8080 --config="./config.js" # 指定端口和配置文件
```

```sh
# 使用 build 命令打包，必须指定入口文件，只能是 html 和 js 文件
# 可以同时打包多个模块
# 如果是 html 文件，将会自动解决 html 里的入口文件及复制静态资源
# 如果是 js 文件，只会解决该 js 文件及其依赖，不会复制静态资源
# 入口文件目录与打包后的文件目录结构相同

pr1 build [entry] [config]

# 示例

pr1 build index.html # 使用默认配置文件打包
pr1 build index.html --config="./config.js" # 使用指定配置文件
pr1 build index.html detail.html tools.js   # 同时打包3个文件
pr1 build index.html detail.html tools.js --config="./config.js"
pr1 build page1/index.html page2/index.html # 在打包后也会保持同样结构
```

## 配置说明

## 运作原理

## 文件支持

## 静态资源

## 多页应用

## 注意事项

## 更新日志

## 攒助作者

支持作者继续维护更新，如果有足够的支持，飘刃将来将会支持 React、TypeScript、热更新、异步模块等

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
