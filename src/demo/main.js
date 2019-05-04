/* global */
import html from './main.html'
import a, { bb } from './a.js'
import { b as abc, o as omg } from './b.js'
import Vue from 'vue/dist/vue.esm.browser.js'
import 'jroll/src/jroll.js'
import d from './d.vue'

console.log(a)
console.log(bb)
console.log(abc)
// console.log(bb)
// console.log(d)

function opq (txt) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(txt)
    }, 1000)
  })
}

async function ddd () {
  console.log(await opq('hello promise'))
}
// pr1.require('./b.js', (data) => {
//   console.log(data)
// })

ddd()
// pr1 ignore++
console.log('// pr1 ignore++')
// pr1 ignore--

omg('123orm')

var buffer = new ArrayBuffer(16)
var view1 = new DataView(buffer)
console.log(view1.getInt8(0))

// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  components: {
    'my-vue-component': d,
    'my-a': a
  },
  template: html
})
