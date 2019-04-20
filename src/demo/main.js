import a from './a.js'
import { b as abc, o as omg } from './b.js'
import Vue from 'vue/dist/vue.esm.browser.js'
import 'jroll/src/jroll.js'
import d from './d.vue'

console.log(a)
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

ddd()

omg('123orm')

// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  components: {
    'my-vue-component': d
  }
})
