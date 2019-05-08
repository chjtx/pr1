// import b from './b.js'
import html from './a.html'
import a1 from './a1.html'
import * as c from './c.js'

console.log(c)

// const a = 5 + b
console.log(html)
// console.log(a)

document.getElementById('app2').innerHTML = a1

export { b as bb } from './b.js'
export default { template: html };
