# 飘刃 (Piao Ren)

Vue 项目前端工程构建工具，使用 Rollup 打包

## 特点优势

- 源码少，除去第三方工具，飘刃所有核心代码共8个文件不到1000行，看源码不头疼
- 速度快，开发过程中无需 babel 转译，飘刃只转 import/export ，其余直接输出到浏览器 
- 效率高，使用谷歌浏览器 99.9% 源码调试，无需 source map ，告别组件 this 乱指 window
- 够直观，开发环境可在浏览器 Elements 调试板块直接从 dom 属性找到组件对应的文件位置
- 体积小，生产代码使用 rollup 打包，摇树优化，没用代码全靠边，再上 uglify 高效压缩

## 快速上手

```sh
npm i -g piaoren
```

把飘刃安装到全局，任意目录都可以运行飘刃的命令 `pr1 `

```sh
pr1 init

? Project name:           # 项目名称至少两个字符，由大小写字母、中划线、下划线，及数字组成，数字不能为首字符
? Project description:    # 可不填
```

将会自动生成项目名称命名的文件夹，包含若干工程文件

进入工程目录，执行以下命令开启开发模式

```sh
npm run dev
```

- 修改 src/index.html ，添加 `&lt;Layout/&gt; 标签

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>飘刃</title>
</head>
<body>
  <div id="app">
    <Layout/>
  </div>
  <script src="./main.js?pr1_module=1"></script>
</body>
</html>
```

- 修改 src/main.js ，添加 Layout 组件

```js
// main.js
import Vue from 'vue/dist/vue.esm.browser.js'
import Layout from './pages/Layout.vue'

// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  components: {
    Layout
  }
})
```

- 创建 src/pages 目录，并添加 src/pages/Layout.vue 文件

```html
<!-- pages/Layout.vue -->
<template lang="pug">
div
  div.top
    input(v-model="text")
    button(@click="submit") 添加
  ul
    Item(v-for="(i, k) in items" :name="i" :key="k")
</template>
<script>
import Item from './Item.js'
export default {
  components: {
    Item
  },
  data () {
    return {
      text: '',
      items: []
    }
  },
  methods: {
    submit () {
      this.items.push(this.text)
      this.text = ''
    }
  }
}
</script>
<style lang="sass" scoped>
$bg: #ccc;

.top {
  padding: 20px;
  background: $bg;
}
</style>
```

- 创建 src/pages/Item.js

```js
// pages/Item.js
import html from './Item.html'

export default {
  template: html,
  props: {
    name: String
  }
}
```

- 创建 src/pages/Item.html

```html
<!-- pages/Item.html -->
<li class="item">{{ name }}</li>

<style scoped>
.item {
  background: #eee;
}
</style>
```

在浏览器访问 http://localhost:8686/

> 以上例子演示了两种写 Vue 组件的方法
>
> 一、使用 .vue 文件，目前 .vue 文件只支持普通的 html/css/js 和 sass/pug ，不支持 less/typescript 等。注意 Layout.vue 的 pug ，首行第一个位置不能是空格，即不能缩进。
>
> 二、使用 html 和 js 两个文件写 Vue 组件，如果存在同路径同名的两个文件，例：Component.html 和 Component.js，则飘刃会把这两个文件处理成 Vue 组件。需要注意的是，这种方式的 html 文件不包括 script ，所以不需要 template 标签，直接写 div ，也不支持 pug。


开发完成后，使用以下命令打包

```sh
npm run build
```

打包完成后可在 dist 目录双击 index.html 到浏览器访问，如果项目包含 ajax 请求，file:// 协议文件无法跨域，可以在 dist 目录运行 pr1 start 8080 开启飘刃服务，在浏览器访问 http://localhost:8080/

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
pr1 build index.html detail.html tools.js --config="./config.js" # 使用指定配置打包3个文件
pr1 build page1/index.html page2/index.html # 在打包后也会保持同样结构
```

## 配置说明

```js
// pr1.config.js
const nodeResolve = require('rollup-plugin-node-resolve')
require('colors')

module.exports = {
  // vendor 子项的第一个值将会整合到 rollup 的 external
  // [0]是开发环境用的，[1]是生产环境用的，如果没有[1]生产环境也用[0]
  vendor: [
    ['vue/dist/vue.esm.browser.js', 'vue/dist/vue.min.js']
  ],
  // 热更新 style or reload
  hot: 'style',
  // dist 打包后文件输出目录，路径应相对于当前配置文件
  dist: '',
  // static 静态文件，路径应相对于 html 入口文件
  static: [],
  // rollup 选项，必须有
  rollupConfig: {
    // 定义了 vendor，再定义 globals，这样 rollup 会把相关的 vendor 转换成全局变量作为外部资源处理
    globals: {
      'vue/dist/vue.esm.browser.js': 'Vue'
    },
    plugins: [
      // rollup-plugin-node-resolve 用于 rollup 解决引用 node_modules 资源使用
      // 飘刃在开发环境不会运行该模块，打包会自动执行
      nodeResolve()
    ]
  },
  // babel 选项，不提供将不会进行转码，不使用 uglify 压缩时，可安装 babel 的 minify 插件压缩
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
  // uglify 选项，不提供将不会压缩，如果 babel 转码后仍存在 ES6+ 代码，uglify 解释不了将会压缩失败
  uglifyConfig: {
    toplevel: true
  },
  // 打包前的钩子
  beforeBuild: async function (originDir) {
    console.log(`开始打包：`.green + `${originDir}`.cyan)
  },
  // 打包后的钩子
  afterBuild: async function (distDir) {
    console.log(`完成打包：`.green + `${distDir}`.cyan)
  }
}
```

## 运作原理

飘刃会拦截所有带有 pr1_module=1 参数的 url ，并处理对应的文件资源，目前只会处理 .vue .html .js 3种文件

把 import/export 转换成 async/await 让浏览器可以支持引入除 js 外的其它资源

飘刃会把非 js 资源通过 rollup 的插件转换成 js 资源再传到浏览器，开发环境只会调用 rollup 插件的 transform 方法

import/export 转换关系如下：

```js
// import 规则
import { a, b, c } from './util.js'             => const { a, b, c } = await _import('./util.js')
import { abc as a, efg as b } from './util.js'  => const { abc: a, efg: b } = await _import('./util.js')
import a from './util.js'                       => const { default: a } = await _import('./util.js')
import './util.js'                              => await _import('./util.js')
import * as a from './util.js'                  => const a = await _import('./util.js')
```

```js
// export 规则
 export var a = 'xxx'                           => exports['/xx.js'].a = 'xxx'
 export { a, b, c }                             => Object.assign(exports['/xx.js'], {a, b, c})
 export function a () {}                        => exports['/xx.js'].a = function a () {}
 export default a                               => exports['/xx.js'].default = a
 export { abc as a }                            => Object.assign(exports['/xx.js'], {a: abc} = { a })
 export class e {}                              => exports['/xx.js'].e = class e {}
```

## 静态资源

所有在 html 或 css 引入的静态资源，路径都是相对于入口 html 文件，
如下目录结构

```sh
src/
  |-- index.html
  |-- static/
    |-- images/
      |-- a.png
  |-- pages/
    |-- one/
      |-- two/
        |-- three/
          |-- a.vue # background-url: ./static/images/a.png
    |-- b.html  # img src="./static/images/a.png"
    |-- b.js
```

如上所示，a.vue 和 b.html 在不同的目录路径上，但是引入相同的 a.png 文件，都是使用相同的相对于 index.html 的路径

## 多页应用

飘刃处理多面应用非常简单，如下目录结构

```sh
src/
  |-- page1/
    |-- index.html
  |-- page2/
    |-- index.html
  |-- page3/
    |-- index.html
```

开发环境，在 src 目录执行 `pr1 start`

在浏览器分别访问

http://localhost:8686/page1/

http://localhost:8686/page2/

http://localhost:8686/page3/

生产环境，在 src 目录执行 `pr1 build page1/index.html page2/index.html page3/index.html`

在 dist 目录会保持以下目录结构

```sh
dist/
  |-- page1/
    |-- index.html
  |-- page2/
    |-- index.html
  |-- page3/
    |-- index.html
```

## 生产注释

如下示例：

```js
doSome(data => {
  // pr1 ignore++
  console.info(`调试信息:${data}`)
  // pr1 ignore--
  doIt(data)
})
```

`// pr1 ignore++`到`// pr1 ignore--`的代码在生产环境会被删除

```js
doSome(data => {
  doIt(data)
})
```

## 注意事项

- 开发环境，js 文件只会替换 import 和 export ，如果 import('jroll') 导入的路径没有`./`、`../`等相对路径，将会从项目根目录的 node_modules 导入
- 如果要引用 node_modules 的文件，配置文件必须加载 rollup-plugin-node-resolve 插件用以打包
- 所有静态资源路径都应该相对于入口 html 文件
- 如果要使用 sass 或 scoped，必须保持严格格式，只允许`<style lang="sass" scoped>`、`<style lang="sass">`、`<style scoped>`，不允许`<style scoped lang="sass">`，同理如果要使用 pug ，必须书写成`<template lang="pug">`，不允许多空格或少空格
- 如果同目录存在同名的 html 和 js 文件，则视为 Vue 组件，打包时会自动关联转成 render 函数。同名 js 文件只能用 template: html，不能用其它变量

  ```js
  // html/js 的 Vue 组件只能用 html 作为变量名引入同名 html 文件
  import html from './sameName.html'

  export default {
    template: html
  }
  ```


## 更新日志

\### v0.1.0 (2019-04-25)

- 添加热更新选项，只支持更新 style 或 reload 刷新页面两种方式

\### v0.0.10 (2019-04-24)

- 完成文档，上线

## 攒助作者

支持作者继续维护更新，编写更多教程和使用技巧。如果有足够的支持，飘刃将来将会支持 React、TypeScript、异步模块等等。

__支持方式__

1、购买好货记产品，好货记是作者目前创业的产物，地址：<a target="_blank" href="https://goodgoodsbook.com/">https://goodgoodsbook.com/</a>

2、打赏1块几毛钱，让作者不用去天桥底蹲位

<img src="https://goodgoodsbook.com/imgs/alipay.jpg" width="300">

<img src="https://goodgoodsbook.com/imgs/wxpay.png" width="300">

<div style="clear:both;height:24px;"></div>

## 开源协议

MIT
