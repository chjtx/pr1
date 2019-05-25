# 飘刃 (Piao Ren)

约定大于配置的极速 Web 应用打包工具，支持 .vue 文件，生产使用 Rollup 打包

## 仓库

【Github】 <a target="_blank" href="https://github.com/chjtx/pr1">https://github.com/chjtx/pr1</a>

【 码 云 】 <a target="_blank" href="https://gitee.com/chenjianlong/pr1">https://gitee.com/chenjianlong/pr1</a>

## 特点优势

- 速度快，开发过程中无需 babel 转译，飘刃只转 import/export ，其余直接输出到浏览器 
- 效率高，使用谷歌浏览器 99.9% 源码调试，无需 source map ，告别组件 this 乱指 window
- 够直观，开发环境可在浏览器 Elements 调试板块直接从 dom 属性找到组件对应的文件位置
- 体积小，生产代码使用 rollup 打包，摇树优化，没用代码全靠边，再上 uglify 高效压缩

## 飘刃 VS Vue-CLI

__对比环境__ 华为荣耀 MagicBook Windows 10 家庭版 i5 8G 64位 联通4G热点 30多个组件的小型 Vue 项目

| | 飘刃 | Vue-CLI |
| :---: | :--- | :--- |
| 工具版本 | piaoren@0.1.1 | @vue/cli@3.6.3 |
| 依赖包数 | 487 | 689 |
| 安装命令 | npm i -g piaoren | npm i -g @vue/cli |
| 安装时间 | 38s | 1m 42s |
| 支持编码 | Pug Sass ES6+ | Pug Sass Less Stylus ES6+ TypeScript |
| 创建项目 | pr1 init 只需要填项目名称 | vue create/vue init 需要填选多项 |
| 启动命令 | pr1 start | vue serve |
| 启动时间 | 2s 与项目内容多少无关 | 6.8s 项目内容多少决定 |
| 热更响应 | 支持更新 css 和刷新页面<br>两种方式，不支持 js 更新<br>更新 js 需要刷新页面<br>响应速度 立即 | 支持 css 和 js 更新，vue 组件更新<br>有点鸡肋，很大概率需要手动更新<br>才能看到预期效果，每次变化都需<br>要编译，响应速度 稍慢 |
| 打包工具 | Rollup | Webpack |
| 打包时间 | 5s 项目内容多少决定 | 10s 项目内容多少决定 |
| 静态资源 | 暂只支持`.`和`/`开头<br>的静态资源 | 支持`.`、`/`、`@`和`~`<br>开头的静态资源 |
| 多页应用 | 无需配置 | 需要配置 pages |
| 插件支持 | Rollup 插件规范 | Webpack 插件规范 |
| 单元测试 | 暂不支持 | 可选 |

总结：飘刃安装时间、启动速度、响应速度、打包时间都优于 Vue-CLI，但是配置方面不及 Vue-CLI 丰富。中小型无需配置的项目选择飘刃，大中型需要多方面资源配合的项目选择 Vue-CLI。

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
  },
  template: '<Layout/>'
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
    ['vue/dist/vue.esm.browser.js', 'vue/dist/vue.runtime.min.js']
  ],
  // true 表示存在同级目录且同名的 html 和 js 文件会被关联到一起
  // 转成 Vue render 组件提高性能，仅生产环境起作用
  html2VueRender: true,
  // 热更新 true or reload，如果是字符串 reload，将会刷新浏览器而非 .vue 组件
  hot: true,
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
      // rollup-plugin-node-resolve 用于解决引用 node_modules 资源路径
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

飘刃会把非 js 资源通过 rollup 的插件转换成 js 资源再传到浏览器，开发环境只会调用 rollup 插件的 `resolveId` 和 `transform` 方法

import/export 转换关系如下：

```js
// import 规则
import { a, b, c } from './util.js'             => const { a, b, c } = await _import('./util.js')
import { abc as a, efg as b } from './util.js'  => const { abc: a, efg: b } = await _import('./util.js')
import a from './util.js'                       => const { default: a } = await _import('./util.js')
import './util.js'                              => await _import('./util.js')
import * as a from './util.js'                  => const a = await _import('./util.js')
import a, { efg as b, c } from './util.js'      => const { default: a, efg: b, c } = await _import('./util.js')
```

```js
// export 规则
 export var a = 'xxx'                           => exports.a = 'xxx'
 export { a, b, c }                             => Object.assign(exports, {a, b, c})
 export function a () {}                        => exports.a = a; function a () {}
 export default a                               => exports.default = a
 export { abc as a }                            => Object.assign(exports, {a: abc} = { a })
 export class e {}                              => exports.e = e; class e {}
 export { default as d } from './util.js'       => Object.assign(exports, await (async () => { const { default: d
                                                   } = await _import('./util.js'); return { d }})())
```

## 静态资源

支持两种静态资源路径 以 `/` 开头和以 `.` 开头

- `/` 开头的资源路径相对站点根目录
- `.` 开头的资源路径相对当前引用的文件

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
          |-- a.vue # background-url: /static/images/a.png
    |-- b.html  # img src="../static/images/a.png"
    |-- b.js
```

绝对路径和相对路径都是引用同一张图片

支持组件多 style ，组件内 style 均为组件内样式，带 scoped 不会影响子组件，不带 scoped 会影响子组件，全局样式请用 link 标签引入

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

- 开发环境，js 文件只会替换 import 和 export ，如果 import('jroll') 导入的路径不能解释，将会使用 `rollup-plugin-node-resolve` 插件解决
- 如果要引用 node_modules 的文件，配置文件必须加载 rollup-plugin-node-resolve 插件
- 所有 js 文件的 import 引入的路径都必须带后缀，省略会出错
- sass 的 `@import` 导入是相对于当前 sass 所在文件的，只支持 @import sass，暂不支持自动拷贝 @import css 的文件
- 如果要使用 sass 或 scoped，必须保持严格格式，只允许`<style lang="sass" scoped>`、`<style lang="sass">`、`<style scoped>`，不允许`<style scoped lang="sass">`，同理如果要使用 pug ，必须书写成`<template lang="pug">`，不允许多空格或少空格
- 在 .vue 或 .html+js 组件里，不带 scoped 的 style 必须使用 this 做选择器处理最外层 dom 的样式，例

```html
<template>
<div class="top">
  <div class="abc">123</div>
</div>
</template>
<style>
/* 不带 scoped 必须使用 this 表示最外层 dom 选择器 */
this {
  background: #efefef;
}
.abc {
  font-size: 20px;
}
</style>
<style scoped>
/* 带 scoped 可以使用最外层 dom 的 class 来做选择器 */
.top {
  font-size: 22px;
}
</style>
```

- 如果同目录存在同名的 html 和 js 文件并开启 `html2VueRender` 选项，默认开启，则视为 Vue 组件，打包时会自动关联转成 render 函数。同名 js 文件只能用 template: html，不能用其它变量

  ```js
  // html/js 的 Vue 组件只能用 html 作为变量名引入同名 html 文件
  import html from './sameName.html'

  export default {
    template: html
  }
  ```

- 在 html 里的 `<img src="./..">` 和 css 里的 `background:url(./..)` 小于 4k 的图片会自动转为 base64，无法自动解决的静态资源需要手动在 static 选项添加资源目录名或具体资源文件名，如下示例的资源不能自动处理

  ```html
  <img v-for="i in images" :src="i.src">
  ```
- js 文件或 vue 文件如果在行首要输入 `import xxx from` `export default` 这类字符串需要转义，或者使用字符串拼接不能让飘刃转换 import 和 export 的规则命中

  ```js
  const str = `
  import xxx from 'a.js'
  export default { b: 1 }
  `
  // 要写成
  const str = `
  \u0069mport xxx from 'a.js'
  \u0065xport default { b: 1 }
  `
  // 或
  const str = `
  i` + `mport xxx from 'a.js'
  e` + `xport default { b: 1 }
  `
  ```

## 常见错误

- 运行 `pr1 start` 出错
  >`Error: listen EADDRINUSE :::8686`
  >
  >`at Server.setupListenHandle [as _listen2] (net.js:1335:14)`
  >
  >`at listenInCluster (net.js:1383:12)`

  8686 端口被占用，解决方案：指定端口运行或先关闭占用 8686 端口的程序

- 运行 `pr1 build` 出错

  >`(node:20976) UnhandledPromiseRejectionWarning: Error: EBUSY: resource busy or locked, rmdir 'D:\xx\dist'`

  dist 目录繁忙或锁定，无法删除。解决方案：检查 dist/index.html 是否在浏览器中打开，将其关闭再重新打包

## 更新日志

\### (2019-05-25)

- v0.3.4

  -  复偶尔不能监测热更新的 bug

- v0.3.3

  - 修复 template 不是 pug 时出错的bug

\### (2019-05-24)

- v0.3.2

  - 修复引入 node_modules 模块里的 css 文件没有解释的 bug

- v0.3.1

  - 支持 import css 或 sass 文件

\### v0.3.0 (2019-05-23)

- 支持 .vue 组件的热加载
- 删除 hot 选项的 'style' ，改为 true
- 修复改为 cookie 带参后首次加载会白屏的问题
- 修复引入相同路径的 node_modules 资源产生两个不同资源的 bug

\### (2019-05-22)

- v0.2.13

  - 修复 cookie 为 undefined 时出错的 bug

- v0.2.12

  - 使用 cookie 传参替换 url 传参，使文件路径清爽
  - 修复 v0.2.11 打包没有 css 的 bug

- v0.2.11

  - 修复样式对 :: 伪元素的支持
  - 支持组件多 style ，组件内 style 均为组件内样式，带 scoped 不会影响子组件，不带 scoped 会影响子组件，全局样式请用 link 标签引入
  - 优化 `hot: 'style'` 选项

\### v0.2.10 (2019-05-12)

- 支持 .vue 文件的 `export default Vue.extend({` 等语法

\### v0.2.9 (2019-05-08)

- 修复 import 语句后面带 ; 号解释出错的问题

\### (2019-05-06)

- v0.2.8 修复 v0.2.1 优化项目文件结构产生引用 某些 js 路径错误的问题

- v0.2.7 

  - 改回使用 Object.freeze 冻结 exports
  - html 输入使用 ` 反引符保持格式
  - 修复 html 文件里的 import 和 export 字符串也被转换的问题
  - 更新注意事项

\### v0.2.6 (2019-05-04)

- 默认 vue.min.js 改为体积更小的 vue.runtime.min.js
- 修复 `export function abc` 开发阶段同文件其它函数访问不了 `abc()` 的问题
- 解除 Object.freeze 将整个 exports 冻结，用 Object.defineProperty 处理局部常量

\### (2019-05-02)

- v0.2.2 修复 v0.2.1 错误 npm 包
- v0.2.3 修复 没有默认 index.html 的问题
- v0.2.4 修复 hot reload 选项失效的问题
- v0.2.5 修复 exports 导出的属性会被修改的问题（使用 Object.freeze）

\### v0.2.1 (2019-04-30)

- 添加支持 rollup 插件的 `resolveId` 方法
- 优化项目文件结构
- 支持静态文件使用相对路径相对于当前引用文件

\### v0.2.0 (2019-04-29)

- 添加支持 `import a, { b, c } ...` 和 `export { a } from ...` 语法
- 添加支持少于4k的图片压缩成base64
- 添加 html 和 css 里的图片资源自动拷贝到相应的静态文件夹的功能
- 添加 html2VueRender 选项，默认开启，即 html 和 js 同级目录且同名 html 会转成 Vue render 函数
- 解决 sass 使用 `@import` 导入路径问题

\### v0.1.1 (2019-04-26)

- 添加热更新 hot 选项，只支持更新 style 或 reload 刷新页面两种方式
- 更新文档，添加和 vue-cli 的对比

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
