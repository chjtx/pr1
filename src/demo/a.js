import b from './b.js'
import html from './a.html'
import a1 from './a1.html'

const a = 1 + b
console.log(html)
console.log(a1)

document.getElementById('app').innerHTML = html + a1

export default a
