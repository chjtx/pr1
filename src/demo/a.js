import b from './b.js'
import html from './a.html'
import a1 from './a1.html'

const a = 5 + b
console.log(html)
console.log(a)

document.getElementById('app2').innerHTML = a1

export default {
  template: html
}
