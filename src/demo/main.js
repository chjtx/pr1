import a from './a.js'
import { b as abc, o as omg } from './b.js'
// import Vue from 'vue/dist/vue.esm.browser.js'
// import d from './d.vue'

console.log(a)
console.log(abc)
// console.log(bb)
// console.log(d)

omg('123orm')

// eslint-disable-next-line no-new
new Vue({
  el: '#app',
  // components: {
  //   'my-vue-component': d
  // }
})
